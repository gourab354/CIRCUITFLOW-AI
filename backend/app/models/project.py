from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from backend.app.models.circuit import CircuitModel

class ProjectSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    step: int = 1  # 1 to 10
    beginner_mode: bool = True
    created_at: str
    updated_at: str
    component_count: int = 0
    net_count: int = 0
    drc_clean: bool = False

class Project(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    step: int = 1  # Step 1 to 10 matching user workflow
    beginner_mode: bool = True
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    circuit: CircuitModel = Field(default_factory=CircuitModel)
    raw_input_prompt: Optional[str] = ""
    questionnaire_answers: Dict[str, Any] = Field(default_factory=dict)
    history: List[Dict[str, Any]] = Field(default_factory=list)
    history_index: int = -1

class ProjectCreate(BaseModel):
    name: str = "Untitled Project"
    description: Optional[str] = ""
    beginner_mode: bool = True
    template: Optional[str] = None  # "blank", "esp32_sensor", "arduino_shield", "power_bank"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    step: Optional[int] = None
    beginner_mode: Optional[bool] = None
    circuit: Optional[CircuitModel] = None
    questionnaire_answers: Optional[Dict[str, Any]] = None
