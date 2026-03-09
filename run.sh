#!/bin/bash
echo "🎬 Starting Lotus AI Studio Full Stack..."

# Start Redis if not running (assumes local redis-server is installed for dev)
if ! pgrep -x "redis-server" > /dev/null
then
  echo "🟡 Starting local Redis server..."
  redis-server --daemonize yes
fi

# Start Backend
echo "🟢 Starting Python Backend on http://localhost:8000"
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "🟢 Starting Next.js Frontend on http://localhost:3000"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Lotus AI Studio is live."
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000/docs"
echo "   - Redis: localhost:6379"
echo "Press Ctrl+C to stop all."

# Wait and cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID; echo '🛑 Stopped Lotus AI Studio'" EXIT
wait
