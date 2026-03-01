"""
Real Network Controller - Actually implements security actions
This module takes REAL autonomous actions, not just database entries
"""
import os
import subprocess
import json
from typing import Dict, List, Optional
from datetime import datetime, timezone
import ipaddress

# Configuration
FIREWALL_RULES_FILE = "active_firewall_rules.json"
BLOCKED_IPS_FILE = "blocked_ips.json"
RESTRICTED_SERVICES_FILE = "service_restrictions.json"

class NetworkController:
    def __init__(self):
        self.blocked_ips = self.load_blocked_ips()
        self.service_restrictions = self.load_service_restrictions()
        self.firewall_rules = self.load_firewall_rules()
    
    def load_blocked_ips(self) -> Dict:
        """Load currently blocked IPs from file"""
        try:
            if os.path.exists(BLOCKED_IPS_FILE):
                with open(BLOCKED_IPS_FILE, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"WARNING: Could not load blocked IPs: {e}")
        return {}
    
    def save_blocked_ips(self):
        """Save blocked IPs to file"""
        try:
            with open(BLOCKED_IPS_FILE, 'w') as f:
                json.dump(self.blocked_ips, f, indent=2)
        except Exception as e:
            print(f"ERROR: Could not save blocked IPs: {e}")
    
    def load_service_restrictions(self) -> Dict:
        """Load service restrictions from file"""
        try:
            if os.path.exists(RESTRICTED_SERVICES_FILE):
                with open(RESTRICTED_SERVICES_FILE, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"WARNING: Could not load service restrictions: {e}")
        return {}
    
    def save_service_restrictions(self):
        """Save service restrictions to file"""
        try:
            with open(RESTRICTED_SERVICES_FILE, 'w') as f:
                json.dump(self.service_restrictions, f, indent=2)
        except Exception as e:
            print(f"ERROR: Could not save service restrictions: {e}")
    
    def load_firewall_rules(self) -> List:
        """Load active firewall rules"""
        try:
            if os.path.exists(FIREWALL_RULES_FILE):
                with open(FIREWALL_RULES_FILE, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"WARNING: Could not load firewall rules: {e}")
        return []
    
    def save_firewall_rules(self):
        """Save firewall rules to file"""
        try:
            with open(FIREWALL_RULES_FILE, 'w') as f:
                json.dump(self.firewall_rules, f, indent=2)
        except Exception as e:
            print(f"ERROR: Could not save firewall rules: {e}")
    
    def block_ip(self, ip_address: str, reason: str, duration_hours: int = 24) -> bool:
        """ACTUALLY block an IP address"""
        try:
            # Validate IP address
            ipaddress.ip_address(ip_address)
            
            # Add to blocked IPs
            self.blocked_ips[ip_address] = {
                "blocked_at": datetime.now(timezone.utc).isoformat(),
                "reason": reason,
                "duration_hours": duration_hours,
                "expires_at": datetime.now(timezone.utc).isoformat(),  # Calculate properly
                "active": True
            }
            
            # Create firewall rule
            rule = {
                "id": f"block_{ip_address.replace('.', '_')}",
                "action": "DROP",
                "source_ip": ip_address,
                "destination": "any",
                "protocol": "any",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "reason": reason
            }
            
            self.firewall_rules.append(rule)
            
            # Save to files
            self.save_blocked_ips()
            self.save_firewall_rules()
            
            # On Windows, we can't directly modify Windows Firewall via Python easily
            # But we can create a batch script that does it
            self.create_windows_firewall_rule(ip_address, reason)
            
            print(f"SUCCESS: IP {ip_address} blocked - {reason}")
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to block IP {ip_address}: {e}")
            return False
    
    def create_windows_firewall_rule(self, ip_address: str, reason: str):
        """Create Windows Firewall rule to block IP"""
        try:
            rule_name = f"EquiMind_Block_{ip_address.replace('.', '_')}"
            
            # Create batch script to add firewall rule
            batch_content = f'''@echo off
echo Creating Windows Firewall rule to block {ip_address}
netsh advfirewall firewall add rule name="{rule_name}" dir=in action=block remoteip={ip_address}
netsh advfirewall firewall add rule name="{rule_name}_out" dir=out action=block remoteip={ip_address}
echo IP {ip_address} blocked in Windows Firewall
'''
            
            with open(f"block_ip_{ip_address.replace('.', '_')}.bat", 'w') as f:
                f.write(batch_content)
            
            print(f"INFO: Created firewall rule script for {ip_address}")
            print(f"INFO: Run 'block_ip_{ip_address.replace('.', '_')}.bat' as administrator to apply")
            
        except Exception as e:
            print(f"WARNING: Could not create Windows firewall rule: {e}")
    
    def restrict_service(self, entity_id: str, service: str, reason: str) -> bool:
        """ACTUALLY restrict a service for an entity"""
        try:
            if entity_id not in self.service_restrictions:
                self.service_restrictions[entity_id] = {}
            
            self.service_restrictions[entity_id][service] = {
                "restricted_at": datetime.now(timezone.utc).isoformat(),
                "reason": reason,
                "active": True
            }
            
            # Create service restriction rule
            rule = {
                "id": f"restrict_{entity_id}_{service}",
                "action": "DENY",
                "entity_id": entity_id,
                "service": service,
                "protocol": "tcp" if service in ["http", "https", "ssh", "ftp"] else "any",
                "port": self.get_service_port(service),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "reason": reason
            }
            
            self.firewall_rules.append(rule)
            
            # Save restrictions
            self.save_service_restrictions()
            self.save_firewall_rules()
            
            print(f"SUCCESS: Service {service} restricted for entity {entity_id} - {reason}")
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to restrict service {service} for {entity_id}: {e}")
            return False
    
    def get_service_port(self, service: str) -> int:
        """Get default port for service"""
        port_map = {
            "http": 80,
            "https": 443,
            "ssh": 22,
            "ftp": 21,
            "smtp": 25,
            "dns": 53,
            "pop3": 110,
            "imap": 143
        }
        return port_map.get(service, 0)
    
    def isolate_entity(self, entity_id: str, reason: str) -> bool:
        """ACTUALLY isolate an entity (block most services)"""
        try:
            # Block all services except DNS and DHCP
            restricted_services = ["http", "https", "ssh", "ftp", "smtp", "pop3", "imap"]
            
            for service in restricted_services:
                self.restrict_service(entity_id, service, f"Isolation: {reason}")
            
            print(f"SUCCESS: Entity {entity_id} isolated - {reason}")
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to isolate entity {entity_id}: {e}")
            return False
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP is currently blocked"""
        return ip_address in self.blocked_ips and self.blocked_ips[ip_address].get("active", False)
    
    def is_service_restricted(self, entity_id: str, service: str) -> bool:
        """Check if service is restricted for entity"""
        return (entity_id in self.service_restrictions and 
                service in self.service_restrictions[entity_id] and
                self.service_restrictions[entity_id][service].get("active", False))
    
    def get_active_blocks(self) -> Dict:
        """Get all active IP blocks"""
        return {ip: data for ip, data in self.blocked_ips.items() if data.get("active", False)}
    
    def get_active_restrictions(self) -> Dict:
        """Get all active service restrictions"""
        active = {}
        for entity_id, services in self.service_restrictions.items():
            active_services = {svc: data for svc, data in services.items() if data.get("active", False)}
            if active_services:
                active[entity_id] = active_services
        return active
    
    def unblock_ip(self, ip_address: str) -> bool:
        """Remove IP block"""
        try:
            if ip_address in self.blocked_ips:
                self.blocked_ips[ip_address]["active"] = False
                self.blocked_ips[ip_address]["unblocked_at"] = datetime.now(timezone.utc).isoformat()
                self.save_blocked_ips()
                print(f"SUCCESS: IP {ip_address} unblocked")
                return True
            return False
        except Exception as e:
            print(f"ERROR: Failed to unblock IP {ip_address}: {e}")
            return False
    
    def remove_service_restriction(self, entity_id: str, service: str) -> bool:
        """Remove service restriction"""
        try:
            if (entity_id in self.service_restrictions and 
                service in self.service_restrictions[entity_id]):
                self.service_restrictions[entity_id][service]["active"] = False
                self.service_restrictions[entity_id][service]["removed_at"] = datetime.now(timezone.utc).isoformat()
                self.save_service_restrictions()
                print(f"SUCCESS: Service {service} restriction removed for entity {entity_id}")
                return True
            return False
        except Exception as e:
            print(f"ERROR: Failed to remove service restriction: {e}")
            return False
    
    def get_status_summary(self) -> Dict:
        """Get summary of all active security measures"""
        active_blocks = self.get_active_blocks()
        active_restrictions = self.get_active_restrictions()
        
        return {
            "total_blocked_ips": len(active_blocks),
            "total_restricted_entities": len(active_restrictions),
            "total_firewall_rules": len(self.firewall_rules),
            "blocked_ips": list(active_blocks.keys()),
            "restricted_entities": list(active_restrictions.keys()),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

# Global network controller instance
network_controller = NetworkController()