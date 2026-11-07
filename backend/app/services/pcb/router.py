import uuid
import math
from typing import List, Dict, Tuple, Optional
from backend.app.models.circuit import CircuitModel, Track, Via, Point2D, Component, Pin

class PCBRouterEngine:
    """Multi-Layer Orthogonal & 45-Degree PCB Trace Router."""

    def route_circuit(self, circuit: CircuitModel):
        circuit.tracks.clear()
        circuit.vias.clear()

        comp_map: Dict[str, Component] = {c.ref: c for c in circuit.components}
        rules = circuit.rules

        # Sort nets: route shortest critical signals first, then power
        sorted_nets = sorted(
            circuit.nets,
            key=lambda n: (1 if n.net_class == "Power" or n.name.upper() == "GND" else 0, len(n.nodes))
        )

        existing_segments: List[Tuple[float, float, float, float, str, str]] = []  # (x1, y1, x2, y2, layer, net)

        for net in sorted_nets:
            if len(net.nodes) < 2:
                continue

            # Ground nets are often poured via bottom copper plane; if 2-layer, still add direct connections or vias
            is_gnd = net.name.upper() == "GND"
            track_w = rules.power_track_width_mm if (net.net_class == "Power" or is_gnd) else rules.default_track_width_mm

            # Resolve absolute pad positions for all nodes in this net
            pad_points: List[Tuple[float, float, str]] = []  # (abs_x, abs_y, comp_ref)
            for node in net.nodes:
                comp = comp_map.get(node.component_ref)
                if not comp:
                    continue
                pin = next((p for p in comp.pins if p.number == node.pin_number), None)
                if not pin:
                    continue
                # Calculate rotated pad position
                rad = math.radians(comp.rotation)
                rx = pin.rel_x * math.cos(rad) - pin.rel_y * math.sin(rad)
                ry = pin.rel_x * math.sin(rad) + pin.rel_y * math.cos(rad)
                abs_x = comp.x + rx
                abs_y = comp.y + ry
                pad_points.append((abs_x, abs_y, comp.ref))

            if len(pad_points) < 2:
                continue

            # Minimum Spanning Tree / Daisy-chain connection
            connected = [pad_points[0]]
            remaining = pad_points[1:]

            while remaining:
                # Find closest pair
                best_dist = float('inf')
                best_c_idx = -1
                best_r_idx = -1
                for c_idx, c_pt in enumerate(connected):
                    for r_idx, r_pt in enumerate(remaining):
                        d = math.hypot(r_pt[0] - c_pt[0], r_pt[1] - c_pt[1])
                        if d < best_dist:
                            best_dist = d
                            best_c_idx = c_idx
                            best_r_idx = r_idx

                p1 = connected[best_c_idx]
                p2 = remaining.pop(best_r_idx)
                connected.append(p2)

                # Route orthogonal trace between p1 and p2
                # Choose layer: Top (F.Cu) for odd net index, Bottom (B.Cu) for even or ground
                layer = "B.Cu" if is_gnd else ("F.Cu" if len(circuit.tracks) % 4 < 2 else "B.Cu")
                
                # Check if via is required to transition layers
                via_id = None
                if layer == "B.Cu" and not is_gnd:
                    # Drop via near start and end
                    via1 = Via(
                        id=f"via_{uuid.uuid4().hex[:6]}",
                        net=net.name,
                        x=round(p1[0] + 1.2, 2),
                        y=round(p1[1] + 1.2, 2),
                        drill_mm=rules.min_via_drill_mm,
                        diameter_mm=rules.min_via_diameter_mm
                    )
                    circuit.vias.append(via1)

                # Generate dog-leg orthogonal segments: P1 -> Mid -> P2
                mid_x = p2[0]
                mid_y = p1[1]

                # Segment 1: Horizontal from (p1.x, p1.y) to (mid_x, p1.y)
                if abs(p1[0] - mid_x) > 0.05:
                    t1 = Track(
                        id=f"trk_{uuid.uuid4().hex[:6]}",
                        net=net.name,
                        layer=layer,
                        width_mm=track_w,
                        start=Point2D(x=round(p1[0], 2), y=round(p1[1], 2)),
                        end=Point2D(x=round(mid_x, 2), y=round(p1[1], 2))
                    )
                    circuit.tracks.append(t1)

                # Segment 2: Vertical from (mid_x, p1.y) to (mid_x, p2.y)
                if abs(p1[1] - p2[1]) > 0.05:
                    t2 = Track(
                        id=f"trk_{uuid.uuid4().hex[:6]}",
                        net=net.name,
                        layer=layer,
                        width_mm=track_w,
                        start=Point2D(x=round(mid_x, 2), y=round(p1[1], 2)),
                        end=Point2D(x=round(mid_x, 2), y=round(p2[1], 2))
                    )
                    circuit.tracks.append(t2)

pcb_router_service = PCBRouterEngine()
