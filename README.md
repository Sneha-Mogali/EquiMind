# EquiMind - Zero Trust Risk Engine

**GHR HACK 2.0 Submission**

## Problem Statement

Autonomous Zero-Trust Network Architecture with Dynamic Risk Scoring - Design a cybersecurity system implementing a Zero-Trust architecture where every user, device, and application is continuously verified using dynamic risk scoring instead of static authentication rules.

## Solution Overview

EquiMind is a real-time zero-trust security platform that combines:
- 🤖 **TensorFlow ML Models** for threat prediction
- 📊 **Real-time Risk Scoring** with behavioral analysis
- 🔒 **Dynamic Access Control** based on continuous verification
- 💾 **Supabase Database** for dynamic entity management (20-person org)
- 📈 **Prometheus Monitoring** for observability
- ⚡ **WebSocket Streaming** for live security events

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│  Backend API     │◄──►│  ML Models      │
│   (React)       │    │  (FastAPI)       │    │  (TensorFlow)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             ┌──────────────┐    ┌──────────────┐
             │  Supabase    │    │  Prometheus  │
             │  Database    │    │  Monitoring  │
             └──────────────┘    └──────────────┘
```

## Quick Start

### 1. Backend Setup

**Option A: With Supabase (Recommended - 20 dynamic entities)**

```bash
cd backend
pip install -r requirements.txt

# Setup Supabase (5 minutes - see backend/SUPABASE_QUICK_START.md)
# 1. Create project at supabase.com
# 2. Run supabase_schema.sql
# 3. Configure .env with credentials
python seed_database.py

python main.py
```

**Option B: Without Supabase (Fallback - 13 hardcoded entities)**

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs on: http://localhost:8000

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

### 3. Optional: Monitoring

```bash
cd backend
start-monitoring.bat  # Windows
# or
./start-monitoring.ps1  # PowerShell
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

### 4. Optional: Run Tests

```bash
cd backend
python test_backend.py
```

## Key Features

### ✅ Expected Outcomes Delivered

- **Continuous Trust Evaluation**: Real-time ML-based risk scoring for all entities
- **Dynamic Access Control**: Automated ALLOW/CHALLENGE/RESTRICT/BLOCK decisions
- **Real-time Dashboard**: Live security operations center with event streaming
- **Automated Policy Adjustment**: ML model adapts to threat patterns
- **Threat Detection**: Identifies insider threats, lateral movement, and attack chains

### ✅ Key Constraints Met

- **Scalable**: FastAPI + WebSocket architecture supports enterprise scale
- **Explainable**: Risk score breakdown shows contributing factors
- **Low Latency**: <100ms ML inference, non-blocking WebSocket updates
- **Integration Ready**: REST API compatible with existing auth systems

## Recent Improvements

### Monitoring Tab Enhancements
- **Autonomous Actions Tracking**: Real-time display of security actions taken by the system
- **Supabase Integration**: Live monitoring of entities from database with enhanced status tracking
- **Grafana Dashboards**: Embedded monitoring dashboards with system metrics
- **Service Status**: Real-time monitoring of Prometheus and Grafana services

### Threat Intelligence Overhaul
- **Simplified Interface**: Clean, focused threat investigation page
- **Kill Chain Analysis**: Visual representation of attack progression using real events
- **Critical Events**: Real-time display of high-severity security events
- **Event Forensics**: Detailed analysis of network data and risk factors

### Autonomous Actions System
- **Real-time Execution**: Automatic security responses based on risk thresholds
- **Database Logging**: All actions logged to Supabase with full context
- **Lifecycle Management**: Automated cleanup of temporary security states
- **Confidence Tracking**: ML confidence levels influence action decisions

## API Endpoints

- `GET /status` - System health and statistics
- `GET /entities` - List all monitored entities
- `GET /entity/{id}` - Entity details with risk history
- `GET /events` - Recent security events
- `GET /incidents` - High-risk incidents
- `POST /predict` - Direct ML risk prediction
- `GET /metrics` - Prometheus metrics
- `WS /ws/live` - Real-time event stream

## Frontend Pages

