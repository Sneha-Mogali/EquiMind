"""
Test script for Supabase integration
Verifies database connection, entity operations, and fallback mode
"""
import sys
from database import init_supabase, get_all_entities, get_entity_by_id, update_entity_risk_score
from entities import initialize_entities, is_using_supabase, get_all_entities as entities_get_all

def test_supabase_connection():
    """Test Supabase client initialization"""
    print("\n" + "="*60)
    print("TEST 1: Supabase Connection")
    print("="*60)
    
    client = init_supabase()
    if client:
        print("✓ Supabase client initialized successfully")
        return True
    else:
        print("✗ Supabase client initialization failed")
        print("  This is expected if credentials are not configured")
        return False

def test_entity_fetch():
    """Test fetching entities from database"""
    print("\n" + "="*60)
    print("TEST 2: Entity Fetch")
    print("="*60)
    
    entities = get_all_entities()
    if entities:
        print(f"✓ Fetched {len(entities)} entities from database")
        print(f"  Sample: {entities[0]['name']} ({entities[0]['role']})")
        return True
    else:
        print("✗ No entities fetched")
        return False

def test_entity_by_id():
    """Test fetching specific entity"""
    print("\n" + "="*60)
    print("TEST 3: Entity by ID")
    print("="*60)
    
    entity = get_entity_by_id("u01")
    if entity:
        print(f"✓ Fetched entity: {entity['name']}")
        print(f"  Role: {entity['role']}")
        print(f"  Risk Score: {entity['risk_score']}")
        return True
    else:
        print("✗ Entity not found")
        return False

def test_risk_score_update():
    """Test updating entity risk score"""
    print("\n" + "="*60)
    print("TEST 4: Risk Score Update")
    print("="*60)
    
    # Get current score
    entity = get_entity_by_id("u01")
    if not entity:
        print("✗ Cannot test - entity not found")
        return False
    
    original_score = entity['risk_score']
    new_score = 75.5
    
    # Update score
    success = update_entity_risk_score("u01", new_score, 10)
    if success:
        # Verify update
        updated_entity = get_entity_by_id("u01")
        if updated_entity and updated_entity['risk_score'] == new_score:
            print(f"✓ Risk score updated: {original_score} → {new_score}")
            # Restore original score
            update_entity_risk_score("u01", original_score, entity.get('trust_reserve', 15))
            return True
        else:
            print("✗ Risk score update verification failed")
            return False
    else:
        print("✗ Risk score update failed")
        return False

def test_entity_system():
    """Test the entity management system"""
    print("\n" + "="*60)
    print("TEST 5: Entity System Integration")
    print("="*60)
    
    initialize_entities()
    
    mode = "Supabase" if is_using_supabase() else "Fallback"
    print(f"✓ Entity system initialized in {mode} mode")
    
    entities = entities_get_all()
    print(f"✓ Entity system has {len(entities)} entities")
    
    if entities:
        print(f"  Sample entities:")
        for i, entity in enumerate(entities[:3]):
            print(f"    {i+1}. {entity['name']:20} | {entity['role']:25} | Risk: {entity['risk_score']}")
        return True
    else:
        print("✗ No entities in system")
        return False

def test_fallback_mode():
    """Test fallback mode"""
    print("\n" + "="*60)
    print("TEST 6: Fallback Mode")
    print("="*60)
    
    # This test just verifies fallback entities exist
    from entities import FALLBACK_ENTITIES
    
    if FALLBACK_ENTITIES and len(FALLBACK_ENTITIES) > 0:
        print(f"✓ Fallback mode has {len(FALLBACK_ENTITIES)} entities")
        print(f"  Sample: {FALLBACK_ENTITIES[0]['name']} ({FALLBACK_ENTITIES[0]['role']})")
        return True
    else:
        print("✗ Fallback entities not available")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("EquiMind Supabase Integration Tests")
    print("="*60)
    
    results = []
    
    # Test 1: Connection
    results.append(("Supabase Connection", test_supabase_connection()))
    
    # Only run database tests if connection succeeded
    if results[0][1]:
        results.append(("Entity Fetch", test_entity_fetch()))
        results.append(("Entity by ID", test_entity_by_id()))
        results.append(("Risk Score Update", test_risk_score_update()))
    else:
        print("\nSkipping database tests (no connection)")
    
    # Test entity system (works in both modes)
    results.append(("Entity System", test_entity_system()))
    results.append(("Fallback Mode", test_fallback_mode()))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:8} | {test_name}")
    
    print("-"*60)
    print(f"Results: {passed}/{total} tests passed")
    print("="*60)
    
    if passed == total:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n⚠ {total - passed} test(s) failed")
        if not results[0][1]:
            print("\nNote: Database tests failed because Supabase is not configured.")
            print("This is expected if you haven't set up Supabase yet.")
            print("The system will work in fallback mode.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
