import { useState, useEffect } from 'react'
import { Panel } from '../components/ui/Panel'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, Cell } from 'recharts'
import { Brain, Database, Layers, TrendingUp, Eye, Download } from 'lucide-react'

export function ModelAnalysis() {
  const [modelWeights, setModelWeights] = useState(null)
  const [rawData, setRawData] = useState([])
  const [shapData, setShapData] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchModelWeights()
    fetchRawData()
  }, [])

  const fetchModelWeights = async () => {
    try {
      const response = await fetch('http://localhost:8000/model/weights')
      const data = await response.json()
      setModelWeights(data)
    } catch (error) {
      console.error('Failed to fetch model weights:', error)
    }
  }

  const fetchRawData = async () => {
    try {
      const response = await fetch('http://localhost:8000/data/raw?limit=50')
      const data = await response.json()
      setRawData(data.events || [])
    } catch (error) {
      console.error('Failed to fetch raw data:', error)
    }
  }

  const explainEvent = async (event) => {
    if (!event.network_data) return
    
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/predict/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.network_data)
      })
      const data = await response.json()
      setShapData(data.explanation)
      setSelectedEvent(event)
    } catch (error) {
      console.error('Failed to get SHAP explanation:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadRawData = () => {
    const dataStr = JSON.stringify(rawData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `equimind_raw_data_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Prepare SHAP visualization data
  const shapChartData = shapData ? 
    shapData.feature_names.map((name, i) => ({
      feature: name.length > 15 ? name.substring(0, 15) + '...' : name,
      fullName: name,
      value: shapData.shap_values[i],
      absValue: Math.abs(shapData.shap_values[i])
    })).sort((a, b) => b.absValue - a.absValue).slice(0, 10) : []

  // Prepare model layer data for visualization
  const layerData = modelWeights?.layers?.map((layer, i) => ({
    name: layer.name.length > 20 ? layer.name.substring(0, 20) + '...' : layer.name,
    fullName: layer.name,
    parameters: layer.parameters,
    type: layer.type
  })) || []

  return (
    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto', gap: '12px', height: '100%', overflowY: 'auto' }}>

      {/* Model Architecture Overview */}
      <Panel title="MODEL ARCHITECTURE" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '16px' }}>
          {modelWeights && [
            { label: 'TOTAL LAYERS', value: modelWeights.layers?.length || 0, color: 'var(--cyan)', icon: <Layers size={20} /> },
            { label: 'PARAMETERS', value: modelWeights.total_parameters?.toLocaleString() || '0', color: 'var(--green)', icon: <Brain size={20} /> },
            { label: 'TRAINABLE', value: modelWeights.trainable_parameters?.toLocaleString() || '0', color: 'var(--amber)', icon: <TrendingUp size={20} /> },
            { label: 'DATA SOURCE', value: modelWeights.source || 'unknown', color: 'var(--text-dim)', icon: <Database size={20} /> }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: stat.color }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Layer Parameters Chart */}
        {layerData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={layerData}>
              <XAxis 
                dataKey="name" 
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--bg-elevated)', 
                  border: '1px solid var(--border-base)', 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '11px' 
                }}
                formatter={(value, name, props) => [
                  `${value.toLocaleString()} parameters`,
                  `${props.payload.fullName} (${props.payload.type})`
                ]}
              />
              <Bar dataKey="parameters" fill="var(--cyan)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Raw Data Table */}
      <Panel title="RAW EVENT DATA">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            Last {rawData.length} events with full network features
          </div>
          <button
            onClick={downloadRawData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--green)',
              border: 'none',
              borderRadius: '4px',
              color: '#000',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
            <Download size={14} />
            EXPORT JSON
          </button>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
          }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border-base)' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600 }}>USER</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600 }}>RISK</th>
                <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600 }}>PROTO</th>
                <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600 }}>SERVICE</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600 }}>BYTES</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600 }}>PKTS</th>
                <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 600 }}>EXPLAIN</th>
              </tr>
            </thead>
            <tbody>
              {rawData.slice(0, 20).map((event, index) => (
                <tr key={event.id || index} style={{
                  borderBottom: '1px solid var(--border-base)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '8px', color: 'var(--text-primary)' }}>
                    {event.user?.substring(0, 12) || '—'}
                  </td>
                  <td style={{ 
                    padding: '8px', 
                    textAlign: 'right',
                    color: event.risk_score >= 70 ? 'var(--red)' : 
                           event.risk_score >= 50 ? 'var(--amber)' : 'var(--green)',
                    fontWeight: 600
                  }}>
                    {event.risk_score || 0}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                    {event.network_data?.proto || '—'}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                    {event.network_data?.service || '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {event.network_data?.sbytes ? `${(event.network_data.sbytes / 1024).toFixed(1)}K` : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {event.network_data?.spkts || '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button
                      onClick={() => explainEvent(event)}
                      disabled={loading || !event.network_data}
                      style={{
                        padding: '4px 8px',
                        background: event.network_data ? 'var(--cyan)' : 'var(--bg-panel)',
                        border: 'none',
                        borderRadius: '3px',
                        color: event.network_data ? '#000' : 'var(--text-dim)',
                        fontSize: '9px',
                        cursor: event.network_data ? 'pointer' : 'not-allowed',
                        opacity: event.network_data ? 1 : 0.5
                      }}>
                      <Eye size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* SHAP Feature Importance */}
      <Panel title="FEATURE IMPORTANCE (SHAP)">
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              Analyzing feature importance...
            </div>
          </div>
        )}

        {!loading && !shapData && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <Eye size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              Select an event to see SHAP explanation
            </div>
          </div>
        )}

        {!loading && shapData && (
          <div>
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              background: 'var(--bg-elevated)', 
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                  PREDICTION: {(shapData.prediction * 100).toFixed(1)}% | BASE: {(shapData.base_value * 100).toFixed(1)}%
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                  Source: {shapData.source} | Event: {selectedEvent?.user}
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={shapChartData} layout="vertical">
                <XAxis 
                  type="number" 
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="feature" 
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-base)', 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '11px' 
                  }}
                  formatter={(value, name, props) => [
                    `Impact: ${value.toFixed(4)}`,
                    props.payload.fullName
                  ]}
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 3, 3, 0]}
                />
                {shapChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value > 0 ? 'var(--red)' : 'var(--green)'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

    </div>
  )
}