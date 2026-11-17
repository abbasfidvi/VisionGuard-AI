"""
main.py - FastAPI application entry point for VisionGuard AI.

This file:
- Creates the FastAPI app
- Sets up CORS so the React frontend can communicate with this server
- Initializes the database
- Loads the trained ML model (if available)
- Registers all routes
- Serves uploaded images as static files

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_database
from app.model import load_model, is_model_available
from app.routes import router
from app.storage import UPLOADS_DIR

# Create the FastAPI app
app = FastAPI(
    title="VisionGuard AI",
    description="AI-powered manufacturing quality inspection system",
    version="1.0.0"
)

allowed_origins = os.getenv(
    "VISIONGUARD_CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routes under the /api prefix
app.include_router(router, prefix="/api")

# Serve uploaded images as static files so the frontend can display them
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    """
    Runs once when the server starts.
    Initializes the database and tries to load the trained model.
    """
    print("=" * 50)
    print("  VisionGuard AI - Starting up...")
    print("=" * 50)

    # Initialize SQLite database (creates table if it doesn't exist)
    init_database()

    # Try to load the trained model
    if is_model_available():
        print("Trained model found. Loading...")
        success = load_model()
        if success:
            print("✓ Model loaded and ready for inference.")
        else:
            print("✗ Model loading failed. Check the logs.")
    else:
        print("! No trained model found.")
        print("  To train the model, run:")
        print("  python training/train.py")

    print("=" * 50)
    print("  Backend running at: http://localhost:8000")
    print("  API docs at:        http://localhost:8000/docs")
    print("=" * 50)


@app.get("/")
def root():
    """Root endpoint - just a welcome message."""
    return {
        "message": "VisionGuard AI Backend",
        "docs": "/docs",
        "api": "/api/health"
    }
