from fastapi import APIRouter, HTTPException
from backend.app.db.database import get_project, save_project
from backend.app.services.validation.drc import drc_engine
from backend.app.services.validation.erc import erc_engine

router = APIRouter(prefix="/validation", tags=["validation"])

@router.post("/{project_id}/run")
def run_full_validation(project_id: str):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    drc_issues = drc_engine.run(project.circuit)
    erc_issues = erc_engine.run(project.circuit)

    project.circuit.drc_violations = drc_issues
    project.circuit.erc_violations = erc_issues
    project.step = max(project.step, 9)
    save_project(project)

    error_count = sum(1 for v in drc_issues if v.severity == "error") + sum(1 for v in erc_issues if v.severity == "error")
    warning_count = sum(1 for v in drc_issues if v.severity == "warning") + sum(1 for v in erc_issues if v.severity == "warning")

    return {
        "status": "completed",
        "clean": error_count == 0,
        "error_count": error_count,
        "warning_count": warning_count,
        "drc_violations": drc_issues,
        "erc_violations": erc_issues,
        "summary": "Design is electrically sound and passes physical design rules." if error_count == 0 else f"Found {error_count} error(s) and {warning_count} warning(s) that require attention."
    }

