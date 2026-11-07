import React, { useState } from 'react';
import { 
  Plus, Search, Edit3, Trash2, ExternalLink, 
  CheckCircle2, ShieldCheck, Box, RefreshCw 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';
import { Component } from '../../types';

export const ComponentListView: React.FC = () => {
  const { currentProject, refreshCurrentProject, addLog, setProcessing, setActiveTab } = useAppStore();
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [footprintQuery, setFootprintQuery] = useState('');
  const [suggestedFootprints, setSuggestedFootprints] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<Component[]>([]);

  const components = currentProject?.circuit.components || [];

  const handleEditFootprint = async (comp: Component) => {
    setEditingRef(comp.ref);
    setFootprintQuery(comp.footprint);
    try {
      const res = await api.searchFootprints(comp.name.split(' ')[0]);
      setSuggestedFootprints(res.footprints.slice(0, 8));
    } catch (e) {}
  };

  const handleSaveFootprint = async (compRef: string, newFp: string) => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Updating footprint in project...');
      await api.updateComponent(currentProject.id, compRef, { footprint: newFp });
      await refreshCurrentProject();
      setEditingRef(null);
      addLog(`Updated footprint for ${compRef} to ${newFp}`, 'success');
    } catch (e: any) {
      addLog(`Failed to update footprint: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = async (compRef: string) => {
    if (!currentProject) return;
    if (confirm(`Remove ${compRef} from the project?`)) {
      await api.removeComponent(currentProject.id, compRef);
      await refreshCurrentProject();
      addLog(`Removed ${compRef}`, 'info');
    }
  };

  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    const cat = await api.searchCatalog('');
    setCatalogResults(cat);
  };

  const handleAddFromCatalog = async (compName: string) => {
    if (!currentProject) return;
    try {
      setProcessing(true, `Adding ${compName} to board...`);
      await api.addComponent(currentProject.id, compName);
      await refreshCurrentProject();
      setShowAddModal(false);
      addLog(`Added ${compName} to project`, 'success');
    } catch (e: any) {
      addLog(`Failed to add component: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0b0f19] p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Step Header */}
        <div className="flex items-center justify-between border-b border-pcb-border pb-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-sm font-bold flex items-center justify-center border border-cyan-500/30">
              5
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Component Verification</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect detected components, pin counts, packages, and footprints against KiCad libraries.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Component
            </button>
            <button
              onClick={() => setActiveTab('schematic')}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              Generate Schematic &rarr;
            </button>
          </div>
        </div>

        {/* Verification Table */}
        <div className="bg-slate-900/80 border border-pcb-border rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Ref</th>
                <th className="py-3 px-4">Name & Value</th>
                <th className="py-3 px-4">Package</th>
                <th className="py-3 px-4">KiCad Footprint</th>
                <th className="py-3 px-4 text-center">Pins</th>
                <th className="py-3 px-4">Specifications</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {components.map((comp) => (
                <tr key={comp.ref} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                    {comp.ref}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-100">{comp.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{comp.value || comp.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      {comp.package}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    {editingRef === comp.ref ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={footprintQuery}
                          onChange={(e) => setFootprintQuery(e.target.value)}
                          className="w-full bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveFootprint(comp.ref, footprintQuery)}
                            className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-[10px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingRef(null)}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                        {suggestedFootprints.length > 0 && (
                          <div className="bg-slate-950 border border-slate-800 rounded p-1 text-[10px] space-y-0.5 max-h-24 overflow-y-auto">
                            {suggestedFootprints.map((fp) => (
                              <div
                                key={fp}
                                onClick={() => handleSaveFootprint(comp.ref, fp)}
                                className="px-1.5 py-0.5 hover:bg-slate-800 rounded cursor-pointer font-mono text-slate-400 hover:text-cyan-300"
                              >
                                {fp}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300 truncate">
                        <span className="truncate">{comp.footprint || 'Default footprint'}</span>
                        <button
                          onClick={() => handleEditFootprint(comp)}
                          className="p-1 hover:text-cyan-400 text-slate-500"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono text-[11px]">
                      {comp.pins.length}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-400">
                    {comp.specs?.voltage_nominal && <span>Nom: {comp.specs.voltage_nominal}V &bull; </span>}
                    {comp.specs?.current_ma && <span>{comp.specs.current_ma}mA &bull; </span>}
                    {comp.specs?.interface && <span>Bus: {comp.specs.interface}</span>}
                    {comp.datasheet && (
                      <a
                        href={comp.datasheet}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline inline-flex items-center gap-1 ml-1"
                      >
                        Datasheet <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleRemove(comp.ref)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Component Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-pcb-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Add Component from Catalog</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={catalogQuery}
                onChange={async (e) => {
                  setCatalogQuery(e.target.value);
                  const res = await api.searchCatalog(e.target.value);
                  setCatalogResults(res);
                }}
                placeholder="Search resistors, sensors, microcontrollers..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {catalogResults.map((c) => (
                <div
                  key={c.name}
                  onClick={() => handleAddFromCatalog(c.name)}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <div>
                    <h4 className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300">{c.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{c.category} &bull; {c.package} &bull; {c.pins.length} pins</p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

