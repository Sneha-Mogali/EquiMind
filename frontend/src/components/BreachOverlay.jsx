import { useSentinel } from '../store/sentinel'
import { useEffect } from 'react'

export function BreachOverlay() {
  const { threatState, clearThreat, events } = useSentinel(s => s)
  const criticalEvent = events.find(e => e.severity === 'CRITICAL')

  useEffect(() => {
    if (threatState) {
      const t = setTimeout(clearThreat, 8000)
      return () => clearTimeout(t)
    }
  }, [threatState])

  if (!threatState || !criticalEvent) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'breach-vignette 0.5s ease',
      backdropFilter: 'blur(4px)',
    }}>
      {/* Red vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255,23,68,0.3) 100%)',
        pointerEvents: 'none',
      }} />

      <div style={{ textAlign: 'center', animation: 'fade-up 0.5s ease', position: 'relative' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '64px',
          fontWeight: 900,
          color: 'var(--red)',
          letterSpacing: '8px',
          textShadow: '0 0 40px var(--red)',
          marginBottom: '16px',
        }}>
          THREAT DETECTED
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '8px',
        }}>
          {criticalEvent.attack_cat} · {criticalEvent.user} · {criticalEvent.location}
        </div>

        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '16px',
          color: 'var(--text-primary)',
          maxWidth: '500px',
          marginBottom: '32px',
        }}>
          {criticalEvent.explanation}
        </div>

        <button onClick={clearThreat} style={{
          background: 'transparent',
          border: '1px solid var(--text-dim)',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          padding: '8px 24px',
          borderRadius: '4px',
          cursor: 'pointer',
          letterSpacing: '2px',
        }}>
          ACKNOWLEDGE
        </button>
      </div>
    </div>
  )
}