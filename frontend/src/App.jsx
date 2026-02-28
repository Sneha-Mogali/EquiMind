import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useWebSocket } from './hooks/useWebSocket'
import { useSentinel } from './store/sentinel'
import { TopBar } from './components/TopBar'
import { Ticker } from './components/Ticker'
import { BreachOverlay } from './components/BreachOverlay'
import { MissionControl } from './pages/MissionControl'
import { EntityInspector } from './pages/EntityInspector'
import { ThreatInvestigation } from './pages/ThreatInvestigation'
import { PolicyStudio } from './pages/PolicyStudio'
import { Analytics } from './pages/Analytics'
import { UserPortal } from './pages/UserPortal'
import './styles/globals.css'

function AppInner() {
  useWebSocket()
  const threatState = useSentinel(s => s.threatState)

  return (
    <div className={threatState ? 'threat-state-bg' : ''} style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      transition: 'background 0.5s',
    }}>
      <div className="scanline" />
      <BreachOverlay />
      <TopBar />
      <Ticker />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/"          element={<MissionControl />} />
          <Route path="/entities"  element={<EntityInspector />} />
          <Route path="/threat"    element={<ThreatInvestigation />} />
          <Route path="/policy"    element={<PolicyStudio />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/portal"    element={<UserPortal />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}