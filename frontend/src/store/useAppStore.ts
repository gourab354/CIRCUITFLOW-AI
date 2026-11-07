import { create } from 'zustand';
import { Project, Component, Track, Via, DRCViolation, ERCViolation, LayerType } from '../types';
import { api } from '../services/api';

interface LogItem {
  id: string;
  time: string;
  type: 'info' | 'warn' | 'error' | 'success';
  text: string;
}

interface AppState {
  currentProject: Project | null;
  activeTab: 'dashboard' | 'ai' | 'components' | 'schematic' | 'pcb' | 'three' | 'validation' | 'export';
  selectedComponentRef: string | null;
  selectedNet: string | null;
  activeLayer: LayerType;
  visibleLayers: Record<string, boolean>;
  beginnerMode: boolean;
  bottomPanelOpen: boolean;
  activeBottomTab: 'logs' | 'drc' | 'erc' | 'telemetry';
  consoleLogs: LogItem[];
  isProcessing: boolean;
  processingStatus: string;
  
  // Actions
  setProject: (project: Project | null) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  setSelectedComponentRef: (ref: string | null) => void;
  setSelectedNet: (net: string | null) => void;
  setActiveLayer: (layer: LayerType) => void;
  toggleLayerVisibility: (layer: string) => void;
  setBeginnerMode: (enabled: boolean) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setActiveBottomTab: (tab: AppState['activeBottomTab']) => void;
  addLog: (text: string, type?: LogItem['type']) => void;
  setProcessing: (isProcessing: boolean, status?: string) => void;
  
  // High-level Project Operations
  loadProject: (id: string) => Promise<void>;
  refreshCurrentProject: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentProject: null,
  activeTab: 'dashboard',
  selectedComponentRef: null,
  selectedNet: null,
  activeLayer: 'F.Cu',
  visibleLayers: {
    'F.Cu': true,
    'B.Cu': true,
    'Edge.Cuts': true,
    'F.SilkS': true,
    'B.SilkS': false,
    'F.Mask': false,
    'B.Mask': false,
  },
  beginnerMode: true,
  bottomPanelOpen: true,
  activeBottomTab: 'logs',
  consoleLogs: [
    {
      id: 'init_1',
      time: new Date().toLocaleTimeString(),
      type: 'info',
      text: 'CircuitFlow AI Desktop Engine v1.0 initialized.'
    },
    {
      id: 'init_2',
      time: new Date().toLocaleTimeString(),
      type: 'success',
      text: 'KiCad 10.0 Native Integration online. Ready for circuit synthesis.'
    }
  ],
  isProcessing: false,
  processingStatus: '',

  setProject: (project) => {
    set({
      currentProject: project,
      beginnerMode: project ? project.beginner_mode : true
    });
    if (project) {
      get().addLog(`Project "${project.name}" loaded (Step ${project.step}/10).`, 'info');
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedComponentRef: (ref) => set({ selectedComponentRef: ref }),
  setSelectedNet: (net) => set({ selectedNet: net }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  
  toggleLayerVisibility: (layer) => set((state) => ({
    visibleLayers: {
      ...state.visibleLayers,
      [layer]: !state.visibleLayers[layer]
    }
  })),

  setBeginnerMode: (enabled) => {
    set({ beginnerMode: enabled });
    const { currentProject } = get();
    if (currentProject) {
      api.updateProject(currentProject.id, { beginner_mode: enabled }).catch(() => {});
    }
  },

  setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab, bottomPanelOpen: true }),

  addLog: (text, type = 'info') => set((state) => ({
    consoleLogs: [
      ...state.consoleLogs.slice(-100), // Keep last 100
      {
        id: `log_${Date.now()}_${Math.random()}`,
        time: new Date().toLocaleTimeString(),
        type,
        text
      }
    ]
  })),

  setProcessing: (isProcessing, status = '') => set({ isProcessing, processingStatus: status }),

  loadProject: async (id: string) => {
    try {
      get().setProcessing(true, 'Loading project data...');
      const proj = await api.getProject(id);
      get().setProject(proj);
      // Auto-switch to appropriate tab based on current step
      if (proj.step <= 2) get().setActiveTab('ai');
      else if (proj.step <= 4) get().setActiveTab('ai');
      else if (proj.step === 5) get().setActiveTab('components');
      else if (proj.step === 6) get().setActiveTab('schematic');
      else if (proj.step <= 8) get().setActiveTab('pcb');
      else if (proj.step === 9) get().setActiveTab('validation');
      else get().setActiveTab('export');
    } catch (e: any) {
      get().addLog(`Failed to load project: ${e.message}`, 'error');
    } finally {
      get().setProcessing(false);
    }
  },

  refreshCurrentProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const proj = await api.getProject(currentProject.id);
      get().setProject(proj);
    } catch (e: any) {
      get().addLog(`Refresh failed: ${e.message}`, 'warn');
    }
  }
}));

