# app/inference.py

import tensorflow as tf
import numpy as np

class RobustScalingLayer(tf.keras.layers.Layer):
    def __init__(self, median, iqr, **kwargs):
        super().__init__(**kwargs)

        # 🔥 Handle Keras serialized numpy format
        if isinstance(median, dict) and "config" in median:
            median = median["config"]["value"]

        if isinstance(iqr, dict) and "config" in iqr:
            iqr = iqr["config"]["value"]

        # Convert to numpy float32
        self.median = np.array(median, dtype=np.float32)
        self.iqr = np.array(iqr, dtype=np.float32)

    def build(self, input_shape):
        self.median_tensor = tf.constant(self.median, dtype=tf.float32)
        self.iqr_tensor = tf.constant(self.iqr, dtype=tf.float32)

    def call(self, inputs):
        return (inputs - self.median_tensor) / (self.iqr_tensor + 1e-8)

    def get_config(self):
        config = super().get_config()
        config.update({
            "median": self.median.tolist(),
            "iqr": self.iqr.tolist(),
        })
        return config
    
mlp_model = tf.keras.models.load_model(
    "./models/mlp_model.keras",
    custom_objects={
        "RobustScalingLayer": RobustScalingLayer
    }
)

categorical_cols = ["proto", "service", "state"]

robust_features = [
    "sbytes", "dbytes",
    "stcpb", "dtcpb",
    "response_body_len",
    "sloss", "dloss"
]

standard_features = [
    "spkts", "dpkts",
    "swin", "dwin",
    "dmean",
    "ct_src_dport_ltm",
    "ct_dst_sport_ltm",
    "trans_depth",
    "ct_ftp_cmd",
    "ct_flw_http_mthd"
]

binary_features = [
    "is_ftp_login",
    "is_sm_ips_ports"
]

flow_features = [
    "dur", "rate", "sload", "dload",
    "sinpkt", "dinpkt",
    "sjit", "djit",
    "tcprtt", "synack", "ackdat"
]


def preprocess(input_json):

    x_dict = {
        "proto": np.array([input_json["proto"]], dtype=object),
        "service": np.array([input_json["service"]], dtype=object),
        "state": np.array([input_json["state"]], dtype=object),
        "attack_cat": np.array([input_json["attack_cat"]], dtype=object),

        "standard": np.array([[input_json[f] for f in standard_features]], dtype="float32"),
        "robust": np.array([[input_json[f] for f in robust_features]], dtype="float32"),
        "flow": np.array([[input_json[f] for f in flow_features]], dtype="float32"),
        "binary": np.array([[input_json[f] for f in binary_features]], dtype="float32"),
    }

    return x_dict


def predict_mlp(x_dict):
    pred = mlp_model.predict(x_dict, verbose=0)

    # If last layer is sigmoid
    return float(pred[0][0])