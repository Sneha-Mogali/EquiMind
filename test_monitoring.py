#!/usr/bin/env python3
"""
Test script to verify monitoring tab functionality
"""
import requests
import json

def test_monitoring_endpoints():
    """Test all monitoring-related endpoints"""
    base_url = "http://localhost:8000"
    
    endpoints = [
        "/status",
        "/entities", 
        "/autonomous/actions?limit=10",
        "/metrics"
    ]
    
    print("Testing monitoring endpoints...")
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}")
            if response.status_code == 200:
                print(f"✅ {endpoint} - OK")
                if endpoint == "/autonomous/actions?limit=10":
                    data = response.json()
                    print(f"   Actions: {len(data.get('actions', []))}")
                    print(f"   Stats: {data.get('stats', {})}")
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")
    
    print("\nTesting threat intel endpoint...")
    try:
        response = requests.get(f"{base_url}/data/raw?limit=50")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ /data/raw - OK")
            print(f"   Events: {len(data.get('events', []))}")
            print(f"   Source: {data.get('source', 'unknown')}")
        else:
            print(f"❌ /data/raw - Status: {response.status_code}")
    except Exception as e:
        print(f"❌ /data/raw - Error: {e}")

if __name__ == "__main__":
    test_monitoring_endpoints()