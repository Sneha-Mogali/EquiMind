import { useSentinel } from '../store/sentinel'
import { Panel } from '../components/ui/Panel'
import { DecisionPill } from '../components/ui/DecisionPill'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

export function EntityInspector() {
  const entities = useSentinel(s => s.entities)
  const events   = useSentinel(s => s.events)

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {entities.map(entity => {
          const entityEvents = events.filter(e => e.user === entity.name).slice(0, 5)
          const score = Math.round(entity.risk_score || 0)
          const color = score < 40 ? 'var(--green)' : score < 65 ? 'var(--amber)' : 'var(--red)'

          const radarData = [
            { axis: 'Location',  normal: 80, current: entity.risk_score > 50 ? 30 : 80 },
            { axis: 'Hours',     normal: 70, current: entity.risk_score > 60 ? 20 : 70 },
            { axis: 'Volume',    normal: 60, current: entity.risk_score > 40 ? 40 : 60 },
            { axis: 'Resources', normal: 75, current: entity.risk_score > 55 ? 25 : 75 },
            { axis: 'Device',    normal: 90, current: entity.risk_score > 45 ? 50 : 90 },
            { axis: 'Rate',      normal: 65, current: entity.risk_score > 35 ? 35 : 65 },
          ]

          return (
            <Panel key={entity.id} style={{ cursor: 'pointer' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>{entity.name}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-dim)' }}>{entity.role} · {entity.dept}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color }}>{score}</div>
              </div>

              {/* Radar */}
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border-base)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }} />
                  <Radar name="Normal"  dataKey="normal"  stroke="var(--cyan)"  fill="var(--cyan)"  fillOpacity={0.1} strokeWidth={1} />
                  <Radar name="Current" dataKey="current" stroke={color}        fill={color}        fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>

              {/* Trust reserve */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px', letterSpacing: '2px' }}>TRUST RESERVE</div>
                <div style={{ height: '4px', background: 'var(--border-base)', borderRadius: '2px' }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    width: `${(entity.trust_reserve || 0) / 15 * 100}%`,
                    background: 'var(--green)',
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>

              {/* Recent events */}
              {entityEvents.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {entityEvents.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>{e.attack_cat}</span>
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