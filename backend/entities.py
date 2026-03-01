"""
Entity management with Supabase integration and fallback
"""
import random
from typing import List, Dict, Optional
from database import (
    init_supabase,
    get_all_entities as db_get_all_entities,
    get_entity_by_id as db_get_entity_by_id,
    update_entity_risk_score as db_update_entity_risk_score
)

# Fallback hardcoded entities (used if Supabase is not available)
FALLBACK_ENTITIES = [
    {"id": "u01", "name": "j.hernandez",  "role": "Data Analyst",      "dept": "Finance",     "location": "Mumbai, IN",     "device": "MacBook-7F2A",  "trust_reserve": 12, "risk_score": 22},
    {"id": "u02", "name": "r.chen",        "role": "Backend Engineer",  "dept": "Engineering", "location": "Pune, IN",       "device": "ThinkPad-3C9B", "trust_reserve": 15, "risk_score": 18},
    {"id": "u03", "name": "a.petrov",      "role": "DB Admin",          "dept": "IT",          "location": "Delhi, IN",      "device": "Dell-XPS-1A2B", "trust_reserve": 8,  "risk_score": 45},
    {"id": "u04", "name": "m.okonkwo",     "role": "HR Manager",        "dept": "HR",          "location": "Bangalore, IN",  "device": "MacBook-9D4E",  "trust_reserve": 14, "risk_score": 30},
    {"id": "u05", "name": "s.patel",       "role": "DevOps Engineer",   "dept": "Engineering", "location": "Hyderabad, IN",  "device": "Ubuntu-5F6G",   "trust_reserve": 11, "risk_score": 80},
    {"id": "u06", "name": "k.nakamura",    "role": "Security Analyst",  "dept": "Security",    "location": "Chennai, IN",    "device": "MacBook-2H7I",  "trust_reserve": 13, "risk_score": 19},
    {"id": "u07", "name": "b.wilson",      "role": "Finance Manager",   "dept": "Finance",     "location": "Mumbai, IN",     "device": "WinPC-8J9K",    "trust_reserve": 10, "risk_score": 38},
    {"id": "u08", "name": "l.garcia",      "role": "Product Manager",   "dept": "Product",     "location": "Pune, IN",       "device": "MacBook-4L5M",  "trust_reserve": 15, "risk_score": 21},
    {"id": "u09", "name": "t.obi",         "role": "ML Engineer",       "dept": "Engineering", "location": "Bangalore, IN",  "device": "Ubuntu-6N7O",   "trust_reserve": 12, "risk_score": 27},
    {"id": "u10", "name": "a.sharma",      "role": "Contractor",        "dept": "External",    "location": "Delhi, IN",      "device": "Personal-8P9Q", "trust_reserve": 4,  "risk_score": 55},
    {"id": "s01", "name": "svc-db-01",     "role": "Service Account",   "dept": "IT",          "location": "Internal",       "device": "Server-DB01",   "trust_reserve": 15, "risk_score": 15},
    {"id": "s02", "name": "svc-api-02",    "role": "Service Account",   "dept": "Engineering", "location": "Internal",       "device": "Server-API02",  "trust_reserve": 15, "risk_score": 12},
    {"id": "s03", "name": "svc-backup-03", "role": "Service Account",   "dept": "IT",          "location": "Internal",       "device": "Server-BKP03",  "trust_reserve": 15, "risk_score": 10},
]

# Global state
_use_supabase = False
_entities_cache = []

def initialize_entities():
    """Initialize entity system - try Supabase first, fallback to hardcoded"""
    global _use_supabase, _entities_cache
    
    # Try to initialize Supabase
    supabase = init_supabase()
    if supabase:
        entities = db_get_all_entities()
        if entities and len(entities) > 0:
            _use_supabase = True
            _entities_cache = entities
            print(f"INFO:     Using Supabase database with {len(entities)} entities")
            return
    
    # Fallback to hardcoded entities
    _use_supabase = False
    _entities_cache = FALLBACK_ENTITIES.copy()
    print(f"INFO:     Using fallback mode with {len(_entities_cache)} hardcoded entities")

def get_all_entities() -> List[Dict]:
    """Get all entities from Supabase or fallback"""
    global _entities_cache
    
    if _use_supabase:
        entities = db_get_all_entities()
        if entities:
            _entities_cache = entities
            return entities
        # If fetch fails, return cached data
        return _entities_cache
    
    return _entities_cache

def get_entity_by_id(entity_id: str) -> Optional[Dict]:
    """Get entity by ID from Supabase or fallback"""
    if _use_supabase:
        entity = db_get_entity_by_id(entity_id)
        if entity:
            return entity
    
    # Fallback search
    return next((e for e in _entities_cache if e["id"] == entity_id), None)

def update_entity_score(entity_id: str, new_score: float):
    """Update entity risk score in Supabase or fallback"""
    global _entities_cache
    
    # Find entity in cache
    entity = None
    for e in _entities_cache:
        if e["id"] == entity_id:
            entity = e
            break
    
    if not entity:
        return
    
    # Store previous score
    entity["prev_score"] = entity.get("risk_score", 0)
    entity["risk_score"] = round(new_score, 2)
    
    # Update trust reserve
    trust_decrease = 1 if new_score > 65 else 0
    entity["trust_reserve"] = max(0, entity.get("trust_reserve", 15) - trust_decrease)
    
    # Update in Supabase if available
    if _use_supabase:
        db_update_entity_risk_score(entity_id, new_score, entity["trust_reserve"])

def get_random_entity() -> Dict:
    """Get a random entity"""
    entities = get_all_entities()
    return random.choice(entities) if entities else FALLBACK_ENTITIES[0]

def is_using_supabase() -> bool:
    """Check if system is using Supabase"""
    return _use_supabase