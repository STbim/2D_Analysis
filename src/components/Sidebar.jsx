import React, { useState } from 'react';
import { MATERIALS, getLibraries, getGrades, getMaterialProps, getMaterialLabel } from '../utils/materials.js';
import { computeI, computeArea } from '../utils/beamSolver.js';

// ─── Generic icons ──────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className={`transition-transform duration-200 ${open ? '' : '-rotate-90'}`}>
      <path d="M3 5l4 4 4-4" stroke="#9aa4b5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 9v2h9V9M6.5 1v7M4 5l2.5 3L9 5" stroke="#9aa4b5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 5V2h3M8 2h3v3M11 8v3H8M5 11H2V8" stroke="#9aa4b5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Beam type SVGs ───────────────────────────────────────────────────────────

function LeftCantileverIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  const f = active ? '#ace9f0' : '#e4e8ef';
  return (
    <svg width="38" height="22" viewBox="0 0 38 22">
      <rect x="1" y="6" width="5" height="11" rx="0.5" fill={f} stroke={c} strokeWidth="1"/>
      {[7, 10, 13, 16].map(y => <line key={y} x1="1" y1={y} x2="-1.5" y2={y + 2.5} stroke={c} strokeWidth="0.8"/>)}
      <rect x="6" y="9.5" width="28" height="3.5" rx="1" fill={active ? '#73d6e3' : '#c6cdd9'} stroke={c} strokeWidth="1"/>
    </svg>
  );
}

function RightCantileverIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  const f = active ? '#ace9f0' : '#e4e8ef';
  return (
    <svg width="38" height="22" viewBox="0 0 38 22">
      <rect x="4" y="9.5" width="28" height="3.5" rx="1" fill={active ? '#73d6e3' : '#c6cdd9'} stroke={c} strokeWidth="1"/>
      <rect x="32" y="6" width="5" height="11" rx="0.5" fill={f} stroke={c} strokeWidth="1"/>
      {[7, 10, 13, 16].map(y => <line key={y} x1="37" y1={y} x2="39.5" y2={y + 2.5} stroke={c} strokeWidth="0.8"/>)}
    </svg>
  );
}

function SimplySupportedIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  return (
    <svg width="38" height="22" viewBox="0 0 38 22">
      <rect x="4" y="7" width="30" height="3.5" rx="1" fill={active ? '#73d6e3' : '#c6cdd9'} stroke={c} strokeWidth="1"/>
      <polygon points="5,10.5 1.5,16 8.5,16" fill="none" stroke={c} strokeWidth="1"/>
      <line x1="0.5" y1="17" x2="9.5" y2="17" stroke={c} strokeWidth="1"/>
      <polygon points="33,10.5 29.5,15 36.5,15" fill="none" stroke={c} strokeWidth="1"/>
      <circle cx="31.3" cy="16.4" r="1.1" fill="none" stroke={c} strokeWidth="0.9"/>
      <circle cx="34.7" cy="16.4" r="1.1" fill="none" stroke={c} strokeWidth="0.9"/>
      <line x1="28.5" y1="18" x2="37.5" y2="18" stroke={c} strokeWidth="1"/>
    </svg>
  );
}

function ContinuousIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  return (
    <svg width="38" height="22" viewBox="0 0 38 22">
      <rect x="2" y="7" width="34" height="3.5" rx="1" fill={active ? '#73d6e3' : '#c6cdd9'} stroke={c} strokeWidth="1"/>
      {[4, 19, 34].map(x => (
        <g key={x}>
          <polygon points={`${x},10.5 ${x - 3},15 ${x + 3},15`} fill="none" stroke={c} strokeWidth="1"/>
          <line x1={x - 4} y1="16" x2={x + 4} y2="16" stroke={c} strokeWidth="1"/>
        </g>
      ))}
    </svg>
  );
}

// ─── Section SVGs ─────────────────────────────────────────────────────────────

function RectIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  const f = active ? '#d3f6f9' : '#f0f2f6';
  return <svg width="34" height="30" viewBox="0 0 34 30"><rect x="10" y="3" width="14" height="24" rx="1" fill={f} stroke={c} strokeWidth="1.5"/></svg>;
}
function TSectionIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  const f = active ? '#d3f6f9' : '#f0f2f6';
  return (
    <svg width="34" height="30" viewBox="0 0 34 30">
      <path d="M5 3 H29 V9 H20 V27 H14 V9 H5 Z" fill={f} stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}
function ISectionIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  const f = active ? '#d3f6f9' : '#f0f2f6';
  return (
    <svg width="34" height="30" viewBox="0 0 34 30">
      <path d="M5 3 H29 V8 H20 V22 H29 V27 H5 V22 H14 V8 H5 Z" fill={f} stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Load type SVGs ───────────────────────────────────────────────────────────

function UDLIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  return (
    <svg width="36" height="26" viewBox="0 0 36 26">
      <line x1="4" y1="5" x2="32" y2="5" stroke="#f59e0b" strokeWidth="1.4"/>
      {[6, 13, 20, 27].map(x => (
        <g key={x}>
          <line x1={x} y1="5" x2={x} y2="15" stroke="#f59e0b" strokeWidth="1.3"/>
          <polygon points={`${x - 2.5},13 ${x + 2.5},13 ${x},17`} fill="#f59e0b"/>
        </g>
      ))}
      <line x1="2" y1="19" x2="34" y2="19" stroke={c} strokeWidth="1.4"/>
    </svg>
  );
}
function PartialUDLIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  return (
    <svg width="36" height="26" viewBox="0 0 36 26">
      <line x1="11" y1="5" x2="31" y2="5" stroke="#f59e0b" strokeWidth="1.4"/>
      {[13, 20, 27].map(x => (
        <g key={x}>
          <line x1={x} y1="5" x2={x} y2="15" stroke="#f59e0b" strokeWidth="1.3"/>
          <polygon points={`${x - 2.5},13 ${x + 2.5},13 ${x},17`} fill="#f59e0b"/>
        </g>
      ))}
      <line x1="2" y1="19" x2="34" y2="19" stroke={c} strokeWidth="1.4"/>
    </svg>
  );
}
function PointLoadIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  return (
    <svg width="36" height="26" viewBox="0 0 36 26">
      <line x1="18" y1="3" x2="18" y2="16" stroke="#f59e0b" strokeWidth="1.8"/>
      <polygon points="13.5,14 22.5,14 18,19" fill="#f59e0b"/>
      <line x1="2" y1="19" x2="34" y2="19" stroke={c} strokeWidth="1.4"/>
    </svg>
  );
}
function PointMomentIcon({ active }) {
  const c = active ? '#157d97' : '#9aa4b5';
  return (
    <svg width="36" height="26" viewBox="0 0 36 26">
      <path d="M11 12 A7 7 0 1 1 18 19" stroke="#f59e0b" strokeWidth="1.8" fill="none"/>
      <polygon points="15,17 21,21 22,15" fill="#f59e0b"/>
      <line x1="2" y1="22" x2="34" y2="22" stroke={c} strokeWidth="1.4"/>
    </svg>
  );
}

// ─── Collapsible Panel ────────────────────────────────────────────────────────

function Panel({ title, children, defaultOpen = true, actions, icon }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-ink-100">
      <div
        role="button"
        tabIndex={0}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-ink-50/60 transition-colors cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2">
          <ChevronIcon open={open} />
          <span className="text-[12.5px] font-semibold text-ink-800">{title}</span>
        </span>
        {actions && <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>{actions}</div>}
      </div>
      {open && <div className="px-3.5 pb-3.5 fade-in">{children}</div>}
    </div>
  );
}

// ─── Parameter row ────────────────────────────────────────────────────────────

