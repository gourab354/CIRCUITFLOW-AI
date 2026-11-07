from fastapi import APIRouter, HTTPException, Response
from backend.app.models.circuit import Net, NetNode
from backend.app.db.database import get_project, save_project
from backend.app.services.schematic.generator import schematic_service
from backend.app.services.schematic.kicad_sch import generate_kicad_sch_content

router = APIRouter(prefix="/schematic", tags=["schematic"])

@router.get("/{project_id}/layout")
def get_schematic_layout(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return schematic_service.layout_schematic(project.circuit)

@router.get("/{project_id}/svg")
def get_schematic_svg(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    svg_data = schematic_service.generate_svg(project.circuit)
    return Response(content=svg_data, media_type="image/svg+xml")

@router.get("/{project_id}/kicad")
def get_kicad_schematic(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    content = generate_kicad_sch_content(project.circuit)
    return Response(content=content, media_type="text/plain")

@router.post("/{project_id}/connect")
def connect_pins(project_id: str, net_name: str, comp_a: str, pin_a: str, comp_b: str, pin_b: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    net = next((n for n in project.circuit.nets if n.name == net_name), None)
    if not net:
        net = Net(name=net_name, nodes=[])
        project.circuit.nets.append(net)

    node_a = NetNode(component_ref=comp_a, pin_number=pin_a)
    node_b = NetNode(component_ref=comp_b, pin_number=pin_b)

    if node_a not in net.nodes:
        net.nodes.append(node_a)
    if node_b not in net.nodes:
        net.nodes.append(node_b)

    # Update pin nets
    for c in project.circuit.components:
        if c.ref == comp_a:
            for p in c.pins:
                if p.number == pin_a:
                    p.net = net_name
        if c.ref == comp_b:
            for p in c.pins:
                if p.number == pin_b:
                    p.net = net_name

    save_project(project)
    return {"status": "connected", "net": net}

