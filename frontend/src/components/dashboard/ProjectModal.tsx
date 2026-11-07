import React, { useEffect, useState } from 'react';
import { 
  Plus, Bot, PenTool, Sparkles, Folder, Trash2, 
  Copy, ArrowRight, Cpu, BatteryCharging, CheckCircle 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';
import { ProjectSummary } from '../../types';

export const ProjectModal: React.FC = () => {
  const { loadProject, setActiveTab, setProcessing, addLog } = useAppStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('My Smart PCB');
  const [projectDesc, setProjectDesc] = useState('');
  const [modeChoice, setModeChoice] = useState<'ai' | 'manual'>('ai');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');

  const fetchProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch (e: any) {
      addLog(`Failed to fetch projects: ${e.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    try {
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

  return (
    <div className="flex-1 bg-[#0b0f19] p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome Hero */}
        <div className="flex items-center justify-between border-b border-pcb-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">Next-Gen Electronic CAD</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">v1.0 Ready</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">CircuitFlow AI Workspace</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Design production-ready printed circuit boards from natural language descriptions or manual CAD layouts.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            Create New PCB
          </button>
        </div>

        {/* Existing Projects Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Folder className="w-4 h-4 text-cyan-400" />
              Recent Projects ({projects.length})
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Cpu className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-slate-300 font-semibold text-sm">No projects created yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Get started by clicking &quot;Create New PCB&quot; to describe your circuit in English or pick a template.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
              >
                Start Your First PCB
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => loadProject(proj.id)}
                  className="bg-slate-900/80 hover:bg-slate-800/80 border border-pcb-border hover:border-cyan-500/50 rounded-xl p-4 transition-all cursor-pointer group space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">
                        {proj.description || 'No description'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      Step {proj.step}/10
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                      <span>{proj.component_count} components</span>
                      <span>{proj.net_count} nets</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDuplicate(proj.id, e)}
                        title="Duplicate"
                        className="p-1 hover:text-cyan-400"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(proj.id, e)}
                        title="Delete"
                        className="p-1 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STEP 1: Two Options Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-pcb-border rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Create New PCB Project</h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose your preferred engineering workflow to begin.
              </p>
            </div>

            {/* Step 1 Requirement: Two Prominent Options */}
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setModeChoice('ai')}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  modeChoice === 'ai'
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-100">Start with AI Assistant</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Describe your circuit in natural English. The AI parses pins, checks electrical compatibility, and auto-routes.
                </p>
              </div>

              <div
                onClick={() => setModeChoice('manual')}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  modeChoice === 'manual'
                    ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <PenTool className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-100">Start with Manual Design</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Direct engineering canvas. Manually place components from the library, route tracks, and configure constraints.
                </p>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. ESP32 Drone Flight Controller"
                />
              </div>

              {modeChoice === 'manual' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Starter Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="blank">Blank 70x50mm PCB</option>
                    <option value="esp32_sensor">ESP32 + MPU6050 + OLED Sensor Board</option>
                  </select>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                Create Project &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
