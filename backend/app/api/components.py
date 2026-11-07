from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from backend.app.models.circuit import Component
from backend.app.services.components.catalog import search_components, get_component_definition, STANDARD_COMPONENTS
from backend.app.services.components.kicad_library import kicad_lib_manager
from backend.app.db.database import get_project, save_project

router = APIRouter(prefix="/components", tags=["components"])

@router.get("/catalog", response_model=List[Component])
def list_catalog_components(query: str = ""):
    return search_components(query)

@router.get("/footprints")
def search_footprints(query: str = "", limit: int = 50):
    fps = kicad_lib_manager.search_footprints(query, limit=limit)
    return {"count": len(fps), "footprints": fps}

@router.get("/footprint-details")
def get_footprint_details(footprint_id: str):
    details = kicad_lib_manager.get_footprint_details(footprint_id)
    if not details:
        raise HTTPException(status_code=404, detail="Footprint not found in KiCad libraries")
    return details

@router.post("/{project_id}/add", response_model=Component)
def add_component_to_project(project_id: str, comp_name: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    comp = get_component_definition(comp_name)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Component '{comp_name}' not found in catalog")

    # Ensure unique ref
    existing_refs = {c.ref for c in project.circuit.components}
    prefix = comp.ref[:1] if comp.ref else "U"
    idx = 1
    new_ref = f"{prefix}{idx}"
    while new_ref in existing_refs:
        idx += 1
        new_ref = f"{prefix}{idx}"
    comp.ref = new_ref

    project.circuit.components.append(comp)
    save_project(project)
    return comp

@router.put("/{project_id}/{comp_ref}", response_model=Component)
def update_project_component(project_id: str, comp_ref: str, updates: Dict[str, Any]):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    target = next((c for c in project.circuit.components if c.ref == comp_ref), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Component {comp_ref} not found in project")

    if "name" in updates:
        target.name = updates["name"]
    if "value" in updates:
        target.value = updates["value"]
    if "footprint" in updates:
        target.footprint = updates["footprint"]
    if "package" in updates:
        target.package = updates["package"]
    if "x" in updates:
        target.x = float(updates["x"])
    if "y" in updates:
        target.y = float(updates["y"])
    if "rotation" in updates:
        target.rotation = float(updates["rotation"])

    save_project(project)
    return target

@router.delete("/{project_id}/{comp_ref}")
def remove_component_from_project(project_id: str, comp_ref: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.circuit.components = [c for c in project.circuit.components if c.ref != comp_ref]
    # Remove from nets
    for net in project.circuit.nets:
        net.nodes = [n for n in net.nodes if n.component_ref != comp_ref]
    save_project(project)
    return {"status": "removed", "ref": comp_ref}
