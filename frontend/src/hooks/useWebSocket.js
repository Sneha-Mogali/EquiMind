import { useEffect, useRef } from 'react'
import { useSentinel, apiService } from '../store/sentinel'

export function useWebSocket() {
  const ws = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const isConnectingRef = useRef(false)
  const addEvent = useSentinel(s => s.addEvent)
  const setEntities = useSentinel(s => s.setEntities)
  const setStatus = useSentinel(s => s.setStatus)
  const setModelHealth = useSentinel(s => s.setModelHealth)
  const setSimulationStats = useSentinel(s => s.setSimulationStats)

  useEffect(() => {
    // Fetch initial data with enhanced error handling
    const fetchInitialData = async () => {
      try {
        console.log('🔄 Fetching initial data from EquiMind Risk Engine...')
        
        // Fetch entities
        const entities = await apiService.getEntities()
        setEntities(entities)
        console.log(`Loaded ${entities.length} entities`)

        // Fetch status
        const status = await apiService.getStatus()
        setStatus(status)
        console.log(`System status: ${status.status}`)

        // Fetch model health
        try {
          const modelHealth = await apiService.getModelHealth()
          setModelHealth(modelHealth)
          console.log(`Model health loaded`)
        } catch (error) {
          console.warn('WARNING: Model health not available:', error.message)
        }

        // Fetch simulation stats
        try {
          const simStats = await apiService.getSimulationStats()
          setSimulationStats(simStats)
          console.log(`Simulation stats: ${simStats.total_samples} samples`)
        } catch (error) {
          console.warn('WARNING: Simulation stats not available:', error.message)
        }

      } catch (error) {
        console.error('❌ Failed to fetch initial data:', error)
        setStatus({ 
          status: 'error', 
          message: 'Failed to connect to EquiMind Risk Engine',
          timestamp: new Date().toISOString()
        })
      }
    }

    fetchInitialData()

    // WebSocket connection with proper connection management
    const connect = () => {
      // Prevent multiple simultaneous connections
      if (isConnectingRef.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
        console.log('🔄 Connection already in progress, skipping...')
        return
      }

      // Close existing connection if any
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        console.log('🔌 Closing existing WebSocket connection')
        ws.current.close()
      }

      isConnectingRef.current = true
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/live'
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`)
      
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('WebSocket connected - receiving live events')
        isConnectingRef.current = false
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      ws.current.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)
          
          // Handle different message types
          if (data.type === 'ping') {
            // Respond to ping with pong
            if (ws.current?.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
            }
            return
          }
          
          // Handle regular events - only add if we have required fields
          if (data.id && data.timestamp && data.severity) {
            console.log(`📨 Received event: ${data.id} (${data.severity})`)
            addEvent(data)
            
            // Refresh entities less frequently to reduce load
            if (Math.random() < 0.05) { // Reduced from 0.1 to 0.05
              apiService.getEntities()
                .then(setEntities)
                .catch(console.error)
            }
          } else {
            console.warn('WARNING: Received message without required fields:', data)
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error, msg.data)
        }
      }

      ws.current.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected (code: ${event.code})`)
        isConnectingRef.current = false
        
        // Only reconnect if not manually closed
        if (event.code !== 1000) {
          const delay = Math.min(10000, 2000 + Math.random() * 3000) // Reduced max delay
          console.log(`🔄 Reconnecting in ${delay/1000}s...`)
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        isConnectingRef.current = false
        if (ws.current) {
          ws.current.close()
        }
      }
    }

    connect()

    // Periodic health checks (less frequent)
    const healthCheckInterval = setInterval(async () => {
      try {
        const status = await apiService.getStatus()
        setStatus(status)
      } catch (error) {
        console.warn('WARNING: Health check failed:', error.message)
      }
    }, 60000) // Every 60 seconds instead of 30

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up WebSocket connection')
      clearInterval(healthCheckInterval)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      isConnectingRef.current = false
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting')
      }
    }
  }, []) // Empty dependency array to prevent re-runs

  // Return connection status for components to use
  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    connectionState: ws.current?.readyState || WebSocket.CLOSED
  }
}