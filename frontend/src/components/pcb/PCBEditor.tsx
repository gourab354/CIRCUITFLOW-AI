import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, RotateCw, Play, 
  Cpu, Layers, ShieldCheck, Download, Plus, Trash2, 
  Sparkles, Wand2, ArrowRight, CheckCircle2, Zap 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';
import { Component, Track, Via } from '../../types';

export const PCBEditor: React.FC = () => {
  const { 
    currentProject, refreshCurrentProject, selectedComponentRef, 
    setSelectedComponentRef, selectedNet, setSelectedNet,
    activeLayer, visibleLayers, setActiveTab, setProcessing, addLog, beginnerMode 
  } = useAppStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & Zoom
  const [zoom, setZoom] = useState(6.0); // pixels per mm
  const [pan, setPan] = useState({ x: 120, y: 80 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Mouse hover coordinate in mm
  const [mouseMm, setMouseMm] = useState({ x: 0, y: 0 });

  // Dragging Component
  const [draggedComp, setDraggedComp] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Interactive Pin-to-Pin Auto-Wiring
  const [activePinA, setActivePinA] = useState<{ compRef: string; pinNum: string; pinName: string; net?: string | null; x: number; y: number } | null>(null);
  const [hoveredPin, setHoveredPin] = useState<{ compRef: string; pinNum: string; pinName: string; net?: string | null; x: number; y: number } | null>(null);

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

    // 1. Clear background (Realistic dark CAD workshop backdrop)
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Engineering Grid (1mm minor dots, 5mm major lines)
    const startMm = pxToMm(0, 0);
    const endMm = pxToMm(width, height);
    
    // 5mm grid lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
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

    // 3. Draw Realistic Solder Mask Substrate
    const boardOrigin = mmToPx(0, 0);
    const boardW = board.width_mm * zoom;
    const boardH = board.height_mm * zoom;

    // Realistic Matte Solder Mask Colors
    const maskPalette: Record<string, { base: string; border: string }> = {
      green: { base: '#044732', border: '#022c1f' },
      black: { base: '#0f172a', border: '#020617' },
      blue: { base: '#172554', border: '#0f172a' },
      red: { base: '#7f1d1d', border: '#450a0a' },
      white: { base: '#e2e8f0', border: '#94a3b8' }
    };
    const activePalette = maskPalette[board.solder_mask_color] || maskPalette.green;

    // Outer subtle board shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    const radius = board.shape === 'rounded_rect' ? Math.min(board.corner_radius_mm * zoom, 25) : 0;
    ctx.fillStyle = activePalette.base;
    ctx.beginPath();
    if (radius > 0) {
      ctx.roundRect(boardOrigin.x, boardOrigin.y, boardW, boardH, radius);
    } else {
      ctx.rect(boardOrigin.x, boardOrigin.y, boardW, boardH);
    }
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Board Outline (Edge.Cuts gold milling border)
    if (visibleLayers['Edge.Cuts'] !== false) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = Math.max(1.5, 0.25 * zoom);
      ctx.beginPath();
      if (radius > 0) {
        ctx.roundRect(boardOrigin.x, boardOrigin.y, boardW, boardH, radius);
      } else {
        ctx.rect(boardOrigin.x, boardOrigin.y, boardW, boardH);
      }
      ctx.stroke();
    }

    // 4. Ground Copper Zones (Realistic hatched / solid fill on Bottom Layer)
    if (visibleLayers['B.Cu'] !== false && circuit.zones.length > 0) {
      ctx.fillStyle = 'rgba(37, 99, 235, 0.16)';
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

    // 5. Unrouted Ratsnest Airwires (Fine dashed flightlines)
    // Connect unrouted pads belonging to the same net
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (const net of circuit.nets) {
      if (net.nodes.length >= 2) {
        const netTracks = circuit.tracks.filter(t => t.net === net.name);
        // If unrouted, draw flight lines
        if (netTracks.length === 0) {
          const padCoords: { x: number; y: number }[] = [];
          for (const node of net.nodes) {
            const comp = circuit.components.find(c => c.ref === node.component_ref);
            if (comp) {
              const pin = comp.pins.find(p => p.number === node.pin_number);
              if (pin) {
                const rad = (comp.rotation * Math.PI) / 180;
                const rx = pin.rel_x * Math.cos(rad) - pin.rel_y * Math.sin(rad);
                const ry = pin.rel_x * Math.sin(rad) + pin.rel_y * Math.cos(rad);
                padCoords.push(mmToPx(comp.x + rx, comp.y + ry));
              }
            }
          }
          for (let i = 0; i < padCoords.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(padCoords[i].x, padCoords[i].y);
            ctx.lineTo(padCoords[i + 1].x, padCoords[i + 1].y);
            ctx.stroke();
          }
        }
      }
    }
    ctx.setLineDash([]); // Reset dash

    // 6. Draw Mounting Holes with Annular Copper Rings
    for (const hole of board.mounting_holes) {
      const hp = mmToPx(hole.x, hole.y);
      const rHole = (hole.diameter_mm / 2.0) * zoom;
      const rPad = (hole.pad_diameter_mm / 2.0) * zoom;

      // Exposed copper annulus
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, rPad, 0, Math.PI * 2);
      ctx.fill();

      // Drill hole (reveals dark workbench)
      ctx.fillStyle = '#060a14';
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, rHole, 0, Math.PI * 2);
      ctx.fill();

      // Silkscreen keepout circle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, rPad + 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 7. Draw Copper Tracks (45-Degree Mitered Trajectories)
    // Bottom Copper Layer (B.Cu - Industrial Deep Blue)
    if (visibleLayers['B.Cu'] !== false) {
      for (const trk of circuit.tracks.filter(t => t.layer === 'B.Cu')) {
        const p1 = mmToPx(trk.start.x, trk.start.y);
        const p2 = mmToPx(trk.end.x, trk.end.y);
        const isHighlight = selectedNet && trk.net === selectedNet;

        ctx.strokeStyle = isHighlight ? '#38bdf8' : '#2563eb';
        ctx.lineWidth = Math.max(1.2, trk.width_mm * zoom);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Top Copper Layer (F.Cu - Industrial Ruby Red)
    if (visibleLayers['F.Cu'] !== false) {
      for (const trk of circuit.tracks.filter(t => t.layer === 'F.Cu')) {
        const p1 = mmToPx(trk.start.x, trk.start.y);
        const p2 = mmToPx(trk.end.x, trk.end.y);
        const isHighlight = selectedNet && trk.net === selectedNet;

        ctx.strokeStyle = isHighlight ? '#facc15' : '#dc2626';
        ctx.lineWidth = Math.max(1.2, trk.width_mm * zoom);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 8. Draw Vias (Golden Annular Ring with Center Drill)
    for (const via of circuit.vias) {
      const vp = mmToPx(via.x, via.y);
      const rOuter = (via.diameter_mm / 2.0) * zoom;
      const rDrill = (via.drill_mm / 2.0) * zoom;
      const isHighlight = selectedNet && via.net === selectedNet;

      // Outer copper ring
      ctx.fillStyle = isHighlight ? '#38bdf8' : '#eab308';
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, rOuter, 0, Math.PI * 2);
      ctx.fill();

      // Drill hole
      ctx.fillStyle = '#060a14';
      ctx.beginPath();
      ctx.arc(vp.x, vp.y, rDrill, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Draw Components, Silkscreen Courtyards, & Pads
    for (const comp of circuit.components) {
      const cp = mmToPx(comp.x, comp.y);
      const cw = comp.width_mm * zoom;
      const ch = comp.height_mm * zoom;
      const isSelected = selectedComponentRef === comp.ref;

      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate((comp.rotation * Math.PI) / 180);

      // Component Silkscreen (White legend lines)
      if (visibleLayers['F.SilkS'] !== false) {
        ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = isSelected ? 2 : 1;

        // Courtyard outline
        ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);

        // IC Pin 1 Orientation Notch / Dot
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(-cw / 2 + 3, -ch / 2 + 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Reference Designator Text (e.g. U1, R1, C1)
        ctx.fillStyle = isSelected ? '#38bdf8' : '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(comp.ref, 0, -ch / 2 - 4);
      }

      // Component Pads (ENIG Immersion Gold or Solder Silver)
      for (const pin of comp.pins) {
        const padX = pin.rel_x * zoom;
        const padY = pin.rel_y * zoom;
        const padW = pin.pad_size_x * zoom;
        const padH = pin.pad_size_y * zoom;
        
        const isNetHighlight = selectedNet && pin.net === selectedNet;
        const isActivePin = activePinA && activePinA.compRef === comp.ref && activePinA.pinNum === pin.number;
        const isHovered = hoveredPin && hoveredPin.compRef === comp.ref && hoveredPin.pinNum === pin.number;

        // Ground Thermal Relief Spokes if connected to GND
        if (pin.net === 'GND' && visibleLayers['B.Cu'] !== false) {
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padX - padW, padY);
          ctx.lineTo(padX + padW, padY);
          ctx.moveTo(padX, padY - padH);
          ctx.lineTo(padX, padY + padH);
          ctx.stroke();
        }

        // Pad Fill
        if (isActivePin) {
          ctx.fillStyle = '#ec4899'; // Active source pin glows pink
        } else if (isHovered) {
          ctx.fillStyle = '#38bdf8'; // Hovered target glows cyan
        } else if (isNetHighlight) {
          ctx.fillStyle = '#facc15';
        } else if (pin.hole_diameter > 0) {
          ctx.fillStyle = '#d97706'; // THT amber
        } else {
          ctx.fillStyle = '#eab308'; // ENIG gold SMD
        }

        if (pin.pad_shape === 'circle') {
          ctx.beginPath();
          ctx.arc(padX, padY, padW / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(padX - padW / 2, padY - padH / 2, padW, padH);
        }

        // Drill hole if THT
        if (pin.hole_diameter > 0) {
          ctx.fillStyle = '#060a14';
          ctx.beginPath();
          ctx.arc(padX, padY, (pin.hole_diameter / 2) * zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // 10. Draw Active Interactive Pin-to-Pin Auto-Wiring Flightline
    if (activePinA) {
      const mousePx = mmToPx(mouseMm.x, mouseMm.y);
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(activePinA.x, activePinA.y);
      ctx.lineTo(mousePx.x, mousePx.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Instruction banner beside cursor
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1;
      ctx.fillRect(mousePx.x + 12, mousePx.y - 25, 200, 24);
      ctx.strokeRect(mousePx.x + 12, mousePx.y - 25, 200, 24);
      ctx.fillStyle = '#f472b6';
      ctx.font = '10px monospace';
      ctx.fillText(`Wiring from ${activePinA.compRef}.${activePinA.pinName} -> Click target pin`, mousePx.x + 18, mousePx.y - 9);
    }

  }, [circuit, zoom, pan, selectedComponentRef, selectedNet, visibleLayers, activePinA, hoveredPin, mouseMm, mmToPx, pxToMm]);

  // Find pin under mouse pointer
  const findPinAtMm = (mm: { x: number; y: number }) => {
    if (!circuit) return null;
    for (const comp of circuit.components) {
      const rad = (comp.rotation * Math.PI) / 180;
      for (const pin of comp.pins) {
        const rx = pin.rel_x * Math.cos(rad) - pin.rel_y * Math.sin(rad);
        const ry = pin.rel_x * Math.sin(rad) + pin.rel_y * Math.cos(rad);
        const padX = comp.x + rx;
        const padY = comp.y + ry;
        const dist = Math.hypot(mm.x - padX, mm.y - padY);
        if (dist <= Math.max(pin.pad_size_x, pin.pad_size_y) / 1.5 + 0.5) {
          const px = mmToPx(padX, padY);
          return {
            compRef: comp.ref,
            pinNum: pin.number,
            pinName: pin.name,
            net: pin.net,
            x: px.x,
            y: px.y
          };
        }
      }
    }
    return null;
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !circuit) return;
    const rect = canvas.getBoundingClientRect();
    const clickPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const clickMm = pxToMm(clickPx.x, clickPx.y);

    // Pan with middle click or right click
    if (e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Check if clicked a Pin for Interactive Pin-to-Pin Auto-Wiring
    const pinClicked = findPinAtMm(clickMm);
    if (pinClicked) {
      if (!activePinA) {
        // Start wiring from Pin A
        setActivePinA(pinClicked);
        addLog(`Started auto-wire from ${pinClicked.compRef}.${pinClicked.pinName} (Pin ${pinClicked.pinNum}). Click destination pin to finish.`, 'info');
      } else {
        // Complete pin-to-pin auto-wire to Pin B!
        if (activePinA.compRef !== pinClicked.compRef || activePinA.pinNum !== pinClicked.pinNum) {
          handlePinToPinRoute(activePinA.compRef, activePinA.pinNum, pinClicked.compRef, pinClicked.pinNum);
        }
        setActivePinA(null);
      }
      return;
    } else if (activePinA) {
      // Cancel active wiring if clicked empty space
      setActivePinA(null);
      return;
    }

    // Left click on component body: Drag selection
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const currMm = pxToMm(currPx.x, currPx.y);
    setMouseMm(currMm);

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    // Detect hovered pin
    const pin = findPinAtMm(currMm);
    setHoveredPin(pin);

    // Drag component
    if (draggedComp && currentProject) {
      const targetComp = circuit?.components.find(c => c.ref === draggedComp);
      if (targetComp) {
        targetComp.x = Math.round((currMm.x - dragOffset.x) * 10) / 10;
        targetComp.y = Math.round((currMm.y - dragOffset.y) * 10) / 10;
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
          addLog(`Repositioned ${targetComp.ref} to (${targetComp.x}, ${targetComp.y}) mm`, 'info');
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

  // Keyboard shortcut 'R' to rotate selected component
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && selectedComponentRef && currentProject) {
        await api.rotateComponent(currentProject.id, selectedComponentRef, 90);
        await refreshCurrentProject();
        addLog(`Rotated ${selectedComponentRef} by 90°`, 'info');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentRef, currentProject]);

  // Execute pin-to-pin auto-wire
  const handlePinToPinRoute = async (compA: string, pinA: string, compB: string, pinB: string) => {
    if (!currentProject) return;
    try {
      setProcessing(true, `Auto-routing 45° track between ${compA}.${pinA} and ${compB}.${pinB}...`);
      await api.routePinToPin(currentProject.id, compA, pinA, compB, pinB);
      await refreshCurrentProject();
      addLog(`Routed realistic 45° copper track between ${compA}.${pinA} and ${compB}.${pinB}`, 'success');
    } catch (e: any) {
      addLog(`Pin-to-pin route failed: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // The Magic "Auto-Wire Everything by Itself" button
  const handleAutonomousAutoWire = async () => {
    if (!currentProject) return;
    try {
      setProcessing(true, 'Autonomous Engine: Inferring power rails, wiring pins, & pouring ground plane...');
      addLog('Initiating Autonomous Pin-to-Pin Circuit Synthesis...', 'info');
      const res = await api.runAutoWire(currentProject.id);
      await refreshCurrentProject();
      addLog(`Autonomous synthesis complete! Executed ${res.actions.length} automated wiring actions with 45° mitered copper traces.`, 'success');
    } catch (e: any) {
      addLog(`Autonomous auto-wire error: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-[#060a14] flex flex-col overflow-hidden">
      {/* Top Controls Bar */}
      <div className="h-12 border-b border-pcb-border px-4 flex items-center justify-between bg-[#0d1322] select-none z-10">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center border border-cyan-500/30">
            8
          </span>
          <h2 className="text-sm font-bold text-white">PCB Layout Editor</h2>
          <span className="text-xs text-slate-400 font-mono">
            {circuit?.components.length || 0} Components &bull; {circuit?.tracks.length || 0} 45° Tracks &bull; {circuit?.vias.length || 0} Vias
          </span>
        </div>

        {/* Action Buttons: Autonomous Auto-Wire & Controls */}
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

          {/* Autonomous 1-Click Auto-Wire Button */}
          <button
            onClick={handleAutonomousAutoWire}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all transform hover:-translate-y-0.5"
            title="Automatically connects power, ground, I2C, and routes all tracks by itself"
          >
            <Wand2 className="w-4 h-4 text-slate-950" />
            Auto-Wire & Route Everything
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

        {/* HUD Overlay: Coordinate readout & Beginner guidance */}
        <div className="absolute bottom-3 left-4 bg-slate-900/90 border border-pcb-border px-3.5 py-2 rounded-xl text-[11px] font-mono text-slate-300 flex items-center gap-4 shadow-xl backdrop-blur-md pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">X:</span>
            <span className="text-cyan-400 font-bold">{mouseMm.x.toFixed(2)} mm</span>
            <span className="text-slate-500 pl-1">Y:</span>
            <span className="text-cyan-400 font-bold">{mouseMm.y.toFixed(2)} mm</span>
          </div>
          <div className="text-slate-400 border-l border-slate-800 pl-3">
            Click any pin to auto-wire &bull; Drag to move &bull; Press &apos;R&apos; to rotate
          </div>
        </div>

        {/* Floating Pin-to-Pin Tooltip */}
        {hoveredPin && !activePinA && (
          <div className="absolute top-4 right-4 bg-slate-900/95 border border-cyan-500/40 p-3 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md pointer-events-none animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-cyan-400">
              <Zap className="w-3.5 h-3.5" />
              <span>{hoveredPin.compRef} — Pin {hoveredPin.pinNum} ({hoveredPin.pinName})</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Net: <span className="text-amber-400 font-mono font-semibold">{hoveredPin.net || 'Unassigned Net'}</span>
            </div>
            <p className="text-[10px] text-cyan-300/80 pt-0.5">
              Click this pin to start auto-routing to another component!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
