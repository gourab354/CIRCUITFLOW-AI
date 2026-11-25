import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'mistral' | 'xai' | 'ollama';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  context_window: number;
  supports_vision: boolean;
  tier: 'free' | 'pro' | 'local';
  icon: string;
  key_configured?: boolean;
  active?: boolean;
}

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  url: string;
  has_key: boolean;
}

interface AISettingsState {
  activeModelId: string;
  activeModel: AIModel | null;
  models: AIModel[];
  providers: ProviderInfo[];
  apiKeys: Partial<Record<AIProvider, string>>;
  showModelPicker: boolean;
  showAPIKeyModal: boolean;
  selectedProviderForKey: AIProvider | null;
  isLoading: boolean;

  // Actions
  setShowModelPicker: (show: boolean) => void;
  setShowAPIKeyModal: (show: boolean, provider?: AIProvider) => void;
  setActiveModel: (modelId: string) => Promise<void>;
  setApiKey: (provider: AIProvider, key: string) => Promise<void>;
  loadModels: () => Promise<void>;
  loadProviders: () => Promise<void>;
}

const API_BASE = 'http://127.0.0.1:8000';

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set, get) => ({
      activeModelId: 'gemini-2.0-flash-exp',
      activeModel: null,
      models: [],
      providers: [],
      apiKeys: {},
      showModelPicker: false,
      showAPIKeyModal: false,
      selectedProviderForKey: null,
      isLoading: false,

      setShowModelPicker: (show) => set({ showModelPicker: show }),

      setShowAPIKeyModal: (show, provider) => set({
        showAPIKeyModal: show,
        selectedProviderForKey: provider || null,
      }),

      setActiveModel: async (modelId) => {
        try {
          const res = await fetch(`${API_BASE}/ai-settings/set-model`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_id: modelId }),
          });
          const data = await res.json();
          if (data.status === 'ok') {
            set({ activeModelId: modelId, activeModel: data.model_info });
            await get().loadModels();
          }
        } catch {
          // Offline fallback: set locally
          set({ activeModelId: modelId });
        }
      },

      setApiKey: async (provider, key) => {
        try {
          await fetch(`${API_BASE}/ai-settings/set-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, api_key: key }),
          });
          set((state) => ({
            apiKeys: { ...state.apiKeys, [provider]: key },
          }));
          await get().loadModels();
          await get().loadProviders();
        } catch {
          set((state) => ({
            apiKeys: { ...state.apiKeys, [provider]: key },
          }));
        }
      },

      loadModels: async () => {
        try {
          const res = await fetch(`${API_BASE}/ai-settings/models`);
          const data = await res.json();
          set({
            models: data.models || [],
            activeModelId: data.active_model || get().activeModelId,
            activeModel: data.active_model_info || null,
          });
        } catch {
          // Backend offline — keep existing state
        }
      },

      loadProviders: async () => {
        try {
          const res = await fetch(`${API_BASE}/ai-settings/providers`);
          const data = await res.json();
          set({ providers: data.providers || [] });
        } catch {}
      },
    }),
    {
      name: 'circuitflow-ai-settings',
      partialize: (state: AISettingsState) => ({
        activeModelId: state.activeModelId,
        apiKeys: state.apiKeys,
      }),
    }
  )
);
