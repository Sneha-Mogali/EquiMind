import { useState, useEffect } from 'react'
import { useSentinel } from '../store/sentinel'
import { useNavigate, useLocation } from 'react-router-dom'

const PAGES = [
  { path: '/',            label: 'MISSION CONTROL' },
  { path: '/entities',    label: 'ENTITIES' },
  { path: '/threat',      label: 'THREAT INTEL' },
  { path: '/policy',      label: 'POLICY STUDIO' },
  { path: '/analytics',   label: 'ANALYTICS' },
  { path: '/monitoring',  label: 'MONITORING' },
  { path: '/processor',   label: 'DATA PROCESSOR' },
  { path: '/model',       label: 'MODEL ANALYSIS' },
  { path: '/security',    label: 'SECURITY ACTIONS' },
  { path: '/autonomous',  label: 'AUTONOMOUS ACTIONS' },
  { path: '/portal',      label: 'USER PORTAL' },
]

export function TopBar() {
  const [time, setTime] = useState(new Date())
  const status = useSentinel(s => s.status)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      height: '56px',
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border-base)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '32px',
      flexShrink: 0,
    }}>
      {/* Wordmark */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '18px',
        fontWeight: 900,
        color: 'var(--cyan)',
        letterSpacing: '4px',
        textShadow: '0 0 20px var(--cyan)',
        minWidth: 'fit-content',
      }}>
        SENTINEL
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        {PAGES.map(p => (
          <button key={p.path} onClick={() => navigate(p.path)} style={{
            background: location.pathname === p.path ? 'var(--cyan-glow)' : 'transparent',
            border: location.pathname === p.path ? '1px solid var(--cyan-dim)' : '1px solid transparent',
            color: location.pathname === p.path ? 'var(--cyan)' : 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '1.5px',
            padding: '6px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', minWidth: 'fit-content' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)', animation: 'data-blink 2s infinite' }}>
          ● LIVE
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
          {time.toUTCString().slice(0, 25)}
        </span>
        {status && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)' }}>
            {status.latency || 42}ms
          </span>
        )}
      </div>
    </div>
  )
}