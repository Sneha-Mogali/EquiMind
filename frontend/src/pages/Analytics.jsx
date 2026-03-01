import { useState, useEffect } from 'react'
import { useSentinel } from '../store/sentinel'
import { Panel } from '../components/ui/Panel'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Activity, Shield, AlertTriangle } from 'lucide-react'

const ATTACK_COLORS = {
  Normal: 'var(--green)', Exploits: 'var(--red)', DoS: 'var(--red)',
  Recon: 'var(--amber)', Fuzzers: 'var(--amber)', Backdoors: 'var(--red)', Generic: 'var(--cyan)',
  Probe: 'var(--amber)', 'U2R': 'var(--red)', 'R2L': 'var(--red)'
}

export function Analytics() {
  const events = useSentinel(s => s.events)
  const [realTimeStats, setRealTimeStats] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchRealTimeStats()
    const interval = setInterval(fetchRealTimeStats, 10000) // Update every 10 seconds for graphs
    return () => clearInterval(interval)
  }, [])

  const fetchRealTimeStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/simulation/stats')
      const data = await response.json()
      setRealTimeStats(data)
    } catch (error) {
      console.error('Failed to fetch real-time stats:', error)
    }
  }

  // Attack category distribution with real-time data
  const catCounts = realTimeStats?.attack_distribution || events.reduce((acc, e) => {
    acc[e.attack_cat] = (acc[e.attack_cat] || 0) + 1
    return acc
  }, {})
  const catData = Object.entries(catCounts).map(([name, value]) => ({ name, value }))

  // Decision distribution with real-time data
  const decCounts = realTimeStats?.decision_distribution || events.reduce((acc, e) => {
    acc[e.decision] = (acc[e.decision] || 0) + 1
    return acc
  }, {})
  const decData = Object.entries(decCounts).map(([name, value]) => ({ name, value }))

  // Risk over time (last 20 events) with timestamps
  const timeData = events.slice(0, 20).reverse().map((e, i) => ({
    i, 
    score: e.risk_score, 
    user: e.user,
    timestamp: new Date(e.timestamp).toLocaleTimeString(),
    attack: e.attack_cat
  }))

  // Top risky users with real numbers
  const userRisk = events.reduce((acc, e) => {
    if (!acc[e.user]) acc[e.user] = { total: 0, count: 0, maxRisk: 0, lastSeen: e.timestamp }
    acc[e.user].total += e.risk_score
    acc[e.user].count += 1
    acc[e.user].maxRisk = Math.max(acc[e.user].maxRisk, e.risk_score)
    if (new Date(e.timestamp) > new Date(acc[e.user].lastSeen)) {
      acc[e.user].lastSeen = e.timestamp
    }
    return acc
  }, {})
  
  const topUsers = Object.entries(userRisk)
    .map(([name, d]) => ({ 
      name, 
      avg: Math.round(d.total / d.count),
      max: d.maxRisk,
      events: d.count,
      lastSeen: new Date(d.lastSeen).toLocaleTimeString()
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6)

  const blocked = realTimeStats?.decision_distribution?.BLOCK || events.filter(e => e.decision === 'BLOCK').length
  const challenged = realTimeStats?.decision_distribution?.CHALLENGE || events.filter(e => e.decision === 'CHALLENGE').length
  const totalEvents = realTimeStats?.total_events || events.length
  const avgRisk = realTimeStats?.avg_risk_score || Math.round(events.reduce((s,e) => s + e.risk_score, 0) / (events.length || 1))
  const avgCost = 4900000
  const prevented = Math.round(blocked * avgCost / 10000)

  // Custom tooltip for enhanced explainability
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-base)',
          borderRadius: '4px',
          padding: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px'
        }}>
          <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
            <strong>{data.name || data.user || `Event ${label}`}</strong>
          </div>
          {data.score && (
            <div style={{ color: 'var(--red)' }}>Risk Score: {data.score}%</div>
          )}
          {data.value && (
            <div style={{ color: 'var(--cyan)' }}>Count: {data.value}</div>
          )}
          {data.avg && (
            <div style={{ color: 'var(--amber)' }}>Avg Risk: {data.avg}%</div>
          )}
          {data.max && (
            <div style={{ color: 'var(--red)' }}>Max Risk: {data.max}%</div>
          )}
          {data.events && (
            <div style={{ color: 'var(--text-dim)' }}>Events: {data.events}</div>
          )}
          {data.timestamp && (
            <div style={{ color: 'var(--text-dim)' }}>Time: {data.timestamp}</div>
          )}
          {data.attack && (
            <div style={{ color: 'var(--text-dim)' }}>Attack: {data.attack}</div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto', gap: '12px', height: '100%', overflowY: 'auto' }}>

      {/* Real-time Status Header */}
      <Panel 
        title="REAL-TIME SECURITY ANALYTICS" 
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={12} color="var(--green)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--green)' }}>
              LIVE • {currentTime.toLocaleTimeString()}
            </span>
          </div>
        }
        style={{ gridColumn: '1 / -1' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {[
            { 
              label: 'TOTAL EVENTS', 
              value: totalEvents.toLocaleString(), 
              color: 'var(--cyan)',
              icon: <TrendingUp size={16} />,
              subtitle: `Database: ${realTimeStats?.database_mode || 'fallback'}`
            },
            { 
              label: 'THREATS BLOCKED', 
              value: blocked, 
              color: 'var(--red)',
              icon: <Shield size={16} />,
              subtitle: `+${challenged} challenged`
            },
            { 
              label: 'EST. COST PREVENTED', 
              value: `$${prevented.toLocaleString()}K`, 
              color: 'var(--green)',
              icon: <Shield size={16} />,
              subtitle: `@$${(avgCost/1000000).toFixed(1)}M avg`
            },
            { 
              label: 'AVG RISK SCORE', 
              value: `${avgRisk}%`, 
              color: avgRisk >= 70 ? 'var(--red)' : avgRisk >= 50 ? 'var(--amber)' : 'var(--green)',
              icon: <AlertTriangle size={16} />,
              subtitle: `${realTimeStats?.high_risk_entities || 0} high-risk entities`
            },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: s.color }}>
                {s.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>
                {s.subtitle}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Risk over time with enhanced data */}
      <Panel title="RISK SCORE TREND (LIVE)">
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
            Last 20 Events • Real-time Feed
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)' }}>
            Peak: {Math.max(...timeData.map(d => d.score))}%
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={timeData}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff1744" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff1744" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="i" 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: 'var(--text-dim)' }}
              tickFormatter={(value) => `E${value + 1}`}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="score" stroke="var(--red)" fill="url(#riskGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      {/* Attack categories with real numbers */}
      <Panel title="ATTACK CATEGORIES (LIVE DATA)">
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
            Distribution by Type
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)' }}>
            {Object.keys(catCounts).length} Types
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie 
              data={catData} 
              cx="50%" 
              cy="50%" 
              innerRadius={40} 
              outerRadius={80} 
              dataKey="value" 
              label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
              labelLine={false}
            >
              {catData.map((entry, i) => (
                <Cell key={i} fill={ATTACK_COLORS[entry.name] || 'var(--cyan)'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </Panel>

      {/* Top risky users with detailed info */}
      <Panel title="TOP RISK ENTITIES (DETAILED)">
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
            Ranked by Average Risk
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--red)' }}>
            Threshold: 60%+
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={topUsers} layout="vertical">
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }} 
              width={80} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avg" fill="var(--red)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Decision distribution with explanations */}
      <Panel title="SECURITY DECISIONS (EXPLAINED)">
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
            ML + Policy Engine Results
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--green)' }}>
            {((decCounts.ALLOW || 0) / totalEvents * 100).toFixed(1)}% Allowed
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={decData}>
            <XAxis 
              dataKey="name" 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}
            />
            <YAxis 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {decData.map((entry, i) => (
                <Cell key={i} fill={
                  entry.name === 'ALLOW' ? 'var(--green)' :
                  entry.name === 'CHALLENGE' ? 'var(--amber)' : 
                  entry.name === 'MONITOR' ? 'var(--cyan)' : 'var(--red)'
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

    </div>
  )
}