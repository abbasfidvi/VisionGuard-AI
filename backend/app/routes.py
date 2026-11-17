"""
routes.py - All FastAPI route definitions for VisionGuard AI.

Routes:
    GET  /api/health        - Backend status and model status
    POST /api/predict       - Upload image and get prediction
    GET  /api/history       - Get all past inspections
    DELETE /api/history     - Clear all inspection history
    GET  /api/stats         - Get dashboard statistics
    GET  /api/model-info    - Get model evaluation metrics
"""

import os
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.model import (
    is_model_loaded, is_model_available, predict_image,
    get_model_info, load_model
)
from app.preprocessing import preprocess_image_bytes, validate_image, get_image_thumbnail_base64
from app.database import save_inspection, get_all_inspections, get_stats, clear_all_inspections
from app.storage import UPLOADS_DIR

# Create the router - all routes will be prefixed with /api in main.py
router = APIRouter()

@router.get("/health")
def health_check():
    """
    Check if the backend is running and whether the model is loaded.
    The frontend uses this to show system status.
    """
    model_loaded = is_model_loaded()
    model_available = is_model_available()

    return {
        "status": "online",
        "model_loaded": model_loaded,
        "model_available": model_available,
        "inspection_system_ready": model_loaded,
        "message": "VisionGuard AI Backend is running."
    }


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Main prediction endpoint.

    Accepts an image file upload, runs it through the ML model,
    and returns the quality inspection result.
    """
    # Step 1: Check if model is loaded
    if not is_model_loaded():
        if is_model_available():
            # Try to load the model now
            success = load_model()
            if not success:
                raise HTTPException(
                    status_code=503,
                    detail="Model could not be loaded. Check the server logs."
                )
        else:
            raise HTTPException(
                status_code=503,
                detail="No trained model found. Please train the model first using: python training/train.py"
            )

    # Step 2: Read the uploaded file bytes
    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Step 3: Validate the image
    is_valid, error_msg = validate_image(image_bytes, file.filename or "upload.jpg")
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Step 4: Preprocess the image for MobileNetV2
    try:
        preprocessed = preprocess_image_bytes(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Step 5: Run the model prediction
    result = predict_image(preprocessed)
    if result is None:
        raise HTTPException(status_code=503, detail="Prediction failed. Model may not be loaded.")

    # Step 6: Generate a thumbnail for the frontend to display
    thumbnail_b64 = get_image_thumbnail_base64(image_bytes)

    # Step 7: Save the uploaded image to disk (optional - for history)
    saved_image_path = None
    try:
        safe_name = f"inspection_{os.urandom(4).hex()}{os.path.splitext(file.filename or 'img.jpg')[1]}"
        saved_path = os.path.join(UPLOADS_DIR, safe_name)
        with open(saved_path, "wb") as f:
            f.write(image_bytes)
        saved_image_path = safe_name  # Store only the filename, not full path
    except Exception:
        pass  # Image saving is optional, don't fail the request

    # Step 8: Save the inspection result to SQLite
    inspection_id = save_inspection(
        product_name="Casting Product",
        prediction=result["prediction"],
        confidence=result["confidence"],
        decision=result["decision"],
        rejection_signal=result["rejection_signal"],
        image_path=saved_image_path
    )

    # Step 9: Build and return the response
    return {
        "success": True,
        "inspection_id": inspection_id,
        "product_name": "Casting Product",
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "decision": result["decision"],
        "rejection_signal": result["rejection_signal"],
        "is_uncertain": result["is_uncertain"],
        "probabilities": result["probabilities"],
        "thumbnail": thumbnail_b64,
        "message": get_decision_message(result["decision"], result["is_uncertain"])
    }


def get_decision_message(decision, is_uncertain):
    """Return a human-readable message for the inspection decision."""
    if is_uncertain:
        return "UNCERTAIN — MANUAL INSPECTION REQUIRED"
    elif decision == "ACCEPT":
        return "PRODUCT PASSED QUALITY INSPECTION"
    else:
        return "REJECTION SIGNAL ACTIVATED"


@router.get("/history")
def get_history():
    """
    Return all previous inspection records from the database.
    The frontend uses this for the Inspection History page.
    """
    records = get_all_inspections()
    return {
        "success": True,
        "count": len(records),
        "inspections": records
    }


@router.delete("/history")
def delete_history():
    """
    Clear all inspection records from the database.
    Called when the user clicks 'Clear History' in the frontend.
    """
    clear_all_inspections()
    return {
        "success": True,
        "message": "All inspection history has been cleared."
    }


@router.get("/stats")
def get_statistics():
    """
    Return dashboard statistics: total, accepted, rejected counts and percentages.
    The main dashboard uses this to populate the stat cards.
    """
    stats = get_stats()
    return {
        "success": True,
        **stats
    }


@router.get("/model-info")
def model_info():
    """
    Return model information including evaluation metrics and training history.
    The Model Performance page uses this to display charts and metrics.
    """
    info = get_model_info()
    return {
        "success": True,
        **info
    }
