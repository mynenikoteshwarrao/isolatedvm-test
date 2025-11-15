const express = require('express');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Endpoint to run isolated script
app.post('/run-isolated', async (req, res) => {
  try {
    const { message } = req.body;

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

      // Message from main app to isolated VM
      messageFromMain: message || 'Hello from Main App',

      // Make Date available for timestamp
      Date: Date,

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

    res.json({
      success: true,
      sentToIsolate: message || 'Hello from Main App',
      receivedFromIsolate: messagesFromIsolate,
      result: sandbox.result
    });

  } catch (error) {
    console.error('Error running isolated script:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simple health check
app.get('/', (req, res) => {
  res.json({
    message: 'Isolated VM Express App',
    endpoints: {
      'POST /run-isolated': 'Run script in isolated VM with bidirectional communication'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Try: curl -X POST http://localhost:${PORT}/run-isolated -H "Content-Type: application/json" -d '{"message":"Hello from outside!"}'`);
});
