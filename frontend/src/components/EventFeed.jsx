import { useSentinel } from '../store/sentinel'
import { SeverityBadge } from './ui/SeverityBadge'
import { DecisionPill } from './ui/DecisionPill'
import { Panel } from './ui/Panel'

export function EventFeed() {
  const events = useSentinel(s => s.events)

  return (
    <Panel title="LIVE EVENT FEED" action={
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', fontSize: '10px', animation: 'data-blink 1s infinite' }}>● LIVE</span>
    } style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {events.slice(0, 40).map((e, i) => (
          <div key={e.id} style={{
            padding: '10px',
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
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <SeverityBadge severity={e.severity} />
              <DecisionPill decision={e.decision} />
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '3px' }}>
              {e.explanation}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)' }}>{e.user}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>{e.location}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                {new Date(e.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}