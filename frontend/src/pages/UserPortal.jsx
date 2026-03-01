import { useState } from 'react'
import { useSentinel } from '../store/sentinel'
import { Panel } from '../components/ui/Panel'

const STEPS = [
  { id: 1, label: 'Run endpoint security scan',       time: '~2 min',  points: 20 },
  { id: 2, label: 'Reconnect to corporate VPN',       time: '~30 sec', points: 15 },
  { id: 3, label: 'Re-authenticate with MFA',         time: '~1 min',  points: 30 },
  { id: 4, label: 'Update device OS patch',           time: '~5 min',  points: 25 },
]

export function UserPortal() {
  const events = useSentinel(s => s.events)
  const blocked = events.find(e => e.decision === 'BLOCK')
  const [completed, setCompleted] = useState([])

  const toggle = (id) => setCompleted(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const recovered = completed.reduce((s, id) => {
    const step = STEPS.find(st => st.id === id)
    return s + (step?.points || 0)
  }, 0)

  const currentScore = blocked ? Math.max(blocked.risk_score - recovered, 10) : 25
  const color = currentScore < 40 ? 'var(--green)' : currentScore < 65 ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Status banner */}
        <div style={{
          background: 'var(--amber-glow)',
          border: '1px solid var(--amber-dim)',
          borderRadius: '8px', padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px' }}>
            Your access has been paused
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {blocked ? blocked.explanation : 'Security verification required to continue.'}
          </div>
        </div>

        {/* Score recovery */}
        <Panel title="TRUST SCORE RECOVERY">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>Current risk score</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color }}>{Math.round(currentScore)}</div>
          </div>
          <div style={{ height: '8px', background: 'var(--border-base)', borderRadius: '4px', marginBottom: '8px' }}>
            <div style={{
              height: '100%', borderRadius: '4px',
              width: `${100 - currentScore}%`,
              background: 'var(--green)',
              transition: 'width 0.8s ease',
            }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
            Target: below 40 for full access restoration
          </div>
        </Panel>

        {/* Remediation steps */}
        <Panel title="REMEDIATION STEPS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {STEPS.map(step => {
              const done = completed.includes(step.id)
              return (
                <div key={step.id} onClick={() => toggle(step.id)} style={{
                  display: 'flex', gap: '12px', alignItems: 'center',
                  padding: '14px', borderRadius: '6px',
                  background: done ? 'var(--green-glow)' : 'var(--bg-elevated)',
                  border: `1px solid ${done ? 'var(--green-dim)' : 'var(--border-base)'}`,
                  cursor: 'pointer', transition: 'all 0.3s',
                }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: `2px solid ${done ? 'var(--green)' : 'var(--border-base)'}`,
                    background: done ? 'var(--green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.3s',
                    fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--bg-base)',
                  }}>
                    {done ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: done ? 'var(--green)' : 'var(--text-primary)' }}>
                      {step.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                      {step.time}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)' }}>
                    -{step.points} risk
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        {currentScore < 40 && (
          <div style={{
            background: 'var(--green-glow)', border: '1px solid var(--green-dim)',
            borderRadius: '8px', padding: '20px', textAlign: 'center',
            animation: 'fade-up 0.5s ease',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--green)', marginBottom: '8px' }}>
              Access Restored
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Your trust score is within acceptable range. You may continue.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}