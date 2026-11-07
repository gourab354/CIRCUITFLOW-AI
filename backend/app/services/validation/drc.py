import math
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from backend.app.models.circuit import CircuitModel, DRCViolation, Point2D
from backend.app.config import settings

class DRCEngine:
    """Rigorous Physical Design Rule Check (DRC) Engine."""

    def run(self, circuit: CircuitModel) -> List[DRCViolation]:
        violations: List[DRCViolation] = []
        rules = circuit.rules
        bw = circuit.board.width_mm
        bh = circuit.board.height_mm

        # 1. Minimum Track Width Check
        for trk in circuit.tracks:
            if trk.width_mm < rules.min_track_width_mm - 0.001:
                violations.append(DRCViolation(
                    id=f"drc_w_{trk.id}",
                    type="track_width",
                    severity="error",
                    net=trk.net,
                    location=trk.start,
                    message=f"Track width ({trk.width_mm}mm) on net '{trk.net}' is below minimum ({rules.min_track_width_mm}mm).",
                    suggested_fix=f"Increase trace width to at least {rules.min_track_width_mm}mm."
                ))

        # 2. Board Boundary / Keepout Checks
        edge_margin = rules.board_edge_clearance_mm
        for comp in circuit.components:
            # Check bounding box
            half_w = comp.width_mm / 2.0
            half_h = comp.height_mm / 2.0
            left = comp.x - half_w
            right = comp.x + half_w
            top = comp.y - half_h
            bottom = comp.y + half_h

            if left < edge_margin or right > (bw - edge_margin) or top < edge_margin or bottom > (bh - edge_margin):
                violations.append(DRCViolation(
                    id=f"drc_bounds_{comp.ref}",
                    type="out_of_bounds",
                    severity="error",
                    component_ref=comp.ref,
                    location=Point2D(x=comp.x, y=comp.y),
                    message=f"Component '{comp.name}' ({comp.ref}) extends beyond board boundary margins.",
                    suggested_fix=f"Move {comp.ref} inside the board or enlarge the board dimensions."
                ))

        # Check track points within board
        for trk in circuit.tracks:
            for pt in (trk.start, trk.end):
                if pt.x < edge_margin or pt.x > (bw - edge_margin) or pt.y < edge_margin or pt.y > (bh - edge_margin):
                    violations.append(DRCViolation(
                        id=f"drc_edge_trk_{trk.id}",
                        type="out_of_bounds",
                        severity="error",
                        net=trk.net,
                        location=pt,
                        message=f"Track on net '{trk.net}' violates board edge clearance ({edge_margin}mm).",
                        suggested_fix="Reroute the trace away from board perimeter."
                    ))

        # 3. Unconnected Net Detection (Airwires)
        for net in circuit.nets:
            if len(net.nodes) >= 2:
                # Count tracks for this net
                net_tracks = [t for t in circuit.tracks if t.net == net.name]
                if not net_tracks:
                    violations.append(DRCViolation(
                        id=f"drc_unrouted_{net.name}",
                        type="unconnected_net",
                        severity="error",
                        net=net.name,
                        message=f"Net '{net.name}' with {len(net.nodes)} pins is completely unrouted.",
                        suggested_fix="Run automatic trace routing or manually draw tracks connecting the pads."
                    ))

        # 4. Track Clearance & Short Circuit Check
        for i in range(len(circuit.tracks)):
            for j in range(i + 1, len(circuit.tracks)):
                t1 = circuit.tracks[i]
                t2 = circuit.tracks[j]
                if t1.layer == t2.layer and t1.net != t2.net:
                    dist = self._segment_distance(t1.start, t1.end, t2.start, t2.end)
                    required = (t1.width_mm + t2.width_mm) / 2.0 + rules.min_clearance_mm
                    if dist < required:
                        violations.append(DRCViolation(
                            id=f"drc_clr_{t1.id}_{t2.id}",
                            type="clearance" if dist > 0.05 else "short_circuit",
                            severity="error",
                            net=t1.net,
                            location=t1.start,
                            message=f"Clearance violation between net '{t1.net}' and '{t2.net}' ({dist:.2f}mm < {required:.2f}mm).",
                            suggested_fix="Reroute traces to maintain minimum electrical isolation."
                        ))

        # 5. Mounting Hole Clearance
        for h1_idx in range(len(circuit.board.mounting_holes)):
            for h2_idx in range(h1_idx + 1, len(circuit.board.mounting_holes)):
                h1 = circuit.board.mounting_holes[h1_idx]
                h2 = circuit.board.mounting_holes[h2_idx]
                d = math.hypot(h1.x - h2.x, h1.y - h2.y)
                if d < (h1.diameter_mm + h2.diameter_mm) / 2.0 + rules.hole_to_hole_clearance_mm:
                    violations.append(DRCViolation(
                        id=f"drc_hole_{h1_idx}_{h2_idx}",
                        type="clearance",
                        severity="error",
                        message="Mounting holes are too close together.",
                        suggested_fix="Reposition mounting holes."
                    ))

        return violations

    def _segment_distance(self, p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D) -> float:
        """Computes distance between 2 line segments in 2D space."""
        # Simple bounding box quick rejection
        min_x1, max_x1 = min(p1.x, p2.x), max(p1.x, p2.x)
        min_y1, max_y1 = min(p1.y, p2.y), max(p1.y, p2.y)
        min_x2, max_x2 = min(p3.x, p4.x), max(p3.x, p4.x)
        min_y2, max_y2 = min(p3.y, p4.y), max(p3.y, p4.y)

        if max_x1 + 1.0 < min_x2 or max_x2 + 1.0 < min_x1 or max_y1 + 1.0 < min_y2 or max_y2 + 1.0 < min_y1:
            return 999.0

        # Sample endpoints
        d1 = self._point_to_segment_dist(p1, p3, p4)
        d2 = self._point_to_segment_dist(p2, p3, p4)
        d3 = self._point_to_segment_dist(p3, p1, p2)
        d4 = self._point_to_segment_dist(p4, p1, p2)
        return min(d1, d2, d3, d4)

    def _point_to_segment_dist(self, p: Point2D, s1: Point2D, s2: Point2D) -> float:
        dx = s2.x - s1.x
        dy = s2.y - s1.y
        l2 = dx*dx + dy*dy
        if l2 == 0:
            return math.hypot(p.x - s1.x, p.y - s1.y)
        t = max(0.0, min(1.0, ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / l2))
        proj_x = s1.x + t * dx
        proj_y = s1.y + t * dy
        return math.hypot(p.x - proj_x, p.y - proj_y)

drc_engine = DRCEngine()

