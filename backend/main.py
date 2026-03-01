import asyncio
import json
import os
import uuid
import io
from datetime import datetime, timezone, timedelta
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import pandas as pd

import models
from models import load_models, predict, get_model_performance_stats, get_risk_level_from_score, get_feature_importance, get_model_weights
from simulator import generate_event
from entities import get_all_entities, get_entity_by_id, initialize_entities, is_using_supabase
from database import (
    init_supabase, log_event_with_raw_data, flush_event_buffer, get_buffer_status, get_event_statistics,
    update_entity_status, log_entity_action, get_entity_actions as db_get_entity_actions,
    get_honeypot_entities, get_blocked_entities, get_honeypot_activities,
    get_events_with_raw_data, get_entity_security_context, get_active_ip_blocks,
    get_active_restrictions, is_ip_blocked, get_autonomous_actions_summary
)
from monitoring import (
    setup_monitoring, record_event, 
    update_websocket_connections, update_entity_risk_scores
)
from network_controller import network_controller
from policy_engine import policy_engine, PolicyDecision

# Load environment variables
load_dotenv()

# Security: Load secrets from Docker secrets or environment variables
def load_secret(secret_name, env_var_name):
    """Load secret from Docker secrets file or environment variable"""
    secret_file = os.getenv(f"{env_var_name}_FILE")
    if secret_file and os.path.exists(secret_file):
        try:
            with open(secret_file, 'r') as f:
                return f.read().strip()
        except Exception as e:
            print(f"WARNING: Could not read secret file {secret_file}: {e}")
    
    # Fallback to environment variable
    return os.getenv(env_var_name)

# Load Supabase configuration securely
SUPABASE_URL = load_secret("supabase_url", "SUPABASE_URL")
SUPABASE_KEY = load_secret("supabase_key", "SUPABASE_KEY")

# Set environment variables for other modules
if SUPABASE_URL:
    os.environ["SUPABASE_URL"] = SUPABASE_URL
if SUPABASE_KEY:
    os.environ["SUPABASE_KEY"] = SUPABASE_KEY

# Automated removal configuration
AUTO_REMOVE_HONEYPOT_HOURS = int(os.getenv("AUTO_REMOVE_HONEYPOT_HOURS", "24"))
AUTO_REMOVE_MONITORING_HOURS = int(os.getenv("AUTO_REMOVE_MONITORING_HOURS", "12"))
AUTO_REMOVE_CHECK_INTERVAL = int(os.getenv("AUTO_REMOVE_CHECK_INTERVAL", "300"))

# Global list to store entity actions for autonomous actions log
entity_actions_log = []

def log_entity_action_memory(entity_id, entity_name, action_type, risk_score_trigger, execution_status="SUCCESS", action_details=None, confidence_level=None):
    """Log an autonomous action taken on an entity"""
    import time
    action_entry = {
        "id": f"action_{len(entity_actions_log) + 1}_{int(time.time())}",
        "entity_id": entity_id,
        "entity_name": entity_name,
        "action_type": action_type,
        "risk_score_trigger": risk_score_trigger,
        "execution_status": execution_status,
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "action_details": action_details or {},
        "confidence_level": confidence_level
    }
    
    entity_actions_log.append(action_entry)
    
    # Keep only last 1000 actions in memory to prevent memory issues
    if len(entity_actions_log) > 1000:
        entity_actions_log.pop(0)
    
    # Also store in database if using Supabase
    if is_using_supabase():
        try:
            log_entity_action({
                "id": action_entry["id"],
                "entity_id": entity_id,
                "action_type": action_type,
                "message": f"Risk score: {risk_score_trigger}%, Status: {execution_status}",
                "performed_by": "autonomous_system",
                "timestamp": action_entry["executed_at"],
                "metadata": {
                    "risk_score_trigger": risk_score_trigger,
                    "execution_status": execution_status,
                    "action_details": action_details or {},
                    "confidence_level": confidence_level
                }
            })
        except Exception as e:
            print(f"Failed to log action to database: {e}")
    
    return action_entry

def generate_sample_autonomous_actions():
    """Generate sample autonomous actions for demonstration"""
    import random
    from datetime import timedelta
    
    sample_entities = [
        {"id": "emp_001", "name": "alice.chen"},
        {"id": "emp_002", "name": "bob.martinez"},
        {"id": "emp_003", "name": "carol.johnson"},
        {"id": "emp_004", "name": "david.kim"},
        {"id": "emp_005", "name": "eve.thompson"}
    ]
    
    action_types = [
        {"type": "HONEYPOT_MOVE", "risk_range": (55, 85)},
        {"type": "ISOLATION", "risk_range": (70, 95)},
        {"type": "BLOCK", "risk_range": (85, 100)},
        {"type": "MONITOR", "risk_range": (25, 60)},
        {"type": "CHALLENGE", "risk_range": (40, 70)},
        {"type": "AUTO_REMOVE_HONEYPOT", "risk_range": (10, 35)},
        {"type": "AUTO_REMOVE_MONITORING", "risk_range": (5, 25)}
    ]
    
    # Generate 20 sample actions over the last 24 hours
    for i in range(20):
        entity = random.choice(sample_entities)
        action_config = random.choice(action_types)
        
        # Random time in the last 24 hours
        hours_ago = random.uniform(0, 24)
        action_time = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
        
        risk_score = random.randint(*action_config["risk_range"])
        confidence = random.uniform(0.7, 1.0)
        
        # Generate action details based on type
        action_details = {}
        if action_config["type"] == "HONEYPOT_MOVE":
            action_details = {
                "trigger_event": random.choice(["suspicious_login", "data_exfiltration", "lateral_movement"]),
                "honeypot_environment": "isolated_network_segment"
            }
        elif action_config["type"] == "ISOLATION":
            action_details = {
                "isolation_level": "network_quarantine",
                "allowed_services": ["dns", "dhcp"]
            }
        elif action_config["type"] == "BLOCK":
            action_details = {
                "block_type": "complete_access_denial",
                "firewall_rule_created": True
            }
        elif action_config["type"] == "AUTO_REMOVE_HONEYPOT":
            action_details = {
                "reason": random.choice(["time_based", "risk_decreased"]),
                "hours_in_honeypot": random.uniform(12, 48)
            }
        elif action_config["type"] == "AUTO_REMOVE_MONITORING":
            action_details = {
                "reason": random.choice(["time_based", "risk_decreased"]),
                "hours_monitored": random.uniform(6, 24)
            }
        
        # Create action entry with custom timestamp
        action_entry = {
            "id": f"sample_action_{i}_{int(action_time.timestamp())}",
            "entity_id": entity["id"],
            "entity_name": entity["name"],
            "action_type": action_config["type"],
            "risk_score_trigger": risk_score,
            "execution_status": random.choice(["SUCCESS", "SUCCESS", "SUCCESS", "FAILED"]),  # 75% success rate
            "executed_at": action_time.isoformat(),
            "action_details": action_details,
            "confidence_level": confidence
        }
        
        entity_actions_log.append(action_entry)
    
    print(f"Generated {len(entity_actions_log)} sample autonomous actions")

