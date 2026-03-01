import { useSentinel } from '../../store/sentinel'

export function TensionGauge() {
  const getTension = useSentinel(s => s.getTension)
  const score = getTension()

  const color = score < 40 ? 'var(--green)' : score < 65 ? 'var(--amber)' : 'var(--red)'
  const label = score < 40 ? 'SECURE' : score < 65 ? 'ELEVATED' : 'CRITICAL'

  const r = 80
  const cx = 100, cy = 100
  const circumference = Math.PI * r
  const offset = circumference - (score / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Track */}
        <path
          d={`M 20 100 A ${r} ${r} 0 0 1 180 100`}
          fill="none" stroke="var(--border-base)" strokeWidth="12" strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M 20 100 A ${r} ${r} 0 0 1 180 100`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease',
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
        {/* Score */}
        <text x="100" y="88" textAnchor="middle"
          style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 900, fill: color }}>
          {score}
        </text>
        <text x="100" y="108" textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fill: 'var(--text-dim)', letterSpacing: '3px' }}>
          {label}
        </text>
      </svg>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
        GLOBAL THREAT TENSION
      </div>
    </div>
  )
}