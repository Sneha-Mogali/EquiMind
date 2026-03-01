import { useState, useEffect, useRef } from 'react'
import { Panel } from './ui/Panel'
import { useSentinel } from '../store/sentinel'
import { Globe, Users, Shield, AlertTriangle } from 'lucide-react'

export function OrganizationChart() {
  const entities = useSentinel(s => s.entities)
  const events = useSentinel(s => s.events)
  const [currentTime, setCurrentTime] = useState(new Date())
  const canvasRef = useRef(null)
  const [selectedEntity, setSelectedEntity] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Indian names for entities
  const indianNames = ['Arjun', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Ananya', 'Karthik', 'Meera', 'Rohan', 'Kavya', 'Sanjay', 'Deepika', 'Amit', 'Pooja', 'Ravi']
  
  const getIndianName = (name) => {
    if (name && name.includes('user')) {
      const index = parseInt(name.replace('user', '')) || 0
      return indianNames[index % indianNames.length] || name
    }
    return name
  }

  // Get recent events for each entity
  const getEntityEvents = (entityName) => {
    return events.filter(e => e.user === entityName).slice(0, 5)
  }

  // Get entity risk level
  const getEntityRiskLevel = (entity) => {
    const riskScore = entity.risk_score || entity.base_risk || 0
    if (riskScore >= 80) return 'CRITICAL'
    if (riskScore >= 60) return 'HIGH'
    if (riskScore >= 40) return 'MEDIUM'
    return 'LOW'
  }

  const getRiskColor = (riskLevel) => {
    const colors = {
      'CRITICAL': 'var(--red)',
      'HIGH': 'var(--red)',
      'MEDIUM': 'var(--amber)',
      'LOW': 'var(--green)'
    }
    return colors[riskLevel] || 'var(--green)'
  }

  // Organize entities by department
  const organizeByDepartment = () => {
    const departments = {}
    entities.forEach(entity => {
      const dept = entity.department || 'Unknown'
      if (!departments[dept]) {
        departments[dept] = []
      }
      departments[dept].push(entity)
    })
    return departments
  }

  const departmentData = organizeByDepartment()

  // Calculate department risk
  const getDepartmentRisk = (deptEntities) => {
    if (deptEntities.length === 0) return 0
    const totalRisk = deptEntities.reduce((sum, entity) => sum + (entity.risk_score || entity.base_risk || 0), 0)
    return Math.round(totalRisk / deptEntities.length)
  }

  useEffect(() => {
    if (canvasRef.current && Object.keys(departmentData).length > 0) {
      drawOrganizationChart()
    }
  }, [entities, events])

  const drawOrganizationChart = () => {
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
    
    const departments = Object.keys(departmentData)
    const deptCount = departments.length
    
    if (deptCount === 0) return
    
    const positions = {}
    
    // Calculate department positions in a grid
    const cols = Math.ceil(Math.sqrt(deptCount))
    const rows = Math.ceil(deptCount / cols)
    const deptWidth = width / cols
    const deptHeight = height / rows
    
    departments.forEach((dept, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = col * deptWidth + deptWidth / 2
      const y = row * deptHeight + deptHeight / 2
      
      const deptEntities = departmentData[dept]
      const deptRisk = getDepartmentRisk(deptEntities)
      const riskLevel = deptRisk >= 80 ? 'CRITICAL' : deptRisk >= 60 ? 'HIGH' : deptRisk >= 40 ? 'MEDIUM' : 'LOW'
      
      // Draw department container
      ctx.beginPath()
      // Use a manual rounded rectangle implementation for better browser compatibility
      const x1 = x - deptWidth/2 + 10
      const y1 = y - deptHeight/2 + 10
      const width = deptWidth - 20
      const height = deptHeight - 20
      const radius = 8
      
      ctx.moveTo(x1 + radius, y1)
      ctx.lineTo(x1 + width - radius, y1)
      ctx.quadraticCurveTo(x1 + width, y1, x1 + width, y1 + radius)
      ctx.lineTo(x1 + width, y1 + height - radius)
      ctx.quadraticCurveTo(x1 + width, y1 + height, x1 + width - radius, y1 + height)
      ctx.lineTo(x1 + radius, y1 + height)
      ctx.quadraticCurveTo(x1, y1 + height, x1, y1 + height - radius)
      ctx.lineTo(x1, y1 + radius)
      ctx.quadraticCurveTo(x1, y1, x1 + radius, y1)
      ctx.closePath()
      
      ctx.strokeStyle = getRiskColor(riskLevel)
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Fill with subtle background
      ctx.fillStyle = `${getRiskColor(riskLevel)}11`
      ctx.fill()
      
      // Department title
      ctx.fillStyle = getRiskColor(riskLevel)
      ctx.font = 'bold 12px var(--font-mono)'
      ctx.textAlign = 'center'
      ctx.fillText(dept.toUpperCase(), x, y - deptHeight/2 + 30)
      
      // Department risk score
      ctx.font = 'bold 16px var(--font-display)'
      ctx.fillText(`${deptRisk}%`, x, y - deptHeight/2 + 50)
      
      // Draw entities within department
      const entityRadius = 15
      const entitiesPerRow = Math.floor((deptWidth - 40) / (entityRadius * 2 + 5))
      
      deptEntities.forEach((entity, entityIndex) => {
        const entityCol = entityIndex % entitiesPerRow
        const entityRow = Math.floor(entityIndex / entitiesPerRow)
        const entityX = x - (entitiesPerRow * (entityRadius * 2 + 5)) / 2 + entityCol * (entityRadius * 2 + 5) + entityRadius
        const entityY = y - deptHeight/2 + 80 + entityRow * (entityRadius * 2 + 10)
        
        if (entityY > y + deptHeight/2 - 20) return // Skip if outside department bounds
        
        const entityRisk = entity.risk_score || entity.base_risk || 0
        const entityRiskLevel = getEntityRiskLevel(entity)
        
        // Store position for click detection
        positions[entity.name] = { x: entityX, y: entityY, radius: entityRadius }
        
        // Draw entity circle
        ctx.beginPath()
        ctx.arc(entityX, entityY, entityRadius, 0, 2 * Math.PI)
        
        // Entity background color based on risk
        ctx.fillStyle = getRiskColor(entityRiskLevel)
        ctx.fill()
        
        // Entity border
        ctx.beginPath()
        ctx.arc(entityX, entityY, entityRadius, 0, 2 * Math.PI)
        ctx.strokeStyle = selectedEntity?.name === entity.name ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth = selectedEntity?.name === entity.name ? 2 : 1
        ctx.stroke()
        
        // Honeypot indicator
        if (entity.honeypot) {
          ctx.beginPath()
          ctx.arc(entityX + entityRadius - 5, entityY - entityRadius + 5, 4, 0, 2 * Math.PI)
          ctx.fillStyle = '#f97316'
          ctx.fill()
        }
        
        // Entity name
        ctx.fillStyle = '#ffffff'
        ctx.font = '8px var(--font-mono)'
        ctx.textAlign = 'center'
        const displayName = getIndianName(entity.name)
        ctx.fillText(displayName.substring(0, 6), entityX, entityY + 2)
        
        // Risk score below entity
        ctx.font = '7px var(--font-mono)'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.fillText(`${Math.round(entityRisk)}%`, entityX, entityY + entityRadius + 12)
      })
    })
    
    // Store positions for click detection
    canvas.positions = positions
  }

  const handleCanvasClick = (event) => {
    if (!canvasRef.current?.positions) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const positions = canvasRef.current.positions
    
    // Find clicked entity
    for (const [entityName, pos] of Object.entries(positions)) {
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      if (distance <= pos.radius + 5) {
        const entity = entities.find(e => e.name === entityName)
        setSelectedEntity(entity)
        return
      }
    }
    
    setSelectedEntity(null)
  }

  return (
    <Panel 
      title="ORGANIZATION SECURITY MAP" 
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Globe size={10} color="var(--cyan)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--cyan)' }}>
              GMT {currentTime.toISOString().slice(11, 19)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={10} color="var(--green)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--green)' }}>
              {entities.length} ENTITIES
            </span>
          </div>
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
          
          {/* Department Summary */}
          <div>
            <div style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '9px', 
              color: 'var(--text-dim)', 
              marginBottom: '6px',
              letterSpacing: '1px'
            }}>
              DEPARTMENTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(departmentData).map(([dept, deptEntities]) => {
                const deptRisk = getDepartmentRisk(deptEntities)
                const riskLevel = deptRisk >= 80 ? 'CRITICAL' : deptRisk >= 60 ? 'HIGH' : deptRisk >= 40 ? 'MEDIUM' : 'LOW'
                
                return (
                  <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '9px', 
                      color: 'var(--text-secondary)'
                    }}>
                      {dept}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '9px', 
                        color: getRiskColor(riskLevel),
                        fontWeight: 600
                      }}>
                        {deptRisk}%
                      </span>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '8px', 
                        color: 'var(--text-dim)'
                      }}>
                        ({deptEntities.length})
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Selected Entity Info */}
          {selectedEntity && (
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
                {getIndianName(selectedEntity.name)}
              </div>
              
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-dim)',
                marginBottom: '2px'
              }}>
                Risk: {Math.round(selectedEntity.risk_score || selectedEntity.base_risk || 0)}%
              </div>
              
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-dim)',
                marginBottom: '2px'
              }}>
                Role: {selectedEntity.role}
              </div>
              
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-dim)',
                marginBottom: '6px'
              }}>
                Dept: {selectedEntity.department}
              </div>
              
              {selectedEntity.honeypot && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--amber)',
                  fontWeight: 600
                }}>
                  HONEYPOT ACTIVE
                </div>
              )}
              
              {/* Recent Events */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '8px', 
                  color: 'var(--text-dim)', 
                  marginBottom: '4px'
                }}>
                  RECENT EVENTS:
                </div>
                {getEntityEvents(selectedEntity.name).slice(0, 3).map((event, index) => (
                  <div key={event.id} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: event.severity === 'CRITICAL' ? 'var(--red)' : 
                           event.severity === 'HIGH' ? 'var(--amber)' : 'var(--text-dim)',
                    marginBottom: '2px'
                  }}>
                    • {event.attack_cat} ({event.risk_score}%)
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getRiskColor(level)
                  }} />
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '8px', 
                    color: 'var(--text-secondary)'
                  }}>
                    {level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}