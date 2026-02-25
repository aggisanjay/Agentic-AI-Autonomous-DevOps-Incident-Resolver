import { create } from 'zustand';
import socket from '../sockets/socket.js';
const API_URL = import.meta.env.VITE_API_URL;
const useIncidentStore = create((set, get) => ({
  // State
  incidents: [],
  activeIncident: null,
  timeline: [],
  thinking: null,
  connected: false,
  loading: false,
  error: null,
  // Actions
  setConnected: (connected) => set({ connected }),
  fetchIncidents: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/incidents`);
      const data = await res.json();
      set({ incidents: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
  fetchIncident: async (id) => {
    set({ loading: true, error: null, activeIncident: null, timeline: [] });
    try {
      const res = await fetch(`${API_URL}/incidents/${id}`);
      const data = await res.json();
      set({
        activeIncident: data,
        timeline: data.timeline || [],
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
  createIncident: async (incident) => {
    try {
      const res = await fetch(`${API_URL}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident),
      });
      const data = await res.json();
      if (res.ok) {
        set((state) => ({ incidents: [data, ...state.incidents] }));
        return data;
      }
      throw new Error(data.error || 'Failed to create incident');
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },
  // Socket event handlers
  addTimelineStep: (step) => {
    set((state) => ({
      timeline: [...state.timeline, step],
      thinking: null,
    }));
  },
  setThinking: (text) => set({ thinking: text }),
  updateIncidentInList: (incidentId, updates) => {
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, ...updates } : inc
      ),
      activeIncident:
        state.activeIncident?.id === incidentId
          ? { ...state.activeIncident, ...updates }
          : state.activeIncident,
    }));
  },
  completeIncident: (incidentId, result) => {
    set((state) => ({
      thinking: null,
      activeIncident:
        state.activeIncident?.id === incidentId
          ? { ...state.activeIncident, status: result.status, resolution: result.resolution }
          : state.activeIncident,
      incidents: state.incidents.map((inc) =>
        inc.id === incidentId
          ? { ...inc, status: result.status, resolution: result.resolution }
          : inc
      ),
    }));
  },
  // Join/leave incident rooms
  joinIncident: (id) => {
    socket.emit('join:incident', id);
  },
  leaveIncident: (id) => {
    socket.emit('leave:incident', id);
  },
}));
// Setup socket listeners
socket.on('connect', () => {
  useIncidentStore.getState().setConnected(true);
});
socket.on('disconnect', () => {
  useIncidentStore.getState().setConnected(false);
});
socket.on('incident:created', (incident) => {
  const state = useIncidentStore.getState();
  const exists = state.incidents.find((i) => i.id === incident.id);
  if (!exists) {
    useIncidentStore.setState((s) => ({ incidents: [incident, ...s.incidents] }));
  }
});
socket.on('incident:updated', (data) => {
  const { incidentId, ...updates } = data;
  useIncidentStore.getState().updateIncidentInList(incidentId, updates);
});
socket.on('agent:step', (data) => {
  const state = useIncidentStore.getState();
  if (state.activeIncident?.id === data.incidentId) {
    state.addTimelineStep(data.step);
  }
});
socket.on('agent:thinking', (data) => {
  const state = useIncidentStore.getState();
  if (state.activeIncident?.id === data.incidentId) {
    state.setThinking(data.reasoning);
  }
});
socket.on('agent:complete', (data) => {
  useIncidentStore.getState().completeIncident(data.incidentId, data.result);
});
socket.on('agent:error', (data) => {
  console.error('Agent error:', data);
});
export default useIncidentStore;