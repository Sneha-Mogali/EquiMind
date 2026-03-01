#!/usr/bin/env python3
"""
Test script for Autonomous Actions functionality
"""
import requests
import json
from datetime import datetime, timezone, timedelta

def test_autonomous_actions_endpoint():
    """Test the autonomous actions endpoint"""
    try:
        # Test the endpoint
        response = requests.get('http://localhost:8000/autonomous/actions')
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Autonomous Actions endpoint working!")
            print(f"📊 Total actions: {len(data.get('actions', []))}")
            print(f"📈 Stats: {data.get('stats', {})}")
            
            # Show first few actions
            actions = data.get('actions', [])
            if actions:
                print("\n🔍 Sample actions:")
                for i, action in enumerate(actions[:3]):
                    print(f"  {i+1}. {action.get('action_type')} - {action.get('entity_name')} - {action.get('executed_at')}")
            
            return True
        else:
            print(f"❌ Endpoint returned status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Is it running on localhost:8000?")
        return False
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
        return False

def test_autonomous_actions_summary():
    """Test the autonomous actions summary endpoint"""
    try:
        response = requests.get('http://localhost:8000/autonomous/actions/summary')
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ Autonomous Actions Summary endpoint working!")
            print(f"📊 Summary data: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Summary endpoint returned status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing summary endpoint: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Autonomous Actions Endpoints...")
    print("=" * 50)
    
    # Test main endpoint
    success1 = test_autonomous_actions_endpoint()
    
    # Test summary endpoint
    success2 = test_autonomous_actions_summary()
    
    print("\n" + "=" * 50)
    if success1 and success2:
        print("🎉 All tests passed! Autonomous Actions system is working.")
    else:
        print("⚠️  Some tests failed. Check the backend logs.")