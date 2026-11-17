"""
train.py - Training script for VisionGuard AI quality inspection model.

This script:
1. Checks for the Kaggle casting dataset
2. Loads and augments images
3. Builds a MobileNetV2 transfer learning model
4. Trains the model on the casting dataset
5. Saves the trained model and configuration

Dataset expected at:
    casting_data/
        train/
            ok_front/     <- Good products
            def_front/    <- Defective products
        test/
            ok_front/
            def_front/

How to download the dataset:
    1. Go to: https://www.kaggle.com/datasets/ravirajsinh45/real-life-industrial-dataset-of-casting-product
    2. Download and extract the zip file
    3. Place the 'casting_data' folder inside the 'backend' directory

Run this script with:
    cd backend
    python training/train.py
"""

import os
import sys
import json
import numpy as np

# Suppress TensorFlow info/warning messages for cleaner output
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# ============================================================
# CONFIGURATION - change these if needed
# ============================================================
IMAGE_SIZE = (224, 224)      # MobileNetV2 input size
BATCH_SIZE = 32               # Images per training step
EPOCHS = 8                    # Number of full passes through the training data
LEARNING_RATE = 0.001         # Step size for the optimizer
CONFIDENCE_THRESHOLD = 70.0   # Below this % -> "UNCERTAIN"
# ============================================================

# Paths
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
CONFIG_PATH = os.path.join(MODELS_DIR, "model_config.json")
MODEL_PATH = os.path.join(MODELS_DIR, "visionguard_model.keras")
EVAL_PATH = os.path.join(MODELS_DIR, "evaluation_results.json")
HISTORY_PATH = os.path.join(MODELS_DIR, "training_history.json")


def find_dataset():
    """
    Search for the casting dataset in common locations.
    Returns the path to the dataset root (folder containing train/ and test/).
    """
    # Possible dataset locations to check
    search_paths = [
        os.path.join(BACKEND_DIR, "casting_data"),
        os.path.join(BACKEND_DIR, "dataset", "casting_data"),
        os.path.join(BACKEND_DIR, "data", "casting_data"),
        os.path.join(os.path.dirname(BACKEND_DIR), "casting_data"),
        os.path.join(BACKEND_DIR, "casting_512x512"),  # Sometimes the dataset has this name
    ]

    for path in search_paths:
        if os.path.exists(path):
            # Check if it has the required structure
            train_ok = os.path.exists(os.path.join(path, "train", "ok_front"))
            train_def = os.path.exists(os.path.join(path, "train", "def_front"))
            test_ok = os.path.exists(os.path.join(path, "test", "ok_front"))
            test_def = os.path.exists(os.path.join(path, "test", "def_front"))

            if train_ok and train_def and test_ok and test_def:
                print(f"✓ Dataset found at: {path}")
                return path
            else:
                print(f"  Found folder at {path} but missing required subfolders.")

    return None


def count_images(folder):
    """Count the number of image files in a folder."""
    extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    count = 0
    for fname in os.listdir(folder):
        if os.path.splitext(fname)[1].lower() in extensions:
            count += 1
    return count


def check_dataset(dataset_path):
    """
    Verify the dataset structure and count images in each class.
    Returns True if the dataset looks valid.
    """
    print("\n--- Dataset Verification ---")

    classes = {
        "train/ok_front": "Train - GOOD (ok_front)",
        "train/def_front": "Train - DEFECTIVE (def_front)",
        "test/ok_front": "Test - GOOD (ok_front)",
        "test/def_front": "Test - DEFECTIVE (def_front)"
    }

    all_valid = True
    for rel_path, label in classes.items():
        full_path = os.path.join(dataset_path, rel_path)
        if not os.path.exists(full_path):
            print(f"  ✗ Missing: {rel_path}")
            all_valid = False
        else:
            count = count_images(full_path)
            print(f"  ✓ {label}: {count} images")
            if count == 0:
                print(f"    WARNING: No images found in {rel_path}")
                all_valid = False

    return all_valid


