import React, { useEffect, useState } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Download, RefreshCw, 
  GitBranch, Plus, CheckCircle2 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';

export const SchematicEditor: React.FC = () => {
  const { currentProject, setActiveTab, setProcessing, addLog, refreshCurrentProject } = useAppStore();
  const [svgContent, setSvgContent] = useState<string>('');
  const [scale, setScale] = useState(1.0);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [compA, setCompA] = useState('');
  const [pinA, setPinA] = useState('');
  const [compB, setCompB] = useState('');
  const [pinB, setPinB] = useState('');
  const [netName, setNetName] = useState('NET_CUSTOM');

  const components = currentProject?.circuit.components || [];

  const loadSvg = async () => {
    if (!currentProject) return;
    try {
      const svg = await api.getSchematicSvg(currentProject.id);
      setSvgContent(svg);
    } catch (e: any) {
      addLog(`Failed to render schematic SVG: ${e.message}`, 'error');
    }
  };

  useEffect(() => {
    loadSvg();
  }, [currentProject?.id, currentProject?.circuit.nets.length]);

  const handleConnectPins = async () => {
    if (!currentProject || !compA || !pinA || !compB || !pinB) return;
    try {
      setProcessing(true, 'Adding electrical connection to schematic...');
      await api.connectPins(currentProject.id, netName, compA, pinA, compB, pinB);
      await refreshCurrentProject();
      await loadSvg();
      setShowConnectModal(false);
      addLog(`Connected ${compA}.${pinA} to ${compB}.${pinB} on ${netName}`, 'success');
    } catch (e: any) {
      addLog(`Connection error: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.name || 'Circuit'}_Schematic.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 bg-[#0b0f19] flex flex-col overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-12 border-b border-pcb-border px-4 flex items-center justify-between bg-[#0d1322] select-none">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center border border-cyan-500/30">
            6
          </span>
          <h2 className="text-sm font-bold text-white">Schematic Editor</h2>
          <span className="text-xs text-slate-400 font-mono">
            ({currentProject?.circuit.nets.length || 0} Electrical Nets)
          </span>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}
              className="p-1.5 text-slate-400 hover:text-white rounded"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              className="p-1.5 text-slate-400 hover:text-white rounded"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(1.0)}
              className="p-1.5 text-slate-400 hover:text-white rounded"
              title="Fit to Window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowConnectModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Wire
          </button>

          <button
            onClick={handleDownloadSvg}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export SVG
          </button>

          <button
            onClick={() => setActiveTab('pcb')}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            Generate PCB Layout &rarr;
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 overflow-auto cad-grid p-8 flex items-center justify-center">
        {svgContent ? (
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
            className="transition-transform duration-100 shadow-2xl rounded-lg border border-slate-700/60 overflow-hidden"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="text-slate-500 text-xs flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            Rendering schematic...
          </div>
        )}
      </div>

      {/* Manual Connection Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-pcb-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Connect Pins / Add Net Wire</h3>
              <button onClick={() => setShowConnectModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Net Name</label>
                <input
                  type="text"
                  value={netName}
                  onChange={(e) => setNetName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              {/* Endpoint A */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Component A</label>
                  <select
                    value={compA}
                    onChange={(e) => {
                      setCompA(e.target.value);
                      const c = components.find((comp) => comp.ref === e.target.value);
                      if (c && c.pins.length > 0) setPinA(c.pins[0].number);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">Select component</option>
                    {components.map((c) => (
                      <option key={c.ref} value={c.ref}>{c.ref} ({c.name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Pin A</label>
                  <select
                    value={pinA}
                    onChange={(e) => setPinA(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  >
                    {components.find((c) => c.ref === compA)?.pins.map((p) => (
                      <option key={p.number} value={p.number}>Pin {p.number} ({p.name})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Endpoint B */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Component B</label>
                  <select
                    value={compB}
                    onChange={(e) => {
                      setCompB(e.target.value);
                      const c = components.find((comp) => comp.ref === e.target.value);
                      if (c && c.pins.length > 0) setPinB(c.pins[0].number);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">Select component</option>
                    {components.map((c) => (
                      <option key={c.ref} value={c.ref}>{c.ref} ({c.name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Pin B</label>
                  <select
                    value={pinB}
                    onChange={(e) => setPinB(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  >
                    {components.find((c) => c.ref === compB)?.pins.map((p) => (
                      <option key={p.number} value={p.number}>Pin {p.number} ({p.name})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectPins}
                disabled={!compA || !pinA || !compB || !pinB}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Create Net Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

