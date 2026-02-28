const COLORS = ['var(--red)', 'var(--amber)', 'var(--cyan)']

export function ExplainabilityBar({ factors = [] }) {
  return (
    <div>
      <div style={{
        height: '20px',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        marginBottom: '10px',
      }}>
        {factors.map((f, i) => (
          <div key={i} style={{
            width: `${f.contribution}%`,
            background: COLORS[i % COLORS.length],
            transition: 'width 1s ease',
            opacity: 0.85,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {factors.map((f, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[i % COLORS.length] }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{f.name}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS[i % COLORS.length] }}>
              {f.contribution}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}