#!/usr/bin/env bash
export PATH="/opt/homebrew/bin:$PATH"

echo "=================================================="
echo "🚀 STARTING ECOBIN REAL-TIME PLATFORM"
echo "=================================================="

# Kill any existing processes on ports 5001 and 5173 and cloudflared
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true

# Start backend server
echo "📡 Starting Backend Socket.IO Server on Port 5001..."
node backend/server.js &
BACKEND_PID=$!

sleep 1

# Start Vite React frontend
echo "💻 Starting Frontend Web Portal on Port 5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!

sleep 2

# Start Cloudflare Tunnel for secure HTTPS access from any device/PC
echo "🌍 Starting Secure Public Tunnel..."
cloudflared tunnel --url http://localhost:5173 > /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!

sleep 3
TUNNEL_URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' /tmp/tunnel.log | head -n 1)

echo "=================================================="
echo "✨ ECOBIN SERVICES ARE READY!"
echo "👉 Local Mac:        http://localhost:5173"
echo "👉 Same Wi-Fi LAN:   http://192.168.88.21:5173"
if [ ! -z "$TUNNEL_URL" ]; then
echo "👉 ANY PC / Phone:   $TUNNEL_URL"
echo "👉 Android Driver:   $TUNNEL_URL/#driver"
fi
echo "=================================================="

wait $BACKEND_PID $FRONTEND_PID $TUNNEL_PID
