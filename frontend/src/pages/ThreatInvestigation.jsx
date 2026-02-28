import { useSentinel } from '../store/sentinel'
import { Panel } from '../components/ui/Panel'
import { ExplainabilityBar } from '../components/charts/ExplainabilityBar'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { DecisionPill } from '../components/ui/DecisionPill'

const PHASES = ['Recon', 'Weaponize', 'Deliver', 'Exploit', 'Persist', 'Exfil']
const PHASE_COLORS = {
  Recon: 'var(--cyan)', Weaponize: 'var(--cyan)', Deliver: 'var(--amber)',
  Exploit: 'var(--amber)', Persist: 'var(--red)', Exfil: 'var(--red)',
}

export function ThreatInvestigation() {
  const events = useSentinel(s => s.events)
  const incidents = events.filter(e => e.kill_chain_id)
  const critical  = events.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH').slice(0, 5)

  return (
    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '12px', height: '100%' }}>

      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>

        {/* Kill Chain */}
        <Panel title="KILL CHAIN RECONSTRUCTION">
          {incidents.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>
              No active incidents. Monitoring...
            </div>
          ) : (
            incidents.slice(0, 3).map(inc => (
              <div key={inc.id} style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {inc.kill_chain_id} · {inc.user} · {inc.attack_cat}
                </div>
                {/* Phase nodes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                  {PHASES.map((phase, i) => {
                    const active = i <= (inc.kill_chain_step || 0)
                    const color  = active ? PHASE_COLORS[phase] : 'var(--border-base)'
                    return (
                      <div key={phase} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            border: `2px solid ${color}`,
                            background: active ? `${color}22` : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: active ? `0 0 12px ${color}` : 'none',
                            transition: 'all 0.5s',
                          }}>
                            <span style={{ fontSize: '10px', color }}>
                              {active ? '●' : '○'}
                            </span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color, marginTop: '4px', letterSpacing: '1px' }}>
                            {phase.toUpperCase()}
                          </span>
                        </div>
                        {i < PHASES.length - 1 && (
                          <div style={{
                            height: '2px', flex: 0.3,
                            background: active ? color : 'var(--border-base)',
                            transition: 'background 0.5s',
                          }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </Panel>

        {/* Explainability for latest high event */}
        {critical[0] && (
          <Panel title="DECISION EXPLAINABILITY">
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {critical[0].user} · {critical[0].attack_cat} · Confidence {(critical[0].confidence * 100).toFixed(0)}%
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                {critical[0].explanation}
              </div>
              <ExplainabilityBar factors={critical[0].score_breakdown?.factors || []} />
            </div>

            {/* Score breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
              {[
                { label: 'NETWORK',  value: critical[0].score_breakdown?.network,   color: 'var(--red)'   },
                { label: 'IDENTITY', value: critical[0].score_breakdown?.identity,  color: 'var(--amber)' },
                { label: 'DEVICE',   value: critical[0].score_breakdown?.device,    color: 'var(--cyan)'  },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: s.color }}>
                    {Math.round(s.value || 0)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      {/* Right — High severity events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        <Panel title="HIGH PRIORITY EVENTS" style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {critical.map((e, i) => (
              <div key={e.id} style={{
                padding: '12px', background: 'var(--bg-elevated)', borderRadius: '4px',
                borderLeft: `3px solid ${e.severity === 'CRITICAL' ? 'var(--red)' : 'var(--amber)'}`,
                animation: i === 0 ? 'slide-in-right 0.4s ease' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <SeverityBadge severity={e.severity} />
                  <DecisionPill decision={e.decision} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--cyan)', marginBottom: '4px' }}>{e.user}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{e.explanation}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>{e.attack_cat}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                    Risk: <span style={{ color: 'var(--red)' }}>{e.risk_score}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}