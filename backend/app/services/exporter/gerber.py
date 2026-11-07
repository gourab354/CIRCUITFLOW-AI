import datetime
from typing import Dict, List
from backend.app.models.circuit import CircuitModel

class GerberGenerator:
    """RS-274X Gerber & Excellon Drill Exporter."""

    def generate_all(self, circuit: CircuitModel) -> Dict[str, str]:
        """Generates dictionary of file_name -> content for all fabrication layers."""
        files = {}
        files["F_Cu.gtl"] = self._generate_copper(circuit, layer="F.Cu")
        files["B_Cu.gbl"] = self._generate_copper(circuit, layer="B.Cu")
        files["F_Mask.gts"] = self._generate_mask(circuit, layer="F.Cu")
        files["B_Mask.gbs"] = self._generate_mask(circuit, layer="B.Cu")
        files["F_SilkS.gto"] = self._generate_silkscreen(circuit, layer="F.Cu")
        files["B_SilkS.gbo"] = self._generate_silkscreen(circuit, layer="B.Cu")
        files["Edge_Cuts.gml"] = self._generate_outline(circuit)
        files["Drill.drl"] = self._generate_drill(circuit)
        return files

    def _header(self, layer_name: str) -> List[str]:
        now = datetime.datetime.utcnow().isoformat()
        return [
            f"G04 CircuitFlow AI Gerber RS-274X*",
            f"G04 Layer: {layer_name}*",
            f"G04 Created: {now}*",
            "%FSLAX46Y46*%",
            "%MOMM*%",
            "%LPD*%",
            "G01*",
            "G75*"
        ]

    def _generate_copper(self, circuit: CircuitModel, layer: str) -> str:
        lines = self._header(f"{layer} Copper")
        lines.append("%ADD10C,0.250*%")  # Aperture 10: 0.25mm trace
        lines.append("%ADD11C,0.500*%")  # Aperture 11: 0.50mm trace
        lines.append("%ADD12R,1.600X1.600*%")  # Aperture 12: SMD Rect Pad
        lines.append("%ADD13C,1.800*%")  # Aperture 13: THT Circle Pad

        # Pads
        for comp in circuit.components:
            for pin in comp.pins:
                if pin.hole_diameter > 0 or comp.layer == layer:
                    px = int((comp.x + pin.rel_x) * 1000000)
                    py = int((comp.y + pin.rel_y) * 1000000)
                    ap = "D13" if pin.hole_diameter > 0 else "D12"
                    lines.append(f"{ap}*")
                    lines.append(f"X{px:010d}Y{py:010d}D03*")

        # Tracks
        for trk in circuit.tracks:
            if trk.layer == layer:
                ap = "D11" if trk.width_mm >= 0.4 else "D10"
                x1 = int(trk.start.x * 1000000)
                y1 = int(trk.start.y * 1000000)
                x2 = int(trk.end.x * 1000000)
                y2 = int(trk.end.y * 1000000)
                lines.append(f"{ap}*")
                lines.append(f"X{x1:010d}Y{y1:010d}D02*")
                lines.append(f"X{x2:010d}Y{y2:010d}D01*")

        lines.append("M02*")
        return "\n".join(lines)

    def _generate_mask(self, circuit: CircuitModel, layer: str) -> str:
        lines = self._header(f"{layer} Solder Mask")
        lines.append("%ADD10R,1.700X1.700*%")  # Mask opening slightly larger than pad
        lines.append("%ADD11C,1.900*%")

        for comp in circuit.components:
            for pin in comp.pins:
                if pin.hole_diameter > 0 or comp.layer == layer:
                    px = int((comp.x + pin.rel_x) * 1000000)
                    py = int((comp.y + pin.rel_y) * 1000000)
                    ap = "D11" if pin.hole_diameter > 0 else "D10"
                    lines.append(f"{ap}*")
                    lines.append(f"X{px:010d}Y{py:010d}D03*")

        lines.append("M02*")
        return "\n".join(lines)

    def _generate_silkscreen(self, circuit: CircuitModel, layer: str) -> str:
        lines = self._header(f"{layer} Silkscreen")
        lines.append("%ADD10C,0.150*%")  # 0.15mm text stroke

        # Component outlines and labels
        for comp in circuit.components:
            if comp.layer == layer:
                hw = comp.width_mm / 2.0
                hh = comp.height_mm / 2.0
                x1 = int((comp.x - hw) * 1000000)
                y1 = int((comp.y - hh) * 1000000)
                x2 = int((comp.x + hw) * 1000000)
                y2 = int((comp.y + hh) * 1000000)
                lines.append("D10*")
                lines.append(f"X{x1:010d}Y{y1:010d}D02*")
                lines.append(f"X{x2:010d}Y{y1:010d}D01*")
                lines.append(f"X{x2:010d}Y{y2:010d}D01*")
                lines.append(f"X{x1:010d}Y{y2:010d}D01*")
                lines.append(f"X{x1:010d}Y{y1:010d}D01*")

        lines.append("M02*")
        return "\n".join(lines)

    def _generate_outline(self, circuit: CircuitModel) -> str:
        lines = self._header("Edge Cuts")
        lines.append("%ADD10C,0.100*%")  # 0.10mm milling path
        w = int(circuit.board.width_mm * 1000000)
        h = int(circuit.board.height_mm * 1000000)
        lines.append("D10*")
        lines.append(f"X0Y0D02*")
        lines.append(f"X{w:010d}Y0D01*")
        lines.append(f"X{w:010d}Y{h:010d}D01*")
        lines.append(f"X0Y{h:010d}D01*")
        lines.append(f"X0Y0D01*")
        lines.append("M02*")
        return "\n".join(lines)

    def _generate_drill(self, circuit: CircuitModel) -> str:
        lines = [
            "M48",
            "METRIC,TZ",
            "; CircuitFlow AI Excellon Drill File",
            "T1C0.300",  # Via drill
            "T2C1.000",  # THT pin drill
            "T3C3.200",  # M3 mounting hole
            "%"
        ]
        
        # Vias (T1)
        if circuit.vias:
            lines.append("T1")
            for via in circuit.vias:
                x = int(via.x * 1000)
                y = int(via.y * 1000)
                lines.append(f"X{x:06d}Y{y:06d}")

        # THT Pins (T2)
        tht_pins = []
        for comp in circuit.components:
            for pin in comp.pins:
                if pin.hole_diameter > 0:
                    tht_pins.append((comp.x + pin.rel_x, comp.y + pin.rel_y))
        if tht_pins:
            lines.append("T2")
            for px, py in tht_pins:
                x = int(px * 1000)
                y = int(py * 1000)
                lines.append(f"X{x:06d}Y{y:06d}")

        # Mounting Holes (T3)
        if circuit.board.mounting_holes:
            lines.append("T3")
            for hole in circuit.board.mounting_holes:
                x = int(hole.x * 1000)
                y = int(hole.y * 1000)
                lines.append(f"X{x:06d}Y{y:06d}")

        lines.append("M30")
        return "\n".join(lines)

gerber_generator = GerberGenerator()
