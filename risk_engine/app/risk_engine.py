# app/risk_engine.py

def normalize_ae(error, max_error=1.0):
    return min(error / max_error, 1.0)


def compute_risk(mlp_score):
    
    final_score = mlp_score[0]
    risk_score = int(final_score * 100)

    if risk_score < 30:
        level = "LOW"
    elif risk_score < 60:
        level = "MEDIUM"
    elif risk_score < 80:
        level = "HIGH"
    else:
        level = "CRITICAL"

    return risk_score, level