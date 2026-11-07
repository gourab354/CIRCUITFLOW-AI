import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from backend.app.models.ai import (
    ChatMessage, CircuitParseRequest, CircuitAnalysisResult,
    QuestionAnswer, QuestionItem
)
from backend.app.models.project import Project
from backend.app.db.database import get_project, save_project, save_chat_message, get_chat_history
from backend.app.services.ai.circuit_parser import circuit_parser
from backend.app.services.ai.question_agent import questioning_agent, QUESTIONS_LIST
from backend.app.services.ai.llm_provider import llm_service

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/{project_id}/parse", response_model=CircuitAnalysisResult)
def parse_circuit_intent(project_id: str, req: CircuitParseRequest):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    analysis = circuit_parser.parse(req.prompt, req.raw_pin_table, req.raw_json)
    
    # Update project with detected components & nets
    project.circuit.components = analysis.detected_components
    project.circuit.nets = analysis.detected_nets
    project.raw_input_prompt = req.prompt
    project.step = 3  # Move to AI Circuit Analysis Step
    save_project(project)

    # Save user message & assistant reply to chat history
    user_msg = ChatMessage(
        id=f"msg_{uuid.uuid4().hex[:8]}",
        role="user",
        content=req.prompt,
        action_type="parse_circuit"
    )
    save_chat_message(project_id, user_msg)

    asst_msg = ChatMessage(
        id=f"msg_{uuid.uuid4().hex[:8]}",
        role="assistant",
        content=analysis.summary,
        action_type="analysis_result",
        metadata={
            "components": [c.name for c in analysis.detected_components],
            "nets_count": len(analysis.detected_nets),
            "missing_info": analysis.missing_information,
            "protocols": analysis.communication_protocols
        }
    )
    save_chat_message(project_id, asst_msg)

    return analysis

@router.get("/{project_id}/question/{question_index}")
def get_interview_question(project_id: str, question_index: int):
    q = questioning_agent.get_question_by_index(question_index)
    if not q:
        return {"completed": True, "total": questioning_agent.total_questions()}
    return {
        "completed": False,
        "question": q,
        "index": question_index,
        "total": questioning_agent.total_questions()
    }

@router.post("/{project_id}/answer")
def submit_question_answer(project_id: str, ans: QuestionAnswer):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.questionnaire_answers[ans.question_id] = ans.answer
    questioning_agent.apply_answer_to_circuit(project.circuit, ans.question_id, ans.answer)
    save_project(project)

    return {"status": "ok", "answers": project.questionnaire_answers, "board": project.circuit.board}

@router.get("/{project_id}/history", response_model=List[ChatMessage])
def get_project_chat(project_id: str):
    return get_chat_history(project_id)

@router.post("/{project_id}/chat", response_model=ChatMessage)
def post_chat_message(project_id: str, msg: Dict[str, str]):
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content = msg.get("content", "")
    user_msg = ChatMessage(
        id=f"msg_{uuid.uuid4().hex[:8]}",
        role="user",
        content=content
    )
    save_chat_message(project_id, user_msg)

    # Generate assistant reply
    reply_text = ""
    # Check if LLM is active
    if llm_service.provider != "rule_based":
        sys_prompt = "You are CircuitFlow AI, an expert PCB engineering assistant. Be concise, precise, and beginner-friendly."
        reply_text = llm_service.generate_completion(content, sys_prompt)

    if not reply_text:
        # Smart rule-based engineering guidance
        lower = content.lower()
        if "i2c" in lower or "pullup" in lower:
            reply_text = "I2C lines (SDA and SCL) are open-drain and require 4.7kΩ pull-up resistors to 3.3V to ensure signals rise cleanly without distortion."
        elif "esp32" in lower and "power" in lower:
            reply_text = "The ESP32 requires 3.3V DC and can draw up to 500mA during Wi-Fi transmission bursts. Place a 10uF tantalum and 0.1uF ceramic capacitor right next to its 3V3 pin."
        elif "routing" in lower or "track" in lower:
            reply_text = "Keep digital signal traces thin (0.25mm) for high density. Keep power tracks thick (0.50mm to 1.0mm) to reduce impedance and voltage drop. Route ground as a continuous copper zone."
        elif "drc" in lower or "clearance" in lower:
            reply_text = "Standard fab houses (like JLCPCB and PCBWay) require minimum 0.127mm (5 mil) to 0.2mm track clearance. Our default rule is set safely to 0.2mm."
        else:
            reply_text = f"I am analyzing your circuit request. You have {len(project.circuit.components)} components placed and {len(project.circuit.nets)} nets defined. What would you like to refine?"

    asst_msg = ChatMessage(
        id=f"msg_{uuid.uuid4().hex[:8]}",
        role="assistant",
        content=reply_text
    )
    save_chat_message(project_id, asst_msg)
    return asst_msg

