import { useState } from 'react'
import { Panel } from './ui/Panel'
import { useSentinel, apiService } from '../store/sentinel'

export function ActionPanel() {
  const { events, entities } = useSentinel(s => s)
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [lastAction, setLastAction] = useState(null)

  // Get entities that are not already actioned (not honeypotted or monitored)
  const availableEntities = entities.filter(e => !e.honeypot && e.status !== 'monitored' && e.status !== 'honeypot')
  const criticalEntities = availableEntities.filter(e => (e.risk_score || e.base_risk || 0) >= 65)
  const highRiskEntities = availableEntities.filter(e => (e.risk_score || e.base_risk || 0) >= 45 && (e.risk_score || e.base_risk || 0) < 65)
  
  // Get actioned entities for display
  const monitoredEntities = entities.filter(e => e.status === 'monitored')
  const honeypottedEntities = entities.filter(e => e.honeypot || e.status === 'honeypot')

  const executeAction = async (entityId, actionType) => {
    setActionInProgress(true)
    try {
      const response = await apiService.fetchWithRetry(`/entity/${entityId}/action/${actionType}`, {
        method: 'POST'
      })
      
      setLastAction({
        type: actionType,
        entity: response.entity,
        success: true,
        message: response.message,
        timestamp: new Date().toISOString()
      })
      
      // Refresh entities
      const updatedEntities = await apiService.getEntities()
      useSentinel.getState().setEntities(updatedEntities)
      
    } catch (error) {
      setLastAction({
        type: actionType,
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      })
    } finally {
      setActionInProgress(false)
    }
  }

  const exportLogs = async (format = 'json') => {
    setActionInProgress(true)
    try {
      const response = await apiService.fetchWithRetry(`/logs/export?format=${format}&limit=1000`)
      
      // Create download
      const dataStr = format === 'csv' ? response.data : JSON.stringify(response.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: format === 'csv' ? 'text/csv' : 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `equimind_logs_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setLastAction({
        type: 'export',
        success: true,
        message: `Exported ${response.count} log entries as ${format.toUpperCase()}`,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      setLastAction({
        type: 'export',
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      })
    } finally {
      setActionInProgress(false)
    }
  }

  const ActionButton = ({ onClick, children, color = 'var(--cyan)', disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled || actionInProgress}
      style={{
        background: disabled ? 'var(--bg-elevated)' : `${color}20`,
        border: `1px solid ${disabled ? 'var(--border-base)' : color}`,
        color: disabled ? 'var(--text-dim)' : color,
        padding: '6px 12px',
        borderRadius: '4px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        cursor: disabled || actionInProgress ? 'not-allowed' : 'pointer',
        opacity: disabled || actionInProgress ? 0.6 : 1,
        transition: 'all 0.2s'
      }}
    >
      {children}
    </button>
  )

  return (
    <Panel 
      title="THREAT RESPONSE" 
      action={
        <div style={{ display: 'flex', gap: '6px' }}>
          <ActionButton 
            onClick={() => exportLogs('json')}
            color="var(--green)"
          >
            EXPORT JSON
          </ActionButton>
          <ActionButton 
            onClick={() => exportLogs('csv')}
            color="var(--green)"
          >
            EXPORT CSV
          </ActionButton>
        </div>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        
        {/* Last Action Status */}
        {lastAction && (
          <div style={{
            padding: '8px 12px',
            background: lastAction.success ? 'var(--green-glow)' : 'var(--red-glow)',
            border: `1px solid ${lastAction.success ? 'var(--green-dim)' : 'var(--red-dim)'}`,
            borderRadius: '4px'
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: lastAction.success ? 'var(--green)' : 'var(--red)',
              fontWeight: 600,
              marginBottom: '2px'
            }}>
              {lastAction.success ? '✓ SUCCESS' : '✗ FAILED'}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              {lastAction.message}
            </div>
          </div>
        )}

        {/* Actioned Entities Status */}
        {(monitoredEntities.length > 0 || honeypottedEntities.length > 0) && (
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--green)',
              marginBottom: '8px',
              letterSpacing: '1px'
            }}>
              ✓ ACTIONED ENTITIES
            </div>
            
            {monitoredEntities.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)', marginBottom: '4px' }}>
                  UNDER MONITORING ({monitoredEntities.length})
                </div>
                {monitoredEntities.slice(0, 3).map(entity => (
                  <div key={entity.id} style={{
                    padding: '4px 8px',
                    background: 'var(--cyan-glow)',
                    border: '1px solid var(--cyan-dim)',
                    borderRadius: '3px',
                    marginBottom: '2px'
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-primary)' }}>
                      {entity.name} | {entity.role}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {honeypottedEntities.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--amber)', marginBottom: '4px' }}>
                  IN HONEYPOT ({honeypottedEntities.length})
                </div>
                {honeypottedEntities.slice(0, 3).map(entity => (
                  <div key={entity.id} style={{
                    padding: '4px 8px',
                    background: 'var(--amber-glow)',
                    border: '1px solid var(--amber-dim)',
                    borderRadius: '3px',
                    marginBottom: '2px'
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-primary)' }}>
                      {entity.name} | {entity.role}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Critical Threats */}
        {criticalEntities.length > 0 && (
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--red)',
              marginBottom: '8px',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              CRITICAL THREATS ({criticalEntities.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {criticalEntities.slice(0, 3).map(entity => (
                <div key={entity.id} style={{
                  padding: '8px',
                  background: 'var(--red-glow)',
                  border: '1px solid var(--red-dim)',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--text-primary)'
                      }}>
                        {entity.name}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--text-dim)'
                      }}>
                        Risk: {entity.risk_score || entity.base_risk} | {entity.role}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--red)'
                    }}>
                      {entity.risk_score || entity.base_risk}
                    </div>
                  </div>
                  
                  {entity.honeypot ? (
                    <div style={{
                      padding: '4px 8px',
                      background: 'var(--amber-glow)',
                      border: '1px solid var(--amber-dim)',
                      borderRadius: '3px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      color: 'var(--amber)',
                      textAlign: 'center'
                    }}>
                      IN HONEYPOT
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <ActionButton
                        onClick={() => executeAction(entity.id, 'honeypot')}
                        color="var(--amber)"
                      >
                        HONEYPOT
                      </ActionButton>
                      <ActionButton
                        onClick={() => executeAction(entity.id, 'monitor')}
                        color="var(--cyan)"
                      >
                        MONITOR
                      </ActionButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* High Risk Entities */}
        {highRiskEntities.length > 0 && (
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--amber)',
              marginBottom: '8px',
              letterSpacing: '1px'
            }}>
              HIGH RISK ({highRiskEntities.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {highRiskEntities.slice(0, 5).map(entity => (
                <div key={entity.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  background: 'var(--amber-glow)',
                  border: '1px solid var(--amber-dim)',
                  borderRadius: '4px'
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--text-primary)'
                    }}>
                      {entity.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      color: 'var(--text-dim)'
                    }}>
                      {entity.role} | Risk: {entity.risk_score || entity.base_risk}
                    </div>
                  </div>
                  <ActionButton
                    onClick={() => executeAction(entity.id, 'monitor')}
                    color="var(--cyan)"
                  >
                    MONITOR
                  </ActionButton>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Critical Events */}
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-dim)',
            marginBottom: '8px',
            letterSpacing: '1px'
          }}>
            RECENT CRITICAL EVENTS (LOGGED TO DATABASE)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {events.filter(e => e.severity === 'CRITICAL').slice(0, 10).map(event => (
              <div key={event.id} style={{
                padding: '6px 8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--red-dim)',
                borderLeft: '3px solid var(--red)',
                borderRadius: '4px'
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--cyan)',
                  marginBottom: '2px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{event.user} | {new Date(event.timestamp).toLocaleTimeString()}</span>
                  <span style={{ 
                    color: 'var(--red)', 
                    fontSize: '8px',
                    background: 'var(--red-glow)',
                    padding: '1px 4px',
                    borderRadius: '2px'
                  }}>
                    LOGGED
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  color: 'var(--text-secondary)'
                }}>
                  {event.explanation}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '8px',
                  color: 'var(--text-dim)',
                  marginTop: '2px'
                }}>
                  Risk: {event.risk_score} | Decision: {event.decision}
                </div>
              </div>
            ))}
            {events.filter(e => e.severity === 'CRITICAL').length === 0 && (
              <div style={{
                padding: '12px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px'
              }}>
                No critical events detected yet
              </div>
            )}
          </div>
        </div>

        {/* Action in Progress Indicator */}
        {actionInProgress && (
          <div style={{
            padding: '12px',
            background: 'var(--cyan-glow)',
            border: '1px solid var(--cyan-dim)',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--cyan)',
              animation: 'pulse 1s infinite'
            }}>
              ⏳ EXECUTING ACTION...
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}