def build_model():
    """
    Build and return a MobileNetV2 transfer learning model.

    Architecture:
    - MobileNetV2 base (pretrained on ImageNet, weights frozen)
    - Global Average Pooling
    - Dropout for regularization
    - Dense(1, sigmoid) for binary classification

    Output:
    - Single sigmoid value: 0.0 = DEFECTIVE, 1.0 = GOOD
    """
    import tensorflow as tf

    print("\n--- Building Model ---")

    # Load MobileNetV2 pretrained on ImageNet, without the top classification layer
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3),
        include_top=False,        # Remove ImageNet classification head
        weights="imagenet"        # Use pretrained weights
    )

    # Freeze the base model - we don't want to change the pretrained weights
    # during the initial training phase
    base_model.trainable = False
    print(f"  Base model: MobileNetV2 ({len(base_model.layers)} layers, frozen)")

    # Build the full model
    model = tf.keras.Sequential([
        base_model,
        tf.keras.layers.GlobalAveragePooling2D(),  # Reduce spatial dimensions
        tf.keras.layers.Dropout(0.3),              # Prevent overfitting
        tf.keras.layers.Dense(128, activation="relu"),  # Feature transformation
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(1, activation="sigmoid")  # Binary output (0=defective, 1=good)
    ])

    # Compile with binary cross-entropy (standard for binary classification)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )

    print(f"  Model compiled with Adam optimizer (lr={LEARNING_RATE})")
    return model, base_model


def train_model(dataset_path):
    """
    Main training function.
    Loads data, trains the model, evaluates it, and saves everything.
    """
    import tensorflow as tf

    print("\n" + "=" * 55)
    print("  VisionGuard AI - Model Training")
    print("=" * 55)

    # Verify dataset
    if not check_dataset(dataset_path):
        print("\nERROR: Dataset validation failed. Check the folder structure.")
        sys.exit(1)

    train_dir = os.path.join(dataset_path, "train")
    test_dir = os.path.join(dataset_path, "test")

    # --------------------------------------------------------
    # Data Augmentation and Loading
    # --------------------------------------------------------
    print("\n--- Setting up Data Loaders ---")

    # Training data with augmentation to increase variety
    train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        preprocessing_function=tf.keras.applications.mobilenet_v2.preprocess_input,
        horizontal_flip=True,           # Randomly flip images horizontally
        rotation_range=10,              # Randomly rotate up to 10 degrees
        zoom_range=0.1,                 # Randomly zoom in/out by 10%
        width_shift_range=0.1,          # Small horizontal shifts
        height_shift_range=0.1,         # Small vertical shifts
    )

    # Test/validation data - no augmentation, just preprocessing
    test_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        preprocessing_function=tf.keras.applications.mobilenet_v2.preprocess_input
    )

    # Load training images
    # class_mode='binary' because we have 2 classes
    # Classes are sorted alphabetically: def_front=0 (DEFECTIVE), ok_front=1 (GOOD)
    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        shuffle=True
    )

    test_generator = test_datagen.flow_from_directory(
        test_dir,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        shuffle=False  # Don't shuffle test data so evaluation is consistent
    )

    print(f"  Training images: {train_generator.samples}")
    print(f"  Test images:     {test_generator.samples}")
    print(f"  Class indices:   {train_generator.class_indices}")
    # Expected: {'def_front': 0, 'ok_front': 1}

    # --------------------------------------------------------
    # Build and Train the Model
    # --------------------------------------------------------
    model, base_model = build_model()

    # Callbacks to save the best model and stop early if not improving
    os.makedirs(MODELS_DIR, exist_ok=True)

    callbacks = [
        # Save the model whenever validation accuracy improves
        tf.keras.callbacks.ModelCheckpoint(
            MODEL_PATH,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1
        ),
        # Stop training early if validation loss doesn't improve for 3 epochs
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=3,
            restore_best_weights=True,
            verbose=1
        )
    ]

    print(f"\n--- Training ---")
    print(f"  Epochs:     {EPOCHS}")
    print(f"  Batch size: {BATCH_SIZE}")
    print(f"  Image size: {IMAGE_SIZE}")
    print()

    # Train the model
    history = model.fit(
        train_generator,
        epochs=EPOCHS,
        validation_data=test_generator,
        callbacks=callbacks,
        verbose=1
    )

    # --------------------------------------------------------
    # Evaluate the Model
    # --------------------------------------------------------
    print("\n--- Evaluating Model ---")
    evaluate_model(model, test_generator, history, train_generator.class_indices)

    # --------------------------------------------------------
    # Save Model Configuration
    # --------------------------------------------------------
    # The class_indices dict maps folder names to label numbers
    # We need to reverse it so we can look up class name by label number
    class_indices = train_generator.class_indices
    # class_indices = {'def_front': 0, 'ok_front': 1}
    # We want: {0: 'DEFECTIVE', 1: 'GOOD'}
    label_map = {
        class_indices.get("def_front", 0): "DEFECTIVE",
        class_indices.get("ok_front", 1): "GOOD"
    }

    config = {
        "class_names": ["DEFECTIVE", "GOOD"],
        "label_map": label_map,
        "class_indices": class_indices,
        "input_size": list(IMAGE_SIZE),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "model_architecture": "MobileNetV2 + GlobalAvgPool + Dense(1, sigmoid)",
        "training_epochs": EPOCHS,
        "batch_size": BATCH_SIZE,
        "learning_rate": LEARNING_RATE
    }

    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)

    print(f"\n✓ Model saved to:  {MODEL_PATH}")
    print(f"✓ Config saved to: {CONFIG_PATH}")
    print("\nTraining complete! You can now start the backend server.")