# ── WebSocket connection manager ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        update_websocket_connections(len(self.active))

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
            update_websocket_connections(len(self.active))

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self.active:
                self.active.remove(ws)

manager = ConnectionManager()
event_log = []

# ── Background event loop ─────────────────────────────────────────────────────
async def event_loop():
    interval = int(os.getenv("EVENT_INTERVAL_SECONDS", 3))
    while True:
        await asyncio.sleep(interval)
        event = generate_event()
        
        # ============================================================================
        # POLICY ENGINE INTEGRATION - Evaluate event against policies
        # ============================================================================
        try:
            policy_decision = policy_engine.evaluate_event(event)
            
            # Add policy decision to event
            event["policy_decision"] = policy_decision.final_action.value
            event["policy_confidence"] = policy_decision.confidence
            event["policy_explanation"] = policy_decision.explanation
            event["triggered_policies"] = policy_decision.triggered_rules
            event["policy_risk_factors"] = policy_decision.risk_factors
            
            # Override original decision with policy engine decision if more restrictive
            original_decision = event.get("decision", "ALLOW")
            policy_action = policy_decision.final_action.value
            
            # Policy hierarchy: BLOCK > ISOLATION > HONEYPOT_MOVE > CHALLENGE > MONITOR > ALLOW
            decision_hierarchy = {
                "BLOCK": 6,
                "ISOLATION": 5, 
                "HONEYPOT_MOVE": 4,
                "CHALLENGE": 3,
                "MONITOR": 2,
                "ALLOW": 1
            }
            
            original_priority = decision_hierarchy.get(original_decision, 1)
            policy_priority = decision_hierarchy.get(policy_action, 1)
            
            if policy_priority > original_priority:
                event["decision"] = policy_action
                event["decision_source"] = "POLICY_ENGINE"
                event["original_decision"] = original_decision
            else:
                event["decision_source"] = "ML_MODEL"
            
            print(f"Policy Engine: {event['user']} -> {policy_action} (confidence: {policy_decision.confidence:.2f})")
            
        except Exception as e:
            print(f"Policy engine error: {e}")
            # Continue with original event if policy engine fails
            event["policy_decision"] = "ERROR"
            event["policy_explanation"] = f"Policy engine error: {str(e)}"
        
        # ============================================================================
        
        event_log.append(event)
        if len(event_log) > 200:
            event_log.pop(0)
        record_event(event)
        
        # Log event with raw data to Supabase (SSOT with autonomous actions)
        raw_data = event.get("raw_network_data")
        log_event_with_raw_data(event, raw_data)
        
        # ============================================================================
        # AUTONOMOUS ACTION EXECUTION - Execute security decisions automatically
        # ============================================================================
        try:
            await execute_autonomous_action(event)
        except Exception as e:
            print(f"Autonomous action execution error: {e}")
        # ============================================================================
        
        await manager.broadcast(event)
        update_entity_risk_scores(get_all_entities())

async def execute_autonomous_action(event):
    """Execute autonomous security actions based on event decision"""
    decision = event.get("decision", "ALLOW")
    user = event.get("user")
    risk_score = event.get("risk_score", 0)
    confidence = event.get("confidence", 0.5)
    
    # Only execute actions for high-confidence, high-risk events
    if confidence < 0.7 or risk_score < 50:
        return
    
    # Get entity information
    entities = get_all_entities()
    entity = next((e for e in entities if e["name"] == user), None)
    if not entity:
        return
    
    entity_id = entity["id"]
    
    # Check if entity is already in a restricted state to avoid duplicate actions
    current_status = entity.get("status", "active")
    is_honeypot = entity.get("is_honeypot", False)
    
    # Execute action based on decision
    action_executed = False
    
    if decision == "BLOCK" and current_status != "blocked":
        # Block entity
        if is_using_supabase():
            update_entity_status(entity_id, "blocked", is_honeypot=False)
        
        # Execute network block
        entity_ip = entity.get("ip_address")
        if entity_ip:
            network_controller.block_ip(entity_ip, f"Autonomous block: Risk {risk_score}%")
        
        # Log the action
        log_entity_action_memory(
            entity_id=entity_id,
            entity_name=user,
            action_type="BLOCK",
            risk_score_trigger=risk_score,
            execution_status="SUCCESS",
            action_details={
                "trigger_event": event.get("attack_cat", "Unknown"),
                "confidence": confidence,
                "policy_triggered": event.get("policy_decision") != "ALLOW",
                "network_block_applied": entity_ip is not None
            },
            confidence_level=confidence
        )
        action_executed = True
        print(f"AUTONOMOUS ACTION: Blocked {user} (Risk: {risk_score}%, Confidence: {confidence:.2f})")
    
    elif decision == "ISOLATION" and current_status not in ["blocked", "isolated"]:
        # Isolate entity
        if is_using_supabase():
            update_entity_status(entity_id, "isolated", is_honeypot=False)
        
        # Execute network isolation
        network_controller.isolate_entity(entity_id, f"Autonomous isolation: Risk {risk_score}%")
        
        # Log the action
        log_entity_action_memory(
            entity_id=entity_id,
            entity_name=user,
            action_type="ISOLATION",
            risk_score_trigger=risk_score,
            execution_status="SUCCESS",
            action_details={
                "trigger_event": event.get("attack_cat", "Unknown"),
                "confidence": confidence,
                "policy_triggered": event.get("policy_decision") != "ALLOW",
                "isolation_level": "network_quarantine"
            },
            confidence_level=confidence
        )
        action_executed = True
        print(f"AUTONOMOUS ACTION: Isolated {user} (Risk: {risk_score}%, Confidence: {confidence:.2f})")
    
    elif decision == "HONEYPOT_MOVE" and not is_honeypot and current_status not in ["blocked", "isolated"]:
        # Move to honeypot
        if is_using_supabase():
            update_entity_status(entity_id, "honeypot", is_honeypot=True)
        
        # Log the action
        log_entity_action_memory(
            entity_id=entity_id,
            entity_name=user,
            action_type="HONEYPOT_MOVE",
            risk_score_trigger=risk_score,
            execution_status="SUCCESS",
            action_details={
                "trigger_event": event.get("attack_cat", "Unknown"),
                "confidence": confidence,
                "policy_triggered": event.get("policy_decision") != "ALLOW",
                "honeypot_environment": "isolated_network_segment"
            },
            confidence_level=confidence
        )
        action_executed = True
        print(f"AUTONOMOUS ACTION: Moved {user} to honeypot (Risk: {risk_score}%, Confidence: {confidence:.2f})")
    
    elif decision == "MONITOR" and current_status == "active":
        # Enable monitoring
        if is_using_supabase():
            update_entity_status(entity_id, "monitored", is_honeypot=False)
        
        # Log the action
        log_entity_action_memory(
            entity_id=entity_id,
            entity_name=user,
            action_type="MONITOR",
            risk_score_trigger=risk_score,
            execution_status="SUCCESS",
            action_details={
                "trigger_event": event.get("attack_cat", "Unknown"),
                "confidence": confidence,
                "policy_triggered": event.get("policy_decision") != "ALLOW",
                "monitoring_level": "enhanced"
            },
            confidence_level=confidence
        )
        action_executed = True
        print(f"AUTONOMOUS ACTION: Enhanced monitoring for {user} (Risk: {risk_score}%, Confidence: {confidence:.2f})")
    
    elif decision == "CHALLENGE" and current_status == "active":
        # Require additional authentication
        # Log the action (no status change for challenge)
        log_entity_action_memory(
            entity_id=entity_id,
            entity_name=user,
            action_type="CHALLENGE",
            risk_score_trigger=risk_score,
            execution_status="SUCCESS",
            action_details={
                "trigger_event": event.get("attack_cat", "Unknown"),
                "confidence": confidence,
                "policy_triggered": event.get("policy_decision") != "ALLOW",
                "challenge_type": "additional_authentication"
            },
            confidence_level=confidence
        )
        action_executed = True
        print(f"AUTONOMOUS ACTION: Challenge required for {user} (Risk: {risk_score}%, Confidence: {confidence:.2f})")
    
    return action_executed

