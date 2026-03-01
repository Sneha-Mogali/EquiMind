#!/usr/bin/env python3
"""
Autonomous Policy Engine
- Explainable security decisions
- Auto-updating policies based on threat landscape
- Real-time policy evaluation and enforcement
"""

import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum

class PolicyAction(Enum):
    ALLOW = "ALLOW"
    CHALLENGE = "CHALLENGE" 
    BLOCK = "BLOCK"
    HONEYPOT_MOVE = "HONEYPOT_MOVE"
    ISOLATION = "ISOLATION"
    MONITOR = "MONITOR"

class PolicyTrigger(Enum):
    RISK_THRESHOLD = "RISK_THRESHOLD"
    ATTACK_PATTERN = "ATTACK_PATTERN"
    ANOMALY_DETECTION = "ANOMALY_DETECTION"
    THREAT_INTELLIGENCE = "THREAT_INTELLIGENCE"
    BEHAVIORAL_ANALYSIS = "BEHAVIORAL_ANALYSIS"
    NETWORK_ANALYSIS = "NETWORK_ANALYSIS"

@dataclass
class PolicyRule:
    id: str
    name: str
    description: str
    trigger: PolicyTrigger
    conditions: Dict[str, Any]
    action: PolicyAction
    priority: int
    confidence_threshold: float
    auto_update: bool
    created_at: str
    last_updated: str
    trigger_count: int = 0
    success_rate: float = 0.0
    false_positive_rate: float = 0.0

@dataclass
class PolicyDecision:
    decision_id: str
    event_id: str
    entity_id: str
    triggered_rules: List[str]
    final_action: PolicyAction
    confidence: float
    explanation: str
    reasoning_chain: List[str]
    risk_factors: Dict[str, float]
    timestamp: str
    execution_time_ms: float

