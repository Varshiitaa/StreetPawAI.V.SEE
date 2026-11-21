import os
import io
import time
import random
import base64
from typing import Optional
from PIL import Image
import cv2
import numpy as np
from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from sqlalchemy.orm import Session

from pig_classifier import classify_roi
from breed_classifier import classify_breed, is_model_ready as is_breed_ready
from disease_classifier import classify_disease, is_disease_model_ready as is_disease_ready
from db.database import SessionLocal
from db.models import Dog


def load_image_for_eval(image_url: str):
    if not image_url:
        return None
    cleaned = image_url.strip()
    if cleaned.startswith('/dogs_dataset/'):
        fname = cleaned.replace('/dogs_dataset/', '')
    elif cleaned.startswith('dogs_dataset/'):
        fname = cleaned.replace('dogs_dataset/', '')
    else:
        fname = os.path.basename(cleaned)
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dogs_dataset', fname),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend', 'public', 'dogs_dataset', fname),
        os.path.join('dogs_dataset', fname),
        os.path.join('backend', 'dogs_dataset', fname),
    ]
    for c in candidates:
        if os.path.exists(c):
            return Image.open(c).convert('RGB')
    return None

ai_router = APIRouter(prefix="/api", tags=["AI Vision Engine"])

# Global holders managed by main application or lazily initialized
yolo_model = None
reid_model = None

def set_ai_models(yolo, reid):
    global yolo_model, reid_model
    yolo_model = yolo
    reid_model = reid

def get_yolo_model():
    global yolo_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO
            yolo_model = YOLO("yolov8n.pt")
        except Exception as e:
            print(f"[ERROR] Could not load YOLO in ai_router: {e}")
            yolo_model = None
    return yolo_model

def get_reid_model():
    global reid_model
    if reid_model is None:
        try:
            from animal_reid import AnimalReID
            reid_model = AnimalReID()
        except Exception as e:
            print(f"[ERROR] Could not load Re-ID in ai_router: {e}")
            reid_model = None
    return reid_model

def convert_np_to_base64(img_np):
    if img_np is None or img_np.size == 0:
        return ""
    _, buffer = cv2.imencode('.jpg', img_np)
    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{base64_str}"

def is_plant_or_greenery(img_bgr):
    """Detects if image is predominantly plants, leaves, or greenery in HSV space"""
    if img_bgr is None or img_bgr.size == 0:
        return False
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    lower_green = np.array([35, 40, 40])
    upper_green = np.array([85, 255, 255])
    mask = cv2.inRange(hsv, lower_green, upper_green)
    green_ratio = np.count_nonzero(mask) / float(img_bgr.shape[0] * img_bgr.shape[1])
    return green_ratio > 0.35

