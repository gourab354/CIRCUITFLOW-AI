# CircuitFlow AI — Architecture & Engineering Specification

## 1. System Overview

CircuitFlow AI is an AI-powered desktop PCB design and engineering suite designed to bridge natural language circuit intent with industrial-grade PCB manufacturing outputs.

```
+--------------------------------------------------------------------------------------------------+
|                                    CIRCUITFLOW AI DESKTOP APP                                    |
|                                                                                                  |
|  +--------------------------------------------------------------------------------------------+  |
|  |                            FRONTEND (React 18 + TS + Tailwind)                             |  |
|  |  +-------------------+  +-------------------------------------+  +----------------------+  |  |
|  |  |   Left Sidebar    |  |       Central Workspace             |  |    Right Sidebar     |  |  |
|  |  | - Dashboard       |  |  - Step Flow (1-10)                 |  | - Component Inspector|  |  |
|  |  | - AI Assistant    |  |  - Interactive Schematic (SVG/2D)   |  | - PCB Layer Stack    |  |  |
|  |  | - Components      |  |  - Interactive PCB Editor (Canvas)  |  | - AI Guidance        |  |  |
|  |  | - Schematic       |  |  - 3D Board Viewer (Three.js)       |  | - Properties         |  |  |
|  |  | - PCB Layout      |  |                                     |  +----------------------+  |  |
|  |  | - 3D Preview      |  +-------------------------------------+                            |  |
|  |  | - Validation (DRC)|  +---------------------------------------------------------------+  |  |
|  |  | - Export Center   |  |        Bottom Panel: Live Logs, Routing Stats, ERC/DRC        |  |  |
|  |  +-------------------+  +---------------------------------------------------------------+  |  |
|  +--------------------------------------------------------------------------------------------+  |
|                                   |  HTTP REST & WebSocket (Port 8000)                           |
|  +--------------------------------v-----------------------------------------------------------+  |
|  |                               BACKEND (FastAPI + Python 3.11)                              |  |
|  |  +--------------------------------------------------------------------------------------+  |  |
|  |  | AI Agent Module (LLM Abstraction: Gemini / OpenAI / Anthropic / Local Ollama / Offline) |  |  |
|  |  | - Circuit Parser (NL to Components, Pins, Nets, Bus)                                 |  |  |
|  |  | - Question Agent (PCB Shape, Dimensions, Layers, Mounting, SMD/THT, Constraints)     |  |  |
|  |  | - Electrical Validation (Voltage logic levels, I2C pullups, Power budgets)            |  |  |
|  |  +--------------------------------------------------------------------------------------+  |  |
|  |  +--------------------------------------------------------------------------------------+  |  |
|  |  | PCB Engine & Placement / Routing                                                      |  |  |
|  |  | - Topological & Force-Directed Component Placement                                    |  |  |
|  |  | - Multi-Layer Maze / A* Gridless Trace Routing                                        |  |  |
|  |  | - Copper Zone / Ground Plane Pour Engine                                              |  |  |
|  |  | - Design Rule Check (DRC) & Electrical Rule Check (ERC)                               |  |  |
|  |  +--------------------------------------------------------------------------------------+  |  |
|  |  +--------------------------------------------------------------------------------------+  |  |
|  |  | KiCad 10 Integration & Manufacturing Export                                           |  |  |
|  |  | - Native .kicad_pro, .kicad_sch, .kicad_pcb generator                                 |  |  |
|  |  | - KiCad pcbnew Python Engine & kicad-cli (10.0.3) Integration                         |  |  |
|  |  | - Export RS-274X Gerbers, Excellon Drill, JLCPCB/PCBWay CPL & BOM, STEP, GLB, SVG     |  |  |
|  |  +--------------------------------------------------------------------------------------+  |  |
|  +--------------------------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------------+
```

## 2. Core Circuit Data Model

```json
{
  "project_id": "proj_123",
  "name": "ESP32 Sensor Node",
  "board": {
    "width_mm": 60.0,
    "height_mm": 40.0,
    "shape": "rectangular",
    "layers": 2,
    "thickness_mm": 1.6,
    "solder_mask_color": "green",
    "silkscreen_color": "white",
    "mounting_holes": [
      {"x": 3.5, "y": 3.5, "diameter_mm": 3.2},
      {"x": 56.5, "y": 3.5, "diameter_mm": 3.2},
      {"x": 3.5, "y": 36.5, "diameter_mm": 3.2},
      {"x": 56.5, "y": 36.5, "diameter_mm": 3.2}
    ]
  },
  "components": [
    {
      "ref": "U1",
      "name": "ESP32-WROOM-32",
      "package": "Module",
      "footprint": "RF_Module:ESP32-WROOM-32",
      "x": 30.0,
      "y": 20.0,
      "rotation": 0.0,
      "layer": "F.Cu",
      "pins": [
        {"number": "1", "name": "GND", "type": "power_in", "net": "GND", "rel_x": -9.0, "rel_y": -12.0},
        {"number": "2", "name": "3V3", "type": "power_in", "net": "+3V3", "rel_x": -9.0, "rel_y": -10.73}
      ]
    }
  ],
  "nets": [
    {
      "name": "+3V3",
      "class": "Power",
      "min_width_mm": 0.5,
      "nodes": [
        {"component_ref": "U1", "pin_number": "2"},
        {"component_ref": "U2", "pin_number": "1"}
      ]
    }
  ],
  "tracks": [
    {
      "id": "trk_1",
      "net": "+3V3",
      "layer": "F.Cu",
      "width_mm": 0.5,
      "start": {"x": 21.0, "y": 9.27},
      "end": {"x": 15.0, "y": 9.27}
    }
  ],
  "vias": [
    {
      "id": "via_1",
      "net": "GND",
      "x": 25.0,
      "y": 15.0,
      "drill_mm": 0.3,
      "diameter_mm": 0.6
    }
  ]
}
```

## 3. KiCad 10 Native Integration

KiCad 10 is locally installed at `C:\Program Files\KiCad\10.0\bin\kicad-cli.exe` with its dedicated Python 3.11 environment (`pcbnew` module).
CircuitFlow AI utilizes:
1. Native KiCad S-Expression generation (`.kicad_sch` format v20240108 and `.kicad_pcb` format v20240108).
2. KiCad CLI for running official DRC checks (`kicad-cli pcb drc`).
3. KiCad CLI for manufacturing exports (`kicad-cli pcb export gerbers`, `kicad-cli pcb export drill`, `kicad-cli pcb export glb`, `kicad-cli pcb export step`).
4. In-memory deterministic routing and layout algorithms with full fallback when external CLI is busy or sandboxed.
