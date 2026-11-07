import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, Layers, Eye, Download, Maximize2, 
  Sparkles, CheckCircle2, Sliders, Play, Pause, Camera, 
  Sun, Compass, ShieldCheck 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const PCBViewer3D: React.FC = () => {
  const { currentProject, setActiveTab, addLog } = useAppStore();
  const mountRef = useRef<HTMLDivElement | null>(null);

  // 3D Visual Controls
  const [autoRotate, setAutoRotate] = useState(true);
  const [explodeFactor, setExplodeFactor] = useState(0); // 0 to 1
  const [solderMaskOpacity, setSolderMaskOpacity] = useState(1.0); // 0.2 to 1.0
  const [boardColor, setBoardColor] = useState<'green' | 'black' | 'blue' | 'red' | 'white' | 'purple'>('green');
  const [wireframeMode, setWireframeMode] = useState(false);
  const [showTraces, setShowTraces] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'bottom' | 'front'>('iso');

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

  // Sync board color state with current project board color
  useEffect(() => {
    if (board.solder_mask_color) {
      setBoardColor(board.solder_mask_color as any);
    }
  }, [board.solder_mask_color]);

  // Keep references for animation & snapshot
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pcbGroupRef = useRef<THREE.Group | null>(null);
  const componentsGroupRef = useRef<THREE.Group | null>(null);
  const topCopperGroupRef = useRef<THREE.Group | null>(null);
  const bottomCopperGroupRef = useRef<THREE.Group | null>(null);
  const substrateMeshRef = useRef<THREE.Mesh | null>(null);

  // Update Exploded View in real time
  useEffect(() => {
    if (componentsGroupRef.current) {
      componentsGroupRef.current.position.z = explodeFactor * 25.0;
    }
    if (topCopperGroupRef.current) {
      topCopperGroupRef.current.position.z = explodeFactor * 10.0;
    }
    if (bottomCopperGroupRef.current) {
      bottomCopperGroupRef.current.position.z = -explodeFactor * 15.0;
    }
  }, [explodeFactor]);

  // Update Solder Mask Opacity in real time
  useEffect(() => {
    if (substrateMeshRef.current) {
      const mat = substrateMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.transparent = solderMaskOpacity < 0.99;
      mat.opacity = solderMaskOpacity;
      mat.needsUpdate = true;
    }
  }, [solderMaskOpacity]);

  // Handle Camera Presets
  const setCameraView = (preset: 'iso' | 'top' | 'bottom' | 'front') => {
    setCameraPreset(preset);
    const camera = cameraRef.current;
    const pcbGroup = pcbGroupRef.current;
    if (!camera || !pcbGroup) return;

    if (preset === 'iso') {
      camera.position.set(0, -75, 80);
      pcbGroup.rotation.set(-0.7, 0, 0.35);
    } else if (preset === 'top') {
      camera.position.set(0, 0, 110);
      pcbGroup.rotation.set(0, 0, 0);
    } else if (preset === 'bottom') {
      camera.position.set(0, 0, -110);
      pcbGroup.rotation.set(Math.PI, 0, 0);
    } else if (preset === 'front') {
      camera.position.set(0, -100, 10);
      pcbGroup.rotation.set(0, 0, 0);
    }
    camera.lookAt(0, 0, 0);
  };

  // Capture High-Res Snapshot
  const captureSnapshot = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${currentProject?.name || 'CircuitFlow'}_3D_Render.png`;
    a.click();
    addLog('Exported 3D photorealistic snapshot render.', 'success');
  };

  // Helper to create realistic OLED screen texture
  const createOLEDTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // OLED off-black background
      ctx.fillStyle = '#050a14';
      ctx.fillRect(0, 0, 256, 128);

      // Fine pixel matrix
      ctx.fillStyle = '#0369a1';
      for (let px = 8; px < 248; px += 4) {
        for (let py = 8; py < 120; py += 4) {
          ctx.fillRect(px, py, 2, 2);
        }
      }

      // Glowing OLED UI display content
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('CIRCUITFLOW AI', 20, 45);
      ctx.font = '12px monospace';
      ctx.fillStyle = '#facc15';
      ctx.fillText('STATUS: ONLINE', 20, 75);
      ctx.fillStyle = '#4ade80';
      ctx.fillText('I2C: 0x3C OK', 20, 100);

      // Outer bezel border
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, 244, 116);
    }
    return new THREE.CanvasTexture(canvas);
  };

  // Main Three.js Scene Initialization
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !circuit) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(0, -75, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance' 
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    // 2. Realistic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Key Light with soft shadow
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(60, -60, 100);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 300;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cool rim light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.position.set(-70, 70, 60);
    scene.add(rimLight);

    // Warm specular kicker
    const kickerLight = new THREE.DirectionalLight(0xfef08a, 0.4);
    kickerLight.position.set(0, 90, -40);
    scene.add(kickerLight);

    // Studio ground floor with soft contact shadow receiver
    const floorGeo = new THREE.PlaneGeometry(600, 600);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.z = -15;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Assembly Groups
    const pcbGroup = new THREE.Group();
    pcbGroupRef.current = pcbGroup;
    scene.add(pcbGroup);

    const componentsGroup = new THREE.Group();
    componentsGroupRef.current = componentsGroup;
    pcbGroup.add(componentsGroup);

    const topCopperGroup = new THREE.Group();
    topCopperGroupRef.current = topCopperGroup;
    pcbGroup.add(topCopperGroup);

    const bottomCopperGroup = new THREE.Group();
    bottomCopperGroupRef.current = bottomCopperGroup;
    pcbGroup.add(bottomCopperGroup);

    const bw = board.width_mm;
    const bh = board.height_mm;
    const thickness = board.thickness_mm;

    // 3. Solder Mask Colors (Realistic matte & gloss finishes)
    const maskColorsMap: Record<string, { color: number; roughness: number; metalness: number }> = {
      green: { color: 0x054832, roughness: 0.35, metalness: 0.12 },
      black: { color: 0x111827, roughness: 0.38, metalness: 0.15 },
      blue: { color: 0x1e3a8a, roughness: 0.35, metalness: 0.12 },
      red: { color: 0x991b1b, roughness: 0.35, metalness: 0.12 },
      white: { color: 0xf1f5f9, roughness: 0.25, metalness: 0.05 },
      purple: { color: 0x581c87, roughness: 0.35, metalness: 0.12 }
    };
    const activeColorConfig = maskColorsMap[boardColor] || maskColorsMap.green;

    // Substrate Board Box
    const boardGeo = new THREE.BoxGeometry(bw, bh, thickness);
    const boardMat = new THREE.MeshStandardMaterial({
      color: activeColorConfig.color,
      roughness: activeColorConfig.roughness,
      metalness: activeColorConfig.metalness,
      wireframe: wireframeMode,
      transparent: solderMaskOpacity < 0.99,
      opacity: solderMaskOpacity
    });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.receiveShadow = true;
    boardMesh.castShadow = true;
    substrateMeshRef.current = boardMesh;
    pcbGroup.add(boardMesh);

    // Exposed FR4 fiberglass core along the board edges
    const edgeGeo = new THREE.BoxGeometry(bw + 0.12, bh + 0.12, thickness * 0.75);
    const edgeMat = new THREE.MeshStandardMaterial({ 
      color: 0x854d0e, 
      roughness: 0.65, 
      metalness: 0.25 
    });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    pcbGroup.add(edgeMesh);

    // 4. Mounting Holes (Drill Cutouts with Gold Annular Rings)
    const goldMat = new THREE.MeshStandardMaterial({ 
      color: 0xfacc15, 
      metalness: 0.9, 
      roughness: 0.18 
    });
    const solderSilverMat = new THREE.MeshStandardMaterial({ 
      color: 0xe2e8f0, 
      metalness: 0.92, 
      roughness: 0.22 
    });
    const drillHoleMat = new THREE.MeshBasicMaterial({ color: 0x060913 });

    for (const hole of board.mounting_holes) {
      const hx = hole.x - bw / 2;
      const hy = -(hole.y - bh / 2);

      // Gold copper pad ring on top & bottom
      const ringGeo = new THREE.CylinderGeometry(hole.pad_diameter_mm / 2, hole.pad_diameter_mm / 2, thickness + 0.06, 24);
      const ringMesh = new THREE.Mesh(ringGeo, goldMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(hx, hy, 0);
      pcbGroup.add(ringMesh);

      // Dark hole drill
      const holeGeo = new THREE.CylinderGeometry(hole.diameter_mm / 2, hole.diameter_mm / 2, thickness + 0.15, 24);
      const holeMesh = new THREE.Mesh(holeGeo, drillHoleMat);
      holeMesh.rotation.x = Math.PI / 2;
      holeMesh.position.set(hx, hy, 0);
      pcbGroup.add(holeMesh);
    }

    // 5. 3D Copper Traces (Raised 3D geometries with 45-degree chamfers)
    if (showTraces) {
      const traceMatTop = new THREE.MeshStandardMaterial({ 
        color: 0xdc2626, 
        metalness: 0.6, 
        roughness: 0.32 
      });
      const traceMatBottom = new THREE.MeshStandardMaterial({ 
        color: 0x2563eb, 
        metalness: 0.6, 
        roughness: 0.32 
      });

      for (const trk of circuit.tracks) {
        const x1 = trk.start.x - bw / 2;
        const y1 = -(trk.start.y - bh / 2);
        const x2 = trk.end.x - bw / 2;
        const y2 = -(trk.end.y - bh / 2);

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.1) continue;

        const trkGeo = new THREE.BoxGeometry(len, trk.width_mm, 0.05);
        const isTop = trk.layer === 'F.Cu';
        const trkMesh = new THREE.Mesh(trkGeo, isTop ? traceMatTop : traceMatBottom);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const angle = Math.atan2(dy, dx);

        trkMesh.position.set(midX, midY, isTop ? (thickness / 2 + 0.025) : -(thickness / 2 + 0.025));
        trkMesh.rotation.z = angle;

        if (isTop) {
          topCopperGroup.add(trkMesh);
        } else {
          bottomCopperGroup.add(trkMesh);
        }
      }
    }

    // 6. Photorealistic 3D Component Models
    const icMoldedBodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x18181b, 
      roughness: 0.58, 
      metalness: 0.1 
    });
    const tinShieldMat = new THREE.MeshStandardMaterial({ 
      color: 0xd4d4d8, 
      metalness: 0.98, 
      roughness: 0.22 
    });
    const ceramicPassiveMat = new THREE.MeshStandardMaterial({ 
      color: 0x78716c, 
      roughness: 0.65 
    });
    const terminalPlasticMat = new THREE.MeshStandardMaterial({ 
      color: 0x1d4ed8, 
      roughness: 0.35 
    });
    const glassScreenMat = new THREE.MeshStandardMaterial({ 
      map: createOLEDTexture(),
      roughness: 0.15, 
      metalness: 0.1 
    });

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
        // ESP32-WROOM-32 Module
        // Matte black PCB sub-carrier
        const modBaseGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 0.9);
        const modBaseMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 });
        const modBase = new THREE.Mesh(modBaseGeo, modBaseMat);
        modBase.position.z = 0.45;
        modBase.castShadow = true;
        compGroup.add(modBase);

        // Tin RF Shield Can with beveled chamfer
        const shieldGeo = new THREE.BoxGeometry(comp.width_mm * 0.92, comp.height_mm * 0.65, 2.5);
        const shield = new THREE.Mesh(shieldGeo, tinShieldMat);
        shield.position.set(0, -comp.height_mm * 0.12, 1.7);
        shield.castShadow = true;
        compGroup.add(shield);

        // Serpentine Gold Meandered PCB Antenna at top edge
        const antGeo = new THREE.BoxGeometry(comp.width_mm * 0.8, comp.height_mm * 0.16, 0.06);
        const antMesh = new THREE.Mesh(antGeo, goldMat);
        antMesh.position.set(0, comp.height_mm * 0.36, 0.93);
        compGroup.add(antMesh);

        // Side castellated solder pads along left and right
        for (let i = 0; i < 18; i++) {
          const yOff = -comp.height_mm / 2 + 3.0 + i * 1.1;
          for (const xSide of [-comp.width_mm / 2, comp.width_mm / 2]) {
            const castGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12);
            const castMesh = new THREE.Mesh(castGeo, solderSilverMat);
            castMesh.position.set(xSide, yOff, 0.45);
            compGroup.add(castMesh);
          }
        }

      } else if (name.includes('mpu6050') || name.includes('sensor')) {
        // QFN Sensor Package
        const icGeo = new THREE.BoxGeometry(comp.width_mm * 0.7, comp.height_mm * 0.7, 1.2);
        const icMesh = new THREE.Mesh(icGeo, icMoldedBodyMat);
        icMesh.position.z = 0.6;
        icMesh.castShadow = true;
        compGroup.add(icMesh);

        // Pin 1 dot
        const dotGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12);
        const dotMesh = new THREE.Mesh(dotGeo, solderSilverMat);
        dotMesh.rotation.x = Math.PI / 2;
        dotMesh.position.set(-comp.width_mm * 0.25, comp.height_mm * 0.25, 1.22);
        compGroup.add(dotMesh);

        // Gull-wing metal pins
        for (const pin of comp.pins) {
          const legGeo = new THREE.BoxGeometry(0.3, 0.6, 0.4);
          const legMesh = new THREE.Mesh(legGeo, solderSilverMat);
          legMesh.position.set(pin.rel_x, -pin.rel_y, 0.2);
          compGroup.add(legMesh);
        }

      } else if (name.includes('oled') || name.includes('ssd1306') || name.includes('display')) {
        // SSD1306 OLED Screen with Glowing Display Texture
        const glassGeo = new THREE.BoxGeometry(comp.width_mm * 0.95, comp.height_mm * 0.95, 1.4);
        const glassMesh = new THREE.Mesh(glassGeo, glassScreenMat);
        glassMesh.position.z = 0.7;
        glassMesh.castShadow = true;
        compGroup.add(glassMesh);

        // Black bezel frame
        const bezelGeo = new THREE.BoxGeometry(comp.width_mm * 0.98, comp.height_mm * 0.98, 0.8);
        const bezelMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.5 });
        const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
        bezelMesh.position.z = 0.4;
        compGroup.add(bezelMesh);

      } else if (name.includes('tp4056') || name.includes('charger')) {
        // TP4056 Li-Ion Charger Board + Metal USB-C / Micro-USB Port
        const tpBaseGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 1.0);
        const tpBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
        const tpBase = new THREE.Mesh(tpBaseGeo, tpBaseMat);
        tpBase.position.z = 0.5;
        tpBase.castShadow = true;
        compGroup.add(tpBase);

        // Metallic USB Jack with hollow opening
        const usbGeo = new THREE.BoxGeometry(7.5, 6.0, 3.2);
        const usbMesh = new THREE.Mesh(usbGeo, tinShieldMat);
        usbMesh.position.set(0, -comp.height_mm / 2 + 3, 2.1);
        usbMesh.castShadow = true;
        compGroup.add(usbMesh);

        // Status LEDs (Red charging, Blue ready)
        const ledRedGeo = new THREE.BoxGeometry(1.2, 0.8, 0.6);
        const ledRedMat = new THREE.MeshStandardMaterial({ 
          color: 0xef4444, 
          emissive: 0xdc2626, 
          emissiveIntensity: 0.8 
        });
        const ledRed = new THREE.Mesh(ledRedGeo, ledRedMat);
        ledRed.position.set(-2, 2, 1.1);
        compGroup.add(ledRed);

        const ledBlueGeo = new THREE.BoxGeometry(1.2, 0.8, 0.6);
        const ledBlueMat = new THREE.MeshStandardMaterial({ 
          color: 0x3b82f6, 
          emissive: 0x2563eb, 
          emissiveIntensity: 0.8 
        });
        const ledBlue = new THREE.Mesh(ledBlueGeo, ledBlueMat);
        ledBlue.position.set(2, 2, 1.1);
        compGroup.add(ledBlue);

      } else if (ref.startsWith('TB') || name.includes('terminal')) {
        // Screw Terminal Block (Blue plastic + Slotted brass clamping screws)
        const tbGeo = new THREE.BoxGeometry(comp.width_mm, comp.height_mm, 9.5);
        const tbMesh = new THREE.Mesh(tbGeo, terminalPlasticMat);
        tbMesh.position.z = 4.75;
        tbMesh.castShadow = true;
        compGroup.add(tbMesh);

        // Metallic screws on top
        for (const sx of [-2.54, 2.54]) {
          const screwGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.6, 16);
          const screw = new THREE.Mesh(screwGeo, solderSilverMat);
          screw.rotation.x = Math.PI / 2;
          screw.position.set(sx, 0, 9.6);
          compGroup.add(screw);
        }

      } else if (ref.startsWith('R') || ref.startsWith('C') || ref.startsWith('D')) {
        // 0805 SMD Passives: Ceramic body + Silver solder end caps + solder fillets
        const isCap = ref.startsWith('C');
        const isLed = ref.startsWith('D');
        const passGeo = new THREE.BoxGeometry(comp.width_mm * 0.55, comp.height_mm * 0.85, 0.75);
        const passMat = isCap 
          ? ceramicPassiveMat 
          : isLed 
          ? new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.9 })
          : icMoldedBodyMat;

        const passMesh = new THREE.Mesh(passGeo, passMat);
        passMesh.position.z = 0.38;
        passMesh.castShadow = true;
        compGroup.add(passMesh);

        // Silver solder end terminals
        for (const capX of [-comp.width_mm * 0.4, comp.width_mm * 0.4]) {
          const capGeo = new THREE.BoxGeometry(comp.width_mm * 0.28, comp.height_mm * 0.88, 0.78);
          const capMesh = new THREE.Mesh(capGeo, solderSilverMat);
          capMesh.position.set(capX, 0, 0.39);
          compGroup.add(capMesh);
        }

      } else if (name.includes('switch') || name.includes('button')) {
        // Tactile Pushbutton (Silver metal casing + round black actuator)
        const btnBaseGeo = new THREE.BoxGeometry(6.0, 6.0, 2.5);
        const btnBaseMesh = new THREE.Mesh(btnBaseGeo, solderSilverMat);
        btnBaseMesh.position.z = 1.25;
        compGroup.add(btnBaseMesh);

        const actuatorGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.5, 20);
        const actuatorMesh = new THREE.Mesh(actuatorGeo, icMoldedBodyMat);
        actuatorMesh.rotation.x = Math.PI / 2;
        actuatorMesh.position.set(0, 0, 2.7);
        compGroup.add(actuatorMesh);

      } else {
        // General IC Package with lead pins
        const icGeo = new THREE.BoxGeometry(comp.width_mm * 0.85, comp.height_mm * 0.85, 1.6);
        const icMesh = new THREE.Mesh(icGeo, icMoldedBodyMat);
        icMesh.position.z = 0.8;
        icMesh.castShadow = true;
        compGroup.add(icMesh);
      }

      // Solder Pads (ENIG Immersion Gold Contacts)
      for (const pin of comp.pins) {
        const padGeo = new THREE.BoxGeometry(pin.pad_size_x, pin.pad_size_y, 0.05);
        const pad = new THREE.Mesh(padGeo, goldMat);
        pad.position.set(pin.rel_x, -pin.rel_y, 0.025);
        compGroup.add(pad);
      }

      componentsGroup.add(compGroup);
    }

    // 7. Interactive Orbit & Pan Handlers
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

      pcbGroup.rotation.z += deltaX * 0.008;
      pcbGroup.rotation.x += deltaY * 0.008;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(25, Math.min(240, camera.position.z + e.deltaY * 0.1));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Initial camera angle
    pcbGroup.rotation.x = -0.7;
    pcbGroup.rotation.z = 0.35;

    // 8. Animation Loop with Turntable Rotation
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth auto-rotation if turntable is active and user isn't dragging
      if (autoRotate && !isDragging) {
        pcbGroup.rotation.z += 0.004;
      }

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
  }, [circuit, board, boardColor, wireframeMode, showTraces, autoRotate]);

  return (
    <div className="flex-1 bg-[#060913] flex flex-col overflow-hidden relative">
      {/* 3D Top Header Bar */}
      <div className="h-12 border-b border-pcb-border px-4 flex items-center justify-between bg-[#0d1322] select-none z-10">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-mono text-xs font-bold flex items-center justify-center border border-purple-500/30">
            3D
          </span>
          <h2 className="text-sm font-bold text-white">Photorealistic 3D PCB Showcase</h2>
          <span className="text-xs text-slate-400 font-mono">
            FR4 Glass Core &bull; ENIG Gold &bull; {boardColor.toUpperCase()}
          </span>
        </div>

        {/* View Controls & Snapshot */}
        <div className="flex items-center gap-2">
          {/* Turntable Auto-Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              autoRotate ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            Turntable
          </button>

          {/* Camera View Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setCameraView('iso')}
              className={`px-2 py-1 rounded ${cameraPreset === 'iso' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'}`}
            >
              ISO
            </button>
            <button
              onClick={() => setCameraView('top')}
              className={`px-2 py-1 rounded ${cameraPreset === 'top' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'}`}
            >
              TOP
            </button>
            <button
              onClick={() => setCameraView('bottom')}
              className={`px-2 py-1 rounded ${cameraPreset === 'bottom' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'}`}
            >
              BOT
            </button>
            <button
              onClick={() => setCameraView('front')}
              className={`px-2 py-1 rounded ${cameraPreset === 'front' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400'}`}
            >
              EDGE
            </button>
          </div>

          {/* Snapshot Button */}
          <button
            onClick={captureSnapshot}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 shadow-sm"
            title="Download high-resolution 3D render image"
          >
            <Camera className="w-3.5 h-3.5" />
            Snapshot
          </button>

          <button
            onClick={() => setActiveTab('validation')}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            Validate Design &rarr;
          </button>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Bottom Floating CAD Control HUD: Exploded View & Solder Mask Opacity Sliders */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        {/* Left Slider Cluster */}
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md pointer-events-auto flex items-center gap-6 text-xs text-slate-300">
          {/* Explode View Slider */}
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold text-purple-400 font-mono">EXPLODE LAYERS:</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={explodeFactor}
              onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
              className="w-28 accent-purple-500 cursor-pointer"
            />
            <span className="font-mono text-[10px] text-slate-400 w-8">{Math.round(explodeFactor * 100)}%</span>
          </div>

          {/* Solder Mask X-Ray Opacity Slider */}
          <div className="flex items-center gap-2.5 border-l border-slate-800 pl-4">
            <span className="text-[11px] font-semibold text-cyan-400 font-mono">MASK X-RAY:</span>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={solderMaskOpacity}
              onChange={(e) => setSolderMaskOpacity(parseFloat(e.target.value))}
              className="w-24 accent-cyan-500 cursor-pointer"
            />
            <span className="font-mono text-[10px] text-slate-400 w-8">{Math.round(solderMaskOpacity * 100)}%</span>
          </div>

          {/* Color Switcher */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
            <span className="text-[11px] text-slate-400 font-mono">COLOR:</span>
            {(['green', 'black', 'blue', 'red', 'white', 'purple'] as const).map((col) => (
              <button
                key={col}
                onClick={() => setBoardColor(col)}
                title={col.toUpperCase()}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  boardColor === col ? 'border-white scale-125 ring-2 ring-cyan-500' : 'border-slate-700 opacity-60'
                }`}
                style={{
                  backgroundColor: 
                    col === 'green' ? '#054832' : 
                    col === 'black' ? '#111827' : 
                    col === 'blue' ? '#1e3a8a' : 
                    col === 'red' ? '#991b1b' : 
                    col === 'white' ? '#f8fafc' : '#581c87'
                }}
              />
            ))}
          </div>
        </div>

        {/* Right Instructions Pill */}
        <div className="bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-xl text-[11px] font-mono text-slate-400 backdrop-blur-md shadow-xl flex items-center gap-3">
          <span>Left-click drag to orbit &bull; Scroll to zoom</span>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-semibold">Studio Raytracer</span>
        </div>
      </div>
    </div>
  );
};
