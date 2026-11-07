import os
import re
from pathlib import Path
from typing import List, Dict, Optional, Any
from backend.app.config import settings

class KiCadLibraryManager:
    def __init__(self):
        self.footprints_dir = Path(settings.kicad_footprints_dir)
        self.symbols_dir = Path(settings.kicad_symbols_dir)
        self._cache: Dict[str, Any] = {}

    def is_available(self) -> bool:
        return self.footprints_dir.exists() and self.symbols_dir.exists()

    def list_footprint_libraries(self) -> List[str]:
        if not self.footprints_dir.exists():
            return []
        return [d.name.replace(".pretty", "") for d in self.footprints_dir.iterdir() if d.is_dir() and d.name.endswith(".pretty")]

    def search_footprints(self, query: str, limit: int = 50) -> List[str]:
        if not self.footprints_dir.exists():
            return []
        q = query.lower()
        results = []
        for pretty_dir in self.footprints_dir.iterdir():
            if not pretty_dir.is_dir() or not pretty_dir.name.endswith(".pretty"):
                continue
            lib_name = pretty_dir.name.replace(".pretty", "")
            for mod_file in pretty_dir.glob("*.kicad_mod"):
                fp_name = f"{lib_name}:{mod_file.stem}"
                if q in fp_name.lower():
                    results.append(fp_name)
                    if len(results) >= limit:
                        return results
        return results

    def get_footprint_details(self, footprint_id: str) -> Optional[Dict[str, Any]]:
        """Parses pad positions and dimensions directly from KiCad 10 .kicad_mod s-expression file"""
        if ":" not in footprint_id:
            return None
        lib_name, mod_name = footprint_id.split(":", 1)
        mod_path = self.footprints_dir / f"{lib_name}.pretty" / f"{mod_name}.kicad_mod"
        if not mod_path.exists():
            return None

        try:
            content = mod_path.read_text(encoding="utf-8", errors="ignore")
            pads = []
            # Regex for KiCad 10 pad format: (pad "1" smd rect (at 0 0) (size 1.5 0.9) ...)
            # or (pad "1" thru_hole circle (at 0 0) (size 1.6 1.6) (drill 0.8) ...)
            pad_pattern = re.compile(
                r'\(pad\s+"?([^"\s\)]+)"?\s+([^\s]+)\s+([^\s]+)\s+\(at\s+([-0-9.]+)\s+([-0-9.]+)[^\)]*\)\s+\(size\s+([-0-9.]+)\s+([-0-9.]+)\)(?:\s+\(drill\s+([-0-9.]+)\))?',
                re.IGNORECASE
            )
            for match in pad_pattern.finditer(content):
                num, pad_type, shape, x, y, sx, sy, drill = match.groups()
                pads.append({
                    "number": num,
                    "type": pad_type,
                    "shape": shape,
                    "x": float(x),
                    "y": float(y),
                    "size_x": float(sx),
                    "size_y": float(sy),
                    "drill": float(drill) if drill else 0.0
                })
            return {
                "footprint": footprint_id,
                "pad_count": len(pads),
                "pads": pads
            }
        except Exception:
            return None

kicad_lib_manager = KiCadLibraryManager()
