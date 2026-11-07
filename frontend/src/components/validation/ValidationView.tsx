import React, { useState } from 'react';
import { 
  ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, 
  RefreshCw, ArrowRight, Zap, Layers, Sparkles 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';

export const ValidationView: React.FC = () => {
  const { currentProject, refreshCurrentProject, setActiveTab, setSelectedComponentRef, addLog, setProcessing, isProcessing } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');

  const drcViolations = currentProject?.circuit.drc_violations || [];
  const ercViolations = currentProject?.circuit.erc_violations || [];

  const allViolations = [
    ...drcViolations.map(v => ({ ...v, category: 'DRC (Physical Layout)' })),
    ...ercViolations.map(v => ({ ...v, category: 'ERC (Schematic Circuit)' }))
  ];

  const filteredViolations = allViolations.filter(v => {
    if (filter === 'error') return v.severity === 'error';
    if (filter === 'warning') return v.severity === 'warning';
    return true;
  });

  const errorCount = allViolations.filter(v => v.severity === 'error').length;
  const warnCount = allViolations.filter(v => v.severity === 'warning').length;
  const isClean = errorCount === 0;

  const handleRunVerification = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Running comprehensive physical DRC and schematic ERC...');
      addLog('Triggered DRC/ERC rule validation pass...', 'info');
      const res = await api.runValidation(currentProject.id);
      await refreshCurrentProject();
      if (res.clean) {
        addLog('All design checks passed! Manufacturing deliverables unlocked.', 'success');
      } else {
        addLog(`Validation complete: ${res.error_count} error(s) detected.`, 'warn');
      }
    } catch (e: any) {
      addLog(`Validation run failed: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0b0f19] p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Step Header */}
        <div className="flex items-center justify-between border-b border-pcb-border pb-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-sm font-bold flex items-center justify-center border border-cyan-500/30">
              9
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Design Rule & Electrical Verification</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated DRC & ERC validation checks for clearances, shorts, floating pins, and fabrication constraints.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunVerification}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              Re-run DRC & ERC
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                isClean
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
              }`}
            >
              Export Fabrication Files &rarr;
            </button>
          </div>
        </div>

        {/* Scorecard Overview */}
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-5 rounded-xl border ${
            isClean ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/20 border-red-500/30'
          } space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Fabrication Readiness</span>
              {isClean ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className={`text-xl font-bold ${isClean ? 'text-emerald-400' : 'text-red-400'}`}>
              {isClean ? 'Manufacturing Ready' : 'Violations Detected'}
            </div>
            <p className="text-[11px] text-slate-400">
              {isClean 
                ? 'Board meets all spacing, trace width, and electrical constraints.' 
                : 'Resolve errors before sending Gerbers to fabricators.'}
            </p>
          </div>

          <div className="bg-slate-900/80 border border-pcb-border p-5 rounded-xl space-y-1">
            <span className="text-xs font-semibold text-slate-400">Critical Errors</span>
            <div className="text-2xl font-bold text-red-400 font-mono">{errorCount}</div>
            <p className="text-[11px] text-slate-500">Short circuits, clearance violations, missing power</p>
          </div>

          <div className="bg-slate-900/80 border border-pcb-border p-5 rounded-xl space-y-1">
            <span className="text-xs font-semibold text-slate-400">Advisory Warnings</span>
            <div className="text-2xl font-bold text-amber-400 font-mono">{warnCount}</div>
            <p className="text-[11px] text-slate-500">Floating inputs, missing I2C pullups, airwires</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-xs bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${filter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'}`}
            >
              All ({allViolations.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-3 py-1 rounded-md transition-colors ${filter === 'error' ? 'bg-red-500/20 text-red-300 font-medium' : 'text-slate-400'}`}
            >
              Errors ({errorCount})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1 rounded-md transition-colors ${filter === 'warning' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-slate-400'}`}
            >
              Warnings ({warnCount})
            </button>
          </div>
        </div>

        {/* Violations List */}
        <div className="space-y-3">
          {filteredViolations.length === 0 ? (
            <div className="p-8 border border-dashed border-emerald-500/30 rounded-xl bg-emerald-950/10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-sm text-emerald-300">Clean Bill of Health!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No electrical or physical design rule issues found in this category.
              </p>
            </div>
          ) : (
            filteredViolations.map((v) => (
              <div
                key={v.id}
                className="bg-slate-900/90 border border-pcb-border hover:border-slate-700 rounded-xl p-4 transition-all space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg mt-0.5 ${
                      v.severity === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {v.severity === 'error' ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {v.type.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {v.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{v.message}</p>
                    </div>
                  </div>

                  {v.component_ref && (
                    <button
                      onClick={() => {
                        setSelectedComponentRef(v.component_ref!);
                        setActiveTab('pcb');
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-md border border-cyan-500/30 transition-colors"
                    >
                      Locate {v.component_ref} &rarr;
                    </button>
                  )}
                </div>

                {v.suggested_fix && (
                  <div className="ml-11 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-cyan-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
                    <div>
                      <span className="font-semibold text-cyan-400">Recommended Fix: </span>
                      <span>{v.suggested_fix}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

