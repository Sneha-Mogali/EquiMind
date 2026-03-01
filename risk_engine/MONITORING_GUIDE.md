# 📊 EquiMind Monitoring Guide

## 🎯 What Am I Looking At?

### Prometheus (http://localhost:9090)
Think of Prometheus as your **data collector**. It's constantly asking your EquiMind backend: "Hey, what's happening right now?"

### Grafana (http://localhost:3001)
Grafana is your **pretty dashboard maker**. It takes Prometheus data and makes beautiful charts.

---

## 🚀 Quick Start - What to Do Right Now

### 1. Check Prometheus is Working
Go to **http://localhost:9090/targets**
- You should see `equimind-risk-engine` with status **UP** ✅
- If it says **DOWN** ❌, your backend isn't running

### 2. Try These Fun Queries in Prometheus

**Go to http://localhost:9090/graph and paste these:**

```promql
# See if your system is alive
up

# Count total security events  
sum(equimind_events_total)

# Events happening right now (per second)
rate(equimind_events_total[1m])

# How fast is your ML model?
equimind_ml_prediction_seconds

# Risk scores of all users
equimind_entity_risk_score
```

### 3. Set Up Grafana Dashboard

**Go to http://localhost:3001** (admin/admin)

1. **Import Dashboard:**
   - Click **+** → **Import**
   - Copy/paste the content from `grafana-dashboard.json`
   - Click **Load**

2. **Or Create Your Own:**
   - Click **+** → **Dashboard** → **Add Panel**
   - In query box, try: `sum(equimind_events_total)`
   - Click **Apply**

---

## 🎮 Cool Things to Monitor

### 🚨 Security Metrics
```promql
# Blocked attacks in last 5 minutes
increase(equimind_blocked_events_total[5m])

# High-risk events
sum(rate(equimind_events_total{severity="CRITICAL"}[5m]))

# Attack categories
sum by (attack_category) (equimind_events_total)
```

### ⚡ Performance Metrics
```promql
# ML model speed (lower is better)
histogram_quantile(0.95, equimind_ml_prediction_seconds_bucket)

# API response times
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Memory usage
process_resident_memory_bytes
```

### 👥 User Behavior
```promql
# Riskiest users right now
topk(5, equimind_entity_risk_score)

# Users with increasing risk
increase(equimind_entity_risk_score[10m]) > 0
```

---

## 🎨 Making It Pretty in Grafana

### Panel Types to Use:
- **Stat Panels**: For single numbers (total events, system status)
- **Time Series**: For trends over time (events per minute)
- **Pie Charts**: For breakdowns (events by severity)
- **Heatmaps**: For risk score distributions

### Pro Tips:
1. **Set Auto-Refresh**: Top right → 5s or 10s
2. **Use Variables**: Create dropdown for selecting users
3. **Set Alerts**: Get notified when risk scores spike
4. **Color Code**: Red for critical, yellow for medium, green for low

---

## 🔍 What Each Metric Means

| Metric | What It Tells You |
|--------|-------------------|
| `equimind_events_total` | How many security events happened |
| `equimind_risk_score` | Distribution of risk scores (0-100) |
| `equimind_ml_prediction_seconds` | How fast your AI is thinking |
| `equimind_websocket_connections` | How many people watching live |
| `equimind_entity_risk_score` | Individual user risk levels |
| `equimind_blocked_events_total` | How many threats you stopped |

---

## 🚨 Alerts You Should Set Up

### In Grafana:
1. **High Risk User**: `equimind_entity_risk_score > 80`
2. **System Down**: `up{job="equimind-risk-engine"} == 0`
3. **Too Many Blocks**: `rate(equimind_blocked_events_total[5m]) > 0.1`
4. **Slow ML**: `equimind_ml_prediction_seconds > 1.0`

---

## 🎯 Real-World Use Cases

### Security Team Dashboard:
- Live threat feed
- Risk score trends
- Attack pattern analysis
- System health monitoring

### DevOps Dashboard:
- API performance
- ML model latency
- System resource usage
- Error rates

### Executive Dashboard:
- Security posture summary
- Threat landscape overview
- System availability
- Key risk indicators

---

## 🛠️ Troubleshooting

**No Data in Grafana?**
- Check Prometheus targets are UP
- Verify data source connection
- Try queries in Prometheus first

**Prometheus Can't Reach Backend?**
- Make sure backend is running on port 8000
- Check Docker networking (host.docker.internal)
- Verify /metrics endpoint works: http://localhost:8000/metrics

**Grafana Won't Load?**
- Check Docker container is running
- Try different browser
- Clear browser cache

---

## 🎉 You're Now a Monitoring Pro!

The beauty of this setup is that it's **real-time**. As your EquiMind system processes security events, you can watch the metrics change live. It's like having X-ray vision into your security system!

**Next Steps:**
1. Create custom dashboards for your specific needs
2. Set up alerting for critical events  
3. Export dashboards to share with your team
4. Explore advanced PromQL queries