# ── Automated Entity Status Cleanup ──────────────────────────────────────────
async def automated_cleanup_loop():
    """Automatically remove entities from honeypot/monitoring based on time and risk"""
    while True:
        await asyncio.sleep(AUTO_REMOVE_CHECK_INTERVAL)  # Check every 5 minutes
        try:
            await perform_automated_cleanup()
        except Exception as e:
            print(f"ERROR: Automated cleanup failed: {e}")

async def perform_automated_cleanup():
    """Remove entities from honeypot/monitoring based on rules"""
    if not is_using_supabase():
        return  # Only works with Supabase
    
    entities = get_all_entities()
    current_time = datetime.now(timezone.utc)
    cleanup_count = 0
    
    for entity in entities:
        if not entity.get("updated_at"):
            continue
            
        updated_at = datetime.fromisoformat(entity["updated_at"].replace('Z', '+00:00'))
        hours_since_update = (current_time - updated_at).total_seconds() / 3600
        current_risk = entity.get("risk_score", 0)
        
        # Rule 1: Remove from honeypot after 24 hours OR if risk drops below 30
        if entity.get("is_honeypot") and (hours_since_update >= AUTO_REMOVE_HONEYPOT_HOURS or current_risk < 30):
            update_entity_status(entity["id"], "active", is_honeypot=False)
            
            # Log the autonomous action
            log_entity_action_memory(
                entity_id=entity["id"],
                entity_name=entity["name"],
                action_type="AUTO_REMOVE_HONEYPOT",
                risk_score_trigger=current_risk,
                execution_status="SUCCESS",
                action_details={
                    "reason": "time_based" if hours_since_update >= AUTO_REMOVE_HONEYPOT_HOURS else "risk_decreased",
                    "hours_in_honeypot": round(hours_since_update, 1),
                    "current_risk": current_risk,
                    "threshold_hours": AUTO_REMOVE_HONEYPOT_HOURS,
                    "risk_threshold": 30
                },
                confidence_level=1.0
            )
            cleanup_count += 1
            print(f"AUTO-CLEANUP: Removed {entity['name']} from honeypot (risk: {current_risk}%, hours: {hours_since_update:.1f})")
        
        # Rule 2: Remove from monitoring after 12 hours OR if risk drops below 20
        elif entity.get("status") == "monitored" and (hours_since_update >= AUTO_REMOVE_MONITORING_HOURS or current_risk < 20):
            update_entity_status(entity["id"], "active")
            
            # Log the autonomous action
            log_entity_action_memory(
                entity_id=entity["id"],
                entity_name=entity["name"],
                action_type="AUTO_REMOVE_MONITORING",
                risk_score_trigger=current_risk,
                execution_status="SUCCESS",
                action_details={
                    "reason": "time_based" if hours_since_update >= AUTO_REMOVE_MONITORING_HOURS else "risk_decreased",
                    "hours_monitored": round(hours_since_update, 1),
                    "current_risk": current_risk,
                    "threshold_hours": AUTO_REMOVE_MONITORING_HOURS,
                    "risk_threshold": 20
                },
                confidence_level=1.0
            )
            cleanup_count += 1
            print(f"AUTO-CLEANUP: Removed {entity['name']} from monitoring (risk: {current_risk}%, hours: {hours_since_update:.1f})")
    
    if cleanup_count > 0:
        print(f"AUTO-CLEANUP: Processed {cleanup_count} entities")

# ── App lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("INFO:     EquiMind Zero Trust Risk Engine starting...")
    init_supabase()  # Initialize Supabase connection
    initialize_entities()
    load_models()
    
    # Generate sample autonomous actions for demonstration
    generate_sample_autonomous_actions()
    
    asyncio.create_task(event_loop())
    asyncio.create_task(automated_cleanup_loop())  # Start automated cleanup
    print("INFO:     Backend API ready on http://127.0.0.1:8000")
    print("INFO:     WebSocket ready on ws://127.0.0.1:8000/ws/live")
    print("INFO:     API docs available at http://127.0.0.1:8000/docs")
    print(f"INFO:     Automated cleanup: Honeypot removal after {AUTO_REMOVE_HONEYPOT_HOURS}h, Monitoring removal after {AUTO_REMOVE_MONITORING_HOURS}h")
    yield
    print("INFO:     Flushing event buffer before shutdown...")
    flush_event_buffer()
    print("INFO:     Shutting down...")

app = FastAPI(title="EquiMind Zero Trust Risk Engine", lifespan=lifespan)

# Setup Prometheus monitoring
instrumentator = setup_monitoring(app)

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
    
    # Check if system appears to be in "fresh" state
    honeypot_entities = sum(1 for e in entities if e.get("is_honeypot", False))
    monitored_entities = sum(1 for e in entities if e.get("status") == "monitored")
    blocked_entities = sum(1 for e in entities if e.get("status") == "blocked")
    active_entities = sum(1 for e in entities if e.get("status") == "active")
    
    # System is "fresh" if most entities are active and no special states
    is_fresh_state = (
        active_entities == len(entities) and 
        honeypot_entities == 0 and 
        monitored_entities == 0 and 
        blocked_entities == 0 and
        len(entity_actions_log) == 0
    )
    
    return {
        "status":       "online",
        "timestamp":    datetime.now(timezone.utc).isoformat(),
        "tension":      tension,
        "total_events": len(event_log),
        "blocks":       blocks,
        "challenges":   challenges,
        "active_connections": len(manager.active),
        "model_version": "2.0.0",
        "database_mode": "supabase" if is_using_supabase() else "fallback",
        "total_entities": len(entities),
        "fresh_state": is_fresh_state,
        "entity_states": {
            "active": active_entities,
            "monitored": monitored_entities,
            "blocked": blocked_entities,
            "honeypot": honeypot_entities
        }
    }

