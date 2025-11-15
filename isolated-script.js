// This script runs inside the isolated VM
// It has limited access to Node.js APIs

// Log received message
log('Script started in isolated VM');
log('Received message from main app:', messageFromMain);

// Process the message
const processed = messageFromMain.toUpperCase();

// Send messages back to main app
sendToMain('Processing your message...');
sendToMain('Message received: ' + messageFromMain);
sendToMain('Processed result: ' + processed);

// Do some computation
let sum = 0;
for (let i = 1; i <= 10; i++) {
  sum += i;
}

sendToMain('Computed sum 1-10: ' + sum);

// Set the final result
result = {
  originalMessage: messageFromMain,
  processedMessage: processed,
  computedSum: sum,
  timestamp: Date.now()
};
