"""
Enhanced Supabase database integration for EquiMind Zero Trust Risk Engine
Implements Single Source of Truth (SSOT) and Autonomous Actions
"""
import os
import uuid
from typing import List, Optional, Dict, Tuple
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv
from network_controller import network_controller

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase client
supabase: Optional[Client] = None

# Bulk insert configuration
event_buffer: List[Dict] = []
BULK_INSERT_SIZE = int(os.getenv("BULK_INSERT_SIZE", "50"))  # Insert after 50 events
BULK_INSERT_INTERVAL = int(os.getenv("BULK_INSERT_INTERVAL", "120"))  # Or every 120 seconds
last_bulk_insert_time = datetime.now(timezone.utc)

# Autonomous action thresholds
RISK_THRESHOLDS = {
    "MONITOR": 30,      # Start enhanced monitoring
    "CHALLENGE": 50,    # Require additional authentication
    "RESTRICT": 65,     # Restrict services/ports
    "ISOLATE": 80,      # Network isolation
    "BLOCK": 90,        # Full block
    "HONEYPOT": 95      # Move to honeypot
}

def init_supabase():
    """Initialize Supabase client"""
    global supabase
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("WARNING: Supabase credentials not found. Using fallback mode.")
        return None
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("INFO:     Supabase client initialized successfully")
        return supabase
    except Exception as e:
        print(f"ERROR:    Failed to initialize Supabase: {e}")
        return None

# ── Entity Operations ─────────────────────────────────────────────────────────

def get_all_entities() -> List[Dict]:
    """Fetch all entities from Supabase"""
    if not supabase:
        return []
    
    try:
        response = supabase.table("entities").select("*").execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch entities: {e}")
        return []

def get_entity_by_id(entity_id: str) -> Optional[Dict]:
    """Fetch a single entity by ID"""
    if not supabase:
        return None
    
    try:
        response = supabase.table("entities").select("*").eq("id", entity_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"ERROR:    Failed to fetch entity {entity_id}: {e}")
        return None

