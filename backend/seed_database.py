"""
Seed script to populate Supabase with initial organization data
Creates 20 entities (users and service accounts) for simulation
"""
import random
from database import init_supabase, create_entity, get_entity_count

# Organization data for 20 entities
SEED_ENTITIES = [
    # Engineering Department
    {"id": "u01", "name": "j.hernandez", "role": "Senior Backend Engineer", "dept": "Engineering", "location": "Mumbai, IN", "device": "MacBook-7F2A", "trust_reserve": 15, "risk_score": 22},
    {"id": "u02", "name": "r.chen", "role": "Frontend Engineer", "dept": "Engineering", "location": "Pune, IN", "device": "ThinkPad-3C9B", "trust_reserve": 15, "risk_score": 18},
    {"id": "u03", "name": "t.obi", "role": "ML Engineer", "dept": "Engineering", "location": "Bangalore, IN", "device": "Ubuntu-6N7O", "trust_reserve": 14, "risk_score": 27},
    {"id": "u04", "name": "s.patel", "role": "DevOps Engineer", "dept": "Engineering", "location": "Hyderabad, IN", "device": "Ubuntu-5F6G", "trust_reserve": 13, "risk_score": 35},
    
    # IT & Security Department
    {"id": "u05", "name": "a.petrov", "role": "Database Administrator", "dept": "IT", "location": "Delhi, IN", "device": "Dell-XPS-1A2B", "trust_reserve": 12, "risk_score": 45},
    {"id": "u06", "name": "k.nakamura", "role": "Security Analyst", "dept": "Security", "location": "Chennai, IN", "device": "MacBook-2H7I", "trust_reserve": 15, "risk_score": 19},
    {"id": "u07", "name": "m.silva", "role": "IT Support Specialist", "dept": "IT", "location": "Mumbai, IN", "device": "WinPC-4K8L", "trust_reserve": 13, "risk_score": 28},
    
    # Finance Department
    {"id": "u08", "name": "a.sharma", "role": "Data Analyst", "dept": "Finance", "location": "Mumbai, IN", "device": "MacBook-9M3N", "trust_reserve": 14, "risk_score": 24},
    {"id": "u09", "name": "b.wilson", "role": "Finance Manager", "dept": "Finance", "location": "Pune, IN", "device": "WinPC-8J9K", "trust_reserve": 15, "risk_score": 20},
    {"id": "u10", "name": "c.rodriguez", "role": "Financial Analyst", "dept": "Finance", "location": "Bangalore, IN", "device": "MacBook-5P2Q", "trust_reserve": 14, "risk_score": 26},
    
    # Product & Design
    {"id": "u11", "name": "l.garcia", "role": "Product Manager", "dept": "Product", "location": "Delhi, IN", "device": "MacBook-4L5M", "trust_reserve": 15, "risk_score": 21},
    {"id": "u12", "name": "n.kim", "role": "UX Designer", "dept": "Product", "location": "Hyderabad, IN", "device": "MacBook-7R8S", "trust_reserve": 14, "risk_score": 23},
    
    # HR & Operations
    {"id": "u13", "name": "m.okonkwo", "role": "HR Manager", "dept": "HR", "location": "Chennai, IN", "device": "MacBook-9D4E", "trust_reserve": 15, "risk_score": 19},
    {"id": "u14", "name": "p.nguyen", "role": "Operations Manager", "dept": "Operations", "location": "Mumbai, IN", "device": "WinPC-6T9U", "trust_reserve": 14, "risk_score": 25},
    
    # External & Contractors
    {"id": "u15", "name": "d.contractor", "role": "External Consultant", "dept": "External", "location": "Remote", "device": "Personal-8P9Q", "trust_reserve": 8, "risk_score": 55},
    {"id": "u16", "name": "e.freelance", "role": "Contract Developer", "dept": "External", "location": "Remote", "device": "Personal-3V4W", "trust_reserve": 7, "risk_score": 62},
    
    # Service Accounts
    {"id": "s01", "name": "svc-db-01", "role": "Database Service", "dept": "IT", "location": "Internal", "device": "Server-DB01", "trust_reserve": 15, "risk_score": 15},
    {"id": "s02", "name": "svc-api-02", "role": "API Service", "dept": "Engineering", "location": "Internal", "device": "Server-API02", "trust_reserve": 15, "risk_score": 12},
    {"id": "s03", "name": "svc-backup-03", "role": "Backup Service", "dept": "IT", "location": "Internal", "device": "Server-BKP03", "trust_reserve": 15, "risk_score": 10},
    {"id": "s04", "name": "svc-monitor-04", "role": "Monitoring Service", "dept": "IT", "location": "Internal", "device": "Server-MON04", "trust_reserve": 15, "risk_score": 11},
]

def seed_database():
    """Seed the database with initial entities"""
    print("=" * 60)
    print("EquiMind Database Seeding")
    print("=" * 60)
    
    # Initialize Supabase
    supabase = init_supabase()
    if not supabase:
        print("\nERROR: Could not initialize Supabase client.")
        print("Please ensure SUPABASE_URL and SUPABASE_KEY are set in .env file")
        return False
    
    # Check if entities already exist
    existing_count = get_entity_count()
    if existing_count > 0:
        print(f"\nWARNING: Database already contains {existing_count} entities.")
        response = input("Do you want to add more entities? (yes/no): ").lower()
        if response != "yes":
            print("Seeding cancelled.")
            return False
    
    print(f"\nSeeding {len(SEED_ENTITIES)} entities...")
    print("-" * 60)
    
    success_count = 0
    for entity in SEED_ENTITIES:
        result = create_entity(entity)
        if result:
            print(f"✓ Created: {entity['name']:20} | {entity['role']:25} | {entity['dept']}")
            success_count += 1
        else:
            print(f"✗ Failed:  {entity['name']:20} | {entity['role']:25} | {entity['dept']}")
    
    print("-" * 60)
    print(f"\nSeeding complete: {success_count}/{len(SEED_ENTITIES)} entities created")
    print("=" * 60)
    
    return success_count == len(SEED_ENTITIES)

if __name__ == "__main__":
    seed_database()
