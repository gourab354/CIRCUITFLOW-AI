from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from backend.app.models.circuit import Point2D, Track, Via, BoardDesign
from backend.app.db.database import get_project, save_project
from backend.app.services.pcb.placement import pcb_placement_service
from backend.app.services.pcb.router import pcb_router_service
from backend.app.services.pcb.zones import copper_zone_service

router = APIRouter(prefix="/pcb", tags=["pcb"])

@router.post("/{project_id}/autoplace")
def run_autoplace(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pcb_placement_service.auto_place(project.circuit)
    project.step = max(project.step, 7)
    save_project(project)
    return {"status": "placed", "components": project.circuit.components}

@router.post("/{project_id}/autoroute")
def run_autoroute(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pcb_router_service.route_circuit(project.circuit)
    copper_zone_service.generate_ground_plane(project.circuit)
    project.step = max(project.step, 8)
    save_project(project)
    return {
        "status": "routed",
        "track_count": len(project.circuit.tracks),
        "via_count": len(project.circuit.vias),
        "tracks": project.circuit.tracks,
        "vias": project.circuit.vias,
        "zones": project.circuit.zones
    }

@router.post("/{project_id}/component/move")
def move_component(project_id: str, comp_ref: str, x: float, y: float):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    comp = next((c for c in project.circuit.components if c.ref == comp_ref), None)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Component {comp_ref} not found")

    comp.x = x
    comp.y = y
    save_project(project)
    return {"status": "moved", "component": comp}

@router.post("/{project_id}/component/rotate")
def rotate_component(project_id: str, comp_ref: str, degrees: float = 90.0):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    comp = next((c for c in project.circuit.components if c.ref == comp_ref), None)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Component {comp_ref} not found")

    comp.rotation = (comp.rotation + degrees) % 360.0
    save_project(project)
    return {"status": "rotated", "component": comp}

@router.post("/{project_id}/track/add", response_model=Track)
def add_track(project_id: str, track: Track):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.circuit.tracks.append(track)
    save_project(project)
    return track

@router.delete("/{project_id}/track/{track_id}")
def delete_track(project_id: str, track_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.circuit.tracks = [t for t in project.circuit.tracks if t.id != track_id]
    save_project(project)
    return {"status": "deleted", "id": track_id}

@router.post("/{project_id}/via/add", response_model=Via)
def add_via(project_id: str, via: Via):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.circuit.vias.append(via)
    save_project(project)
    return via

@router.put("/{project_id}/board", response_model=BoardDesign)
def update_board_design(project_id: str, board: BoardDesign):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.circuit.board = board
    save_project(project)
    return project.circuit.board
