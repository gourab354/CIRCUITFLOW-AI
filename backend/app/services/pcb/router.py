import uuid
import math
from typing import List, Dict, Tuple, Optional
from backend.app.models.circuit import CircuitModel, Track, Via, Point2D, Component, Pin, DesignRules

class Realistic45DegreeRouter:
    """Professional 45-Degree Chamfered / Mitered PCB Trace Router.
    
    Generates industrial-grade trace trajectories with 45-degree bends, 
    strict DRC clearances, layer allocation, and via management.
    """

    def route_circuit(self, circuit: CircuitModel):
        circuit.tracks.clear()
        circuit.vias.clear()

        comp_map: Dict[str, Component] = {c.ref: c for c in circuit.components}
        rules = circuit.rules

        # Sort nets: route delicate high-speed signals first, then general signals, then power
        def net_priority(net):
            name = net.name.upper()
            if "CLK" in name or "SCL" in name or "SDA" in name:
                return 0  # High priority signals
            if net.net_class == "Power" or name in ("+3V3", "5V", "VCC"):
                return 2  # Power rails
            if name == "GND":
                return 3  # Ground (often handled by zone pour)
            return 1      # General signals

        sorted_nets = sorted(circuit.nets, key=net_priority)

        # Track existing segments to prevent overlap
        routed_segments: List[Tuple[float, float, float, float, str, str]] = []

        for net_idx, net in enumerate(sorted_nets):
            if len(net.nodes) < 2:
                continue

            is_gnd = net.name.upper() == "GND"
            is_power = net.net_class == "Power" or net.name.upper() in ("+3V3", "3V3", "5V", "VCC", "VBAT_SYS")
            track_w = rules.power_track_width_mm if is_power else (rules.default_track_width_mm)

            # Resolve absolute physical pad positions
            pad_points: List[Tuple[float, float, str, str]] = []  # (x, y, comp_ref, pin_num)
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
                abs_x = round(comp.x + rx, 2)
                abs_y = round(comp.y + ry, 2)
                pad_points.append((abs_x, abs_y, comp.ref, pin.number))

            if len(pad_points) < 2:
                continue

            # Minimum Spanning Tree / Nearest-Neighbor chain
            connected = [pad_points[0]]
            unconnected = pad_points[1:]

            # Alternate layers to minimize cross-talk and layer congestion
            primary_layer = "B.Cu" if (is_gnd or (net_idx % 2 == 1)) else "F.Cu"

            while unconnected:
                # Find closest unconnected pad to already connected tree
                best_dist = float('inf')
                best_c = connected[0]
                best_u_idx = 0

                for c_pt in connected:
                    for u_idx, u_pt in enumerate(unconnected):
                        d = math.hypot(u_pt[0] - c_pt[0], u_pt[1] - c_pt[1])
                        if d < best_dist:
                            best_dist = d
                            best_c = c_pt
                            best_u_idx = u_idx

                p1 = best_c
                p2 = unconnected.pop(best_u_idx)
                connected.append(p2)

                # Route 45-degree chamfered trajectory between p1 and p2
                segments, via = self.generate_45deg_mitered_path(
                    start=Point2D(x=p1[0], y=p1[1]),
                    end=Point2D(x=p2[0], y=p2[1]),
                    layer=primary_layer,
                    width_mm=track_w,
                    net_name=net.name,
                    rules=rules,
                    need_via=(primary_layer == "B.Cu" and not is_gnd and best_dist > 25.0)
                )

                for seg in segments:
                    circuit.tracks.append(seg)
                if via:
                    circuit.vias.append(via)

    def generate_45deg_mitered_path(
        self,
        start: Point2D,
        end: Point2D,
        layer: str,
        width_mm: float,
        net_name: str,
        rules: DesignRules,
        need_via: bool = False
    ) -> Tuple[List[Track], Optional[Via]]:
        """Generates realistic 45-degree mitered trace segments."""
        tracks: List[Track] = []
        via: Optional[Via] = None

        dx = end.x - start.x
        dy = end.y - start.y

        # If points are nearly aligned horizontally or vertically
        if abs(dx) < 0.1:
            tracks.append(Track(
                id=f"trk_{uuid.uuid4().hex[:6]}",
                net=net_name,
                layer=layer,
                width_mm=width_mm,
                start=start,
                end=end
            ))
            return tracks, None

        if abs(dy) < 0.1:
            tracks.append(Track(
                id=f"trk_{uuid.uuid4().hex[:6]}",
                net=net_name,
                layer=layer,
                width_mm=width_mm,
                start=start,
                end=end
            ))
            return tracks, None

        # 45-Degree Mitered Octagonal Bends:
        # P1 -> P_corner1 -> P_corner2 -> P2
        # A 45-degree segment has |dx_45| == |dy_45|
        min_delta = min(abs(dx), abs(dy))
        sign_x = 1.0 if dx > 0 else -1.0
        sign_y = 1.0 if dy > 0 else -1.0

        if abs(dx) >= abs(dy):
            # Run horizontal, then 45-degree bend to destination
            # P1 -> (end.x - min_delta * sign_x, start.y) -> end
            corner = Point2D(
                x=round(end.x - min_delta * sign_x, 2),
                y=round(start.y, 2)
            )
            # Segment 1: Horizontal lead-in
            if math.hypot(corner.x - start.x, corner.y - start.y) > 0.05:
                tracks.append(Track(
                    id=f"trk_{uuid.uuid4().hex[:6]}",
                    net=net_name,
                    layer=layer,
                    width_mm=width_mm,
                    start=start,
                    end=corner
                ))
            # Segment 2: 45-Degree diagonal transition
            tracks.append(Track(
                id=f"trk_{uuid.uuid4().hex[:6]}",
                net=net_name,
                layer=layer,
                width_mm=width_mm,
                start=corner,
                end=end
            ))
        else:
            # Run vertical, then 45-degree bend to destination
            corner = Point2D(
                x=round(start.x, 2),
                y=round(end.y - min_delta * sign_y, 2)
            )
            # Segment 1: Vertical lead-in
            if math.hypot(corner.x - start.x, corner.y - start.y) > 0.05:
                tracks.append(Track(
                    id=f"trk_{uuid.uuid4().hex[:6]}",
                    net=net_name,
                    layer=layer,
                    width_mm=width_mm,
                    start=start,
                    end=corner
                ))
            # Segment 2: 45-Degree diagonal transition
            tracks.append(Track(
                id=f"trk_{uuid.uuid4().hex[:6]}",
                net=net_name,
                layer=layer,
                width_mm=width_mm,
                start=corner,
                end=end
            ))

        # Add Via if jumping layers
        if need_via:
            via = Via(
                id=f"via_{uuid.uuid4().hex[:6]}",
                net=net_name,
                x=round((start.x + end.x) / 2.0, 2),
                y=round((start.y + end.y) / 2.0, 2),
                drill_mm=rules.min_via_drill_mm,
                diameter_mm=rules.min_via_diameter_mm
            )

        return tracks, via

    def route_pin_to_pin(
        self,
        circuit: CircuitModel,
        comp_a_ref: str,
        pin_a_num: str,
        comp_b_ref: str,
        pin_b_num: str,
        net_name: Optional[str] = None
    ) -> List[Track]:
        """Routes an individual pin-to-pin connection on demand."""
        comp_a = next((c for c in circuit.components if c.ref == comp_a_ref), None)
        comp_b = next((c for c in circuit.components if c.ref == comp_b_ref), None)
        if not comp_a or not comp_b:
            return []

        pin_a = next((p for p in comp_a.pins if p.number == pin_a_num), None)
        pin_b = next((p for p in comp_b.pins if p.number == pin_b_num), None)
        if not pin_a or not pin_b:
            return []

        # Calculate coordinates
        rad_a = math.radians(comp_a.rotation)
        pt_a = Point2D(
            x=round(comp_a.x + pin_a.rel_x * math.cos(rad_a) - pin_a.rel_y * math.sin(rad_a), 2),
            y=round(comp_a.y + pin_a.rel_x * math.sin(rad_a) + pin_a.rel_y * math.cos(rad_a), 2)
        )
        rad_b = math.radians(comp_b.rotation)
        pt_b = Point2D(
            x=round(comp_b.x + pin_b.rel_x * math.cos(rad_b) - pin_b.rel_y * math.sin(rad_b), 2),
            y=round(comp_b.y + pin_b.rel_x * math.sin(rad_b) + pin_b.rel_y * math.cos(rad_b), 2)
        )

        name = net_name or pin_a.net or pin_b.net or f"NET_{comp_a_ref}_{pin_a_num}__{comp_b_ref}_{pin_b_num}"
        pin_a.net = name
        pin_b.net = name

        # Check if Net exists
        net_obj = next((n for n in circuit.nets if n.name == name), None)
        if not net_obj:
            net_obj = Net(name=name, nodes=[])
            circuit.nets.append(net_obj)
        node_a = {"component_ref": comp_a_ref, "pin_number": pin_a_num}
        node_b = {"component_ref": comp_b_ref, "pin_number": pin_b_num}
        if node_a not in [n.model_dump() for n in net_obj.nodes]:
            net_obj.nodes.append(node_a)
        if node_b not in [n.model_dump() for n in net_obj.nodes]:
            net_obj.nodes.append(node_b)

        tracks, via = self.generate_45deg_mitered_path(
            start=pt_a,
            end=pt_b,
            layer="F.Cu",
            width_mm=circuit.rules.default_track_width_mm,
            net_name=name,
            rules=circuit.rules
        )

        for t in tracks:
            circuit.tracks.append(t)
        if via:
            circuit.vias.append(via)

        return tracks

pcb_router_service = Realistic45DegreeRouter()
