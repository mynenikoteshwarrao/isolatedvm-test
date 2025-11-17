// This script runs inside the isolated VM
// It has limited access to Node.js APIs
// Each socket message creates a fresh VM context

log('=== Isolated VM Started ===');
log('Socket Data:', JSON.stringify(socketData, null, 2));

// Extract data from socket message
const messageType = socketData.message?.messageType;
const messageData = socketData.message?.data;
const fromId = socketData.from;
const room = socketData.room;
const timestamp = socketData.timestamp;

sendToMain('VM initialized for messageType: ' + messageType);

// Check if this is rawdata
if (messageType === 'rawdata') {
  log('Processing rawdata...');

  // Process the raw data
  let processedData = null;

  if (typeof messageData === 'string') {
    processedData = messageData.toUpperCase();
    sendToMain('Processed string data: ' + processedData);
  } else if (typeof messageData === 'object') {
    processedData = JSON.stringify(messageData);
    sendToMain('Processed object data: ' + processedData);
  } else {
    processedData = String(messageData);
    sendToMain('Converted to string: ' + processedData);
  }

  // Do some computation as example
  const dataLength = processedData ? processedData.length : 0;
  const wordCount = processedData ? processedData.split(' ').length : 0;

  sendToMain('Data length: ' + dataLength);
  sendToMain('Word count: ' + wordCount);

  // Set the final result
  result = {
    messageType: messageType,
    from: fromId,
    room: room,
    originalData: messageData,
    processedData: processedData,
    stats: {
      length: dataLength,
      wordCount: wordCount
    },
    processedAt: Date.now(),
    receivedAt: timestamp
  };

  log('Result prepared:', JSON.stringify(result, null, 2));
} else {
  log('Unsupported messageType: ' + messageType);
  result = {
    error: 'Unsupported messageType',
    messageType: messageType
  };
}

sendToMain('VM execution completed');
log('=== Isolated VM Finished ===');
