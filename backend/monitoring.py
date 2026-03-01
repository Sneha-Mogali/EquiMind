from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from prometheus_fastapi_instrumentator import Instrumentator
from fastapi import Response
import time

# Event metrics
events_total = Counter(
    'equimind_events_total',
    'Total number of security events processed',
    ['severity', 'decision', 'attack_category']
)

risk_score_histogram = Histogram(
    'equimind_risk_score',
    'Distribution of risk scores',
    buckets=[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
)

ml_prediction_time = Histogram(
    'equimind_ml_prediction_seconds',
    'Time spent on ML predictions'
)

active_websocket_connections = Gauge(
    'equimind_websocket_connections',
    'Number of active WebSocket connections'
)

entity_risk_scores = Gauge(
    'equimind_entity_risk_score',
    'Current risk score per entity',
    ['entity_id', 'entity_name']
)

ml_model_predictions = Counter(
    'equimind_ml_predictions_total',
    'Total ML model predictions',
    ['model_version']
)

blocked_events = Counter(
    'equimind_blocked_events_total',
    'Total blocked events',
    ['reason']
)

def record_event(event_data):
    """Record metrics for a security event"""
    events_total.labels(
        severity=event_data.get('severity', 'UNKNOWN'),
        decision=event_data.get('decision', 'UNKNOWN'),
        attack_category=event_data.get('attack_cat', 'UNKNOWN')
    ).inc()
    risk_score_histogram.observe(event_data.get('risk_score', 0))
    if event_data.get('decision') == 'BLOCK':
        blocked_events.labels(reason='high_risk').inc()

def record_ml_prediction(prediction_time, model_version="2.0.0"):
    """Record ML prediction metrics"""
    ml_prediction_time.observe(prediction_time)
    ml_model_predictions.labels(model_version=model_version).inc()

def update_websocket_connections(count):
    """Update WebSocket connection count"""
    active_websocket_connections.set(count)

def update_entity_risk_scores(entities):
    """Update entity risk score metrics"""
    for entity in entities:
        entity_risk_scores.labels(
            entity_id=entity.get('id', 'unknown'),
            entity_name=entity.get('name', 'unknown')
        ).set(entity.get('risk_score', 0))

def setup_monitoring(app):
    """Setup Prometheus monitoring for FastAPI app"""
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=[".*admin.*", "/metrics"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="equimind_requests_inprogress",
        inprogress_labels=True,
    )
    
    # Instrument the app
    instrumentator.instrument(app)
    
    # Expose metrics endpoint
    instrumentator.expose(app, endpoint="/metrics", include_in_schema=False)
    
    print("INFO:     Prometheus metrics enabled at /metrics")
    
    return instrumentator

def monitor_ml_prediction(func):
    """Decorator to monitor ML prediction functions"""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            prediction_time = time.time() - start_time
            record_ml_prediction(prediction_time)
            return result
        except Exception as e:
            prediction_time = time.time() - start_time
            record_ml_prediction(prediction_time)
            raise e
    return wrapper
