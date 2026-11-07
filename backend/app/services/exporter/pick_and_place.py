import csv
import io
from backend.app.models.circuit import CircuitModel

class PickAndPlaceExporter:
    """Generates standard Centroid (CPL / Pick and Place) files for automated SMT assembly."""

    def export_csv(self, circuit: CircuitModel) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        # JLCPCB / PCBWay Standard Header
        writer.writerow(["Designator", "Val", "Package", "Mid X", "Mid Y", "Rotation", "Layer"])

        for comp in sorted(circuit.components, key=lambda c: c.ref):
            layer_name = "Top" if comp.layer in ("F.Cu", "Top") else "Bottom"
            writer.writerow([
                comp.ref,
                comp.value or comp.name,
                comp.footprint.split(":")[-1] if ":" in comp.footprint else comp.footprint,
                f"{comp.x:.3f}mm",
                f"{comp.y:.3f}mm",
                f"{int(comp.rotation)}",
                layer_name
            ])

        return output.getvalue()

pick_and_place_exporter = PickAndPlaceExporter()

