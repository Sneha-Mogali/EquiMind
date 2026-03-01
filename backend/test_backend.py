"""
Comprehensive Backend Testing Suite
Tests all modules with edge cases and normal scenarios
"""

import requests
import json
import time
import asyncio
from datetime import datetime
from typing import Dict, List
import sys

# Configuration
BASE_URL = "http://localhost:8000"
WEBSOCKET_URL = "ws://localhost:8000/ws/live"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []
        
    def test(self, name: str, func):
        """Run a test and track results"""
        print(f"\n{Colors.BLUE}Testing: {name}{Colors.RESET}")
        try:
            result = func()
            if result:
                print(f"{Colors.GREEN}✓ PASSED{Colors.RESET}")
                self.passed += 1
            else:
                print(f"{Colors.RED}✗ FAILED{Colors.RESET}")
                self.failed += 1
            self.tests.append({"name": name, "passed": result})
        except Exception as e:
            print(f"{Colors.RED}✗ FAILED: {str(e)}{Colors.RESET}")
            self.failed += 1
            self.tests.append({"name": name, "passed": False, "error": str(e)})
    
    def summary(self):
        """Print test summary"""
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"{Colors.BLUE}TEST SUMMARY{Colors.RESET}")
        print(f"{'='*60}")
        print(f"Total Tests: {total}")
        print(f"{Colors.GREEN}Passed: {self.passed}{Colors.RESET}")
        print(f"{Colors.RED}Failed: {self.failed}{Colors.RESET}")
        print(f"Success Rate: {(self.passed/total*100):.1f}%")
        print(f"{'='*60}\n")

runner = TestRunner()

# ============================================================================
# 1. STATUS ENDPOINT TESTS
# ============================================================================

def test_status_endpoint():
    """Test /status endpoint returns valid data"""
    response = requests.get(f"{BASE_URL}/status")
    assert response.status_code == 200, "Status code should be 200"
    
    data = response.json()
    assert "status" in data, "Should have status field"
    assert data["status"] == "online", "Status should be online"
    assert "timestamp" in data, "Should have timestamp"
    assert "tension" in data, "Should have tension"
    assert "total_events" in data, "Should have total_events"
    assert "model_version" in data, "Should have model_version"
    
    print(f"  Status: {data['status']}")
    print(f"  Tension: {data['tension']}")
    print(f"  Total Events: {data['total_events']}")
    print(f"  Model Version: {data['model_version']}")
    return True

def test_status_response_time():
    """Test /status endpoint response time"""
    start = time.time()
    response = requests.get(f"{BASE_URL}/status")
    elapsed = time.time() - start
    
    assert response.status_code == 200, "Should return 200"
    assert elapsed < 1.0, f"Response time should be < 1s, got {elapsed:.3f}s"
    
    print(f"  Response time: {elapsed*1000:.2f}ms")
    return True

# ============================================================================
# 2. ENTITIES ENDPOINT TESTS
# ============================================================================

def test_entities_list():
    """Test /entities endpoint returns entity list"""
    response = requests.get(f"{BASE_URL}/entities")
    assert response.status_code == 200, "Status code should be 200"
    
    data = response.json()
    assert isinstance(data, list), "Should return a list"
    assert len(data) > 0, "Should have at least one entity"
    
    # Validate entity structure
    entity = data[0]
    required_fields = ["id", "name", "role", "dept", "location", "device", "risk_score"]
    for field in required_fields:
        assert field in entity, f"Entity should have {field} field"
    
    print(f"  Total Entities: {len(data)}")
    print(f"  Sample Entity: {entity['name']} ({entity['role']})")
    return True

def test_entity_by_id_valid():
    """Test /entity/{id} with valid ID"""
    # First get an entity ID
    entities = requests.get(f"{BASE_URL}/entities").json()
    entity_id = entities[0]["id"]
    
    response = requests.get(f"{BASE_URL}/entity/{entity_id}")
    assert response.status_code == 200, "Should return 200 for valid ID"
    
    data = response.json()
    assert data["id"] == entity_id, "Should return correct entity"
    assert "history" in data, "Should include history"
    
    print(f"  Entity: {data['name']}")
    print(f"  Risk Score: {data['risk_score']}")
    print(f"  History Events: {len(data['history'])}")
    return True

def test_entity_by_id_invalid():
    """Test /entity/{id} with invalid ID"""
    response = requests.get(f"{BASE_URL}/entity/invalid_id_12345")
    assert response.status_code == 404, "Should return 404 for invalid ID"
    
    data = response.json()
    assert "detail" in data, "Should have error detail"
    
    print(f"  Error: {data['detail']}")
    return True

