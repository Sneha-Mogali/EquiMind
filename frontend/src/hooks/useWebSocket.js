import { useEffect, useRef } from 'react'
import { useSentinel } from '../store/sentinel'

export function useWebSocket() {
  const ws = useRef(null)
  const addEvent = useSentinel(s => s.addEvent)
  const setEntities = useSentinel(s => s.setEntities)
  const setStatus = useSentinel(s => s.setStatus)

  useEffect(() => {
    // Fetch initial data
    fetch(`${import.meta.env.VITE_API_URL}/entities`)
      .then(r => r.json()).then(setEntities).catch(console.error)

    fetch(`${import.meta.env.VITE_API_URL}/status`)
      .then(r => r.json()).then(setStatus).catch(console.error)

    // WebSocket
    const connect = () => {
      ws.current = new WebSocket(import.meta.env.VITE_WS_URL)

      ws.current.onmessage = (msg) => {
        const event = JSON.parse(msg.data)
        addEvent(event)
        // Refresh entities every 5 events
        fetch(`${import.meta.env.VITE_API_URL}/entities`)
          .then(r => r.json()).then(setEntities).catch(() => {})
      }

      ws.current.onclose = () => {
        setTimeout(connect, 3000) // auto-reconnect
      }

      ws.current.onerror = (e) => {
        console.error('WS error', e)
        ws.current.close()
      }
    }

    connect()
    return () => ws.current?.close()
  }, [])
}