import React, { useState } from 'react';

const DIAGRAM_HEIGHT = 160;
const DIAGRAM_MARGIN = { top: 24, right: 20, bottom: 32, left: 60 };

function DiagramSVG({ data, xCoords, color, label, unit, yLabel, fillBelow = false }) {
  if (!data || data.length === 0) return null;

  const W = 700;
  const H = DIAGRAM_HEIGHT;
  const { top, right, bottom, left } = DIAGRAM_MARGIN;
  const plotW = W - left - right;
  const plotH = H - top - bottom;

  const maxX = xCoords[xCoords.length - 1];
  const rawMin = Math.min(...data);
  const rawMax = Math.max(...data);
  const absMax = Math.max(Math.abs(rawMin), Math.abs(rawMax), 0.001);

  // Axis range: symmetric around 0 or with 10% padding
  let yMin = rawMin < 0 ? rawMin * 1.15 : -absMax * 0.15;
  let yMax = rawMax > 0 ? rawMax * 1.15 : absMax * 0.15;
  if (Math.abs(yMax - yMin) < 0.001) { yMin = -1; yMax = 1; }

  const toSvgX = x => left + (x / maxX) * plotW;
  const toSvgY = y => top + (1 - (y - yMin) / (yMax - yMin)) * plotH;

  // Build path
  const points = xCoords.map((x, i) => `${toSvgX(x)},${toSvgY(data[i])}`);
  const polyline = points.join(' ');

  // Zero line Y
  const zeroY = toSvgY(0);

  // Fill path (close to zero line)
  const fillPath = [
    `M ${toSvgX(xCoords[0])},${zeroY}`,
    ...xCoords.map((x, i) => `L ${toSvgX(x)},${toSvgY(data[i])}`),
    `L ${toSvgX(xCoords[xCoords.length - 1])},${zeroY}`,
    'Z',
  ].join(' ');

  // Y axis ticks
  const numTicks = 5;
  const ticks = [];
  for (let i = 0; i <= numTicks; i++) {
    const val = yMin + (i / numTicks) * (yMax - yMin);
    const y = toSvgY(val);
    ticks.push({ val, y });
  }

  // Max/min annotations
  const maxIdx = data.indexOf(Math.max(...data));
  const minIdx = data.indexOf(Math.min(...data));

  const formatVal = v => {
    if (Math.abs(v) >= 100) return v.toFixed(1);
    if (Math.abs(v) >= 10) return v.toFixed(2);
    return v.toFixed(3);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-1 pl-2">
        <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
        <span className="text-xs font-bold text-gray-700">{label}</span>
        <span className="text-xs text-gray-400">({unit})</span>
        <span className="ml-auto text-xs text-gray-500 pr-2">
          Max: <strong style={{ color }}>{formatVal(rawMax)} {unit}</strong>
          {rawMin < -0.001 && (
            <> | Min: <strong style={{ color: '#ef4444' }}>{formatVal(rawMin)} {unit}</strong></>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="diagram-svg"
        style={{ height: `${H}px` }}
      >
        {/* Background */}
        <rect x={left} y={top} width={plotW} height={plotH} fill="#f9fafb" stroke="#e5e7eb" strokeWidth="0.5"/>

        {/* Grid lines */}
        {ticks.map(({ val, y }, i) => (
          <line key={i} x1={left} y1={y} x2={left + plotW} y2={y}
            stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray={val === 0 ? 'none' : '4,3'}/>
        ))}

        {/* Zero line */}
        <line x1={left} y1={zeroY} x2={left + plotW} y2={zeroY} stroke="#9ca3af" strokeWidth="1.2"/>

        {/* Fill */}
        <path d={fillPath} fill={color} opacity="0.15"/>

        {/* Diagram line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Y axis */}
        <line x1={left} y1={top} x2={left} y2={top + plotH} stroke="#9ca3af" strokeWidth="1"/>
        {/* X axis */}
        <line x1={left} y1={top + plotH} x2={left + plotW} y2={top + plotH} stroke="#9ca3af" strokeWidth="1"/>

        {/* Y tick labels */}
        {ticks.map(({ val, y }, i) => (
          <text key={i} x={left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#6b7280">
            {formatVal(val)}
          </text>
        ))}

        {/* X tick labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const x = toSvgX(frac * maxX);
          const xVal = frac * maxX;
          return (
            <g key={frac}>
              <line x1={x} y1={top + plotH} x2={x} y2={top + plotH + 4} stroke="#9ca3af" strokeWidth="1"/>
              <text x={x} y={top + plotH + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
                {xVal.toFixed(1)}m
              </text>
            </g>
          );
        })}

        {/* Y axis label */}
        <text
          x={left - 42}
          y={top + plotH / 2}
          textAnchor="middle"
          fontSize="9"
          fill="#6b7280"
          transform={`rotate(-90, ${left - 42}, ${top + plotH / 2})`}
        >
          {unit}
        </text>

        {/* Max annotation */}
        {rawMax !== 0 && (
          <g>
            <circle cx={toSvgX(xCoords[maxIdx])} cy={toSvgY(data[maxIdx])} r="3" fill={color}/>
            <text
              x={toSvgX(xCoords[maxIdx])}
              y={toSvgY(data[maxIdx]) - 6}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill={color}
            >
              {formatVal(rawMax)}
            </text>
          </g>
        )}

        {/* Min annotation */}
        {rawMin < -0.001 && (
          <g>
            <circle cx={toSvgX(xCoords[minIdx])} cy={toSvgY(data[minIdx])} r="3" fill="#ef4444"/>
            <text
              x={toSvgX(xCoords[minIdx])}
              y={toSvgY(data[minIdx]) + 14}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#ef4444"
            >
              {formatVal(rawMin)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

const CASE_LABELS = {
  DL: 'Dead Load (DL)',
  LL: 'Live Load (LL)',
  COMBO1: 'Combo 1 · 1.4 DL',
  COMBO2: 'Combo 2 · 1.2 DL + 1.6 LL',
};

export default function DiagramViewer({ results, activeDiagram, setActiveDiagram }) {
  const [activeCase, setActiveCase] = useState('DL');

  if (!results) return null;

  const caseResult = results[activeCase];
  if (!caseResult) return null;

  const { shear, moment, deflection, xCoords } = caseResult;

  const diagrams = [
    { id: 'shear', label: 'Shear Force Diagram (SFD)', data: shear, unit: 'kN', color: '#157d97' },
    { id: 'moment', label: 'Bending Moment Diagram (BMD)', data: moment, unit: 'kN·m', color: '#7c3aed' },
    { id: 'deflection', label: 'Deflection Diagram', data: deflection, unit: 'mm', color: '#059669' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-ink-50">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 h-12 bg-white border-b border-ink-200 shrink-0">
        <div className="flex items-center gap-0.5 bg-ink-50 rounded-lg p-0.5">
          {diagrams.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDiagram(d.id)}
              className={`tab-pill ${activeDiagram === d.id ? 'text-white shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
              style={activeDiagram === d.id ? { background: d.color } : {}}
            >
              {d.id === 'shear' ? 'SFD' : d.id === 'moment' ? 'BMD' : 'Deflection'}
            </button>
          ))}
          <button
            onClick={() => setActiveDiagram('all')}
            className={`tab-pill ${activeDiagram === 'all' ? 'bg-ink-800 text-white shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
          >
            All
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-ink-400 mr-1">Case</span>
          {Object.keys(CASE_LABELS).map(key => (
            <button
              key={key}
              onClick={() => setActiveCase(key)}
              title={CASE_LABELS[key]}
              className={`px-2.5 py-1 text-[11.5px] rounded-lg font-semibold transition-colors ${
                activeCase === key ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-100'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Diagram content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 fade-in">
        {activeDiagram === 'all' ? (
          diagrams.map(d => (
            <div key={d.id} className="bg-white border border-ink-200 rounded-xl overflow-hidden shadow-panel pt-3 pb-2">
              <DiagramSVG data={d.data} xCoords={xCoords} color={d.color} label={d.label} unit={d.unit} />
            </div>
          ))
        ) : (
          (() => {
            const d = diagrams.find(x => x.id === activeDiagram) || diagrams[0];
            return (
              <div className="bg-white border border-ink-200 rounded-xl overflow-hidden shadow-panel pt-3 pb-2">
                <DiagramSVG data={d.data} xCoords={xCoords} color={d.color} label={d.label} unit={d.unit} />
              </div>
            );
          })()
        )}

        {/* Summary table */}
        <div className="bg-white border border-ink-200 rounded-xl overflow-hidden shadow-panel">
          <div className="bg-ink-50/60 px-4 py-2.5 border-b border-ink-200">
            <span className="text-[11.5px] font-bold text-ink-600 uppercase tracking-wide">
              Analysis Summary — {CASE_LABELS[activeCase]}
            </span>
          </div>
          <div className="p-4">
            <table className="model-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Maximum (+)</th>
                  <th>Minimum (−)</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {diagrams.map(d => {
                  const maxVal = Math.max(...d.data);
                  const minVal = Math.min(...d.data);
                  const maxIdx = d.data.indexOf(maxVal);
                  const minIdx = d.data.indexOf(minVal);
                  return (
                    <tr key={d.id}>
                      <td className="font-medium" style={{ color: d.color }}>{d.id === 'shear' ? 'Shear (kN)' : d.id === 'moment' ? 'Moment (kN·m)' : 'Deflection (mm)'}</td>
                      <td>{maxVal.toFixed(3)}</td>
                      <td>{minVal.toFixed(3)}</td>
                      <td>{xCoords[Math.abs(maxVal) > Math.abs(minVal) ? maxIdx : minIdx]?.toFixed(2)}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
