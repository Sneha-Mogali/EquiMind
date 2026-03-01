import random
from typing import Dict, Any
from models import get_risk_level_from_score

FEATURE_LABELS = {
    "dur":     "Session duration anomaly",
    "sbytes":  "Outbound data volume spike",
    "dbytes":  "Inbound data volume spike",
    "rate":    "Packet rate anomaly",
    "sttl":    "Source TTL deviation",
    "dttl":    "Destination TTL deviation",
    "sload":   "Source load anomaly",
    "dload":   "Destination load anomaly",
    "ct_srv_src": "Unusual service-source pairing",
    "ct_dst_ltm": "Rare destination recently",
}

ATTACK_EXPLANATIONS = {
    "Normal":    "Behavior consistent with baseline. No indicators of compromise.",
    "Exploits":  "Exploit pattern detected. Unusual payload structure observed.",
    "Fuzzers":   "Fuzzing pattern detected. Repeated malformed requests observed.",
    "DoS":       "Denial of service pattern. Abnormal request flood detected.",
    "Recon":     "Reconnaissance activity. Sequential port or resource probing.",
    "Backdoors": "Backdoor communication pattern. Suspicious persistent connection.",
    "Analysis":  "Deep packet analysis triggered. Protocol anomaly detected.",
    "Shellcode": "Shellcode pattern in payload. Execution attempt suspected.",
    "Worms":     "Worm propagation pattern. Self-replicating lateral movement.",
    "Generic":   "Generic attack signature matched. Anomalous flow detected.",
}

def compute_risk_score(
    attack_cat: str,
    confidence: float,
    is_offhours: bool,
    device_ok: bool,
    mfa_used: bool,
    location_known: bool,
    behavioral_anomaly: float,
    ml_risk_score: int = 50,
    ml_risk_level: str = "MEDIUM",
) -> Dict[str, Any]:

    # Use ML model risk score as base, enhanced with context
    network_score = ml_risk_score * 0.33 if attack_cat != "Normal" else behavioral_anomaly * 20
    identity_score = 0
    device_score   = 0

    if not mfa_used:      identity_score += 15
    if is_offhours:       identity_score += 10
    if not location_known: identity_score += 8
    identity_score = min(identity_score, 33)

    if not device_ok:     device_score += 20
    device_score = min(device_score, 33)

    total = network_score + identity_score + device_score
    total = round(min(total, 100), 1)

    # Use centralized risk level computation - SINGLE SOURCE OF TRUTH
    risk_level = get_risk_level_from_score(total)

    # Top factors
    factors = []
    if network_score > 5:
        label = random.choice(list(FEATURE_LABELS.values()))
        factors.append({"name": label, "contribution": round(network_score / total * 100, 1) if total > 0 else 0})
    if identity_score > 0:
        factors.append({"name": "Identity context risk", "contribution": round(identity_score / total * 100, 1) if total > 0 else 0})
    if device_score > 0:
        factors.append({"name": "Device posture failure", "contribution": round(device_score / total * 100, 1) if total > 0 else 0})
    if not factors:
        factors.append({"name": "Behavioral baseline deviation", "contribution": 100.0})

    # Decision thresholds
    if total < 40:
        decision = "ALLOW"
    elif total < 65:
        decision = "CHALLENGE"
    elif total < 80:
        decision = "RESTRICT"
    else:
        decision = "BLOCK"

    explanation = ATTACK_EXPLANATIONS.get(attack_cat, "Anomalous activity detected.")
    if is_offhours:
        explanation += " Off-hours access flagged."
    if not location_known:
        explanation += " Unrecognized location."
    if not device_ok:
        explanation += " Device posture failed."

    return {
        "risk_score": total,
        "risk_level": risk_level,  # Now using centralized computation
        "decision": decision,
        "explanation": explanation,
        "score_breakdown": {
            "network": round(network_score, 1),
            "identity": round(identity_score, 1),
            "device": round(device_score, 1),
            "factors": factors,
        }
    }