def update_entity_risk_score(entity_id: str, new_score: float, trust_reserve: int = None):
    """Update entity risk score and optionally trust reserve"""
    if not supabase:
        return False
    
    try:
        update_data = {
            "risk_score": round(new_score, 2),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if trust_reserve is not None:
            update_data["trust_reserve"] = trust_reserve
        
        supabase.table("entities").update(update_data).eq("id", entity_id).execute()
        return True
    except Exception as e:
        print(f"ERROR:    Failed to update entity {entity_id}: {e}")
        return False

def update_entity_status(entity_id: str, status: str, is_honeypot: bool = None):
    """Update entity status (active, monitored, isolated, blocked, honeypot)"""
    if not supabase:
        return False
    
    try:
        update_data = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if is_honeypot is not None:
            update_data["is_honeypot"] = is_honeypot
            if is_honeypot:
                update_data["honeypot_since"] = datetime.now(timezone.utc).isoformat()
        
        supabase.table("entities").update(update_data).eq("id", entity_id).execute()
        return True
    except Exception as e:
        print(f"ERROR:    Failed to update entity status {entity_id}: {e}")
        return False

def create_entity(entity_data: Dict) -> Optional[Dict]:
    """Create a new entity"""
    if not supabase:
        return None
    
    try:
        entity_data["created_at"] = datetime.now(timezone.utc).isoformat()
        entity_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        response = supabase.table("entities").insert(entity_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"ERROR:    Failed to create entity: {e}")
        return None

# ── Event Logging with Raw Data (SSOT Implementation) ────────────────────────

def log_event_with_raw_data(event_data: Dict, raw_network_data: Dict = None) -> bool:
    """Log event with complete raw network data - SINGLE SOURCE OF TRUTH"""
    global event_buffer, last_bulk_insert_time
    
    if not supabase:
        return False
    
    try:
        # Get entity information
        entity_name = event_data.get("user")
        entity = get_entity_by_name(entity_name)
        entity_id = entity.get("id") if entity else None
        
        # Generate IDs
        event_id = event_data.get("id", f"evt_{uuid.uuid4().hex[:8]}")
        
        # Check if this is a honeypot user
        is_honeypot = entity.get("is_honeypot", False) if entity else False
        
        # Prepare event data for database (store raw_network_data in score_breakdown as JSONB)
        score_breakdown = event_data.get("score_breakdown", {})
        if raw_network_data:
            # Include raw network data in score_breakdown for storage
            score_breakdown["raw_network_data"] = raw_network_data
        
        db_event = {
            "id": event_id,
            "entity_id": entity_id,
            "timestamp": event_data.get("timestamp"),
            "severity": event_data.get("severity"),
            "attack_cat": event_data.get("attack_cat"),
            "event_type": event_data.get("type"),
            "user_name": entity_name,
            "device": event_data.get("device"),
            "src_ip": event_data.get("src_ip"),
            "location": event_data.get("location"),
            "risk_score": event_data.get("risk_score"),
            "prev_score": event_data.get("prev_score"),
            "trust_reserve": event_data.get("trust_reserve"),
            "decision": event_data.get("decision"),
            "confidence": event_data.get("confidence"),
            "explanation": event_data.get("explanation"),
            "kill_chain_id": event_data.get("kill_chain_id"),
            "kill_chain_step": event_data.get("kill_chain_step"),
            "kill_chain_phase": event_data.get("kill_chain_phase"),
            "model_version": event_data.get("model_version"),
            "mlp_score": event_data.get("mlp_score"),
            "risk_level": event_data.get("risk_level"),
            "score_breakdown": score_breakdown,
            "is_honeypot_activity": is_honeypot,
            "autonomous_action_taken": False,
            "action_details": None
        }
        
        # Add to buffer
        event_buffer.append(db_event)
        
        # Update entity risk score in SSOT
        if entity_id and event_data.get("risk_score") is not None:
            update_entity_risk_score(entity_id, event_data.get("risk_score"))
        
        # AUTONOMOUS DECISION MAKING
        if entity_id and event_data.get("risk_score", 0) > RISK_THRESHOLDS["MONITOR"]:
            autonomous_action = determine_autonomous_action(entity, event_data)
            if autonomous_action:
                execute_autonomous_action(entity_id, event_id, autonomous_action, event_data)
                db_event["autonomous_action_taken"] = True
                db_event["action_details"] = autonomous_action
        
        # Check if we should flush the buffer
        current_time = datetime.now(timezone.utc)
        time_elapsed = (current_time - last_bulk_insert_time).total_seconds()
        
        should_flush = (
            len(event_buffer) >= BULK_INSERT_SIZE or  # Buffer is full
            time_elapsed >= BULK_INSERT_INTERVAL      # Time interval reached
        )
        
        if should_flush:
            flush_event_buffer()
            last_bulk_insert_time = current_time
        
        return True
    except Exception as e:
        print(f"ERROR:    Failed to log event with raw data: {e}")
        return False

def log_event(event_data: Dict) -> bool:
    """Legacy function - redirects to enhanced version"""
    return log_event_with_raw_data(event_data)

def flush_event_buffer() -> bool:
    """Flush event buffer to database in bulk"""
    global event_buffer
    
    if not supabase or not event_buffer:
        return False
    
    try:
        # Insert all events in one batch
        supabase.table("events").insert(event_buffer).execute()
        count = len(event_buffer)
        print(f"INFO:     Bulk inserted {count} events to Supabase")
        
        # Clear buffer
        event_buffer = []
        return True
    except Exception as e:
        print(f"ERROR:    Failed to bulk insert events: {e}")
        # Keep events in buffer for retry
        return False

def get_buffer_status() -> Dict:
    """Get current buffer status"""
    global event_buffer, last_bulk_insert_time
    
    current_time = datetime.now(timezone.utc)
    time_since_last_flush = (current_time - last_bulk_insert_time).total_seconds()
    
    return {
        "buffer_size": len(event_buffer),
        "max_buffer_size": BULK_INSERT_SIZE,
        "time_since_last_flush": round(time_since_last_flush, 1),
        "flush_interval": BULK_INSERT_INTERVAL,
        "next_flush_in": max(0, round(BULK_INSERT_INTERVAL - time_since_last_flush, 1))
    }

def get_entity_by_name(name: str) -> Optional[Dict]:
    """Fetch entity by name - SSOT lookup"""
    if not supabase or not name:
        return None
    
    try:
        response = supabase.table("entities").select("*").eq("name", name).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"ERROR:    Failed to fetch entity by name {name}: {e}")
        return None

