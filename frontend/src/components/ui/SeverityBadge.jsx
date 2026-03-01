const MAP = {
  CRITICAL: { color: 'var(--red)',   anim: 'threat-ripple 1s infinite' },
  HIGH:     { color: 'var(--red)',   anim: 'none' },
  MEDIUM:   { color: 'var(--amber)', anim: 'none' },
  LOW:      { color: 'var(--cyan)',  anim: 'none' },
  INFO:     { color: 'var(--text-dim)', anim: 'none' },
}

export function SeverityBadge({ severity }) {
  const s = MAP[severity] || MAP.INFO
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      color: s.color,
      minWidth: '60px',
      display: 'inline-block',
      animation: s.anim,
    }}>
      {severity}
    </span>
  )
}