#!/usr/bin/env bash
# Start the EL Science tutor server and open the browser.

cd "$(dirname "$0")/tutor" || exit 1

PORT="${PORT:-3903}"

# Start the server in the background
node server.js &
SERVER_PID=$!

# Wait briefly for the server to be ready
sleep 2

# Open the browser
if command -v open &>/dev/null; then
  open "http://localhost:$PORT"
elif command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:$PORT"
else
  echo "Open http://localhost:$PORT in your browser"
fi

# Bring the server back to the foreground so Ctrl-C stops it
wait $SERVER_PID
