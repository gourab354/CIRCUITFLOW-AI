import React, { useEffect, useState } from 'react';
import {
  Plus, Bot, PenTool, Sparkles, Folder, Trash2,
  Copy, Cpu, Zap, ChevronRight, Clock, Package,
  Network, ArrowUpRight, X, Key
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAISettingsStore } from '../../store/useAISettingsStore';
import { api } from '../../services/api';
import { ProjectSummary } from '../../types';

const STEP_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Created', color: 'text-slate-400' },
  2: { label: 'Describing', color: 'text-blue-400' },
  3: { label: 'Analyzing', color: 'text-blue-400' },
  4: { label: 'Configuring', color: 'text-cyan-400' },
  5: { label: 'Components', color: 'text-cyan-400' },
  6: { label: 'Schematic', color: 'text-purple-400' },
  7: { label: 'Layout', color: 'text-orange-400' },
  8: { label: 'Routing', color: 'text-orange-400' },
  9: { label: 'Validation', color: 'text-amber-400' },
  10: { label: 'Ready', color: 'text-emerald-400' },
};

const TEMPLATES = [
  {
    id: 'esp32_sensor',
    name: 'ESP32 Sensor Hub',
    desc: 'ESP32 + MPU6050 + OLED + TP4056',
    icon: '📡',
    color: 'from-blue-600/20 to-blue-800/20 border-blue-600/30',
  },
  {
    id: 'arduino_shield',
    name: 'Arduino Shield',
    desc: 'Arduino Nano breakout board template',
    icon: '🔌',
    color: 'from-teal-600/20 to-teal-800/20 border-teal-600/30',
  },
  {
    id: 'power_supply',
    name: 'Power Supply Board',
    desc: 'AMS1117 LDO regulator + filter caps',
    icon: '⚡',
    color: 'from-amber-600/20 to-amber-800/20 border-amber-600/30',
  },
];

