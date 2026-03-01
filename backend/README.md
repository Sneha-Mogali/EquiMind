# EquiMind Backend

FastAPI-based backend with TensorFlow ML models, Supabase database, Prometheus monitoring, and comprehensive testing.

## Quick Start

### Option 1: With Supabase (Recommended)

```bash
# Install dependencies
pip install -r requirements.txt

# Setup Supabase (see SUPABASE_QUICK_START.md)
# 1. Create Supabase project
# 2. Run supabase_schema.sql
# 3. Configure .env with credentials
# 4. Seed database
python seed_database.py

# Start backend
python main.py
```

### Option 2: Without Supabase (Fallback Mode)

```bash
pip install -r requirements.txt
python main.py
```

Backend runs on http://localhost:8000

## Database Setup

EquiMind now supports **Supabase** for dynamic entity management:

- **20-person organization** with realistic roles and departments
- **Real-time risk score updates** stored in database
- **Event logging** for security analytics
- **Automatic fallback** to hardcoded data if Supabase unavailable

### Quick Setup (5 minutes)

See **[SUPABASE_QUICK_START.md](SUPABASE_QUICK_START.md)** for fastest setup.

### Detailed Setup

See **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** for comprehensive guide.

### Seed Database

```bash
# Windows
seed-database.bat

# PowerShell
.\seed-database.ps1

# Direct
python seed_database.py
```

## Monitoring Setup

### Start Prometheus + Grafana

**Windows:**
```bash
start-monitoring.bat
```

**PowerShell:**
```powershell
.\start-monitoring.ps1
```

**Manual:**
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)
- Backend Metrics: http://localhost:8000/metrics

## Testing

### Comprehensive Test Suite

```bash
python test_backend.py
```

Or use the batch file:
```bash
run-tests.bat
```

Tests include:
- Status endpoint validation
- Entity CRUD operations
- Event filtering and pagination
- ML prediction accuracy
- Edge cases and error handling
- Load testing (concurrent requests)
- Multi-user simulation
- Stress testing

### Quick curl Tests

```bash
test-curl.bat
```

## API Documentation

Interactive API docs: http://localhost:8000/docs

## Endpoints

### Status & Monitoring
- `GET /status` - System health, event counts, average risk
- `GET /metrics` - Prometheus metrics

### Entities
- `GET /entities` - List all monitored entities (from Supabase or fallback)
- `GET /entity/{id}` - Entity details with 20 most recent events

### Events
- `GET /events?limit=50` - Recent security events (default 50)
- `GET /incidents` - High/critical severity events only

### ML Prediction
- `POST /predict` - Direct ML risk prediction
  ```json
  {
    "proto": "tcp",
    "service": "http",
    "sbytes": 1000,
    "dbytes": 2000,
    ...
  }
  ```

### WebSocket
- `WS /ws/live` - Real-time event stream

## Project Structure

```
backend/
├── main.py          # FastAPI app, WebSocket, REST endpoints
├── models.py        # TensorFlow ML models (MLP + AE)
├── database.py      # Supabase integration
├── entities.py      # Entity management (Supabase + fallback)
├── monitoring.py    # Prometheus metrics
├── simulator.py     # Event generation
├── scorer.py        # Risk computation
├── seed_database.py # Database seeding script
├── requirements.txt # Python dependencies
├── supabase_schema.sql      # Database schema
├── SUPABASE_SETUP.md        # Detailed setup guide
├── SUPABASE_QUICK_START.md  # 5-minute setup
└── models/          # ML model files
    ├── mlp_model.keras
    ├── ae_model.keras
    ├── scaler.pkl
    └── feature_order.pkl
```

## ML Models

**MLP (Multi-Layer Perceptron):**
- Input: 40+ network flow features
- Output: Risk score (0-1)
- Architecture: Dense layers with RobustScaling

**Autoencoder (Optional):**
- Anomaly detection
- Reconstruction error as anomaly score

## Configuration

**Environment Variables (.env file):**
```bash
# Supabase Configuration (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here

# Backend Configuration
MODEL_PATH=models/              # ML model directory
EVENT_INTERVAL_SECONDS=3        # Event generation interval
```

**Database Modes:**
- **Supabase Mode**: Dynamic entities from database (20 users)
- **Fallback Mode**: Hardcoded entities (13 users)

Check mode in `/status` endpoint: `"database_mode": "supabase"` or `"fallback"`

## Development

**Run with auto-reload:**
```bash
uvicorn main:app --reload
```

**Test ML prediction:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"proto":"tcp","service":"http","sbytes":1000,...}'
```

**Monitor WebSocket:**
```bash
# Use wscat or browser console
wscat -c ws://localhost:8000/ws/live
```

## Dependencies

Core:
- fastapi - Web framework
- uvicorn - ASGI server
- tensorflow - ML models
- prometheus-client - Metrics

See `requirements.txt` for full list.

## Monitoring

Prometheus metrics available at `/metrics`:

**Event Metrics:**
- `equimind_events_total` - Counter by severity/decision/category
- `equimind_risk_score` - Histogram of risk scores

**Performance:**
- `equimind_ml_prediction_seconds` - ML inference time
- `equimind_websocket_connections` - Active connections

**Entity Tracking:**
- `equimind_entity_risk_score` - Per-entity risk gauge

## Production Deployment

```bash
# Install production server
pip install gunicorn

# Run with workers
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

## Troubleshooting

**Models not loading:**
- Check `MODEL_PATH` environment variable
- Verify model files exist in `models/` directory
- System will fallback to simulation mode

**Port 8000 in use:**
- Change port: `uvicorn main:app --port 8001`
- Or kill existing process

**WebSocket connection failed:**
- Ensure CORS is configured correctly
- Check firewall settings
- Verify backend is running
