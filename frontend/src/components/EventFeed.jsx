import { useState, useEffect } from 'react'
import { useSentinel } from '../store/sentinel'
import { SeverityBadge } from './ui/SeverityBadge'
import { DecisionPill } from './ui/DecisionPill'
import { Panel } from './ui/Panel'
import { ChevronDown, ChevronRight, Database, Network, Globe } from 'lucide-react'

export function EventFeed() {
  const events = useSentinel(s => s.events)
  const [expandedEvents, setExpandedEvents] = useState(new Set())
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

  const toggleEventExpansion = (eventId) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const formatRawData = (event) => {
    const rawData = event.raw_network_data || {}
    return {
      'Protocol': rawData.proto || 'N/A',
      'Service': rawData.service || 'N/A',
      'State': rawData.state || 'N/A',
      'Source Bytes': rawData.sbytes ? `${(rawData.sbytes / 1024).toFixed(1)}KB` : 'N/A',
      'Dest Bytes': rawData.dbytes ? `${(rawData.dbytes / 1024).toFixed(1)}KB` : 'N/A',
      'Source Packets': rawData.spkts || 'N/A',
      'Dest Packets': rawData.dpkts || 'N/A',
      'Duration': rawData.dur ? `${rawData.dur}s` : 'N/A',
      'Rate': rawData.rate ? `${rawData.rate.toFixed(0)} B/s` : 'N/A',
      'Source IP': rawData.src_ip || event.src_ip || 'N/A',
      'Dest IP': rawData.dst_ip || 'N/A',
      'Source Port': rawData.src_port || 'N/A',
      'Dest Port': rawData.dst_port || 'N/A'
    }
  }

  return (
    <Panel title="LIVE EVENT FEED WITH RAW DATA" action={
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Globe size={12} color="var(--cyan)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)' }}>
            GMT {currentTime.toISOString().slice(11, 19)}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', fontSize: '10px', animation: 'data-blink 1s infinite' }}>● LIVE</span>
      </div>
    } style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        overflowY: 'auto', 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2px',
        maxHeight: '350px'
      }}>
        {events.slice(0, 40).map((e, i) => {
          const isExpanded = expandedEvents.has(e.id)
          const rawData = formatRawData(e)
          
          return (
            <div key={e.id} style={{
              padding: '8px',
              background: i === 0 ? 'var(--bg-elevated)' : 'transparent',
              borderRadius: '4px',
              borderLeft: `2px solid ${
                e.severity === 'CRITICAL' ? 'var(--red)' :
                e.severity === 'HIGH'     ? 'var(--red)' :
                e.severity === 'MEDIUM'   ? 'var(--amber)' :
                                            'var(--border-base)'
              }`,
              animation: i === 0 ? 'slide-in-right 0.4s ease' : 'none',
              transition: 'all 0.3s',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SeverityBadge severity={e.severity} />
                  <button
                    onClick={() => toggleEventExpansion(e.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--cyan)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Database size={12} />
                    RAW DATA
                  </button>
                </div>
                <DecisionPill decision={e.decision} />
              </div>
              
              <div style={{ 
                fontFamily: 'var(--font-body)', 
                fontSize: '11px', 
                color: 'var(--text-primary)', 
                marginBottom: '3px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {e.explanation}
              </div>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: isExpanded ? '8px' : '0' }}>
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '9px', 
                  color: 'var(--cyan)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {getIndianName(e.user)}
                </span>
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '9px', 
                  color: 'var(--text-dim)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {e.location}
                </span>
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '9px', 
                  color: 'var(--text-dim)'
                }}>
                  Risk: {e.risk_score}%
                </span>
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '9px', 
                  color: 'var(--text-dim)'
                }}>
                  GMT {new Date(e.timestamp).toISOString().slice(11, 19)}
                </span>
              </div>

              {/* RAW NETWORK DATA EXPANSION */}
              {isExpanded && (
                <div style={{
                  padding: '8px',
                  background: 'var(--bg-panel)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-base)',
                  marginTop: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    color: 'var(--cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 600
                  }}>
                    <Network size={14} />
                    NETWORK FLOW DATA
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {Object.entries(rawData).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '4px 6px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '3px',
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
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ML Prediction Details */}
                  <div style={{
                    marginTop: '8px',
                    padding: '6px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '3px',
                    border: '1px solid var(--border-base)'
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      color: 'var(--text-dim)',
                      marginBottom: '4px'
                    }}>
                      ML PREDICTION:
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-primary)' }}>
                        Attack: {e.attack_cat}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-primary)' }}>
                        Confidence: {(e.confidence * 100).toFixed(1)}%
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-primary)' }}>
                        MLP Score: {e.mlp_score?.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}