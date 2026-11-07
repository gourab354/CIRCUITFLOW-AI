import uuid
from typing import Dict, Any
from backend.app.models.circuit import CircuitModel

def generate_kicad_sch_content(circuit: CircuitModel) -> str:
    """Generates official KiCad 10 S-expression schematic (.kicad_sch)."""
    uuid_str = str(uuid.uuid4())
    
    sch_lines = [
        f'(kicad_sch (version 20240108) (generator "CircuitFlow_AI")',
        f'  (uuid "{uuid_str}")',
        '  (paper "A4")',
        '  (title_block',
        '    (title "CircuitFlow AI Generated Schematic")',
        '    (company "CircuitFlow Engineering")',
        '    (rev "1.0")',
        '  )',
        '  (lib_symbols'
    ]

    # Minimal lib_symbols definitions for each unique component
    for comp in circuit.components:
        comp_uuid = str(uuid.uuid4())
        sch_lines.append(f'    (symbol "{comp.name}" (in_bom yes) (on_board yes)')
        sch_lines.append(f'      (property "Reference" "{comp.ref}" (at 0 5 0))')
        sch_lines.append(f'      (property "Value" "{comp.value or comp.name}" (at 0 -5 0))')
        sch_lines.append(f'      (property "Footprint" "{comp.footprint}" (at 0 -10 0))')
        sch_lines.append('    )')
    
    sch_lines.append('  )')

    # Add symbols placed on sheet
    base_x = 50.0
    base_y = 50.0
    for i, comp in enumerate(circuit.components):
        inst_uuid = str(uuid.uuid4())
        px = base_x + (i % 3) * 60.0
        py = base_y + (i // 3) * 50.0
        sch_lines.append(f'  (symbol (lib_id "{comp.name}") (at {px:.2f} {py:.2f} 0) (unit 1)')
        sch_lines.append('    (in_bom yes) (on_board yes)')
        sch_lines.append(f'    (uuid "{inst_uuid}")')
        sch_lines.append(f'    (property "Reference" "{comp.ref}" (at {px:.2f} {py+5:.2f} 0))')
        sch_lines.append(f'    (property "Value" "{comp.value or comp.name}" (at {px:.2f} {py-5:.2f} 0))')
        sch_lines.append(f'    (property "Footprint" "{comp.footprint}" (at {px:.2f} {py-10:.2f} 0))')
        sch_lines.append('  )')

    # Add wires & net labels
    for net in circuit.nets:
        if len(net.nodes) >= 2:
            wire_uuid = str(uuid.uuid4())
            sch_lines.append(f'  (label "{net.name}" (at {base_x:.2f} {base_y:.2f} 0) (fields_autoplaced yes)')
            sch_lines.append('    (effects (font (size 1.27 1.27)) (justify left bottom))')
            sch_lines.append(f'    (uuid "{wire_uuid}")')
            sch_lines.append('  )')

    sch_lines.append(')')
    return "\n".join(sch_lines)

