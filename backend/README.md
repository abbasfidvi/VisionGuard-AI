# VisionGuard AI Backend

## Local setup

Use Python 3.11 for TensorFlow compatibility:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at <http://localhost:8000>; interactive documentation is at <http://localhost:8000/docs>. The frontend's Vite development proxy targets this port.

The trained model and evaluation metadata are included in `models/`. Dataset download and model training are optional.

## Deployment configuration

- `VISIONGUARD_CORS_ORIGINS`: comma-separated allowed frontend origins, such as `https://visionguard-ai.vercel.app`.
- `VISIONGUARD_DATA_DIR`: writable directory for `visionguard.db` and uploaded images. Mount persistent storage here to retain them across deployments.
- The hosting platform must provide a `PORT` environment variable. Start the server with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

See the [project README](../README.md) for the complete GitHub, Render, Vercel, and Netlify deployment instructions.
