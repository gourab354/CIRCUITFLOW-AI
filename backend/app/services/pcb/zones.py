import uuid
from typing import List
from backend.app.models.circuit import CircuitModel, CopperZone, Point2D

class CopperZoneEngine:
    """Generates ground copper zones and thermal relief polygons."""

    def generate_ground_plane(self, circuit: CircuitModel):
        circuit.zones.clear()
        bw = circuit.board.width_mm
        bh = circuit.board.height_mm
        margin = 1.0  # mm offset from edge cuts

        # Ground plane polygon covering board boundary
        polygon = [
            Point2D(x=margin, y=margin),
            Point2D(x=bw - margin, y=margin),
            Point2D(x=bw - margin, y=bh - margin),
            Point2D(x=margin, y=bh - margin)
        ]

        # Add Bottom Ground Zone (B.Cu)
        b_zone = CopperZone(
            id=f"zone_{uuid.uuid4().hex[:6]}",
            net="GND",
            layer="B.Cu",
            clearance_mm=circuit.rules.min_clearance_mm,
            polygon=polygon
        )
        circuit.zones.append(b_zone)

        # If 4 layers or user requested top ground pour
        if circuit.board.layers >= 4:
            f_zone = CopperZone(
                id=f"zone_{uuid.uuid4().hex[:6]}",
                net="GND",
                layer="F.Cu",
                clearance_mm=circuit.rules.min_clearance_mm,
                polygon=polygon
            )
            circuit.zones.append(f_zone)

copper_zone_service = CopperZoneEngine()