def evaluate_model(model, test_generator, history, class_indices):
    """
    Evaluate the trained model on the test set and save results.
    Computes accuracy, precision, recall, F1-score, and confusion matrix.
    """
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, confusion_matrix, classification_report
    )

    print("  Running predictions on test set...")

    # Reset the generator to start from the beginning
    test_generator.reset()

    # Get predictions for all test images
    predictions = model.predict(test_generator, verbose=1)
    predicted_labels = (predictions > 0.5).astype(int).flatten()
    true_labels = test_generator.classes

    # Calculate metrics
    accuracy = accuracy_score(true_labels, predicted_labels)
    precision = precision_score(true_labels, predicted_labels, zero_division=0)
    recall = recall_score(true_labels, predicted_labels, zero_division=0)
    f1 = f1_score(true_labels, predicted_labels, zero_division=0)
    cm = confusion_matrix(true_labels, predicted_labels)

    print(f"\n  Test Accuracy:  {accuracy * 100:.2f}%")
    print(f"  Precision:      {precision:.4f}")
    print(f"  Recall:         {recall:.4f}")
    print(f"  F1-Score:       {f1:.4f}")
    print(f"\n  Confusion Matrix:")
    print(f"    {cm}")
    print(f"\n  Classification Report:")
    print(classification_report(true_labels, predicted_labels,
                                 target_names=["DEFECTIVE", "GOOD"]))

    # Save evaluation results
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

    # Save training history
    history_data = {
        "accuracy": [float(v) for v in history.history.get("accuracy", [])],
        "val_accuracy": [float(v) for v in history.history.get("val_accuracy", [])],
        "loss": [float(v) for v in history.history.get("loss", [])],
        "val_loss": [float(v) for v in history.history.get("val_loss", [])]
    }

    with open(HISTORY_PATH, "w") as f:
        json.dump(history_data, f, indent=2)

    print(f"\n  ✓ Evaluation results saved to: {EVAL_PATH}")
    print(f"  ✓ Training history saved to:   {HISTORY_PATH}")


if __name__ == "__main__":
    print("VisionGuard AI - Model Training Script")
    print("=" * 55)

    # Find the dataset
    dataset_path = find_dataset()

    if dataset_path is None:
        print("\n✗ Dataset not found!")
        print("\nTo download the dataset:")
        print("  1. Go to: https://www.kaggle.com/datasets/ravirajsinh45/real-life-industrial-dataset-of-casting-product")
        print("  2. Download the ZIP file")
        print("  3. Extract it")
        print("  4. Place the 'casting_data' folder inside the 'backend' directory")
        print("\nExpected structure:")
        print("  backend/")
        print("    casting_data/")
        print("      train/")
        print("        ok_front/   <- Good product images")
        print("        def_front/  <- Defective product images")
        print("      test/")
        print("        ok_front/")
        print("        def_front/")
        print("\nAfter placing the dataset, run this script again.")
        sys.exit(1)
    else:
        train_model(dataset_path)
