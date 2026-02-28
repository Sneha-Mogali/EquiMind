import { useState } from 'react'
import { useSentinel } from '../store/sentinel'
import { Panel } from '../components/ui/Panel'

const PRESETS = [
  { name: 'Enterprise Security', rules: 4 },
  { name: 'Banking & Fintech',   rules: 7 },
  { name: 'Healthcare (HIPAA)',  rules: 6 },
  { name: 'API Abuse Prevention',rules: 5 },
]

const DEFAULT_RULES = [
  { id: 1, name: 'Block TOR exit nodes',              condition: 'src_ip.reputation == "TOR"',          action: 'BLOCK',     active: true  },
  { id: 2, name: 'Challenge off-hours admin access',  condition: 'hour < 7 OR hour > 21 AND role == "Admin"', action: 'CHALLENGE', active: true  },
  { id: 3, name: 'Restrict bulk downloads',           condition: 'data_volume > 2GB',                   action: 'RESTRICT',  active: true  },
  { id: 4, name: 'Block unpatched devices',           condition: 'device.patch_level < 30d',            action: 'BLOCK',     active: false },
  { id: 5, name: 'Allow trusted service accounts',   condition: 'entity.type == "service" AND score < 20', action: 'ALLOW',  active: true  },
]

export function PolicyStudio() {
  const events = useSentinel(s => s.events)
  const [rules, setRules] = useState(DEFAULT_RULES)

  const toggle = (id) => setRules(prev =>
    prev.map(r => r.id === id ? { ...r, active: !r.active } : r)
  )

  const actionColor = (action) => ({
    ALLOW: 'var(--green)', CHALLENGE: 'var(--amber)',
    RESTRICT: 'var(--red)', BLOCK: 'var(--red)',
  })[action] || 'var(--cyan)'

  return (
    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '12px', height: '100%' }}>

      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        <Panel title="ACTIVE POLICIES">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rules.map(rule => (
              <div key={rule.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                gap: '12px', alignItems: 'center',
                padding: '14px', borderRadius: '6px',
                background: rule.active ? 'var(--bg-elevated)' : 'transparent',
                border: `1px solid ${rule.active ? 'var(--border-base)' : 'var(--border-base)'}`,
                opacity: rule.active ? 1 : 0.4,
                transition: 'all 0.3s',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {rule.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                    IF {rule.condition}
                  </div>
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: actionColor(rule.action),
                  background: `${actionColor(rule.action)}22`,
                  border: `1px solid ${actionColor(rule.action)}44`,
                  padding: '4px 12px', borderRadius: '3px',
                }}>
                  → {rule.action}
                </span>
                <button onClick={() => toggle(rule.id)} style={{
                  width: '40px', height: '22px', borderRadius: '11px',
                  background: rule.active ? 'var(--green)' : 'var(--border-base)',
                  border: 'none', cursor: 'pointer', transition: 'background 0.3s',
                  position: 'relative',
                }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: 'white', position: 'absolute',
                    top: '3px', left: rule.active ? '21px' : '3px',
                    transition: 'left 0.3s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="AUTOMATION SUGGESTIONS">
          {[
            'Restrict contractor accounts outside business hours (affects 1 entity)',
            'Auto-challenge new device fingerprints for Finance department (affects 3 entities)',
            'Block service accounts with interactive sessions (affects 0 entities currently)',
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px', borderRadius: '4px', background: 'var(--bg-elevated)',
              marginBottom: '8px',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{s}</span>
              <button style={{
                background: 'var(--cyan-glow)', border: '1px solid var(--cyan-dim)',
                color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px',
                padding: '4px 12px', borderRadius: '3px', cursor: 'pointer', marginLeft: '12px',
              }}>APPLY</button>
            </div>
          ))}
        </Panel>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        <Panel title="INDUSTRY PRESETS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {PRESETS.map(p => (
              <button key={p.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px', borderRadius: '4px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border-base)', cursor: 'pointer', width: '100%',
                transition: 'border-color 0.2s',
              }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>{p.rules} rules</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="POLICY IMPACT SIMULATOR">
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Currently active rules affect:
          </div>
          {[
            { label: 'Entities monitored',  value: 13, color: 'var(--cyan)'  },
            { label: 'Events matched today', value: events.filter(e => e.decision !== 'ALLOW').length, color: 'var(--amber)' },
            { label: 'Auto-actions fired',   value: events.filter(e => e.decision === 'BLOCK').length, color: 'var(--red)'  },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-base)' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{s.label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}