import { useState, useEffect } from 'react'
import { useSentinel } from '../store/sentinel'
import { Panel } from '../components/ui/Panel'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { DecisionPill } from '../components/ui/DecisionPill'
import { ExplainabilityBar } from '../components/charts/ExplainabilityBar'
import { AlertTriangle, Shield, Target, Clock, Database, Network, Eye, Globe, Activity, ChevronDown, ChevronRight } from 'lucide-react'

const KILL_CHAIN_PHASES = {
  'Recon': { step: 1, color: 'var(--cyan)', description: 'Reconnaissance and information gathering' },
  'Weaponize': { step: 2, color: 'var(--cyan)', description: 'Weaponization of exploits' },
  'Deliver': { step: 3, color: 'var(--amber)', description: 'Delivery of weaponized payload' },
  'Exploit': { step: 4, color: 'var(--amber)', description: 'Exploitation of vulnerabilities' },
  'Persist': { step: 5, color: 'var(--red)', description: 'Installation and persistence' },
  'Exfil': { step: 6, color: 'var(--red)', description: 'Command & Control and Exfiltration' }
}

const ATTACK_TO_KILL_CHAIN = {
  'Probe': 'Recon',
  'DoS': 'Deliver', 
  'Exploits': 'Exploit',
  'U2R': 'Persist',
  'R2L': 'Persist',
  'Backdoors': 'Exfil',
  'Fuzzers': 'Exploit',
  'Worms': 'Deliver',
  'Shellcode': 'Exploit',
  'Analysis': 'Recon',
  'Generic': 'Deliver',
  'Normal': null
}

