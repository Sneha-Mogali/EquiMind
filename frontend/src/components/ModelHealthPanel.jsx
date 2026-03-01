import { useState, useEffect } from 'react'
import { useSentinel, apiService } from '../store/sentinel'
import { Panel } from './ui/Panel'

function StatusIndicator({ status, label }) {
  const colors = {
    healthy: 'var(--green)',
    warning: 'var(--amber)', 
    critical: 'var(--red)',
    unknown: 'var(--text-dim)'
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: colors[status] || colors.unknown,
        animation: status === 'healthy' ? 'pulse 2s infinite' : 'none'
      }} />
      <span style={{ 
        fontFamily: 'var(--font-mono)', 
        fontSize: '11px', 
        color: colors[status] || colors.unknown 
      }}>
        {label}
      </span>
    </div>
  )
}

function MetricCard({ label, value, unit = '', color = 'var(--cyan)' }) {
  return (
    <div style={{
      padding: '8px 12px',
      background: 'var(--bg-elevated)',
      borderRadius: '4px',
      border: '1px solid var(--border-base)'
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '16px',
        fontWeight: 700,
        color: color,
        marginBottom: '2px'
      }}>
        {value}{unit}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--text-dim)',
        letterSpacing: '1px'
      }}>
        {label}
      </div>
    </div>
  )
}

export function ModelHealthPanel() {
  const { modelHealth, simulationStats, lastValidation } = useSentinel(s => s)
  const [isValidating, setIsValidating] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  const refreshHealth = async () => {
    try {
      setIsValidating(true)
      const [health, stats] = await Promise.all([
        apiService.getModelHealth(),
        apiService.getSimulationStats()
      ])
      
      useSentinel.getState().setModelHealth(health)
      useSentinel.getState().setSimulationStats(stats)
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (error) {
      console.error('Failed to refresh model health:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const runValidation = async () => {
    try {
      setIsValidating(true)
      const validation = await apiService.validateModels()
      useSentinel.getState().setLastValidation(validation)
      await refreshHealth()
    } catch (error) {
      console.error('Model validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  useEffect(() => {
    // Auto-refresh every 2 minutes
    const interval = setInterval(refreshHealth, 120000)
    return () => clearInterval(interval)
  }, [])

  const mlpStatus = modelHealth?.model_status?.mlp_model?.status || 'unknown'
  const riskEngineStatus = modelHealth?.model_status?.risk_engine?.status || 'unknown'
  
  return (
    <Panel 
      title="MODEL HEALTH" 
      action={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {lastRefresh && (
            <span style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '9px', 
              color: 'var(--text-dim)' 
            }}>
              {lastRefresh}
            </span>
          )}
          <button
            onClick={refreshHealth}
            disabled={isValidating}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-base)',
              color: 'var(--text-secondary)',
              padding: '4px 8px',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              cursor: isValidating ? 'not-allowed' : 'pointer',
              opacity: isValidating ? 0.6 : 1
            }}
          >
            {isValidating ? 'REFRESHING...' : 'REFRESH'}
          </button>
          <button
            onClick={runValidation}
            disabled={isValidating}
            style={{
              background: 'var(--amber-glow)',
              border: '1px solid var(--amber-dim)',
              color: 'var(--amber)',
              padding: '4px 8px',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              cursor: isValidating ? 'not-allowed' : 'pointer',
              opacity: isValidating ? 0.6 : 1
            }}
          >
            {isValidating ? 'VALIDATING...' : 'VALIDATE'}
          </button>
        </div>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        
        {/* Model Status */}
        <div>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '10px', 
            color: 'var(--text-dim)', 
            marginBottom: '6px',
            letterSpacing: '1px'
          }}>
            MODEL STATUS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <StatusIndicator status={mlpStatus} label="MLP Neural Network" />
            <StatusIndicator status={riskEngineStatus} label="Risk Computation Engine" />
          </div>
        </div>

        {/* Performance Metrics */}
        {modelHealth?.model_status?.mlp_model?.performance && (
          <div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '10px', 
              color: 'var(--text-dim)', 
              marginBottom: '6px',
              letterSpacing: '1px'
            }}>
              PERFORMANCE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <MetricCard 
                label="PREDICTION TIME"
                value={Math.round(modelHealth.model_status.mlp_model.performance.prediction_time * 1000)}
                unit="ms"
                color={modelHealth.model_status.mlp_model.performance.prediction_time > 0.5 ? 'var(--red)' : 'var(--green)'}
              />
              <MetricCard 
                label="BATCH AVG"
                value={Math.round((modelHealth.model_status.mlp_model.performance.batch_avg_time || 0) * 1000)}
                unit="ms"
              />
            </div>
          </div>
        )}

        {/* Simulation Stats */}
        {simulationStats && (
          <div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '10px', 
              color: 'var(--text-dim)', 
              marginBottom: '6px',
              letterSpacing: '1px'
            }}>
              DATA SIMULATION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <MetricCard 
                label="DATASET SIZE"
                value={simulationStats.total_samples?.toLocaleString() || 'N/A'}
              />
              <MetricCard 
                label="SMOTE SAMPLES"
                value={simulationStats.smote_samples?.toLocaleString() || 'N/A'}
                color="var(--amber)"
              />
            </div>
          </div>
        )}

        {/* Last Validation */}
        {lastValidation && (
          <div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '10px', 
              color: 'var(--text-dim)', 
              marginBottom: '6px',
              letterSpacing: '1px'
            }}>
              LAST VALIDATION
            </div>
            <div style={{
              padding: '8px',
              background: lastValidation.overall_status === 'healthy' ? 'var(--green-glow)' : 
                         lastValidation.overall_status === 'warning' ? 'var(--amber-glow)' : 'var(--red-glow)',
              border: `1px solid ${lastValidation.overall_status === 'healthy' ? 'var(--green-dim)' : 
                                  lastValidation.overall_status === 'warning' ? 'var(--amber-dim)' : 'var(--red-dim)'}`,
              borderRadius: '4px'
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: lastValidation.overall_status === 'healthy' ? 'var(--green)' : 
                       lastValidation.overall_status === 'warning' ? 'var(--amber)' : 'var(--red)',
                fontWeight: 600
              }}>
                {lastValidation.overall_status.toUpperCase()}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-dim)',
                marginTop: '2px'
              }}>
                {new Date(lastValidation.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        )}

      </div>
    </Panel>
  )
}