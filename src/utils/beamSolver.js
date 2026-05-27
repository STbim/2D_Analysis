/**
 * Euler-Bernoulli beam FEM solver — Direct Stiffness Method
 *
 * Sign convention (all units SI-mm unless noted):
 *   Positive y = upward
 *   Downward loads are NEGATIVE in the physical sense but
 *   we treat all load magnitudes as positive magnitudes
 *   and handle direction in the equilibrium integration.
 *
 * The FEM gives us accurate deflections.
 * SFD and BMD are computed analytically via equilibrium
 * (more robust than recovering from stiffness matrix forces).
 */

// ─── Section properties ───────────────────────────────────────────────────────

export function computeI(section) {
  const { type, width: b, height: h } = section;
  if (type === 'rectangular') {
    return (b * h * h * h) / 12; // mm^4
  }
  if (type === 't-section') {
    const bw = b, hw = h * 0.7, bf = b * 2, hf = h * 0.3;
    const Aw = bw * hw, Af = bf * hf, A = Aw + Af;
    const ybar = (Aw * (hw / 2) + Af * (hw + hf / 2)) / A;
    return (bw * hw * hw * hw) / 12 + Aw * (ybar - hw / 2) ** 2
         + (bf * hf * hf * hf) / 12 + Af * (hw + hf / 2 - ybar) ** 2;
  }
  if (type === 'i-section') {
    const bf = b, tf = h * 0.15, hw = h - 2 * tf, tw = b * 0.1;
    return (tw * hw * hw * hw) / 12
         + 2 * ((bf * tf * tf * tf) / 12 + bf * tf * ((h - tf) / 2) ** 2);
  }
  return (b * h * h * h) / 12;
}

export function computeArea(section) {
  const { type, width: b, height: h } = section;
  if (type === 'rectangular') return b * h;
  if (type === 't-section')   return b * h * 0.7 + b * 2 * h * 0.3;
  if (type === 'i-section')   return 2 * b * h * 0.15 + b * 0.1 * (h * 0.7);
  return b * h;
}

// ─── Element stiffness ────────────────────────────────────────────────────────
// EI in N·mm², L in mm
function Ke(EI, L) {
  const a = EI / (L * L * L);
  return [
    [  12*a,      6*L*a,    -12*a,      6*L*a   ],
    [   6*L*a,   4*L*L*a,   -6*L*a,   2*L*L*a   ],
    [ -12*a,     -6*L*a,     12*a,    -6*L*a    ],
    [   6*L*a,   2*L*L*a,   -6*L*a,   4*L*L*a   ],
  ];
}

// ─── Hermite shape function integrals for FEF ─────────────────────────────────
// FEF from a downward UDL w (N/mm) over element [0..L]
// Returns [Fy1, Mz1, Fy2, Mz2] — all in N or N·mm, sign: upward forces +
function udlFEF(w, L) {
  return [w*L/2, w*L*L/12, w*L/2, -w*L*L/12];
}

// FEF from a downward partial UDL from local x=a to x=b
function partialUdlFEF(w, a, b, L) {
  const I1 = x => x - (x*x*x)/(L*L) + (x*x*x*x)/(2*L*L*L);
  const I2 = x => (x*x)/2 - 2*(x*x*x)/(3*L) + (x*x*x*x)/(4*L*L);
  const I3 = x => (x*x*x)/(L*L) - (x*x*x*x)/(2*L*L*L);
  const I4 = x => -(x*x*x)/(3*L) + (x*x*x*x)/(4*L*L);
  return [
    w*(I1(b)-I1(a)), w*(I2(b)-I2(a)),
    w*(I3(b)-I3(a)), w*(I4(b)-I4(a)),
  ];
}

// FEF from a downward point load P (N) at local coord a
function pointFEF(P, a, L) {
  const b = L - a;
  return [
     P*b*b*(3*a+b)/(L*L*L),
     P*a*b*b/(L*L),
     P*a*a*(a+3*b)/(L*L*L),
    -P*a*a*b/(L*L),
  ];
}

