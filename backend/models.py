import os
import random
import time
import tensorflow as tf
import numpy as np
import shap

# TensorFlow models - these will hold the actual model objects
mlp_model = None
ae_model = None
shap_explainer = None

ATTACK_CATS = ["Normal", "Exploits", "Fuzzers", "DoS", "Recon", "Backdoors", "Generic", "Probe", "R2L", "U2R"]

# Feature definitions for ML model
categorical_cols = ["proto", "service", "state"]
robust_features = ["sbytes", "dbytes", "stcpb", "dtcpb", "response_body_len", "sloss", "dloss"]
standard_features = ["spkts", "dpkts", "swin", "dwin", "dmean", "ct_src_dport_ltm", "ct_dst_sport_ltm", "trans_depth", "ct_ftp_cmd", "ct_flw_http_mthd"]
binary_features = ["is_ftp_login", "is_sm_ips_ports"]
flow_features = ["dur", "rate", "sload", "dload", "sinpkt", "dinpkt", "sjit", "djit", "tcprtt", "synack", "ackdat"]

# Performance tracking
prediction_times = []
MAX_PREDICTION_HISTORY = 100

class RobustScalingLayer(tf.keras.layers.Layer):
    def __init__(self, median, iqr, **kwargs):
        super().__init__(**kwargs)
        if isinstance(median, dict) and "config" in median:
            median = median["config"]["value"]
        if isinstance(iqr, dict) and "config" in iqr:
            iqr = iqr["config"]["value"]
        self.median = np.array(median, dtype=np.float32)
        self.iqr = np.array(iqr, dtype=np.float32)

    def build(self, input_shape):
        self.median_tensor = tf.constant(self.median, dtype=tf.float32)
        self.iqr_tensor = tf.constant(self.iqr, dtype=tf.float32)

    def call(self, inputs):
        return (inputs - self.median_tensor) / (self.iqr_tensor + 1e-8)

    def get_config(self):
        config = super().get_config()
        config.update({"median": self.median.tolist(), "iqr": self.iqr.tolist()})
        return config

def load_models():
    global mlp_model, ae_model, shap_explainer
    model_path = os.getenv("MODEL_PATH", "models/")
    try:
        mlp_model = tf.keras.models.load_model(
            os.path.join(model_path, "mlp_model.keras"),
            custom_objects={"RobustScalingLayer": RobustScalingLayer}
        )
        print("INFO:     TensorFlow MLP model loaded successfully")
        
        # Initialize SHAP explainer with a small background dataset
        try:
            # Create a small background dataset for SHAP
            background_data = []
            for _ in range(10):  # Small background for performance
                sample = {
                    "proto": "tcp", "service": "http", "state": "CON", "attack_cat": "Normal",
                    "dur": 1.0, "sbytes": 1000, "dbytes": 2000, "rate": 100.0,
                    "sload": 500.0, "dload": 1000.0, "spkts": 10, "dpkts": 10,
                    "swin": 8192, "dwin": 8192, "stcpb": 0, "dtcpb": 0,
                    "response_body_len": 500, "sloss": 0, "dloss": 0, "dmean": 100,
                    "ct_src_dport_ltm": 1, "ct_dst_sport_ltm": 1, "trans_depth": 1,
                    "ct_ftp_cmd": 0, "ct_flw_http_mthd": 1, "is_ftp_login": 0.0,
                    "is_sm_ips_ports": 0.0, "sinpkt": 100.0, "dinpkt": 100.0,
                    "sjit": 10.0, "djit": 10.0, "tcprtt": 50.0, "synack": 20.0, "ackdat": 30.0
                }
                background_data.append(preprocess(sample))
            
            # Create SHAP explainer
            def model_predict(data_list):
                predictions = []
                for data in data_list:
                    pred = mlp_model.predict(data, verbose=0)
                    predictions.append(pred[0][0])
                return np.array(predictions)
            
            shap_explainer = shap.Explainer(model_predict, background_data[:5])  # Use first 5 as background
            print("INFO:     SHAP explainer initialized successfully")
        except Exception as e:
            print(f"WARNING:  SHAP explainer initialization failed: {e}")
            shap_explainer = None
        
        try:
            ae_model = tf.keras.models.load_model(os.path.join(model_path, "ae_model.keras"))
            print("INFO:     Autoencoder model loaded successfully")
        except Exception:
            print("INFO:     Autoencoder model not found, using MLP only")
    except Exception as e:
        print(f"WARNING:  TensorFlow models not found ({e}). Running in simulation mode.")

