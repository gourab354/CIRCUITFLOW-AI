import React from 'react';
import { 
  Home, Bot, Cpu, GitBranch, Layout, Box, 
  CheckCircle, Download, FileText, HelpCircle 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface NavItem {
  id: 'dashboard' | 'ai' | 'components' | 'schematic' | 'pcb' | 'three' | 'validation' | 'export';
  label: string;
  icon: React.ElementType;
  badge?: string;
  stepRange?: string;
}

export const LeftSidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentProject } = useAppStore();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'ai', label: 'AI Assistant', icon: Bot, badge: 'NL', stepRange: '1-4' },
    { id: 'components', label: 'Components', icon: Cpu, stepRange: '5' },
    { id: 'schematic', label: 'Schematic', icon: GitBranch, stepRange: '6' },
    { id: 'pcb', label: 'PCB Layout', icon: Layout, stepRange: '7-8' },
    { id: 'three', label: '3D Preview', icon: Box, stepRange: '3D' },
    { id: 'validation', label: 'Design Rules', icon: CheckCircle, stepRange: '9' },
    { id: 'export', label: 'Export Center', icon: Download, stepRange: '10' },
  ];

  return (
    <aside className="w-56 bg-[#0d1322] border-r border-pcb-border flex flex-col justify-between select-none">
      {/* Navigation List */}
      <div className="p-3 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 px-3 py-1.5">
          Design Workflow
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isDisabled = !currentProject && item.id !== 'dashboard';

          return (
            <button
              key={item.id}
              disabled={isDisabled}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : isDisabled
                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.stepRange && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                }`}>
                  {item.stepRange}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Engine & Environment Info Badge */}
      <div className="p-3 m-3 rounded-lg bg-slate-900/80 border border-pcb-border text-[11px] text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-semibold">Engine Core</span>
          <span className="text-[10px] text-emerald-400 font-mono">v10.0 Native</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span>KiCad CLI Verified</span>
        </div>
        <div className="text-[10px] text-slate-300 pt-1 border-t border-slate-800/80">
          RAM: Low-profile &bull; GPU: Soft GL
        </div>
      </div>
    </aside>
  );
};
