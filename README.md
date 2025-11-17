# Isolated VM Express App with Socket.IO - Proof of Concept

Demonstration of Socket.IO client receiving messages and processing them in isolated VM contexts.

## Features

- Socket.IO client integration
- Connects to message bus server and joins "bgmi" room
- Listens for messages with `messageType: "rawdata"`
- Each incoming message creates a fresh VM context
- Bidirectional communication (Main App ↔ Isolated VM)
- Express API for testing and monitoring

## How It Works

1. **Socket.IO Client** - Connects to message bus server at startup
2. **Room Join** - Automatically joins "bgmi" room
3. **Message Filtering** - Only processes messages with `messageType: "rawdata"`
4. **VM Execution** - Each message creates a fresh isolated VM context
5. **Script Processing** - `isolated-script.js` runs in the VM with socket data
6. **Communication**:
   - Socket → VM: via `socketData` variable (full message payload)
   - VM → Main: via `sendToMain()` function
   - VM → Main: via `log()` function

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Socket.IO Server URL (default: http://localhost:4000)
SOCKET_URL=http://localhost:4000

# Express Server Port (default: 3000)
PORT=3000
```

## Running

### 1. Start the Socket.IO Message Bus Server (separately)

You need a Socket.IO server running that matches the interface in the provided code.

### 2. Start this client app

```bash
npm start
```

The app will:
- Start Express server on port 3000
- Connect to Socket.IO server at configured URL
- Join "bgmi" room automatically
- Start listening for "rawdata" messages

## Usage

### Check Connection Status

```bash
curl http://localhost:3000/socket-status
```

Response:
```json
{
  "connected": true,
  "socketId": "abc123",
  "room": "bgmi",
  "socketUrl": "http://localhost:4000"
}
```

### Manual Test (without Socket.IO server)

```bash
curl -X POST http://localhost:3000/run-isolated \
  -H "Content-Type: application/json" \
  -d '{"message":"test data"}'
```

This creates a mock socket message and tests the VM execution.

### Send Message via Socket.IO (from another client)

To trigger VM execution, send a message to the "bgmi" room with this structure:

```javascript
socket.emit('message', {
  room: 'bgmi',
  message: {
    messageType: 'rawdata',
    data: 'Your data here'
  }
});
```

The app will:
1. Receive the message
2. Check if `messageType === 'rawdata'`
3. Create a fresh VM context
4. Run `isolated-script.js` with the socket data
5. Log the results

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│            Socket.IO Message Bus Server                  │
│                  (port 4000)                             │
└──────────────────────────────────────────────────────────┘
                        │
                        │ Socket.IO connection
                        ↓
┌──────────────────────────────────────────────────────────┐
│         Express App + Socket.IO Client (port 3000)       │
│                                                          │
│  On Startup:                                             │
│    ├─→ Connect to Socket server                         │
│    └─→ Join "bgmi" room                                 │
│                                                          │
│  On Socket Message (messageType: "rawdata"):            │
│    │                                                     │
│    ├─→ Create Fresh VM Context                          │
│    ├─→ Inject socketData ──────────────┐                │
│    ├─→ Inject sendToMain()             │                │
│    ├─→ Inject log()                    │                │
│    │                                    │                │
│    │   ┌─────────────────────────────┐ │                │
│    │   │     Isolated VM             │ │                │
│    │   │  (isolated-script.js)       │ │                │
│    │   │                             │ │                │
│    └──→│ Receive: socketData ────────┘                 │
│        │ Extract: messageType                           │
│        │ Extract: data                                  │
│        │ Process: data                                  │
│        │ Send: sendToMain() ──────→ Console logs       │
│        │ Log: progress ───────────→ Console logs       │
│        │ Return: result                                 │
│        └─────────────────────────────┘                  │
│                                                          │
│  Express Endpoints:                                      │
│    - GET  /          (status)                           │
│    - GET  /socket-status (connection info)              │
│    - POST /run-isolated  (manual test)                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Message Flow

1. **Socket.IO server** receives message in "bgmi" room
2. **Server broadcasts** to all clients in room
3. **This client receives** the message
4. **Filters** by `messageType === "rawdata"`
5. **Creates** fresh VM context (no persistent state)
6. **Runs** isolated-script.js with socket data
7. **VM processes** data and sends messages back via `sendToMain()`
8. **Logs** all activity to console
9. **VM context destroyed** after execution

## VM Lifecycle

```
Socket Message → Create VM → Load Script → Execute → Destroy VM
                     ↓            ↓           ↓          ↓
                  Fresh       socketData   Result    Clean up
                 Context      injected     captured
```

**Important**: Each message gets a **fresh, isolated VM context**. No state persists between messages.

## Security

The VM sandbox:
- Limited access to Node.js APIs (only what's explicitly provided)
- No access to require() by default
- 5 second execution timeout
- Runs in a separate V8 context

**Note**: Node.js `vm` module provides basic isolation but is not a security sandbox. For production use with untrusted code, consider `isolated-vm` or other secure sandboxing solutions.