function ParamRow({ label, value, onChange, unit, type = 'number', readOnly = false, min, step }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <label className="text-[11.5px] text-ink-500 w-24 shrink-0">{label}</label>
      <div className="flex items-center gap-1.5 flex-1">
        <input
          type={type}
          value={value}
          onChange={onChange ? e => onChange(e.target.value) : undefined}
          readOnly={readOnly}
          min={min}
          step={step}
          className={`param-input flex-1 ${type === 'number' ? 'input-num text-right' : ''}`}
        />
        {unit && <span className="text-[11px] text-ink-400 w-11 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div className="mb-2">
      <label className="text-[11.5px] text-ink-500 block mb-1">{label}</label>
      <select value={value} onChange={onChange} className="param-input">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({ model, setModel, phase, results, activeTopTab = 'Project', prefs, setPrefs }) {
  const [activeLoadTab, setActiveLoadTab] = useState('DL');

  // ── Preferences view ──
  if (activeTopTab === 'Preferences' && prefs && setPrefs) {
    return <PreferencesPanel prefs={prefs} setPrefs={setPrefs} model={model} update={(k, v) => setModel(p => ({ ...p, [k]: v }))} />;
  }

  const update = (path, value) => {
    setModel(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const updateMaterial = (field, value) => {
    if (field === 'type') {
      const libs = getLibraries(value); const lib = libs[0];
      const grades = getGrades(value, lib); const grade = grades[0];
      const props = getMaterialProps(value, lib, grade);
      setModel(prev => ({ ...prev, material: { type: value, library: lib, grade, ...props } }));
    } else if (field === 'library') {
      const grades = getGrades(model.material.type, value); const grade = grades[0];
      const props = getMaterialProps(model.material.type, value, grade);
      setModel(prev => ({ ...prev, material: { ...prev.material, library: value, grade, ...props } }));
    } else if (field === 'grade') {
      const props = getMaterialProps(model.material.type, model.material.library, value);
      setModel(prev => ({ ...prev, material: { ...prev.material, grade: value, ...props } }));
    }
  };

  const mat = model.material;
  const sec = model.section;
  const I_mm4 = computeI(sec);
  const A_mm2 = computeArea(sec);

  const activeLoad = activeLoadTab === 'DL' ? model.deadLoad : model.liveLoad;
  const loadKey = activeLoadTab === 'DL' ? 'deadLoad' : 'liveLoad';

  const beamTypes = [
    { id: 'left-cantilever', label: 'Left Cant.', Icon: LeftCantileverIcon },
    { id: 'right-cantilever', label: 'Right Cant.', Icon: RightCantileverIcon },
    { id: 'simply-supported', label: 'Simple', Icon: SimplySupportedIcon },
    { id: 'continuous', label: 'Continuous', Icon: ContinuousIcon },
  ];
  const sectionTypes = [
    { id: 'rectangular', label: 'Rectangular', Icon: RectIcon },
    { id: 't-section', label: 'T-Section', Icon: TSectionIcon },
    { id: 'i-section', label: 'I-Section', Icon: ISectionIcon },
  ];
  const loadTypes = [
    { id: 'udl', label: 'UDL', Icon: UDLIcon },
    { id: 'partial-udl', label: 'Partial', Icon: PartialUDLIcon },
    { id: 'point-load', label: 'Point', Icon: PointLoadIcon },
    { id: 'point-moment', label: 'Moment', Icon: PointMomentIcon },
  ];

  const isPointLoad = activeLoad.type === 'point-load' || activeLoad.type === 'point-moment';

  return (
    <aside className="w-[260px] min-w-[260px] bg-white border-r border-ink-200 overflow-y-auto flex flex-col shrink-0">

      {/* Units bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ink-100 bg-ink-50/40">
        <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">Units</span>
        <select
          value={model.units}
          onChange={e => update('units', e.target.value)}
          className="param-input w-24 py-1 text-[12px]"
        >
          <option value="SI">SI (kN, m)</option>
          <option value="Metric">Metric</option>
        </select>
      </div>

      {/* Project Information */}
      <Panel title="Project Information" defaultOpen={false}>
        <ParamRow label="Project" value={model.projectInfo.name} onChange={v => update('projectInfo.name', v)} type="text" />
        <ParamRow label="Engineer" value={model.projectInfo.engineer} onChange={v => update('projectInfo.engineer', v)} type="text" />
        <ParamRow label="Date" value={model.projectInfo.date} onChange={v => update('projectInfo.date', v)} type="text" />
      </Panel>

      {/* Beam Type */}
      <Panel title="Beam Type" defaultOpen={true}>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {beamTypes.map(({ id, label, Icon }) => (
            <button key={id} title={label} onClick={() => update('beamType', id)}
              className={`tile-btn ${model.beamType === id ? 'active' : ''}`}>
              <Icon active={model.beamType === id} />
              <span className="tile-label">{label}</span>
            </button>
          ))}
        </div>
        <ParamRow label="Span Length, L" value={model.spanLength}
          onChange={v => update('spanLength', parseFloat(v) || 1)} unit="m" min="0.1" step="0.5" />
      </Panel>

      {/* Material */}
      <Panel title="Material" defaultOpen={true}>
        <FieldSelect label="Type" value={mat.type} onChange={e => updateMaterial('type', e.target.value)} options={Object.keys(MATERIALS)} />
        <FieldSelect label="Library" value={mat.library} onChange={e => updateMaterial('library', e.target.value)} options={getLibraries(mat.type)} />
        <FieldSelect label="Grade" value={mat.grade} onChange={e => updateMaterial('grade', e.target.value)} options={getGrades(mat.type, mat.library)} />
        <div className="mt-2 pt-2.5 border-t border-ink-100 space-y-2">
          <ParamRow label={getMaterialLabel(mat.type)} value={mat.fc?.toFixed(2)} readOnly unit="MPa" />
          <ParamRow label="Modulus, E" value={mat.E?.toFixed(0)} readOnly unit="MPa" />
          <ParamRow label="Density" value={mat.density?.toFixed(2)} readOnly unit="kN/m³" />
        </div>
      </Panel>

      {/* Section */}
      <Panel title="Section" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {sectionTypes.map(({ id, label, Icon }) => (
            <button key={id} title={label} onClick={() => update('section.type', id)}
              className={`tile-btn ${sec.type === id ? 'active' : ''}`}>
              <Icon active={sec.type === id} />
              <span className="tile-label">{label}</span>
            </button>
          ))}
        </div>
        <ParamRow label="Width, b" value={sec.width} onChange={v => update('section.width', parseFloat(v) || 1)} unit="mm" min="1" />
        <ParamRow label="Height, h" value={sec.height} onChange={v => update('section.height', parseFloat(v) || 1)} unit="mm" min="1" />
        <div className="mt-2 pt-2.5 border-t border-ink-100 space-y-2">
          <ParamRow label="Area, A" value={(A_mm2 / 1e6).toFixed(5)} readOnly unit="m²" />
          <ParamRow label="Inertia, I" value={(I_mm4 / 1e12).toExponential(3)} readOnly unit="m⁴" />
        </div>
      </Panel>

      {/* Loads */}
      <Panel title="Loads" defaultOpen={true}>
        <div className="flex mb-3 bg-ink-50 rounded-lg p-0.5">
          {[{ id: 'DL', label: 'Dead Load' }, { id: 'LL', label: 'Live Load' }].map(({ id, label }) => (
            <button key={id} onClick={() => setActiveLoadTab(id)}
              className={`flex-1 py-1.5 text-[11.5px] font-semibold rounded-md transition-all ${
                activeLoadTab === id ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {loadTypes.map(({ id, label, Icon }) => (
            <button key={id} title={label} onClick={() => update(`${loadKey}.type`, id)}
              className={`tile-btn ${activeLoad.type === id ? 'active' : ''}`}>
              <Icon active={activeLoad.type === id} />
              <span className="tile-label">{label}</span>
            </button>
          ))}
        </div>
        <ParamRow label="Load Value" value={activeLoad.value}
          onChange={v => update(`${loadKey}.value`, parseFloat(v) || 0)}
          unit={isPointLoad ? (activeLoad.type === 'point-moment' ? 'kN·m' : 'kN') : 'kN/m'} step="1" />
        {!isPointLoad ? (
          <>
            <ParamRow label="Left Offset" value={activeLoad.leftOffset} onChange={v => update(`${loadKey}.leftOffset`, parseFloat(v) || 0)} unit="m" step="0.1" />
            <ParamRow label="Right Offset" value={activeLoad.rightOffset} onChange={v => update(`${loadKey}.rightOffset`, parseFloat(v) || 0)} unit="m" step="0.1" />
          </>
        ) : (
          <ParamRow label="Position, a" value={activeLoad.leftOffset} onChange={v => update(`${loadKey}.leftOffset`, parseFloat(v) || 0)} unit="m" step="0.1" />
        )}
      </Panel>

      {/* Model phase tables */}
      {phase === 'model' && (
        <>
          <ModelTable title="Materials" actions={<TableActions />}>
            <table className="model-table">
              <thead><tr><th>Name</th><th>Type</th><th>Library</th></tr></thead>
              <tbody><tr><td>{mat.name || `${mat.type} ${mat.grade}`}</td><td>{mat.type}</td><td>{mat.library}</td></tr></tbody>
            </table>
          </ModelTable>

          <ModelTable title="Sections" actions={<TableActions />}>
            <table className="model-table">
              <thead><tr><th>Name</th><th>Type</th><th>Material</th></tr></thead>
              <tbody><tr><td>S1</td><td className="capitalize">{sec.type.replace('-', ' ')}</td><td>{mat.type}</td></tr></tbody>
            </table>
          </ModelTable>

          <ModelTable title="Spans" actions={<TableActions />}>
            <table className="model-table">
              <thead><tr><th>Span</th><th>Length (m)</th><th>Section</th></tr></thead>
              <tbody>
                {model.beamType === 'continuous' ? (
                  <>
                    <tr><td>Span-1</td><td>{(model.spanLength / 2).toFixed(2)}</td><td>S1</td></tr>
                    <tr><td>Span-2</td><td>{(model.spanLength / 2).toFixed(2)}</td><td>S1</td></tr>
                  </>
                ) : (
                  <tr><td>Span-1</td><td>{model.spanLength.toFixed(2)}</td><td>S1</td></tr>
                )}
              </tbody>
            </table>
          </ModelTable>

          <ModelTable title="Supports" actions={<TableActions />}>
            <table className="model-table">
              <thead><tr><th>Node</th><th>Support Type</th></tr></thead>
              <tbody>{getSupportRows(model.beamType).map((r, i) => <tr key={i}><td>{r.node}</td><td>{r.type}</td></tr>)}</tbody>
            </table>
          </ModelTable>

          <ModelTable title="Loads" actions={<TableActions />}>
            <table className="model-table">
              <thead><tr><th>Load</th><th>Case</th><th>Type</th><th>Value</th></tr></thead>
              <tbody>
                {model.deadLoad.value !== 0 && <tr><td>DL1</td><td>DL</td><td>{formatLoadType(model.deadLoad.type)}</td><td>{model.deadLoad.value}</td></tr>}
                {model.liveLoad.value !== 0 && <tr><td>LL1</td><td>LL</td><td>{formatLoadType(model.liveLoad.type)}</td><td>{model.liveLoad.value}</td></tr>}
                {model.deadLoad.value === 0 && model.liveLoad.value === 0 && <tr><td colSpan="4" className="text-center text-ink-400">No loads defined</td></tr>}
              </tbody>
            </table>
          </ModelTable>

          <ModelTable title="Load Cases">
            <table className="model-table">
              <thead><tr><th>Load Case</th><th>Short Name</th></tr></thead>
              <tbody><tr><td>Dead</td><td>DL</td></tr><tr><td>Live</td><td>LL</td></tr></tbody>
            </table>
          </ModelTable>

          <ModelTable title="Load Combinations">
            <table className="model-table">
              <thead><tr><th>Name</th><th>Expression</th></tr></thead>
              <tbody><tr><td>Combo 1</td><td>1.4 DL</td></tr><tr><td>Combo 2</td><td>1.2 DL + 1.6 LL</td></tr></tbody>
            </table>
          </ModelTable>

          {results && (
            <ModelTable title="Reactions">
              <ReactionTable results={results} model={model} />
            </ModelTable>
          )}
        </>
      )}

      <div className="h-4 shrink-0" />
    </aside>
  );
}

function TableActions() {
  return (
    <div className="flex gap-0.5">
      <button className="p-1.5 hover:bg-ink-100 rounded-md transition-colors" title="Export"><ExportIcon /></button>
      <button className="p-1.5 hover:bg-ink-100 rounded-md transition-colors" title="Expand"><ExpandIcon /></button>
    </div>
  );
}

function ModelTable({ title, children, actions }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-ink-100">
      <div role="button" tabIndex={0} className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-ink-50/60 transition-colors cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <span className="flex items-center gap-2">
          <ChevronIcon open={open} />
          <span className="text-[12.5px] font-semibold text-ink-800">{title}</span>
        </span>
        {actions && <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>{actions}</div>}
      </div>
      {open && (
        <div className="px-2.5 pb-3 fade-in">
          <div className="border border-ink-100 rounded-lg overflow-hidden overflow-x-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

// ─── Preferences Panel ────────────────────────────────────────────────────────

function Toggle({ label, value, onChange, hint }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex flex-col">
        <span className="text-[12px] text-ink-700 font-medium">{label}</span>
        {hint && <span className="text-[10.5px] text-ink-400">{hint}</span>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-brand-500' : 'bg-ink-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

function PreferencesPanel({ prefs, setPrefs, model, update }) {
  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  return (
    <aside className="w-[260px] min-w-[260px] bg-white border-r border-ink-200 overflow-y-auto flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-ink-100 bg-ink-50/40">
        <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">Preferences</span>
      </div>

      <Panel title="Units & Code" defaultOpen={true}>
        <FieldSelect label="Unit System" value={model.units} onChange={e => update('units', e.target.value)} options={['SI', 'Metric']} />
        <FieldSelect label="Design Code" value={prefs.designCode}
          onChange={e => set('designCode', e.target.value)}
          options={['ACI 318M-14', 'ACI 318-19', 'Eurocode 2', 'BS 8110', 'AISC 360']} />
      </Panel>

      <Panel title="Display" defaultOpen={true}>
        <div className="mb-3">
          <label className="text-[11.5px] text-ink-500 block mb-1">Decimal Precision</label>
          <select value={prefs.precision} onChange={e => set('precision', parseInt(e.target.value))} className="param-input">
            {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n} decimal{n === 1 ? '' : 's'}</option>)}
          </select>
        </div>
        <Toggle label="Canvas grid" hint="Show grid in model view" value={prefs.showGrid} onChange={v => set('showGrid', v)} />
        <Toggle label="Diagram fill" hint="Shade area under SFD/BMD" value={prefs.diagramFill} onChange={v => set('diagramFill', v)} />
      </Panel>

      <Panel title="About" defaultOpen={true}>
        <div className="text-[11.5px] text-ink-500 space-y-1.5">
          <div className="flex justify-between"><span>Application</span><span className="text-ink-700 font-medium">Beam 2D</span></div>
          <div className="flex justify-between"><span>Version</span><span className="text-ink-700 font-medium">1.0.0</span></div>
          <div className="flex justify-between"><span>Solver</span><span className="text-ink-700 font-medium">Euler–Bernoulli FEM</span></div>
          <div className="flex justify-between"><span>Elements/span</span><span className="text-ink-700 font-medium">100</span></div>
        </div>
        <p className="text-[10.5px] text-ink-400 mt-2.5 leading-relaxed">
          Direct stiffness method with analytical reaction recovery. Verified against
          closed-form solutions for simply-supported, cantilever and continuous beams.
        </p>
      </Panel>

      <div className="h-4 shrink-0" />
    </aside>
  );
}

function getSupportRows(beamType) {
  if (beamType === 'simply-supported') return [{ node: 'N1', type: 'Pin' }, { node: 'N2', type: 'Roller' }];
  if (beamType === 'left-cantilever') return [{ node: 'N1', type: 'Fixed' }, { node: 'N2', type: 'Free' }];
  if (beamType === 'right-cantilever') return [{ node: 'N1', type: 'Free' }, { node: 'N2', type: 'Fixed' }];
  if (beamType === 'continuous') return [{ node: 'N1', type: 'Pin' }, { node: 'N2', type: 'Roller' }, { node: 'N3', type: 'Roller' }];
  return [];
}

function formatLoadType(type) {
  return { 'udl': 'UDL', 'partial-udl': 'Partial UDL', 'point-load': 'Point Load', 'point-moment': 'Point Moment' }[type] || type;
}

function ReactionTable({ results, model }) {
  const NUM_ELEM = 100;
  const numNodes = NUM_ELEM + 1;
  const caseLabels = { DL: 'DL', LL: 'LL', COMBO1: 'C1', COMBO2: 'C2' };
  const supportDofs = [];
  const { beamType } = model;
  if (beamType === 'simply-supported') {
    supportDofs.push({ dof: 0, label: 'N1 (Pin)' });
    supportDofs.push({ dof: (numNodes - 1) * 2, label: 'N2 (Roller)' });
  } else if (beamType === 'left-cantilever') {
    supportDofs.push({ dof: 0, label: 'N1 · V' });
    supportDofs.push({ dof: 1, label: 'N1 · M' });
  } else if (beamType === 'right-cantilever') {
    supportDofs.push({ dof: (numNodes - 1) * 2, label: 'N2 · V' });
    supportDofs.push({ dof: (numNodes - 1) * 2 + 1, label: 'N2 · M' });
  } else if (beamType === 'continuous') {
    const midNode = Math.floor(numNodes / 2);
    supportDofs.push({ dof: 0, label: 'N1' });
    supportDofs.push({ dof: midNode * 2, label: 'N2 (Mid)' });
    supportDofs.push({ dof: (numNodes - 1) * 2, label: 'N3' });
  }
  return (
    <table className="model-table">
      <thead><tr><th>Support</th>{Object.values(caseLabels).map(k => <th key={k}>{k}</th>)}</tr></thead>
      <tbody>
        {supportDofs.map(({ dof, label }) => (
          <tr key={dof}>
            <td className="font-medium">{label}</td>
            {Object.keys(caseLabels).map(k => {
              const r = results[k]?.reactions[dof];
              const isMoment = label.includes('M');
              const val = r !== undefined ? (isMoment ? (r / 1e6).toFixed(1) : (r / 1000).toFixed(1)) : '—';
              return <td key={k}>{val}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