def test_entity_edge_case_special_chars():
    """Test /entity/{id} with special characters"""
    response = requests.get(f"{BASE_URL}/entity/@#$%^&*()")
    assert response.status_code == 404, "Should return 404 for special chars"
    return True

# ============================================================================
# 3. EVENTS ENDPOINT TESTS
# ============================================================================

def test_events_default():
    """Test /events endpoint with default limit"""
    response = requests.get(f"{BASE_URL}/events")
    assert response.status_code == 200, "Status code should be 200"
    
    data = response.json()
    assert isinstance(data, list), "Should return a list"
    
    if len(data) > 0:
        event = data[0]
        required_fields = ["id", "timestamp", "severity", "user", "risk_score", "decision"]
        for field in required_fields:
            assert field in event, f"Event should have {field} field"
        
        print(f"  Total Events: {len(data)}")
        print(f"  Latest Event: {event['type']} - {event['decision']}")
    else:
        print(f"  No events yet (backend just started)")
    
    return True

def test_events_with_limit():
    """Test /events endpoint with custom limit"""
    response = requests.get(f"{BASE_URL}/events?limit=10")
    assert response.status_code == 200, "Status code should be 200"
    
    data = response.json()
    assert len(data) <= 10, "Should respect limit parameter"
    
    print(f"  Requested: 10, Got: {len(data)}")
    return True

def test_events_edge_case_zero_limit():
    """Test /events with limit=0"""
    response = requests.get(f"{BASE_URL}/events?limit=0")
    assert response.status_code == 200, "Should handle limit=0"
    
    data = response.json()
    assert len(data) == 0, "Should return empty list for limit=0"
    return True

def test_events_edge_case_negative_limit():
    """Test /events with negative limit"""
    response = requests.get(f"{BASE_URL}/events?limit=-5")
    # Should either handle gracefully or return error
    assert response.status_code in [200, 422], "Should handle negative limit"
    return True

def test_events_edge_case_large_limit():
    """Test /events with very large limit"""
    response = requests.get(f"{BASE_URL}/events?limit=10000")
    assert response.status_code == 200, "Should handle large limit"
    
    data = response.json()
    # Should be capped at max events (200)
    assert len(data) <= 200, "Should cap at max events"
    
    print(f"  Requested: 10000, Got: {len(data)}")
    return True

# ============================================================================
# 4. INCIDENTS ENDPOINT TESTS
# ============================================================================

def test_incidents_endpoint():
    """Test /incidents endpoint returns high-risk events"""
    response = requests.get(f"{BASE_URL}/incidents")
    assert response.status_code == 200, "Status code should be 200"
    
    data = response.json()
    assert isinstance(data, list), "Should return a list"
    
    # Validate all incidents are high severity
    for incident in data:
        severity = incident.get("severity")
        kill_chain = incident.get("kill_chain_id")
        assert severity in ["HIGH", "CRITICAL"] or kill_chain is not None, \
            "All incidents should be HIGH/CRITICAL or have kill_chain"
    
    print(f"  Total Incidents: {len(data)}")
    if len(data) > 0:
        print(f"  Severities: {[i['severity'] for i in data[:3]]}")
    return True

# ============================================================================
# 5. ML PREDICTION ENDPOINT TESTS
# ============================================================================

def test_predict_valid_input():
    """Test /predict with valid network flow data"""
    flow_data = {
        "proto": "tcp",
        "service": "http",
        "state": "CON",
        "attack_cat": "Normal",
        "sbytes": 1000.0,
        "dbytes": 2000.0,
        "stcpb": 0.0,
        "dtcpb": 0.0,
        "response_body_len": 500.0,
        "sloss": 0.0,
        "dloss": 0.0,
        "spkts": 10.0,
        "dpkts": 8.0,
        "swin": 8192.0,
        "dwin": 8192.0,
        "dmean": 1500.0,
        "ct_src_dport_ltm": 1.0,
        "ct_dst_sport_ltm": 1.0,
        "trans_depth": 1.0,
        "ct_ftp_cmd": 0.0,
        "ct_flw_http_mthd": 1.0,
        "is_ftp_login": 0.0,
        "is_sm_ips_ports": 0.0,
        "dur": 10.5,
        "rate": 100.0,
        "sload": 1000.0,
        "dload": 2000.0,
        "sinpkt": 100.0,
        "dinpkt": 125.0,
        "sjit": 0.1,
        "djit": 0.1,
        "tcprtt": 50.0,
        "synack": 10.0,
        "ackdat": 5.0
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=flow_data)
    assert response.status_code == 200, "Should return 200 for valid input"
    
    data = response.json()
    assert "risk_score" in data, "Should have risk_score"
    assert "risk_level" in data, "Should have risk_level"
    assert "confidence" in data, "Should have confidence"
    assert "timestamp" in data, "Should have timestamp"
    
    print(f"  Risk Score: {data['risk_score']}")
    print(f"  Risk Level: {data['risk_level']}")
    print(f"  Confidence: {data['confidence']}")
    return True

