from fastapi import APIRouter, HTTPException, Response
from backend.app.db.database import get_project, save_project
from backend.app.services.exporter.package_export import package_export_service
from backend.app.services.exporter.bom import bom_exporter
from backend.app.services.exporter.pick_and_place import pick_and_place_exporter
from backend.app.services.exporter.kicad_export import kicad_cli_exporter
from backend.app.config import settings

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/{project_id}/zip")
def download_manufacturing_zip(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    safe_name = "".join(c for c in project.name if c.isalnum() or c in ("-", "_")).rstrip() or "CircuitFlow_Project"
    zip_bytes, meta = package_export_service.create_production_zip(project.circuit, project_name=safe_name)
    
    project.step = 10
    save_project(project)

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}_Fabrication_Package.zip"'
    }
    return Response(content=zip_bytes, media_type="application/zip", headers=headers)

@router.get("/{project_id}/bom")
def download_bom_csv(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    bom_csv = bom_exporter.export_csv(project.circuit)
    headers = {
        "Content-Disposition": f'attachment; filename="{project.name}_BOM.csv"'
    }
    return Response(content=bom_csv, media_type="text/csv", headers=headers)

@router.get("/{project_id}/cpl")
def download_cpl_csv(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    cpl_csv = pick_and_place_exporter.export_csv(project.circuit)
    headers = {
        "Content-Disposition": f'attachment; filename="{project.name}_PickAndPlace.csv"'
    }
    return Response(content=cpl_csv, media_type="text/csv", headers=headers)

@router.get("/{project_id}/status")
def check_export_readiness(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    has_errors = any(v.severity == "error" for v in project.circuit.drc_violations)
    ready = not has_errors and len(project.circuit.tracks) > 0 and len(project.circuit.components) > 0
    return {
        "project_id": project_id,
        "manufacturing_ready": ready,
        "component_count": len(project.circuit.components),
        "track_count": len(project.circuit.tracks),
        "drc_error_count": sum(1 for v in project.circuit.drc_violations if v.severity == "error"),
        "erc_error_count": sum(1 for v in project.circuit.erc_violations if v.severity == "error"),
        "kicad_installed": kicad_cli_exporter.is_available()
    }
