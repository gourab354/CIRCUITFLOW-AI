import React from 'react';
import { 
  Sliders, Eye, EyeOff, RotateCw, ExternalLink, 
  Info, Sparkles, Layers, Shield 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LayerType } from '../../types';
import { api } from '../../services/api';

export const RightSidebar: React.FC = () => {
  const { 
    currentProject, selectedComponentRef, setSelectedComponentRef,
    activeLayer, setActiveLayer, visibleLayers, toggleLayerVisibility,
    beginnerMode, refreshCurrentProject, addLog 
  } = useAppStore();

  const selectedComp = currentProject?.circuit.components.find(
    (c) => c.ref === selectedComponentRef
  );

  const handleRotate = async () => {
    if (!currentProject || !selectedComp) return;
    try {
      await api.rotateComponent(currentProject.id, selectedComp.ref, 90);
      await refreshCurrentProject();
      addLog(`Rotated ${selectedComp.ref} by 90°`, 'info');
    } catch (e: any) {
      addLog(`Rotate failed: ${e.message}`, 'error');
    }
  };

  const handleColorChange = async (color: string) => {
    if (!currentProject) return;
    try {
      const updatedBoard = { ...currentProject.circuit.board, solder_mask_color: color };
      await api.updateBoard(currentProject.id, updatedBoard);
      await refreshCurrentProject();
      addLog(`Solder mask changed to ${color}`, 'info');
    } catch (e: any) {
      addLog(`Color update failed: ${e.message}`, 'error');
    }
  };

  const layersList: { id: LayerType; name: string; color: string }[] = [
    { id: 'F.Cu', name: 'Top Copper (F.Cu)', color: '#ef4444' },
    { id: 'B.Cu', name: 'Bottom Copper (B.Cu)', color: '#3b82f6' },
    { id: 'Edge.Cuts', name: 'Board Outline (Edge.Cuts)', color: '#eab308' },
    { id: 'F.SilkS', name: 'Top Silkscreen', color: '#f8fafc' },
    { id: 'B.SilkS', name: 'Bottom Silkscreen', color: '#94a3b8' },
  ];

  const colors = [
    { name: 'green', hex: '#15803d' },
    { name: 'black', hex: '#1e293b' },
    { name: 'blue', hex: '#1d4ed8' },
    { name: 'red', hex: '#b91c1c' },
    { name: 'white', hex: '#f8fafc' }
  ];

  return (
    <aside className="w-64 bg-[#0d1322] border-l border-pcb-border flex flex-col justify-between overflow-y-auto select-none p-3 space-y-4">
      {/* 1. Component Inspector */}
      {selectedComp ? (
        <div className="bg-slate-900/90 rounded-lg p-3 border border-pcb-border space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-cyan-400 font-bold text-sm">{selectedComp.ref}</span>
              <span className="text-[10px] text-slate-400">({selectedComp.package})</span>
            </div>
            <button
              onClick={handleRotate}
              title="Rotate 90° clockwise"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>

          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-slate-300 text-[10px]">Name:</span>
              <p className="font-medium text-slate-200 truncate">{selectedComp.name}</p>
            </div>
            <div>
              <span className="text-slate-300 text-[10px]">Footprint:</span>
              <p className="font-mono text-[11px] text-slate-400 truncate">{selectedComp.footprint}</p>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2 rounded">
              <div>X: {selectedComp.x.toFixed(1)}mm</div>
              <div>Y: {selectedComp.y.toFixed(1)}mm</div>
              <div>Rot: {selectedComp.rotation}°</div>
            </div>
            <div className="text-[10px] text-slate-300 pt-1">
              Pins: <span className="text-slate-300 font-bold">{selectedComp.pins.length} pins</span>
            </div>
            {selectedComp.datasheet && (
              <a
                href={selectedComp.datasheet}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline pt-1"
              >
                Datasheet <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-lg p-3 border border-dashed border-slate-800 text-center text-xs text-slate-300">
          Click any component on the board to view and edit its parameters.
        </div>
      )}

      {/* 2. Layer Visibility & Active Selection */}
      <div className="bg-slate-900/90 rounded-lg p-3 border border-pcb-border space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            PCB Layers
          </span>
          <span className="text-[10px] text-slate-300 font-mono">2-Layer Stack</span>
        </div>

        <div className="space-y-1">
          {layersList.map((layer) => {
            const isVisible = visibleLayers[layer.id] !== false;
            const isCurrent = activeLayer === layer.id;

            return (
              <div
                key={layer.id}
                className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                  isCurrent ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/40'
                }`}
              >
                <div 
                  onClick={() => setActiveLayer(layer.id)}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className={`text-[11px] truncate ${isCurrent ? 'text-white font-medium' : 'text-slate-400'}`}>
                    {layer.name}
                  </span>
                </div>
                <button
                  onClick={() => toggleLayerVisibility(layer.id)}
                  className="text-slate-500 hover:text-slate-300 p-0.5"
                >
                  {isVisible ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Board Appearance & Mask Color */}
      {currentProject && (
        <div className="bg-slate-900/90 rounded-lg p-3 border border-pcb-border space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-slate-300">Board Specifications</span>
          </div>
          <div className="space-y-1 text-slate-400 text-[11px]">
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="font-mono text-slate-200">
                {currentProject.circuit.board.width_mm} × {currentProject.circuit.board.height_mm} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span>Thickness:</span>
              <span className="font-mono text-slate-200">{currentProject.circuit.board.thickness_mm} mm</span>
            </div>
            <div className="flex justify-between">
              <span>Mounting Holes:</span>
              <span className="font-mono text-slate-200">{currentProject.circuit.board.mounting_holes.length}x M3</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Solder Mask Color</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              {colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleColorChange(c.name)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    currentProject.circuit.board.solder_mask_color === c.name
                      ? 'border-white scale-110 shadow-md ring-2 ring-cyan-500/50'
                      : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Beginner Guidance / AI Tips */}
      <div className="bg-gradient-to-br from-cyan-950/40 to-slate-900 rounded-lg p-3 border border-cyan-900/30 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{beginnerMode ? 'Beginner AI Guide' : 'Engineering Telemetry'}</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {beginnerMode
            ? 'Traces in red run on the Top Copper layer. Blue traces run on the Bottom Copper layer. Solid ground planes shield against electrical noise.'
            : 'Design rules: min trace width 0.20mm, min clearance 0.20mm. Bottom copper Ground plane is poured with 0.3mm clearance.'}
        </p>
      </div>
    </aside>
  );
};

