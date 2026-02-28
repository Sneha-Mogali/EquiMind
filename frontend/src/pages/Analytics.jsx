import { useSentinel } from '../store/sentinel'
import { Panel } from '../components/ui/Panel'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const ATTACK_COLORS = {
  Normal: 'var(--green)', Exploits: 'var(--red)', DoS: 'var(--red)',
  Recon: 'var(--amber)', Fuzzers: 'var(--amber)', Backdoors: 'var(--red)', Generic: 'var(--cyan)',
}

export function Analytics() {
  const events = useSentinel(s => s.events)

  // Attack category distribution
  const catCounts = events.reduce((acc, e) => {
    acc[e.attack_cat] = (acc[e.attack_cat] || 0) + 1
    return acc
  }, {})
  const catData = Object.entries(catCounts).map(([name, value]) => ({ name, value }))

  // Decision distribution
  const decCounts = events.reduce((acc, e) => {
    acc[e.decision] = (acc[e.decision] || 0) + 1
    return acc
  }, {})
  const decData = Object.entries(decCounts).map(([name, value]) => ({ name, value }))

  // Risk over time (last 20 events)
  const timeData = events.slice(0, 20).reverse().map((e, i) => ({
    i, score: e.risk_score, user: e.user,
  }))

  // Top risky users
  const userRisk = events.reduce((acc, e) => {
    if (!acc[e.user]) acc[e.user] = { total: 0, count: 0 }
    acc[e.user].total += e.risk_score
    acc[e.user].count += 1
    return acc
  }, {})
  const topUsers = Object.entries(userRisk)
    .map(([name, d]) => ({ name, avg: Math.round(d.total / d.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6)

  const blocked = events.filter(e => e.decision === 'BLOCK').length
  const avgCost = 4900000
  const prevented = Math.round(blocked * avgCost / 10000)

  return (
    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto', gap: '12px', height: '100%', overflowY: 'auto' }}>

      {/* Cost savings */}
      <Panel title="BREACH PREVENTION VALUE" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {[
            { label: 'EVENTS ANALYZED',    value: events.length,                         color: 'var(--cyan)'  },
            { label: 'THREATS BLOCKED',    value: blocked,                               color: 'var(--red)'   },
            { label: 'EST. COST PREVENTED', value: `$${prevented.toLocaleString()}`,     color: 'var(--green)' },
            { label: 'AVG RISK SCORE',     value: Math.round(events.reduce((s,e) => s + e.risk_score, 0) / (events.length || 1)), color: 'var(--amber)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Risk over time */}
      <Panel title="RISK SCORE TREND">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={timeData}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff1744" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff1744" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontSize: '11px' }} />
            <Area type="monotone" dataKey="score" stroke="var(--red)" fill="url(#riskGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      {/* Attack categories */}
      <Panel title="ATTACK CATEGORIES">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
              {catData.map((entry, i) => (
                <Cell key={i} fill={ATTACK_COLORS[entry.name] || 'var(--cyan)'} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </Panel>

      {/* Top risky users */}
      <Panel title="TOP RISK ENTITIES">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={topUsers} layout="vertical">
            <XAxis type="number" domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }} />
            <YAxis type="category" dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }} width={80} />
            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontSize: '11px' }} />
            <Bar dataKey="avg" fill="var(--red)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Decision distribution */}
      <Panel title="DECISION DISTRIBUTION">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={decData}>
            <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }} />
            <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontSize: '11px' }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {decData.map((entry, i) => (
                <Cell key={i} fill={
                  entry.name === 'ALLOW' ? 'var(--green)' :
                  entry.name === 'CHALLENGE' ? 'var(--amber)' : 'var(--red)'
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

    </div>
  )
}