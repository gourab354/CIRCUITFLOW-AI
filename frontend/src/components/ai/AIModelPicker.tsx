import React, { useEffect, useState } from 'react';
import { X, Key, ExternalLink, CheckCircle2, AlertCircle, ChevronRight, Sparkles, Zap, Globe, Server } from 'lucide-react';
import { useAISettingsStore, AIModel, AIProvider } from '../../store/useAISettingsStore';

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google: <span className="text-[10px] font-black text-blue-400">G</span>,
  openai: <span className="text-[10px] font-black text-emerald-400">⊕</span>,
  anthropic: <span className="text-[10px] font-black text-orange-400">◈</span>,
  groq: <span className="text-[10px] font-black text-purple-400">⚡</span>,
  deepseek: <span className="text-[10px] font-black text-sky-400">◎</span>,
  mistral: <span className="text-[10px] font-black text-amber-400">✦</span>,
  xai: <span className="text-[10px] font-black text-red-400">𝕏</span>,
  ollama: <span className="text-[10px] font-black text-green-400">▲</span>,
};

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  free: { label: 'Free', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pro: { label: 'Pro', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  local: { label: 'Local', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
};

const PROVIDER_DISPLAY: Record<string, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  xai: 'xAI',
  ollama: 'Ollama (Local)',
};

const PROVIDER_URLS: Record<string, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  groq: 'https://console.groq.com/keys',
  deepseek: 'https://platform.deepseek.com/api_keys',
  mistral: 'https://console.mistral.ai/api-keys',
  xai: 'https://console.x.ai',
  ollama: 'https://ollama.com',
};

export const AIModelPicker: React.FC = () => {
  const {
    showModelPicker, showAPIKeyModal,
    setShowModelPicker, setShowAPIKeyModal,
    models, providers, activeModelId,
    setActiveModel, setApiKey, apiKeys,
    loadModels, loadProviders,
    selectedProviderForKey,
  } = useAISettingsStore();

  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [keyInput, setKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    if (showModelPicker || showAPIKeyModal) {
      loadModels();
      loadProviders();
    }
  }, [showModelPicker, showAPIKeyModal]);

  useEffect(() => {
    if (selectedProviderForKey) {
      setKeyInput((apiKeys as any)[selectedProviderForKey] || '');
    }
  }, [selectedProviderForKey]);

  // --- API Key Modal ---
  if (showAPIKeyModal && selectedProviderForKey) {
    const pName = PROVIDER_DISPLAY[selectedProviderForKey] || selectedProviderForKey;
    const pUrl = PROVIDER_URLS[selectedProviderForKey];

    const handleSave = async () => {
      if (!keyInput.trim()) return;
      setSavingKey(true);
      await setApiKey(selectedProviderForKey, keyInput.trim());
      setSavingKey(false);
      setShowAPIKeyModal(false);
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Key className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{pName} API Key</p>
                <p className="text-xs text-slate-400">Stored locally, never sent anywhere</p>
              </div>
            </div>
            <button onClick={() => setShowAPIKeyModal(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">API Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder={`sk-... or AI... (your ${pName} key)`}
                className="w-full bg-[#0d1322] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            {selectedProviderForKey !== 'ollama' && (
              <a
                href={pUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Get your free {pName} API key
              </a>
            )}

            <div className="bg-slate-800/60 border border-white/5 rounded-lg p-3 text-xs text-slate-400">
              🔒 Keys are stored only in your browser's localStorage and sent only to {pName}'s API — never to Circuit Flow AI servers.
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowAPIKeyModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!keyInput.trim() || savingKey}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                {savingKey ? 'Saving...' : 'Save & Activate'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showModelPicker) return null;

  const providerGroups = ['all', 'gemini', 'openai', 'anthropic', 'groq', 'deepseek', 'mistral', 'xai', 'ollama'];
  const filteredModels = filterProvider === 'all' ? models : models.filter(m => m.provider === filterProvider);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Choose AI Model
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bring your own API key. No subscription needed. Fully unlimited.
            </p>
          </div>
          <button onClick={() => setShowModelPicker(false)} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Provider Filter Sidebar */}
          <div className="w-40 border-r border-white/5 p-3 flex flex-col gap-1 overflow-y-auto">
            {providerGroups.map(p => {
              const count = p === 'all' ? models.length : models.filter(m => m.provider === p).length;
              if (count === 0 && p !== 'all') return null;
              const hasKey = p === 'all' || p === 'ollama' || providers.find(pr => pr.id === p)?.has_key;
              return (
                <button
                  key={p}
                  onClick={() => setFilterProvider(p)}
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                    filterProvider === p
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="capitalize font-medium">{p === 'all' ? 'All Models' : PROVIDER_DISPLAY[p] || p}</span>
                  {p !== 'all' && p !== 'ollama' && (
                    hasKey
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      : <AlertCircle className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Model List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredModels.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                Loading models...
              </div>
            )}
            {filteredModels.map((model) => {
              const isActive = model.id === activeModelId;
              const tierBadge = TIER_BADGE[model.tier] || TIER_BADGE.free;
              const providerKey = providers.find(p => p.id === model.provider);
              const hasKey = model.provider === 'ollama' || providerKey?.has_key;

              return (
                <div
                  key={model.id}
                  className={`relative rounded-xl border p-4 cursor-pointer transition-all group ${
                    isActive
                      ? 'border-blue-500/50 bg-blue-600/10'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                  }`}
                  onClick={() => {
                    if (!hasKey && model.provider !== 'ollama') {
                      setShowModelPicker(false);
                      setShowAPIKeyModal(true, model.provider as AIProvider);
                    } else {
                      setActiveModel(model.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Provider Icon */}
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {PROVIDER_ICONS[model.icon] || PROVIDER_ICONS.google}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{model.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tierBadge.cls}`}>
                          {tierBadge.label}
                        </span>
                        {model.supports_vision && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-purple-400 bg-purple-500/10 border-purple-500/30">
                            Vision
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border text-blue-300 bg-blue-500/15 border-blue-500/30 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{model.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                        <span>{(model.context_window / 1000).toFixed(0)}K context</span>
                        <span>•</span>
                        <span className="capitalize">{PROVIDER_DISPLAY[model.provider] || model.provider}</span>
                      </div>
                    </div>

                    {/* Key status or select */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {hasKey ? (
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowModelPicker(false);
                            setShowAPIKeyModal(true, model.provider as AIProvider);
                          }}
                          className="text-[10px] px-2 py-1 rounded border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-1"
                        >
                          <Key className="w-2.5 h-2.5" /> Add Key
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add a "Local Models" note at bottom */}
            <div className="pt-2 pb-1">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Server className="w-3 h-3" />
                <span>Local models require <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Ollama</a> running on your machine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — provider key management */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <p className="text-xs text-slate-500 mb-3">Configure API Keys</p>
          <div className="flex flex-wrap gap-2">
            {['gemini', 'openai', 'anthropic', 'groq', 'deepseek', 'mistral', 'xai'].map(p => {
              const hasKey = providers.find(pr => pr.id === p)?.has_key;
              return (
                <button
                  key={p}
                  onClick={() => {
                    setShowModelPicker(false);
                    setShowAPIKeyModal(true, p as AIProvider);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                    hasKey
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                      : 'border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-slate-300'
                  }`}
                >
                  {hasKey ? <CheckCircle2 className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                  {PROVIDER_DISPLAY[p]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
