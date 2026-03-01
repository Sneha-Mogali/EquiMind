# 🚀 EquiMind Quick Start

## Prerequisites

- Python 3.8+
- Node.js 16+
- Docker (optional, for monitoring)

## 1. Backend Setup (2 minutes)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

✅ Backend running at http://localhost:8000

## 2. Frontend Setup (2 minutes)

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend running at http://localhost:5173

## 3. Access the Dashboard

Open http://localhost:5173 in your browser

You'll see:
- Real-time security events streaming
- Entity risk scores updating live
- ML-powered threat detection
- Interactive security dashboard

## Optional: Monitoring Setup

```bash
cd risk_engine
docker-compose -f docker-compose.monitoring.yml up -d
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## Troubleshooting

**Backend won't start:**
- Check if port 8000 is available
- Verify Python dependencies: `pip install -r requirements.txt`

**Frontend won't start:**
- Check if port 5173 is available
- Clear node_modules: `rm -rf node_modules && npm install`

**No events showing:**
- Ensure backend is running on port 8000
- Check browser console for WebSocket errors

## What's Next?

- Explore API docs: http://localhost:8000/docs
- View Prometheus metrics: http://localhost:8000/metrics
- Check entity details in the dashboard
- Monitor real-time risk scores

## Key Features to Try

1. Watch live security events stream in
2. Click on entities to see risk history
3. Observe ML model predictions in real-time
4. Check the system status dashboard
5. View Prometheus metrics (if monitoring enabled)
