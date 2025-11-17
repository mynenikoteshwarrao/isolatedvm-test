const express = require('express');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

const app = express();
app.use(express.json());

// Socket.IO Configuration
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';
const ROOM_NAME = 'bgmi';

// Function to run script in isolated VM
function runInVM(socketData) {
  try {
    // Get the script content
    const scriptPath = path.join(__dirname, 'isolated-script.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    // Variable to capture messages from isolated VM
    let messagesFromIsolate = [];

    // Create a sandboxed context
    const sandbox = {
      // Function that the isolated code can call to send messages back
      sendToMain: function(msg) {
        messagesFromIsolate.push(msg);
        console.log('[Main App] Received from isolate:', msg);
      },

      // Log function for the isolated context
      log: function(...args) {
        console.log('[Isolated VM]', ...args);
      },

      // Socket data from the message
      socketData: socketData,

      // Make Date available for timestamp
      Date: Date,
      JSON: JSON,

      // Variable to store the result
      result: null
    };

    // Create the context
    const context = vm.createContext(sandbox);

    // Run the script in the isolated context
    vm.runInContext(scriptContent, context, {
      timeout: 5000, // 5 second timeout
      displayErrors: true
    });

    return {
      success: true,
      messagesFromIsolate,
      result: sandbox.result
    };

  } catch (error) {
    console.error('[Main App] Error running isolated script:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Initialize Socket.IO client
let socket = null;

function initSocketClient() {
  console.log(`[Socket] Connecting to ${SOCKET_URL}...`);

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', () => {
    console.log(`[Socket] ✅ Connected to server with ID: ${socket.id}`);

    // Join the bgmi room
    socket.emit('join-room', ROOM_NAME);
  });

  socket.on('joined-room', (data) => {
    console.log(`[Socket] ✅ Joined room: ${data.room}`);
  });

  socket.on('message', (data) => {
    console.log(`[Socket] 📨 Received message from room ${data.room}`);

    // Check if messageType is 'rawdata'
    if (data.message && data.message.messageType === 'rawdata') {
      console.log(`[Socket] Processing rawdata message...`);

      // Run the script in VM with socket data
      const vmResult = runInVM(data);

      console.log(`[Socket] VM execution completed:`, vmResult.success ? '✅ Success' : '❌ Failed');
    } else {
      console.log(`[Socket] Ignoring message (messageType: ${data.message?.messageType})`);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] ❌ Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  socket.on('error', (error) => {
    console.error('[Socket] Error:', error);
  });
}

// Endpoint to manually trigger isolated script (for testing)
app.post('/run-isolated', async (req, res) => {
  try {
    const { message } = req.body;

    // Create mock socket data for testing
    const mockSocketData = {
      from: 'manual-trigger',
      room: 'test',
      message: {
        messageType: 'rawdata',
        data: message || 'Hello from manual trigger'
      },
      timestamp: Date.now()
    };

    const result = runInVM(mockSocketData);

    res.json({
      success: result.success,
      sentToIsolate: mockSocketData,
      receivedFromIsolate: result.messagesFromIsolate,
      result: result.result,
      error: result.error
    });

  } catch (error) {
    console.error('Error running isolated script:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Status endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Isolated VM Express App with Socket.IO',
    socketConnected: socket?.connected || false,
    socketId: socket?.id || null,
    room: ROOM_NAME,
    endpoints: {
      'POST /run-isolated': 'Manually run script in isolated VM (for testing)',
      'GET /socket-status': 'Check socket connection status'
    }
  });
});

// Socket status endpoint
app.get('/socket-status', (req, res) => {
  res.json({
    connected: socket?.connected || false,
    socketId: socket?.id || null,
    room: ROOM_NAME,
    socketUrl: SOCKET_URL
  });
});

const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket URL: ${SOCKET_URL}`);
  console.log(`🏠 Room: ${ROOM_NAME}`);
  console.log(`\nEndpoints:`);
  console.log(`  - GET  http://localhost:${PORT}/`);
  console.log(`  - GET  http://localhost:${PORT}/socket-status`);
  console.log(`  - POST http://localhost:${PORT}/run-isolated`);

  // Initialize socket client after server starts
  initSocketClient();
});
