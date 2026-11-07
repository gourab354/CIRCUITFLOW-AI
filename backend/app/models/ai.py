from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from backend.app.models.circuit import Component, Net

class QuestionOption(BaseModel):
    label: str
    value: Any
    description: Optional[str] = None
    is_default: bool = False

class QuestionItem(BaseModel):
    id: str  # e.g., "board_dimensions", "pcb_shape", "layers", "solder_mask_color"
    title: str
    prompt: str
    explanation: str
    category: str
    options: List[QuestionOption] = Field(default_factory=list)
    default_value: Any = None
    allow_custom: bool = True
    input_type: str = "select"  # select, text, number

class ChatMessage(BaseModel):
    id: str
    role: str  # user, assistant, system
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    question: Optional[QuestionItem] = None
    action_type: Optional[str] = None  # parse_circuit, question, recommendation, error_fix
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CircuitParseRequest(BaseModel):
    prompt: str
    raw_pin_table: Optional[str] = None
    raw_json: Optional[str] = None
    raw_netlist: Optional[str] = None

class CircuitAnalysisResult(BaseModel):
    detected_components: List[Component] = Field(default_factory=list)
    detected_nets: List[Net] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)
    power_requirements: Dict[str, Any] = Field(default_factory=dict)
    voltage_compatibility_notes: List[str] = Field(default_factory=list)
    communication_protocols: List[str] = Field(default_factory=list)
    potential_conflicts: List[str] = Field(default_factory=list)
    confidence: float = 1.0
    summary: str = ""

class QuestionAnswer(BaseModel):
    question_id: str
    answer: Any

