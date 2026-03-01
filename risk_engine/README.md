# Monitoring Setup (Optional)

This directory contains Prometheus and Grafana configuration for monitoring EquiMind.

## Quick Start with Docker

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## Manual Setup

### 1. Install Prometheus

Download from https://prometheus.io/download/

Run:
```bash
prometheus --config.file=prometheus.yml
```

### 2. Install Grafana

Download from https://grafana.com/grafana/download

Import dashboard from `grafana-dashboard.json`

## Metrics Available

The backend exposes metrics at http://localhost:8000/metrics

**Key Metrics:**
- `equimind_events_total` - Event counts
- `equimind_risk_score` - Risk distribution
- `equimind_ml_prediction_seconds` - ML performance
- `equimind_websocket_connections` - Active connections
- `equimind_entity_risk_score` - Per-entity risk

## Configuration Files

- `prometheus.yml` - Prometheus scrape config
- `grafana-dashboard.json` - Pre-built Grafana dashboard
- `grafana-datasources.yml` - Grafana data source config
- `docker-compose.monitoring.yml` - Docker orchestration

## Grafana Dashboard Setup

1. Access Grafana at http://localhost:3001
2. Login with admin/admin
3. Go to Dashboards → Import
4. Upload `grafana-dashboard.json`
5. Select Prometheus data source

Or use the automated script:
```bash
python setup-grafana-dashboard.py
```

See `MONITORING_GUIDE.md` for detailed instructions.