- **Mission Control** - Real-time security operations center
- **Entities** - Entity management and risk tracking
- **Threat Intel** - Threat investigation and analysis
- **Policy Studio** - Security policy management
- **Analytics** - Data visualization and insights
- **Monitoring** - Grafana dashboards and metrics
- **User Portal** - User-facing security portal

## Technology Stack

**Backend:**
- FastAPI (async Python web framework)
- TensorFlow (ML models)
- Supabase (PostgreSQL database)
- Prometheus (metrics)
- WebSocket (real-time streaming)

**Frontend:**
- React + Vite
- TailwindCSS
- Recharts (visualization)
- WebSocket client

**Database:**
- Supabase (PostgreSQL)
- 20-person organization structure
- Real-time risk score persistence
- Event logging capability

**ML Models:**
- MLP (Multi-Layer Perceptron) for risk prediction
- Autoencoder for anomaly detection
- UNSW-NB15 dataset for training

## Database Features

### Dynamic Entity Management
- **20-person organization** with realistic roles and departments
- **Real-time updates** - Risk scores persisted to database
- **Automatic fallback** - Works without Supabase (13 hardcoded entities)
- **Easy scaling** - Add entities via database, no code changes

### Bulk Event Logging
- **High Performance** - Events buffered and inserted in batches
- **Configurable** - Flush after 50 events or 2 minutes (configurable)
- **Monitoring** - Real-time buffer status via API
- **Reliable** - Automatic flush on shutdown, error handling with retry

### Organization Structure
- Engineering (4): Backend, Frontend, ML, DevOps
- IT & Security (3): DBA, Security Analyst, IT Support
- Finance (3): Analysts and Managers
- Product & Design (2): PM, UX Designer
- HR & Operations (2): Managers
- External (2): Contractors (higher risk)
- Service Accounts (4): DB, API, Backup, Monitoring

### Setup Guides
- **Quick Start**: `backend/SUPABASE_QUICK_START.md` (5 minutes)
- **Detailed Guide**: `backend/SUPABASE_SETUP.md`
- **Bulk Logging**: `backend/BULK_LOGGING.md`
- **Migration Info**: `SUPABASE_MIGRATION.md`

## Project Structure

```
EquiMind/
├── backend/              # FastAPI backend with ML models
│   ├── main.py          # API server
│   ├── models.py        # TensorFlow ML models
│   ├── monitoring.py    # Prometheus metrics
│   ├── simulator.py     # Event generation
│   ├── scorer.py        # Risk computation
│   ├── entities.py      # Entity management
│   └── models/          # ML model files
├── frontend/            # React frontend
│   └── src/
├── risk_engine/         # Monitoring configs
│   ├── prometheus.yml
│   ├── grafana-dashboard.json
│   └── docker-compose.monitoring.yml
└── shared/              # Shared contracts
```

## Risk Scoring Model

Risk scores (0-100) are computed from:

1. **Network Analysis (33%)**: ML model prediction on network flow patterns
2. **Identity Context (33%)**: MFA status, location, time-of-day
3. **Device Posture (33%)**: Device health and compliance

**Decision Thresholds:**
- 0-40: ALLOW (Low risk)
- 40-65: CHALLENGE (Medium risk - require MFA)
- 65-80: RESTRICT (High risk - limited access)
- 80-100: BLOCK (Critical risk - deny access)

## Monitoring Metrics

Available at `/metrics`:
- `equimind_events_total` - Event counts by severity/decision
- `equimind_risk_score` - Risk score distribution
- `equimind_ml_prediction_seconds` - ML inference latency
- `equimind_websocket_connections` - Active connections
- `equimind_entity_risk_score` - Per-entity risk tracking

Access Grafana dashboards at http://localhost:3001 or via the Monitoring page in the frontend.

## Testing

Run comprehensive test suite:

```bash
cd backend
python test_backend.py
```

Or use quick curl tests:

```bash
cd backend
test-curl.bat
```

See `TESTING.md` for detailed testing guide.

## Development

### Running Tests
```bash
cd backend
pytest
```

### Environment Variables
```bash
MODEL_PATH=models/              # ML model directory
EVENT_INTERVAL_SECONDS=3        # Event generation interval
```

## License

MIT License - See LICENSE file for details

## Team

GHR HACK 2.0 Submission