def test_predict_attack_scenario():
    """Test /predict with attack-like traffic"""
    attack_flow = {
        "proto": "tcp",
        "service": "ssh",
        "state": "RST",
        "attack_cat": "DoS",
        "sbytes": 50000.0,
        "dbytes": 100.0,
        "spkts": 1000.0,
        "dpkts": 10.0,
        "rate": 5000.0,
        "dur": 0.5,
        "sloss": 50.0,
        "dloss": 5.0,
        "stcpb": 0.0,
        "dtcpb": 0.0,
        "response_body_len": 0.0,
        "swin": 65535.0,
        "dwin": 0.0,
        "dmean": 100.0,
        "ct_src_dport_ltm": 50.0,
        "ct_dst_sport_ltm": 1.0,
        "trans_depth": 0.0,
        "ct_ftp_cmd": 0.0,
        "ct_flw_http_mthd": 0.0,
        "is_ftp_login": 0.0,
        "is_sm_ips_ports": 1.0,
        "sload": 100000.0,
        "dload": 100.0,
        "sinpkt": 50.0,
        "dinpkt": 10.0,
        "sjit": 10.0,
        "djit": 1.0,
        "tcprtt": 500.0,
        "synack": 100.0,
        "ackdat": 50.0
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=attack_flow)
    assert response.status_code == 200, "Should handle attack scenario"
    
    data = response.json()
    print(f"  Attack Risk Score: {data['risk_score']}")
    print(f"  Attack Risk Level: {data['risk_level']}")
    
    # Attack should have higher risk
    assert data['risk_score'] > 30, "Attack should have elevated risk score"
    return True

def test_predict_edge_case_empty():
    """Test /predict with empty data"""
    response = requests.post(f"{BASE_URL}/predict", json={})
    # Should either handle gracefully or return error
    assert response.status_code in [200, 422, 500], "Should handle empty input"
    return True

def test_predict_edge_case_missing_fields():
    """Test /predict with missing required fields"""
    partial_data = {
        "proto": "tcp",
        "service": "http"
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=partial_data)
    # Should handle missing fields (use defaults or error)
    assert response.status_code in [200, 422, 500], "Should handle missing fields"
    return True

def test_predict_edge_case_invalid_types():
    """Test /predict with invalid data types"""
    invalid_data = {
        "proto": "tcp",
        "sbytes": "not_a_number",  # Invalid type
        "dpkts": None
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=invalid_data)
    # Should handle invalid types gracefully
    assert response.status_code in [200, 422, 500], "Should handle invalid types"
    return True

# ============================================================================
# 6. METRICS ENDPOINT TESTS
# ============================================================================

def test_metrics_endpoint():
    """Test /metrics endpoint returns Prometheus metrics"""
    response = requests.get(f"{BASE_URL}/metrics")
    assert response.status_code == 200, "Status code should be 200"
    
    content = response.text
    assert "equimind_events_total" in content, "Should have events metric"
    assert "equimind_risk_score" in content, "Should have risk score metric"
    assert "equimind_ml_prediction_seconds" in content, "Should have ML prediction metric"
    
    print(f"  Metrics size: {len(content)} bytes")
    print(f"  Contains equimind_events_total: ✓")
    print(f"  Contains equimind_risk_score: ✓")
    return True

def test_metrics_format():
    """Test /metrics returns valid Prometheus format"""
    response = requests.get(f"{BASE_URL}/metrics")
    content = response.text
    
    # Check for Prometheus format markers
    assert "# HELP" in content, "Should have HELP comments"
    assert "# TYPE" in content, "Should have TYPE comments"
    
    # Check for metric types
    assert "counter" in content.lower() or "gauge" in content.lower(), \
        "Should have counter or gauge metrics"
    
    return True

# ============================================================================
# 7. LOAD TESTING
# ============================================================================

