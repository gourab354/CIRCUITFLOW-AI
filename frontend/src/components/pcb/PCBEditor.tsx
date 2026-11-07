import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, RotateCw, Play, 
  Cpu, Layers, ShieldCheck, Download, Plus, Trash2, Sliders 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';
import { Component, Track, Via } from '../../types';

export const PCBEditor: React.FC = () => {
  const { 
    currentProject, refreshCurrentProject, selectedComponentRef, 
    setSelectedComponentRef, selectedNet, setSelectedNet,
    activeLayer, visibleLayers, setActiveTab, setProcessing, addLog 
  } = useAppStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & Zoom
  const [zoom, setZoom] = useState(6.0); // pixels per mm (e.g. 60mm board = 360px)
  const [pan, setPan] = useState({ x: 120, y: 80 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging Component
  const [draggedComp, setDraggedComp] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Routing / Track placement tool
  const [toolMode, setToolMode] = useState<'select' | 'route' | 'via'>('select');
  const [routeStartPad, setRouteStartPad] = useState<{ x: number; y: number; net: string } | null>(null);

  const circuit = currentProject?.circuit;
  const board = circuit?.board || { 
    width_mm: 70, 
    height_mm: 50, 
    shape: 'rounded_rect',
    corner_radius_mm: 3.0,
    layers: 2,
    thickness_mm: 1.6,
    copper_weight_oz: 1.0,
    solder_mask_color: 'green',
    silkscreen_color: 'white',
    surface_finish: 'HASL',
    mounting_holes: []
  };

  // Convert board mm coordinates to canvas pixels
  const mmToPx = useCallback((xMm: number, yMm: number) => {
    return {
      x: pan.x + xMm * zoom,
      y: pan.y + yMm * zoom
    };
  }, [pan, zoom]);

  // Convert canvas pixels to board mm
  const pxToMm = useCallback((xPx: number, yPx: number) => {
    return {
      x: (xPx - pan.x) / zoom,
      y: (yPx - pan.y) / zoom
    };
  }, [pan, zoom]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !circuit) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 1. Clear background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Grid (1mm and 10mm divisions)
    const startMm = pxToMm(0, 0);
    const endMm = pxToMm(width, height);
    ctx.lineWidth = 0.5;
    
    // 5mm grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for (let gx = Math.floor(startMm.x / 5) * 5; gx <= endMm.x; gx += 5) {
      const p = mmToPx(gx, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, height);
      ctx.stroke();
    }
    for (let gy = Math.floor(startMm.y / 5) * 5; gy <= endMm.y; gy += 5) {
      const p = mmToPx(0, gy);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(width, p.y);
      ctx.stroke();
    }

    // 3. Draw PCB Substrate / Solder Mask Box
    const boardOrigin = mmToPx(0, 0);
    const boardW = board.width_mm * zoom;
    const boardH = board.height_mm * zoom;

    // Mask color styling
    const maskColors: Record<string, string> = {
      green: '#064e3b',
      black: '#0f172a',
      blue: '#1e3a8a',
      red: '#7f1d1d',
      white: '#f1f5f9'
    };
    ctx.fillStyle = maskColors[board.solder_mask_color] || '#064e3b';
    ctx.strokeStyle = '#eab308'; // Edge.Cuts yellow
    ctx.lineWidth = Math.max(1.5, 0.2 * zoom);

    if (board.shape === 'rounded_rect') {
      const radius = Math.min(board.corner_radius_mm * zoom, 20);
      ctx.beginPath();
      ctx.roundRect(boardOrigin.x, boardOrigin.y, boardW, boardH, radius);
      ctx.fill();
      if (visibleLayers['Edge.Cuts'] !== false) ctx.stroke();
    } else {
      ctx.fillRect(boardOrigin.x, boardOrigin.y, boardW, boardH);
      if (visibleLayers['Edge.Cuts'] !== false) {
        ctx.strokeRect(boardOrigin.x, boardOrigin.y, boardW, boardH);
      }
    }

    // 4. Draw Ground Planes (Copper Zones)
    if (visibleLayers['B.Cu'] !== false && circuit.zones.length > 0) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.18)'; // Translucent blue for B.Cu ground zone
      for (const zone of circuit.zones) {
        if (zone.polygon.length > 2) {
          ctx.beginPath();
          const first = mmToPx(zone.polygon[0].x, zone.polygon[0].y);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < zone.polygon.length; i++) {
            const pt = mmToPx(zone.polygon[i].x, zone.polygon[i].y);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 5. Draw Mounting Holes
    for (const hole of board.mounting_holes) {
      const hp = mmToPx(hole.x, hole.y);
      const rHole = (hole.diameter_mm / 2.0) * zoom;
      const rPad = (hole.pad_diameter_mm / 2.0) * zoom;

      // Outer copper ring
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, rPad, 0, Math.PI * 2);
      ctx.fill();

      // Drill hole
      ctx.fillStyle = '#080d1a';
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, rHole, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Draw Tracks (Bottom Copper: Blue, Top Copper: Red)
    // Draw B.Cu first
    if (visibleLayers['B.Cu'] !== false) {
      for (const trk of circuit.tracks.filter(t => t.layer === 'B.Cu')) {
        const p1 = mmToPx(trk.start.x, trk.start.y);
        const p2 = mmToPx(trk.end.x, trk.end.y);
        const isHighlight = selectedNet && trk.net === selectedNet;

        ctx.strokeStyle = isHighlight ? '#38bdf8' : '#3b82f6';
        ctx.lineWidth = Math.max(1, trk.width_mm * zoom);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Draw F.Cu
    if (visibleLayers['F.Cu'] !== false) {
      for (const trk of circuit.tracks.filter(t => t.layer === 'F.Cu')) {
        const p1 = mmToPx(trk.start.x, trk.start.y);
        const p2 = mmToPx(trk.end.x, trk.end.y);
        const isHighlight = selectedNet && trk.net === selectedNet;

        ctx.strokeStyle = isHighlight ? '#facc15' : '#ef4444';
        ctx.lineWidth = Math.max(1, trk.width_mm * zoom);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 7. Draw Vias
    for (const via of circuit.vias) {
      const vp = mmToPx(via.x, via.y);
      const rOuter = (via.diameter_mm / 2.0) * zoom;
      const rDrill = (via.drill_mm / 2.0) * zoom;

      // Outer copper annular ring
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, rOuter, 0, Math.PI * 2);
      ctx.fill();

      // Drill hole
      ctx.fillStyle = '#080d1a';
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, rDrill, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Draw Components & Pads
    for (const comp of circuit.components) {
      const cp = mmToPx(comp.x, comp.y);
      const cw = comp.width_mm * zoom;
      const ch = comp.height_mm * zoom;
      const isSelected = selectedComponentRef === comp.ref;

      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate((comp.rotation * Math.PI) / 180);

      // Component Courtyard / Silkscreen box
      if (visibleLayers['F.SilkS'] !== false) {
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#e2e8f0';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);

        // Reference Designator Text
        ctx.fillStyle = isSelected ? '#38bdf8' : '#f8fafc';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(comp.ref, 0, -ch / 2 - 4);

        // Pin 1 Indicator dot
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(-cw / 2 + 3, -ch / 2 + 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pads
      for (const pin of comp.pins) {
        const padX = pin.rel_x * zoom;
        const padY = pin.rel_y * zoom;
        const padW = pin.pad_size_x * zoom;
        const padH = pin.pad_size_y * zoom;
        const isPadHighlight = selectedNet && pin.net === selectedNet;

        // Copper Pad
        ctx.fillStyle = isPadHighlight ? '#38bdf8' : (pin.hole_diameter > 0 ? '#fbbf24' : '#f59e0b');
        if (pin.pad_shape === 'circle') {
          ctx.beginPath();
          ctx.arc(padX, padY, padW / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(padX - padW / 2, padY - padH / 2, padW, padH);
        }

        // Drill hole if THT
        if (pin.hole_diameter > 0) {
          ctx.fillStyle = '#080d1a';
          ctx.beginPath();
          ctx.arc(padX, padY, (pin.hole_diameter / 2) * zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // 9. Coordinate Axis Origin
    const origin = mmToPx(0, 0);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + 25, origin.y); // X axis
    ctx.stroke();

    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x, origin.y + 25); // Y axis
    ctx.stroke();

  }, [circuit, zoom, pan, selectedComponentRef, selectedNet, visibleLayers, mmToPx, pxToMm]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !circuit) return;
    const rect = canvas.getBoundingClientRect();
    const clickPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const clickMm = pxToMm(clickPx.x, clickPx.y);

    // Pan with middle click or spacebar
    if (e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Left click: check component selection
    let clickedCompRef: string | null = null;
    for (const comp of circuit.components) {
      const halfW = comp.width_mm / 2.0;
      const halfH = comp.height_mm / 2.0;
      if (
        clickMm.x >= comp.x - halfW && clickMm.x <= comp.x + halfW &&
        clickMm.y >= comp.y - halfH && clickMm.y <= comp.y + halfH
      ) {
        clickedCompRef = comp.ref;
        setDraggedComp(comp.ref);
        setDragOffset({ x: clickMm.x - comp.x, y: clickMm.y - comp.y });
        break;
      }
    }

    setSelectedComponentRef(clickedCompRef);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (draggedComp && currentProject) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const currMm = pxToMm(e.clientX - rect.left, e.clientY - rect.top);
      const targetComp = circuit?.components.find(c => c.ref === draggedComp);
      if (targetComp) {
        targetComp.x = Math.round((currMm.x - dragOffset.x) * 10) / 10;
        targetComp.y = Math.round((currMm.y - dragOffset.y) * 10) / 10;
        // Trigger re-render
        setPan(p => ({ ...p }));
      }
    }
  };

  const handleMouseUp = async () => {
    if (isPanning) setIsPanning(false);
    if (draggedComp && currentProject) {
      const targetComp = circuit?.components.find(c => c.ref === draggedComp);
      if (targetComp) {
        try {
          await api.moveComponent(currentProject.id, targetComp.ref, targetComp.x, targetComp.y);
          addLog(`Moved ${targetComp.ref} to (${targetComp.x}, ${targetComp.y}) mm`, 'info');
        } catch (e) {}
      }
      setDraggedComp(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(z => Math.max(1.5, Math.min(25, z * factor)));
  };

  const handleAutoRoute = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Routing multi-layer tracks and copper ground zones...');
      addLog('A* Multi-layer routing started...', 'info');
      await api.runAutoRoute(currentProject.id);
      await refreshCurrentProject();
      addLog('Routing complete with ground copper zones poured.', 'success');
    } catch (e: any) {
      addLog(`Auto-route error: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoPlace = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Optimizing component placement for minimal trace length...');
      addLog('Force-directed auto placement pass started...', 'info');
      await api.runAutoPlace(currentProject.id);
      await refreshCurrentProject();
      addLog('Optimal component layout achieved.', 'success');
    } catch (e: any) {
      addLog(`Placement error: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0b0f19] flex flex-col overflow-hidden">
      {/* Top Controls Bar */}
      <div className="h-12 border-b border-pcb-border px-4 flex items-center justify-between bg-[#0d1322] select-none z-10">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center border border-cyan-500/30">
            8
          </span>
          <h2 className="text-sm font-bold text-white">Interactive PCB Editor</h2>
          <span className="text-xs text-slate-400 font-mono">
            {circuit?.components.length || 0} Components &bull; {circuit?.tracks.length || 0} Tracks &bull; {circuit?.vias.length || 0} Vias
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setZoom(z => Math.max(1.5, z * 0.85))}
              className="p-1.5 text-slate-400 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300">
              {Math.round(zoom * 10)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(25, z * 1.15))}
              className="p-1.5 text-slate-400 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(6.0); setPan({ x: 120, y: 80 }); }}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleAutoPlace}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5" />
            Auto-Place
          </button>

          <button
            onClick={handleAutoRoute}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30"
          >
            <Play className="w-3.5 h-3.5" />
            Auto-Route Traces
          </button>

          <button
            onClick={() => setActiveTab('three')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            3D Preview &rarr;
          </button>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="flex-1 relative overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full block"
        />

        {/* Canvas HUD Overlay: Active Layer Indicator & Instructions */}
        <div className="absolute bottom-3 left-4 bg-slate-900/90 border border-pcb-border px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 flex items-center gap-4 shadow-lg backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Active:</span>
            <span className="text-cyan-400 font-bold">{activeLayer}</span>
          </div>
          <div className="text-slate-500 border-l border-slate-800 pl-4">
            Drag to move &bull; R to rotate &bull; Middle-click to pan
          </div>
        </div>
      </div>
    </div>
  );
};
