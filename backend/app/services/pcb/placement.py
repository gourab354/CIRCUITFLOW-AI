import math
from typing import List, Dict, Tuple
from backend.app.models.circuit import CircuitModel, Component, Point2D

class PCBPlacementEngine:
    """Intelligent Component Placement Engine with Force-Directed & Topological Heuristics."""

    def auto_place(self, circuit: CircuitModel):
        bw = circuit.board.width_mm
        bh = circuit.board.height_mm
        margin = 5.0  # mm clearance from board edges

        # 1. Categorize Components
        connectors = []
        mcus = []
        power = []
        passives = []
        sensors = []
        others = []

        for comp in circuit.components:
            cat = comp.category.lower()
            name = comp.name.lower()
            ref = comp.ref.lower()
            if "connector" in cat or ref.startswith("j") or ref.startswith("tb"):
                connectors.append(comp)
            elif "micro" in cat or "mcu" in cat or "esp" in name:
                mcus.append(comp)
            elif "power" in cat or "regulator" in cat or "tp4056" in name or "ams1117" in name:
                power.append(comp)
            elif "sensor" in cat or "mpu" in name:
                sensors.append(comp)
            elif "passive" in cat or ref.startswith("r") or ref.startswith("c"):
                passives.append(comp)
            else:
                others.append(comp)

        # 2. Place Connectors along edges
        # Left edge for power inputs/terminals, Bottom/Right edge for pin headers
        left_y = margin + 10.0
        bottom_x = margin + 15.0
        for conn in connectors:
            if "term" in conn.name.lower() or "power" in conn.name.lower() or conn.ref.startswith("TB"):
                conn.x = margin + conn.width_mm / 2.0
                conn.y = min(bh - margin - conn.height_mm / 2.0, left_y)
                conn.rotation = 90.0
                left_y += conn.height_mm + 8.0
            else:
                conn.x = min(bw - margin - conn.width_mm / 2.0, bottom_x)
                conn.y = bh - margin - conn.height_mm / 2.0
                conn.rotation = 0.0
                bottom_x += conn.width_mm + 8.0

        # 3. Place MCU (ESP32)
        # Antenna should ideally hang slightly off or near the top edge
        for mcu in mcus:
            mcu.x = bw / 2.0
            mcu.y = margin + mcu.height_mm / 2.0 + 2.0
            mcu.rotation = 0.0

        # 4. Place Power Regulators & Chargers (TP4056 / AMS1117)
        # Left/Center zone near connectors
        pwr_x = margin + 12.0
        pwr_y = bh / 2.0
        for pwr in power:
            pwr.x = pwr_x
            pwr.y = pwr_y
            pwr.rotation = 0.0
            pwr_y += pwr.height_mm + 5.0
            if pwr_y > bh - margin:
                pwr_y = bh / 2.0
                pwr_x += pwr.width_mm + 5.0

        # 5. Place Sensors (MPU6050)
        # Right/Center zone with mechanical clearance
        sns_x = bw - margin - 15.0
        sns_y = bh / 2.0
        for sns in sensors:
            sns.x = sns_x
            sns.y = sns_y
            sns.rotation = 0.0
            sns_y += sns.height_mm + 8.0

        # 6. Place Passives (Resistors, Decoupling Capacitors, LEDs)
        # Associate with connected IC pins if possible
        pass_x = bw / 2.0 - 10.0
        pass_y = bh - margin - 10.0
        for pas in passives:
            # Check if connected to an IC
            connected_ref = None
            for net in circuit.nets:
                has_pas = any(n.component_ref == pas.ref for n in net.nodes)
                if has_pas:
                    for n in net.nodes:
                        if n.component_ref != pas.ref and not n.component_ref.startswith("R") and not n.component_ref.startswith("C"):
                            connected_ref = n.component_ref
                            break
                if connected_ref:
                    break

            if connected_ref:
                parent_comp = next((c for c in circuit.components if c.ref == connected_ref), None)
                if parent_comp:
                    # Place closely offset from parent
                    pas.x = max(margin, min(bw - margin, parent_comp.x + (5.0 if pas.ref.startswith("C") else -5.0)))
                    pas.y = max(margin, min(bh - margin, parent_comp.y + parent_comp.height_mm / 2.0 + 4.0))
                else:
                    pas.x = pass_x
                    pas.y = pass_y
                    pass_x += pas.width_mm + 4.0
            else:
                pas.x = pass_x
                pas.y = pass_y
                pass_x += pas.width_mm + 4.0

        # 7. Place Remaining Others
        oth_x = bw - margin - 15.0
        oth_y = margin + 12.0
        for oth in others:
            oth.x = oth_x
            oth.y = oth_y
            oth.rotation = 0.0
            oth_y += oth.height_mm + 6.0

        # 8. Collision Resolution & Strict Clamping Pass
        self._resolve_overlaps(circuit.components, bw, bh, margin)

        for c in circuit.components:
            half_w = c.width_mm / 2.0
            half_h = c.height_mm / 2.0
            min_x = max(margin, half_w + 1.0)
            max_x = min(bw - margin, bw - half_w - 1.0)
            min_y = max(margin, half_h + 1.0)
            max_y = min(bh - margin, bh - half_h - 1.0)
            if max_x > min_x:
                c.x = max(min_x, min(max_x, c.x))
            else:
                c.x = bw / 2.0
            if max_y > min_y:
                c.y = max(min_y, min(max_y, c.y))
            else:
                c.y = bh / 2.0

    def _resolve_overlaps(self, components: List[Component], bw: float, bh: float, margin: float):
        """Simple iterative repulsion pass to prevent components overlapping."""
        iterations = 20
        for _ in range(iterations):
            for i in range(len(components)):
                for j in range(i + 1, len(components)):
                    c1 = components[i]
                    c2 = components[j]
                    dx = c2.x - c1.x
                    dy = c2.y - c1.y
                    dist = math.hypot(dx, dy)
                    min_dist = (max(c1.width_mm, c1.height_mm) + max(c2.width_mm, c2.height_mm)) / 2.0 + 2.0
                    
                    if dist < min_dist and dist > 0.001:
                        overlap = min_dist - dist
                        nx = dx / dist
                        ny = dy / dist
                        c1.x -= nx * (overlap / 2.0)
                        c1.y -= ny * (overlap / 2.0)
                        c2.x += nx * (overlap / 2.0)
                        c2.y += ny * (overlap / 2.0)
                        
                        # Clamp to board bounds
                        c1.x = max(margin + c1.width_mm / 2.0, min(bw - margin - c1.width_mm / 2.0, c1.x))
                        c1.y = max(margin + c1.height_mm / 2.0, min(bh - margin - c1.height_mm / 2.0, c1.y))
                        c2.x = max(margin + c2.width_mm / 2.0, min(bw - margin - c2.width_mm / 2.0, c2.x))
                        c2.y = max(margin + c2.height_mm / 2.0, min(bh - margin - c2.height_mm / 2.0, c2.y))

pcb_placement_service = PCBPlacementEngine()
