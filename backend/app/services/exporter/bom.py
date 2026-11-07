import csv
import io
from typing import Dict, List, Any
from backend.app.models.circuit import CircuitModel

class BOMExporter:
    """Generates standard industrial Bill of Materials (BOM)."""

    def export_csv(self, circuit: CircuitModel) -> str:
        # Group identical components by (Name, Value, Footprint)
        grouped: Dict[tuple, List[str]] = {}
        comp_details: Dict[tuple, Any] = {}

        for c in circuit.components:
            key = (c.name, c.value or "-", c.footprint or "-")
            if key not in grouped:
                grouped[key] = []
                comp_details[key] = c
            grouped[key].append(c.ref)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Item", "Designator", "Comment / Value", "Footprint", "Quantity", "Description", "Datasheet"])

        item_idx = 1
        for key, refs in sorted(grouped.items()):
            c = comp_details[key]
            refs_str = ", ".join(sorted(refs))
            writer.writerow([
                item_idx,
                refs_str,
                c.value or c.name,
                c.footprint,
                len(refs),
                c.description or c.category,
                c.datasheet or ""
            ])
            item_idx += 1

        return output.getvalue()

bom_exporter = BOMExporter()

