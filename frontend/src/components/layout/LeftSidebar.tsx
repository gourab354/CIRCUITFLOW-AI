import React from 'react';
import {
  Home, Bot, Cpu, GitBranch, Layout, Box,
  CheckCircle2, Download, Zap, Settings
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAISettingsStore } from '../../store/useAISettingsStore';

interface NavItem {
  id: 'dashboard' | 'ai' | 'components' | 'schematic' | 'pcb' | 'three' | 'validation' | 'export';
  label: string;
  icon: React.ElementType;
  stepLabel?: string;
  color?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'ai', label: 'AI Assistant', icon: Bot, stepLabel: 'Steps 1-4', color: 'blue' },
  { id: 'components', label: 'Components', icon: Cpu, stepLabel: 'Step 5', color: 'cyan' },
  { id: 'schematic', label: 'Schematic', icon: GitBranch, stepLabel: 'Step 6', color: 'purple' },
  { id: 'pcb', label: 'PCB Layout', icon: Layout, stepLabel: 'Steps 7-8', color: 'orange' },
  { id: 'three', label: '3D Preview', icon: Box, stepLabel: '3D', color: 'teal' },
  { id: 'validation', label: 'DRC / ERC', icon: CheckCircle2, stepLabel: 'Step 9', color: 'amber' },
  { id: 'export', label: 'Export', icon: Download, stepLabel: 'Step 10', color: 'emerald' },
];

const ACTIVE_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
  purple: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
  orange: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
  teal: 'bg-teal-500/10 text-teal-300 border-teal-500/25',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
};

const ICON_COLORS: Record<string, string> = {
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
  teal: 'text-teal-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
};

export const LeftSidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentProject } = useAppStore();
  const { activeModelId, activeModel, setShowModelPicker } = useAISettingsStore();

  const modelName = activeModel?.name || activeModelId.split('/').pop() || 'AI Engine';
  const provider = activeModel?.provider || '';

  return (
    <aside className="w-52 bg-[#0a0f1c] border-r border-white/[0.05] flex flex-col select-none">
      {/* Nav list */}
      <div className="flex-1 p-2.5 space-y-0.5">
        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-2.5 py-2">
          Workflow
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isDisabled = !currentProject && item.id !== 'dashboard';
          const colorKey = item.color || '';
          const activeClass = isActive
            ? (ACTIVE_COLORS[colorKey] || 'bg-blue-500/10 text-blue-300 border-blue-500/25') + ' border'
            : '';

          return (
            <button
              key={item.id}
              disabled={isDisabled}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                isActive
                  ? activeClass
                  : isDisabled
                  ? 'text-slate-700 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isActive ? (ICON_COLORS[colorKey] || 'text-blue-400') : 'text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.stepLabel && isActive && (
                <span className="text-[9px] opacity-60 font-mono">{item.stepLabel}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom: AI model mini card */}
      <div className="p-3 space-y-2">
        <button
          onClick={() => setShowModelPicker(true)}
          className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all group"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-slate-300 group-hover:text-white transition-colors">AI Engine</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium truncate">{modelName}</p>
          <p className="text-[9px] text-slate-600 capitalize mt-0.5">{provider || 'rule-based fallback'}</p>
        </button>

        <div className="px-2.5 py-2 text-[9px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            <span>KiCad 10 Native</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-blue-500" />
            <span>No subscription · Unlimited</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
