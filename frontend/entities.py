import random

ENTITIES = [
    {"id": "u01", "name": "j.hernandez",  "role": "Data Analyst",      "dept": "Finance",     "location": "Mumbai, IN",     "device": "MacBook-7F2A",  "trust_reserve": 12, "risk_score": 22},
    {"id": "u02", "name": "r.chen",        "role": "Backend Engineer",  "dept": "Engineering", "location": "Pune, IN",       "device": "ThinkPad-3C9B", "trust_reserve": 15, "risk_score": 18},
    {"id": "u03", "name": "a.petrov",      "role": "DB Admin",          "dept": "IT",          "location": "Delhi, IN",      "device": "Dell-XPS-1A2B", "trust_reserve": 8,  "risk_score": 45},
    {"id": "u04", "name": "m.okonkwo",     "role": "HR Manager",        "dept": "HR",          "location": "Bangalore, IN",  "device": "MacBook-9D4E",  "trust_reserve": 14, "risk_score": 30},
    {"id": "u05", "name": "s.patel",       "role": "DevOps Engineer",   "dept": "Engineering", "location": "Hyderabad, IN",  "device": "Ubuntu-5F6G",   "trust_reserve": 11, "risk_score": 25},
    {"id": "u06", "name": "k.nakamura",    "role": "Security Analyst",  "dept": "Security",    "location": "Chennai, IN",    "device": "MacBook-2H7I",  "trust_reserve": 13, "risk_score": 19},
    {"id": "u07", "name": "b.wilson",      "role": "Finance Manager",   "dept": "Finance",     "location": "Mumbai, IN",     "device": "WinPC-8J9K",    "trust_reserve": 10, "risk_score": 38},
    {"id": "u08", "name": "l.garcia",      "role": "Product Manager",   "dept": "Product",     "location": "Pune, IN",       "device": "MacBook-4L5M",  "trust_reserve": 15, "risk_score": 21},
    {"id": "u09", "name": "t.obi",         "role": "ML Engineer",       "dept": "Engineering", "location": "Bangalore, IN",  "device": "Ubuntu-6N7O",   "trust_reserve": 12, "risk_score": 27},
    {"id": "u10", "name": "a.sharma",      "role": "Contractor",        "dept": "External",    "location": "Delhi, IN",      "device": "Personal-8P9Q", "trust_reserve": 4,  "risk_score": 55},
    {"id": "s01", "name": "svc-db-01",     "role": "Service Account",   "dept": "IT",          "location": "Internal",       "device": "Server-DB01",   "trust_reserve": 15, "risk_score": 15},
    {"id": "s02", "name": "svc-api-02",    "role": "Service Account",   "dept": "Engineering", "location": "Internal",       "device": "Server-API02",  "trust_reserve": 15, "risk_score": 12},
    {"id": "s03", "name": "svc-backup-03", "role": "Service Account",   "dept": "IT",          "location": "Internal",       "device": "Server-BKP03",  "trust_reserve": 15, "risk_score": 10},
]

def get_all_entities():
    return ENTITIES

def get_entity_by_id(entity_id: str):
    return next((e for e in ENTITIES if e["id"] == entity_id), None)

def update_entity_score(entity_id: str, new_score: float):
    for e in ENTITIES:
        if e["id"] == entity_id:
            e["prev_score"] = e["risk_score"]
            e["risk_score"] = new_score
            e["trust_reserve"] = max(0, e["trust_reserve"] - (1 if new_score > 65 else 0))
            break

def get_random_entity():
    return random.choice(ENTITIES)