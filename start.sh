#!/bin/bash
set -e

# Load nvm and use the correct Node.js version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default --silent 2>/dev/null || true

PORT=5173
PID_FILE=".vite.pid"

# 1. Kill any process already holding the target port
if lsof -ti :$PORT &>/dev/null; then
    echo "Port $PORT is already in use. Attempting to free it..."
    OLD_PIDS=$(lsof -ti :$PORT)
    echo "Killing process(es): $OLD_PIDS"
    kill $OLD_PIDS 2>/dev/null || true
    sleep 1

    # Force kill if still alive
    if lsof -ti :$PORT &>/dev/null; then
        echo "Force killing remaining process(es)..."
        OLD_PIDS=$(lsof -ti :$PORT)
        kill -9 $OLD_PIDS 2>/dev/null || true
        sleep 1
    fi
fi

# 2. Clean up stale PID file
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 $OLD_PID 2>/dev/null; then
        echo "Stopping previous frontend instance (PID: $OLD_PID)..."
        kill $OLD_PID 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
fi

echo "Installing dependencies..."
npm install

echo "Starting dev server on port $PORT..."
# 3. Start Vite in the background
npx vite --host --port $PORT --strictPort &
VITE_PID=$!
echo $VITE_PID > "$PID_FILE"

# 4. Wait for Vite to actually start or fail
sleep 2

# 5. Verify the server started successfully
if ! kill -0 $VITE_PID 2>/dev/null; then
    echo "ERROR: Vite failed to start. The port may still be in use."
    rm -f "$PID_FILE"
    exit 1
fi

if lsof -ti :$PORT 2>/dev/null | grep -q $VITE_PID; then
    echo "Frontend dev server started successfully (PID: $VITE_PID)."
    echo "Listening on http://localhost:$PORT"
else
    echo "WARNING: Vite process is running but may not be listening on port $PORT yet."
    echo "Check the terminal output above for details."
fi
