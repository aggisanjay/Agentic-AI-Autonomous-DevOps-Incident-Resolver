const { SocketEvents } = require('../../shared/types');

function setupWebSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on(SocketEvents.JOIN_INCIDENT, (incidentId) => {
      socket.join(`incident:${incidentId}`);
      console.log(`👁️  ${socket.id} joined room incident:${incidentId}`);
    });

    socket.on(SocketEvents.LEAVE_INCIDENT, (incidentId) => {
      socket.leave(`incident:${incidentId}`);
      console.log(`👋 ${socket.id} left room incident:${incidentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // Helper to emit to a specific incident room
  io.emitToIncident = (incidentId, event, data) => {
    io.to(`incident:${incidentId}`).emit(event, data);
  };

  return io;
}

module.exports = setupWebSocket;
