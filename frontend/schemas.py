from pydantic import BaseModel
from typing import Optional, List

class ScoreFactor(BaseModel):
    name: str
    contribution: float

class ScoreBreakdown(BaseModel):
    network: float
    identity: float
    device: float
    factors: List[ScoreFactor]

class Event(BaseModel):
    id: str
    timestamp: str
    severity: str
    attack_cat: str
    type: str
    user: str
    device: str
    src_ip: str
    location: str
    risk_score: float
    prev_score: float
    trust_reserve: float
    score_breakdown: ScoreBreakdown
    decision: str
    confidence: float
    explanation: str
    kill_chain_id: Optional[str] = None
    kill_chain_step: Optional[int] = None
    kill_chain_phase: Optional[str] = None
    model_version: str = "1.0.0"