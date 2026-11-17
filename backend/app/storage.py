import os


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_DIR = os.path.abspath(os.getenv("VISIONGUARD_DATA_DIR", BACKEND_DIR))
UPLOADS_DIR = os.path.join(STORAGE_DIR, "uploads")

os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
