import json
import asyncio
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = set()
        self.active_connections[project_id].add(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id].discard(websocket)

    async def broadcast_to_project(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            msg_str = json.dumps(message)
            for connection in list(self.active_connections[project_id]):
                try:
                    await connection.send_text(msg_str)
                except Exception:
                    self.active_connections[project_id].discard(connection)

manager = ConnectionManager()

@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        # Send initial connection ack
        await websocket.send_text(json.dumps({
            "type": "connected",
            "project_id": project_id,
            "message": "Real-time engineering telemetry established"
        }))
        while True:
            data = await websocket.receive_text()
            # Handle incoming ping / client events
            try:
                payload = json.loads(data)
                if payload.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
