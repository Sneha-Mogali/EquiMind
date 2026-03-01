import { create } from 'zustand'

export const useSentinel = create((set, get) => ({
  events: [],
  entities: [],
  status: null,
  threatState: false,
  simulationMode: 'idle',
  modelHealth: null,
  simulationStats: null,
  lastValidation: null,

  addEvent: (event) => set(state => {
    // Check for duplicate events by ID to prevent React key conflicts
    const existingEventIds = new Set(state.events.map(e => e.id))
    if (existingEventIds.has(event.id)) {
      console.warn(`WARNING: Duplicate event detected: ${event.id}`)
      return state // Don't add duplicate
    }
    
    const events = [event, ...state.events].slice(0, 100)
    const isCritical = event.severity === 'CRITICAL'
    
    // Update entity risk scores from events
    const updatedEntities = state.entities.map(entity => {
      if (entity.name === event.user) {
        return {
          ...entity,
          risk_score: event.entity_context?.risk_profile === 'very_high' ? 
            Math.min(100, entity.risk_score + 2) : entity.risk_score,
          last_activity: event.timestamp
        }
      }
      return entity
    })
    
    console.log(`Added new event: ${event.id} (${event.severity})`)
    
    return { 
      events, 
      entities: updatedEntities,
      threatState: isCritical || state.threatState 
    }
  }),

  setEntities: (entities) => set({ entities }),
  setStatus: (status) => set({ status }),
  setModelHealth: (health) => set({ modelHealth: health }),
  setSimulationStats: (stats) => set({ simulationStats: stats }),
  setLastValidation: (validation) => set({ lastValidation: validation }),
  clearThreat: () => set({ threatState: false }),
  setSimMode: (mode) => set({ simulationMode: mode }),

  getTension: () => {
    const { entities } = get()
    if (!entities.length) return 0
    const avg = entities.reduce((s, e) => s + (e.risk_score || e.base_risk || 0), 0) / entities.length
    return Math.round(avg)
  },

  getHighRiskEntities: () => {
    const { entities } = get()
    return entities.filter(e => (e.risk_score || e.base_risk || 0) > 60)
  },

  getRecentIncidents: () => {
    const { events } = get()
    return events.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH')
  },

  getAttackDistribution: () => {
    const { events } = get()
    const distribution = {}
    events.forEach(event => {
      const category = event.attack_cat || 'Unknown'
      distribution[category] = (distribution[category] || 0) + 1
    })
    return distribution
  },

  getModelPerformance: () => {
    const { events, modelHealth } = get()
    const recentEvents = events.slice(0, 20)
    const avgPredictionTime = recentEvents.reduce((sum, e) => {
      return sum + (e.prediction_time || 0)
    }, 0) / recentEvents.length || 0

    return {
      avgPredictionTime: avgPredictionTime.toFixed(3),
      modelStatus: modelHealth?.model_status?.mlp_model?.status || 'unknown',
      lastValidation: modelHealth?.last_validation?.timestamp || null,
      totalPredictions: events.length
    }
  }
}))

// Enhanced API service for new backend
export const apiService = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',

  async fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${this.baseUrl}${url}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return await response.json()
      } catch (error) {
        if (i === retries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  },

  async getStatus() {
    return this.fetchWithRetry('/status')
  },

  async getEntities() {
    return this.fetchWithRetry('/entities')
  },

  async getEvents(limit = 50) {
    return this.fetchWithRetry(`/events?limit=${limit}`)
  },

  async getIncidents() {
    return this.fetchWithRetry('/incidents')
  },

  async getModelHealth() {
    return this.fetchWithRetry('/health/models')
  },

  async validateModels() {
    return this.fetchWithRetry('/health/validate', { method: 'POST' })
  },

  async getSimulationStats() {
    return this.fetchWithRetry('/simulation/stats')
  },

  async generateSampleFlow(entityId = null) {
    const url = entityId ? `/simulation/generate?entity_id=${entityId}` : '/simulation/generate'
    return this.fetchWithRetry(url, { method: 'POST' })
  },

  async updateEntityRisk(entityId, newRisk) {
    return this.fetchWithRetry(`/simulation/entities/${entityId}/risk`, {
      method: 'PUT',
      body: JSON.stringify({ new_risk: newRisk })
    })
  },

  async predictRisk(flowData) {
    return this.fetchWithRetry('/predict', {
      method: 'POST',
      body: JSON.stringify(flowData)
    })
  }
}