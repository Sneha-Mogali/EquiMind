import { useState, useEffect } from 'react'
import { Panel } from '../components/ui/Panel'
import { useSentinel } from '../store/sentinel'
import { Eye, Shield, Activity, Database } from 'lucide-react'

export function Monitoring() {
  const [metricsData, setMetricsData] = useState(null)
  const [prometheusStatus, setPrometheusStatus] = useState('checking')
  const [grafanaStatus, setGrafanaStatus] = useState('checking')
  const [monitoredEntities, setMonitoredEntities] = useState([])
  const [systemStatus, setSystemStatus] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [autonomousActions, setAutonomousActions] = useState([])
  const [autonomousStats, setAutonomousStats] = useState(null)
  const events = useSentinel(s => s.events)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    checkServices()
    fetchMonitoredEntities()
    fetchAutonomousActions()
    const interval = setInterval(() => {
      checkServices()
      fetchMonitoredEntities()
      fetchAutonomousActions()
    }, 9000) // Update every 9 seconds for monitoring graphs
    return () => clearInterval(interval)
  }, [])

  const fetchMonitoredEntities = async () => {
    try {
      // Fetch entities and filter for monitored ones
      const entitiesResponse = await fetch('http://localhost:8000/entities')
      const entities = await entitiesResponse.json()
      
      const monitored = entities.filter(entity => 
        entity.status === 'monitored' || entity.status === 'monitoring'
      )
      setMonitoredEntities(monitored)

      // Fetch system status
      const statusResponse = await fetch('http://localhost:8000/status')
      const status = await statusResponse.json()
      setSystemStatus(status)
    } catch (error) {
      console.error('Failed to fetch monitored entities:', error)
    }
  }

  const fetchAutonomousActions = async () => {
    try {
      // Fetch recent autonomous actions
      const response = await fetch('http://localhost:8000/autonomous/actions?limit=10')
      const data = await response.json()
      setAutonomousActions(data.actions || [])
      setAutonomousStats(data.stats || {})
    } catch (error) {
      console.error('Failed to fetch autonomous actions:', error)
    }
  }

  const checkServices = async () => {
    // Check Prometheus
    try {
      const response = await fetch('http://localhost:9090/api/v1/status/config')
      setPrometheusStatus(response.ok ? 'online' : 'offline')
    } catch {
      setPrometheusStatus('offline')
    }

    // Check Grafana
    try {
      const response = await fetch('http://localhost:3001/api/health')
      setGrafanaStatus(response.ok ? 'online' : 'offline')
    } catch {
      setGrafanaStatus('offline')
    }

    // Fetch metrics from backend
    try {
      const response = await fetch('http://localhost:8000/metrics')
      const text = await response.text()
      parseMetrics(text)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  }

  const parseMetrics = (metricsText) => {
    const lines = metricsText.split('\n')
    const metrics = {}

    lines.forEach(line => {
      if (line.startsWith('equimind_events_total')) {
        const match = line.match(/equimind_events_total{.*?} (\d+)/)
        if (match) {
          metrics.totalEvents = (metrics.totalEvents || 0) + parseInt(match[1])
        }
      }
      if (line.startsWith('equimind_websocket_connections')) {
        const match = line.match(/equimind_websocket_connections (\d+)/)
        if (match) metrics.websocketConnections = parseInt(match[1])
      }
      if (line.startsWith('equimind_ml_predictions_total')) {
        const match = line.match(/equimind_ml_predictions_total{.*?} (\d+)/)
        if (match) {
          metrics.mlPredictions = (metrics.mlPredictions || 0) + parseInt(match[1])
        }
      }
    })

    setMetricsData(metrics)
  }

  const ServiceStatus = ({ name, status, url }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px',
      background: 'var(--bg-elevated)',
      borderRadius: '6px',
      borderLeft: `3px solid ${status === 'online' ? 'var(--green)' : status === 'offline' ? 'var(--red)' : 'var(--amber)'}`,
    }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {name}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
          {url}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: status === 'online' ? 'var(--green)' : status === 'offline' ? 'var(--red)' : 'var(--amber)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        {status === 'online' && '● ONLINE'}
        {status === 'offline' && '○ OFFLINE'}
        {status === 'checking' && '◐ CHECKING'}
      </div>
    </div>
  )

  const MetricCard = ({ label, value, color = 'var(--cyan)' }) => (
    <div style={{
      padding: '16px',
      background: 'var(--bg-elevated)',
      borderRadius: '6px',
      textAlign: 'center',
      border: '1px solid var(--border-base)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '32px',
        fontWeight: 700,
        color,
        marginBottom: '8px',
      }}>
        {value !== undefined ? value : '—'}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--text-dim)',
        letterSpacing: '2px',
      }}>
        {label}
      </div>
    </div>
  )

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'HONEYPOT_MOVE': return '🎯'
      case 'ISOLATION': return '🔒'
      case 'BLOCK': return '🚫'
      case 'MONITOR': return '👁️'
      case 'CHALLENGE': return '🛡️'
      default: return '⚡'
    }
  }

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'HONEYPOT_MOVE': return 'var(--amber)'
      case 'ISOLATION': return 'var(--red)'
      case 'BLOCK': return 'var(--red)'
      case 'MONITOR': return 'var(--cyan)'
      case 'CHALLENGE': return 'var(--amber)'
      default: return 'var(--text-dim)'
    }
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      
      {/* Header */}
      <Panel title="MONITORING & OBSERVABILITY">
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Real-time monitoring stack powered by Prometheus and Grafana
        </div>

        {/* Service Status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
          <ServiceStatus 
            name="Backend API" 
            status="online" 
            url="http://localhost:8000"
          />
          <ServiceStatus 
            name="Prometheus" 
            status={prometheusStatus} 
            url="http://localhost:9090"
          />
          <ServiceStatus 
            name="Grafana" 
            status={grafanaStatus} 
            url="http://localhost:3001"
          />
        </div>
      </Panel>

      {/* Metrics Overview */}
      <Panel title="METRICS OVERVIEW">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <MetricCard 
            label="TOTAL EVENTS" 
            value={metricsData?.totalEvents || events.length} 
            color="var(--cyan)"
          />
          <MetricCard 
            label="ML PREDICTIONS" 
            value={metricsData?.mlPredictions || events.length} 
            color="var(--green)"
          />
          <MetricCard 
            label="WEBSOCKET CONNECTIONS" 
            value={metricsData?.websocketConnections || 0} 
            color="var(--amber)"
          />
          <MetricCard 
            label="BLOCKED EVENTS" 
            value={events.filter(e => e.decision === 'BLOCK').length} 
            color="var(--red)"
          />
          <MetricCard 
            label="AUTONOMOUS ACTIONS" 
            value={autonomousStats?.total_actions || autonomousActions.length} 
            color="var(--purple)"
          />
          <MetricCard 
            label="ACTIONS (24H)" 
            value={autonomousStats?.actions_24h || 0} 
            color="var(--amber)"
          />
        </div>
      </Panel>

      {/* Monitored Entities from Supabase */}
      <Panel 
        title="MONITORED ENTITIES (LIVE)" 
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={12} color="var(--cyan)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)' }}>
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        }
      >
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            Entities under enhanced monitoring from Supabase database
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={12} color="var(--cyan)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)' }}>
                {monitoredEntities.length} MONITORED
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} color="var(--green)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--green)' }}>
                {systemStatus?.database_mode || 'SUPABASE'}
              </span>
            </div>
          </div>
        </div>

        {monitoredEntities.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {monitoredEntities.map(entity => {
              // Get recent events for this entity
              const entityEvents = events.filter(e => e.user === entity.name).slice(0, 3)
              const avgRisk = entityEvents.length > 0 
                ? Math.round(entityEvents.reduce((sum, e) => sum + e.risk_score, 0) / entityEvents.length)
                : entity.risk_score || 0

              return (
                <div key={entity.id} style={{
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '6px',
                  border: '1px solid var(--cyan)',
                  position: 'relative'
                }}>
                  {/* Monitoring indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    background: 'rgba(6, 182, 212, 0.2)',
                    borderRadius: '3px'
                  }}>
                    <Eye size={10} color="var(--cyan)" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--cyan)', fontWeight: 600 }}>
                      MONITORING
                    </span>
                  </div>

                  {/* Entity info */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {entity.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                      {entity.department} • {entity.role}
                    </div>
                  </div>

                  {/* Risk metrics */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                        CURRENT RISK
                      </div>
                      <div style={{ 
                        fontFamily: 'var(--font-display)', 
                        fontSize: '18px', 
                        fontWeight: 700,
                        color: avgRisk >= 70 ? 'var(--red)' : avgRisk >= 50 ? 'var(--amber)' : 'var(--green)'
                      }}>
                        {avgRisk}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                        EVENTS (24H)
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--cyan)' }}>
                        {entityEvents.length}
                      </div>
                    </div>
                  </div>

                  {/* Recent activity */}
                  {entityEvents.length > 0 && (
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                        RECENT ACTIVITY:
                      </div>
                      {entityEvents.map((event) => (
                        <div key={event.id} style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '8px',
                          color: event.risk_score >= 70 ? 'var(--red)' : event.risk_score >= 50 ? 'var(--amber)' : 'var(--text-dim)',
                          marginBottom: '2px'
                        }}>
                          • {event.attack_cat} ({event.risk_score}%) - {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Monitoring duration */}
                  <div style={{ 
                    marginTop: '8px', 
                    paddingTop: '8px', 
                    borderTop: '1px solid var(--border-base)',
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '8px', 
                    color: 'var(--text-dim)' 
                  }}>
                    Monitored since: {entity.updated_at ? new Date(entity.updated_at).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: 'var(--text-dim)',
            background: 'var(--bg-elevated)',
            borderRadius: '6px',
            border: '1px dashed var(--border-base)'
          }}>
            <Eye size={24} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '4px' }}>
              No entities currently under monitoring
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
              Use Security Actions to add entities to monitoring
            </div>
          </div>
        )}
      </Panel>

      {/* Recent Autonomous Actions */}
      <Panel title="RECENT AUTONOMOUS ACTIONS">
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            Latest security actions taken automatically by the system
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={12} color="var(--purple)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--purple)' }}>
                {autonomousStats?.total_actions || autonomousActions.length} TOTAL
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={12} color="var(--amber)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--amber)' }}>
                {autonomousStats?.actions_24h || 0} TODAY
              </span>
            </div>
          </div>
        </div>

        {autonomousActions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {autonomousActions.slice(0, 5).map((action) => (
              <div key={action.id} style={{
                padding: '8px',
                background: 'var(--bg-elevated)',
                borderRadius: '4px',
                borderLeft: `3px solid ${getActionColor(action.action_type)}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {getActionIcon(action.action_type)} {action.action_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Entity: {action.entity_name || action.entity_id} • Risk: {action.risk_score_trigger}%
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                  {new Date(action.executed_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: 'var(--text-dim)',
            background: 'var(--bg-elevated)',
            borderRadius: '6px',
            border: '1px dashed var(--border-base)'
          }}>
            <Shield size={24} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '4px' }}>
              No autonomous actions recorded
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
              Actions will appear here as the system responds to threats
            </div>
          </div>
        )}
      </Panel>

      {/* Grafana Dashboards */}
      {grafanaStatus === 'online' ? (
        <Panel title="GRAFANA DASHBOARDS" style={{ flex: 1, minHeight: '600px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px',
            height: '100%',
          }}>
            {/* Main Dashboard */}
            <div style={{ 
              background: 'var(--bg-elevated)', 
              borderRadius: '6px', 
              overflow: 'hidden',
              border: '1px solid var(--border-base)',
            }}>
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-panel)',
                borderBottom: '1px solid var(--border-base)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-dim)',
                letterSpacing: '1px',
              }}>
                SYSTEM OVERVIEW
              </div>
              <iframe
                src="http://localhost:3001/d-solo/equimind/equimind-dashboard?orgId=1&theme=dark&panelId=1"
                width="100%"
                height="300"
                style={{ border: 'none', background: '#000' }}
              />
            </div>

            {/* Risk Score Distribution */}
            <div style={{ 
              background: 'var(--bg-elevated)', 
              borderRadius: '6px', 
              overflow: 'hidden',
              border: '1px solid var(--border-base)',
            }}>
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-panel)',
                borderBottom: '1px solid var(--border-base)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-dim)',
                letterSpacing: '1px',
              }}>
                RISK DISTRIBUTION
              </div>
              <iframe
                src="http://localhost:3001/d-solo/equimind/equimind-dashboard?orgId=1&theme=dark&panelId=2"
                width="100%"
                height="300"
                style={{ border: 'none', background: '#000' }}
              />
            </div>

            {/* ML Performance */}
            <div style={{ 
              background: 'var(--bg-elevated)', 
              borderRadius: '6px', 
              overflow: 'hidden',
              border: '1px solid var(--border-base)',
            }}>
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-panel)',
                borderBottom: '1px solid var(--border-base)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-dim)',
                letterSpacing: '1px',
              }}>
                ML PERFORMANCE
              </div>
              <iframe
                src="http://localhost:3001/d-solo/equimind/equimind-dashboard?orgId=1&theme=dark&panelId=3"
                width="100%"
                height="300"
                style={{ border: 'none', background: '#000' }}
              />
            </div>

            {/* Event Timeline */}
            <div style={{ 
              background: 'var(--bg-elevated)', 
              borderRadius: '6px', 
              overflow: 'hidden',
              border: '1px solid var(--border-base)',
            }}>
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-panel)',
                borderBottom: '1px solid var(--border-base)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-dim)',
                letterSpacing: '1px',
              }}>
                EVENT TIMELINE
              </div>
              <iframe
                src="http://localhost:3001/d-solo/equimind/equimind-dashboard?orgId=1&theme=dark&panelId=4"
                width="100%"
                height="300"
                style={{ border: 'none', background: '#000' }}
              />
            </div>
          </div>
        </Panel>
      ) : (
        <Panel title="GRAFANA DASHBOARDS">
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--bg-elevated)',
            borderRadius: '6px',
            border: '1px dashed var(--border-base)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '48px',
              color: 'var(--text-dim)',
              marginBottom: '16px',
            }}>
              WARNING
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}>
              Grafana is not running
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: 'var(--text-dim)',
              marginBottom: '16px',
            }}>
              Start the monitoring stack to view dashboards
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--cyan)',
              background: 'var(--bg-panel)',
              padding: '8px 12px',
              borderRadius: '4px',
              display: 'inline-block',
            }}>
              cd backend && start-monitoring.bat
            </div>
          </div>
        </Panel>
      )}

      {/* Quick Links */}
      <Panel title="QUICK LINKS">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Backend Metrics', url: 'http://localhost:8000/metrics', desc: 'Raw Prometheus metrics' },
            { label: 'Backend API Docs', url: 'http://localhost:8000/docs', desc: 'Interactive API documentation' },
            { label: 'Prometheus UI', url: 'http://localhost:9090', desc: 'Query and explore metrics' },
            { label: 'Grafana Dashboards', url: 'http://localhost:3001', desc: 'Visualization and alerting' },
          ].map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '12px',
                background: 'var(--bg-elevated)',
                borderRadius: '6px',
                border: '1px solid var(--border-base)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--cyan)'
                e.currentTarget.style.background = 'var(--cyan-glow)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-base)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
            >
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--cyan)',
                marginBottom: '4px',
              }}>
                {link.label} →
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                color: 'var(--text-dim)',
              }}>
                {link.desc}
              </div>
            </a>
          ))}
        </div>
      </Panel>

      {/* Setup Instructions */}
      <Panel title="SETUP INSTRUCTIONS">
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>1. Start Backend:</strong>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '10px', 
              background: 'var(--bg-panel)', 
              padding: '8px', 
              borderRadius: '4px', 
              marginTop: '4px',
              color: 'var(--cyan)',
            }}>
              cd backend && python main.py
            </div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>2. Start Monitoring Stack:</strong>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '10px', 
              background: 'var(--bg-panel)', 
              padding: '8px', 
              borderRadius: '4px', 
              marginTop: '4px',
              color: 'var(--cyan)',
            }}>
              cd backend && start-monitoring.bat
            </div>
          </div>
          
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>3. Access Grafana:</strong>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '10px', 
              background: 'var(--bg-panel)', 
              padding: '8px', 
              borderRadius: '4px', 
              marginTop: '4px',
              color: 'var(--cyan)',
            }}>
              http://localhost:3001 (admin/admin)
            </div>
          </div>
        </div>
      </Panel>

    </div>
  )
}