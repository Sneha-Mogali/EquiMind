# EquiMind Quick Reference

## 🚀 Quick Start

### Start Everything
```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Monitoring (optional)
cd backend
start-monitoring.bat
```

### Access Points
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Metrics: http://localhost:8000/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## 📊 Monitoring

### Start Monitoring Stack
```bash
cd backend
start-monitoring.bat  # Windows
./start-monitoring.ps1  # PowerShell
```

### Stop Monitoring Stack
```bash
cd backend
docker-compose -f docker-compose.monitoring.yml down
```

### View Metrics
```bash
curl http://localhost:8000/metrics
```

### Check Service Status
```bash
# Prometheus
curl http://localhost:9090/api/v1/status/config

# Grafana
curl http://localhost:3001/api/health

# Backend
curl http://localhost:8000/status
```

## 🧪 Testing

### Run Full Test Suite
```bash
cd backend
python test_backend.py
```

### Run Quick Tests
```bash
cd backend
test-curl.bat
```

### Test Specific Endpoint
```bash
# Status
curl http://localhost:8000/status

# Entities
curl http://localhost:8000/entities

# Events
curl "http://localhost:8000/events?limit=10"

# Prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"proto":"tcp","service":"http",...}'
```

## 📁 Project Structure

```
EquiMind/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── models.py                  # ML models
│   ├── monitoring.py              # Prometheus metrics
│   ├── test_backend.py            # Test suite
│   ├── prometheus.yml             # Prometheus config
│   ├── grafana-dashboard.json     # Grafana dashboard
│   └── docker-compose.monitoring.yml
├── frontend/
│   └── src/
│       ├── pages/
│       │   └── Monitoring.jsx     # Monitoring page
│       └── App.jsx                # Main app
└── docs/
    ├── README.md
    ├── TESTING.md
    ├── MONITORING.md
    └── ARCHITECTURE.md
```

## 🔧 Common Commands

### Backend
```bash
# Start
python main.py

# Install dependencies
pip install -r requirements.txt

# Run tests
python test_backend.py

# Check diagnostics
python -m py_compile *.py
```

### Frontend
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Install dependencies
npm install
```

### Docker
```bash
# Start monitoring
docker-compose -f backend/docker-compose.monitoring.yml up -d

# Stop monitoring
docker-compose -f backend/docker-compose.monitoring.yml down

# View logs
docker-compose -f backend/docker-compose.monitoring.yml logs -f

# Restart services
docker-compose -f backend/docker-compose.monitoring.yml restart
```

## 📈 Key Metrics

### Prometheus Queries

**Total Events:**
```promql
sum(equimind_events_total)
```

**Events by Severity:**
```promql
sum by (severity) (equimind_events_total)
```

**Block Rate:**
```promql
rate(equimind_events_total{decision="BLOCK"}[5m])
```

**Average Risk Score:**
```promql
histogram_quantile(0.5, equimind_risk_score_bucket)
```

**ML Prediction Time (p95):**
```promql
histogram_quantile(0.95, equimind_ml_prediction_seconds_bucket)
```

**Active WebSocket Connections:**
```promql
equimind_websocket_connections
```

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check port 8000
netstat -an | findstr 8000

# Kill process
taskkill /F /IM python.exe

# Restart
python main.py
```

### Frontend Won't Start
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Try different port
npm run dev -- --port 5174
```

### Monitoring Not Working
```bash
# Check Docker
docker --version

# Check containers
docker ps

# Restart monitoring
docker-compose -f backend/docker-compose.monitoring.yml restart

# View logs
docker-compose -f backend/docker-compose.monitoring.yml logs
```

### Tests Failing
```bash
# Ensure backend is running
curl http://localhost:8000/status

# Wait for events (10s)
timeout /t 10

# Run tests again
python test_backend.py
```

## 📝 API Quick Reference

### GET /status
```bash
curl http://localhost:8000/status
```
Returns: System status, tension, event counts

### GET /entities
```bash
curl http://localhost:8000/entities
```
Returns: List of all entities

### GET /entity/{id}
```bash
curl http://localhost:8000/entity/u01
```
Returns: Entity details with history

### GET /events?limit=N
```bash
curl "http://localhost:8000/events?limit=20"
```
Returns: Recent N events

### GET /incidents
```bash
curl http://localhost:8000/incidents
```
Returns: High/critical severity events

### POST /predict
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"proto":"tcp",...}'
```
Returns: ML risk prediction

### GET /metrics
```bash
curl http://localhost:8000/metrics
```
Returns: Prometheus metrics

### WS /ws/live
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/live')
ws.onmessage = (event) => console.log(JSON.parse(event.data))
```
Returns: Real-time event stream

## 🎯 Frontend Pages

- `/` - Mission Control (main dashboard)
- `/entities` - Entity management
- `/threat` - Threat investigation
- `/policy` - Policy studio
- `/analytics` - Analytics and charts
- `/monitoring` - Monitoring and Grafana
- `/portal` - User portal

## 🔐 Default Credentials

- **Grafana:** admin / admin
- **Prometheus:** No authentication
- **Backend API:** No authentication (add in production)

## 📚 Documentation

- `README.md` - Project overview
- `START_HERE.md` - Quick start
- `TESTING.md` - Testing guide
- `backend/MONITORING.md` - Monitoring guide
- `ARCHITECTURE.md` - System design
- `DEPLOYMENT.md` - Production deployment

## 💡 Tips

1. **Always start backend first** - Frontend needs backend API
2. **Wait 10s after starting** - Let events accumulate
3. **Use monitoring page** - Check service status
4. **Run tests regularly** - Ensure everything works
5. **Check logs** - `docker-compose logs` for issues
6. **Update regularly** - `pip install -r requirements.txt`

## 🆘 Support

- Check documentation in `/docs`
- View API docs: http://localhost:8000/docs
- Check logs: `docker-compose logs`
- Run diagnostics: `python test_backend.py`

---

**Last Updated:** 2026-02-28
**Version:** 2.0.0
