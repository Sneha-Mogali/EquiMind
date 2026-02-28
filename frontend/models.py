import os
import random
import joblib
import numpy as np

classifier   = None
categorizer  = None
anomaly_model = None

ATTACK_CATS = ["Normal", "Exploits", "Fuzzers", "DoS", "Recon", "Backdoors", "Generic"]

def load_models():
    global classifier, categorizer, anomaly_model
    path = os.getenv("MODEL_PATH", "model_files/")
    try:
        classifier    = joblib.load(os.path.join(path, "classifier.pkl"))
        categorizer   = joblib.load(os.path.join(path, "categorizer.pkl"))
        anomaly_model = joblib.load(os.path.join(path, "anomaly_scorer.pkl"))
        print("INFO:     Models loaded successfully")
    except Exception as e:
        print(f"WARNING:  Models not found ({e}). Running in simulation mode.")

def predict(features: dict) -> dict:
    # If models are loaded use them, else simulate
    if classifier and categorizer and anomaly_model:
        try:
            X = np.array(list(features.values())).reshape(1, -1)
            is_attack   = classifier.predict(X)[0]
            attack_cat  = categorizer.predict(X)[0] if is_attack else "Normal"
            anomaly_raw = anomaly_model.decision_function(X)[0]
            # Normalize anomaly score 0-1
            anomaly_score = float(np.clip((anomaly_raw + 0.5) / 1.0, 0, 1))
            confidence = float(max(classifier.predict_proba(X)[0]))
            return {
                "attack_cat": str(attack_cat),
                "confidence": round(confidence, 3),
                "anomaly_score": round(anomaly_score, 3),
                "is_attack": bool(is_attack),
            }
        except Exception as e:
            print(f"Inference error: {e}")

    # Simulation fallback
    is_attack = random.random() > 0.70
    attack_cat = random.choice(ATTACK_CATS[1:]) if is_attack else "Normal"
    return {
        "attack_cat": attack_cat,
        "confidence": round(random.uniform(0.6, 0.97), 3),
        "anomaly_score": round(random.uniform(0.0, 1.0), 3),
        "is_attack": is_attack,
    }