class AutonomousPolicyEngine:
    def __init__(self):
        self.policies: Dict[str, PolicyRule] = {}
        self.decision_history: List[PolicyDecision] = []
        self.threat_landscape: Dict[str, Any] = {}
        self.learning_enabled = True
        
        # Initialize default policies
        self._initialize_default_policies()
        
    def _initialize_default_policies(self):
        """Initialize core security policies"""
        
        # High Risk Threshold Policy
        self.policies["high_risk_block"] = PolicyRule(
            id="high_risk_block",
            name="High Risk Entity Block",
            description="Block entities with risk score >= 85%",
            trigger=PolicyTrigger.RISK_THRESHOLD,
            conditions={
                "risk_score_min": 85,
                "attack_categories": ["Exploits", "U2R", "R2L"],
                "confidence_min": 0.8
            },
            action=PolicyAction.BLOCK,
            priority=1,
            confidence_threshold=0.8,
            auto_update=True,
            created_at=datetime.now(timezone.utc).isoformat(),
            last_updated=datetime.now(timezone.utc).isoformat()
        )
        
        # Honeypot Movement Policy
        self.policies["honeypot_redirect"] = PolicyRule(
            id="honeypot_redirect",
            name="Honeypot Redirection",
            description="Move suspicious entities to honeypot environment",
            trigger=PolicyTrigger.BEHAVIORAL_ANALYSIS,
            conditions={
                "risk_score_min": 70,
                "risk_score_max": 84,
                "attack_categories": ["Probe", "DoS"],
                "repeated_attempts": True
            },
            action=PolicyAction.HONEYPOT_MOVE,
            priority=2,
            confidence_threshold=0.7,
            auto_update=True,
            created_at=datetime.now(timezone.utc).isoformat(),
            last_updated=datetime.now(timezone.utc).isoformat()
        )
        
        # Network Anomaly Policy
        self.policies["network_anomaly"] = PolicyRule(
            id="network_anomaly",
            name="Network Anomaly Detection",
            description="Challenge unusual network patterns",
            trigger=PolicyTrigger.NETWORK_ANALYSIS,
            conditions={
                "unusual_traffic_pattern": True,
                "bytes_threshold": 1000000,  # 1MB
                "connection_rate_threshold": 10
            },
            action=PolicyAction.CHALLENGE,
            priority=3,
            confidence_threshold=0.6,
            auto_update=True,
            created_at=datetime.now(timezone.utc).isoformat(),
            last_updated=datetime.now(timezone.utc).isoformat()
        )
        
        # Isolation Policy for Critical Attacks
        self.policies["critical_isolation"] = PolicyRule(
            id="critical_isolation",
            name="Critical Attack Isolation",
            description="Isolate entities showing critical attack patterns",
            trigger=PolicyTrigger.ATTACK_PATTERN,
            conditions={
                "severity": "CRITICAL",
                "attack_categories": ["Exploits", "U2R"],
                "lateral_movement_risk": True
            },
            action=PolicyAction.ISOLATION,
            priority=1,
            confidence_threshold=0.9,
            auto_update=True,
            created_at=datetime.now(timezone.utc).isoformat(),
            last_updated=datetime.now(timezone.utc).isoformat()
        )
        
        # Enhanced Monitoring Policy
        self.policies["enhanced_monitoring"] = PolicyRule(
            id="enhanced_monitoring",
            name="Enhanced Monitoring",
            description="Apply enhanced monitoring to medium-risk entities",
            trigger=PolicyTrigger.RISK_THRESHOLD,
            conditions={
                "risk_score_min": 40,
                "risk_score_max": 69,
                "behavioral_deviation": True
            },
            action=PolicyAction.MONITOR,
            priority=4,
            confidence_threshold=0.5,
            auto_update=True,
            created_at=datetime.now(timezone.utc).isoformat(),
            last_updated=datetime.now(timezone.utc).isoformat()
        )

    def evaluate_event(self, event: Dict[str, Any]) -> PolicyDecision:
        """Evaluate an event against all policies and make a decision"""
        start_time = time.time()
        
        triggered_rules = []
        risk_factors = {}
        reasoning_chain = []
        
        # Extract event data
        entity_id = event.get('user', 'unknown')
        risk_score = event.get('risk_score', 0)
        attack_cat = event.get('attack_cat', 'Normal')
        severity = event.get('severity', 'LOW')
        confidence = event.get('confidence', 0.0)
        
        # Evaluate each policy
        for policy_id, policy in self.policies.items():
            if self._evaluate_policy_conditions(event, policy):
                triggered_rules.append(policy_id)
                reasoning_chain.append(f"Policy '{policy.name}' triggered: {policy.description}")
                
                # Update policy statistics
                policy.trigger_count += 1
        
        # Determine final action based on highest priority triggered rule
        final_action = PolicyAction.ALLOW
        highest_priority = 999
        primary_policy = None
        
        for rule_id in triggered_rules:
            policy = self.policies[rule_id]
            if policy.priority < highest_priority:
                highest_priority = policy.priority
                final_action = policy.action
                primary_policy = policy
        
        # Build risk factors
        risk_factors = {
            "risk_score": risk_score,
            "attack_severity": self._severity_to_score(severity),
            "ml_confidence": confidence,
            "attack_category_risk": self._attack_category_risk(attack_cat),
            "behavioral_risk": self._calculate_behavioral_risk(event),
            "network_risk": self._calculate_network_risk(event)
        }
        
        # Generate explanation
        explanation = self._generate_explanation(
            final_action, triggered_rules, risk_factors, primary_policy
        )
        
        # Create decision
        decision = PolicyDecision(
            decision_id=f"decision_{int(time.time() * 1000)}",
            event_id=event.get('id', 'unknown'),
            entity_id=entity_id,
            triggered_rules=triggered_rules,
            final_action=final_action,
            confidence=max([self.policies[r].confidence_threshold for r in triggered_rules] + [0.5]),
            explanation=explanation,
            reasoning_chain=reasoning_chain,
            risk_factors=risk_factors,
            timestamp=datetime.now(timezone.utc).isoformat(),
            execution_time_ms=(time.time() - start_time) * 1000
        )
        
        # Store decision
        self.decision_history.append(decision)
        
        # Auto-update policies if learning is enabled
        if self.learning_enabled:
            self._update_policies_from_decision(decision, event)
        
        return decision

    def _evaluate_policy_conditions(self, event: Dict[str, Any], policy: PolicyRule) -> bool:
        """Evaluate if an event meets policy conditions"""
        conditions = policy.conditions
        
        # Risk threshold check
        if "risk_score_min" in conditions:
            if event.get('risk_score', 0) < conditions["risk_score_min"]:
                return False
                
        if "risk_score_max" in conditions:
            if event.get('risk_score', 0) > conditions["risk_score_max"]:
                return False
        
        # Attack category check
        if "attack_categories" in conditions:
            if event.get('attack_cat') not in conditions["attack_categories"]:
                return False
        
        # Confidence check
        if "confidence_min" in conditions:
            if event.get('confidence', 0) < conditions["confidence_min"]:
                return False
        
        # Severity check
        if "severity" in conditions:
            if event.get('severity') != conditions["severity"]:
                return False
        
        # Network analysis checks
        if "bytes_threshold" in conditions:
            raw_data = event.get('raw_network_data', {})
            total_bytes = (raw_data.get('sbytes', 0) or 0) + (raw_data.get('dbytes', 0) or 0)
            if total_bytes < conditions["bytes_threshold"]:
                return False
        
        return True

    def _generate_explanation(self, action: PolicyAction, triggered_rules: List[str], 
                            risk_factors: Dict[str, float], primary_policy: Optional[PolicyRule]) -> str:
        """Generate human-readable explanation for the decision"""
        
        if not triggered_rules:
            return "No security policies triggered. Entity allowed with standard monitoring."
        
        explanation_parts = []
        
        # Primary action explanation
        action_explanations = {
            PolicyAction.BLOCK: "🚫 BLOCKED: Entity poses significant security risk",
            PolicyAction.HONEYPOT_MOVE: "🍯 HONEYPOT: Entity redirected to controlled environment", 
            PolicyAction.ISOLATION: "🔒 ISOLATED: Entity quarantined from network",
            PolicyAction.CHALLENGE: "⚠️ CHALLENGED: Additional authentication required",
            PolicyAction.MONITOR: "👁️ MONITORING: Enhanced surveillance activated",
            PolicyAction.ALLOW: "✅ ALLOWED: Standard access granted"
        }
        
        explanation_parts.append(action_explanations.get(action, "Action taken"))
        
        # Risk factor breakdown
        high_risk_factors = [k for k, v in risk_factors.items() if v > 0.7]
        if high_risk_factors:
            explanation_parts.append(f"High-risk factors: {', '.join(high_risk_factors)}")
        
        # Primary policy explanation
        if primary_policy:
            explanation_parts.append(f"Primary policy: {primary_policy.name}")
            explanation_parts.append(f"Rationale: {primary_policy.description}")
        
        # Additional triggered policies
        if len(triggered_rules) > 1:
            other_policies = [self.policies[r].name for r in triggered_rules[1:]]
            explanation_parts.append(f"Additional policies: {', '.join(other_policies)}")
        
        return " | ".join(explanation_parts)

    def _severity_to_score(self, severity: str) -> float:
        """Convert severity to numeric score"""
        severity_map = {
            "CRITICAL": 1.0,
            "HIGH": 0.8,
            "MEDIUM": 0.6,
            "LOW": 0.3,
            "INFO": 0.1
        }
        return severity_map.get(severity, 0.5)

    def _attack_category_risk(self, attack_cat: str) -> float:
        """Calculate risk score for attack category"""
        risk_map = {
            "Exploits": 0.95,
            "U2R": 0.90,
            "R2L": 0.85,
            "DoS": 0.70,
            "Probe": 0.60,
            "Normal": 0.1
        }
        return risk_map.get(attack_cat, 0.5)

    def _calculate_behavioral_risk(self, event: Dict[str, Any]) -> float:
        """Calculate behavioral risk based on event patterns"""
        # Simplified behavioral risk calculation
        risk_score = event.get('risk_score', 0) / 100.0
        confidence = event.get('confidence', 0.5)
        return (risk_score * 0.7) + (confidence * 0.3)

    def _calculate_network_risk(self, event: Dict[str, Any]) -> float:
        """Calculate network-based risk factors"""
        raw_data = event.get('raw_network_data', {})
        
        # Check for unusual network patterns
        risk_factors = []
        
        # High data transfer
        total_bytes = (raw_data.get('sbytes', 0) or 0) + (raw_data.get('dbytes', 0) or 0)
        if total_bytes > 1000000:  # > 1MB
            risk_factors.append(0.8)
        
        # Unusual protocols
        proto = raw_data.get('proto', '').lower()
        if proto in ['icmp', 'igmp']:
            risk_factors.append(0.7)
        
        # High connection rate
        rate = raw_data.get('rate', 0) or 0
        if rate > 1000:  # High rate
            risk_factors.append(0.6)
        
        return max(risk_factors) if risk_factors else 0.3

    def _update_policies_from_decision(self, decision: PolicyDecision, event: Dict[str, Any]):
        """Auto-update policies based on decision outcomes"""
        # This would implement machine learning-based policy updates
        # For now, we'll do simple threshold adjustments
        
        for rule_id in decision.triggered_rules:
            policy = self.policies[rule_id]
            if policy.auto_update:
                # Adjust confidence thresholds based on success patterns
                # This is a simplified version - real implementation would be more sophisticated
                policy.last_updated = datetime.now(timezone.utc).isoformat()

    def get_policy_status(self) -> Dict[str, Any]:
        """Get current policy engine status"""
        return {
            "total_policies": len(self.policies),
            "active_policies": len([p for p in self.policies.values() if p.auto_update]),
            "total_decisions": len(self.decision_history),
            "recent_decisions": [asdict(d) for d in self.decision_history[-10:]],
            "policy_summary": [
                {
                    "id": p.id,
                    "name": p.name,
                    "action": p.action.value,
                    "priority": p.priority,
                    "trigger_count": p.trigger_count,
                    "auto_update": p.auto_update
                }
                for p in self.policies.values()
            ]
        }

    def get_policy_explanations(self) -> List[Dict[str, Any]]:
        """Get detailed policy explanations for UI"""
        return [
            {
                "id": policy.id,
                "name": policy.name,
                "description": policy.description,
                "trigger": policy.trigger.value,
                "action": policy.action.value,
                "conditions": policy.conditions,
                "priority": policy.priority,
                "confidence_threshold": policy.confidence_threshold,
                "auto_update": policy.auto_update,
                "trigger_count": policy.trigger_count,
                "last_updated": policy.last_updated,
                "status": "ACTIVE" if policy.auto_update else "STATIC"
            }
            for policy in sorted(self.policies.values(), key=lambda x: x.priority)
        ]

# Global policy engine instance
policy_engine = AutonomousPolicyEngine()