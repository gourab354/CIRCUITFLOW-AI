import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from backend.app.models.project import Project, ProjectSummary, ProjectCreate, ProjectUpdate
from backend.app.models.circuit import CircuitModel, Component, BoardDesign
from backend.app.db.database import save_project, get_project, list_projects, delete_project
from backend.app.services.components.catalog import get_component_definition

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("", response_model=List[ProjectSummary])
def get_all_projects():
    return list_projects()

@router.post("", response_model=Project)
def create_new_project(req: ProjectCreate):
    proj_id = f"proj_{uuid.uuid4().hex[:8]}"
    circuit = CircuitModel()
    
    # Template initialization
    if req.template == "esp32_sensor":
        esp = get_component_definition("ESP32-WROOM-32")
        mpu = get_component_definition("MPU6050")
        oled = get_component_definition("OLED_SSD1306")
        if esp and mpu and oled:
            esp.x, esp.y = 35.0, 18.0
            mpu.x, mpu.y = 18.0, 32.0
            oled.x, oled.y = 52.0, 32.0
            circuit.components = [esp, mpu, oled]
    
    project = Project(
        id=proj_id,
        name=req.name,
        description=req.description or "",
        step=1,
        beginner_mode=req.beginner_mode,
        circuit=circuit
    )
    return save_project(project)

@router.get("/{project_id}", response_model=Project)
def get_single_project(project_id: str):
    p = get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

@router.put("/{project_id}", response_model=Project)
def update_existing_project(project_id: str, req: ProjectUpdate):
    p = get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if req.name is not None:
        p.name = req.name
    if req.description is not None:
        p.description = req.description
    if req.step is not None:
        p.step = req.step
    if req.beginner_mode is not None:
        p.beginner_mode = req.beginner_mode
    if req.circuit is not None:
        p.circuit = req.circuit
    if req.questionnaire_answers is not None:
        p.questionnaire_answers = req.questionnaire_answers
        
    return save_project(p)

@router.delete("/{project_id}")
def delete_single_project(project_id: str):
    success = delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted", "id": project_id}

@router.post("/{project_id}/duplicate", response_model=Project)
def duplicate_project(project_id: str):
    p = get_project(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    new_p = p.model_copy(deep=True)
    new_p.id = f"proj_{uuid.uuid4().hex[:8]}"
    new_p.name = f"{p.name} (Copy)"
    return save_project(new_p)