export function ThreatInvestigation() {
  const events = useSentinel(s => s.events)
  const [supabaseEvents, setSupabaseEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState(new Set())
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchSupabaseEvents()
    const interval = setInterval(fetchSupabaseEvents, 15000) // Update every 15 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchSupabaseEvents = async () => {
    setLoading(true)
    try {
      // Fetch events with raw data from Supabase
      const response = await fetch('http://localhost:8000/data/raw?limit=200')
      const data = await response.json()
      
      if (data.events && data.events.length > 0) {
        setSupabaseEvents(data.events)
        // Auto-select first high-risk event if none selected
        if (!selectedEvent) {
          const highRiskEvent = data.events.find(e => e.risk_score >= 60 || e.severity === 'HIGH' || e.severity === 'CRITICAL')
          if (highRiskEvent) {
            setSelectedEvent(highRiskEvent)
          }
        }
      } else {
        // Fallback to local events if Supabase fails
        setSupabaseEvents(events)
        if (!selectedEvent && events.length > 0) {
          const highRiskEvent = events.find(e => e.risk_score >= 60 || e.severity === 'HIGH' || e.severity === 'CRITICAL')
          if (highRiskEvent) {
            setSelectedEvent(highRiskEvent)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch Supabase events:', error)
      // Fallback to local events
      setSupabaseEvents(events)
    } finally {
      setLoading(false)
    }
  }

  // Filter for serious events (risk >= 50 or HIGH/CRITICAL severity)
  const seriousEvents = supabaseEvents.filter(e => 
    (e.risk_score >= 50) || 
    (e.severity === 'HIGH' || e.severity === 'CRITICAL') ||
    (e.decision === 'BLOCK' || e.decision === 'RESTRICT')
  ).slice(0, 50) // Limit to 50 most recent serious events

  const toggleEventExpansion = (eventId) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const getKillChainPhase = (attackCat) => {
    return ATTACK_TO_KILL_CHAIN[attackCat] || 'Deliver'
  }

  const renderKillChain = (event) => {
    const currentPhase = getKillChainPhase(event.attack_cat)
    const currentStep = KILL_CHAIN_PHASES[currentPhase]?.step || 3

    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '10px', 
          color: 'var(--text-dim)', 
          marginBottom: '8px',
          letterSpacing: '1px'
        }}>
          KILL CHAIN ANALYSIS - {event.attack_cat.toUpperCase()}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '8px' }}>
          {Object.entries(KILL_CHAIN_PHASES).map(([phase, config], i) => {
            const active = i < currentStep
            const current = i === currentStep - 1
            const color = current ? config.color : (active ? config.color : 'var(--border-base)')
            
            return (
              <div key={phase} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: current ? '28px' : '24px', 
                    height: current ? '28px' : '24px', 
                    borderRadius: '50%',
                    border: `2px solid ${color}`,
                    background: active ? `${color}22` : 'transparent',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: current ? `0 0 12px ${color}` : (active ? `0 0 6px ${color}` : 'none'),
                    transition: 'all 0.3s',
                  }}>
                    <span style={{ fontSize: current ? '10px' : '8px', color, fontWeight: current ? 'bold' : 'normal' }}>
                      {current ? '●' : (active ? '●' : '○')}
                    </span>
                  </div>
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '7px', 
                    color, 
                    marginTop: '2px', 
                    letterSpacing: '0.5px',
                    fontWeight: current ? 'bold' : 'normal'
                  }}>
                    {phase.toUpperCase()}
                  </span>
                </div>
                {i < Object.keys(KILL_CHAIN_PHASES).length - 1 && (
                  <div style={{
                    height: current ? '3px' : '2px', 
                    flex: 0.3,
                    background: active ? color : 'var(--border-base)',
                    transition: 'all 0.3s',
                  }} />
                )}
              </div>
            )
          })}
        </div>
        
        <div style={{
          padding: '8px',
          background: 'var(--bg-elevated)',
          borderRadius: '4px',
          border: `1px solid ${currentStep ? KILL_CHAIN_PHASES[currentPhase]?.color : 'var(--border-base)'}`
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-primary)', fontWeight: 600 }}>
            Current Phase: {currentPhase}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '8px', color: 'var(--text-dim)', marginTop: '2px' }}>
            {KILL_CHAIN_PHASES[currentPhase]?.description}
          </div>
        </div>
      </div>
    )
  }

  const renderRawNetworkData = (event) => {
    const rawData = event.score_breakdown?.raw_network_data || event.raw_network_data || {}
    
    if (Object.keys(rawData).length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
          <Database size={24} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            No raw network data available
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
        {Object.entries(rawData).map(([key, value]) => (
          <div key={key} style={{
            padding: '6px',
            background: 'var(--bg-elevated)',
            borderRadius: '4px',
            border: '1px solid var(--border-base)'
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '8px',
              color: 'var(--text-dim)',
              letterSpacing: '0.5px',
              marginBottom: '2px'
            }}>
              {key.toUpperCase()}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              {typeof value === 'number' ? 
                (value < 1 ? value.toFixed(4) : value.toFixed(2)) : 
                (value || 'N/A')
              }
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderScoreBreakdown = (event) => {
    const breakdown = event.score_breakdown || {}
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '10px', 
          color: 'var(--text-dim)', 
          marginBottom: '8px',
          letterSpacing: '1px'
        }}>
          RISK SCORE CALCULATION
        </div>
        
        {/* Main components */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'ML MODEL', value: breakdown.ml_score || 0, max: 40, color: 'var(--cyan)' },
            { label: 'CONTEXT', value: breakdown.context_score || 0, max: 35, color: 'var(--amber)' },
            { label: 'BEHAVIOR', value: breakdown.behavioral_score || 0, max: 25, color: 'var(--purple)' }
          ].map(component => (
            <div key={component.label} style={{
              padding: '8px',
              background: 'var(--bg-elevated)',
              borderRadius: '4px',
              border: '1px solid var(--border-base)',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontFamily: 'var(--font-display)', 
                fontSize: '18px', 
                fontWeight: 700,
                color: component.color,
                marginBottom: '4px'
              }}>
                {component.value.toFixed(1)}
              </div>
              <div style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '8px', 
                color: 'var(--text-dim)',
                marginBottom: '4px'
              }}>
                {component.label}
              </div>
              <div style={{
                height: '3px',
                background: 'var(--border-base)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((component.value / component.max) * 100, 100)}%`,
                  background: component.color,
                  borderRadius: '2px'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Total calculation */}
        <div style={{
          padding: '8px',
          background: 'var(--bg-panel)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px' }}>
            TOTAL RISK SCORE
          </div>
          <div style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '24px', 
            fontWeight: 700,
            color: event.risk_score >= 80 ? 'var(--red)' : event.risk_score >= 60 ? 'var(--amber)' : 'var(--green)'
          }}>
            {event.risk_score}%
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
            Decision: {event.decision} (Confidence: {(event.confidence * 100).toFixed(1)}%)
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '350px 1fr', gap: '12px', height: '100%' }}>
      
      {/* Left Column - Event List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Header */}
        <Panel title="SERIOUS SECURITY EVENTS">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
              REAL DATA FROM SUPABASE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Database size={10} color={loading ? 'var(--amber)' : 'var(--green)'} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: loading ? 'var(--amber)' : 'var(--green)' }}>
                {loading ? 'LOADING' : 'LIVE'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '4px' }}>
              FILTER: Risk ≥50% OR High/Critical Severity OR Block/Restrict Decision
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)' }}>
              Found {seriousEvents.length} serious events
            </div>
          </div>
        </Panel>

        {/* Event List */}
        <Panel title="EVENT LIST" style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '600px', overflowY: 'auto' }}>
            {seriousEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                <AlertTriangle size={24} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '4px' }}>
                  {loading ? 'Loading events...' : 'No serious events found'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                  Events with risk ≥50% will appear here
                </div>
              </div>
            ) : (
              seriousEvents.map((event, index) => (
                <div key={event.id || index} style={{
                  padding: '10px',
                  background: selectedEvent?.id === event.id ? 'var(--bg-elevated)' : 'var(--bg-panel)',
                  border: selectedEvent?.id === event.id ? '1px solid var(--cyan)' : '1px solid var(--border-base)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderLeft: `3px solid ${event.risk_score >= 80 ? 'var(--red)' : event.risk_score >= 60 ? 'var(--amber)' : 'var(--cyan)'}`
                }}
                onClick={() => setSelectedEvent(event)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <SeverityBadge severity={event.severity || 'MEDIUM'} />
                    <DecisionPill decision={event.decision} />
                  </div>
                  
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {event.attack_cat} - {event.user_name || event.user}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                      {event.src_ip}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--red)', fontWeight: 700 }}>
                      {event.risk_score || 0}%
                    </span>
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* Right Column - Event Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        {selectedEvent ? (
          <>
            {/* Event Header */}
            <Panel title={`${selectedEvent.attack_cat} - ${selectedEvent.user_name || selectedEvent.user}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <SeverityBadge severity={selectedEvent.severity || 'MEDIUM'} />
                  <DecisionPill decision={selectedEvent.decision} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--red)', fontWeight: 700 }}>
                  {selectedEvent.risk_score || 0}%
                </div>
              </div>

              {/* Event Explanation */}
              <div style={{
                padding: '12px',
                background: 'var(--bg-elevated)',
                borderRadius: '6px',
                border: '1px solid var(--border-base)',
                marginBottom: '16px'
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--cyan)',
                  marginBottom: '8px',
                  letterSpacing: '1px'
                }}>
                  THREAT ANALYSIS:
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6
                }}>
                  {selectedEvent.explanation || `${selectedEvent.attack_cat} attack detected from ${selectedEvent.user_name || selectedEvent.user} with ${selectedEvent.risk_score}% risk score. Source IP: ${selectedEvent.src_ip}. Decision: ${selectedEvent.decision} based on ML confidence of ${(selectedEvent.confidence * 100).toFixed(1)}%.`}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: 'ATTACK TYPE', value: selectedEvent.attack_cat, icon: <Target size={16} /> },
                  { label: 'ENTITY', value: selectedEvent.user_name || selectedEvent.user, icon: <Shield size={16} /> },
                  { label: 'TIMESTAMP', value: new Date(selectedEvent.timestamp).toLocaleTimeString(), icon: <Clock size={16} /> },
                  { label: 'SOURCE IP', value: selectedEvent.src_ip, icon: <Network size={16} /> }
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--cyan)', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Kill Chain Analysis */}
            <Panel title="KILL CHAIN ANALYSIS">
              {renderKillChain(selectedEvent)}
            </Panel>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              
              {/* Risk Score Breakdown */}
              <Panel title="RISK CALCULATION">
                {renderScoreBreakdown(selectedEvent)}
              </Panel>

              {/* Raw Network Data */}
              <Panel title="RAW NETWORK DATA">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--cyan)' }}>
                  <Database size={16} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600 }}>NETWORK FLOW DATA</span>
                </div>
                {renderRawNetworkData(selectedEvent)}
              </Panel>
            </div>

            {/* Additional Event Context */}
            <Panel title="EVENT CONTEXT & METADATA">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {[
                  { label: 'Location', value: selectedEvent.location },
                  { label: 'Device', value: selectedEvent.device },
                  { label: 'Model Version', value: selectedEvent.model_version },
                  { label: 'MLP Score', value: selectedEvent.mlp_score?.toFixed(4) },
                  { label: 'Confidence', value: `${(selectedEvent.confidence * 100).toFixed(1)}%` },
                  { label: 'Risk Level', value: selectedEvent.risk_level },
                  { label: 'Event Type', value: selectedEvent.event_type || selectedEvent.type },
                  { label: 'Trust Reserve', value: selectedEvent.trust_reserve }
                ].filter(item => item.value).map(item => (
                  <div key={item.label} style={{
                    padding: '8px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-base)'
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginBottom: '2px' }}>
                      {item.label.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <Panel title="SELECT AN EVENT">
            <div style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: '6px',
              border: '1px dashed var(--border-base)',
            }}>
              <Eye size={48} color="var(--text-dim)" style={{ marginBottom: '16px' }} />
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}>
                Select a security event to investigate
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                color: 'var(--text-dim)',
              }}>
                Detailed analysis, kill chain mapping, and forensics will appear here
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}