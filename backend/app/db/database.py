import sqlite3
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from backend.app.config import settings
from backend.app.models.project import Project, ProjectSummary
from backend.app.models.circuit import CircuitModel
from backend.app.models.ai import ChatMessage

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.db_path))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                step INTEGER DEFAULT 1,
                beginner_mode INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                raw_input_prompt TEXT DEFAULT '',
                questionnaire_answers TEXT DEFAULT '{}',
                circuit_json TEXT NOT NULL,
                history_json TEXT DEFAULT '[]',
                history_index INTEGER DEFAULT -1
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                action_type TEXT DEFAULT '',
                metadata_json TEXT DEFAULT '{}',
                question_json TEXT DEFAULT '',
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_project_id ON chat_messages(project_id)
        """)
    conn.close()

def save_project(project: Project) -> Project:
    conn = get_connection()
    circuit_json = project.circuit.model_dump_json()
    answers_json = json.dumps(project.questionnaire_answers)
    history_json = json.dumps(project.history)
    with conn:
        conn.execute("""
            INSERT INTO projects (
                id, name, description, step, beginner_mode, created_at, updated_at,
                raw_input_prompt, questionnaire_answers, circuit_json, history_json, history_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                description=excluded.description,
                step=excluded.step,
                beginner_mode=excluded.beginner_mode,
                updated_at=excluded.updated_at,
                raw_input_prompt=excluded.raw_input_prompt,
                questionnaire_answers=excluded.questionnaire_answers,
                circuit_json=excluded.circuit_json,
                history_json=excluded.history_json,
                history_index=excluded.history_index
        """, (
            project.id, project.name, project.description, project.step,
            1 if project.beginner_mode else 0, project.created_at, project.updated_at,
            project.raw_input_prompt, answers_json, circuit_json, history_json, project.history_index
        ))
    conn.close()
    return project

def get_project(project_id: str) -> Optional[Project]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    if not row:
        return None
    circuit_data = json.loads(row["circuit_json"])
    answers = json.loads(row["questionnaire_answers"])
    history = json.loads(row["history_json"])
    return Project(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        step=row["step"],
        beginner_mode=bool(row["beginner_mode"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        raw_input_prompt=row["raw_input_prompt"],
        questionnaire_answers=answers,
        circuit=CircuitModel(**circuit_data),
        history=history,
        history_index=row["history_index"]
    )

def list_projects() -> List[ProjectSummary]:
    conn = get_connection()
    rows = conn.execute("SELECT id, name, description, step, beginner_mode, created_at, updated_at, circuit_json FROM projects ORDER BY updated_at DESC").fetchall()
    conn.close()
    summaries = []
    for r in rows:
        circuit_data = json.loads(r["circuit_json"])
        c_count = len(circuit_data.get("components", []))
        n_count = len(circuit_data.get("nets", []))
        drc_violations = circuit_data.get("drc_violations", [])
        summaries.append(ProjectSummary(
            id=r["id"],
            name=r["name"],
            description=r["description"],
            step=r["step"],
            beginner_mode=bool(r["beginner_mode"]),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
            component_count=c_count,
            net_count=n_count,
            drc_clean=len(drc_violations) == 0
        ))
    return summaries

def delete_project(project_id: str) -> bool:
    conn = get_connection()
    with conn:
        conn.execute("DELETE FROM chat_messages WHERE project_id = ?", (project_id,))
        cur = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        deleted = cur.rowcount > 0
    conn.close()
    return deleted

def save_chat_message(project_id: str, message: ChatMessage):
    conn = get_connection()
    meta_json = json.dumps(message.metadata)
    q_json = message.question.model_dump_json() if message.question else ""
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO chat_messages (id, project_id, role, content, timestamp, action_type, metadata_json, question_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            message.id, project_id, message.role, message.content,
            message.timestamp, message.action_type or "", meta_json, q_json
        ))
    conn.close()

def get_chat_history(project_id: str) -> List[ChatMessage]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM chat_messages WHERE project_id = ? ORDER BY timestamp ASC", (project_id,)).fetchall()
    conn.close()
    messages = []
    for r in rows:
        q_obj = None
        if r["question_json"]:
            try:
                from backend.app.models.ai import QuestionItem
                q_obj = QuestionItem(**json.loads(r["question_json"]))
            except Exception:
                pass
        messages.append(ChatMessage(
            id=r["id"],
            role=r["role"],
            content=r["content"],
            timestamp=r["timestamp"],
            action_type=r["action_type"] or None,
            metadata=json.loads(r["metadata_json"]) if r["metadata_json"] else {},
            question=q_obj
        ))
    return messages
