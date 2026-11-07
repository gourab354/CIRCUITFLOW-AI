import uuid
import math
from typing import List
from backend.app.models.circuit import CircuitModel

def generate_kicad_pcb_content(circuit: CircuitModel) -> str:
    """Generates official KiCad 10 S-expression board file (.kicad_pcb)."""
    board_uuid = str(uuid.uuid4())
    bw = circuit.board.width_mm
    bh = circuit.board.height_mm

    lines = [
        f'(kicad_pcb (version 20240108) (generator "CircuitFlow_AI")',
        f'  (general',
        f'    (thickness {circuit.board.thickness_mm})',
        f'    (legacy_teardrops no)',
        f'  )',
        f'  (paper "A4")',
        f'  (layers',
        f'    (0 "F.Cu" signal)',
        f'    (31 "B.Cu" signal)',
        f'    (32 "B.Adhes" user "B.Adhesive")',
        f'    (33 "F.Adhes" user "F.Adhesive")',
        f'    (34 "B.Paste" user)',
        f'    (35 "F.Paste" user)',
        f'    (36 "B.SilkS" user "B.Silkscreen")',
        f'    (37 "F.SilkS" user "F.Silkscreen")',
        f'    (38 "B.Mask" user "B.Mask")',
        f'    (39 "F.Mask" user "F.Mask")',
        f'    (40 "User.Drawings" user)',
        f'    (41 "User.Comments" user)',
        f'    (42 "User.Eco1" user)',
        f'    (43 "User.Eco2" user)',
        f'    (44 "Edge.Cuts" user)',
        f'    (45 "Margin" user)',
        f'    (46 "B.CrtYd" user "B.Courtyard")',
        f'    (47 "F.CrtYd" user "F.Courtyard")',
        f'    (48 "B.Fab" user)',
        f'    (49 "F.Fab" user)',
        f'  )',
        f'  (setup',
        f'    (pad_to_mask_clearance 0.05)',
        f'    (solder_mask_min_width 0.1)',
        f'    (pad_to_paste_clearance 0)',
        f'    (pad_to_paste_clearance_ratio 0)',
        f'    (aux_axis_origin 0 0)',
        f'    (grid_origin 0 0)',
        f'  )'
    ]

    # Declare Nets (0 is always unassigned)
    lines.append('  (net 0 "")')
    net_id_map = {"": 0}
    for idx, net in enumerate(circuit.nets, start=1):
        lines.append(f'  (net {idx} "{net.name}")')
        net_id_map[net.name] = idx

    # Board Outlines (Edge.Cuts layer)
    lines.append(f'  (gr_line (start 0 0) (end {bw} 0) (stroke (width 0.1) (type solid)) (layer "Edge.Cuts"))')
    lines.append(f'  (gr_line (start {bw} 0) (end {bw} {bh}) (stroke (width 0.1) (type solid)) (layer "Edge.Cuts"))')
    lines.append(f'  (gr_line (start {bw} {bh}) (end 0 {bh}) (stroke (width 0.1) (type solid)) (layer "Edge.Cuts"))')
    lines.append(f'  (gr_line (start 0 {bh}) (end 0 0) (stroke (width 0.1) (type solid)) (layer "Edge.Cuts"))')

    # Mounting Holes
    for hole in circuit.board.mounting_holes:
        lines.append(f'  (footprint "MountingHole:MountingHole_{hole.diameter_mm:.1f}mm_M3"')
        lines.append(f'    (layer "F.Cu")')
        lines.append(f'    (at {hole.x:.2f} {hole.y:.2f})')
        lines.append(f'    (pad "" np_thru_hole circle (at 0 0) (size {hole.diameter_mm:.2f} {hole.diameter_mm:.2f}) (drill {hole.diameter_mm:.2f}) (layers "*.Cu" "*.Mask"))')
        lines.append('  )')

    # Footprints
    for comp in circuit.components:
        fp_uuid = str(uuid.uuid4())
        fp_name = comp.footprint or f"Package_DIP:DIP-{len(comp.pins)}_W7.62mm"
        lines.append(f'  (footprint "{fp_name}"')
        lines.append(f'    (layer "{comp.layer}")')
        lines.append(f'    (uuid "{fp_uuid}")')
        lines.append(f'    (at {comp.x:.2f} {comp.y:.2f} {comp.rotation:.1f})')
        lines.append(f'    (property "Reference" "{comp.ref}" (at 0 {-comp.height_mm/2.0 - 1.5:.2f} 0) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))')
        lines.append(f'    (property "Value" "{comp.value or comp.name}" (at 0 {comp.height_mm/2.0 + 1.5:.2f} 0) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15))))')
        
        # Pads
        for pin in comp.pins:
            p_net_id = net_id_map.get(pin.net or "", 0)
            p_net_name = pin.net or ""
            net_clause = f'(net {p_net_id} "{p_net_name}")' if p_net_name else ''
            
            if pin.hole_diameter > 0:
                # Through-hole pad
                lines.append(f'    (pad "{pin.number}" thru_hole {pin.pad_shape} (at {pin.rel_x:.2f} {pin.rel_y:.2f}) (size {pin.pad_size_x:.2f} {pin.pad_size_y:.2f}) (drill {pin.hole_diameter:.2f}) (layers "*.Cu" "*.Mask") {net_clause})')
            else:
                # SMD pad
                lines.append(f'    (pad "{pin.number}" smd {pin.pad_shape} (at {pin.rel_x:.2f} {pin.rel_y:.2f}) (size {pin.pad_size_x:.2f} {pin.pad_size_y:.2f}) (layers "F.Cu" "F.Paste" "F.Mask") {net_clause})')

        lines.append('  )')

    # Tracks (Segments)
    for trk in circuit.tracks:
        net_id = net_id_map.get(trk.net, 0)
        lines.append(
            f'  (segment (start {trk.start.x:.2f} {trk.start.y:.2f}) (end {trk.end.x:.2f} {trk.end.y:.2f}) '
            f'(width {trk.width_mm:.2f}) (layer "{trk.layer}") (net {net_id}))'
        )

    # Vias
    for via in circuit.vias:
        net_id = net_id_map.get(via.net, 0)
        lines.append(
            f'  (via (at {via.x:.2f} {via.y:.2f}) (size {via.diameter_mm:.2f}) (drill {via.drill_mm:.2f}) '
            f'(layers "F.Cu" "B.Cu") (net {net_id}))'
        )

    # Copper Zones (Ground planes)
    for zone in circuit.zones:
        net_id = net_id_map.get(zone.net, 0)
        lines.append(f'  (zone (net {net_id}) (net_name "{zone.net}") (layer "{zone.layer}")')
        lines.append(f'    (hatch edge 0.5)')
        lines.append(f'    (connect_pads (clearance {zone.clearance_mm:.2f}))')
        lines.append(f'    (min_thickness 0.25)')
        lines.append(f'    (filled_polygon')
        lines.append(f'      (pts')
        for pt in zone.polygon:
            lines.append(f'        (xy {pt.x:.2f} {pt.y:.2f})')
        lines.append(f'      )')
        lines.append(f'    )')
        lines.append(f'  )')

    lines.append(')')
    return "\n".join(lines)