def test_concurrent_status_requests():
    """Test multiple concurrent status requests"""
    import concurrent.futures
    
    def make_request():
        return requests.get(f"{BASE_URL}/status")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request) for _ in range(20)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    success_count = sum(1 for r in results if r.status_code == 200)
    assert success_count == 20, f"All requests should succeed, got {success_count}/20"
    
    print(f"  Concurrent requests: 20")
    print(f"  Successful: {success_count}")
    return True

def test_rapid_fire_predictions():
    """Test rapid ML predictions"""
    flow_data = {
        "proto": "tcp",
        "service": "http",
        "state": "CON",
        "attack_cat": "Normal",
        "sbytes": 1000.0,
        "dbytes": 2000.0,
        "spkts": 10.0,
        "dpkts": 8.0,
        "dur": 10.5,
        "rate": 100.0,
        "stcpb": 0.0,
        "dtcpb": 0.0,
        "response_body_len": 500.0,
        "sloss": 0.0,
        "dloss": 0.0,
        "swin": 8192.0,
        "dwin": 8192.0,
        "dmean": 1500.0,
        "ct_src_dport_ltm": 1.0,
        "ct_dst_sport_ltm": 1.0,
        "trans_depth": 1.0,
        "ct_ftp_cmd": 0.0,
        "ct_flw_http_mthd": 1.0,
        "is_ftp_login": 0.0,
        "is_sm_ips_ports": 0.0,
        "sload": 1000.0,
        "dload": 2000.0,
        "sinpkt": 100.0,
        "dinpkt": 125.0,
        "sjit": 0.1,
        "djit": 0.1,
        "tcprtt": 50.0,
        "synack": 10.0,
        "ackdat": 5.0
    }
    
    start = time.time()
    success = 0
    for i in range(10):
        response = requests.post(f"{BASE_URL}/predict", json=flow_data)
        if response.status_code == 200:
            success += 1
    elapsed = time.time() - start
    
    assert success == 10, f"All predictions should succeed, got {success}/10"
    avg_time = elapsed / 10
    
    print(f"  Total predictions: 10")
    print(f"  Successful: {success}")
    print(f"  Total time: {elapsed:.2f}s")
    print(f"  Avg time per prediction: {avg_time*1000:.2f}ms")
    
    return True

# ============================================================================
# 8. MULTI-USER SIMULATION
# ============================================================================

