import uuid
from typing import List, Dict, Any, Tuple
from backend.app.models.circuit import CircuitModel, Component, Net

class SchematicGenerator:
    """Generates visual layout positions and connections for the Schematic Editor."""

    def layout_schematic(self, circuit: CircuitModel) -> Dict[str, Any]:
        """Arranges components into logical schematic sections and computes wire paths."""
        sheet_width = 280.0  # mm
        sheet_height = 190.0

        # Group components by role
        mcus = []
        sensors = []
        power = []
        passives = []
        connectors = []
        others = []

        for c in circuit.components:
            cat = c.category.lower()
            if "micro" in cat or "mcu" in cat or "esp" in c.name.lower():
                mcus.append(c)
            elif "sensor" in cat or "mpu" in c.name.lower():
                sensors.append(c)
            elif "power" in cat or "regulator" in cat or "tp4056" in c.name.lower() or "battery" in cat:
                power.append(c)
            elif "passive" in cat or c.ref.startswith("R") or c.ref.startswith("C"):
                passives.append(c)
            elif "connector" in cat or c.ref.startswith("J") or c.ref.startswith("TB"):
                connectors.append(c)
            else:
                others.append(c)

        schematic_components = []
        
        # Power block on upper-left
        p_x, p_y = 40.0, 45.0
        for comp in power:
            schematic_components.append({
                "ref": comp.ref,
                "name": comp.name,
                "value": comp.value,
                "x": p_x,
                "y": p_y,
                "width": 30.0,
                "height": 25.0,
                "pins": [{"number": p.number, "name": p.name, "type": p.type, "net": p.net} for p in comp.pins]
            })
            p_y += 35.0

        # MCU block in center
        mcu_x, mcu_y = 120.0, 75.0
        for comp in mcus:
            schematic_components.append({
                "ref": comp.ref,
                "name": comp.name,
                "value": comp.value,
                "x": mcu_x,
                "y": mcu_y,
                "width": 55.0,
                "height": 70.0,
                "pins": [{"number": p.number, "name": p.name, "type": p.type, "net": p.net} for p in comp.pins]
            })
            mcu_x += 65.0

        # Sensors & peripherals on right
        s_x, s_y = 210.0, 50.0
        for comp in sensors + others:
            schematic_components.append({
                "ref": comp.ref,
                "name": comp.name,
                "value": comp.value,
                "x": s_x,
                "y": s_y,
                "width": 35.0,
                "height": 35.0,
                "pins": [{"number": p.number, "name": p.name, "type": p.type, "net": p.net} for p in comp.pins]
            })
            s_y += 45.0

        # Connectors on edges
        c_x, c_y = 20.0, 130.0
        for comp in connectors:
            schematic_components.append({
                "ref": comp.ref,
                "name": comp.name,
                "value": comp.value,
                "x": c_x,
                "y": c_y,
                "width": 20.0,
                "height": 25.0,
                "pins": [{"number": p.number, "name": p.name, "type": p.type, "net": p.net} for p in comp.pins]
            })
            c_y += 35.0

        # Passives placed near respective components or bottom row
        r_x, r_y = 70.0, 150.0
        for comp in passives:
            schematic_components.append({
                "ref": comp.ref,
                "name": comp.name,
                "value": comp.value,
                "x": r_x,
                "y": r_y,
                "width": 15.0,
                "height": 10.0,
                "pins": [{"number": p.number, "name": p.name, "type": p.type, "net": p.net} for p in comp.pins]
            })
            r_x += 25.0
            if r_x > 240.0:
                r_x = 70.0
                r_y += 20.0

        # Generate visual wires for nets
        wires = []
        sch_comp_map = {sc["ref"]: sc for sc in schematic_components}
        for net in circuit.nets:
            if len(net.nodes) >= 2:
                # Chain nodes
                for i in range(len(net.nodes) - 1):
                    node_a = net.nodes[i]
                    node_b = net.nodes[i + 1]
                    sc_a = sch_comp_map.get(node_a.component_ref)
                    sc_b = sch_comp_map.get(node_b.component_ref)
                    if sc_a and sc_b:
                        # Pin coords
                        pt_a = {"x": sc_a["x"] + sc_a["width"] / 2.0, "y": sc_a["y"]}
                        pt_b = {"x": sc_b["x"] - sc_b["width"] / 2.0, "y": sc_b["y"]}
                        wires.append({
                            "net": net.name,
                            "points": [
                                pt_a,
                                {"x": (pt_a["x"] + pt_b["x"]) / 2.0, "y": pt_a["y"]},
                                {"x": (pt_a["x"] + pt_b["x"]) / 2.0, "y": pt_b["y"]},
                                pt_b
                            ]
                        })

        return {
            "sheet": {"width": sheet_width, "height": sheet_height, "title": "CircuitFlow Schematic"},
            "components": schematic_components,
            "wires": wires,
            "net_labels": [{"name": net.name, "count": len(net.nodes)} for net in circuit.nets]
        }

    def generate_svg(self, circuit: CircuitModel) -> str:
        """Renders the schematic as a scalable standalone SVG vector graphic."""
        layout = self.layout_schematic(circuit)
        w, h = layout["sheet"]["width"] * 4, layout["sheet"]["height"] * 4
        
        svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" height="100%" style="background:#0f172a;font-family:sans-serif;">']
        
        # Grid lines
        svg.append('<defs>')
        svg.append('<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">')
        svg.append('<path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.5"/>')
        svg.append('</pattern>')
        svg.append('</defs>')
        svg.append(f'<rect width="{w}" height="{h}" fill="url(#grid)" />')

        # Title block
        svg.append(f'<rect x="20" y="20" width="{w-40}" height="{h-40}" fill="none" stroke="#334155" stroke-width="1.5" />')
        svg.append(f'<text x="{w-220}" y="{h-40}" fill="#94a3b8" font-size="14" font-weight="bold">CircuitFlow AI Schematic</text>')
        svg.append(f'<text x="{w-220}" y="{h-25}" fill="#64748b" font-size="11">Rev 1.0 | Automated Engineering Output</text>')

        # Draw Wires
        for wire in layout["wires"]:
            pts = wire["points"]
            d_parts = [f"M {pts[0]['x']*4} {pts[0]['y']*4}"]
            for pt in pts[1:]:
                d_parts.append(f"L {pt['x']*4} {pt['y']*4}")
            path_d = " ".join(d_parts)
            is_pwr = wire["net"].upper() in ("GND", "VCC", "3V3", "+3V3", "5V")
            color = "#ef4444" if wire["net"].upper() in ("VCC", "3V3", "+3V3", "5V") else ("#3b82f6" if wire["net"].upper() == "GND" else "#10b981")
            svg.append(f'<path d="{path_d}" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
            
            # Net label on wire
            mid_x = (pts[1]["x"] + pts[2]["x"]) * 2
            mid_y = (pts[1]["y"] + pts[2]["y"]) * 2
            svg.append(f'<text x="{mid_x+4}" y="{mid_y-4}" fill="{color}" font-size="9" font-family="monospace">{wire["net"]}</text>')

        # Draw Components
        for comp in layout["components"]:
            cx, cy = comp["x"] * 4, comp["y"] * 4
            cw, ch = comp["width"] * 4, comp["height"] * 4
            x1 = cx - cw / 2
            y1 = cy - ch / 2
            
            # Component box
            svg.append(f'<rect x="{x1}" y="{y1}" width="{cw}" height="{ch}" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>')
            # Designator & Name
            svg.append(f'<text x="{cx}" y="{y1-8}" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="bold">{comp["ref"]}</text>')
            svg.append(f'<text x="{cx}" y="{y1+ch+14}" text-anchor="middle" fill="#94a3b8" font-size="10">{comp["name"]}</text>')
            
            # Pins summary
            pin_count = len(comp["pins"])
            svg.append(f'<text x="{cx}" y="{cy+4}" text-anchor="middle" fill="#64748b" font-size="9">{pin_count} Pins</text>')

        svg.append('</svg>')
        return "\n".join(svg)

schematic_service = SchematicGenerator()

