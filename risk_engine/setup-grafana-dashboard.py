#!/usr/bin/env python3
"""
Auto-setup Grafana dashboard for EquiMind
"""
import requests
import json
import time

def setup_grafana_dashboard():
    """Automatically import the EquiMind dashboard into Grafana"""
    
    grafana_url = "http://localhost:3001"
    username = "admin"
    password = "admin"
    
    print("🎨 Setting up EquiMind Grafana Dashboard...")
    
    # Wait for Grafana to be ready
    print("⏳ Waiting for Grafana to be ready...")
    for i in range(30):
        try:
            response = requests.get(f"{grafana_url}/api/health", timeout=2)
            if response.status_code == 200:
                print("✅ Grafana is ready!")
                break
        except:
            pass
        time.sleep(2)
        print(f"   Attempt {i+1}/30...")
    else:
        print("❌ Grafana not responding. Make sure it's running on port 3001")
        return False
    
    # Load dashboard JSON
    try:
        with open('grafana-dashboard.json', 'r') as f:
            dashboard_json = json.load(f)
    except FileNotFoundError:
        print("❌ grafana-dashboard.json not found")
        return False
    
    # Prepare dashboard for import
    dashboard_data = {
        "dashboard": dashboard_json["dashboard"],
        "overwrite": True,
        "inputs": [
            {
                "name": "DS_PROMETHEUS",
                "type": "datasource",
                "pluginId": "prometheus",
                "value": "Prometheus"
            }
        ]
    }
    
    # Import dashboard
    try:
        response = requests.post(
            f"{grafana_url}/api/dashboards/import",
            json=dashboard_data,
            auth=(username, password),
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            dashboard_url = f"{grafana_url}/d/{result['uid']}/equimind-zero-trust-security-dashboard"
            print("✅ Dashboard imported successfully!")
            print(f"🌐 Dashboard URL: {dashboard_url}")
            
            # Try to open in browser
            try:
                import webbrowser
                webbrowser.open(dashboard_url)
                print("🚀 Opening dashboard in browser...")
            except:
                pass
                
            return True
        else:
            print(f"❌ Failed to import dashboard: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error importing dashboard: {e}")
        return False

def show_manual_instructions():
    """Show manual setup instructions"""
    print("\n📋 Manual Setup Instructions:")
    print("1. Go to http://localhost:3001")
    print("2. Login with admin/admin")
    print("3. Click '+' → Import")
    print("4. Copy/paste content from grafana-dashboard.json")
    print("5. Click 'Load' then 'Import'")

if __name__ == "__main__":
    print("=" * 50)
    print("  EquiMind Grafana Dashboard Setup")
    print("=" * 50)
    
    success = setup_grafana_dashboard()
    
    if not success:
        show_manual_instructions()
    
    print("\n🎯 Useful Grafana Tips:")
    print("- Set refresh to 5s for live updates")
    print("- Create alerts for high risk scores")
    print("- Use variables for filtering by user")
    print("- Export dashboards to share with team")
    
    print("\n" + "=" * 50)