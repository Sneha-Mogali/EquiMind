import asyncio
import json
import os
from datetime import datetime, timezone
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import load_models
from simulator import generate_event
from entities import get_all_entities, get_entity_by_id

load_dotenv()

# ── WebSocket connection manager ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)

manager = ConnectionManager()
event_log = []

# ── Background event loop ─────────────────────────────────────────────────────
async def event_loop():
    interval = int(os.getenv("EVENT_INTERVAL_SECONDS", 3))
    while True:
        await asyncio.sleep(interval)
        event = generate_event()
        event_log.append(event)
        if len(event_log) > 200:
            event_log.pop(0)
        await manager.broadcast(event)

# ── App lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    asyncio.create_task(event_loop())
    print("INFO:     SENTINEL backend started")
    print("INFO:     WebSocket ready on ws://127.0.0.1:8000/ws/live")
    yield

app = FastAPI(title="SENTINEL API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST Endpoints ────────────────────────────────────────────────────────────
@app.get("/status")
def status():
    entities = get_all_entities()
    scores   = [e["risk_score"] for e in entities]
    tension  = round(sum(scores) / len(scores), 1) if scores else 0
    blocks   = sum(1 for e in event_log if e["decision"] == "BLOCK")
    challenges = sum(1 for e in event_log if e["decision"] == "CHALLENGE")
    return {
        "status":       "online",
        "timestamp":    datetime.now(timezone.utc).isoformat(),
        "tension":      tension,
        "total_events": len(event_log),
        "blocks":       blocks,
        "challenges":   challenges,
        "active_connections": len(manager.active),
    }

@app.get("/entities")
def entities():
    return get_all_entities()

@app.get("/entity/{entity_id}")
def entity(entity_id: str):
    e = get_entity_by_id(entity_id)
    if not e:
        return {"error": "Entity not found"}
    history = [ev for ev in event_log if ev["user"] == e["name"]]
    return {**e, "history": history[-20:]}

@app.get("/events")
def events(limit: int = 50):
    return list(reversed(event_log[-limit:]))

@app.get("/incidents")
def incidents():
    return [e for e in event_log if e["kill_chain_id"] is not None]

# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send last 10 events immediately on connect
        for event in list(reversed(event_log[-10:])):
            await websocket.send_text(json.dumps(event))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)