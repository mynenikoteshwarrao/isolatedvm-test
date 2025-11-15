# Isolated VM Express App - Proof of Concept

Simple demonstration of bidirectional communication between an Express app and Node.js VM module.

## Features

- Express server with VM module integration
- Bidirectional communication (Main App ↔ Isolated VM)
- Simple script execution in sandboxed environment
- Message passing between contexts

## How It Works

1. **Main App** (index.js) - Express server that creates isolated contexts
2. **Isolated Script** (isolated-script.js) - Runs in isolated VM with no access to Node.js APIs
3. **Communication**:
   - Main → Isolate: via `messageFromMain` variable
   - Isolate → Main: via `sendToMain()` function

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

Server runs on port 3000 by default.

## Usage

**Test the endpoint:**

```bash
curl -X POST http://localhost:3000/run-isolated \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from outside!"}'
```

**Expected response:**

```json
{
  "success": true,
  "sentToIsolate": "Hello from outside!",
  "receivedFromIsolate": [
    "Processing your message...",
    "Message received: Hello from outside!",
    "Processed result: HELLO FROM OUTSIDE!",
    "Computed sum 1-10: 55"
  ],
  "result": {
    "originalMessage": "Hello from outside!",
    "processedMessage": "HELLO FROM OUTSIDE!",
    "computedSum": 55,
    "timestamp": 1234567890
  }
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Main Express App                │
│                                         │
│  POST /run-isolated                     │
│    │                                    │
│    ├─→ Create Isolate                  │
│    ├─→ Create Context                  │
│    ├─→ Inject sendToMain() ────────┐   │
│    ├─→ Inject messageFromMain      │   │
│    ├─→ Run isolated-script.js      │   │
│    │                                │   │
│    │   ┌────────────────────────┐  │   │
│    │   │   Isolated VM          │  │   │
│    │   │                        │  │   │
│    └──→│ Receive: messageFromMain  │   │
│        │ Process: toUpperCase()│  │   │
│        │ Compute: sum 1-10     │  │   │
│        │ Send: sendToMain() ───┼──┘   │
│        │                        │      │
│        └────────────────────────┘      │
│    ↓                                    │
│  Return JSON response                  │
│                                         │
└─────────────────────────────────────────┘
```

## Security

The VM sandbox:
- Limited access to Node.js APIs (only what's explicitly provided)
- No access to require() by default
- 5 second execution timeout
- Runs in a separate V8 context

**Note**: Node.js `vm` module provides basic isolation but is not a security sandbox. For production use with untrusted code, consider `isolated-vm` or other secure sandboxing solutions.
