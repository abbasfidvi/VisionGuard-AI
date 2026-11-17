"""
model.py - Loads the trained TensorFlow model and provides prediction functionality.

This module handles:
- Loading the saved Keras model from disk
- Keeping the model in memory so it doesn't reload on every request
- Providing a simple predict function for the prediction route
"""

import os
import json
import numpy as np

# Model and config paths
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "visionguard_model.keras")
CONFIG_PATH = os.path.join(MODELS_DIR, "model_config.json")
EVAL_PATH = os.path.join(MODELS_DIR, "evaluation_results.json")
HISTORY_PATH = os.path.join(MODELS_DIR, "training_history.json")

# Global model variable - loaded once when the server starts
_model = None
_model_config = None


def is_model_available():
    """Check if the trained model file exists on disk."""
    return os.path.exists(MODEL_PATH)


def load_model():
    """
    Load the Keras model from disk into memory.
    Uses a global variable so we only load it once.

    Returns:
        True if loaded successfully, False otherwise.
    """
    global _model, _model_config

    if not is_model_available():
        print("WARNING: Model file not found. Please train the model first.")
        return False

    try:
        import tensorflow as tf

        print(f"Loading model from: {MODEL_PATH}")
        _model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully.")

        # Load config (class names, thresholds, etc.)
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r") as f:
                _model_config = json.load(f)
        else:
            # Fallback config if file is missing
            _model_config = {
                "class_names": ["DEFECTIVE", "GOOD"],
                "input_size": [224, 224],
                "confidence_threshold": 70.0
            }

        return True

    except Exception as e:
        print(f"Error loading model: {e}")
        _model = None
        return False


def get_model():
    """Return the loaded model (or None if not loaded)."""
    return _model


def get_model_config():
    """Return the model configuration dictionary."""
    return _model_config


def is_model_loaded():
    """Check if the model is currently loaded in memory."""
    return _model is not None


def predict_image(preprocessed_image):
    """
    Run the model on a preprocessed image and return class probabilities.

    Args:
        preprocessed_image: numpy array of shape (1, 224, 224, 3), 
                           already preprocessed for MobileNetV2.

    Returns:
        Dictionary with prediction details, or None if model not loaded.
    """
    if _model is None:
        return None

    config = _model_config or {}
    class_names = config.get("class_names", ["DEFECTIVE", "GOOD"])
    threshold = config.get("confidence_threshold", 70.0)

    # Run the model - output is a single sigmoid value between 0 and 1
    raw_output = _model.predict(preprocessed_image, verbose=0)
    score = float(raw_output[0][0])  # Single sigmoid output

    # Score close to 1.0 = GOOD, close to 0.0 = DEFECTIVE
    # (This matches how we set up training: label 1 = ok_front = GOOD)
    good_probability = score * 100
    defective_probability = (1 - score) * 100

    # Determine predicted class
    if score >= 0.5:
        predicted_class = "GOOD"
        confidence = good_probability
    else:
        predicted_class = "DEFECTIVE"
        confidence = defective_probability

    # Check confidence threshold - uncertain if below threshold
    is_uncertain = confidence < threshold

    # Determine decision
    if is_uncertain:
        decision = "UNCERTAIN"
        rejection_signal = False
    elif predicted_class == "GOOD":
        decision = "ACCEPT"
        rejection_signal = False
    else:
        decision = "REJECT"
        rejection_signal = True

    return {
        "prediction": predicted_class,
        "confidence": round(confidence, 2),
        "decision": decision,
        "rejection_signal": rejection_signal,
        "is_uncertain": is_uncertain,
        "probabilities": {
            "GOOD": round(good_probability, 2),
            "DEFECTIVE": round(defective_probability, 2)
        }
    }


def get_evaluation_results():
    """
    Load and return the saved model evaluation metrics.

    Returns:
        Dictionary with accuracy, precision, recall, f1, confusion matrix.
        None if evaluation results don't exist.
    """
    if not os.path.exists(EVAL_PATH):
        return None

    with open(EVAL_PATH, "r") as f:
        return json.load(f)


def get_training_history():
    """
    Load and return training history (loss and accuracy per epoch).

    Returns:
        Dictionary with training history data, or None if not available.
    """
    if not os.path.exists(HISTORY_PATH):
        return None

    with open(HISTORY_PATH, "r") as f:
        return json.load(f)


def get_model_info():
    """
    Return complete model information including config and evaluation results.
    """
    info = {
        "model_available": is_model_available(),
        "model_loaded": is_model_loaded(),
        "model_path": MODEL_PATH,
        "evaluation": get_evaluation_results(),
        "training_history": get_training_history()
    }

    if _model_config:
        info.update(_model_config)

    return info