def preprocess(input_json: dict) -> dict:
    """Preprocess input for TensorFlow model"""
    x_dict = {
        "proto": np.array([input_json.get("proto", "tcp")], dtype=object),
        "service": np.array([input_json.get("service", "http")], dtype=object),
        "state": np.array([input_json.get("state", "CON")], dtype=object),
        "attack_cat": np.array([input_json.get("attack_cat", "Normal")], dtype=object),
        "standard": np.array([[input_json.get(f, 0.0) for f in standard_features]], dtype="float32"),
        "robust": np.array([[input_json.get(f, 0.0) for f in robust_features]], dtype="float32"),
        "flow": np.array([[input_json.get(f, 0.0) for f in flow_features]], dtype="float32"),
        "binary": np.array([[input_json.get(f, 0.0) for f in binary_features]], dtype="float32"),
    }
    return x_dict

def predict_mlp(x_dict: dict) -> float:
        pred = mlp_model.predict(x_dict, verbose=0)
        return float(pred[0][0])

def compute_risk(mlp_score) -> tuple:
    """Compute risk score and level from ML prediction - SINGLE SOURCE OF TRUTH"""
    if isinstance(mlp_score, list):
        final_score = mlp_score[0]
    else:
        final_score = mlp_score
    
    risk_score = int(final_score * 100)
    
    # Single source of truth for risk level thresholds
    if risk_score < 30:
        level = "LOW"
    elif risk_score < 50:
        level = "MEDIUM"
    elif risk_score < 65:
        level = "HIGH"
    else:
        level = "CRITICAL"
    
    return risk_score, level

def get_risk_level_from_score(risk_score: float) -> str:
    """Get risk level from a risk score - uses same thresholds as compute_risk"""
    if risk_score < 30:
        return "low"
    elif risk_score < 50:
        return "medium"
    elif risk_score < 65:
        return "high"
    else:
        return "critical"

def predict(features: dict) -> dict:
    """Main prediction function with TensorFlow models"""
    global prediction_times
    start_time = time.time()
    
    if mlp_model:
        try:
            x = preprocess(features)
            mlp_score = predict_mlp(x)
            risk_score, risk_level = compute_risk(mlp_score)
            prediction_time = time.time() - start_time
            
            # Track prediction times for performance metrics
            prediction_times.append(prediction_time)
            if len(prediction_times) > MAX_PREDICTION_HISTORY:
                prediction_times.pop(0)
            
            return {
                "attack_cat": features.get("attack_cat", "Normal"),
                "confidence": round(mlp_score, 3),
                "anomaly_score": round(mlp_score, 3),
                "is_attack": mlp_score > 0.5,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "mlp_score": round(mlp_score, 4),
                "prediction_time": round(prediction_time, 4)
            }
        except Exception as e:
            print(f"Inference error: {e}")
    
    # Simulation fallback
    is_attack = random.random() > 0.70
    attack_cat = random.choice(ATTACK_CATS[1:]) if is_attack else "Normal"
    mlp_score = random.uniform(0.6, 0.95) if is_attack else random.uniform(0.0, 0.4)
    risk_score = int(mlp_score * 100)
    risk_score, level = compute_risk(mlp_score)
    
    prediction_time = time.time() - start_time
    prediction_times.append(prediction_time)
    if len(prediction_times) > MAX_PREDICTION_HISTORY:
        prediction_times.pop(0)
    
    return {
        "attack_cat": attack_cat,
        "confidence": round(random.uniform(0.6, 0.97), 3),
        "anomaly_score": round(mlp_score, 3),
        "is_attack": is_attack,
        "risk_score": risk_score,
        "risk_level": level,
        "mlp_score": round(mlp_score, 4)
    }

