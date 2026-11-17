"""
evaluate.py - Standalone evaluation script for VisionGuard AI.

Use this to re-evaluate the model on the test dataset without retraining.

Run with:
    cd backend
    python training/evaluate.py
"""

import os
import sys
import json
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "visionguard_model.keras")
EVAL_PATH = os.path.join(MODELS_DIR, "evaluation_results.json")


def find_test_dir():
    """Find the test directory in the casting dataset."""
    search_paths = [
        os.path.join(BACKEND_DIR, "casting_data", "test"),
        os.path.join(BACKEND_DIR, "dataset", "casting_data", "test"),
        os.path.join(BACKEND_DIR, "data", "casting_data", "test"),
    ]
    for path in search_paths:
        if os.path.exists(path):
            return path
    return None


def run_evaluation():
    """Load the model and run evaluation on the test set."""
    import tensorflow as tf
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, confusion_matrix, classification_report
    )

    # Check model exists
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: No model found at {MODEL_PATH}")
        print("Please run training/train.py first.")
        sys.exit(1)

    # Find test dataset
    test_dir = find_test_dir()
    if test_dir is None:
        print("ERROR: Test dataset not found.")
        sys.exit(1)

    print(f"Loading model from: {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded.")

    print(f"Test directory: {test_dir}")

    # Load test data
    test_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        preprocessing_function=tf.keras.applications.mobilenet_v2.preprocess_input
    )

    test_generator = test_datagen.flow_from_directory(
        test_dir,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        shuffle=False
    )

    print(f"Test images: {test_generator.samples}")
    print(f"Class indices: {test_generator.class_indices}")

    # Run predictions
    print("Running predictions...")
    predictions = model.predict(test_generator, verbose=1)
    predicted_labels = (predictions > 0.5).astype(int).flatten()
    true_labels = test_generator.classes

    # Calculate metrics
    accuracy = accuracy_score(true_labels, predicted_labels)
    precision = precision_score(true_labels, predicted_labels, zero_division=0)
    recall = recall_score(true_labels, predicted_labels, zero_division=0)
    f1 = f1_score(true_labels, predicted_labels, zero_division=0)
    cm = confusion_matrix(true_labels, predicted_labels)

    print(f"\n{'='*40}")
    print("  EVALUATION RESULTS")
    print(f"{'='*40}")
    print(f"  Accuracy:  {accuracy * 100:.2f}%")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1-Score:  {f1:.4f}")
    print(f"\n  Confusion Matrix:")
    print(f"    {cm.tolist()}")
    print(f"\n  Classification Report:")
    print(classification_report(true_labels, predicted_labels,
                                target_names=["DEFECTIVE", "GOOD"]))

    # Save results
    eval_results = {
        "accuracy": round(float(accuracy * 100), 2),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": cm.tolist(),
        "confusion_matrix_labels": ["DEFECTIVE", "GOOD"],
        "test_samples": len(true_labels)
    }

    with open(EVAL_PATH, "w") as f:
        json.dump(eval_results, f, indent=2)

    print(f"\nResults saved to: {EVAL_PATH}")


if __name__ == "__main__":
    run_evaluation()
