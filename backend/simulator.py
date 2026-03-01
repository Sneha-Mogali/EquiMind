import random
import uuid
from datetime import datetime, timezone
from entities import get_random_entity, update_entity_score
from scorer import compute_risk_score
from models import predict
from dataset_loader import get_real_network_sample, get_attack_sample, add_network_context

LOCATIONS = [
    "Mumbai, IN", "Pune, IN", "Delhi, IN", "Bangalore, IN",
    "Frankfurt, DE", "New York, US", "London, UK", "Tokyo, JP",
    "TOR Exit Node", "Unknown Proxy",
]

IPS = [
    "192.168.1.101", "10.0.0.45", "172.16.0.23",
    "185.220.101.45", "94.102.49.190", "45.33.32.156",
    "198.51.100.77",  "203.0.113.42",
]

EVENT_TYPES = [
    "normal_login", "off_hours_access", "impossible_travel",
    "bulk_download", "privilege_escalation", "lateral_movement",
    "credential_sharing", "device_posture_failure",
    "recon_probe", "c2_beacon", "data_exfiltration", "new_device",
]

SEVERITIES = {
    "ALLOW":     "LOW",
    "CHALLENGE": "MEDIUM",
    "RESTRICT":  "HIGH",
    "BLOCK":     "CRITICAL",
}

KILL_CHAIN_PHASES = [
    "Recon", "Weaponize", "Deliver", "Exploit", "Persist", "Exfil"
]

active_incidents = {}

def generate_event() -> dict:
    entity       = get_random_entity()
    event_type   = random.choice(EVENT_TYPES)
    location     = random.choice(LOCATIONS)
    src_ip       = random.choice(IPS)
    hour         = datetime.now().hour
    is_offhours  = hour < 7 or hour > 21
    device_ok    = random.random() > 0.15
    mfa_used     = random.random() > 0.20
    location_known = location in [entity["location"], "Internal"]

    # Use REAL network traffic data instead of fake random data
    # 70% chance of normal traffic, 30% chance of attack traffic
    if random.random() < 0.7:
        raw_network_data = get_real_network_sample()
    else:
        # Get real attack sample
        attack_types = ["DoS", "Probe", "Exploits", "Fuzzers", "Backdoors"]
        attack_type = random.choice(attack_types)
        raw_network_data = get_attack_sample(attack_type)
    
    # Add network context (IPs, ports)
    raw_network_data = add_network_context(raw_network_data, src_ip)
    
    # Use REAL network data for ML prediction
    prediction = predict(raw_network_data)

    score_result = compute_risk_score(
        attack_cat       = prediction["attack_cat"],
        confidence       = prediction["confidence"],
        is_offhours      = is_offhours,
        device_ok        = device_ok,
        mfa_used         = mfa_used,
        location_known   = location_known,
        behavioral_anomaly = prediction["anomaly_score"],
        ml_risk_score    = prediction.get("risk_score", 50),
        ml_risk_level    = prediction.get("risk_level", "MEDIUM"),
    )

    prev_score = entity["risk_score"]
    update_entity_score(entity["id"], score_result["risk_score"])

    # Kill chain tracking
    kill_chain_id    = None
    kill_chain_step  = None
    kill_chain_phase = None

    if score_result["decision"] in ["RESTRICT", "BLOCK"]:
        inc_id = f"inc_{entity['id']}"
        if inc_id not in active_incidents:
            active_incidents[inc_id] = {"step": 0}
        step = active_incidents[inc_id]["step"]
        active_incidents[inc_id]["step"] = min(step + 1, 5)
        kill_chain_id    = inc_id
        kill_chain_step  = step
        kill_chain_phase = KILL_CHAIN_PHASES[step]

    return {
        "id":              f"evt_{uuid.uuid4().hex[:8]}",
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "severity":        SEVERITIES[score_result["decision"]],
        "attack_cat":      prediction["attack_cat"],
        "type":            event_type,
        "user":            entity["name"],
        "device":          entity["device"],
        "src_ip":          src_ip,
        "location":        location,
        "risk_score":      score_result["risk_score"],
        "prev_score":      prev_score,
        "trust_reserve":   entity["trust_reserve"],
        "score_breakdown": score_result["score_breakdown"],
        "decision":        score_result["decision"],
        "confidence":      prediction["confidence"],
        "explanation":     score_result["explanation"],
        "kill_chain_id":   kill_chain_id,
        "kill_chain_step": kill_chain_step,
        "kill_chain_phase": kill_chain_phase,
        "model_version":   "2.0.0",
        "mlp_score":       prediction.get("mlp_score", 0.0),
        "risk_level":      score_result["risk_level"],  # Use risk_level from scorer (single source of truth)
        "raw_network_data": raw_network_data,  # Include raw data for SSOT
    }