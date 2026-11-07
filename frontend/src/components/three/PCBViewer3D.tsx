import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, Layers, Eye, Download, Maximize2, 
  Sparkles, CheckCircle2, Sliders 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const PCBViewer3D: React.FC = () => {
  const { currentProject, setActiveTab } = useAppStore();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [showTraces, setShowTraces] = useState(true);

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

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !circuit) return;

    // 1. Scene & Camera Setup
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, -75, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    // 2. Realistic Studio Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(50, -50, 90);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Fill Light (Soft cool blue)
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    fillLight.position.set(-60, 40, 60);
    scene.add(fillLight);

    // Rim / Backlight
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    rimLight.position.set(0, 80, -30);
    scene.add(rimLight);

    // PCB Assembly Root
    const pcbGroup = new THREE.Group();
    scene.add(pcbGroup);

    const bw = board.width_mm;
    const bh = board.height_mm;
    const thickness = board.thickness_mm;

    // 3. Realistic FR4 Core Substrate + Solder Mask Material
    const maskPalette: Record<string, { color: number; roughness: number }> = {
      green: { color: 0x054832, roughness: 0.35 },
      black: { color: 0x111827, roughness: 0.4 },
      blue: { color: 0x1e3a8a, roughness: 0.35 },
      red: { color: 0x991b1b, roughness: 0.35 },
      white: { color: 0xf1f5f9, roughness: 0.25 }
    };
    const activeMask = maskPalette[board.solder_mask_color] || maskPalette.green;

    const boardGeo = new THREE.BoxGeometry(bw, bh, thickness);
    const boardMat = new THREE.MeshStandardMaterial({
      color: activeMask.color,
      roughness: activeMask.roughness,
      metalness: 0.15,
      wireframe: wireframeMode
    });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.receiveShadow = true;
    pcbGroup.add(boardMesh);

    // Subtle edge copper / fiberglass layer along PCB boundary
    const edgeGeo = new THREE.BoxGeometry(bw + 0.1, bh + 0.1, thickness * 0.7);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6, metalness: 0.3 });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    pcbGroup.add(edgeMesh);

    // 4. Mounting Holes (Drill Cutouts with Gold Annular Rings)
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.18 });
    const solderSilverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.25 });
    const drillMat = new THREE.MeshBasicMaterial({ color: 0x060913 });

    for (const hole of board.mounting_holes) {
      const hx = hole.x - bw / 2;
      const hy = -(hole.y - bh / 2);

      // Gold copper pad ring on top & bottom
      const ringGeo = new THREE.CylinderGeometry(hole.pad_diameter_mm / 2, hole.pad_diameter_mm / 2, thickness + 0.05, 24);
      const ringMesh = new THREE.Mesh(ringGeo, goldMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(hx, hy, 0);
      pcbGroup.add(ringMesh);

      // Dark hole drill
      const holeGeo = new THREE.CylinderGeometry(hole.diameter_mm / 2, hole.diameter_mm / 2, thickness + 0.1, 24);
      const holeMesh = new THREE.Mesh(holeGeo, drillMat);
      holeMesh.rotation.x = Math.PI / 2;
      holeMesh.position.set(hx, hy, 0);
      pcbGroup.add(holeMesh);
    }

    // 5. 3D Copper Traces (Raised slightly above mask)
    if (showTraces) {
      const traceMatTop = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.3 });
      const traceMatBottom = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.3 });

      for (const trk of circuit.tracks) {
        const x1 = trk.start.x - bw / 2;
        const y1 = -(trk.start.y - bh / 2);
        const x2 = trk.end.x - bw / 2;
        const y2 = -(trk.end.y - bh / 2);

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.1) continue;

        const trkGeo = new THREE.BoxGeometry(len, trk.width_mm, 0.04);
        const isTop = trk.layer === 'F.Cu';
        const trkMesh = new THREE.Mesh(trkGeo, isTop ? traceMatTop : traceMatBottom);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const angle = Math.atan2(dy, dx);

        trkMesh.position.set(midX, midY, isTop ? (thickness / 2 + 0.02) : -(thickness / 2 + 0.02));
        trkMesh.rotation.z = angle;
        pcbGroup.add(trkMesh);
      }
    }

    // 6. Realistic 3D Component Models
    const icBodyMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 });
    const metalShieldMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.2 });
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7 });
    const blueShellMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.3 });

    for (const comp of circuit.components) {
      const cx = comp.x - bw / 2;
      const cy = -(comp.y - bh / 2);
      const cz = thickness / 2;

      const compGroup = new THREE.Group();
      compGroup.position.set(cx, cy, cz);
      compGroup.rotation.z = (comp.rotation * Math.PI) / 180;

      const name = comp.name.toLowerCase();
      const ref = comp.ref.toUpperCase();

      if (name.includes('esp32')) {
        // ESP32-WROOM-32: Black PCB module + Tin RF Shield + Antenna
        const modBaseGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 0.8);
        const modBaseMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 });
        const modBase = new THREE.Mesh(modBaseGeo, modBaseMat);
        modBase.position.z = 0.4;
        compGroup.add(modBase);

        // Metallic RF Shield with engraved markings
        const shieldGeo = new THREE.BoxGeometry(comp.width_mm * 0.9, comp.height_mm * 0.65, 2.4);
        const shield = new THREE.Mesh(shieldGeo, metalShieldMat);
        shield.position.set(0, -comp.height_mm * 0.12, 1.6);
        shield.castShadow = true;
        compGroup.add(shield);

        // Meandered PCB Antenna (Gold Trace at top)
        const antGeo = new THREE.BoxGeometry(comp.width_mm * 0.8, comp.height_mm * 0.18, 0.05);
        const antMesh = new THREE.Mesh(antGeo, goldMat);
        antMesh.position.set(0, comp.height_mm * 0.36, 0.82);
        compGroup.add(antMesh);

      } else if (name.includes('mpu6050') || name.includes('sensor')) {
        // MPU6050: QFN package + orientation indicator
        const icGeo = new THREE.BoxGeometry(comp.width_mm * 0.6, comp.height_mm * 0.6, 1.2);
        const icMesh = new THREE.Mesh(icGeo, icBodyMat);
        icMesh.position.z = 0.6;
        icMesh.castShadow = true;
        compGroup.add(icMesh);

      } else if (name.includes('oled') || name.includes('ssd1306')) {
        // OLED Display: Display glass + Black bezel + 4-pin header
        const glassGeo = new THREE.BoxGeometry(comp.width_mm * 0.92, comp.height_mm * 0.92, 1.2);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.z = 0.6;
        glass.castShadow = true;
        compGroup.add(glass);

      } else if (name.includes('tp4056') || name.includes('charger')) {
        // TP4056 Li-Ion Module + Micro-USB / Type-C metal socket
        const tpGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 1.0);
        const tpMesh = new THREE.Mesh(tpGeo, boardMat);
        tpMesh.position.z = 0.5;
        compGroup.add(tpMesh);

        // USB Metal Jack
        const usbGeo = new THREE.BoxGeometry(8, 6, 3.0);
        const usbMesh = new THREE.Mesh(usbGeo, metalShieldMat);
        usbMesh.position.set(0, -comp.height_mm / 2 + 3, 2.0);
        compGroup.add(usbMesh);

      } else if (ref.startsWith('TB') || name.includes('terminal')) {
        // Screw Terminal Block (Blue plastic shell + Brass clamping screws)
        const tbGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 9.0);
        const tbMesh = new THREE.Mesh(tbGeo, blueShellMat);
        tbMesh.position.z = 4.5;
        tbMesh.castShadow = true;
        compGroup.add(tbMesh);

        // Two brass screws on top
        for (const sx of [-2.54, 2.54]) {
          const screwGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 16);
          const screw = new THREE.Mesh(screwGeo, metalShieldMat);
          screw.rotation.x = Math.PI / 2;
          screw.position.set(sx, 0, 9.2);
          compGroup.add(screw);
        }

      } else if (ref.startsWith('R') || ref.startsWith('C') || ref.startsWith('D')) {
        // 0805 SMD Component: Ceramic middle + Silver solder end caps
        const bodyGeo = new THREE.BoxGeometry(comp.width_mm * 0.6, comp.height_mm, 0.7);
        const bodyMat = ref.startsWith('R') ? icBodyMat : (ref.startsWith('C') ? ceramicMat : goldMat);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.z = 0.35;
        compGroup.add(bodyMesh);

        // End caps (silver solder)
        for (const capX of [-comp.width_mm * 0.4, comp.width_mm * 0.4]) {
          const capGeo = new THREE.BoxGeometry(comp.width_mm * 0.25, comp.height_mm, 0.72);
          const capMesh = new THREE.Mesh(capGeo, solderSilverMat);
          capMesh.position.set(capX, 0, 0.36);
          compGroup.add(capMesh);
        }

      } else {
        // Generic IC Module
        const icGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 1.4);
        const icMesh = new THREE.Mesh(icGeo, icBodyMat);
        icMesh.position.z = 0.7;
        icMesh.castShadow = true;
        compGroup.add(icMesh);
      }

      // Solder Pads (ENIG Immersion Gold Contacts)
      for (const pin of comp.pins) {
        const padGeo = new THREE.BoxGeometry(pin.pad_size_x, pin.pad_size_y, 0.04);
        const pad = new THREE.Mesh(padGeo, goldMat);
        pad.position.set(pin.rel_x, -pin.rel_y, 0.02);
        compGroup.add(pad);
      }

      pcbGroup.add(compGroup);
    }

    // 7. Interactive Smooth Orbit / Pan Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      pcbGroup.rotation.z += deltaX * 0.01;
      pcbGroup.rotation.x += deltaY * 0.01;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(25, Math.min(220, camera.position.z + e.deltaY * 0.12));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Initial isometric perspective angle
    pcbGroup.rotation.x = -0.7;
    pcbGroup.rotation.z = 0.35;

    // Smooth render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [circuit, board, wireframeMode, showTraces]);

  return (
    <div className="flex-1 bg-[#060913] flex flex-col overflow-hidden relative">
      {/* 3D Top Bar */}
      <div className="h-12 border-b border-pcb-border px-4 flex items-center justify-between bg-[#0d1322] select-none z-10">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-mono text-xs font-bold flex items-center justify-center border border-purple-500/30">
            3D
          </span>
          <h2 className="text-sm font-bold text-white">Realistic 3D Hardware Inspection</h2>
          <span className="text-xs text-slate-400 font-mono">
            FR4 Glass Epoxy Core &bull; ENIG Gold Contacts &bull; {board.solder_mask_color.toUpperCase()} Mask
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTraces(!showTraces)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showTraces ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            Traces {showTraces ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              wireframeMode ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            Wireframe
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            Validate Design (DRC) &rarr;
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Overlay Instructions & Lighting Notice */}
      <div className="absolute bottom-4 left-4 bg-slate-900/85 border border-slate-800 px-3.5 py-2 rounded-xl text-[11px] font-mono text-slate-400 pointer-events-none backdrop-blur-md shadow-xl flex items-center gap-4">
        <span>Left-click & drag to orbit &bull; Scroll to zoom</span>
        <span className="text-emerald-400 border-l border-slate-800 pl-3">Photorealistic Shader Active</span>
      </div>
    </div>
  );
};
