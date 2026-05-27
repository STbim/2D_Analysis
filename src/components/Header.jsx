import React from 'react';

function Logo() {
  return (
    <div className="flex items-center gap-2.5 mr-1">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 13.5 L9 3 L16 13.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <line x1="1.5" y1="14.5" x2="16.5" y2="14.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
          <circle cx="2.5" cy="14.5" r="1.4" fill="white"/>
          <circle cx="15.5" cy="14.5" r="1.4" fill="white"/>
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-ink-900 text-[15px] tracking-tight">Beam</span>
        <span className="text-[9px] text-ink-400 font-medium tracking-wide">2D STRUCTURAL ANALYSIS</span>
      </div>
    </div>
  );
}

export default function Header({
  phase,
  activeTopTab,
  setActiveTopTab,
  activeViewTab,
  setActiveViewTab,
  onGenerate,
  onAnalyze,
  hasResults,
}) {
  return (
    <header className="flex items-center justify-between pl-3 pr-4 h-14 bg-white border-b border-ink-200 shrink-0 z-20 shadow-sm">
      {/* Left: logo + Project/Preferences */}
      <div className="flex items-center gap-3">
        <Logo />
        <div className="h-7 w-px bg-ink-200" />
        <div className="flex gap-0.5 bg-ink-50 rounded-lg p-0.5">
          {['Project', 'Preferences'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTopTab(tab)}
              className={`tab-pill ${
                activeTopTab === tab
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Model / Report */}
      <div className="flex gap-0.5 bg-ink-50 rounded-lg p-0.5">
        {[
          { id: 'Model', icon: <ModelIcon /> },
          { id: 'Report', icon: <ReportIcon /> },
        ].map(({ id, icon }) => (
          <button
            key={id}
            onClick={() => setActiveViewTab(id)}
            className={`tab-pill flex items-center gap-1.5 ${
              activeViewTab === id
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            {icon}
            {id}
          </button>
        ))}
      </div>

      {/* Right: Analyze + Generate */}
      <div className="flex items-center gap-2">
        {hasResults && (
          <button
            onClick={onAnalyze}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-brand-300 text-brand-700 hover:bg-brand-50 text-[13px] font-semibold rounded-lg transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <polygon points="3,2 11,6.5 3,11" fill="currentColor"/>
            </svg>
            Analyze
          </button>
        )}
        <button
          onClick={onGenerate}
          className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
            phase === 'input'
              ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
              : 'bg-white border border-ink-200 hover:border-brand-300 hover:text-brand-700 text-ink-600'
          }`}
        >
          {phase === 'input' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11.5 6A4.5 4.5 0 1 0 10 9.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <polyline points="11.5,3 11.5,6 8.5,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          )}
          {phase === 'input' ? 'Generate Model' : 'Update Model'}
        </button>
      </div>
    </header>
  );
}

function ModelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="1.5" y1="5" x2="12.5" y2="5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="5" y1="5" x2="5" y2="12" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 1.5h5l3 3V12a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 3 12V2a.5.5 0 0 1 .5-.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M8 1.5V4.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <line x1="5" y1="7.5" x2="9" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="5" y1="9.5" x2="9" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