def get_feature_importance(features: dict) -> dict:
    """Get SHAP feature importance for a prediction"""
    global shap_explainer
    
    if not shap_explainer or not mlp_model:
        # Return mock data if SHAP is not available
        feature_names = list(features.keys())[:10]  # Top 10 features
        mock_values = [random.uniform(-0.5, 0.5) for _ in feature_names]
        return {
            "feature_names": feature_names,
            "shap_values": mock_values,
            "base_value": 0.5,
            "prediction": random.uniform(0.3, 0.8),
            "source": "mock"
        }
    
    try:
        # Preprocess the input
        x = preprocess(features)
        
        # Get SHAP values
        shap_values = shap_explainer([x])
        
        # Extract feature names and values
        feature_names = []
        shap_vals = []
        
        # Flatten the SHAP values and create feature names
        for key, values in x.items():
            if key == "proto":
                feature_names.append("proto")
                shap_vals.append(float(shap_values.values[0][0]))  # First categorical
            elif key == "service":
                feature_names.append("service")
                shap_vals.append(float(shap_values.values[0][1]))  # Second categorical
            elif key == "state":
                feature_names.append("state")
                shap_vals.append(float(shap_values.values[0][2]))  # Third categorical
            elif key in ["standard", "robust", "flow", "binary"]:
                # For numerical features, use the feature names
                if key == "standard":
                    for i, fname in enumerate(standard_features):
                        if len(shap_vals) < len(shap_values.values[0]):
                            feature_names.append(fname)
                            shap_vals.append(float(shap_values.values[0][len(shap_vals)]))
                elif key == "robust":
                    for i, fname in enumerate(robust_features):
                        if len(shap_vals) < len(shap_values.values[0]):
                            feature_names.append(fname)
                            shap_vals.append(float(shap_values.values[0][len(shap_vals)]))
                elif key == "flow":
                    for i, fname in enumerate(flow_features):
                        if len(shap_vals) < len(shap_values.values[0]):
                            feature_names.append(fname)
                            shap_vals.append(float(shap_values.values[0][len(shap_vals)]))
                elif key == "binary":
                    for i, fname in enumerate(binary_features):
                        if len(shap_vals) < len(shap_values.values[0]):
                            feature_names.append(fname)
                            shap_vals.append(float(shap_values.values[0][len(shap_vals)]))
        
        # Get model prediction
        prediction = float(mlp_model.predict(x, verbose=0)[0][0])
        
        return {
            "feature_names": feature_names,
            "shap_values": shap_vals,
            "base_value": float(shap_values.base_values[0]),
            "prediction": prediction,
            "source": "shap"
        }
        
    except Exception as e:
        print(f"SHAP analysis error: {e}")
        # Return mock data on error
        feature_names = list(features.keys())[:10]
        mock_values = [random.uniform(-0.5, 0.5) for _ in feature_names]
        return {
            "feature_names": feature_names,
            "shap_values": mock_values,
            "base_value": 0.5,
            "prediction": random.uniform(0.3, 0.8),
            "source": "mock_error"
        }

def get_model_weights() -> dict:
    """Get model layer weights and architecture info"""
    if not mlp_model:
        return {
            "layers": [],
            "total_parameters": 0,
            "trainable_parameters": 0,
            "source": "mock"
        }
    
    try:
        layers_info = []
        total_params = 0
        trainable_params = 0
        
        for i, layer in enumerate(mlp_model.layers):
            layer_info = {
                "name": layer.name,
                "type": layer.__class__.__name__,
                "input_shape": str(layer.input_shape) if hasattr(layer, 'input_shape') else "N/A",
                "output_shape": str(layer.output_shape) if hasattr(layer, 'output_shape') else "N/A",
                "parameters": layer.count_params(),
                "trainable": layer.trainable
            }
            
            # Get weights if available
            if hasattr(layer, 'get_weights') and layer.get_weights():
                weights = layer.get_weights()
                if len(weights) > 0:
                    # Get weight statistics
                    weight_matrix = weights[0]  # First weight matrix
                    layer_info["weight_stats"] = {
                        "mean": float(np.mean(weight_matrix)),
                        "std": float(np.std(weight_matrix)),
                        "min": float(np.min(weight_matrix)),
                        "max": float(np.max(weight_matrix)),
                        "shape": list(weight_matrix.shape)
                    }
                    
                    # Get bias if available
                    if len(weights) > 1:
                        bias = weights[1]
                        layer_info["bias_stats"] = {
                            "mean": float(np.mean(bias)),
                            "std": float(np.std(bias)),
                            "min": float(np.min(bias)),
                            "max": float(np.max(bias)),
                            "shape": list(bias.shape)
                        }
            
            layers_info.append(layer_info)
            total_params += layer_info["parameters"]
            if layer_info["trainable"]:
                trainable_params += layer_info["parameters"]
        
        return {
            "layers": layers_info,
            "total_parameters": total_params,
            "trainable_parameters": trainable_params,
            "model_summary": {
                "input_shape": str(mlp_model.input_shape) if hasattr(mlp_model, 'input_shape') else "N/A",
                "output_shape": str(mlp_model.output_shape) if hasattr(mlp_model, 'output_shape') else "N/A",
                "optimizer": mlp_model.optimizer.__class__.__name__ if hasattr(mlp_model, 'optimizer') else "N/A"
            },
            "source": "model"
        }
        
    except Exception as e:
        print(f"Model weights extraction error: {e}")
        return {
            "layers": [],
            "total_parameters": 0,
            "trainable_parameters": 0,
            "error": str(e),
            "source": "error"
        }

def get_model_performance_stats():
    """Get actual model performance statistics"""
    if not prediction_times:
        return {
            "prediction_time": 0.0,
            "batch_avg_time": 0.0,
            "min_time": 0.0,
            "max_time": 0.0,
            "total_predictions": 0
        }
    
    return {
        "prediction_time": round(sum(prediction_times) / len(prediction_times), 4),
        "batch_avg_time": round(sum(prediction_times) / len(prediction_times), 4),
        "min_time": round(min(prediction_times), 4),
        "max_time": round(max(prediction_times), 4),
        "total_predictions": len(prediction_times)
    }