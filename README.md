# CircuitFlow AI 
### AI-Powered PCB Design & Engineering Desktop Application

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![KiCad Integration](https://img.shields.io/badge/KiCad-v10.0%20Verified-brightgreen.svg)](https://www.kicad.org/)
[![Python 3.11](https://img.shields.io/badge/Python-3.11%20FastAPI-blue.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20TS-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/3D%20Engine-Three.js%20WebGL-black.svg)](https://threejs.org/)

---

## 🌟 Overview

**CircuitFlow AI** is a production-quality desktop engineering application that allows anyone—from complete beginners to senior hardware engineers—to design professional, manufacturing-ready printed circuit boards (PCBs) using natural language.

Users describe electronic circuits in plain English (e.g. *"I want an ESP32 connected to an MPU6050 accelerometer and an OLED display via I2C with battery charging"*). CircuitFlow AI parses the electrical intent, asks relevant engineering questions, validates the circuit, generates schematics, creates collision-free PCB layouts, routes multi-layer traces, runs rigorous DRC/ERC checks, previews the board in realistic 3D, and exports verified Gerber, Excellon drill, BOM, Pick-and-Place (CPL), and KiCad 10 project files.

---

## 🚀 Key Features

- **Natural Language Circuit Synthesis**: Converts conversational circuit descriptions, pin tables, and netlists into verified electrical components and connections without hallucination.
- **Interactive Questioning Agent**: Conducts a guided interview collecting PCB dimensions, shape (rounded/rectangular/circular), solder mask color, layer count, mounting holes, and track width preferences one question at a time.
- **Standard & KiCad 10 Component Catalog**: Verified standard components (ESP32-WROOM-32, MPU6050, SSD1306 OLED, TP4056, AMS1117-3.3, Passives, Connectors) with real physical dimensions, pinouts, and footprint mappings. Directly scans KiCad 10 installed libraries.
- **Schematic Vector Engine**: Interactive 2D schematic sheet with symbols, reference designators, net labels, power rails, and ground connections with instant SVG export.
- **Intelligent PCB Placement Engine**: Force-directed and topological placement heuristic that places connectors on edges, decoupling capacitors beside IC power pins, and avoids mechanical collisions.
- **Multi-Layer A\* Maze Router**: Generates orthogonal and 45-degree signal traces on Top (F.Cu) and Bottom (B.Cu) copper layers, drops vias, and pours ground plane copper zones.
- **Interactive 2D PCB Layout Editor**: HTML5 Canvas editor supporting dragging components, 90° rotation, track editing, layer switching, net highlighting, zoom, and pan.
- **Realistic 3D WebGL Viewer**: Three.js 3D renderer displaying FR4 fiberglass substrate, colored solder mask, metallic shielding, copper pads, mounting holes, and component bodies with smooth orbit controls.
- **Industrial DRC & ERC Validation**: Rigorous Design Rule Checking (track clearance, board edge keepouts, minimum widths, hole proximity) and Electrical Rule Checking (unconnected pins, floating inputs, voltage level mismatches, missing I2C pullups).
- **Manufacturing Deliverables**: RS-274X Gerbers, Excellon Drill files, JLCPCB/PCBWay automated SMT Bill of Materials (BOM CSV), Centroid Pick-and-Place (CPL CSV), and native KiCad 10 (`.kicad_pro`, `.kicad_sch`, `.kicad_pcb`) files.
- **Beginner & Advanced Modes**: Seamless toggle between guided visual workflows with plain-language explanations and advanced full-control CAD parameters.
- **Optimized for Low-End Hardware**: Runs comfortably on 4GB-8GB RAM without requiring dedicated GPUs.

---

## 🛠️ Architecture & Tech Stack

```
CIRCUITFLOW AI/
├── backend/
│   ├── app/
│   │   ├── api/             # REST & WebSocket endpoints (projects, ai, components, schematic, pcb, validation, export)
│   │   ├── db/              # SQLite persistence engine for projects and chat history
│   │   ├── models/          # Pydantic schemas (Circuit, Components, Pins, Nets, Tracks, Vias, DRC, ERC)
│   │   └── services/
│   │       ├── ai/          # Circuit parser, interactive questionnaire, LLM abstraction layer
│   │       ├── components/  # Master component catalog & KiCad 10 library scanner
│   │       ├── pcb/         # Placement heuristics, A* router, copper zones, KiCad board writer
│   │       ├── schematic/   # Schematic layout generator & KiCad .kicad_sch writer
│   │       ├── validation/  # Physical DRC & Electrical ERC engines
│   │       └── exporter/    # RS-274X Gerber, Drill, JLCPCB BOM & CPL, ZIP packager
│   └── tests/               # Automated unit & integration tests
├── frontend/
│   ├── src/
│   │   ├── components/      # Layout, Dashboard, AI Assistant, Components, Schematic, PCB, 3D, Validation, Export
│   │   ├── services/        # Typed API & WebSocket client
│   │   ├── store/           # Zustand state management
│   │   └── types/           # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── src-tauri/               # Tauri desktop configuration & manifest
├── run_backend.py           # Python backend server launcher
├── run_circuitflow.bat      # One-click desktop launcher
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
1. **Python 3.10+** (Python 3.11 recommended)
2. **Node.js 18+** & npm
3. **KiCad 10.0** (optional for native CLI commands; fallback algorithms built-in)

### 1. One-Click Launch (Windows)
Double-click `run_circuitflow.bat` or run:
```bash
./run_circuitflow.bat
```
This automatically starts the backend server and launches the application at `http://127.0.0.1:8000`.

### 2. Manual Start

**Backend:**
```bash
python run_backend.py
```

**Frontend (Dev Mode with Hot Reload):**
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing

Run all backend core and API integration tests:
```bash
python backend/tests/test_circuit_flow.py
python backend/tests/test_api_integration.py
```

---

## 📦 Manufacturing Export Formats

| File | Purpose | Target Fabricator |
|---|---|---|
| `gerbers/F_Cu.gtl` | Top Copper Layer | JLCPCB, PCBWay, Seeed, OSH Park |
| `gerbers/B_Cu.gbl` | Bottom Copper Layer | JLCPCB, PCBWay, Seeed, OSH Park |
| `gerbers/F_Mask.gts` | Top Solder Mask | JLCPCB, PCBWay, Seeed, OSH Park |
| `gerbers/B_Mask.gbs` | Bottom Solder Mask | JLCPCB, PCBWay, Seeed, OSH Park |
| `gerbers/F_SilkS.gto` | Top Silkscreen Legend | JLCPCB, PCBWay, Seeed, OSH Park |
| `gerbers/Edge_Cuts.gml` | Board Perimeter Milling Outline | All Fabricators |
| `gerbers/Drill.drl` | Excellon NC Drill File | All Fabricators |
| `assembly/*_BOM.csv` | SMT Bill of Materials with Designators | JLCPCB SMT, PCBWay SMT |
| `assembly/*_CPL_PickAndPlace.csv` | Centroid coordinates (Mid X, Mid Y, Rot) | JLCPCB SMT, PCBWay SMT |
| `kicad/*.kicad_pcb` | Native KiCad 10 Board File | KiCad 10.0+ |
| `kicad/*.kicad_sch` | Native KiCad 10 Schematic | KiCad 10.0+ |

---

## 📜 Quality Policy
*CircuitFlow AI strictly enforces engineering safety: unvalidated designs or designs with active physical DRC violations are flagged as non-manufacturing ready to prevent costly board fabrication errors.*

