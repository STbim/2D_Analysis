import React, { useState, useRef, useEffect, useCallback } from 'react';

const BEAM_TOP    = 150;            // top edge of beam (SVG y)
const BEAM_HEIGHT = 60;             // beam body height
const BEAM_BOTTOM = BEAM_TOP + BEAM_HEIGHT; // 210
const AXIS_Y      = BEAM_TOP + 11;  // blue analytical axis line (near top, as reference)
const ARROW_SPACING = 26;           // px between UDL arrows
const SUPPORT_SIZE  = 15;

// Reference palette
const BEAM_FILL   = '#a9c4de';
const BEAM_STROKE = '#6f9bc4';
const AXIS_COLOR  = '#2f5fb0';
const NODE_COLOR  = '#2f5fb0';
const SUP_FILL    = '#f0f2f6';
const SUP_STROKE  = '#515a6b';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export default function BeamViewer({ model, results, activeLoadCase = 'DL' }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: -40, y: 0, w: 760, h: 360 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const [svgWidth, setSvgWidth] = useState(760);

  useEffect(() => {
    if (!containerRef.current) return;
    const apply = (w) => { setSvgWidth(w); setViewBox({ x: -40, y: 0, w: w + 80, h: 360 }); };
    apply(containerRef.current.offsetWidth || 760);
    const ro = new ResizeObserver(entries => { for (const e of entries) apply(e.contentRect.width || 760); });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const spanPx = Math.min(svgWidth - 160, 640);
  const margin = (svgWidth - spanPx) / 2;
  const beamX = margin;
  const beamW = spanPx;
  const spanM = model.spanLength;

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(vb => ({ x: vb.x, y: vb.y, w: clamp(vb.w * factor, 250, 2200), h: clamp(vb.h * factor, 120, 1100) }));
  }, []);

  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e) => { if (e.button !== 0) return; setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY, vb: { ...viewBox } }; };
  const handleMouseMove = (e) => {
    if (!isPanning || !panStart.current) return;
    const dx = (e.clientX - panStart.current.x) * viewBox.w / svgWidth;
    const dy = (e.clientY - panStart.current.y) * viewBox.h / 360;
    setViewBox({ ...panStart.current.vb, x: panStart.current.vb.x - dx, y: panStart.current.vb.y - dy });
  };
  const handleMouseUp = () => setIsPanning(false);
  const resetView = () => { const w = containerRef.current?.offsetWidth || svgWidth; setViewBox({ x: -40, y: 0, w: w + 80, h: 360 }); };

  const currentLoad = activeLoadCase === 'DL' ? model.deadLoad : model.liveLoad;
  const hasLoad = currentLoad && currentLoad.value !== 0;
  const { beamType } = model;
  const supports = getSupports(beamType, beamX, beamW);
  const nodes = getNodes(beamType, beamX, beamW);

  const ToolBtn = ({ onClick, title, children }) => (
    <button onClick={onClick} title={title}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-ink-500 hover:bg-ink-100 hover:text-ink-700">
      {children}
    </button>
  );

  return (
    <div ref={containerRef} className="relative flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-white border-b border-ink-200 shrink-0">
        <div className="flex items-center gap-0.5">
          <ToolBtn onClick={() => setViewBox(vb => ({ ...vb, w: vb.w * 0.85, h: vb.h * 0.85 }))} title="Zoom in">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </ToolBtn>
          <ToolBtn onClick={() => setViewBox(vb => ({ ...vb, w: vb.w * 1.15, h: vb.h * 1.15 }))} title="Zoom out">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </ToolBtn>
          <ToolBtn onClick={resetView} title="Fit to view">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 6V3a1 1 0 0 1 1-1h3M14 6V3a1 1 0 0 0-1-1h-3M2 10v3a1 1 0 0 0 1 1h3M14 10v3a1 1 0 0 1-1 1h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </ToolBtn>
        </div>

        <div className="h-5 w-px bg-ink-200 mx-1.5" />

        <span className="text-[11.5px] text-ink-500">Load Case</span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {activeLoadCase === 'DL' ? 'Dead Load (DL)' : 'Live Load (LL)'}
        </span>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-ink-400">
          <span className="font-mono">{beamType.replace('-', ' ')}</span>
          <span className="text-ink-300">·</span>
          <span className="font-mono">L = {spanM.toFixed(2)} m</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 grid-bg overflow-hidden relative">
        <svg
          ref={svgRef}
          width="100%" height="100%"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={{ cursor: isPanning ? 'grabbing' : 'grab', display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Loads */}
          {hasLoad && (
            <LoadDisplay load={currentLoad} beamX={beamX} beamW={beamW} spanM={spanM} />
          )}

          {/* Beam body */}
          <rect
            x={beamX} y={BEAM_TOP}
            width={beamW} height={BEAM_HEIGHT}
            fill={BEAM_FILL} fillOpacity="0.9" stroke={BEAM_STROKE} strokeWidth="1"
          />

          {/* Analytical axis line */}
          <line x1={beamX} y1={AXIS_Y} x2={beamX + beamW} y2={AXIS_Y} stroke={AXIS_COLOR} strokeWidth="1.6"/>

          {/* Supports */}
          {supports.map((s, i) => <SupportSymbol key={i} support={s} />)}

          {/* Node markers + labels */}
          {nodes.map((n, i) => (
            <g key={i}>
              <rect x={n.x - 3.5} y={AXIS_Y - 3.5} width="7" height="7" fill={NODE_COLOR} />
              <text x={n.x + 6} y={AXIS_Y - 5} textAnchor="start" fontSize="12" fontWeight="700" fill={NODE_COLOR}>{n.label}</text>
            </g>
          ))}

          {/* Dimension line */}
          <DimensionLine x1={beamX} x2={beamX + beamW} y={BEAM_BOTTOM + 58} label={`${spanM.toFixed(2)} m`} />
        </svg>

        {/* Empty-load hint */}
        {!hasLoad && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-700 text-[11.5px] px-3 py-1.5 rounded-lg shadow-sm">
            No load on {activeLoadCase === 'DL' ? 'Dead Load' : 'Live Load'} case — set a value in the sidebar
          </div>
        )}
      </div>
    </div>
  );
}

