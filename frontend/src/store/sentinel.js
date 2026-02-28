import { create } from 'zustand'

export const useSentinel = create((set, get) => ({
  events:     [],
  entities:   [],
  status:     null,
  threatState: false,
  simulationMode: 'idle',

  addEvent: (event) => set(state => {
    const events = [event, ...state.events].slice(0, 100)
    const isCritical = event.severity === 'CRITICAL'
    return { events, threatState: isCritical || state.threatState }
  }),

  setEntities:  (entities)  => set({ entities }),
  setStatus:    (status)    => set({ status }),
  clearThreat:  ()          => set({ threatState: false }),
  setSimMode:   (mode)      => set({ simulationMode: mode }),

  getTension: () => {
    const { entities } = get()
    if (!entities.length) return 0
    const avg = entities.reduce((s, e) => s + (e.risk_score || 0), 0) / entities.length
    return Math.round(avg)
  },
}))