export const ProjectModal: React.FC = () => {
  const { loadProject, setActiveTab, setProcessing, addLog } = useAppStore();
  const { activeModelId, activeModel, setShowModelPicker } = useAISettingsStore();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('My Smart PCB');
  const [projectDesc, setProjectDesc] = useState('');
  const [modeChoice, setModeChoice] = useState<'ai' | 'manual'>('ai');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch (e: any) {
      addLog(`Failed to fetch projects: ${e.message}`, 'error');
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async () => {
    try {
      setCreating(true);
      setProcessing(true, 'Creating project...');
      const tmpl = modeChoice === 'ai' ? undefined : (selectedTemplate === 'blank' ? undefined : selectedTemplate);
      const newProj = await api.createProject(projectName, projectDesc, tmpl, modeChoice === 'ai');
      await loadProject(newProj.id);
      setShowCreateModal(false);
      setActiveTab(modeChoice === 'ai' ? 'ai' : 'pcb');
      addLog(`Created project "${newProj.name}"`, 'success');
    } catch (e: any) {
      addLog(`Create failed: ${e.message}`, 'error');
    } finally {
      setCreating(false);
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this project?')) {
      await api.deleteProject(id);
      fetchProjects();
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.duplicateProject(id);
    fetchProjects();
  };

  const modelName = activeModel?.name || activeModelId.split('/').pop() || 'AI Engine';
  const provider = activeModel?.provider || 'rule_based';

  return (
    <div className="flex-1 bg-[#080d18] overflow-y-auto">
      {/* Top hero bar */}
      <div className="border-b border-white/[0.05] bg-gradient-to-b from-blue-500/[0.04] to-transparent">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400">
                  Circuit Flow AI · PCB Engineering Suite
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  OPEN · FREE · NO SUBSCRIPTION
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Welcome to Circuit Flow AI
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-lg">
                Design professional PCBs from plain English descriptions. Auto-place, auto-route, validate, and export manufacturing files.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* AI Model chip — clicking opens model picker */}
              <button
                onClick={() => setShowModelPicker(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all text-xs group"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium leading-none">{modelName}</p>
                  <p className="text-slate-500 leading-none mt-0.5 capitalize">{provider}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                New PCB Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-10">
        {/* Quick start templates */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Quick Start Templates
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {TEMPLATES.map(t => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t.id);
                  setModeChoice('ai');
                  setProjectName(t.name);
                  setShowCreateModal(true);
                }}
                className={`relative rounded-xl border bg-gradient-to-br ${t.color} p-4 cursor-pointer hover:scale-[1.01] transition-all group overflow-hidden`}
              >
                <div className="text-2xl mb-2">{t.icon}</div>
                <h3 className="font-semibold text-white text-sm">{t.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                <ArrowUpRight className="absolute top-3 right-3 w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </div>
            ))}
            {/* Blank */}
            <div
              onClick={() => { setSelectedTemplate('blank'); setModeChoice('ai'); setShowCreateModal(true); }}
              className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 cursor-pointer hover:border-white/[0.12] hover:bg-white/[0.04] transition-all group"
            >
              <div className="text-2xl mb-2">✦</div>
              <h3 className="font-semibold text-white text-sm">Blank Project</h3>
              <p className="text-xs text-slate-400 mt-0.5">Start from scratch with AI or manual design</p>
              <ArrowUpRight className="absolute top-3 right-3 w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        </section>

        {/* Projects list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Folder className="w-4 h-4 text-slate-400" />
              Recent Projects
              <span className="text-xs text-slate-600 font-normal">({projects.length})</span>
            </h2>
            <button onClick={fetchProjects} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Refresh
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="border border-dashed border-white/[0.07] rounded-2xl py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto">
                <Cpu className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-slate-300 font-semibold text-sm">No projects yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Create your first PCB project using the button above or pick a template.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((proj) => {
                const stepInfo = STEP_LABELS[proj.step] || STEP_LABELS[1];
                const progress = Math.round((proj.step / 10) * 100);
                return (
                  <div
                    key={proj.id}
                    onClick={() => loadProject(proj.id)}
                    className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-sm text-white group-hover:text-blue-300 transition-colors truncate max-w-[180px]">
                          {proj.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">
                          {proj.description || 'No description'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold ${stepInfo.color}`}>
                        {stepInfo.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 bg-white/[0.05] rounded-full mb-3">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {proj.component_count} parts
                        </span>
                        <span className="flex items-center gap-1">
                          <Network className="w-3 h-3" />
                          {proj.net_count} nets
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleDuplicate(proj.id, e)} title="Duplicate" className="p-1 hover:text-blue-400">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => handleDelete(proj.id, e)} title="Delete" className="p-1 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create project modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1623] border border-white/[0.08] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.05]">
              <div>
                <h2 className="text-base font-bold text-white">New PCB Project</h2>
                <p className="text-xs text-slate-400 mt-0.5">Choose your design workflow</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Mode choice */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setModeChoice('ai')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    modeChoice === 'ai'
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">AI Assistant</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Describe your circuit in plain English. AI handles everything automatically.
                  </p>
                </div>

                <div
                  onClick={() => setModeChoice('manual')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    modeChoice === 'manual'
                      ? 'border-cyan-500/60 bg-cyan-500/10'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                    <PenTool className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-sm text-white">Manual Design</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Full engineering canvas. Place components, route manually, full control.
                  </p>
                </div>
              </div>

              {/* Project name */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g. ESP32 Drone Flight Controller"
                />
              </div>

              {/* Template (manual mode only) */}
              {modeChoice === 'manual' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">Starter Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="blank">Blank 70×50mm PCB</option>
                    <option value="esp32_sensor">ESP32 + MPU6050 + OLED Sensor Board</option>
                  </select>
                </div>
              )}

              {/* Active model indicator */}
              <div
                onClick={() => { setShowCreateModal(false); setShowModelPicker(true); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-blue-500/[0.07] border border-blue-500/20 cursor-pointer hover:bg-blue-500/10 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-300">AI: </span>
                  <span className="text-xs text-blue-300 font-medium">{modelName}</span>
                </div>
                <span className="text-[10px] text-slate-500">Change →</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!projectName.trim() || creating}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>Create Project <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
