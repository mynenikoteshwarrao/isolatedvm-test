#!/bin/bash

echo "Testing Isolated VM Express App..."
echo ""

echo "Test 1: Basic message"
curl -X POST http://localhost:3000/run-isolated \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello from outside!"}' \
  2>/dev/null | jq '.'

echo ""
echo "Test 2: Different message"
curl -X POST http://localhost:3000/run-isolated \
  -H 'Content-Type: application/json' \
  -d '{"message":"testing bidirectional communication"}' \
  2>/dev/null | jq '.'

echo ""
echo "Test 3: No message (use default)"
curl -X POST http://localhost:3000/run-isolated \
  -H 'Content-Type: application/json' \
  -d '{}' \
  2>/dev/null | jq '.'
