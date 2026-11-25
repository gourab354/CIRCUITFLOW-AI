import React, { useEffect, useState } from 'react';
import {
  Cpu, CheckCircle2, Download, Settings, Play,
  RefreshCw, Layers, ChevronDown, Sparkles, Zap,
  Menu, Bell, HelpCircle, User as UserIcon, LogOut
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAISettingsStore } from '../../store/useAISettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';

const PROVIDER_COLORS: Record<string, string> = {
  gemini: 'from-blue-500 to-purple-600',
  openai: 'from-emerald-500 to-teal-600',
  anthropic: 'from-orange-500 to-amber-600',
  groq: 'from-purple-500 to-pink-600',
  deepseek: 'from-sky-500 to-blue-600',
  mistral: 'from-amber-500 to-orange-600',
  xai: 'from-red-500 to-rose-600',
  ollama: 'from-green-500 to-emerald-600',
  rule_based: 'from-slate-500 to-slate-600',
};

const MODEL_SHORT: Record<string, string> = {
  'gemini-2.0-flash-exp': 'Gemini 2.0',
  'gemini-1.5-pro': 'Gemini Pro',
  'gemini-1.5-flash': 'Gemini Flash',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'o1-mini': 'o1 Mini',
  'claude-sonnet-4-5': 'Claude Sonnet',
  'claude-3-5-haiku-20241022': 'Claude Haiku',
  'llama-3.3-70b-versatile': 'Llama 3.3',
  'mixtral-8x7b-32768': 'Mixtral',
  'deepseek-chat': 'DeepSeek V3',
  'mistral-large-latest': 'Mistral Large',
  'grok-2-latest': 'Grok 2',
  'ollama/llama3.2': 'Llama 3.2 ⚡',
  'ollama/qwen2.5-coder:7b': 'Qwen 2.5 ⚡',
  'ollama/mistral': 'Mistral ⚡',
};

export const Header: React.FC = () => {
  const {
    currentProject, beginnerMode, setBeginnerMode,
    setActiveTab, isProcessing, processingStatus,
    setProcessing, addLog, refreshCurrentProject
  } = useAppStore();

  const {
    activeModelId, activeModel,
    setShowModelPicker, setShowAPIKeyModal,
    loadModels,
  } = useAISettingsStore();

  const {
    user, isAuthenticated, setShowAuthModal, logout, checkAuth
  } = useAuthStore();

  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    loadModels();
    checkAuth();
  }, []);

  const provider = activeModel?.provider || 'rule_based';
  const gradientClass = PROVIDER_COLORS[provider] || PROVIDER_COLORS.rule_based;
  const modelShortName = MODEL_SHORT[activeModelId] || activeModelId.split('/').pop()?.slice(0, 14) || 'AI';

  const handleQuickPlace = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Running intelligent component placement...');
      await api.runAutoPlace(currentProject.id);
      await refreshCurrentProject();
      setActiveTab('pcb');
      addLog('Component placement completed.', 'success');
    } catch (e: any) { addLog(`Placement error: ${e.message}`, 'error'); }
    finally { setProcessing(false); }
  };

  const handleQuickRoute = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Routing PCB traces & pouring ground plane...');
      await api.runAutoRoute(currentProject.id);
      await refreshCurrentProject();
      setActiveTab('pcb');
      addLog('Trace routing & copper zones generated.', 'success');
    } catch (e: any) { addLog(`Routing error: ${e.message}`, 'error'); }
    finally { setProcessing(false); }
  };

  const handleQuickValidate = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Running DRC & ERC verification...');
      const res = await api.runValidation(currentProject.id);
      await refreshCurrentProject();
      setActiveTab('validation');
      if (res.clean) {
        addLog('DRC & ERC PASSED — Design is physically and electrically sound.', 'success');
      } else {
        addLog(`Found ${res.error_count} error(s) and ${res.warning_count} warning(s).`, 'warn');
      }
    } catch (e: any) { addLog(`Validation error: ${e.message}`, 'error'); }
    finally { setProcessing(false); }
  };

  return (
    <header className="h-13 min-h-[52px] border-b border-white/[0.06] bg-[#0a0f1c] px-4 flex items-center justify-between select-none z-30 relative">
      {/* Left: Brand */}
      <div className="flex items-center gap-4">
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="relative w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu className="w-4 h-4 text-white" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#0a0f1c]" />
          </div>
          <div className="leading-none">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-white text-[13px] tracking-tight font-mono">CIRCUIT FLOW</span>
              <span className="text-[9px] font-black px-1 py-0.5 rounded bg-gradient-to-r from-blue-500 to-cyan-400 text-white ml-0.5">AI</span>
            </div>
            <span className="text-[9px] text-slate-500 font-medium tracking-wide">PCB Engineering Suite</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-white/[0.07]" />

        {/* AI Model Picker Button — ProtoFlow style */}
        <button
          onClick={() => setShowModelPicker(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all group text-xs`}
        >
          <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
            <Zap className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-slate-200 font-medium max-w-[120px] truncate">{modelShortName}</span>
          <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </button>

        {/* Current project breadcrumb */}
        {currentProject && (
          <>
            <div className="h-5 w-px bg-white/[0.07]" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium max-w-[160px] truncate">{currentProject.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
                Step {currentProject.step}/10
              </span>
            </div>
          </>
        )}
      </div>

      {/* Center: Processing indicator */}
      {isProcessing && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>{processingStatus || 'Processing...'}</span>
        </div>
      )}

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex items-center bg-white/[0.03] border border-white/[0.07] p-0.5 rounded-lg text-[11px]">
          <button
            onClick={() => setBeginnerMode(true)}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
              beginnerMode
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Guide
          </button>
          <button
            onClick={() => setBeginnerMode(false)}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
              !beginnerMode
                ? 'bg-white/10 text-white font-semibold'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            Expert
          </button>
        </div>

        {/* Quick action buttons — only when project loaded */}
        {currentProject && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/[0.07]">
            <button
              onClick={handleQuickPlace}
              disabled={isProcessing}
              title="Auto-Place Components"
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs border border-white/[0.07] flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              Place
            </button>
            <button
              onClick={handleQuickRoute}
              disabled={isProcessing}
              title="Auto-Route All Traces"
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs border border-white/[0.07] flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Route
            </button>
            <button
              onClick={handleQuickValidate}
              disabled={isProcessing}
              title="Run DRC & ERC"
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs border border-white/[0.07] flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Check
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        )}

        {/* User Account / Sign In */}
        <div className="relative pl-2 border-l border-white/[0.07]">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-slate-200 font-medium max-w-[100px] truncate">{user.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 mr-1" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#0c1220] border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-white/[0.06] mb-1">
                    <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true, 'login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.1] text-xs font-medium transition-all"
            >
              <UserIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
