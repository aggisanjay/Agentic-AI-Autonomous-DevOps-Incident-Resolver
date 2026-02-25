import { io as ioClient } from 'socket.io-client';

const SocketEvents = {
  AGENT_STEP: 'agent:step',
  AGENT_THINKING: 'agent:thinking',
  AGENT_COMPLETE: 'agent:complete',
  AGENT_ERROR: 'agent:error',
  INCIDENT_UPDATED: 'incident:updated',
};

export default class Notifier {
  constructor(serverUrl) {
    this.serverUrl = serverUrl || process.env.SERVER_URL || 'http://localhost:4000';
    this.socket = null;
  }

  connect() {
    this.socket = ioClient(this.serverUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('📡 Worker notifier connected to server');
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Notifier connection error:', err.message);
    });
  }

  emitStep(incidentId, step) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SocketEvents.AGENT_STEP, { incidentId, step });
    }
  }

  emitThinking(incidentId, reasoning) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SocketEvents.AGENT_THINKING, { incidentId, reasoning });
    }
  }

  emitComplete(incidentId, result) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SocketEvents.AGENT_COMPLETE, { incidentId, result });
    }
  }

  emitError(incidentId, error) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SocketEvents.AGENT_ERROR, { incidentId, error });
    }
  }

  emitIncidentUpdate(incidentId, update) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(SocketEvents.INCIDENT_UPDATED, { incidentId, ...update });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
