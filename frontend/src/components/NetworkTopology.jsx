import { useState, useEffect, useRef } from 'react'
import { Panel } from './ui/Panel'
import { apiService } from '../store/sentinel'
import { Globe } from 'lucide-react'

export function NetworkTopology() {
  const [topology, setTopology] = useState(null)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Indian names for entities
  const indianNames = ['Arjun', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Ananya', 'Karthik', 'Meera', 'Rohan', 'Kavya', 'Sanjay', 'Deepika', 'Amit', 'Pooja', 'Ravi']
  
  const getIndianName = (label) => {
    if (label && label.includes('user')) {
      const index = parseInt(label.replace('user', '')) || 0
      return indianNames[index % indianNames.length] || label
    }
    return label
  }

  useEffect(() => {
    fetchTopology()
    const interval = setInterval(fetchTopology, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchTopology = async () => {
    try {
      const data = await apiService.fetchWithRetry('/network/topology')
      setTopology(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch network topology:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (topology && canvasRef.current) {
      drawNetwork()
    }
  }, [topology])

  const drawNetwork = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    
    const width = rect.width
    const height = rect.height
    
    // Clear canvas
    ctx.fillStyle = 'var(--bg-panel)'
    ctx.fillRect(0, 0, width, height)
    
    if (!topology) return

    const { nodes, edges } = topology
    
    // Position nodes
    const positions = {}
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.3
    
    // Position server at center
    const serverNode = nodes.find(n => n.type === 'server')
    if (serverNode) {
      positions[serverNode.id] = { x: centerX, y: centerY }
    }
    
    // Position users in circles around server
    const userNodes = nodes.filter(n => n.type === 'user')
    userNodes.forEach((node, index) => {
      const angle = (index / userNodes.length) * 2 * Math.PI
      positions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      }
    })
    
    // Draw edges first
    edges.forEach(edge => {
      const fromPos = positions[edge.from]
      const toPos = positions[edge.to]
      
      if (fromPos && toPos) {
        ctx.beginPath()
        ctx.moveTo(fromPos.x, fromPos.y)
        ctx.lineTo(toPos.x, toPos.y)
        
        // Color based on risk level
        const colors = {
          low: 'rgba(34, 197, 94, 0.3)',
          medium: 'rgba(245, 158, 11, 0.4)',
          high: 'rgba(239, 68, 68, 0.5)',
          critical: 'rgba(220, 38, 127, 0.6)'
        }
        
        ctx.strokeStyle = colors[edge.risk_level] || colors.low
        ctx.lineWidth = edge.type === 'connection' ? 2 : 1
        ctx.stroke()
      }
    })
    
    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id]
      if (!pos) return
      
      const isSelected = selectedNode?.id === node.id
      const nodeRadius = node.type === 'server' ? 20 : 12
      
      // Node background
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeRadius + (isSelected ? 4 : 0), 0, 2 * Math.PI)
      
      if (node.type === 'server') {
        ctx.fillStyle = '#1e40af'
      } else {
        const colors = {
          low: '#22c55e',
          medium: '#f59e0b', 
          high: '#ef4444',
          critical: '#dc2626'
        }
        ctx.fillStyle = colors[node.risk_level] || colors.low
        
        // Honeypot indicator
        if (node.honeypot) {
          ctx.fillStyle = '#f97316' // Orange for honeypot
        }
      }
      
      ctx.fill()
      
      // Node border
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeRadius + (isSelected ? 4 : 0), 0, 2 * Math.PI)
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.stroke()
      
      // Node icon/text
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px var(--font-mono)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      if (node.type === 'server') {
        ctx.fillText('SRV', pos.x, pos.y)
      } else {
        const displayName = getIndianName(node.label)
        ctx.fillText(displayName.substring(0, 3).toUpperCase(), pos.x, pos.y)
      }
      
      // Risk score for users
      if (node.type === 'user') {
        ctx.font = '8px var(--font-mono)'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.fillText(node.risk_score.toString(), pos.x, pos.y + nodeRadius + 12)
      }
    })
    
    // Store positions for click detection
    canvas.positions = positions
  }

  const handleCanvasClick = (event) => {
    if (!topology || !canvasRef.current.positions) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const positions = canvasRef.current.positions
    
    // Find clicked node
    for (const node of topology.nodes) {
      const pos = positions[node.id]
      if (pos) {
        const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
        const radius = node.type === 'server' ? 20 : 12
        
        if (distance <= radius + 4) {
          setSelectedNode(node)
          return
        }
      }
    }
    
    setSelectedNode(null)
  }

  const getRiskColor = (riskLevel) => {
    const colors = {
      low: 'var(--green)',
      medium: 'var(--amber)',
      high: 'var(--red)',
      critical: 'var(--red)'
    }
    return colors[riskLevel] || colors.low
  }

  if (loading) {
    return (
      <Panel title="NETWORK TOPOLOGY" style={{ height: '400px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: 'var(--text-dim)'
        }}>
          Loading network topology...
        </div>
      </Panel>
    )
  }

  return (
    <Panel 
      title="NETWORK TOPOLOGY" 
      action={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Globe size={10} color="var(--cyan)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--cyan)' }}>
              GMT {currentTime.toISOString().slice(11, 19)}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
            {topology?.total_entities} entities
          </span>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--green)',
            animation: 'pulse 2s infinite'
          }} />
        </div>
      }
      style={{ height: '400px', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', flex: 1, gap: '12px' }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              borderRadius: '4px',
              border: '1px solid var(--border-base)'
            }}
          />
        </div>
        
        {/* Info Panel */}
        <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Legend */}
          <div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '9px', 
              color: 'var(--text-dim)', 
              marginBottom: '6px',
              letterSpacing: '1px'
            }}>
              RISK LEVELS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {['low', 'medium', 'high', 'critical'].map(level => (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getRiskColor(level)
                  }} />
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '10px', 
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase'
                  }}>
                    {level}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Selected Node Info */}
          {selectedNode && (
            <div style={{
              padding: '8px',
              background: 'var(--bg-elevated)',
              borderRadius: '4px',
              border: '1px solid var(--border-base)'
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>
                {getIndianName(selectedNode.label)}
              </div>
              {selectedNode.type === 'user' && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--text-dim)',
                    marginBottom: '2px'
                  }}>
                    Risk: {selectedNode.risk_score}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--text-dim)',
                    marginBottom: '2px'
                  }}>
                    Dept: {selectedNode.department}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: selectedNode.honeypot ? 'var(--amber)' : 'var(--text-dim)'
                  }}>
                    Status: {selectedNode.honeypot ? 'HONEYPOT' : selectedNode.status?.toUpperCase()}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Stats */}
          <div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '9px', 
              color: 'var(--text-dim)', 
              marginBottom: '6px',
              letterSpacing: '1px'
            }}>
              NETWORK STATS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                  Total:
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)' }}>
                  {topology?.total_entities}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                  High Risk:
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--red)' }}>
                  {topology?.high_risk_entities}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                  Honeypots:
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--amber)' }}>
                  {topology?.honeypot_entities}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}