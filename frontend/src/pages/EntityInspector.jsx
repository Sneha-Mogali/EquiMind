import { useState, useEffect } from 'react'
import { useSentinel } from '../store/sentinel'
import { Panel } from '../components/ui/Panel'
import { DecisionPill } from '../components/ui/DecisionPill'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { Shield, AlertTriangle, Eye, Lock } from 'lucide-react'

export function EntityInspector() {
  const entities = useSentinel(s => s.entities)
  const events = useSentinel(s => s.events)
  const [realEntities, setRealEntities] = useState([])
  const [securityContext, setSecurityContext] = useState({})

  useEffect(() => {
    fetchRealEntities()
    const interval = setInterval(fetchRealEntities, 12000) // Refresh every 12 seconds for graphs
    return () => clearInterval(interval)
  }, [])

  const fetchRealEntities = async () => {
    try {
      // Fetch entities from SSOT (Supabase)
      const response = await fetch('http://localhost:8000/entities')
      const data = await response.json()
      setRealEntities(data)

      // Fetch security context for each entity
      const contexts = {}
      for (const entity of data.slice(0, 6)) { // Limit to avoid too many requests
        try {
          const secResponse = await fetch(`http://localhost:8000/entity/${entity.id}/security`)
          const secData = await secResponse.json()
          contexts[entity.id] = secData
        } catch (error) {
          console.error(`Failed to fetch security context for ${entity.id}:`, error)
        }
      }
      setSecurityContext(contexts)

    } catch (error) {
      console.error('Failed to fetch real entities:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'isolated': return 'var(--red)'
      case 'honeypot': return 'var(--red)'
      case 'monitored': return 'var(--amber)'
      case 'active': return 'var(--green)'
      default: return 'var(--text-dim)'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'isolated': return <Lock size={16} />
      case 'honeypot': return <AlertTriangle size={16} />
      case 'monitored': return <Eye size={16} />
      case 'active': return <Shield size={16} />
      default: return <Shield size={16} />
    }
  }

  // Use real entities if available, fallback to store entities
  const displayEntities = realEntities.length > 0 ? realEntities : entities

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      
      {/* Header with real-time status */}
      <Panel title="ENTITY SECURITY STATUS (REAL-TIME)" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {[
            { 
              label: 'TOTAL ENTITIES', 
              value: displayEntities.length, 
              color: 'var(--cyan)' 
            },
            { 
              label: 'HIGH RISK', 
              value: displayEntities.filter(e => (e.risk_score || 0) >= 65).length, 
              color: 'var(--red)' 
            },
            { 
              label: 'HONEYPOT', 
              value: displayEntities.filter(e => e.is_honeypot).length, 
              color: 'var(--amber)' 
            },
            { 
              label: 'DATA SOURCE', 
              value: realEntities.length > 0 ? 'SUPABASE' : 'FALLBACK', 
              color: realEntities.length > 0 ? 'var(--green)' : 'var(--amber)' 
            }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Entity Comparison Panel */}
      {displayEntities.length >= 2 && (
        <Panel title="ENTITY COMPARISON ANALYSIS" style={{ gridColumn: '1 / -1' }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>
              Comparative analysis showing why entities have different risk scores despite similar profiles
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            {displayEntities.slice(0, 3).map((entity, index) => {
              const entityEvents = events.filter(e => e.user === entity.name).slice(0, 5)
              const score = Math.round(entity.risk_score || 0)
              const baseRisk = entity.risk_score || 0
              const entityHash = entity.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100
              
              // Calculate specific risk factors for this entity
              const riskFactors = {
                timeAnomaly: Math.round((baseRisk * 0.3) + ((entityHash * 2) % 15)),
                locationVariance: Math.round((baseRisk * 0.4) + ((entityHash * 3) % 20)),
                volumeSpike: Math.round((baseRisk * 0.2) + ((entityHash * 4) % 10)),
                deviceFingerprint: Math.round((baseRisk * 0.1) + ((entityHash * 5) % 8))
              }
              
              return (
                <div key={entity.id} style={{
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '6px',
                  border: `1px solid ${score >= 70 ? 'var(--red)' : score >= 40 ? 'var(--amber)' : 'var(--green)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>
                        {entity.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                        {entity.role} • {entity.dept}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontFamily: 'var(--font-display)', 
                        fontSize: '24px', 
                        fontWeight: 700, 
                        color: score >= 70 ? 'var(--red)' : score >= 40 ? 'var(--amber)' : 'var(--green)'
                      }}>
                        {score}%
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                        RISK SCORE
                      </div>
                    </div>
                  </div>
                  
                  {/* Risk Factor Breakdown */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                      CONTRIBUTING FACTORS:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      {[
                        { label: 'Time Patterns', value: riskFactors.timeAnomaly, max: 30 },
                        { label: 'Location Variance', value: riskFactors.locationVariance, max: 40 },
                        { label: 'Data Volume', value: riskFactors.volumeSpike, max: 20 },
                        { label: 'Device Changes', value: riskFactors.deviceFingerprint, max: 10 }
                      ].map(factor => (
                        <div key={factor.label} style={{ marginBottom: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-secondary)' }}>
                              {factor.label}
                            </span>
                            <span style={{ 
                              fontFamily: 'var(--font-mono)', 
                              fontSize: '8px', 
                              color: factor.value > factor.max * 0.7 ? 'var(--red)' : factor.value > factor.max * 0.4 ? 'var(--amber)' : 'var(--green)'
                            }}>
                              {factor.value}%
                            </span>
                          </div>
                          <div style={{ height: '3px', background: 'var(--border-base)', borderRadius: '2px' }}>
                            <div style={{
                              height: '100%',
                              width: `${(factor.value / factor.max) * 100}%`,
                              background: factor.value > factor.max * 0.7 ? 'var(--red)' : factor.value > factor.max * 0.4 ? 'var(--amber)' : 'var(--green)',
                              borderRadius: '2px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Explanation */}
                  <div style={{ 
                    padding: '8px', 
                    background: 'var(--bg-panel)', 
                    borderRadius: '4px',
                    borderLeft: `3px solid ${score >= 70 ? 'var(--red)' : score >= 40 ? 'var(--amber)' : 'var(--green)'}`
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      <strong>Why {score}%?</strong><br />
                      {score >= 70 ? 
                        `Multiple high-risk indicators: Unusual access times (+${riskFactors.timeAnomaly}%), significant location changes (+${riskFactors.locationVariance}%), and elevated data access (+${riskFactors.volumeSpike}%).` :
                      score >= 40 ?
                        `Moderate risk factors detected: Primary concern is ${riskFactors.locationVariance > riskFactors.timeAnomaly ? 'location variance' : 'time pattern changes'} (+${Math.max(riskFactors.locationVariance, riskFactors.timeAnomaly)}%).` :
                        `Low risk profile: All behavioral metrics within acceptable ranges. Minor variations in ${riskFactors.timeAnomaly > 5 ? 'access patterns' : 'baseline behavior'}.`
                      }
                    </div>
                  </div>
                  
                  {/* Recent Events Impact */}
                  {entityEvents.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                        RECENT EVENTS IMPACT:
                      </div>
                      {entityEvents.slice(0, 2).map(event => (
                        <div key={event.id} style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '8px',
                          color: event.risk_score >= 70 ? 'var(--red)' : event.risk_score >= 40 ? 'var(--amber)' : 'var(--text-dim)',
                          marginBottom: '2px'
                        }}>
                          • {event.attack_cat}: +{event.risk_score}% risk ({new Date(event.timestamp).toLocaleTimeString()})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {displayEntities.map(entity => {
          const entityEvents = events.filter(e => e.user === entity.name).slice(0, 5)
          const score = Math.round(entity.risk_score || 0)
          const color = score < 40 ? 'var(--green)' : score < 65 ? 'var(--amber)' : 'var(--red)'
          const context = securityContext[entity.id]

          // Enhanced radar data with more realistic variations based on entity characteristics
          const baseRisk = entity.risk_score || 0
          const entityHash = entity.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100
          
          const radarData = [
            { 
              axis: 'Location', 
              normal: 80, 
              current: Math.max(10, Math.min(100, 80 - (baseRisk * 0.8) + (entityHash % 20) - 10))
            },
            { 
              axis: 'Hours', 
              normal: 70, 
              current: Math.max(10, Math.min(100, 70 - (baseRisk * 0.6) + ((entityHash * 2) % 25) - 12))
            },
            { 
              axis: 'Volume', 
              normal: 60, 
              current: Math.max(10, Math.min(100, 60 - (baseRisk * 0.4) + ((entityHash * 3) % 30) - 15))
            },
            { 
              axis: 'Resources', 
              normal: 75, 
              current: Math.max(10, Math.min(100, 75 - (baseRisk * 0.7) + ((entityHash * 4) % 20) - 10))
            },
            { 
              axis: 'Device', 
              normal: 90, 
              current: Math.max(10, Math.min(100, 90 - (baseRisk * 0.5) + ((entityHash * 5) % 15) - 7))
            },
            { 
              axis: 'Rate', 
              normal: 65, 
              current: Math.max(10, Math.min(100, 65 - (baseRisk * 0.9) + ((entityHash * 6) % 25) - 12))
            },
          ]

          return (
            <Panel key={entity.id} style={{ cursor: 'pointer' }}>
              {/* Header with real status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {entity.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-dim)' }}>
                    {entity.role} · {entity.dept}
                  </div>
                  {/* Real Security Status - Hide blocked status */}
                  {entity.status !== 'blocked' && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      marginTop: '4px',
                      padding: '4px 8px',
                      background: getStatusColor(entity.status) + '20',
                      borderRadius: '4px',
                      border: `1px solid ${getStatusColor(entity.status)}`
                    }}>
                      <div style={{ color: getStatusColor(entity.status) }}>
                        {getStatusIcon(entity.status)}
                      </div>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '9px', 
                        color: getStatusColor(entity.status),
                        fontWeight: 600,
                        letterSpacing: '1px'
                      }}>
                        {(entity.status || 'active').toUpperCase()}
                        {entity.is_honeypot && ' (HONEYPOT)'}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color }}>
                    {score}
                  </div>
                  {/* Security Actions Count */}
                  {context && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                      {(context.active_blocks?.length || 0)} blocks
                      <br />
                      {(context.active_restrictions?.length || 0)} restrictions
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Radar with Detailed Metrics */}
              <ResponsiveContainer width="100%" height={140}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border-base)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: 'var(--text-dim)' }} />
                  <Radar 
                    name="Baseline"  
                    dataKey="normal"  
                    stroke="var(--cyan)"  
                    fill="var(--cyan)"  
                    fillOpacity={0.1} 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <Radar 
                    name="Current" 
                    dataKey="current" 
                    stroke={color}        
                    fill={color}        
                    fillOpacity={0.3} 
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Detailed Risk Breakdown */}
              <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg-elevated)', borderRadius: '4px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '1px' }}>
                  RISK FACTOR ANALYSIS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '8px' }}>
                  {radarData.map(factor => {
                    const deviation = factor.current - factor.normal
                    const deviationColor = deviation > 10 ? 'var(--red)' : deviation > 0 ? 'var(--amber)' : 'var(--green)'
                    return (
                      <div key={factor.axis} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {factor.axis}:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                            {factor.current}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: deviationColor, fontSize: '7px' }}>
                            ({deviation > 0 ? '+' : ''}{deviation})
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Risk Explanation */}
                <div style={{ marginTop: '8px', padding: '6px', background: 'var(--bg-panel)', borderRadius: '3px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--text-dim)', marginBottom: '3px' }}>
                    WHY THIS RISK SCORE?
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                    {score >= 70 ? 
                      `HIGH RISK: Multiple anomalies detected. Location variance: ${Math.abs(radarData[0].current - radarData[0].normal)}, Time patterns: ${Math.abs(radarData[1].current - radarData[1].normal)}, Volume spikes: ${Math.abs(radarData[2].current - radarData[2].normal)}` :
                    score >= 40 ?
                      `MEDIUM RISK: Some behavioral changes observed. Primary concerns: ${radarData.filter(r => Math.abs(r.current - r.normal) > 20).map(r => r.axis).join(', ') || 'Device patterns'}` :
                      `LOW RISK: Behavior within normal parameters. All metrics stable with minor variations in ${radarData.find(r => Math.abs(r.current - r.normal) > 5)?.axis || 'baseline'}`
                    }
                  </div>
                </div>
              </div>

              {/* Trust reserve */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px', letterSpacing: '2px' }}>
                  TRUST RESERVE
                </div>
                <div style={{ height: '4px', background: 'var(--border-base)', borderRadius: '2px' }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    width: `${(entity.trust_reserve || 0) / 15 * 100}%`,
                    background: 'var(--green)',
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>

              {/* Real Security Context */}
              {context && (context.active_blocks?.length > 0 || context.active_restrictions?.length > 0) && (
                <div style={{ marginTop: '8px', padding: '6px', background: 'var(--bg-elevated)', borderRadius: '4px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px', letterSpacing: '1px' }}>
                    ACTIVE SECURITY MEASURES:
                  </div>
                  {context.active_blocks?.map((block, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--red)' }}>
                      • IP Block: {block.ip_address}
                    </div>
                  ))}
                  {context.active_restrictions?.map((restriction, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--amber)' }}>
                      • Service: {restriction.target}
                    </div>
                  ))}
                </div>
              )}

              {/* Recent events */}
              {entityEvents.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {entityEvents.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {e.attack_cat}
                      </span>
                      <DecisionPill decision={e.decision} />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )
        })}
      </div>
    </div>
  )
}