import io
import os
import base64
import time
import random
from PIL import Image
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
import shutil
from fastapi.middleware.cors import CORSMiddleware
from pig_classifier import init_classifier
from animal_reid import AnimalReID
from breed_classifier import init_breed_classifier, is_model_ready
from disease_classifier import init_disease_classifier, is_disease_model_ready

from db.database import engine, Base
from routers.ai_router import ai_router, set_ai_models
from routers.rescues_router import rescues_router, complaints_router
from routers.dogs_router import dogs_router
from routers.auth_router import auth_router
from routers.admin_router import admin_router
from routers.users_router import users_router
from routers.contacts_router import contacts_router
from routers.chat_router import chat_router
from routers.lost_found_router import lost_found_router
from routers.analytics_router import analytics_router
from routers.exports_router import exports_router

# Create SQLAlchemy Database Tables on Startup if not existing
Base.metadata.create_all(bind=engine)

# Initialize FastAPI App
app = FastAPI(
    title="StreetPaw.AI Independent Multi-Animal Vision & Rescue Engine",
    description="Collaborative Stray Animal Welfare & Identification System",
    version="6.2.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Modular API Routers

# Static file serving for uploads and dogs dataset
uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

dogs_dataset_dir = os.path.join(os.path.dirname(__file__), 'dogs_dataset')
if os.path.exists(dogs_dataset_dir):
    app.mount("/dogs_dataset", StaticFiles(directory=dogs_dataset_dir), name="dogs_dataset")

from services.supabase_storage import upload_file_to_supabase

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    ext = os.path.splitext(file.filename)[1].lower() or '.jpg'
    unique_name = f"upload_{int(time.time()*1000)}_{random.randint(100, 999)}{ext}"
    backend_dest = os.path.join(uploads_dir, unique_name)
    frontend_dest = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public', 'uploads', unique_name)
    
    contents = await file.read()
    with open(backend_dest, 'wb') as f:
        f.write(contents)
    try:
        os.makedirs(os.path.dirname(frontend_dest), exist_ok=True)
        with open(frontend_dest, 'wb') as f:
            f.write(contents)
    except Exception:
        pass

    # Upload directly to Supabase Storage as primary cloud URL
    content_type = file.content_type or "image/jpeg"
    supabase_url = upload_file_to_supabase(contents, f"uploads/{unique_name}", content_type)
    final_url = supabase_url if supabase_url else f"/uploads/{unique_name}"
    
    return {"url": final_url, "filename": unique_name, "supabase_url": supabase_url}

app.include_router(ai_router)
app.include_router(rescues_router)
app.include_router(complaints_router)
app.include_router(dogs_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(contacts_router)
app.include_router(chat_router)
app.include_router(lost_found_router)
app.include_router(analytics_router)
app.include_router(exports_router)

# Global YOLO & Re-ID model holders
yolo_model = None
reid_model = None

SUPPORTED_SPECIES = ["Dog", "Cat", "Cow", "Bull", "Buffalo", "Pig", "Donkey", "Horse", "Human", "Plant", "Neither"]

def load_models():
    global yolo_model, reid_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO
            print("[INFO] Loading YOLOv8 Vision Model...")
            yolo_model = YOLO("yolov8n.pt")
            print("[SUCCESS] YOLOv8 model loaded successfully!")
        except Exception as e:
            print(f"[ERROR] Failed to load YOLOv8 model: {e}")
            yolo_model = None
            
    init_classifier()
    if reid_model is None:
        try:
            print("[INFO] Loading Animal Re-ID model (OSNet-x0.25 Biometric)...")
            reid_model = AnimalReID()
            print("[SUCCESS] Animal Re-ID model loaded successfully!")
        except Exception as e:
            print(f"[ERROR] Failed to load Animal Re-ID model: {e}")
            reid_model = None

    init_breed_classifier()
    init_disease_classifier()
    set_ai_models(yolo_model, reid_model)

@app.on_event("startup")
async def startup_event():
    load_models()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "StreetPaw.AI Independent Unified Platform",
        "supported_animals": SUPPORTED_SPECIES,
        "yolo_active": yolo_model is not None,
        "breed_model_ready": is_model_ready(),
        "disease_model_ready": is_disease_model_ready(),
        "reid_active": reid_model is not None
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "yolo_active": yolo_model is not None,
        "breed_model_ready": is_model_ready(),
        "disease_model_ready": is_disease_model_ready(),
        "reid_active": reid_model is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
