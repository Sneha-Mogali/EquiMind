import { useState, useEffect } from 'react'
import { Panel } from '../components/ui/Panel'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { Shield, AlertTriangle, Eye, Lock, Ban, Target, Clock, Filter, Download, RefreshCw } from 'lucide-react'

export function AutonomousActions() {
  const [actions, setActions] = useState([])
  const [filteredActions, setFilteredActions] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [filters, setFilters] = useState({
    actionType: 'ALL',
    timeRange: '24H',
    status: 'ALL',
    entity: ''
  })
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchAutonomousActions()
    const interval = setInterval(fetchAutonomousActions, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    applyFilters()
  }, [actions, filters])

  const fetchAutonomousActions = async () => {
    setLoading(true)
    try {
      // Fetch autonomous actions from backend
      const response = await fetch('http://localhost:8000/autonomous/actions')
      const data = await response.json()
      setActions(data.actions || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Failed to fetch autonomous actions:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...actions]

    // Filter by action type
    if (filters.actionType !== 'ALL') {
      filtered = filtered.filter(action => action.action_type === filters.actionType)
    }

    // Filter by time range
    const now = new Date()
    const timeRangeHours = {
      '1H': 1,
      '6H': 6,
      '24H': 24,
      '7D': 168,
      'ALL': null
    }
    
    if (filters.timeRange !== 'ALL') {
      const hoursBack = timeRangeHours[filters.timeRange]
      const cutoffTime = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000))
      filtered = filtered.filter(action => new Date(action.executed_at) >= cutoffTime)
    }

    // Filter by status
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(action => action.execution_status === filters.status)
    }

    // Filter by entity name
    if (filters.entity.trim()) {
      const entityFilter = filters.entity.toLowerCase()
      filtered = filtered.filter(action => 
        action.entity_name?.toLowerCase().includes(entityFilter) ||
        action.entity_id?.toLowerCase().includes(entityFilter)
      )
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))
    
    setFilteredActions(filtered)
  }

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'HONEYPOT_MOVE': return <Target size={16} color="var(--amber)" />
      case 'ISOLATION': return <Lock size={16} color="var(--red)" />
      case 'BLOCK': return <Ban size={16} color="var(--red)" />
      case 'MONITOR': return <Eye size={16} color="var(--cyan)" />
      case 'CHALLENGE': return <Shield size={16} color="var(--amber)" />
      case 'AUTO_REMOVE_HONEYPOT': return <Target size={16} color="var(--green)" />
      case 'AUTO_REMOVE_MONITORING': return <Eye size={16} color="var(--green)" />
      default: return <AlertTriangle size={16} color="var(--text-dim)" />
    }
  }

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'HONEYPOT_MOVE': return 'var(--amber)'
      case 'ISOLATION': return 'var(--red)'
      case 'BLOCK': return 'var(--red)'
      case 'MONITOR': return 'var(--cyan)'
      case 'CHALLENGE': return 'var(--amber)'
      case 'AUTO_REMOVE_HONEYPOT': return 'var(--green)'
      case 'AUTO_REMOVE_MONITORING': return 'var(--green)'
      default: return 'var(--text-dim)'
    }
  }

  const getActionDescription = (action) => {
    const details = action.action_details || {}
    switch (action.action_type) {
      case 'HONEYPOT_MOVE':
        return `Entity moved to honeypot environment for analysis. Risk: ${action.risk_score_trigger}%`
      case 'ISOLATION':
        return `Entity isolated from network due to high risk. Risk: ${action.risk_score_trigger}%`
      case 'BLOCK':
        return `Entity blocked from system access. Risk: ${action.risk_score_trigger}%`
      case 'MONITOR':
        return `Enhanced monitoring activated for entity. Risk: ${action.risk_score_trigger}%`
      case 'CHALLENGE':
        return `Additional authentication challenge required. Risk: ${action.risk_score_trigger}%`
      case 'AUTO_REMOVE_HONEYPOT':
        return `Automatically removed from honeypot. Reason: ${details.reason || 'time_based'}`
      case 'AUTO_REMOVE_MONITORING':
        return `Automatically removed from monitoring. Reason: ${details.reason || 'time_based'}`
      default:
        return action.action_details?.description || 'Autonomous security action executed'
    }
  }

  const exportActions = () => {
    const csvContent = [
      ['Timestamp', 'Action Type', 'Entity', 'Risk Score', 'Status', 'Description'].join(','),
      ...filteredActions.map(action => [
        new Date(action.executed_at).toISOString(),
        action.action_type,
        action.entity_name || action.entity_id,
        action.risk_score_trigger || 'N/A',
        action.execution_status,
        getActionDescription(action).replace(/,/g, ';')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autonomous_actions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      
      {/* Header with Stats */}
      <Panel 
        title="AUTONOMOUS SECURITY ACTIONS" 
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={12} color={loading ? 'var(--amber)' : 'var(--green)'} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--green)' }}>
              LIVE • {currentTime.toLocaleTimeString()}
            </span>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {[
            { 
              label: 'TOTAL ACTIONS', 
              value: stats?.total_actions || actions.length, 
              color: 'var(--cyan)',
              icon: <Shield size={16} />
            },
            { 
              label: 'LAST 24H', 
              value: stats?.actions_24h || filteredActions.filter(a => 
                new Date(a.executed_at) >= new Date(Date.now() - 24*60*60*1000)
              ).length, 
              color: 'var(--amber)',
              icon: <Clock size={16} />
            },
            { 
              label: 'SUCCESS RATE', 
              value: `${stats?.success_rate || Math.round(
                (actions.filter(a => a.execution_status === 'SUCCESS').length / (actions.length || 1)) * 100
              )}%`, 
              color: 'var(--green)',
              icon: <Shield size={16} />
            },
            { 
              label: 'ACTIVE BLOCKS', 
              value: stats?.active_blocks || actions.filter(a => 
                a.action_type === 'BLOCK' && a.execution_status === 'SUCCESS'
              ).length, 
              color: 'var(--red)',
              icon: <Ban size={16} />
            }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ color: stat.color, marginBottom: '4px' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Filters */}
      <Panel title="FILTERS & CONTROLS">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
          {/* Action Type Filter */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              ACTION TYPE
            </label>
            <select 
              value={filters.actionType}
              onChange={(e) => setFilters({...filters, actionType: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-base)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px'
              }}
            >
              <option value="ALL">All Actions</option>
              <option value="HONEYPOT_MOVE">Honeypot Move</option>
              <option value="ISOLATION">Isolation</option>
              <option value="BLOCK">Block</option>
              <option value="MONITOR">Monitor</option>
              <option value="CHALLENGE">Challenge</option>
              <option value="AUTO_REMOVE_HONEYPOT">Auto Remove Honeypot</option>
              <option value="AUTO_REMOVE_MONITORING">Auto Remove Monitoring</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              TIME RANGE
            </label>
            <select 
              value={filters.timeRange}
              onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-base)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px'
              }}
            >
              <option value="1H">Last Hour</option>
              <option value="6H">Last 6 Hours</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="ALL">All Time</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              STATUS
            </label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-base)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px'
              }}
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              ENTITY SEARCH
            </label>
            <input 
              type="text"
              placeholder="Search by entity name..."
              value={filters.entity}
              onChange={(e) => setFilters({...filters, entity: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-base)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px'
              }}
            />
          </div>

          {/* Export Button */}
          <div>
            <button
              onClick={exportActions}
              disabled={filteredActions.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: 'var(--cyan)',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                cursor: filteredActions.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredActions.length === 0 ? 0.5 : 1
              }}
            >
              <Download size={12} />
              EXPORT CSV
            </button>
          </div>
        </div>
      </Panel>

      {/* Actions List */}
      <Panel title={`AUTONOMOUS ACTIONS LOG (${filteredActions.length} entries)`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <RefreshCw size={24} color="var(--amber)" style={{ marginBottom: '8px' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>Loading autonomous actions...</div>
          </div>
        ) : filteredActions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <Filter size={24} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '4px' }}>No actions found</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>Try adjusting your filters</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
            {filteredActions.map((action, index) => (
              <div key={action.id || index} style={{
                padding: '12px',
                background: 'var(--bg-elevated)',
                borderRadius: '6px',
                border: `1px solid ${getActionColor(action.action_type)}`,
                borderLeft: `4px solid ${getActionColor(action.action_type)}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getActionIcon(action.action_type)}
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {action.action_type.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                        Entity: {action.entity_name || action.entity_id}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                      {new Date(action.executed_at).toLocaleString()}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: action.execution_status === 'SUCCESS' ? 'rgba(34, 197, 94, 0.2)' : 
                                 action.execution_status === 'FAILED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 146, 60, 0.2)',
                      color: action.execution_status === 'SUCCESS' ? 'var(--green)' : 
                            action.execution_status === 'FAILED' ? 'var(--red)' : 'var(--amber)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      fontWeight: 600,
                      marginTop: '4px'
                    }}>
                      {action.execution_status}
                    </div>
                  </div>
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {getActionDescription(action)}
                  </div>
                </div>

                {action.action_details && Object.keys(action.action_details).length > 0 && (
                  <div style={{ 
                    padding: '8px', 
                    background: 'var(--bg-panel)', 
                    borderRadius: '4px',
                    marginTop: '8px'
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      ACTION DETAILS:
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-secondary)' }}>
                      {Object.entries(action.action_details).map(([key, value]) => (
                        <div key={key} style={{ marginBottom: '2px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{key}:</span> {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {action.confidence_level && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                      Confidence:
                    </span>
                    <div style={{ flex: 1, height: '4px', background: 'var(--border-base)', borderRadius: '2px' }}>
                      <div style={{
                        height: '100%',
                        width: `${(action.confidence_level * 100)}%`,
                        background: action.confidence_level >= 0.8 ? 'var(--green)' : action.confidence_level >= 0.6 ? 'var(--amber)' : 'var(--red)',
                        borderRadius: '2px'
                      }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-primary)' }}>
                      {Math.round(action.confidence_level * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}