COLOR_MAP = {
    "Dog": (129, 185, 16),       # Emerald
    "Cat": (212, 182, 6),        # Cyan-Gold
    "Cow (Cattle)": (34, 197, 94), # Green
    "Buffalo (Cattle)": (71, 85, 105), # Slate
    "Cattle / Cow": (34, 197, 94),
    "Bull": (239, 68, 68),       # Crimson
    "Pig": (236, 72, 153),       # Pink
    "Donkey": (168, 85, 247),    # Purple
    "Horse": (245, 158, 11),     # Amber
    "Human": (241, 102, 99),     # Coral
    "Plant": (34, 197, 94),      # Forest Green
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. ANIMAL DETECTION ONLY (YOLOv8 + MultiNet Quadruped Localization & Species)
# ─────────────────────────────────────────────────────────────────────────────
@ai_router.post("/detect")
async def detect_animal_endpoint(
    file: Optional[UploadFile] = File(None),
    dog_identifier: Optional[str] = Query(None)
):
    """
    Independent Animal Detection Engine.
    Locates animals, creates bounding boxes, and accurately detects Dog, Cat, Pig, Cattle (Cow/Buffalo), Horse.
    Does NOT automatically run Breed or Disease models.
    """
    start_time = time.time()
    pil_image = None
    if file and file.filename:
        try:
            contents = await file.read()
            pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read image: {str(e)}")
    elif dog_identifier:
        db = SessionLocal()
        try:
            dog = db.query(Dog).filter((Dog.animal_id == dog_identifier) | (Dog.public_code == dog_identifier) | (Dog.id == (int(dog_identifier) if dog_identifier.isdigit() else -1))).first()
            if dog and dog.image_url:
                pil_image = load_image_for_eval(dog.image_url)
        finally:
            db.close()

    if pil_image is None:
        raise HTTPException(status_code=400, detail="No image provided. Please upload a photo or provide a valid dog identifier.")

    try:
        img_np = np.array(pil_image)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        height, width, _ = img_bgr.shape
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

    detections = []
    annotated_img = img_bgr.copy()
    found_valid_animal = False

    active_yolo = get_yolo_model()

    if active_yolo is not None:
        try:
            # Lower confidence threshold slightly so dogs in street settings are never missed
            results = active_yolo(pil_image, conf=0.25, verbose=False)[0]

            for idx, box in enumerate(results.boxes):
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())

                # Person / Human Detection (COCO cls 0)
                if cls_id == 0 and conf >= 0.40:
                    xyxy = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(int, xyxy)
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(width, x2), min(height, y2)

                    roi_crop_bgr = img_bgr[y1:y2, x1:x2]
                    roi_base64 = convert_np_to_base64(roi_crop_bgr) if roi_crop_bgr.size > 0 else ""

                    color = COLOR_MAP.get("Human", (241, 102, 99))
                    cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 3)
                    label = f"HUMAN ({conf * 100:.1f}%)"
                    cv2.putText(annotated_img, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

                    detections.append({
                        "detection_id": idx + 1,
                        "species": "Human",
                        "is_human": True,
                        "is_animal": False,
                        "is_plant": False,
                        "confidence": round(conf * 100, 2),
                        "bbox": [x1, y1, x2, y2],
                        "roi_crop": roi_base64,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                    })
                    found_valid_animal = True

                # Animal Classes Detection:
                # 15: Cat, 16: Dog, 17: Horse, 18: Sheep/Pig, 19: Cow/Cattle, 20: Elephant, 21: Bear, 22: Zebra, 23: Giraffe
                elif cls_id in [15, 16, 17, 18, 19, 20, 21, 22, 23] and conf >= 0.25:
                    xyxy = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(int, xyxy)
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(width, x2), min(height, y2)

                    roi_crop_bgr = img_bgr[y1:y2, x1:x2]
                    roi_base64 = convert_np_to_base64(roi_crop_bgr) if roi_crop_bgr.size > 0 else ""

                    roi_pil = None
                    if roi_crop_bgr.size > 0:
                        roi_rgb = cv2.cvtColor(roi_crop_bgr, cv2.COLOR_BGR2RGB)
                        roi_pil = Image.fromarray(roi_rgb)

                    refined_species, refined_conf = classify_roi(roi_pil, cls_id, conf)

                    if refined_species is None:
                        if cls_id == 15: refined_species = "Cat"
                        elif cls_id == 16: refined_species = "Dog"
                        elif cls_id == 17: refined_species = "Horse"
                        elif cls_id == 19: refined_species = "Cow (Cattle)"
                        else: refined_species = "Dog" # Primary street animal priority

                    final_conf = max(conf * 100, refined_conf * 100 if refined_conf <= 1.0 else refined_conf)
                    color = COLOR_MAP.get(refined_species, (16, 185, 129))

                    cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 3)
                    label = f"{refined_species.upper()} ({final_conf:.1f}%)"
                    cv2.putText(annotated_img, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

                    detections.append({
                        "detection_id": idx + 1,
                        "species": refined_species,
                        "is_human": False,
                        "is_animal": True,
                        "is_plant": False,
                        "confidence": round(final_conf, 2),
                        "bbox": [x1, y1, x2, y2],
                        "roi_crop": roi_base64,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                    })
                    found_valid_animal = True
        except Exception as e:
            print(f"[WARN] Detection error: {e}")

    # Fallback inspection if YOLO box was borderline or close-up animal photo
    if not found_valid_animal:
        refined_species, refined_conf = classify_roi(pil_image, None, 0.0)
        if refined_species and refined_conf >= 0.30:
            final_conf = round(refined_conf * 100 if refined_conf <= 1.0 else refined_conf, 2)
            color = COLOR_MAP.get(refined_species, (16, 185, 129))
            cv2.rectangle(annotated_img, (10, 10), (width - 10, height - 10), color, 3)
            label = f"{refined_species.upper()} ({final_conf:.1f}%)"
            cv2.putText(annotated_img, label, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)

            detections.append({
                "detection_id": 1,
                "species": refined_species,
                "is_human": False,
                "is_animal": True,
                "is_plant": False,
                "confidence": final_conf,
                "bbox": [10, 10, width - 10, height - 10],
                "roi_crop": convert_np_to_base64(img_bgr),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            found_valid_animal = True

    # Foliage or clean fallback
    if not found_valid_animal:
        if is_plant_or_greenery(img_bgr):
            detections.append({
                "detection_id": 1,
                "species": "Plant",
                "is_human": False,
                "is_animal": False,
                "is_plant": True,
                "confidence": 92.0,
                "bbox": [0, 0, 0, 0],
                "roi_crop": "",
                "message": "Foliage / Environment detected. No animal located.",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })
        else:
            detections.append({
                "detection_id": 1,
                "species": "Neither",
                "is_human": False,
                "is_animal": False,
                "is_plant": False,
                "confidence": 0.0,
                "bbox": [0, 0, 0, 0],
                "roi_crop": "",
                "message": "No stray animal identified with high confidence.",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })

    annotated_base64 = convert_np_to_base64(annotated_img)
    processing_time = round((time.time() - start_time) * 1000, 2)

    return {
        "success": True,
        "processing_time_ms": processing_time,
        "total_animals_detected": len([d for d in detections if d.get("is_animal")]),
        "annotated_image": annotated_base64,
        "detections": detections
    }

# ─────────────────────────────────────────────────────────────────────────────
# 2. INDEPENDENT BREED CLASSIFICATION (EfficientNet-B3 Canine Taxonomy)
# ─────────────────────────────────────────────────────────────────────────────
@ai_router.post("/breed")
async def classify_breed_endpoint(
    file: Optional[UploadFile] = File(None),
    animal_id: Optional[str] = Query(None, description="Associated Animal ID if already known")
):
    """
    Dedicated Breed Identification Endpoint.
    Executes only breed taxonomy classification. Returns breed, confidence, and top-3 candidates.
    Attaches the verified Animal ID if supplied.
    """
    pil_image = None
    if file and file.filename:
        try:
            contents = await file.read()
            pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read image: {str(e)}")
    elif animal_id:
        db = SessionLocal()
        try:
            dog = db.query(Dog).filter((Dog.animal_id == animal_id) | (Dog.public_code == animal_id) | (Dog.id == (int(animal_id) if animal_id.isdigit() else -1))).first()
            if dog and dog.image_url:
                pil_image = load_image_for_eval(dog.image_url)
        finally:
            db.close()

    if pil_image is None:
        raise HTTPException(status_code=400, detail="No image provided. Please upload a photo or provide a valid animal_id.")

    try:
        result = classify_breed(pil_image, use_tta=True)

        return {
            "success": True,
            "animal_id": animal_id or "Unassigned",
            "breed": result.get("breed", "Indian Pariah / Indie"),
            "confidence": result.get("confidence", 0.0),
            "top3": result.get("top3", []),
            "model_ready": result.get("model_ready", is_breed_ready()),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Breed classification failed: {str(e)}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. INDEPENDENT DISEASE & HEALTH TRIAGE (EfficientNet-B3 Clinical Model)
# ─────────────────────────────────────────────────────────────────────────────
@ai_router.post("/disease")
async def classify_disease_endpoint(
    file: Optional[UploadFile] = File(None),
    animal_id: Optional[str] = Query(None, description="Associated Animal ID if already known")
):
    """
    Dedicated Canine Skin Disease & Clinical Health Triage Endpoint.
    Executes only disease risk classification. Returns condition status, confidence, and clinical summary.
    Attaches the verified Animal ID if supplied.
    """
    pil_image = None
    if file and file.filename:
        try:
            contents = await file.read()
            pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read image: {str(e)}")
    elif animal_id:
        db = SessionLocal()
        try:
            dog = db.query(Dog).filter((Dog.animal_id == animal_id) | (Dog.public_code == animal_id) | (Dog.id == (int(animal_id) if animal_id.isdigit() else -1))).first()
            if dog and dog.image_url:
                pil_image = load_image_for_eval(dog.image_url)
        finally:
            db.close()

    if pil_image is None:
        raise HTTPException(status_code=400, detail="No image provided. Please upload a photo or provide a valid animal_id.")

    try:
        result = classify_disease(pil_image, use_tta=True)

        return {
            "success": True,
            "animal_id": animal_id or "Unassigned",
            "disease": result.get("disease", "Normal / No visible disease"),
            "confidence": result.get("disease_confidence", 0.0),
            "top2": result.get("disease_top2", []),
            "status": result.get("status", "normal"),
            "model_ready": result.get("disease_model_ready", is_disease_ready()),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Disease assessment failed: {str(e)}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. ANIMAL RE-ID & REGISTRATION LOOKUP (Biometric Metric Engine)
# ─────────────────────────────────────────────────────────────────────────────
@ai_router.post("/animal-id")
async def identify_animal_endpoint(
    file: Optional[UploadFile] = File(None),
    animal_id: Optional[str] = Query(None)
):
    """
    Biometric Animal Identification Endpoint.
    1. Extracts deep metric embedding (OSNet-x0.25).
    2. Compares against registered canine gallery database using cosine distance.
    3. If cosine similarity >= threshold (0.50): returns existing Animal ID and details.
    4. If unknown: flags is_unknown=True and provides recommended next ID for registration.
    """
    active_reid = get_reid_model()
    if active_reid is None:
        raise HTTPException(status_code=503, detail="Animal Re-ID biometric engine is not available.")

    pil_image = None
    if file and file.filename:
        try:
            contents = await file.read()
            pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read image: {str(e)}")
    elif animal_id:
        db = SessionLocal()
        try:
            dog = db.query(Dog).filter((Dog.animal_id == animal_id) | (Dog.public_code == animal_id) | (Dog.id == (int(animal_id) if animal_id.isdigit() else -1))).first()
            if dog and dog.image_url:
                pil_image = load_image_for_eval(dog.image_url)
        finally:
            db.close()

    if pil_image is None:
        raise HTTPException(status_code=400, detail="No image provided. Please upload a photo or provide a valid animal_id.")

    try:
        result = active_reid.identify(pil_image, threshold=0.50, top_k=5)
        raw_id = result.get("animal_id")
        is_unknown = result.get("is_unknown", False)
        similarity = round(float(result.get("similarity", 0.0)), 4)

        # Check existing registration in SQLite database
        existing_animal_record = None
        db: Session = SessionLocal()
        try:
            formatted_aid = f"PAW-{int(raw_id):04d}" if str(raw_id).isdigit() else str(raw_id)
            existing_animal_record = db.query(Dog).filter(
                (Dog.animal_id == formatted_aid) | (Dog.public_code == formatted_aid)
            ).first()
        finally:
            db.close()

        resolved_id = existing_animal_record.animal_id if existing_animal_record else (
            f"PAW-{int(raw_id):04d}" if str(raw_id).isdigit() else (raw_id or "PAW-NEW")
        )

        return {
            "success": True,
            "filename": file.filename if file else (animal_id or "existing_animal"),
            "animal_id": resolved_id,
            "raw_id": raw_id,
            "is_unknown": is_unknown,
            "similarity": similarity,
            "confidence_pct": round(similarity * 100, 1),
            "threshold": 0.50,
            "exists_in_database": existing_animal_record is not None,
            "existing_details": {
                "name": existing_animal_record.name if existing_animal_record else None,
                "breed": existing_animal_record.breed if existing_animal_record else None,
                "status": existing_animal_record.status if existing_animal_record else None,
                "sterilised": existing_animal_record.sterilised if existing_animal_record else None,
                "location": existing_animal_record.location if existing_animal_record else None
            } if existing_animal_record else None,
            "top_matches": result.get("top_k", []),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Animal Re-ID verification failed: {str(e)}")
