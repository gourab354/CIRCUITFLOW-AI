import React from 'react';
import { 
  Terminal, AlertCircle, AlertTriangle, CheckCircle2, 
  ChevronDown, ChevronUp, Activity, Layers, Trash2 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const BottomPanel: React.FC = () => {
  const { 
    bottomPanelOpen, setBottomPanelOpen, 
    activeBottomTab, setActiveBottomTab,
    consoleLogs, currentProject, setSelectedComponentRef, setActiveTab 
  } = useAppStore();

  const drcViolations = currentProject?.circuit.drc_violations || [];
  const ercViolations = currentProject?.circuit.erc_violations || [];

  const errorCount = drcViolations.filter(v => v.severity === 'error').length + 
                     ercViolations.filter(v => v.severity === 'error').length;
  const warnCount = drcViolations.filter(v => v.severity === 'warning').length + 
                    ercViolations.filter(v => v.severity === 'warning').length;

  if (!bottomPanelOpen) {
    return (
      <div className="h-8 bg-[#0d1322] border-t border-pcb-border px-4 flex items-center justify-between text-xs select-none z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setBottomPanelOpen(true)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronUp className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-xs">Console & DRC Panel</span>
          </button>
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorCount} DRC Errors
            </span>
          )}
          {errorCount === 0 && drcViolations.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              DRC Clean
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          CircuitFlow Telemetry &bull; KiCad 10.0
        </div>
      </div>
    );
  }

  return (
    <div className="h-44 bg-[#0d1322] border-t border-pcb-border flex flex-col select-none z-20">
      {/* Tab bar */}
      <div className="h-8 border-b border-pcb-border px-3 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveBottomTab('logs')}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              activeBottomTab === 'logs' ? 'bg-slate-800 text-cyan-400 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Logs ({consoleLogs.length})
          </button>
          <button
            onClick={() => setActiveBottomTab('drc')}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              activeBottomTab === 'drc' ? 'bg-slate-800 text-amber-400 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            DRC Violations ({drcViolations.length})
          </button>
          <button
            onClick={() => setActiveBottomTab('erc')}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              activeBottomTab === 'erc' ? 'bg-slate-800 text-blue-400 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            ERC Violations ({ercViolations.length})
          </button>
          <button
            onClick={() => setActiveBottomTab('telemetry')}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              activeBottomTab === 'telemetry' ? 'bg-slate-800 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Telemetry
          </button>
        </div>

        <button
          onClick={() => setBottomPanelOpen(false)}
          className="p-1 text-slate-400 hover:text-white rounded"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px]">
        {activeBottomTab === 'logs' && (
          <div className="space-y-1">
            {consoleLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-slate-300">
                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                <span
                  className={
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeBottomTab === 'drc' && (
          <div className="space-y-1.5">
            {drcViolations.length === 0 ? (
              <div className="text-emerald-400 flex items-center gap-1.5 p-2">
                <CheckCircle2 className="w-4 h-4" />
                No physical DRC violations found! Board conforms to manufacturing constraints.
              </div>
            ) : (
              drcViolations.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    if (v.component_ref) setSelectedComponentRef(v.component_ref);
                    setActiveTab('pcb');
                  }}
                  className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex items-start justify-between cursor-pointer hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${v.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
                    <div>
                      <span className="font-semibold text-slate-200">{v.type.toUpperCase()}: </span>
                      <span className="text-slate-300">{v.message}</span>
                      {v.suggested_fix && (
                        <p className="text-[10px] text-cyan-400 mt-0.5">&rarr; Fix: {v.suggested_fix}</p>
                      )}
                    </div>
                  </div>
                  {v.component_ref && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                      {v.component_ref}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeBottomTab === 'erc' && (
          <div className="space-y-1.5">
            {ercViolations.length === 0 ? (
              <div className="text-emerald-400 flex items-center gap-1.5 p-2">
                <CheckCircle2 className="w-4 h-4" />
                No schematic ERC violations! Pin connections and power supplies are verified.
              </div>
            ) : (
              ercViolations.map((v) => (
                <div
                  key={v.id}
                  className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex items-start justify-between"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${v.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
                    <div>
                      <span className="font-semibold text-slate-200">{v.type.toUpperCase()}: </span>
                      <span className="text-slate-300">{v.message}</span>
                      {v.suggested_fix && (
                        <p className="text-[10px] text-cyan-400 mt-0.5">&rarr; Suggestion: {v.suggested_fix}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeBottomTab === 'telemetry' && currentProject && (
          <div className="grid grid-cols-4 gap-4 p-2 text-slate-300">
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Components Placed</span>
              <span className="text-sm font-bold text-cyan-400">{currentProject.circuit.components.length}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Routed Tracks</span>
              <span className="text-sm font-bold text-emerald-400">{currentProject.circuit.tracks.length}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Vias Used</span>
              <span className="text-sm font-bold text-amber-400">{currentProject.circuit.vias.length}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Total Nets</span>
              <span className="text-sm font-bold text-blue-400">{currentProject.circuit.nets.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