def test_multi_user_simulation():
    """Simulate multiple users accessing different endpoints"""
    import concurrent.futures
    import random
    
    def user_session(user_id):
        """Simulate a user session"""
        actions = []
        
        # Get status
        r = requests.get(f"{BASE_URL}/status")
        actions.append(("status", r.status_code))
        
        # Get entities
        r = requests.get(f"{BASE_URL}/entities")
        actions.append(("entities", r.status_code))
        
        # Get events
        r = requests.get(f"{BASE_URL}/events?limit=20")
        actions.append(("events", r.status_code))
        
        # Random prediction
        if random.random() > 0.5:
            flow_data = {
                "proto": random.choice(["tcp", "udp"]),
                "service": random.choice(["http", "https", "ssh"]),
                "state": "CON",
                "attack_cat": "Normal",
                "sbytes": random.uniform(100, 5000),
                "dbytes": random.uniform(100, 5000),
                "spkts": random.uniform(1, 100),
                "dpkts": random.uniform(1, 100),
                "dur": random.uniform(0.1, 60),
                "rate": random.uniform(10, 1000),
                "stcpb": 0.0,
                "dtcpb": 0.0,
                "response_body_len": 500.0,
                "sloss": 0.0,
                "dloss": 0.0,
                "swin": 8192.0,
                "dwin": 8192.0,
                "dmean": 1500.0,
                "ct_src_dport_ltm": 1.0,
                "ct_dst_sport_ltm": 1.0,
                "trans_depth": 1.0,
                "ct_ftp_cmd": 0.0,
                "ct_flw_http_mthd": 1.0,
                "is_ftp_login": 0.0,
                "is_sm_ips_ports": 0.0,
                "sload": 1000.0,
                "dload": 2000.0,
                "sinpkt": 100.0,
                "dinpkt": 125.0,
                "sjit": 0.1,
                "djit": 0.1,
                "tcprtt": 50.0,
                "synack": 10.0,
                "ackdat": 5.0
            }
            r = requests.post(f"{BASE_URL}/predict", json=flow_data)
            actions.append(("predict", r.status_code))
        
        return user_id, actions
    
    print(f"  Simulating 15 concurrent users...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
        futures = [executor.submit(user_session, i) for i in range(15)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    # Analyze results
    total_actions = sum(len(actions) for _, actions in results)
    successful_actions = sum(
        1 for _, actions in results 
        for _, status in actions 
        if status == 200
    )
    
    print(f"  Total users: 15")
    print(f"  Total actions: {total_actions}")
    print(f"  Successful actions: {successful_actions}")
    print(f"  Success rate: {(successful_actions/total_actions*100):.1f}%")
    
    assert successful_actions / total_actions > 0.95, "Success rate should be > 95%"
    return True

# ============================================================================
# 9. STRESS TESTING
# ============================================================================

def test_sustained_load():
    """Test sustained load over time"""
    print(f"  Running sustained load test for 10 seconds...")
    
    start = time.time()
    request_count = 0
    success_count = 0
    
    while time.time() - start < 10:
        try:
            response = requests.get(f"{BASE_URL}/status", timeout=2)
            request_count += 1
            if response.status_code == 200:
                success_count += 1
        except:
            request_count += 1
        
        time.sleep(0.1)  # 10 requests per second
    
    elapsed = time.time() - start
    rps = request_count / elapsed
    success_rate = (success_count / request_count * 100) if request_count > 0 else 0
    
    print(f"  Duration: {elapsed:.1f}s")
    print(f"  Total requests: {request_count}")
    print(f"  Successful: {success_count}")
    print(f"  Requests/sec: {rps:.1f}")
    print(f"  Success rate: {success_rate:.1f}%")
    
    assert success_rate > 95, "Success rate should be > 95%"
    return True

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

def main():
    print(f"\n{'='*60}")
    print(f"{Colors.BLUE}EquiMind Backend Comprehensive Test Suite{Colors.RESET}")
    print(f"{'='*60}\n")
    
    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/status", timeout=5)
        print(f"{Colors.GREEN}✓ Backend is running at {BASE_URL}{Colors.RESET}\n")
    except:
        print(f"{Colors.RED}✗ Backend is not running at {BASE_URL}{Colors.RESET}")
        print(f"Please start the backend first: python backend/main.py")
        sys.exit(1)
    
    # Wait for events to accumulate
    print(f"{Colors.YELLOW}Waiting 10 seconds for events to accumulate...{Colors.RESET}")
    time.sleep(10)
    
    # Run all tests
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 1: STATUS ENDPOINT TESTS")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Status Endpoint", test_status_endpoint)
    runner.test("Status Response Time", test_status_response_time)
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 2: ENTITIES ENDPOINT TESTS")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Entities List", test_entities_list)
    runner.test("Entity By ID (Valid)", test_entity_by_id_valid)
    runner.test("Entity By ID (Invalid)", test_entity_by_id_invalid)
    runner.test("Entity Edge Case: Special Characters", test_entity_edge_case_special_chars)
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 3: EVENTS ENDPOINT TESTS")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Events Default", test_events_default)
    runner.test("Events With Limit", test_events_with_limit)
    runner.test("Events Edge Case: Zero Limit", test_events_edge_case_zero_limit)
    runner.test("Events Edge Case: Negative Limit", test_events_edge_case_negative_limit)
    runner.test("Events Edge Case: Large Limit", test_events_edge_case_large_limit)
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 4: INCIDENTS ENDPOINT TESTS")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Incidents Endpoint", test_incidents_endpoint)
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 5: ML PREDICTION TESTS")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Predict Valid Input", test_predict_valid_input)
    runner.test("Predict Attack Scenario", test_predict_attack_scenario)
    runner.test("Predict Edge Case: Empty Data", test_predict_edge_case_empty)
    runner.test("Predict Edge Case: Missing Fields", test_predict_edge_case_missing_fields)
    runner.test("Predict Edge Case: Invalid Types", test_predict_edge_case_invalid_types)
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 6: METRICS ENDPOINT TESTS")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Metrics Endpoint", test_metrics_endpoint)
    runner.test("Metrics Format", test_metrics_format)
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 7: LOAD TESTING")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Concurrent Status Requests", test_concurrent_status_requests)
    runner.test("Rapid Fire Predictions", test_rapid_fire_predictions)
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 8: MULTI-USER SIMULATION")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Multi-User Simulation", test_multi_user_simulation)
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"SECTION 9: STRESS TESTING")
    print(f"{'='*60}{Colors.RESET}")
    runner.test("Sustained Load", test_sustained_load)
    
    # Print summary
    runner.summary()
    
    # Exit with appropriate code
    sys.exit(0 if runner.failed == 0 else 1)

if __name__ == "__main__":
    main()
