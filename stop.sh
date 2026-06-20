#!/bin/bash
# Gracefully stop the frontend dev server
set -e

PORT=5173
PID_FILE=".vite.pid"

# Try to stop by PID file first
if [ -f "$PID_FILE" ]; then
  VITE_PID=$(cat "$PID_FILE")
  if kill -0 "$VITE_PID" 2>/dev/null; then
    echo "Stopping frontend (PID: $VITE_PID)..."
    kill "$VITE_PID"
    # Wait for graceful shutdown
    sleep 1
    if kill -0 "$VITE_PID" 2>/dev/null; then
      echo "Force stopping..."
      kill -9 "$VITE_PID" 2>/dev/null || true
    fi
    echo "Frontend stopped."
  else
    echo "No running frontend process found (PID: $VITE_PID)."
  fi
  rm -f "$PID_FILE"
fi

# Also clean up any leftover process on the port
if lsof -ti :$PORT &>/dev/null; then
  echo "Cleaning up any remaining process on port $PORT..."
  kill $(lsof -ti :$PORT) 2>/dev/null || true
  sleep 1
  if lsof -ti :$PORT &>/dev/null; then
    kill -9 $(lsof -ti :$PORT) 2>/dev/null || true
  fi
  echo "Port $PORT freed."
fi