def _get_entity_id_from_name(user_name: str) -> Optional[str]:
    """Helper to get entity ID from username (cached lookup)"""
    entity = get_entity_by_name(user_name)
    return entity.get("id") if entity else None

def _is_entity_honeypot(user_name: str) -> bool:
    """Helper to check if entity is in honeypot"""
    entity = get_entity_by_name(user_name)
    return entity.get("is_honeypot", False) if entity else False

def get_recent_events(limit: int = 50) -> List[Dict]:
    """Fetch recent events from database"""
    if not supabase:
        return []
    
    try:
        response = supabase.table("events").select("*").order("timestamp", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch events: {e}")
        return []

def get_entity_events(entity_id: str, limit: int = 20) -> List[Dict]:
    """Fetch events for a specific entity"""
    if not supabase:
        return []
    
    try:
        response = supabase.table("events").select("*").eq("entity_id", entity_id).order("timestamp", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch entity events: {e}")
        return []

# ── Statistics ────────────────────────────────────────────────────────────────

def get_entity_count() -> int:
    """Get total entity count"""
    if not supabase:
        return 0
    
    try:
        response = supabase.table("entities").select("id", count="exact").execute()
        return response.count if hasattr(response, 'count') else len(response.data)
    except Exception as e:
        print(f"ERROR:    Failed to get entity count: {e}")
        return 0

def get_high_risk_entities(threshold: int = 65) -> List[Dict]:
    """Get entities with risk score above threshold"""
    if not supabase:
        return []
    
    try:
        response = supabase.table("entities").select("*").gte("risk_score", threshold).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch high risk entities: {e}")
        return []

def get_honeypot_entities() -> List[Dict]:
    """Get all entities in honeypot environment"""
    if not supabase:
        return []
    
    try:
        response = supabase.table("entities").select("*").eq("is_honeypot", True).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch honeypot entities: {e}")
        return []

def get_blocked_entities() -> List[Dict]:
    """Get all blocked or isolated entities"""
    if not supabase:
        return []
    
    try:
        response = supabase.table("entities").select("*").in_("status", ["blocked", "isolated"]).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch blocked entities: {e}")
        return []

def log_entity_action(action_data: Dict) -> bool:
    """Log an entity action to database"""
    if not supabase:
        return False
    
    try:
        supabase.table("entity_actions").insert(action_data).execute()
        return True
    except Exception as e:
        print(f"ERROR:    Failed to log entity action: {e}")
        return False

def get_entity_actions(entity_id: str = None, limit: int = 50) -> List[Dict]:
    """Get action history for an entity, or all actions if entity_id is None"""
    if not supabase:
        return []
    
    try:
        query = supabase.table("entity_actions").select("*")
        
        if entity_id:
            query = query.eq("entity_id", entity_id)
        
        response = query.order("timestamp", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch entity actions: {e}")
        return []

def get_honeypot_activities(entity_id: str = None, limit: int = 100) -> List[Dict]:
    """Get honeypot activities (events from honeypot users)"""
    if not supabase:
        return []
    
    try:
        query = supabase.table("events").select("*").eq("is_honeypot_activity", True)
        
        if entity_id:
            query = query.eq("entity_id", entity_id)
        
        response = query.order("timestamp", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch honeypot activities: {e}")
        return []

def get_event_statistics() -> Dict:
    """Get event statistics from database"""
    if not supabase:
        return {}
    
    try:
        # Get total event count
        response = supabase.table("events").select("id", count="exact").execute()
        total_events = response.count if hasattr(response, 'count') else len(response.data)
        
        return {
            "total_events_in_db": total_events,
            "buffer_status": get_buffer_status()
        }
    except Exception as e:
        print(f"ERROR:    Failed to get event statistics: {e}")
        return {}

# ── Autonomous Actions Implementation ─────────────────────────────────────────

def determine_autonomous_action(entity: Dict, event_data: Dict) -> Optional[Dict]:
    """Determine what autonomous action to take based on risk score and context"""
    if not entity:
        return None
    
    risk_score = event_data.get("risk_score", 0)
    current_status = entity.get("status", "active")
    
    # Don't take action if already in a restricted state (unless escalating)
    if current_status in ["blocked", "isolated"] and risk_score < RISK_THRESHOLDS["BLOCK"]:
        return None
    
    # Determine action based on risk score
    if risk_score >= RISK_THRESHOLDS["HONEYPOT"]:
        return {
            "type": "HONEYPOT_MOVE",
            "reason": f"Critical risk score {risk_score}% - moving to honeypot",
            "details": {"new_status": "honeypot", "is_honeypot": True}
        }
    elif risk_score >= RISK_THRESHOLDS["BLOCK"]:
        return {
            "type": "IP_BLOCK",
            "reason": f"Extreme risk score {risk_score}% - full network block",
            "details": {"block_type": "FULL_BLOCK", "duration_hours": 24}
        }
    elif risk_score >= RISK_THRESHOLDS["ISOLATE"]:
        return {
            "type": "ISOLATION",
            "reason": f"High risk score {risk_score}% - network isolation",
            "details": {"new_status": "isolated", "allow_basic_services": False}
        }
    elif risk_score >= RISK_THRESHOLDS["RESTRICT"]:
        return {
            "type": "SERVICE_RESTRICT",
            "reason": f"Elevated risk score {risk_score}% - service restrictions",
            "details": {"restrict_services": ["ssh", "ftp", "admin"], "duration_hours": 4}
        }
    elif risk_score >= RISK_THRESHOLDS["CHALLENGE"]:
        return {
            "type": "CHALLENGE",
            "reason": f"Medium risk score {risk_score}% - additional authentication required",
            "details": {"challenge_type": "MFA", "duration_hours": 2}
        }
    elif risk_score >= RISK_THRESHOLDS["MONITOR"]:
        return {
            "type": "MONITOR",
            "reason": f"Low risk score {risk_score}% - enhanced monitoring",
            "details": {"new_status": "monitored", "monitoring_level": "enhanced"}
        }
    
    return None

def execute_autonomous_action(entity_id: str, event_id: str, action: Dict, event_data: Dict) -> bool:
    """Execute the determined autonomous action"""
    if not supabase or not action:
        return False
    
    try:
        action_type = action.get("type")
        action_details = action.get("details", {})
        
        # Log the autonomous action
        autonomous_action_record = {
            "id": str(uuid.uuid4()),
            "entity_id": entity_id,
            "event_id": event_id,
            "action_type": action_type,
            "action_details": action,
            "risk_score_trigger": event_data.get("risk_score"),
            "confidence_level": event_data.get("confidence"),
            "executed_at": datetime.now(timezone.utc).isoformat(),
            "execution_status": "SUCCESS",
            "execution_details": {}
        }
        
        # Execute specific actions
        success = False
        
        if action_type == "HONEYPOT_MOVE":
            success = _execute_honeypot_move(entity_id, action_details)
        elif action_type == "IP_BLOCK":
            success = _execute_ip_block(entity_id, event_data, action_details)
        elif action_type == "ISOLATION":
            success = _execute_isolation(entity_id, action_details)
        elif action_type == "SERVICE_RESTRICT":
            success = _execute_service_restriction(entity_id, action_details)
        elif action_type == "CHALLENGE":
            success = _execute_challenge_requirement(entity_id, action_details)
        elif action_type == "MONITOR":
            success = _execute_enhanced_monitoring(entity_id, action_details)
        
        # Update execution status
        autonomous_action_record["execution_status"] = "SUCCESS" if success else "FAILED"
        autonomous_action_record["execution_details"] = {"success": success}
        
        # Log the action to entity_actions table (using existing table)
        action_log = {
            "id": autonomous_action_record["id"],
            "entity_id": entity_id,
            "action_type": action_type,
            "message": f"Autonomous action: {action_type}",
            "performed_by": "autonomous_system",
            "timestamp": autonomous_action_record["executed_at"],
            "metadata": {
                "event_id": event_id,
                "execution_status": "SUCCESS" if success else "FAILED",
                "execution_details": {"success": success},
                "action_details": action_details
            }
        }
        supabase.table("entity_actions").insert(action_log).execute()
        
        print(f"INFO:     Autonomous action {action_type} {'executed' if success else 'failed'} for entity {entity_id}")
        return success
        
    except Exception as e:
        print(f"ERROR:    Failed to execute autonomous action: {e}")
        return False

def _execute_honeypot_move(entity_id: str, details: Dict) -> bool:
    """Move entity to honeypot environment"""
    try:
        update_data = {
            "status": "honeypot",
            "is_honeypot": True,
            "honeypot_since": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("entities").update(update_data).eq("id", entity_id).execute()
        return True
    except Exception as e:
        print(f"ERROR:    Failed to move entity to honeypot: {e}")
        return False

def _execute_ip_block(entity_id: str, event_data: Dict, details: Dict) -> bool:
    """ACTUALLY block IP address using network controller"""
    try:
        src_ip = event_data.get("src_ip")
        if not src_ip:
            return False
        
        # Calculate expiration
        duration_hours = details.get("duration_hours", 24)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
        
        # ACTUALLY BLOCK THE IP using network controller
        reason = f"Autonomous block due to risk score {event_data.get('risk_score')}%"
        success = network_controller.block_ip(src_ip, reason, duration_hours)
        
        if success:
            # Insert IP block record in database
            ip_block_record = {
                "ip_address": src_ip,
                "entity_id": entity_id,
                "block_type": details.get("block_type", "FULL_BLOCK"),
                "reason": reason,
                "blocked_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": expires_at.isoformat(),
                "is_active": True,
                "blocked_by": "system",
                "metadata": {"event_id": event_data.get("id"), "risk_score": event_data.get("risk_score")}
            }
            
            supabase.table("ip_blocks").insert(ip_block_record).execute()
            
            # Update entity status
            update_entity_status(entity_id, "blocked")
            
            print(f"REAL ACTION: IP {src_ip} ACTUALLY BLOCKED in network controller")
        
        return success
    except Exception as e:
        print(f"ERROR:    Failed to execute REAL IP block: {e}")
        return False

def _execute_isolation(entity_id: str, details: Dict) -> bool:
    """ACTUALLY isolate entity from network using network controller"""
    try:
        # Update entity status
        update_entity_status(entity_id, "isolated")
        
        # ACTUALLY ISOLATE using network controller
        reason = "Network isolation due to high risk"
        success = network_controller.isolate_entity(entity_id, reason)
        
        if success:
            # Log restriction in entity_actions (using existing table)
            action_log = {
                "id": f"action_{uuid.uuid4().hex[:8]}",
                "entity_id": entity_id,
                "action_type": "isolation",
                "message": f"Entity isolated from network",
                "performed_by": "autonomous_system",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metadata": {
                    "restriction_type": "SERVICE_DENY",
                    "target": "all_services",
                    "allowed_services": ["dns", "dhcp"] if details.get("allow_basic_services") else [],
                    "reason": reason
                }
            }
            supabase.table("entity_actions").insert(action_log).execute()
            print(f"REAL ACTION: Entity {entity_id} ACTUALLY ISOLATED from network")
        
        return success
    except Exception as e:
        print(f"ERROR:    Failed to execute REAL isolation: {e}")
        return False

def _execute_service_restriction(entity_id: str, details: Dict) -> bool:
    """ACTUALLY restrict specific services using network controller"""
    try:
        restricted_services = details.get("restrict_services", [])
        duration_hours = details.get("duration_hours", 4)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
        
        success_count = 0
        for service in restricted_services:
            # ACTUALLY RESTRICT THE SERVICE using network controller
            reason = f"Service restriction due to elevated risk"
            if network_controller.restrict_service(entity_id, service, reason):
                success_count += 1
                
                # Log in entity_actions (using existing table)
                action_log = {
                    "id": f"action_{uuid.uuid4().hex[:8]}",
                    "entity_id": entity_id,
                    "action_type": "service_restriction",
                    "message": f"Service {service} restricted",
                    "performed_by": "autonomous_system",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "metadata": {
                        "restriction_type": "SERVICE_DENY",
                        "target": service,
                        "service": service,
                        "reason": reason,
                        "expires_at": expires_at.isoformat()
                    }
                }
                supabase.table("entity_actions").insert(action_log).execute()
        
        if success_count > 0:
            print(f"REAL ACTION: {success_count} services ACTUALLY RESTRICTED for entity {entity_id}")
        
        return success_count > 0
    except Exception as e:
        print(f"ERROR:    Failed to execute REAL service restriction: {e}")
        return False

def _execute_challenge_requirement(entity_id: str, details: Dict) -> bool:
    """Require additional authentication challenges"""
    try:
        duration_hours = details.get("duration_hours", 2)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
        
        # Log challenge requirement in entity_actions (using existing table)
        action_log = {
            "id": f"action_{uuid.uuid4().hex[:8]}",
            "entity_id": entity_id,
            "action_type": "challenge",
            "message": "Additional authentication required",
            "performed_by": "autonomous_system",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": {
                "restriction_type": "CHALLENGE_REQUIRED",
                "target": "authentication",
                "challenge_type": details.get("challenge_type", "MFA"),
                "reason": "Additional authentication required due to risk",
                "expires_at": expires_at.isoformat()
            }
        }
        supabase.table("entity_actions").insert(action_log).execute()
        return True
    except Exception as e:
        print(f"ERROR:    Failed to execute challenge requirement: {e}")
        return False

def _execute_enhanced_monitoring(entity_id: str, details: Dict) -> bool:
    """Enable enhanced monitoring"""
    try:
        # Update entity status
        update_entity_status(entity_id, "monitored")
        return True
    except Exception as e:
        print(f"ERROR:    Failed to execute enhanced monitoring: {e}")
        return False

# ── Raw Data and Enhanced Queries ────────────────────────────────────────────

def get_events_with_raw_data(limit: int = 50) -> List[Dict]:
    """Get events with complete raw network data"""
    if not supabase:
        return []
    
    try:
        response = supabase.table("events_with_raw_data").select("*").order("timestamp", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch events with raw data: {e}")
        return []

def get_entity_security_context(entity_id: str) -> Dict:
    """Get complete security context for an entity"""
    if not supabase:
        return {}
    
    try:
        # Use the database function
        response = supabase.rpc("get_entity_security_context", {"entity_id_param": entity_id}).execute()
        
        if response.data and len(response.data) > 0:
            context = response.data[0]
            return {
                "entity": context.get("entity_data"),
                "active_blocks": context.get("active_blocks"),
                "active_restrictions": context.get("active_restrictions"),
                "recent_actions": context.get("recent_actions")
            }
        
        return {}
    except Exception as e:
        print(f"ERROR:    Failed to get entity security context: {e}")
        return {}

def get_active_ip_blocks() -> List[Dict]:
    """Get all active IP blocks"""
    if not supabase:
        return []
    
    try:
        response = supabase.table("ip_blocks").select("*").eq("is_active", True).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch active IP blocks: {e}")
        return []

def get_active_restrictions() -> List[Dict]:
    """Get all active network restrictions from entity_actions"""
    if not supabase:
        return []
    
    try:
        # Query entity_actions for restriction-type actions
        response = supabase.table("entity_actions").select("*").in_("action_type", ["isolation", "service_restriction", "challenge"]).order("timestamp", desc=True).limit(100).execute()
        return response.data
    except Exception as e:
        print(f"ERROR:    Failed to fetch active restrictions: {e}")
        return []

def is_ip_blocked(ip_address: str) -> bool:
    """Check if an IP address is currently blocked"""
    if not supabase:
        return False
    
    try:
        response = supabase.rpc("is_ip_blocked", {"check_ip": ip_address}).execute()
        return response.data if response.data else False
    except Exception as e:
        print(f"ERROR:    Failed to check IP block status: {e}")
        return False

def get_autonomous_actions_summary() -> Dict:
    """Get summary of autonomous actions taken from entity_actions"""
    if not supabase:
        return {}
    
    try:
        # Get action counts by type from entity_actions where performed_by is system
        response = supabase.table("entity_actions").select("action_type").eq("performed_by", "autonomous_system").execute()
        
        action_counts = {}
        for action in response.data:
            action_type = action.get("action_type")
            action_counts[action_type] = action_counts.get(action_type, 0) + 1
        
        # Get recent actions
        recent_response = supabase.table("entity_actions").select("*").eq("performed_by", "autonomous_system").order("timestamp", desc=True).limit(10).execute()
        
        return {
            "total_actions": len(response.data),
            "action_counts": action_counts,
            "recent_actions": recent_response.data
        }
    except Exception as e:
        print(f"ERROR:    Failed to get autonomous actions summary: {e}")
        return {}