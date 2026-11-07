import os
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.config import settings
from backend.app.models.circuit import CircuitModel
from backend.app.services.pcb.kicad_pcb import generate_kicad_pcb_content
from backend.app.services.schematic.kicad_sch import generate_kicad_sch_content

class KiCadCLIExporter:
    """Invokes installed KiCad 10 CLI tools to produce native exports."""

    def __init__(self):
        self.cli_path = Path(settings.kicad_cli_path)

    def is_available(self) -> bool:
        return self.cli_path.exists()

    def export_kicad_project(self, circuit: CircuitModel, output_dir: Path) -> Dict[str, str]:
        """Saves .kicad_pro, .kicad_sch, and .kicad_pcb files."""
        output_dir.mkdir(parents=True, exist_ok=True)
        proj_name = "CircuitFlow_Project"
        
        # 1. Project file (.kicad_pro)
        pro_path = output_dir / f"{proj_name}.kicad_pro"
        pro_content = (
            '{\n'
            '  "board": {\n'
            '    "design_settings": {\n'
            '      "defaults": {\n'
            '        "track_width": 0.25\n'
            '      }\n'
            '    }\n'
            '  },\n'
            '  "sheets": [\n'
            '    ["", ""]\n'
            '  ]\n'
            '}'
        )
        pro_path.write_text(pro_content, encoding="utf-8")

        # 2. Schematic (.kicad_sch)
        sch_path = output_dir / f"{proj_name}.kicad_sch"
        sch_path.write_text(generate_kicad_sch_content(circuit), encoding="utf-8")

        # 3. PCB (.kicad_pcb)
        pcb_path = output_dir / f"{proj_name}.kicad_pcb"
        pcb_path.write_text(generate_kicad_pcb_content(circuit), encoding="utf-8")

        return {
            "pro": str(pro_path),
            "sch": str(sch_path),
            "pcb": str(pcb_path)
        }

    def run_kicad_drc(self, pcb_path: Path) -> Optional[str]:
        """Runs kicad-cli pcb drc --output report.json"""
        if not self.is_available():
            return None
        report_path = pcb_path.parent / "drc_report.json"
        cmd = [
            str(self.cli_path),
            "pcb", "drc",
            "--format", "json",
            "--output", str(report_path),
            str(pcb_path)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if report_path.exists():
                return report_path.read_text(encoding="utf-8", errors="ignore")
            return res.stdout or res.stderr
        except Exception as e:
            return str(e)

    def export_glb_3d(self, pcb_path: Path, glb_path: Path) -> bool:
        """Exports 3D binary glTF (.glb) for Three.js rendering."""
        if not self.is_available():
            return False
        cmd = [
            str(self.cli_path),
            "pcb", "export", "glb",
            "--output", str(glb_path),
            str(pcb_path)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            return glb_path.exists()
        except Exception:
            return False

kicad_cli_exporter = KiCadCLIExporter()

