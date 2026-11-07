import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, Layers, Eye, Download, Maximize2, 
  Sparkles, CheckCircle2 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const PCBViewer3D: React.FC = () => {
  const { currentProject, setActiveTab } = useAppStore();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [wireframeMode, setWireframeMode] = useState(false);

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

    // 1. Scene, Camera, Renderer
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -60, 70);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(40, -40, 80);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-50, 50, 40);
    scene.add(dirLight2);

    // Group for the entire PCB assembly
    const pcbGroup = new THREE.Group();
    scene.add(pcbGroup);

    // 3. Substrate Board (FR4 + Solder Mask)
    const bw = board.width_mm;
    const bh = board.height_mm;
    const thickness = board.thickness_mm;

    const maskColors: Record<string, number> = {
      green: 0x065f46,
      black: 0x1e293b,
      blue: 0x1e3a8a,
      red: 0x991b1b,
      white: 0xf1f5f9
    };
    const maskHex = maskColors[board.solder_mask_color] || 0x065f46;

    const boardGeo = new THREE.BoxGeometry(bw, bh, thickness);
    const boardMat = new THREE.MeshStandardMaterial({
      color: maskHex,
      roughness: 0.4,
      metalness: 0.1,
      wireframe: wireframeMode
    });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.receiveShadow = true;
    pcbGroup.add(boardMesh);

    // 4. Mounting Holes
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x0a0f1d });
    for (const hole of board.mounting_holes) {
      const holeGeo = new THREE.CylinderGeometry(hole.diameter_mm / 2, hole.diameter_mm / 2, thickness + 0.1, 16);
      const holeMesh = new THREE.Mesh(holeGeo, holeMat);
      holeMesh.rotation.x = Math.PI / 2;
      // Center coordinates
      holeMesh.position.set(hole.x - bw / 2, -(hole.y - bh / 2), 0);
      pcbGroup.add(holeMesh);
    }

    // 5. 3D Component Models
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.3 });
    const icBlackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 });
    const bluePlasticMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });

    for (const comp of circuit.components) {
      const cx = comp.x - bw / 2;
      const cy = -(comp.y - bh / 2);
      const cz = thickness / 2;

      const compGroup = new THREE.Group();
      compGroup.position.set(cx, cy, cz);
      compGroup.rotation.z = (comp.rotation * Math.PI) / 180;

      const cat = comp.category.toLowerCase();
      const name = comp.name.toLowerCase();

      if (name.includes('esp32')) {
        // ESP32 Module: PCB base + Metal Shield
        const modBaseGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 1.0);
        const modBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const modBase = new THREE.Mesh(modBaseGeo, modBaseMat);
        modBase.position.z = 0.5;
        compGroup.add(modBase);

        // Metallic RF Shield
        const shieldGeo = new THREE.BoxGeometry(comp.width_mm * 0.9, comp.height_mm * 0.65, 2.2);
        const shield = new THREE.Mesh(shieldGeo, metalMat);
        shield.position.set(0, -comp.height_mm * 0.12, 1.6);
        compGroup.add(shield);

      } else if (name.includes('mpu6050') || cat.includes('sensor')) {
        // Sensor breakout IC
        const icGeo = new THREE.BoxGeometry(comp.width_mm * 0.6, comp.height_mm * 0.6, 1.2);
        const icMesh = new THREE.Mesh(icGeo, icBlackMat);
        icMesh.position.z = 0.6;
        compGroup.add(icMesh);

      } else if (name.includes('oled') || cat.includes('display')) {
        // OLED Glass panel + Header pins
        const glassGeo = new THREE.BoxGeometry(comp.width_mm * 0.95, comp.height_mm * 0.95, 1.4);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.2 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.z = 0.7;
        compGroup.add(glass);

      } else if (comp.ref.startsWith('TB') || name.includes('terminal')) {
        // Terminal Block (Blue plastic housing + Brass screws)
        const blockGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 8.0);
        const block = new THREE.Mesh(blockGeo, bluePlasticMat);
        block.position.z = 4.0;
        compGroup.add(block);

      } else if (comp.ref.startsWith('R') || comp.ref.startsWith('C') || comp.ref.startsWith('D')) {
        // 0805 SMD Passives
        const passGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 0.8);
        const passMat = comp.ref.startsWith('R') ? icBlackMat : (comp.ref.startsWith('C') ? brassMat : goldMat);
        const pass = new THREE.Mesh(passGeo, passMat);
        pass.position.z = 0.4;
        compGroup.add(pass);

      } else {
        // Generic IC / Module package
        const genGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 1.5);
        const gen = new THREE.Mesh(genGeo, icBlackMat);
        gen.position.z = 0.75;
        compGroup.add(gen);
      }

      // Pads (Gold contacts)
      for (const pin of comp.pins) {
        const padGeo = new THREE.BoxGeometry(pin.pad_size_x, pin.pad_size_y, 0.05);
        const pad = new THREE.Mesh(padGeo, goldMat);
        pad.position.set(pin.rel_x, -pin.rel_y, 0.03);
        compGroup.add(pad);
      }

      pcbGroup.add(compGroup);
    }

    // 6. Interactive Mouse Orbit / Pan Control
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
      camera.position.z = Math.max(20, Math.min(200, camera.position.z + e.deltaY * 0.1));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Initial angle
    pcbGroup.rotation.x = -0.6;
    pcbGroup.rotation.z = 0.3;

    // Render loop
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
  }, [circuit, board, wireframeMode]);

  return (
    <div className="flex-1 bg-[#0a0f1d] flex flex-col overflow-hidden relative">
      {/* 3D Top Bar */}
      <div className="h-12 border-b border-pcb-border px-4 flex items-center justify-between bg-[#0d1322] select-none z-10">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-mono text-xs font-bold flex items-center justify-center border border-purple-500/30">
            3D
          </span>
          <h2 className="text-sm font-bold text-white">Realistic 3D PCB Preview</h2>
          <span className="text-xs text-slate-400 font-mono">
            FR4 Substrate &bull; {board.solder_mask_color.toUpperCase()} Solder Mask
          </span>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Overlay Instructions */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 pointer-events-none backdrop-blur-sm">
        Left-click & drag to orbit &bull; Scroll to zoom
      </div>
    </div>
  );
};