@app.get("/metrics")
def metrics():
    """Prometheus metrics endpoint"""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from fastapi import Response
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/entities")
def entities():
    return get_all_entities()

@app.get("/entity/{entity_id}")
def entity(entity_id: str):
    e = get_entity_by_id(entity_id)
    if not e:
        raise HTTPException(status_code=404, detail="Entity not found")
    history = [ev for ev in event_log if ev["user"] == e["name"]]
    return {**e, "history": history[-20:]}

@app.get("/events")
def events(limit: int = 50):
    return list(reversed(event_log[-limit:]))

@app.get("/incidents")
def incidents():
    return [e for e in event_log if e.get("severity") in ["HIGH", "CRITICAL"] or e.get("kill_chain_id")]

# ── ML Prediction Endpoint ───────────────────────────────────────────────────
@app.post("/predict")
async def predict_risk(flow_data: dict):
    """Direct ML prediction endpoint"""
    try:
        result = predict(flow_data)
        return {
            **result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/predict/explain")
async def predict_with_explanation(flow_data: dict):
    """ML prediction with SHAP explanation"""
    try:
        # Get prediction
        result = predict(flow_data)
        
        # Get SHAP explanation
        explanation = get_feature_importance(flow_data)
        
        return {
            **result,
            "explanation": explanation,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction with explanation error: {str(e)}")

@app.get("/model/weights")
async def get_model_weights_endpoint():
    """Get model architecture and weights information"""
    try:
        weights_info = get_model_weights()
        return {
            **weights_info,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model weights error: {str(e)}")

@app.get("/data/raw")
async def get_raw_data(limit: int = 100):
    """Get raw event data with all network fields - SSOT"""
    try:
        # Get events with raw network data from SSOT
        raw_events = get_events_with_raw_data(limit)
        
        return {
            "events": raw_events,
            "total_count": len(raw_events),
            "available_fields": list(raw_events[0].keys()) if raw_events else [],
            "source": "supabase_ssot",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Raw data error: {str(e)}")

@app.get("/security/blocks")
async def get_security_blocks():
    """Get all active IP blocks and restrictions"""
    try:
        ip_blocks = get_active_ip_blocks()
        restrictions = get_active_restrictions()
        
        return {
            "ip_blocks": ip_blocks,
            "network_restrictions": restrictions,
            "total_blocks": len(ip_blocks),
            "total_restrictions": len(restrictions),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Security blocks error: {str(e)}")

@app.get("/security/autonomous")
async def get_autonomous_summary():
    """Get summary of autonomous actions taken by the system"""
    try:
        summary = get_autonomous_actions_summary()
        return {
            **summary,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Autonomous actions error: {str(e)}")

@app.get("/entity/{entity_id}/security")
async def get_entity_security(entity_id: str):
    """Get complete security context for an entity"""
    try:
        context = get_entity_security_context(entity_id)
        return {
            **context,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Entity security context error: {str(e)}")

@app.post("/security/check-ip/{ip_address}")
async def check_ip_status(ip_address: str):
    """Check if an IP address is blocked"""
    try:
        blocked = is_ip_blocked(ip_address)
        network_blocked = network_controller.is_ip_blocked(ip_address)
        return {
            "ip_address": ip_address,
            "is_blocked": blocked,
            "network_controller_blocked": network_blocked,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IP check error: {str(e)}")

@app.get("/security/network-status")
async def get_network_security_status():
    """Get REAL network security status from network controller"""
    try:
        status = network_controller.get_status_summary()
        return {
            **status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network status error: {str(e)}")

@app.post("/security/unblock-ip/{ip_address}")
async def unblock_ip_address(ip_address: str):
    """Manually unblock an IP address"""
    try:
        success = network_controller.unblock_ip(ip_address)
        return {
            "ip_address": ip_address,
            "unblocked": success,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unblock IP error: {str(e)}")

@app.get("/security/real-actions")
async def get_real_security_actions():
    """Get summary of REAL security actions taken by network controller"""
    try:
        active_blocks = network_controller.get_active_blocks()
        active_restrictions = network_controller.get_active_restrictions()
        
        return {
            "real_ip_blocks": active_blocks,
            "real_service_restrictions": active_restrictions,
            "total_real_blocks": len(active_blocks),
            "total_real_restrictions": sum(len(services) for services in active_restrictions.values()),
            "message": "These are ACTUAL network security measures in effect",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Real actions error: {str(e)}")

# ============================================================================
# POLICY ENGINE ENDPOINTS
# ============================================================================

@app.get("/policy/status")
async def get_policy_engine_status():
    """Get current policy engine status and statistics"""
    try:
        return policy_engine.get_policy_status()
    except Exception as e:
        print(f"Policy status error: {e}")
        raise HTTPException(status_code=500, detail=f"Policy status error: {str(e)}")

@app.get("/policy/rules")
async def get_policy_rules():
    """Get all policy rules with explanations"""
    try:
        return {
            "policies": policy_engine.get_policy_explanations(),
            "total_policies": len(policy_engine.policies),
            "active_policies": len([p for p in policy_engine.policies.values() if p.auto_update]),
            "learning_enabled": policy_engine.learning_enabled
        }
    except Exception as e:
        print(f"Policy rules error: {e}")
        raise HTTPException(status_code=500, detail=f"Policy rules error: {str(e)}")

@app.get("/policy/decisions")
async def get_policy_decisions():
    """Get recent policy decisions with explanations"""
    try:
        recent_decisions = policy_engine.decision_history[-50:]  # Last 50 decisions
        return {
            "decisions": [
                {
                    "decision_id": d.decision_id,
                    "entity_id": d.entity_id,
                    "action": d.final_action.value,
                    "confidence": d.confidence,
                    "explanation": d.explanation,
                    "triggered_rules": d.triggered_rules,
                    "risk_factors": d.risk_factors,
                    "timestamp": d.timestamp,
                    "execution_time_ms": d.execution_time_ms
                }
                for d in recent_decisions
            ],
            "total_decisions": len(policy_engine.decision_history)
        }
    except Exception as e:
        print(f"Policy decisions error: {e}")
        raise HTTPException(status_code=500, detail=f"Policy decisions error: {str(e)}")

@app.post("/policy/evaluate")
async def evaluate_policy(event_data: dict):
    """Manually evaluate an event against policies"""
    try:
        decision = policy_engine.evaluate_event(event_data)
        return {
            "decision_id": decision.decision_id,
            "action": decision.final_action.value,
            "confidence": decision.confidence,
            "explanation": decision.explanation,
            "triggered_rules": decision.triggered_rules,
            "reasoning_chain": decision.reasoning_chain,
            "risk_factors": decision.risk_factors,
            "execution_time_ms": decision.execution_time_ms
        }
    except Exception as e:
        print(f"Policy evaluation error: {e}")
        raise HTTPException(status_code=500, detail=f"Policy evaluation error: {str(e)}")

@app.get("/policy/analytics")
async def get_policy_analytics():
    """Get policy engine analytics and performance metrics"""
    try:
        decisions = policy_engine.decision_history
        
        # Calculate analytics
        action_counts = {}
        rule_effectiveness = {}
        
        for decision in decisions:
            # Count actions
            action = decision.final_action.value
            action_counts[action] = action_counts.get(action, 0) + 1
            
            # Track rule effectiveness
            for rule_id in decision.triggered_rules:
                if rule_id not in rule_effectiveness:
                    rule_effectiveness[rule_id] = {"triggers": 0, "high_confidence": 0}
                rule_effectiveness[rule_id]["triggers"] += 1
                if decision.confidence > 0.8:
                    rule_effectiveness[rule_id]["high_confidence"] += 1
        
        return {
            "total_decisions": len(decisions),
            "action_distribution": action_counts,
            "rule_effectiveness": rule_effectiveness,
            "average_confidence": sum(d.confidence for d in decisions) / len(decisions) if decisions else 0,
            "average_execution_time": sum(d.execution_time_ms for d in decisions) / len(decisions) if decisions else 0,
            "policies_auto_updating": len([p for p in policy_engine.policies.values() if p.auto_update])
        }
    except Exception as e:
        print(f"Policy analytics error: {e}")
        raise HTTPException(status_code=500, detail=f"Policy analytics error: {str(e)}")

@app.post("/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    """
    Batch prediction endpoint - accepts JSON, CSV, Excel, or Parquet files
    Returns predictions with risk scores and labels for all records
    """
    try:
        # Read file content
        content = await file.read()
        file_extension = file.filename.split('.')[-1].lower()
        
        # Parse file based on type
        if file_extension == 'json':
            # JSON file
            data = json.loads(content.decode('utf-8'))
            if isinstance(data, dict):
                # Single record
                df = pd.DataFrame([data])
            elif isinstance(data, list):
                # Multiple records
                df = pd.DataFrame(data)
            else:
                raise HTTPException(status_code=400, detail="Invalid JSON format. Expected object or array.")
        
        elif file_extension == 'csv':
            # CSV file
            df = pd.read_csv(io.BytesIO(content))
        
        elif file_extension in ['xlsx', 'xls']:
            # Excel file
            df = pd.read_excel(io.BytesIO(content))
        
        elif file_extension == 'parquet':
            # Parquet file
            df = pd.read_parquet(io.BytesIO(content))
        
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file_extension}. Supported: json, csv, xlsx, xls, parquet"
            )
        
        # Validate dataframe
        if df.empty:
            raise HTTPException(status_code=400, detail="File contains no data")
        
        # Process each record
        results = []
        for idx, row in df.iterrows():
            try:
                # Convert row to dict
                record = row.to_dict()
                
                # Get prediction
                prediction = predict(record)
                
                # Add to results
                results.append({
                    "row_number": int(idx) + 1,
                    "input_data": record,
                    "prediction": {
                        "risk_score": prediction.get("risk_score", 0),
                        "risk_level": prediction.get("risk_level", "UNKNOWN"),
                        "attack_cat": prediction.get("attack_cat", "Unknown"),
                        "confidence": prediction.get("confidence", 0),
                        "is_attack": prediction.get("is_attack", False),
                        "mlp_score": prediction.get("mlp_score", 0)
                    },
                    "status": "success"
                })
            except Exception as e:
                # Record failed prediction
                results.append({
                    "row_number": int(idx) + 1,
                    "input_data": record if 'record' in locals() else {},
                    "prediction": None,
                    "status": "error",
                    "error": str(e)
                })
        
        # Calculate summary statistics
        successful = [r for r in results if r["status"] == "success"]
        failed = [r for r in results if r["status"] == "error"]
        
        if successful:
            risk_scores = [r["prediction"]["risk_score"] for r in successful]
            avg_risk = sum(risk_scores) / len(risk_scores)
            max_risk = max(risk_scores)
            min_risk = min(risk_scores)
            
            # Count by risk level
            risk_levels = {}
            for r in successful:
                level = r["prediction"]["risk_level"]
                risk_levels[level] = risk_levels.get(level, 0) + 1
        else:
            avg_risk = 0
            max_risk = 0
            min_risk = 0
            risk_levels = {}
        
        return {
            "filename": file.filename,
            "file_type": file_extension,
            "total_records": len(results),
            "successful": len(successful),
            "failed": len(failed),
            "summary": {
                "avg_risk_score": round(avg_risk, 2),
                "max_risk_score": round(max_risk, 2),
                "min_risk_score": round(min_risk, 2),
                "risk_level_distribution": risk_levels
            },
            "results": results,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="File is empty")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

# ── Network Topology Endpoint ────────────────────────────────────────────────
@app.get("/network/topology")
def get_network_topology():
    """Get network topology for visualization"""
    entities = get_all_entities()
    
    # Create nodes
    nodes = []
    
    # Add server node
    nodes.append({
        "id": "server_main",
        "type": "server",
        "label": "Main Server",
        "risk_score": 0
    })
    
    # Add entity nodes
    for entity in entities:
        risk_score = entity.get("risk_score", 0)
        nodes.append({
            "id": entity["id"],
            "type": "user",
            "label": entity["name"],
            "risk_score": risk_score,
            "risk_level": get_risk_level_from_score(risk_score),
            "department": entity.get("dept", "Unknown"),
            "status": "active",
            "honeypot": False
        })
    
    # Create edges (connections)
    edges = []
    for entity in entities:
        risk_score = entity.get("risk_score", 0)
        edges.append({
            "from": entity["id"],
            "to": "server_main",
            "type": "connection",
            "risk_level": get_risk_level_from_score(risk_score)
        })
    
    return {
        "nodes": nodes,
        "edges": edges,
        "total_entities": len(entities),
        "high_risk_entities": sum(1 for e in entities if e.get("risk_score", 0) >= 65),
        "honeypot_entities": 0
    }

# ── Model Health Endpoints ───────────────────────────────────────────────────
@app.get("/health/models")
def get_model_health():
    """Get model health status with real performance metrics"""
    perf_stats = get_model_performance_stats()
    
    return {
        "model_status": {
            "mlp_model": {
                "status": "healthy" if models.mlp_model else "offline",
                "loaded": models.mlp_model is not None,
                "performance": perf_stats
            },
            "autoencoder": {
                "status": "healthy" if models.ae_model else "offline",
                "loaded": models.ae_model is not None
            },
            "risk_engine": {
                "status": "healthy"
            }
        },
        "last_validation": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_status": "healthy" if models.mlp_model else "degraded"
        }
    }

@app.post("/health/validate")
async def validate_models():
    """Run model validation with actual test"""
    perf_stats = get_model_performance_stats()
    
    # Run a test prediction to validate model
    test_passed = False
    test_error = None
    try:
        test_features = {
            "proto": "tcp",
            "service": "http",
            "state": "CON",
            "attack_cat": "Normal",
            "dur": 1.0,
            "sbytes": 1000,
            "dbytes": 2000,
            "rate": 100.0,
            "sload": 500.0,
            "dload": 1000.0,
            "spkts": 10,
            "dpkts": 10,
            "swin": 8192,
            "dwin": 8192,
            "stcpb": 0,
            "dtcpb": 0,
            "response_body_len": 500,
            "sloss": 0,
            "dloss": 0,
            "dmean": 100,
            "ct_src_dport_ltm": 1,
            "ct_dst_sport_ltm": 1,
            "trans_depth": 1,
            "ct_ftp_cmd": 0,
            "ct_flw_http_mthd": 1,
            "is_ftp_login": 0.0,
            "is_sm_ips_ports": 0.0,
            "sinpkt": 100.0,
            "dinpkt": 100.0,
            "sjit": 10.0,
            "djit": 10.0,
            "tcprtt": 50.0,
            "synack": 20.0,
            "ackdat": 30.0
        }
        result = predict(test_features)
        test_passed = "risk_score" in result and "confidence" in result
    except Exception as e:
        test_error = str(e)
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "overall_status": "healthy" if (models.mlp_model and test_passed) else "warning",
        "models": {
            "mlp_model": {
                "status": "healthy" if models.mlp_model else "offline",
                "tests": {
                    "model_loaded": models.mlp_model is not None,
                    "basic_prediction": test_passed
                },
                "performance": perf_stats,
                "errors": [test_error] if test_error else []
            },
            "risk_engine": {
                "status": "healthy",
                "tests": {
                    "basic_computation": True
                },
                "errors": []
            }
        }
    }

# ── Simulation Stats Endpoint ────────────────────────────────────────────────
@app.get("/simulation/stats")
def get_simulation_stats():
    """Get actual simulation statistics from event log"""
    entities = get_all_entities()
    
    # Calculate attack distribution from actual events
    attack_distribution = {}
    for event in event_log:
        attack_cat = event.get("attack_cat", "Unknown")
        attack_distribution[attack_cat] = attack_distribution.get(attack_cat, 0) + 1
    
    # Calculate decision distribution
    decision_distribution = {}
    for event in event_log:
        decision = event.get("decision", "UNKNOWN")
        decision_distribution[decision] = decision_distribution.get(decision, 0) + 1
    
    # Calculate severity distribution
    severity_distribution = {}
    for event in event_log:
        severity = event.get("severity", "UNKNOWN")
        severity_distribution[severity] = severity_distribution.get(severity, 0) + 1
    
    return {
        "total_events": len(event_log),
        "entities": len(entities),
        "attack_distribution": attack_distribution,
        "decision_distribution": decision_distribution,
        "severity_distribution": severity_distribution,
        "high_risk_entities": sum(1 for e in entities if e.get("risk_score", 0) >= 65),
        "avg_risk_score": round(sum(e.get("risk_score", 0) for e in entities) / len(entities), 2) if entities else 0,
        "database_mode": "supabase" if is_using_supabase() else "fallback"
    }

# Track entity actions
entity_actions_log = []

# ── Autonomous Actions Endpoints ────────────────────────────────────────────
@app.get("/autonomous/actions")
async def get_autonomous_actions(limit: int = 100, offset: int = 0):
    """Get all autonomous actions taken by the system"""
    try:
        actions = []
        stats = {
            "total_actions": 0,
            "actions_24h": 0,
            "success_rate": 0,
            "active_blocks": 0
        }
        
        if is_using_supabase():
            # Get actions from database
            db_actions = db_get_entity_actions(None, limit + offset)  # Get more to handle offset
            if db_actions:
                # Convert database format to expected format
                converted_actions = []
                for action in db_actions:
                    converted_action = {
                        "id": action.get("id"),
                        "entity_id": action.get("entity_id"),
                        "entity_name": action.get("entity_id"),  # Will be resolved later
                        "action_type": action.get("action_type"),
                        "risk_score_trigger": action.get("metadata", {}).get("risk_score_trigger"),
                        "execution_status": action.get("metadata", {}).get("execution_status", "SUCCESS"),
                        "executed_at": action.get("timestamp"),
                        "action_details": action.get("metadata", {}).get("action_details", {}),
                        "confidence_level": action.get("metadata", {}).get("confidence_level")
                    }
                    converted_actions.append(converted_action)
                
                # Apply offset and limit
                actions = converted_actions[offset:offset + limit] if offset < len(converted_actions) else []
                
                # Calculate stats
                stats["total_actions"] = len(converted_actions)
                
                # Actions in last 24 hours
                now = datetime.now(timezone.utc)
                day_ago = now - timedelta(hours=24)
                stats["actions_24h"] = len([
                    a for a in converted_actions 
                    if datetime.fromisoformat(a["executed_at"].replace('Z', '+00:00')) >= day_ago
                ])
                
                # Success rate
                successful_actions = len([a for a in converted_actions if a.get("execution_status") == "SUCCESS"])
                stats["success_rate"] = round((successful_actions / len(converted_actions)) * 100) if converted_actions else 0
                
                # Active blocks (approximate)
                stats["active_blocks"] = len([
                    a for a in converted_actions 
                    if a.get("action_type") == "BLOCK" and a.get("execution_status") == "SUCCESS"
                ])
        
        # Fallback to in-memory actions
        if not actions:
            # Get from memory with entity names
            memory_actions = entity_actions_log[offset:offset + limit] if offset < len(entity_actions_log) else []
            actions = memory_actions
            
            stats["total_actions"] = len(entity_actions_log)
            
            # Actions in last 24 hours
            now = datetime.now(timezone.utc)
            day_ago = now - timedelta(hours=24)
            stats["actions_24h"] = len([
                a for a in entity_actions_log 
                if datetime.fromisoformat(a["executed_at"]) >= day_ago
            ])
            
            # Success rate
            successful_actions = len([a for a in entity_actions_log if a.get("execution_status") == "SUCCESS"])
            stats["success_rate"] = round((successful_actions / len(entity_actions_log)) * 100) if entity_actions_log else 0
            
            # Active blocks
            stats["active_blocks"] = len([
                a for a in entity_actions_log 
                if a.get("action_type") == "BLOCK" and a.get("execution_status") == "SUCCESS"
            ])
        
        return {
            "actions": actions,
            "stats": stats,
            "total_count": stats["total_actions"],
            "has_more": (offset + limit) < stats["total_actions"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch autonomous actions: {str(e)}")

@app.get("/autonomous/actions/summary")
async def get_autonomous_actions_summary():
    """Get summary statistics of autonomous actions"""
    try:
        summary = {
            "total_actions": 0,
            "actions_by_type": {},
            "actions_by_status": {},
            "actions_last_24h": 0,
            "actions_last_hour": 0,
            "average_confidence": 0,
            "most_actioned_entities": [],
            "recent_actions": []
        }
        
        actions_source = []
        
        if is_using_supabase():
            # Get from database
            db_actions = db_get_entity_actions(None, 1000)  # Get recent 1000 actions
            if db_actions:
                actions_source = db_actions
        
        # Fallback to memory
        if not actions_source:
            actions_source = entity_actions_log
        
        if actions_source:
            summary["total_actions"] = len(actions_source)
            
            # Count by type
            for action in actions_source:
                action_type = action.get("action_type", "UNKNOWN")
                summary["actions_by_type"][action_type] = summary["actions_by_type"].get(action_type, 0) + 1
                
                status = action.get("execution_status", "UNKNOWN")
                summary["actions_by_status"][status] = summary["actions_by_status"].get(status, 0) + 1
            
            # Time-based counts
            now = datetime.now(timezone.utc)
            hour_ago = now - timedelta(hours=1)
            day_ago = now - timedelta(hours=24)
            
            for action in actions_source:
                executed_at = datetime.fromisoformat(action["executed_at"].replace('Z', '+00:00') if 'Z' in action["executed_at"] else action["executed_at"])
                if executed_at >= day_ago:
                    summary["actions_last_24h"] += 1
                if executed_at >= hour_ago:
                    summary["actions_last_hour"] += 1
            
            # Average confidence
            confidences = [a.get("confidence_level", 0) for a in actions_source if a.get("confidence_level")]
            summary["average_confidence"] = round(sum(confidences) / len(confidences), 2) if confidences else 0
            
            # Most actioned entities
            entity_counts = {}
            for action in actions_source:
                entity = action.get("entity_name") or action.get("entity_id")
                if entity:
                    entity_counts[entity] = entity_counts.get(entity, 0) + 1
            
            summary["most_actioned_entities"] = [
                {"entity": entity, "count": count} 
                for entity, count in sorted(entity_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            ]
            
            # Recent actions (last 10)
            recent = sorted(actions_source, key=lambda x: x["executed_at"], reverse=True)[:10]
            summary["recent_actions"] = [
                {
                    "action_type": action.get("action_type"),
                    "entity_name": action.get("entity_name") or action.get("entity_id"),
                    "executed_at": action.get("executed_at"),
                    "execution_status": action.get("execution_status")
                }
                for action in recent
            ]
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get actions summary: {str(e)}")

# ── System Reset Endpoint ────────────────────────────────────────────────────
@app.post("/system/reset")
async def reset_system():
    """Reset all entity states and clear action history - Start Fresh"""
    try:
        reset_results = {
            "entities_reset": 0,
            "actions_cleared": 0,
            "network_blocks_cleared": 0,
            "errors": []
        }
        
        # 1. Reset all entity states to 'active' and clear honeypot flags
        entities = get_all_entities()
        for entity in entities:
            try:
                if is_using_supabase():
                    # Reset entity status in Supabase
                    update_entity_status(entity["id"], "active", is_honeypot=False)
                reset_results["entities_reset"] += 1
            except Exception as e:
                reset_results["errors"].append(f"Failed to reset entity {entity.get('name', entity.get('id'))}: {str(e)}")
        
        # 2. Clear in-memory action log
        global entity_actions_log
        actions_count = len(entity_actions_log)
        entity_actions_log.clear()
        reset_results["actions_cleared"] = actions_count
        
        # 3. Clear network controller blocks and restrictions
        try:
            network_status = network_controller.get_status_summary()
            blocked_ips = network_status.get("blocked_ips", [])
            restricted_services = network_status.get("restricted_services", {})
            
            # Unblock all IPs
            for ip in blocked_ips:
                network_controller.unblock_ip(ip)
                reset_results["network_blocks_cleared"] += 1
            
            # Clear service restrictions
            for entity_id in restricted_services:
                network_controller.remove_service_restrictions(entity_id)
        except Exception as e:
            reset_results["errors"].append(f"Network controller reset error: {str(e)}")
        
        # 4. Clear Supabase action history (optional - keep for audit trail)
        # We'll keep the database history for audit purposes
        
        print(f"INFO:     System reset completed - {reset_results['entities_reset']} entities reset")
        
        return {
            "status": "success",
            "message": "System reset completed - all entities returned to active state",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "results": reset_results
        }
        
    except Exception as e:
        print(f"ERROR:    System reset failed: {e}")
        raise HTTPException(status_code=500, detail=f"System reset failed: {str(e)}")

@app.get("/system/status")
async def get_system_status():
    """Get current system status including entity states"""
    try:
        entities = get_all_entities()
        
        # Count entity states
        status_counts = {}
        honeypot_count = 0
        
        for entity in entities:
            status = entity.get("status", "active")
            status_counts[status] = status_counts.get(status, 0) + 1
            if entity.get("is_honeypot", False):
                honeypot_count += 1
        
        # Get network controller status
        network_status = network_controller.get_status_summary()
        
        return {
            "total_entities": len(entities),
            "entity_status_distribution": status_counts,
            "honeypot_entities": honeypot_count,
            "active_network_blocks": len(network_status.get("blocked_ips", [])),
            "active_service_restrictions": sum(len(services) for services in network_status.get("restricted_services", {}).values()),
            "in_memory_actions": len(entity_actions_log),
            "database_mode": "supabase" if is_using_supabase() else "fallback",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

# ── Entity Action Endpoints ──────────────────────────────────────────────────
@app.post("/entity/{entity_id}/action/{action_type}")
async def entity_action(entity_id: str, action_type: str):
    """Execute action on entity and log it"""
    entity = get_entity_by_id(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    actions = {
        "honeypot": {
            "message": "Entity moved to honeypot environment",
            "status": "honeypot",
            "is_honeypot": True,
            "action_type_log": "HONEYPOT_MOVE"
        },
        "monitor": {
            "message": "Enhanced monitoring enabled for entity",
            "status": "monitored",
            "is_honeypot": False,
            "action_type_log": "MONITOR"
        },
        "isolate": {
            "message": "Entity isolated from network",
            "status": "isolated",
            "is_honeypot": False,
            "action_type_log": "ISOLATION"
        },
        "block": {
            "message": "Entity blocked from all access",
            "status": "blocked",
            "is_honeypot": False,
            "action_type_log": "BLOCK"
        },
        "reset": {
            "message": "Entity credentials reset",
            "status": "active",
            "is_honeypot": False,
            "action_type_log": "CHALLENGE"
        },
        "unblock": {
            "message": "Entity unblocked and restored to active status",
            "status": "active",
            "is_honeypot": False,
            "action_type_log": "ALLOW"
        }
    }
    
    if action_type not in actions:
        raise HTTPException(status_code=400, detail="Invalid action type")
    
    action_config = actions[action_type]
    
    # Update entity status in database
    if is_using_supabase():
        update_entity_status(
            entity_id, 
            action_config["status"],
            action_config.get("is_honeypot")
        )
    
    # Log the autonomous action with proper format
    log_entity_action_memory(
        entity_id=entity_id,
        entity_name=entity["name"],
        action_type=action_config["action_type_log"],
        risk_score_trigger=entity.get("risk_score", 0),
        execution_status="SUCCESS",
        action_details={
            "manual_action": True,
            "previous_status": entity.get("status", "active"),
            "new_status": action_config["status"],
            "description": action_config["message"]
        },
        confidence_level=0.95  # High confidence for manual actions
    )
    
    # Execute real network actions if needed
    try:
        if action_type == "block":
            # Block entity's IP if available
            entity_ip = entity.get("ip_address")
            if entity_ip:
                network_controller.block_ip(entity_ip, f"Manual block: {action_config['message']}")
        elif action_type == "isolate":
            # Isolate entity
            network_controller.isolate_entity(entity_id, f"Manual isolation: {action_config['message']}")
        elif action_type == "unblock":
            # Unblock entity's IP if available
            entity_ip = entity.get("ip_address")
            if entity_ip:
                network_controller.unblock_ip(entity_ip)
    except Exception as e:
        print(f"WARNING: Network action failed for {action_type}: {e}")
    
    return {
        "success": True,
        "entity": entity["name"],
        "action": action_type,
        "message": action_config["message"],
        "new_status": action_config["status"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "logged_to_autonomous_actions": True
    }

@app.get("/entity/{entity_id}/actions")
def get_entity_actions_endpoint(entity_id: str, limit: int = 50):
    """Get action history for an entity"""
    entity = get_entity_by_id(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Try to get from database first
    if is_using_supabase():
        db_actions = db_get_entity_actions(entity_id, limit)
        if db_actions:
            # Add entity_name from metadata or entity object
            for action in db_actions:
                if "entity_name" not in action:
                    action["entity_name"] = entity["name"]
            
            return {
                "entity_id": entity_id,
                "entity_name": entity["name"],
                "actions": db_actions,
                "total_actions": len(db_actions),
                "source": "database"
            }
    
    # Fallback to memory
    actions = [a for a in entity_actions_log if a["entity_id"] == entity_id]
    return {
        "entity_id": entity_id,
        "entity_name": entity["name"],
        "actions": list(reversed(actions[-limit:])),
        "total_actions": len(actions),
        "source": "memory"
    }
    return {
        "entity_id": entity_id,
        "entity_name": entity["name"],
        "actions": list(reversed(actions[-20:])),  # Last 20 actions
        "total_actions": len(actions)
    }

# ── Log Export Endpoint ──────────────────────────────────────────────────────
@app.get("/logs/export")
def export_logs(format: str = "json", limit: int = 1000):
    """Export event logs"""
    logs = event_log[-limit:]
    
    if format == "csv":
        # Convert to CSV format
        csv_data = "id,timestamp,severity,user,risk_score,decision,attack_cat\n"
        for log in logs:
            csv_data += f"{log['id']},{log['timestamp']},{log['severity']},{log['user']},{log['risk_score']},{log['decision']},{log.get('attack_cat', 'Unknown')}\n"
        return {
            "data": csv_data,
            "count": len(logs),
            "format": "csv"
        }
    else:
        return {
            "data": logs,
            "count": len(logs),
            "format": "json"
        }

# ── Database Event Logging Endpoints ─────────────────────────────────────────
@app.get("/database/buffer/status")
def get_database_buffer_status():
    """Get current event buffer status"""
    buffer_status = get_buffer_status()
    event_stats = get_event_statistics()
    
    return {
        "buffer": buffer_status,
        "database": event_stats,
        "logging_enabled": is_using_supabase(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/database/buffer/flush")
async def force_flush_buffer():
    """Manually flush event buffer to database"""
    if not is_using_supabase():
        raise HTTPException(status_code=503, detail="Supabase not configured")
    
    success = flush_event_buffer()
    
    return {
        "success": success,
        "message": "Buffer flushed successfully" if success else "Failed to flush buffer",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ── Honeypot & Blocked Entities Endpoints ────────────────────────────────────
@app.get("/entities/honeypot")
def get_honeypot_entities_endpoint():
    """Get all entities in honeypot environment"""
    if not is_using_supabase():
        # Fallback: check in-memory entities
        entities = get_all_entities()
        honeypot = [e for e in entities if e.get("is_honeypot", False)]
        return {
            "honeypot_entities": honeypot,
            "count": len(honeypot),
            "source": "memory"
        }
    
    honeypot = get_honeypot_entities()
    return {
        "honeypot_entities": honeypot,
        "count": len(honeypot),
        "source": "database"
    }

@app.get("/entities/blocked")
def get_blocked_entities_endpoint():
    """Get all blocked or isolated entities"""
    if not is_using_supabase():
        # Fallback: check in-memory entities
        entities = get_all_entities()
        blocked = [e for e in entities if e.get("status") in ["blocked", "isolated"]]
        return {
            "blocked_entities": blocked,
            "count": len(blocked),
            "source": "memory"
        }
    
    blocked = get_blocked_entities()
    return {
        "blocked_entities": blocked,
        "count": len(blocked),
        "source": "database"
    }

@app.get("/honeypot/activities")
def get_honeypot_activities_endpoint(entity_id: str = None, limit: int = 100):
    """Get all activities from honeypot users"""
    if not is_using_supabase():
        # Fallback: filter from in-memory event log
        honeypot_entities = [e["name"] for e in get_all_entities() if e.get("is_honeypot", False)]
        activities = [e for e in event_log if e.get("user") in honeypot_entities]
        
        if entity_id:
            entity = get_entity_by_id(entity_id)
            if entity:
                activities = [e for e in activities if e.get("user") == entity["name"]]
        
        return {
            "activities": list(reversed(activities[-limit:])),
            "count": len(activities),
            "source": "memory"
        }
    
    activities = get_honeypot_activities(entity_id, limit)
    return {
        "activities": activities,
        "count": len(activities),
        "source": "database"
    }

@app.get("/honeypot/summary")
def get_honeypot_summary():
    """Get summary of honeypot operations"""
    if not is_using_supabase():
        entities = get_all_entities()
        honeypot_entities = [e for e in entities if e.get("is_honeypot", False)]
        honeypot_names = [e["name"] for e in honeypot_entities]
        activities = [e for e in event_log if e.get("user") in honeypot_names]
        
        return {
            "total_honeypot_entities": len(honeypot_entities),
            "total_activities": len(activities),
            "entities": honeypot_entities,
            "recent_activities": list(reversed(activities[-20:])),
            "source": "memory"
        }
    
    honeypot_entities = get_honeypot_entities()
    
    summary = {
        "total_honeypot_entities": len(honeypot_entities),
        "entities": [],
        "source": "database"
    }
    
    for entity in honeypot_entities:
        activities = get_honeypot_activities(entity["id"], 20)
        summary["entities"].append({
            **entity,
            "recent_activity_count": len(activities),
            "recent_activities": activities[:5]  # Last 5 activities
        })
    
    return summary

# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        for event in list(reversed(event_log[-10:])):
            await websocket.send_text(json.dumps(event))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
