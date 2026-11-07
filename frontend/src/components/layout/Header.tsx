import React from 'react';
import { 
  Cpu, Sparkles, CheckCircle2, AlertTriangle, Download, 
  HelpCircle, Settings, Play, RefreshCw, Layers 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';

export const Header: React.FC = () => {
  const { 
    currentProject, beginnerMode, setBeginnerMode, 
    activeTab, setActiveTab, isProcessing, processingStatus,
    setProcessing, addLog, refreshCurrentProject 
  } = useAppStore();

  const handleQuickPlace = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Running intelligent component placement...');
      addLog('Triggered force-directed auto-placement...', 'info');
      await api.runAutoPlace(currentProject.id);
      await refreshCurrentProject();
      setActiveTab('pcb');
      addLog('Component placement completed successfully.', 'success');
    } catch (e: any) {
      addLog(`Placement error: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickRoute = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Routing multi-layer PCB traces & pouring ground plane...');
      addLog('Initiating A* multi-layer trace routing...', 'info');
      await api.runAutoRoute(currentProject.id);
      await refreshCurrentProject();
      setActiveTab('pcb');
      addLog('Trace routing & copper zones generated.', 'success');
    } catch (e: any) {
      addLog(`Routing error: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickValidate = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Running DRC & ERC verification...');
      const res = await api.runValidation(currentProject.id);
      await refreshCurrentProject();
      setActiveTab('validation');
      if (res.clean) {
        addLog('DRC & ERC PASSED: Design is physically and electrically sound.', 'success');
      } else {
        addLog(`DRC & ERC detected ${res.error_count} error(s) and ${res.warning_count} warning(s).`, 'warn');
      }
    } catch (e: any) {
      addLog(`Validation error: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <header className="h-14 border-b border-pcb-border bg-[#0d1322] px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-4">
        <div 
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white font-mono text-sm">CIRCUITFLOW</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 -mt-0.5">Desktop PCB Engineering</p>
          </div>
        </div>

        {currentProject && (
          <div className="flex items-center gap-2 pl-4 border-l border-pcb-border">
            <span className="text-xs font-semibold text-slate-200 max-w-[180px] truncate">
              {currentProject.name}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Step {currentProject.step}/10
            </span>
          </div>
        )}
      </div>

      {/* Center Status / Operation Progress */}
      {isProcessing && (
        <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-full text-cyan-300 text-xs animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{processingStatus || 'Processing...'}</span>
        </div>
      )}

      {/* Right Controls: Mode Toggle, Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Beginner vs Advanced Mode Switch */}
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-pcb-border text-xs">
          <button
            onClick={() => setBeginnerMode(true)}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              beginnerMode 
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Beginner
          </button>
          <button
            onClick={() => setBeginnerMode(false)}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              !beginnerMode 
                ? 'bg-blue-600 text-white font-semibold shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Advanced
          </button>
        </div>

        {currentProject && (
          <div className="flex items-center gap-2 border-l border-pcb-border pl-3">
            <button
              onClick={handleQuickPlace}
              disabled={isProcessing}
              title="Auto-Place Components"
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Place
            </button>
            <button
              onClick={handleQuickRoute}
              disabled={isProcessing}
              title="Auto-Route PCB Traces"
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Route
            </button>
            <button
              onClick={handleQuickValidate}
              disabled={isProcessing}
              title="Run Design Rule Check (DRC)"
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Check DRC
            </button>
            <button
              onClick={() => setActiveTab('export')}
              title="Export Manufacturing Files"
              className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
