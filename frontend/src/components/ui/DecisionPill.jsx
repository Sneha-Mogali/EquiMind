const MAP = {
  ALLOW:     { bg: 'var(--green-glow)',  border: 'var(--green-dim)',  color: 'var(--green)'  },
  CHALLENGE: { bg: 'var(--amber-glow)', border: 'var(--amber-dim)', color: 'var(--amber)' },
  RESTRICT:  { bg: 'var(--red-glow)',   border: 'var(--red-dim)',   color: 'var(--red)'   },
  BLOCK:     { bg: 'var(--red-glow)',   border: 'var(--red)',       color: 'var(--red)'   },
}

export function DecisionPill({ decision }) {
  const s = MAP[decision] || MAP.ALLOW
  
  // Display text mapping
  const displayText = {
    'BLOCK': 'FURTHER ESCALATION',
    'CHALLENGE': 'CHALLENGE',
    'RESTRICT': 'RESTRICT', 
    'ALLOW': 'ALLOW'
  }
  
  return (
    <span style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      padding: '2px 10px',
      borderRadius: '3px',
    }}>
      {displayText[decision] || decision}
    </span>
  )
}