function LoadDisplay({ load, beamX, beamW, spanM }) {
  const { type, value, leftOffset = 0, rightOffset = 0 } = load;
  const pxPerM = beamW / spanM;
  const topY = BEAM_TOP;

  if (type === 'udl') return <UDLArrows x1={beamX} x2={beamX + beamW} beamTopY={topY} label={`${value.toFixed(2)} kN/m`} />;
  if (type === 'partial-udl') {
    const x1 = beamX + leftOffset * pxPerM;
    const x2 = beamX + beamW - rightOffset * pxPerM;
    if (x2 > x1) return <UDLArrows x1={x1} x2={x2} beamTopY={topY} label={`${value.toFixed(2)} kN/m`} />;
    return null;
  }
  if (type === 'point-load') {
    const x = beamX + (leftOffset || 0) * pxPerM;
    const top = topY - 56;
    return (
      <g>
        <line x1={x} y1={top} x2={x} y2={topY - 2} stroke="#f59e0b" strokeWidth="2.5"/>
        <polygon points={`${x - 6},${topY - 9} ${x + 6},${topY - 9} ${x},${topY - 1}`} fill="#f59e0b"/>
        <text x={x} y={top - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#b45309">{value.toFixed(2)} kN</text>
      </g>
    );
  }
  if (type === 'point-moment') {
    const x = beamX + (leftOffset || 0) * pxPerM;
    const cy = BEAM_TOP + BEAM_HEIGHT / 2; const r = 22;
    return (
      <g>
        <path d={`M${x - r} ${cy} A${r} ${r} 0 1 1 ${x} ${cy - r}`} stroke="#f59e0b" strokeWidth="2.5" fill="none"/>
        <polygon points={`${x - 4},${cy - r - 6} ${x + 6},${cy - r + 2} ${x + 2},${cy - r + 10}`} fill="#f59e0b"/>
        <text x={x} y={topY - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="#b45309">{value.toFixed(2)} kN·m</text>
      </g>
    );
  }
  return null;
}

function UDLArrows({ x1, x2, beamTopY, label }) {
  const arrowY = beamTopY - 2;
  const lineY = beamTopY - 52;
  const arrows = [];
  const count = Math.max(2, Math.floor((x2 - x1) / ARROW_SPACING));
  for (let i = 0; i <= count; i++) {
    const x = x1 + (i / count) * (x2 - x1);
    arrows.push(
      <g key={i}>
        <line x1={x} y1={lineY + 3} x2={x} y2={arrowY - 7} stroke="#f59e0b" strokeWidth="1.6"/>
        <polygon points={`${x - 3.5},${arrowY - 9} ${x + 3.5},${arrowY - 9} ${x},${arrowY - 2}`} fill="#f59e0b"/>
      </g>
    );
  }
  return (
    <g>
      <line x1={x1} y1={lineY} x2={x2} y2={lineY} stroke="#f59e0b" strokeWidth="2"/>
      <line x1={x1} y1={lineY} x2={x1} y2={arrowY - 9} stroke="#f59e0b" strokeWidth="1.6"/>
      <line x1={x2} y1={lineY} x2={x2} y2={arrowY - 9} stroke="#f59e0b" strokeWidth="1.6"/>
      {arrows}
      <text x={(x1 + x2) / 2} y={lineY - 8} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#b45309">{label}</text>
    </g>
  );
}

// Red hatched ground line under a support
function Hatching({ cx, y, half }) {
  const ticks = [];
  const n = Math.max(4, Math.round((half * 2) / 6));
  for (let i = 0; i <= n; i++) {
    const x = cx - half + (i * 2 * half) / n;
    ticks.push(<line key={i} x1={x} y1={y} x2={x - 6} y2={y + 7} stroke={SUP_STROKE} strokeWidth="1"/>);
  }
  return (
    <g>
      <line x1={cx - half - 3} y1={y} x2={cx + half + 3} y2={y} stroke={SUP_STROKE} strokeWidth="1.6" strokeLinecap="round"/>
      {ticks}
    </g>
  );
}

function SupportSymbol({ support }) {
  const { x, type } = support;
  const s = SUPPORT_SIZE;
  const top = BEAM_BOTTOM; // supports hang below the beam

  if (type === 'pin') {
    const baseY = top + s * 1.4;
    return (
      <g>
        <polygon points={`${x},${top} ${x - s},${baseY} ${x + s},${baseY}`} fill={SUP_FILL} stroke={SUP_STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
        <Hatching cx={x} y={baseY + 1} half={s + 1} />
      </g>
    );
  }
  if (type === 'roller') {
    const r = s * 0.92;
    const cy = top + r;
    return (
      <g>
        <circle cx={x} cy={cy} r={r} fill={SUP_FILL} stroke={SUP_STROKE} strokeWidth="1.6"/>
        <Hatching cx={x} y={cy + r + 1} half={s + 1} />
      </g>
    );
  }
  if (type === 'fixed-left' || type === 'fixed-right') {
    const wallW = 10;
    const wx = type === 'fixed-left' ? beamLeftWallX(x, wallW) : x;
    const dir = type === 'fixed-left' ? -1 : 1;
    const edge = type === 'fixed-left' ? x : x;
    return (
      <g>
        <rect x={type === 'fixed-left' ? x - wallW : x} y={BEAM_TOP - 6} width={wallW} height={BEAM_HEIGHT + 12} fill="#f0f2f6" stroke={SUP_STROKE} strokeWidth="1.6"/>
        {Array.from({ length: 8 }).map((_, i) => {
          const yy = BEAM_TOP - 6 + 4 + i * ((BEAM_HEIGHT + 12) / 8);
          const x0 = type === 'fixed-left' ? x - wallW : x + wallW;
          return <line key={i} x1={x0} y1={yy} x2={x0 + dir * 7} y2={yy + 7} stroke={SUP_STROKE} strokeWidth="1"/>;
        })}
      </g>
    );
  }
  return null;
}

function beamLeftWallX(x, w) { return x - w; }

function DimensionLine({ x1, x2, y, label }) {
  const t = 6;
  return (
    <g>
      <line x1={x1} y1={y - t - 4} x2={x1} y2={y + t} stroke="#9aa4b5" strokeWidth="1" strokeDasharray="3,3"/>
      <line x1={x2} y1={y - t - 4} x2={x2} y2={y + t} stroke="#9aa4b5" strokeWidth="1" strokeDasharray="3,3"/>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#6b7588" strokeWidth="1"/>
      <polygon points={`${x1},${y} ${x1 + 9},${y - 3} ${x1 + 9},${y + 3}`} fill="#6b7588"/>
      <polygon points={`${x2},${y} ${x2 - 9},${y - 3} ${x2 - 9},${y + 3}`} fill="#6b7588"/>
      <rect x={(x1 + x2) / 2 - 30} y={y + 6} width="60" height="17" rx="4" fill="white" stroke="#e4e8ef" strokeWidth="1"/>
      <text x={(x1 + x2) / 2} y={y + 17.5} textAnchor="middle" fontSize="11.5" fill="#3f4756" fontWeight="600">{label}</text>
    </g>
  );
}

function getSupports(beamType, beamX, beamW) {
  if (beamType === 'simply-supported') return [{ x: beamX, type: 'pin' }, { x: beamX + beamW, type: 'roller' }];
  if (beamType === 'left-cantilever') return [{ x: beamX, type: 'fixed-left' }];
  if (beamType === 'right-cantilever') return [{ x: beamX + beamW, type: 'fixed-right' }];
  if (beamType === 'continuous') return [{ x: beamX, type: 'pin' }, { x: beamX + beamW / 2, type: 'roller' }, { x: beamX + beamW, type: 'roller' }];
  return [];
}

function getNodes(beamType, beamX, beamW) {
  if (beamType === 'continuous') {
    return [
      { x: beamX, label: '1' },
      { x: beamX + beamW / 2, label: '2' },
      { x: beamX + beamW, label: '3' },
    ];
  }
  return [{ x: beamX, label: '1' }, { x: beamX + beamW, label: '2' }];
}
