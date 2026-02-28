import { Panel } from '../components/ui/Panel'
import { TensionGauge } from '../components/charts/TensionGauge'
import { EventFeed } from '../components/EventFeed'
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
  const { events, entities, status } = useSentinel(s => s)

  const blocks     = events.filter(e => e.decision === 'BLOCK').length
  const challenges = events.filter(e => e.decision === 'CHALLENGE').length
  const critical   = events.filter(e => e.severity === 'CRITICAL').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', padding: '12px' }}>

      {/* Stat bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <StatCard label="TOTAL EVENTS"   value={events.length}        color="var(--cyan)"  />
        <StatCard label="BLOCKED"        value={blocks}               color="var(--red)"   />
        <StatCard label="CHALLENGED"     value={challenges}           color="var(--amber)" />
        <StatCard label="CRITICAL"       value={critical}             color="var(--red)"   />
        <StatCard label="ENTITIES LIVE"  value={entities.length}      color="var(--green)" />
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 340px', gap: '12px', flex: 1, minHeight: 0 }}>

        {/* Left — Tension + Entities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Panel title="THREAT TENSION">
            <TensionGauge />
          </Panel>

          <Panel title="ENTITY SCORES" style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {entities.slice(0, 10).map(e => (
                <div key={e.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', background: 'var(--bg-elevated)', borderRadius: '4px',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)' }}>{e.name}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-dim)' }}>{e.role}</div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700,
                    color: e.risk_score < 40 ? 'var(--green)' : e.risk_score < 65 ? 'var(--amber)' : 'var(--red)',
                  }}>
                    {Math.round(e.risk_score || 0)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Center — Recent Events Table */}
        <Panel title="EVENT STREAM" style={{ overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {events.slice(0, 20).map((e, i) => (
              <div key={e.id} style={{
                display: 'grid',
                gridTemplateColumns: '80px 100px 1fr 90px 70px',
                gap: '12px', alignItems: 'center',
                padding: '10px 12px',
                background: i === 0 ? 'var(--bg-elevated)' : 'transparent',
                borderRadius: '4px',
                borderLeft: `2px solid ${e.severity === 'CRITICAL' ? 'var(--red)' : e.severity === 'HIGH' ? 'var(--red)' : e.severity === 'MEDIUM' ? 'var(--amber)' : 'var(--border-base)'}`,
                animation: i === 0 ? 'slide-in-right 0.4s ease' : 'none',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)' }}>{e.user}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{e.explanation}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>{e.attack_cat}</span>
                <DecisionPill decision={e.decision} />
              </div>
            ))}
          </div>
        </Panel>

        {/* Right — Live feed */}
        <EventFeed />
      </div>
    </div>
  )
}