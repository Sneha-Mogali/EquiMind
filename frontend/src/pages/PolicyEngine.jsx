import { useState, useEffect } from 'react'
import { Panel } from '../components/ui/Panel'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Shield, AlertTriangle, Settings, Brain, Clock, Target, Globe, Zap } from 'lucide-react'

export function PolicyEngine() {
  const [policyStatus, setPolicyStatus] = useState(null)
  const [policyRules, setPolicyRules] = useState(null)
  const [recentDecisions, setRecentDecisions] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedRule, setSelectedRule] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchPolicyData()
    const interval = setInterval(fetchPolicyData, 3000) // Update every 3 seconds for real-time sync
    return () => clearInterval(interval)
  }, [])

  const fetchPolicyData = async () => {
    try {
      // Fetch all policy data
      const [statusRes, rulesRes, decisionsRes, analyticsRes] = await Promise.all([
        fetch('http://localhost:8000/policy/status'),
        fetch('http://localhost:8000/policy/rules'),
        fetch('http://localhost:8000/policy/decisions'),
        fetch('http://localhost:8000/policy/analytics')
      ])

      const [status, rules, decisions, analytics] = await Promise.all([
        statusRes.json(),
        rulesRes.json(),
        decisionsRes.json(),
        analyticsRes.json()
      ])

      setPolicyStatus(status)
      setPolicyRules(rules)
      setRecentDecisions(decisions)
      setAnalytics(analytics)

      // Select first rule by default
      if (rules.policies && rules.policies.length > 0 && !selectedRule) {
        setSelectedRule(rules.policies[0])
      }
    } catch (error) {
      console.error('Failed to fetch policy data:', error)
    }
  }

  // Indian names for entities
  const indianNames = ['Arjun', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Ananya', 'Karthik', 'Meera', 'Rohan', 'Kavya', 'Sanjay', 'Deepika', 'Amit', 'Pooja', 'Ravi']
  
  const getIndianName = (user) => {
    if (user && user.includes('user')) {
      const index = parseInt(user.replace('user', '')) || 0
      return indianNames[index % indianNames.length] || user
    }
    return user
  }

  const getActionIcon = (action) => {
    const icons = {
      'BLOCK': 'BLOCK',
      'ISOLATION': 'ISOLATE',
      'HONEYPOT_MOVE': 'HONEYPOT',
      'CHALLENGE': 'CHALLENGE',
      'MONITOR': 'MONITOR',
      'ALLOW': 'ALLOW'
    }
    return icons[action] || 'ACTION'
  }

  const getActionColor = (action) => {
    const colors = {
      'BLOCK': 'var(--red)',
      'ISOLATION': 'var(--red)',
      'HONEYPOT_MOVE': 'var(--amber)',
      'CHALLENGE': 'var(--amber)',
      'MONITOR': 'var(--cyan)',
      'ALLOW': 'var(--green)'
    }
    return colors[action] || 'var(--text-dim)'
  }

  const getPriorityColor = (priority) => {
    if (priority <= 1) return 'var(--red)'
    if (priority <= 2) return 'var(--amber)'
    if (priority <= 3) return 'var(--cyan)'
    return 'var(--green)'
  }

  // Prepare chart data
  const actionDistributionData = analytics?.action_distribution ? 
    Object.entries(analytics.action_distribution).map(([action, count]) => ({
      action,
      count,
      color: getActionColor(action)
    })) : []

  const COLORS = ['var(--red)', 'var(--amber)', 'var(--cyan)', 'var(--green)', 'var(--purple)', 'var(--pink)']

  return (
    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto', gap: '12px', height: '100%', overflowY: 'auto' }}>

      {/* Policy Engine Status */}
      <Panel title="AUTONOMOUS POLICY ENGINE" action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Globe size={12} color="var(--cyan)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)' }}>
              GMT {currentTime.toISOString().slice(11, 19)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Brain size={12} color="var(--green)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--green)' }}>
              LEARNING ACTIVE
            </span>
          </div>
        </div>
      } style={{ gridColumn: '1 / -1' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '16px' }}>
          {policyStatus && [
            { 
              label: 'ACTIVE POLICIES', 
              value: policyRules?.active_policies || 0, 
              color: 'var(--cyan)', 
              icon: <Shield size={20} /> 
            },
            { 
              label: 'TOTAL DECISIONS', 
              value: policyStatus.total_decisions || 0, 
              color: 'var(--green)', 
              icon: <Target size={20} /> 
            },
            { 
              label: 'AVG RISK SCORE', 
              value: analytics?.average_confidence ? `${(analytics.average_confidence * 100).toFixed(0)}%` : '0%', 
              color: 'var(--amber)', 
              icon: <Brain size={20} /> 
            },
            { 
              label: 'AVG EXEC TIME', 
              value: analytics?.average_execution_time ? `${analytics.average_execution_time.toFixed(1)}ms` : '0ms', 
              color: 'var(--purple)', 
              icon: <Clock size={20} /> 
            }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ color: stat.color, marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Action Distribution Chart */}
        {actionDistributionData.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '1px' }}>
              POLICY DECISION DISTRIBUTION
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={actionDistributionData}>
                <XAxis dataKey="action" tick={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: 'var(--text-dim)' }} />
                <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: 'var(--text-dim)' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-base)', 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '11px' 
                  }} 
                />
                <Bar dataKey="count" fill="var(--cyan)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* Policy Rules */}
      <Panel title="POLICY RULES" style={{ gridRow: 'span 2' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
          {policyRules?.policies?.map(policy => (
            <div key={policy.id} style={{
              padding: '12px',
              background: selectedRule?.id === policy.id ? 'var(--bg-elevated)' : 'var(--bg-panel)',
              border: selectedRule?.id === policy.id ? '1px solid var(--cyan)' : '1px solid var(--border-base)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => setSelectedRule(policy)}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{getActionIcon(policy.action)}</span>
                  <div style={{
                    padding: '2px 6px',
                    background: `${getPriorityColor(policy.priority)}22`,
                    borderRadius: '3px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: getPriorityColor(policy.priority),
                    fontWeight: 600
                  }}>
                    P{policy.priority}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {policy.auto_update && (
                    <div style={{
                      padding: '2px 6px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: '3px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      color: 'var(--green)',
                      fontWeight: 600
                    }}>
                      AUTO-UPDATE
                    </div>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                    {policy.trigger_count} triggers
                  </span>
                </div>
              </div>
              
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {policy.name}
              </div>
              
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {policy.description}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                  {policy.trigger}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: getActionColor(policy.action) }}>
                  → {policy.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Selected Policy Details */}
      {selectedRule && (
        <Panel title={`POLICY DETAILS: ${selectedRule.name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Policy Info */}
            <div style={{
              padding: '12px',
              background: 'var(--bg-elevated)',
              borderRadius: '6px',
              border: '1px solid var(--border-base)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{getActionIcon(selectedRule.action)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: getActionColor(selectedRule.action), fontWeight: 600 }}>
                    {selectedRule.action}
                  </span>
                </div>
                <div style={{
                  padding: '4px 8px',
                  background: `${getPriorityColor(selectedRule.priority)}22`,
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: getPriorityColor(selectedRule.priority),
                  fontWeight: 600
                }}>
                  PRIORITY {selectedRule.priority}
                </div>
              </div>
              
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {selectedRule.description}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '2px' }}>
                    TRIGGER TYPE
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-primary)' }}>
                    {selectedRule.trigger}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '2px' }}>
                    RISK THRESHOLD
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-primary)' }}>
                    {(selectedRule.confidence_threshold * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Policy Conditions */}
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '1px' }}>
                TRIGGER CONDITIONS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.entries(selectedRule.conditions).map(([key, value]) => (
                  <div key={key} style={{
                    padding: '6px 8px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-base)',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-primary)' }}>
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Policy Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elevated)', borderRadius: '4px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--cyan)', fontWeight: 700 }}>
                  {selectedRule.trigger_count}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                  TOTAL TRIGGERS
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elevated)', borderRadius: '4px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: selectedRule.auto_update ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>
                  {selectedRule.auto_update ? 'ON' : 'OFF'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                  AUTO-UPDATE
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Recent Policy Decisions */}
      <Panel title="RECENT POLICY DECISIONS">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
          {recentDecisions?.decisions?.slice(0, 15).map((decision, index) => (
            <div key={decision.decision_id} style={{
              padding: '8px',
              background: index === 0 ? 'var(--bg-elevated)' : 'var(--bg-panel)',
              borderRadius: '4px',
              border: '1px solid var(--border-base)',
              animation: index === 0 ? 'slide-in-right 0.4s ease' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px' }}>{getActionIcon(decision.action)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)' }}>
                    {getIndianName(decision.entity_id)}
                  </span>
                </div>
                <div style={{
                  padding: '2px 6px',
                  background: `${getActionColor(decision.action)}22`,
                  borderRadius: '3px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '8px',
                  color: getActionColor(decision.action),
                  fontWeight: 600
                }}>
                  {decision.action}
                </div>
              </div>
              
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {decision.explanation}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                  {decision.triggered_rules.length} policies | {(decision.confidence * 100).toFixed(0)}% risk
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                  GMT {new Date(decision.timestamp).toISOString().slice(11, 19)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}