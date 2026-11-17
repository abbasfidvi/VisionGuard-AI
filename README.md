# VisionGuard AI

VisionGuard AI is a manufacturing quality inspection demo. Its React/Vite frontend calls a FastAPI backend that runs a MobileNetV2 model to classify casting images as **GOOD** or **DEFECTIVE**, records inspection history, and displays statistics.

The trained model and its evaluation files are included in `backend/models/`, so you can run and deploy the app without downloading the training dataset or training the model again.

## Project layout

```text
VisionGuard-AI/
├── frontend/                 # React + Vite web application
├── backend/
│   ├── app/                  # FastAPI API and storage configuration
│   ├── models/               # Trained model and evaluation metadata
│   ├── training/             # Optional model training scripts
│   └── requirements.txt
├── render.yaml               # Render backend deployment blueprint
└── README.md
```

## Run locally

### Requirements

- Python 3.11 (recommended for TensorFlow compatibility)
- Node.js 20.19+ or 22.12+
- npm

### 1. Install and start the backend

From the project root, create a Python environment and install the requirements:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is at <http://localhost:8000>. Interactive API documentation is at <http://localhost:8000/docs>.

### 2. Install and start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. During local development, Vite proxies `/api` requests to `http://localhost:8000`.

## Deploy publicly

The frontend and API are separate services. Deploy the backend first, then set its URL as the frontend's `VITE_API_URL`. Finally, allow the frontend's public origin in the backend's `VISIONGUARD_CORS_ORIGINS`.

### 1. Push the project to GitHub

Create a GitHub repository, then from the project root:

```bash
git init
git add .
git status
```

Review the staged files before committing. The root `.gitignore` excludes virtual environments, uploaded images, local databases, datasets, and frontend build output. The trained model under `backend/models/` is intentionally included; it is about 12 MB.

```bash
git commit -m "Prepare VisionGuard AI for deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

If Git is already initialized, add the GitHub remote and push the existing branch instead of running `git init`.

### 2. Deploy the backend on Render

The included [`render.yaml`](./render.yaml) is a Render Blueprint for the API. It uses a paid Starter web service and a 1 GB persistent disk; check Render's current pricing before creating it.

1. Sign in to [Render](https://render.com/) and choose **New → Blueprint**.
2. Connect your GitHub repository and select this project.
3. When prompted for `VISIONGUARD_CORS_ORIGINS`, enter `http://localhost:5173` temporarily. You will replace it with the frontend's production URL after the next step.
4. Create the Blueprint and wait for the service to finish deploying.
5. Copy the API service URL, for example `https://visionguard-api.onrender.com`.
6. Confirm `https://YOUR-API.onrender.com/api/health` returns JSON. `model_loaded` should be `true`.

The persistent disk stores the SQLite history and uploaded images across restarts. The model files remain in the deployed application under `backend/models/`.

### 3. Deploy the frontend on Vercel

1. In [Vercel](https://vercel.com/), choose **Add New → Project** and import the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Use the Vite defaults, or set **Build Command** to `npm run build` and **Output Directory** to `dist`.
4. Add this environment variable before deploying:

   | Name | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |

5. Deploy and copy the frontend's public URL, for example `https://visionguard-ai.vercel.app`.

`VITE_API_URL` is used at build time. If you change it later, redeploy the frontend.

### 4. Allow the public frontend origin

In Render, open the backend service's **Environment** settings and set:

| Name | Value |
| --- | --- |
| `VISIONGUARD_CORS_ORIGINS` | `https://YOUR-FRONTEND.vercel.app` |

Use the frontend origin only (no `/api` path), save the change, and redeploy the backend if requested. For a custom domain, add its exact `https://` origin too. Multiple origins can be comma-separated.

Open the frontend URL and test an image inspection. The model should be ready and inspection history should remain available after backend restarts.

### Other hosting options

- **Backend:** Railway or another Python web-service host can run `backend` with `pip install -r requirements.txt` and `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `VISIONGUARD_CORS_ORIGINS` and `VISIONGUARD_DATA_DIR` in its environment, and attach persistent storage at the latter path if history should survive redeployments.
- **Frontend:** Netlify can deploy the `frontend` directory using `npm run build` and `dist`. The included [`frontend/netlify.toml`](./frontend/netlify.toml) configures the build and SPA fallback. Set the same `VITE_API_URL` environment variable in the host's build settings.

For either option, use a backend instance with enough memory for TensorFlow and the model, and make sure its filesystem or mounted volume can store the SQLite database and uploads.

## Configuration

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Frontend build | Backend API base URL, including `/api`. Defaults to the local Vite `/api` proxy. |
| `VISIONGUARD_CORS_ORIGINS` | Backend | Comma-separated allowed browser origins. Defaults to local development URLs. |
| `VISIONGUARD_DATA_DIR` | Backend | Directory for the SQLite database and uploaded images. Defaults to `backend/`. |

Copy `frontend/.env.example` to `frontend/.env.local` if you need to set frontend-specific local build settings. Do not commit environment files containing deployment-specific values.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend and model status |
| `POST` | `/api/predict` | Inspect an uploaded image |
| `GET` | `/api/history` | List inspections |
| `DELETE` | `/api/history` | Clear inspection history |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/model-info` | Model and evaluation details |

## Important notes

- This is a public demo with **no user authentication**. Anyone who can reach the deployed API can submit inspections and clear its shared history. Do not store sensitive images or rely on it for private records.
- Hosting plans, disk persistence, and TensorFlow memory requirements vary. The included Render Blueprint provisions paid compute and persistent storage; check the provider's current pricing before deployment.
- The model is trained for metal casting impeller images and may not generalize to other products. Its rejection mechanism is a software simulation and does not control physical hardware.

## Optional: train a new model

Training is not required for local use or deployment. To retrain, download the [Kaggle casting dataset](https://www.kaggle.com/datasets/ravirajsinh45/real-life-industrial-dataset-of-casting-product), extract its `casting_data/` directory into `backend/`, and run:

```bash
cd backend
python training/train.py
```
