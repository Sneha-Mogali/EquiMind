import { useSentinel } from '../store/sentinel'

export function Ticker() {
  const entities = useSentinel(s => s.entities)

  const items = [...entities, ...entities]

  const color = (score) => {
    if (score < 40) return 'var(--green)'
    if (score < 65) return 'var(--amber)'
    return 'var(--red)'
  }

  return (
    <div style={{
      height: '36px',
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border-base)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        gap: '32px',
        animation: 'ticker-scroll 30s linear infinite',
        whiteSpace: 'nowrap',
        paddingLeft: '32px',
      }}>
        {items.map((e, i) => (
          <span key={i} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: color(e.risk_score || 0),
          }}>
            {e.name}
            <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>▸</span>
            {Math.round(e.risk_score || 0)}
          </span>
        ))}
      </div>
    </div>
  )
}