// ─── Gaussian elimination ─────────────────────────────────────────────────────
function gaussElim(A, rhs) {
  const n = rhs.length;
  for (let c = 0; c < n; c++) {
    let pr = c;
    for (let r = c+1; r < n; r++)
      if (Math.abs(A[r][c]) > Math.abs(A[pr][c])) pr = r;
    [A[c], A[pr]] = [A[pr], A[c]];
    [rhs[c], rhs[pr]] = [rhs[pr], rhs[c]];
    if (Math.abs(A[c][c]) < 1e-30) continue;
    for (let r = c+1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let j = c; j < n; j++) A[r][j] -= f * A[c][j];
      rhs[r] -= f * rhs[c];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n-1; i >= 0; i--) {
    let s = rhs[i];
    for (let j = i+1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = Math.abs(A[i][i]) > 1e-30 ? s/A[i][i] : 0;
  }
  return x;
}

// ─── Analytical reaction solver ───────────────────────────────────────────────
/**
 * Compute support reactions using static equilibrium.
 * For statically determinate beams this is exact.
 * For indeterminate (continuous), we use the FEM displacement solution.
 *
 * Returns reactions object: { nodeIndex: R_N_upward }
 */
function computeReactions(beamType, loads, L_mm, femU, eL, nN) {
  // Total applied load (downward, N) and its centroid (mm from left)
  let totalLoad = 0;  // N, downward positive
  let loadMomentAboutLeft = 0; // N·mm (moment of loads about left end)

  for (const load of loads) {
    if (!load || load.value === 0) continue;
    const { type, value } = load;

    if (type === 'udl') {
      const W = value * L_mm; // N
      totalLoad += W;
      loadMomentAboutLeft += W * L_mm / 2;
    } else if (type === 'partial-udl') {
      const a = (load.leftOffset || 0) * 1000;
      const b = L_mm - (load.rightOffset || 0) * 1000;
      const len = Math.max(b - a, 0);
      const W = value * len;
      totalLoad += W;
      loadMomentAboutLeft += W * (a + len / 2);
    } else if (type === 'point-load') {
      const W = value * 1000; // kN -> N
      const x = (load.leftOffset || 0) * 1000;
      totalLoad += W;
      loadMomentAboutLeft += W * x;
    } else if (type === 'point-moment') {
      // Point moments don't contribute to vertical equilibrium
      loadMomentAboutLeft += load.value * 1e6; // added as moment
    }
  }

  const reactions = {};
  const L = L_mm;

  if (beamType === 'simply-supported') {
    // Two unknowns: R_left (node 0) and R_right (node nN-1)
    // ΣM_left = 0: R_right * L = loadMomentAboutLeft
    // ΣFy = 0: R_left + R_right = totalLoad
    const R_right = loadMomentAboutLeft / L;
    const R_left  = totalLoad - R_right;
    reactions[0]          = R_left;   // DOF 0 = v at node 0
    reactions[(nN-1)*2]   = R_right;  // DOF (nN-1)*2 = v at last node

  } else if (beamType === 'left-cantilever') {
    // Fixed at left: R_v and R_m
    // ΣFy = 0: R_v = totalLoad
    // ΣM_left = 0: R_m + loadMomentAboutLeft = 0 (moment reaction opposes load moment)
    reactions[0] = totalLoad;          // vertical reaction at node 0
    reactions[1] = -loadMomentAboutLeft; // moment reaction at node 0 (N·mm)

  } else if (beamType === 'right-cantilever') {
    // Fixed at right: R_v and R_m
    // ΣFy = 0: R_v = totalLoad
    // ΣM_right = 0: R_m = totalLoad*L - loadMomentAboutLeft (taking moments about right)
    reactions[(nN-1)*2]     = totalLoad;
    reactions[(nN-1)*2 + 1] = totalLoad * L - loadMomentAboutLeft;

  } else if (beamType === 'continuous') {
    // Statically indeterminate: 3 supports
    // Use FEM displacements to back-calculate reactions.
    // Extract reactions by looking at residual force at support nodes.
    // R_i = (K * u)[i] - F[i]  but we don't have that here.
    // Instead: use FEM-computed deflections + stiffness approach.
    // Simplification: use the FEM u to get reactions via three-moment equation.
    // For now, use the FEM to get the middle reaction via equilibrium:
    // R_left + R_mid + R_right = totalLoad
    // ΣM_left = R_mid*(L/2) + R_right*L = loadMomentAboutLeft
    // Plus compatibility: the middle support doesn't deflect.
    // The FEM u solution has this built in. Extract reactions from FEM:
    // Since we can't easily re-extract from FEM, use three-moment theorem for symmetric case:
    // For continuous with equal spans and same load: R_mid = 1.25*w*L/1 and end reactions = 0.375*w*L
    // But for general loads, use the femU to recover reactions:
    // Actually the best approach: solve the redundant system analytically.
    // Three-moment theorem for propped continuous beam:
    // Use compatibility: deflection at midspan support = 0.
    // y_mid = y_simply_supported_mid + R_mid_correction = 0
    // From Mohr's theorem or direct formulas:

    // For a single-span UDL on a two-span continuous beam (equal spans L/2 each):
    // This is getting complex. For now, fall back to using FEM nodal forces approach.

    // Recover reactions from FEM: R_d = sum_j K_orig[d][j] * u[j] - F[d]
    // We pass the femU and eL to compute this.
    const EI_val = null; // not available here
    // Use three-moment theorem instead (analytical, exact):
    const halfL = L / 2;
    // For a UDL w over full span: R_left=R_right=3wL/8, R_mid=10wL/8=5wL/4
    // But we need to sum all loads... use superposition.
    // This is beyond scope for mixed loads — fall back to FEM-extracted.
    // We'll handle this in the main solver where we have EI.
    reactions[0]            = totalLoad * 3 / 8;
    reactions[Math.floor(nN/2)*2] = totalLoad * 5 / 4;
    reactions[(nN-1)*2]     = totalLoad * 3 / 8;
    // Note: this is only accurate for full-span UDL. For general loads, use FEM.
  }

  return reactions;
}

// ─── SFD / BMD by equilibrium ─────────────────────────────────────────────────
/**
 * Given reactions and load list, compute V(x) and M(x) at nPts points.
 * Convention: V positive = left section goes up, M positive = sagging (tension at bottom)
 */
function computeDiagrams(reactions, loads, L_mm, nPts) {
  const dx = L_mm / (nPts - 1);
  const shear  = new Float64Array(nPts);
  const moment = new Float64Array(nPts);
  const xArr   = new Float64Array(nPts);
  for (let i = 0; i < nPts; i++) xArr[i] = i * dx;

  for (let i = 0; i < nPts; i++) {
    const x = xArr[i]; // mm from left
    let V = 0, M = 0;

    // ── Upward reactions to the left of x ──
    for (const [dStr, R] of Object.entries(reactions)) {
      const d = parseInt(dStr);
      if (d % 2 === 0) {
        // Vertical reaction R (N, upward +)
        const xR = (d / 2) * (L_mm / (nPts - 1)); // WRONG — node spacing ≠ dx here
        // Actually node index * eL... we'll pass eL instead
      }
    }

    shear[i]  = V / 1000;   // kN
    moment[i] = M / 1e6;    // kN·m
  }
  return { shear, moment, xArr };
}

// ─── Main solver ──────────────────────────────────────────────────────────────
export function solveBeam(model) {
  const NUM_ELEM = 100;
  const L_mm = model.spanLength * 1000;
  const E    = model.material.E;          // N/mm²
  const I    = computeI(model.section);   // mm⁴
  const EI   = E * I;                     // N·mm²
  const eL   = L_mm / NUM_ELEM;           // mm per element
  const nN   = NUM_ELEM + 1;
  const nDOF = nN * 2;
  const { beamType } = model;

  // Constrained DOFs (vertical displacement = 0)
  const cDOFs = [];
  const fixedDOFs = []; // also rotational constraints
  if (beamType === 'simply-supported') {
    cDOFs.push(0, (nN-1)*2);
  } else if (beamType === 'left-cantilever') {
    cDOFs.push(0); fixedDOFs.push(1);
  } else if (beamType === 'right-cantilever') {
    cDOFs.push((nN-1)*2); fixedDOFs.push((nN-1)*2+1);
  } else if (beamType === 'continuous') {
    cDOFs.push(0, Math.floor(nN/2)*2, (nN-1)*2);
  }
  const allConstrained = [...cDOFs, ...fixedDOFs];

  // ── Solve one load case ────────────────────────────────────────────────────
  function solveCase(loads) {
    // Build K and F
    const K = Array.from({length: nDOF}, () => new Float64Array(nDOF));
    const F = new Float64Array(nDOF);

    for (let e = 0; e < NUM_ELEM; e++) {
      const d = [e*2, e*2+1, (e+1)*2, (e+1)*2+1];
      const k = Ke(EI, eL);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          K[d[i]][d[j]] += k[i][j];

      const x0 = e * eL, x1 = x0 + eL;

      for (const ld of loads) {
        if (!ld || ld.value === 0) continue;
        const { type, value } = ld;

        if (type === 'udl') {
          // Downward UDL: FEF are upward nodal equivalents
          const f = udlFEF(value, eL);
          for (let i = 0; i < 4; i++) F[d[i]] += f[i];

        } else if (type === 'partial-udl') {
          const la = (ld.leftOffset||0)*1000, lb = L_mm - (ld.rightOffset||0)*1000;
          if (lb <= x0 || la >= x1) continue;
          const a = Math.max(la - x0, 0), b = Math.min(lb - x0, eL);
          if (b <= a) continue;
          const f = partialUdlFEF(value, a, b, eL);
          for (let i = 0; i < 4; i++) F[d[i]] += f[i];

        } else if (type === 'point-load') {
          // Last element includes its right edge so a load exactly at x = L is captured.
          const isLast = e === NUM_ELEM - 1;
          const xP = (ld.leftOffset||0)*1000;
          if (xP >= x0 && (xP < x1 || (isLast && xP <= x1 + 1e-6))) {
            const a = Math.min(xP - x0, eL); // clamp local coord to [0, eL]
            const f = pointFEF(value*1000, a, eL); // kN->N
            for (let i = 0; i < 4; i++) F[d[i]] += f[i];
          }

        } else if (type === 'point-moment') {
          const isLast = e === NUM_ELEM - 1;
          const xP = (ld.leftOffset||0)*1000;
          if (xP >= x0 && (xP < x1 || (isLast && xP <= x1 + 1e-6))) {
            const a = Math.min(xP - x0, eL), b2 = eL - a, M = ld.value*1e6; // kN·m->N·mm
            F[d[0]] +=  6*M*a*b2/(eL*eL*eL);
            F[d[1]] +=  M*b2*(2*a-b2)/(eL*eL);
            F[d[2]] += -6*M*a*b2/(eL*eL*eL);
            F[d[3]] +=  M*a*(2*b2-a)/(eL*eL);
          }
        }
      }
    }

    // Save original K rows at constrained DOFs before penalty
    const Korig = {};
    for (const c of allConstrained) Korig[c] = Array.from(K[c]);
    const F0 = Array.from(F);

    // Apply penalty BC
    const PEN = EI / (eL*eL*eL) * 1e12;
    for (const c of allConstrained) K[c][c] += PEN;

    // Solve K·u = F
    const u = gaussElim(K.map(r => Array.from(r)), Array.from(F));

    // ── Compute support reactions ──────────────────────────────────────────
    // Reaction recovery (residual method): from the un-penalized row c,
    //   Korig[c]·u = F0[c] + R_dp[c]   (R_dp = downward-positive support force)
    // The upward reaction = F0[c] − Korig[c]·u.
    // This is exact for both determinate and indeterminate (continuous) beams.
    //
    // We use it for the continuous (statically indeterminate) case, where the
    // closed-form three-moment route is error-prone. Determinate beams keep the
    // analytical reactions (they also encode the cantilever moment reactions
    // with the sign convention the SFD/BMD loop expects).
    const rxns = {};
    if (beamType === 'continuous') {
      for (const c of cDOFs) {
        const row = Korig[c];
        let Ku = 0;
        for (let j = 0; j < nDOF; j++) Ku += row[j] * u[j];
        rxns[c] = F0[c] - Ku; // upward reaction (N)
      }
    } else {
      const analyticalRxns = computeReactionsAnalytical(beamType, loads, L_mm, nN, EI, eL, u);
      for (const [k, v] of Object.entries(analyticalRxns)) rxns[k] = v;
    }

    // ── SFD and BMD via equilibrium integration ────────────────────────────
    const nPts = nN;
    const shear      = new Float64Array(nPts);
    const moment     = new Float64Array(nPts);
    const xCoords    = new Float64Array(nPts);
    const deflection = new Float64Array(nPts);

    for (let i = 0; i < nPts; i++) {
      xCoords[i]    = (i * eL) / 1000; // m
      deflection[i] = u[i * 2];        // mm
    }

    // V(x) and M(x) by summing from left
    for (let i = 0; i < nPts; i++) {
      const x = i * eL; // mm

      let V = 0, Mbm = 0;

      // Upward reactions at nodes <= x
      for (const [dStr, R] of Object.entries(rxns)) {
        const d = parseInt(dStr);
        if (d % 2 === 0) { // vertical DOF
          const nodeIdx = d / 2;
          const xR = nodeIdx * eL;
          if (xR <= x) {
            V   += R;
            Mbm += R * (x - xR); // upward force creates sagging moment (+)
          }
        }
        if (d % 2 === 1) { // moment DOF (fixed support reaction moment)
          const nodeIdx = (d-1) / 2;
          const xR = nodeIdx * eL;
          if (xR <= x) {
            // R is the fixed-end moment reaction (N·mm).
            // For left cantilever: R is stored as +totalM (CCW reaction).
            // A CCW reaction moment at the left end creates HOGGING (negative sagging) bending.
            // So subtract it from Mbm (sagging positive convention).
            Mbm -= R;
          }
        }
      }

      // Subtract contributions from downward loads to the left of x
      for (const ld of loads) {
        if (!ld || ld.value === 0) continue;
        const { type, value } = ld;

        if (type === 'udl') {
          // Load from 0 to x
          const w = value; // N/mm
          V    -= w * x;
          Mbm  -= w * x * x / 2;

        } else if (type === 'partial-udl') {
          const la = (ld.leftOffset||0)*1000;
          const lb = L_mm - (ld.rightOffset||0)*1000;
          const a  = Math.max(la, 0);
          const b  = Math.min(lb, x);
          if (b > a) {
            const w = value; // N/mm
            const len = b - a;
            V   -= w * len;
            // Moment of w from a to b about x:
            // integral[w*(x-t), a, b] = w*[x*(b-a) - (b²-a²)/2]
            Mbm -= w * (x * (b - a) - (b*b - a*a) / 2);
          }

        } else if (type === 'point-load') {
          const xP = (ld.leftOffset||0)*1000;
          if (xP < x) {
            const P = ld.value * 1000; // N
            V   -= P;
            Mbm -= P * (x - xP);
          }

        } else if (type === 'point-moment') {
          const xP = (ld.leftOffset||0)*1000;
          if (xP <= x) {
            Mbm -= ld.value * 1e6; // N·mm
          }
        }
      }

      shear[i]  = V   / 1000; // kN
      moment[i] = Mbm / 1e6;  // kN·m
    }

    return {
      reactions: rxns,
      shear:     Array.from(shear),
      moment:    Array.from(moment),
      deflection:Array.from(deflection),
      xCoords:   Array.from(xCoords),
    };
  }

  const dlLoads = model.deadLoad?.value !== 0 ? [model.deadLoad] : [];
  const llLoads = model.liveLoad?.value !== 0 ? [model.liveLoad] : [];

  const DL     = solveCase(dlLoads);
  const LL     = solveCase(llLoads);
  const COMBO1 = combine(DL, 1.4, LL, 0.0);
  const COMBO2 = combine(DL, 1.2, LL, 1.6);

  return { DL, LL, COMBO1, COMBO2 };
}

// ─── Analytical reactions for determinate beams ───────────────────────────────
function computeReactionsAnalytical(beamType, loads, L_mm, nN, EI, eL, u) {
  let totalV = 0;  // N, downward
  let totalM = 0;  // N·mm, moment of loads about left end (clockwise +)

  for (const ld of loads) {
    if (!ld || ld.value === 0) continue;
    const { type, value } = ld;

    if (type === 'udl') {
      const W = value * L_mm;
      totalV += W;
      totalM += W * L_mm / 2;
    } else if (type === 'partial-udl') {
      const a = (ld.leftOffset||0)*1000;
      const b = L_mm - (ld.rightOffset||0)*1000;
      const len = Math.max(b - a, 0);
      const W = value * len;
      totalV += W;
      totalM += W * (a + len / 2);
    } else if (type === 'point-load') {
      const P = ld.value * 1000; // N
      const x = (ld.leftOffset||0)*1000;
      totalV += P;
      totalM += P * x;
    } else if (type === 'point-moment') {
      totalM += ld.value * 1e6;
    }
  }

  const rxns = {};

  if (beamType === 'simply-supported') {
    // ΣM about left = 0: R_right * L = totalM
    const R_right = totalM / L_mm;
    const R_left  = totalV - R_right;
    rxns[0]          = R_left;
    rxns[(nN-1)*2]   = R_right;

  } else if (beamType === 'left-cantilever') {
    // Fixed left: R_v = totalV (upward), R_m = totalM (CCW reaction to resist CW load moment)
    // In the SFD/BMD loop: Mbm -= R_m, so M(0) = R_v*0 - R_m = -totalM (hogging at fixed end) ✓
    rxns[0] = totalV;
    rxns[1] = totalM; // CCW reaction moment at fixed left end

  } else if (beamType === 'right-cantilever') {
    // Fixed right end: R_v = totalV (upward at right)
    // ΣM about right end = 0: loads create CW moment of (totalM - totalV*L) about right
    // Reaction moment R_m (CCW) at right = totalM - totalV*L ... could be negative (CW)
    // In SFD/BMD loop: the right support is at xR = L_mm.
    // Since xR <= x only when x = L_mm (last node), this only affects the last point.
    // For right cantilever, integrate from FREE left end: reactions are at RIGHT end only.
    // So M(x) = -w*x²/2 (no reactions to the left until x=L).
    // The right support reactions don't appear to the left of x (except at x=L itself).
    // Store them but the loop only adds them when xR <= x:
    rxns[(nN-1)*2]     = totalV;
    // Moment reaction: ΣM about right = 0 → R_m + (moment of loads about right) = 0
    // Moment of loads about right (CW positive) = totalV*L - totalM
    // R_m (CCW) = -(totalV*L - totalM) = totalM - totalV*L_mm
    rxns[(nN-1)*2 + 1] = totalM - totalV * L_mm;

  } else if (beamType === 'continuous') {
    // Statically indeterminate: 3 vertical supports at x=0, L/2, L
    // Use force method (compatibility): the middle support reaction is the redundant.
    // Let R_mid = redundant. Released structure = simply supported.
    // Deflection at midspan due to loads alone: d_load
    // Deflection at midspan due to unit upward load at midspan: d_unit
    // Compatibility: d_load + R_mid * d_unit = 0  →  R_mid = -d_load / d_unit
    // For general load, use FEM displacement at midspan node:
    // The FEM solution u was computed with the continuous supports (3 supports),
    // so the reactions can be recovered from: K_orig[support_row] · u - F[support]
    // But we don't have K_orig here. Instead, use the FEM u directly.
    // Alternative: use the three-moment theorem for the continuous beam.
    //
    // Simplest: use unit load method with FEM deflections of released structure.
    // We extract reactions by equilibrium knowing total load and moments.
    // We have 3 equations and 3 unknowns: R1, R2, R3.
    //   ΣFy: R1 + R2 + R3 = totalV
    //   ΣM_left: R2*(L/2) + R3*L = totalM  ... (1)
    //   ΣM_right: R1*L + R2*(L/2) = totalV*L - totalM ... (2)
    // But this is only 2 independent moment equations for 3 unknowns → need compatibility.
    //
    // Use the middle support deflection from released (simply supported) beam = 0.
    // For simply supported beam, mid-deflection under loads:
    // Extract mid-node displacement from u (which was solved with all 3 supports active).
    // Since u at mid-node ≈ 0 (constraint), this doesn't help directly.
    //
    // Use the three-moment theorem (Clapeyron's) for two equal spans L_span = L/2:
    // M_0 + 4*M_1 + M_2 = -6*A*a_bar/(L_span) [for each span with load]
    // With M_0 = M_2 = 0 (pin ends), M_1 = interior moment.
    // Then shear reactions follow from span moment diagrams.
    //
    // For a full-span UDL w over total length L (= 2 spans of L/2 each):
    // Three-moment: 0 + 4*M_1 + 0 = -6*(w*L_s^3/24 * L_s/2 + w*L_s^3/24 * L_s/2) / L_s^2
    // where L_s = L/2, A = w*L_s^2/8 (parabola), a_bar = L_s/2
    // = -6 * 2*(w*L_s^4/48) / L_s^2 = -6*w*L_s^2/24 = -w*L_s^2/4
    // M_1 = -w*L_s^2/16 ... hogging moment at middle support
    //
    // R_left = R_right = V_left = w*L_s/2 - M_1/L_s = w*L_s/2 + w*L_s/16 = 3*w*L_s/8
    // R_mid = 2*(w*L_s - R_left) = 2*(w*L_s - 3*w*L_s/8) = 2*5*w*L_s/8 = 5*w*L_s/4
    // For non-UDL loads, use generalized formulation:
    {
      const Ls = L_mm / 2; // half-span length (mm)
      // Moment area computation for three-moment theorem
      // For each span: 6*A*a_bar / L = integral of load moment diagram * (L - x) / L * (2)
      // For general loads, compute numerically:
      // In span 1 (0 to Ls): contribution = (6/Ls) * integral[ M_ss(x) * x/Ls * (Ls-x) * ... ]
      // Simplification: compute numerically using 100 points per span

      const nPer = 100;
      let sum1 = 0, sum2 = 0; // 6*A*a_bar/L for each span

      for (let i = 0; i < nPer; i++) {
        const xi = (i + 0.5) * Ls / nPer; // midpoint of sub-interval in mm

        // Simply supported reactions for span 1 (0 to Ls) with only loads in span 1
        let M_ss1 = 0; // moment at xi in released span 1 (simply supported 0..Ls)
        let M_ss2 = 0; // moment at xi in released span 2 (simply supported Ls..L)
        const xi2 = xi; // local coord in span 2

        for (const ld of loads) {
          if (!ld || ld.value === 0) continue;
          const w = ld.type === 'udl' ? ld.value :
                    ld.type === 'partial-udl' ? ld.value : 0;

          if (ld.type === 'udl') {
            // Span 1: UDL from 0 to Ls
            const R1s = w * Ls / 2;
            M_ss1 += R1s * xi - w * xi * xi / 2;
            // Span 2: UDL from Ls to L (local: 0 to Ls)
            const R2s = w * Ls / 2;
            M_ss2 += R2s * xi2 - w * xi2 * xi2 / 2;
          } else if (ld.type === 'partial-udl') {
            const ga = (ld.leftOffset||0)*1000, gb = L_mm - (ld.rightOffset||0)*1000;
            // Contribution to span 1
            const a1 = Math.max(ga, 0), b1 = Math.min(gb, Ls);
            if (b1 > a1) {
              const len1 = b1 - a1, cg1 = (a1 + b1) / 2;
              const W1 = w * len1;
              const R1_r = W1 * cg1 / Ls, R1_l = W1 - R1_r;
              M_ss1 += xi < cg1 ? R1_l * xi : R1_l * xi - W1 * (xi - cg1);
            }
            // Contribution to span 2
            const a2 = Math.max(ga - Ls, 0), b2 = Math.min(gb - Ls, Ls);
            if (b2 > a2) {
              const len2 = b2 - a2, cg2 = (a2 + b2) / 2;
              const W2 = w * len2;
              const R2_r = W2 * cg2 / Ls, R2_l = W2 - R2_r;
              M_ss2 += xi2 < cg2 ? R2_l * xi2 : R2_l * xi2 - W2 * (xi2 - cg2);
            }
          }
        }

        const dx = Ls / nPer;
        // Three-moment theorem: 6*A1*a1_bar/L1 + 6*A2*a2_bar/L2
        // = integral[ M_ss1 * x * (Ls-x) / Ls² ] * 6/Ls ... using standard form
        sum1 += M_ss1 * xi * (Ls - xi) / (Ls * Ls) * dx;
        sum2 += M_ss2 * xi2 * (Ls - xi2) / (Ls * Ls) * dx;
      }

      // Three-moment theorem: M0 + 4*M1 + M2 = -6*(sum1 + sum2)
      // M0 = M2 = 0 (pin ends)
      const M1 = -6 * (sum1 + sum2) / 4; // N·mm, interior moment at mid support

      // Reactions from span moments:
      // Span 1 (0..Ls): V at left end = (sum of loads in span1 * moment arm from right + M1) / Ls
      let totalV1 = 0, totalM1_about_right = 0;
      let totalV2 = 0, totalM2_about_right = 0;

      for (const ld of loads) {
        if (!ld || ld.value === 0) continue;
        if (ld.type === 'udl') {
          const W = ld.value * Ls;
          totalV1 += W; totalM1_about_right += W * Ls / 2;
          totalV2 += W; totalM2_about_right += W * Ls / 2;
        } else if (ld.type === 'partial-udl') {
          const ga = (ld.leftOffset||0)*1000, gb = L_mm - (ld.rightOffset||0)*1000;
          const a1 = Math.max(ga, 0), b1 = Math.min(gb, Ls);
          if (b1 > a1) {
            const W1 = ld.value * (b1 - a1);
            totalV1 += W1; totalM1_about_right += W1 * (Ls - (a1 + b1) / 2);
          }
          const a2 = Math.max(ga - Ls, 0), b2 = Math.min(gb - Ls, Ls);
          if (b2 > a2) {
            const W2 = ld.value * (b2 - a2);
            totalV2 += W2; totalM2_about_right += W2 * (Ls - (a2 + b2) / 2);
          }
        }
      }

      // In span 1: sum moments about right end (node at Ls):
      // R1_left * Ls - M1 + M0 = totalM1_about_right  (M0=0 at pin left, M1 = hogging moment at mid)
      // R1_left = (totalM1_about_right - M1) / Ls  ... wait, M1 is hogging (negative in sagging+ conv.)
      // Use: R1_left * Ls + M1 = totalM1_about_right  (M1 is the moment at the right end of span 1)
      // Careful with signs: M1 is HOGGING (negative in sagging+), so the beam in span 1
      // has a moment M1 at its right end.
      const R1_left  = (totalM1_about_right - M1) / Ls;
      const R1_right = totalV1 - R1_left;
      const R2_left  = (totalM2_about_right + M1) / Ls; // M1 acts as a hogging support at left of span 2
      const R2_right = totalV2 - R2_left;

      rxns[0]          = R1_left;
      rxns[Math.floor(nN/2)*2] = R1_right + R2_left;
      rxns[(nN-1)*2]   = R2_right;
    }
  }

  return rxns;
}

// ─── Linear combination ───────────────────────────────────────────────────────
function combine(r1, f1, r2, f2) {
  const rxns = {};
  for (const k of new Set([...Object.keys(r1.reactions), ...Object.keys(r2.reactions)]))
    rxns[k] = (r1.reactions[k]||0)*f1 + (r2.reactions[k]||0)*f2;
  return {
    reactions:  rxns,
    shear:      r1.shear.map((v,i)  => v*f1 + r2.shear[i]*f2),
    moment:     r1.moment.map((v,i) => v*f1 + r2.moment[i]*f2),
    deflection: r1.deflection.map((v,i) => v*f1 + r2.deflection[i]*f2),
    xCoords:    r1.xCoords,
  };
}
