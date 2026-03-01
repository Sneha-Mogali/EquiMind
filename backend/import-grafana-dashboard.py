#!/usr/bin/env python3
"""
Script to import Grafana dashboard automatically
"""
import json
import requests
import sys

# Grafana configuration
GRAFANA_URL = "http://localhost:3001"
GRAFANA_USER = "admin"
GRAFANA_PASSWORD = "admin"
DASHBOARD_FILE = "grafana-dashboard-comprehensive.json"

def import_dashboard():
    """Import dashboard to Grafana"""
    print("=" * 60)
    print("EquiMind Grafana Dashboard Import")
    print("=" * 60)
    
    # Read dashboard JSON
    try:
        with open(DASHBOARD_FILE, 'r') as f:
            dashboard_data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: Dashboard file '{DASHBOARD_FILE}' not found")
        return False
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in dashboard file: {e}")
        return False
    
    # Prepare import payload
    payload = {
        "dashboard": dashboard_data["dashboard"],
        "overwrite": True,
        "inputs": [],
        "folderId": 0
    }
    
    # Import dashboard
    url = f"{GRAFANA_URL}/api/dashboards/db"
    
    try:
        response = requests.post(
            url,
            json=payload,
            auth=(GRAFANA_USER, GRAFANA_PASSWORD),
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✓ Dashboard imported successfully!")
            print(f"  Dashboard ID: {result.get('id')}")
            print(f"  Dashboard UID: {result.get('uid')}")
            print(f"  Dashboard URL: {GRAFANA_URL}{result.get('url')}")
            print(f"\n  Access at: {GRAFANA_URL}/d/{result.get('uid')}")
            return True
        else:
            print(f"\n✗ Failed to import dashboard")
            print(f"  Status Code: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"\n✗ Could not connect to Grafana at {GRAFANA_URL}")
        print("  Make sure Grafana is running:")
        print("  - Windows: start-monitoring.bat")
        print("  - PowerShell: .\\start-monitoring.ps1")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

def check_grafana_health():
    """Check if Grafana is accessible"""
    try:
        response = requests.get(f"{GRAFANA_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print(f"✓ Grafana is running at {GRAFANA_URL}")
            return True
        else:
            print(f"✗ Grafana returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"✗ Cannot connect to Grafana at {GRAFANA_URL}")
        print("  Please start Grafana first")
        return False
    except Exception as e:
        print(f"✗ Error checking Grafana: {e}")
        return False

def main():
    """Main function"""
    print("\nChecking Grafana status...")
    if not check_grafana_health():
        print("\nPlease start Grafana and try again:")
        print("  Windows: start-monitoring.bat")
        print("  PowerShell: .\\start-monitoring.ps1")
        return 1
    
    print("\nImporting dashboard...")
    if import_dashboard():
        print("\n" + "=" * 60)
        print("Dashboard imported successfully!")
        print("=" * 60)
        print(f"\nOpen Grafana: {GRAFANA_URL}")
        print(f"Username: {GRAFANA_USER}")
        print(f"Password: {GRAFANA_PASSWORD}")
        print("\nThe dashboard should appear in your Grafana home page.")
        return 0
    else:
        print("\n" + "=" * 60)
        print("Dashboard import failed")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
