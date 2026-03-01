import { Panel } from '../components/ui/Panel'
import { TensionGauge } from '../components/charts/TensionGauge'
import { EventFeed } from '../components/EventFeed'
import { ModelHealthPanel } from '../components/ModelHealthPanel'
import { NetworkTopology } from '../components/NetworkTopology'
import { ActionPanel } from '../components/ActionPanel'
import { useSentinel } from '../store/sentinel'
import { DecisionPill } from '../components/ui/DecisionPill'

function StatCard({ label, value, color = 'var(--cyan)' }) {
  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
        {label}
      </div>
    </div>
  )
}

export function MissionControl() {
  const { events, entities, status, simulationStats } = useSentinel(s => s)

  // Indian names for entities
  const indianNames = ['Arjun', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Ananya', 'Karthik', 'Meera', 'Rohan', 'Kavya', 'Sanjay', 'Deepika', 'Amit', 'Pooja', 'Ravi']
  
  const getIndianName = (name) => {
    if (name && name.includes('user')) {
      const index = parseInt(name.replace('user', '')) || 0
      return indianNames[index % indianNames.length] || name
    }
    return name
  }

  const blocks     = events.filter(e => e.decision === 'BLOCK').length
  const challenges = events.filter(e => e.decision === 'CHALLENGE').length
  const critical   = events.filter(e => e.severity === 'CRITICAL').length
  const mlEvents   = events.filter(e => e.model_version === '2.0.0').length

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px', 
      minHeight: '100vh',
      padding: '12px',
      width: '100%',
      boxSizing: 'border-box'
    }}>

      {/* Enhanced stat bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '12px',
        width: '100%'
      }}>
        <StatCard label="TOTAL EVENTS"   value={events.length}        color="var(--cyan)"  />
        <StatCard label="ML PREDICTIONS" value={mlEvents}             color="var(--green)" />
        <StatCard label="BLOCKED"        value={blocks}               color="var(--red)"   />
        <StatCard label="CHALLENGED"     value={challenges}           color="var(--amber)" />
        <StatCard label="CRITICAL"       value={critical}             color="var(--red)"   />
        <StatCard label="ENTITIES LIVE"  value={entities.length}      color="var(--green)" />
      </div>

      {/* Main content grid - removed duplicate event feeds */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '300px 1fr 320px', 
        gap: '12px', 
        minHeight: '600px',
        alignItems: 'start',
        width: '100%'
      }}>

        {/* Left Column - Tension + Entities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <Panel title="THREAT TENSION">
            <TensionGauge />
          </Panel>

          <Panel title="ENTITY SCORES" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {entities.slice(0, 15).map(e => (
                <div key={e.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', background: 'var(--bg-elevated)', borderRadius: '4px',
                  minWidth: 0,
                  borderLeft: `3px solid ${
                    e.honeypot ? 'var(--amber)' :
                    (e.risk_score || e.base_risk || 0) >= 65 ? 'var(--red)' :
                    (e.risk_score || e.base_risk || 0) >= 45 ? 'var(--amber)' : 'var(--green)'
                  }`
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '11px', 
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {getIndianName(e.name)} {e.honeypot && '[HONEYPOT]'}
                    </div>
                    <div style={{ 
                      fontFamily: 'var(--font-body)', 
                      fontSize: '10px', 
                      color: 'var(--text-dim)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {e.role} | {e.department}
                    </div>
                    {e.status && e.status !== 'active' && (
                      <div style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '8px', 
                        color: e.status === 'honeypot' ? 'var(--amber)' : 'var(--cyan)',
                        textTransform: 'uppercase'
                      }}>
                        {e.status.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700,
                    color: (e.risk_score || e.base_risk || 0) < 40 ? 'var(--green)' : 
                           (e.risk_score || e.base_risk || 0) < 65 ? 'var(--amber)' : 'var(--red)',
                    flexShrink: 0,
                    marginLeft: '8px'
                  }}>
                    {Math.round(e.risk_score || e.base_risk || 0)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Center Column - Network Topology + Event Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Network Topology */}
          <NetworkTopology />
          
          {/* Full Event Feed with Raw Data */}
          <EventFeed />
        </div>

        {/* Right Column - Actions + Model Health + Live Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Action Panel */}
          <ActionPanel />
          
          {/* Model Health Panel - Compact */}
          <div style={{ minWidth: 0 }}>
            <ModelHealthPanel />
          </div>
        </div>
      </div>
    </div>
  )
}