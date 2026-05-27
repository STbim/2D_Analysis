import React, { useState, useCallback } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import BeamViewer from './components/BeamViewer.jsx';
import DiagramViewer from './components/DiagramViewer.jsx';
import { solveBeam } from './utils/beamSolver.js';

const initialModel = {
  projectInfo: { name: '', engineer: '', date: '' },
  units: 'SI',
  beamType: 'simply-supported',
  spanLength: 6,
  material: {
    type: 'Concrete',
    library: 'United States',
    grade: '4000Psi',
    name: 'Concrete 4000 Psi',
    fc: 27.58,
    E: 24855.58,
    density: 23.56,
  },
  section: {
    type: 'rectangular',
    width: 300,
    height: 500,
  },
  deadLoad: { type: 'udl', value: 20, leftOffset: 0, rightOffset: 0 },
  liveLoad: { type: 'udl', value: 0, leftOffset: 0, rightOffset: 0 },
};

export default function App() {
  const [phase, setPhase] = useState('input');          // 'input' | 'model'
  const [model, setModel] = useState(initialModel);
  const [results, setResults] = useState(null);
  const [activeTopTab, setActiveTopTab] = useState('Project');
  const [activeViewTab, setActiveViewTab] = useState('Model');
  const [activeDiagram, setActiveDiagram] = useState('all');
  const [activeLoadCase, setActiveLoadCase] = useState('DL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const handleGenerate = useCallback(() => {
    setPhase('model');
    // Re-run analysis if we already had results
    if (results) {
      try {
        const newResults = solveBeam(model);
        setResults(newResults);
      } catch (e) {
        console.error(e);
      }
    }
  }, [model, results]);

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const newResults = solveBeam(model);
        setResults(newResults);
        setActiveViewTab('Report');
        setActiveDiagram('all');
      } catch (e) {
        console.error('Analysis error:', e);
        setAnalyzeError(e.message || 'Analysis failed');
      } finally {
        setIsAnalyzing(false);
      }
    }, 10);
  }, [model]);

  const showDiagrams = activeViewTab === 'Report' && results;
  const showBeam = !showDiagrams;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ink-50 font-sans">
      {/* Header */}
      <Header
        phase={phase}
        activeTopTab={activeTopTab}
        setActiveTopTab={setActiveTopTab}
        activeViewTab={activeViewTab}
        setActiveViewTab={setActiveViewTab}
        onGenerate={handleGenerate}
        onAnalyze={handleAnalyze}
        hasResults={phase === 'model'}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          model={model}
          setModel={setModel}
          phase={phase}
          results={results}
        />

        {/* Content area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Loading overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center z-30">
              <div className="flex flex-col items-center gap-3">
                <div className="spinner" />
                <span className="text-[13px] font-medium text-ink-600">Running FEM analysis…</span>
              </div>
            </div>
          )}

          {/* Error banner */}
          {analyzeError && (
            <div className="shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5"/>
                <line x1="8" y1="5" x2="8" y2="9" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="11.5" r="0.8" fill="#ef4444"/>
              </svg>
              <span className="text-[13px] text-red-600">{analyzeError}</span>
              <button onClick={() => setAnalyzeError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">Dismiss</button>
            </div>
          )}

          {/* Model phase status / tab bar */}
          {phase === 'model' && (
            <div className="shrink-0 flex items-center gap-2 px-4 h-11 bg-white border-b border-ink-200">
              <div className="flex gap-0.5 bg-ink-50 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveViewTab('Model')}
                  className={`tab-pill ${activeViewTab === 'Model' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
                >
                  Beam Model
                </button>
                {results && (
                  <button
                    onClick={() => setActiveViewTab('Report')}
                    className={`tab-pill ${activeViewTab === 'Report' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
                  >
                    Diagrams
                  </button>
                )}
              </div>
              {!results ? (
                <div className="ml-auto flex items-center gap-2.5">
                  <span className="text-[12px] text-ink-500">Model ready — run the solver to view results</span>
                  <button
                    onClick={handleAnalyze}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-[12.5px] font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polygon points="2,1 11,6 2,11" fill="white"/></svg>
                    Run Analysis
                  </button>
                </div>
              ) : (
                <div className="ml-auto flex items-center gap-2.5">
                  <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" fill="#10b981"/>
                      <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Analysis complete
                  </span>
                  <button onClick={handleAnalyze} className="px-3 py-1.5 bg-ink-100 hover:bg-ink-200 text-ink-600 text-[12px] rounded-lg font-medium transition-colors">
                    Re-run
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            {showBeam && (
              <BeamViewer
                model={model}
                results={results}
                activeLoadCase={activeLoadCase}
              />
            )}
            {showDiagrams && (
              <DiagramViewer
                results={results}
                activeDiagram={activeDiagram}
                setActiveDiagram={setActiveDiagram}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
