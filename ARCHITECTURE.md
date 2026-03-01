# EquiMind System Architecture

## Overview

EquiMind implements a Zero Trust security architecture with ML-powered dynamic risk scoring. The system continuously evaluates trust for all entities and makes real-time access control decisions.

## System Components

### 1. Backend (FastAPI)

**Location:** `backend/`

**Core Modules:**

- `main.py` - FastAPI application, WebSocket server, REST API
- `models.py` - TensorFlow ML models (MLP + Autoencoder)
- `monitoring.py` - Prometheus metrics instrumentation
- `simulator.py` - Security event generation
- `scorer.py` - Risk score computation engine
- `entities.py` - Entity management and tracking

**Responsibilities:**
- Serve REST API endpoints
- Stream real-time events via WebSocket
- Run ML inference for threat detection
- Compute dynamic risk scores
- Track entity behavior and risk profiles
- Export Prometheus metrics

### 2. Frontend (React)

**Location:** `frontend/`

**Key Features:**
- Real-time security dashboard
- WebSocket client for live event streaming
- Entity risk visualization
- Event timeline and filtering
- System status monitoring

**Tech Stack:**
- React + Vite
- TailwindCSS for styling
- Recharts for data visualization
- WebSocket API for real-time updates

### 3. ML Models

**Location:** `backend/models/`

**Models:**
- `mlp_model.keras` - Multi-Layer Perceptron for risk prediction
- `ae_model.keras` - Autoencoder for anomaly detection
- `scaler.pkl` - Feature scaling parameters
- `feature_order.pkl` - Feature ordering metadata

**Training Data:** UNSW-NB15 network intrusion dataset

### 4. Monitoring (Optional)

**Location:** `risk_engine/`

**Components:**
- Prometheus for metrics collection
- Grafana for visualization
- Docker Compose for orchestration

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  - Dashboard UI                                             │
│  - WebSocket Client                                         │
│  - Real-time Visualization                                  │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/WebSocket
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (FastAPI)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Event Loop (Async)                                  │  │
│  │  - Generate security events every 3s                 │  │
│  │  - Broadcast to WebSocket clients                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Event Generator (simulator.py)                      │  │
│  │  - Create network flow features                      │  │
│  │  - Select entity and context                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ML Inference (models.py)                            │  │
│  │  - Preprocess features                               │  │
│  │  - Run TensorFlow prediction                         │  │
│  │  - Compute base risk score                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Risk Scorer (scorer.py)                             │  │
│  │  - Combine ML score + context                        │  │
│  │  - Apply identity/device factors                     │  │
│  │  - Determine access decision                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Monitoring (monitoring.py)                          │  │
│  │  - Record Prometheus metrics                         │  │
│  │  - Update entity risk gauges                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Prometheus + Grafana (Optional)                │
│  - Metrics collection                                       │
│  - Dashboard visualization                                  │
│  - Alerting                                                 │
└─────────────────────────────────────────────────────────────┘
```

## Risk Scoring Algorithm

### Input Features (40+ network flow features)

**Categorical:**
- Protocol (tcp/udp/icmp)
- Service (http/https/ssh/ftp/dns)
- Connection state (CON/FIN/REQ/RST)

**Numerical:**
- Bytes transferred (source/destination)
- Packet counts
- Connection duration
- Transfer rates
- TCP window sizes
- Jitter, RTT, latency metrics

### Scoring Process

1. **ML Prediction (models.py)**
   - Preprocess features using RobustScalingLayer
   - Run MLP model inference
   - Output: Base risk score (0-1)

2. **Context Enhancement (scorer.py)**
   - Network score (33%): ML prediction weighted by attack category
   - Identity score (33%): MFA status, time-of-day, location
   - Device score (33%): Device posture and compliance

3. **Decision Mapping**
   - 0-40: ALLOW (Low risk)
   - 40-65: CHALLENGE (Medium - require MFA)
   - 65-80: RESTRICT (High - limited access)
   - 80-100: BLOCK (Critical - deny)

## API Endpoints

### REST API

- `GET /status` - System health and statistics
- `GET /entities` - List all monitored entities
- `GET /entity/{id}` - Entity details with risk history
- `GET /events?limit=N` - Recent security events
- `GET /incidents` - High-risk incidents only
- `POST /predict` - Direct ML prediction
- `GET /metrics` - Prometheus metrics

### WebSocket

- `WS /ws/live` - Real-time event stream
  - Sends last 10 events on connect
  - Broadcasts new events as they occur

## Monitoring Metrics

**Event Metrics:**
- `equimind_events_total{severity, decision, attack_category}` - Event counter
- `equimind_risk_score` - Risk score histogram

**Performance Metrics:**
- `equimind_ml_prediction_seconds` - ML inference latency
- `equimind_websocket_connections` - Active WebSocket clients

**Entity Metrics:**
- `equimind_entity_risk_score{entity_id, entity_name}` - Per-entity risk

## Security Considerations

1. **Zero Trust Principles**
   - Never trust, always verify
   - Continuous authentication
   - Least privilege access

2. **ML Model Security**
   - Models loaded at startup
   - Fallback to simulation if models unavailable
   - Input validation and sanitization

3. **WebSocket Security**
   - CORS enabled for development
   - Connection tracking and cleanup
   - Error handling for disconnections

4. **Data Privacy**
   - No PII stored in logs
   - Metrics aggregated by entity ID
   - Event log limited to 200 entries

## Scalability

**Current Design:**
- Single-process FastAPI server
- In-memory event storage (200 events)
- Synchronous ML inference

**Production Recommendations:**
- Deploy with Gunicorn/Uvicorn workers
- Add Redis for event caching
- Use message queue (RabbitMQ/Kafka) for event streaming
- Implement ML model serving (TensorFlow Serving)
- Add database for persistent storage
- Load balancer for horizontal scaling

## Configuration

**Environment Variables:**
- `MODEL_PATH` - ML model directory (default: "models/")
- `EVENT_INTERVAL_SECONDS` - Event generation rate (default: 3)

**CORS:**
- Currently allows all origins (development)
- Restrict in production

## Deployment

**Development:**
```bash
cd backend && python main.py
cd frontend && npm run dev
```

**Production:**
```bash
# Backend with Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app

# Frontend build
cd frontend && npm run build
# Serve dist/ with nginx
```

## Future Enhancements

1. **Data Layer**
   - PostgreSQL for entity/event persistence
   - Redis for caching and session management

2. **Advanced ML**
   - Online learning for model updates
   - Ensemble models for improved accuracy
   - Explainable AI (SHAP values)

3. **Integration**
   - LDAP/Active Directory integration
   - SIEM integration (Splunk, ELK)
   - SSO/SAML support

4. **Features**
   - User behavior analytics (UBA)
   - Threat intelligence feeds
   - Automated incident response
   - Policy management UI
