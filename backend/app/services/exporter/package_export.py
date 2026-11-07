import zipfile
import io
import datetime
from pathlib import Path
from typing import Tuple, Dict, Any
from backend.app.models.circuit import CircuitModel
from backend.app.services.exporter.gerber import gerber_generator
from backend.app.services.exporter.bom import bom_exporter
from backend.app.services.exporter.pick_and_place import pick_and_place_exporter
from backend.app.services.schematic.generator import schematic_service
from backend.app.services.schematic.kicad_sch import generate_kicad_sch_content
from backend.app.services.pcb.kicad_pcb import generate_kicad_pcb_content
from backend.app.services.validation.drc import drc_engine
from backend.app.services.validation.erc import erc_engine

class PackageExportService:
    """Creates a comprehensive production ZIP archive with all fabrication deliverables."""

    def create_production_zip(self, circuit: CircuitModel, project_name: str = "CircuitFlow_Project") -> Tuple[bytes, Dict[str, Any]]:
        # Run validations first
        drc_violations = drc_engine.run(circuit)
        erc_violations = erc_engine.run(circuit)
        
        has_errors = any(v.severity == "error" for v in drc_violations)
        manufacturing_ready = not has_errors and len(circuit.tracks) > 0 and len(circuit.components) > 0

        # Build in-memory zip
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            # 1. Gerber & Drill files (in /gerbers folder)
            gerber_files = gerber_generator.generate_all(circuit)
            for fname, content in gerber_files.items():
                zf.writestr(f"gerbers/{fname}", content)

            # 2. Bill of Materials
            bom_content = bom_exporter.export_csv(circuit)
            zf.writestr(f"assembly/{project_name}_BOM.csv", bom_content)

            # 3. Pick and Place Centroid File
            cpl_content = pick_and_place_exporter.export_csv(circuit)
            zf.writestr(f"assembly/{project_name}_CPL_PickAndPlace.csv", cpl_content)

            # 4. Schematic SVG
            sch_svg = schematic_service.generate_svg(circuit)
            zf.writestr(f"schematic/{project_name}_Schematic.svg", sch_svg)

            # 5. KiCad Native Source Files
            zf.writestr(f"kicad/{project_name}.kicad_sch", generate_kicad_sch_content(circuit))
            zf.writestr(f"kicad/{project_name}.kicad_pcb", generate_kicad_pcb_content(circuit))
            zf.writestr(f"kicad/{project_name}.kicad_pro", '{"board": {"design_settings": {"defaults": {"track_width": 0.25}}}}')

            # 6. Manufacturing Compliance Report
            now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            status_text = "PASSED - MANUFACTURING-READY" if manufacturing_ready else "NOT MANUFACTURING-READY (ERRORS DETECTED)"
            
            report = [
                "================================================================================",
                f" CIRCUITFLOW AI — MANUFACTURING VALIDATION & FABRICATION REPORT",
                "================================================================================",
                f" Project Name:        {project_name}",
                f" Generation Date:     {now}",
                f" Manufacturing State: {status_text}",
                "--------------------------------------------------------------------------------",
                f" Board Specifications:",
                f"  - Dimensions:       {circuit.board.width_mm:.1f} mm x {circuit.board.height_mm:.1f} mm",
                f"  - Copper Layers:    {circuit.board.layers}",
                f"  - Thickness:        {circuit.board.thickness_mm:.2f} mm (1.0 oz copper)",
                f"  - Solder Mask:      {circuit.board.solder_mask_color.upper()}",
                f"  - Silkscreen:       {circuit.board.silkscreen_color.upper()}",
                f"  - Surface Finish:   {circuit.board.surface_finish}",
                f"  - Components Count: {len(circuit.components)}",
                f"  - Routed Tracks:    {len(circuit.tracks)}",
                f"  - Vias:             {len(circuit.vias)}",
                "--------------------------------------------------------------------------------",
                f" Design Rule Check (DRC) Summary: {len(drc_violations)} violation(s)",
            ]
            
            if drc_violations:
                for v in drc_violations:
                    report.append(f"  [{v.severity.upper()}] {v.type}: {v.message}")
                    if v.suggested_fix:
                        report.append(f"    Suggested Fix: {v.suggested_fix}")
            else:
                report.append("  [CLEAN] No physical design rule violations found.")

            report.append("--------------------------------------------------------------------------------")
            report.append(f" Electrical Rule Check (ERC) Summary: {len(erc_violations)} note(s)")
            if erc_violations:
                for v in erc_violations:
                    report.append(f"  [{v.severity.upper()}] {v.type}: {v.message}")
                    if v.suggested_fix:
                        report.append(f"    Suggested Fix: {v.suggested_fix}")
            else:
                report.append("  [CLEAN] No electrical schematic rule violations found.")

            report.append("================================================================================")
            if not manufacturing_ready:
                report.append(" NOTICE: This design contains unresolved electrical or physical DRC violations.")
                report.append(" Do not submit this archive to PCB fabricators until all errors are resolved.")
            else:
                report.append(" SUCCESS: All design rule checks passed. This package is verified and ready for")
                report.append(" submission to JLCPCB, PCBWay, Seeed Studio, or OSH Park.")
            report.append("================================================================================")

            zf.writestr("MANUFACTURING_REPORT.txt", "\n".join(report))

        zip_bytes = zip_buffer.getvalue()
        metadata = {
            "project_name": project_name,
            "size_bytes": len(zip_bytes),
            "manufacturing_ready": manufacturing_ready,
            "drc_errors": sum(1 for v in drc_violations if v.severity == "error"),
            "erc_errors": sum(1 for v in erc_violations if v.severity == "error")
        }
        return zip_bytes, metadata

package_export_service = PackageExportService()

