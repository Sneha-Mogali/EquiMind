import { useState, useEffect } from 'react'
import { Panel } from '../components/ui/Panel'
import { Shield, Ban, AlertTriangle, CheckCircle, XCircle, Unlock, Globe } from 'lucide-react'

export function SecurityActions() {
  const [realActions, setRealActions] = useState(null)
  const [networkStatus, setNetworkStatus] = useState(null)
  const [autonomousActions, setAutonomousActions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Indian names for entities
  const indianNames = ['Arjun', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Ananya', 'Karthik', 'Meera', 'Rohan', 'Kavya', 'Sanjay', 'Deepika', 'Amit', 'Pooja', 'Ravi']
  
  const getIndianName = (user) => {
    if (user && user.includes('user')) {
      const index = parseInt(user.replace('user', '')) || 0
      return indianNames[index % indianNames.length] || user
    }
    return user
  }

  useEffect(() => {
    fetchSecurityData()
    const interval = setInterval(fetchSecurityData, 3000) // Refresh every 3 seconds for real-time sync
    return () => clearInterval(interval)
  }, [])

  const fetchSecurityData = async () => {
    try {
      // Fetch real network actions
      const realResponse = await fetch('http://localhost:8000/security/real-actions')
      const realData = await realResponse.json()
      setRealActions(realData)

      // Fetch network controller status
      const statusResponse = await fetch('http://localhost:8000/security/network-status')
      const statusData = await statusResponse.json()
      setNetworkStatus(statusData)

      // Fetch autonomous actions summary
      const autoResponse = await fetch('http://localhost:8000/security/autonomous')
      const autoData = await autoResponse.json()
      setAutonomousActions(autoData)

    } catch (error) {
      console.error('Failed to fetch security data:', error)
    }
  }

  const unblockIP = async (ipAddress) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/security/unblock-ip/${ipAddress}`, {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.unblocked) {
        // Refresh data
        fetchSecurityData()
      }
    } catch (error) {
      console.error('Failed to unblock IP:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetSystem = async () => {
    if (!confirm('Are you sure you want to reset the entire system? This will:\n\n• Reset all entities to ACTIVE status\n• Clear honeypot assignments\n• Remove all monitoring labels\n• Clear network blocks and restrictions\n• Clear action history\n\nThis action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/system/reset', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.status === 'success') {
        alert(`System reset completed!\n\n• ${result.results.entities_reset} entities reset to active\n• ${result.results.actions_cleared} actions cleared from memory\n• ${result.results.network_blocks_cleared} network blocks cleared\n\nThe system is now in a fresh state.`)
        // Refresh data to show updated state
        await fetchSecurityData()
      } else {
        alert('System reset failed. Check console for details.')
      }
    } catch (error) {
      console.error('Failed to reset system:', error)
      alert('System reset failed. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    return `GMT ${new Date(timestamp).toISOString().slice(11, 19)}`
  }

  return (
    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto auto', gap: '12px', height: '100%', overflowY: 'auto' }}>

      {/* System Reset Panel */}
      <div style={{ gridColumn: '1 / -1' }}>
        <Panel title="SYSTEM CONTROL">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Reset all entity states and clear action history
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                Returns all entities to ACTIVE status and clears honeypot/monitoring assignments
              </div>
            </div>
            <button
              onClick={resetSystem}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'var(--red)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}>
              <XCircle size={16} />
              {loading ? 'RESETTING...' : 'RESET SYSTEM'}
            </button>
          </div>
        </Panel>
      </div>

      {/* Network Security Status */}
      <Panel title="REAL NETWORK SECURITY STATUS" action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Globe size={12} color="var(--cyan)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)' }}>
            GMT {currentTime.toISOString().slice(11, 19)}
          </span>
        </div>
      } style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '16px' }}>
          {networkStatus && [
            { 
              label: 'BLOCKED IPs', 
              value: networkStatus.total_blocked_ips || 0, 
              color: 'var(--red)', 
              icon: <Ban size={20} /> 
            },
            { 
              label: 'RESTRICTED ENTITIES', 
              value: networkStatus.total_restricted_entities || 0, 
              color: 'var(--amber)', 
              icon: <AlertTriangle size={20} /> 
            },
            { 
              label: 'FIREWALL RULES', 
              value: networkStatus.total_firewall_rules || 0, 
              color: 'var(--cyan)', 
              icon: <Shield size={20} /> 
            },
            { 
              label: 'STATUS', 
              value: 'ACTIVE', 
              color: 'var(--green)', 
              icon: <CheckCircle size={20} /> 
            }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: stat.color }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ 
          padding: '12px', 
          background: 'var(--bg-elevated)', 
          borderRadius: '6px',
          border: '1px solid var(--green)',
          textAlign: 'center'
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
            ✓ NETWORK CONTROLLER ACTIVE - REAL SECURITY ACTIONS IN EFFECT
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Last Updated: {networkStatus ? formatTimestamp(networkStatus.last_updated) : 'Loading...'}
          </div>
        </div>
      </Panel>

      {/* Real IP Blocks */}
      <Panel title="ACTIVE IP BLOCKS (REAL)">
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          IPs currently blocked by network controller
        </div>

        {realActions?.real_ip_blocks && Object.keys(realActions.real_ip_blocks).length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {Object.entries(realActions.real_ip_blocks).map(([ip, data]) => (
              <div key={ip} style={{
                padding: '12px',
                background: 'var(--bg-elevated)',
                borderRadius: '6px',
                border: '1px solid var(--red)',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)', fontWeight: 600 }}>
                    {ip}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                    {data.reason}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                    Blocked: {formatTimestamp(data.blocked_at)}
                  </div>
                </div>
                <button
                  onClick={() => unblockIP(ip)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'var(--green)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#000',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1
                  }}>
                  <Unlock size={12} />
                  UNBLOCK
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <CheckCircle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              No IPs currently blocked
            </div>
          </div>
        )}
      </Panel>

      {/* Real Service Restrictions */}
      <Panel title="ACTIVE SERVICE RESTRICTIONS (REAL)">
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Services currently restricted by network controller
        </div>

        {realActions?.real_service_restrictions && Object.keys(realActions.real_service_restrictions).length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {Object.entries(realActions.real_service_restrictions).map(([entityId, services]) => (
              <div key={entityId} style={{
                padding: '12px',
                background: 'var(--bg-elevated)',
                borderRadius: '6px',
                border: '1px solid var(--amber)',
                marginBottom: '8px'
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--amber)', fontWeight: 600, marginBottom: '8px' }}>
                  Entity: {getIndianName(entityId)}
                </div>
                {Object.entries(services).map(([service, data]) => (
                  <div key={service} style={{
                    padding: '6px 12px',
                    background: 'var(--bg-panel)',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)' }}>
                        {service.toUpperCase()}
                      </span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                        {data.reason}
                      </div>
                    </div>
                    <div style={{
                      padding: '2px 8px',
                      background: 'rgba(251, 146, 60, 0.2)',
                      borderRadius: '3px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      color: 'var(--amber)',
                      fontWeight: 600
                    }}>
                      BLOCKED
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <CheckCircle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              No services currently restricted
            </div>
          </div>
        )}
      </Panel>

      {/* Autonomous Actions Summary */}
      <Panel title="AUTONOMOUS ACTIONS TAKEN" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            Summary of autonomous security decisions made by the system
          </div>
          <div style={{
            padding: '6px 12px',
            background: 'var(--cyan-glow)',
            border: '1px solid var(--cyan)',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--cyan)',
            fontWeight: 600
          }}>
            TOTAL: {autonomousActions?.total_actions || 0} ACTIONS
          </div>
        </div>

        {autonomousActions?.action_counts && Object.keys(autonomousActions.action_counts).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {Object.entries(autonomousActions.action_counts).map(([actionType, count]) => (
              <div key={actionType} style={{
                padding: '12px',
                background: 'var(--bg-elevated)',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--cyan)', fontWeight: 700 }}>
                  {count}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                  {actionType.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {autonomousActions?.recent_actions && autonomousActions.recent_actions.length > 0 ? (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '1px' }}>
              RECENT ACTIONS:
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {autonomousActions.recent_actions.slice(0, 10).map((action, index) => (
                <div key={action.id || index} style={{
                  padding: '8px 12px',
                  background: 'var(--bg-panel)',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)' }}>
                      {action.action_type}
                    </span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                      Entity: {getIndianName(action.entity_id)} | Risk: {action.risk_score_trigger}% | GMT {new Date(action.executed_at).toISOString().slice(11, 19)}
                    </div>
                  </div>
                  <div style={{
                    padding: '2px 8px',
                    background: action.execution_status === 'SUCCESS' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    borderRadius: '3px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: action.execution_status === 'SUCCESS' ? 'var(--green)' : 'var(--red)',
                    fontWeight: 600
                  }}>
                    {action.execution_status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              No autonomous actions taken yet
            </div>
          </div>
        )}
      </Panel>

    </div>
  )
}