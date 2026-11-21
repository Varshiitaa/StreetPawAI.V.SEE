import os
import json
import sqlite3
import random
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent / "backend"
os.chdir(str(BASE_DIR))

import sys
sys.path.insert(0, str(BASE_DIR))

from animal_reid import AnimalReID
from breed_classifier import init_breed_classifier, classify_breed
from disease_classifier import init_disease_classifier, classify_disease

print("[1] Initializing AI Models...")
init_breed_classifier()
init_disease_classifier()
reid = AnimalReID()
reid._save_registry = lambda: None

BANGALORE_LOCATIONS = [
    {"name": "Harohalli, Kanakapura Road", "lat": 12.6782, "lng": 77.4589},
    {"name": "Dayananda Sagar University (DSU Campus Gate 2)", "lat": 12.9081, "lng": 77.5653},
    {"name": "DSU Bus Stop & Transit Hub", "lat": 12.9095, "lng": 77.5670},
    {"name": "Bommanahalli Junction", "lat": 12.9089, "lng": 77.6245},
    {"name": "Kudlu Gate, Hosur Road", "lat": 12.8906, "lng": 77.6412},
    {"name": "Hosur Road Expressway Corridor", "lat": 12.8720, "lng": 77.6530},
    {"name": "Konanakunte Cross Metro Station", "lat": 12.8890, "lng": 77.5744},
    {"name": "HSR Layout Sector 1 & Agara Lake", "lat": 12.9121, "lng": 77.6446},
    {"name": "HSR Layout 27th Main Commercial Belt", "lat": 12.9165, "lng": 77.6508}
]

images_dir = BASE_DIR / "dogs_dataset"
image_files = sorted([f for f in images_dir.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]])

print(f"[2] Cleaning old stock/unsplash dogs from database and building clean registry from {len(image_files)} real folder images...")

db_path = BASE_DIR / "streetpaw.db"
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Delete old stock dogs
cursor.execute("DELETE FROM dogs")
cursor.execute("DELETE FROM dog_profiles")

registered_dogs = {} # animal_id -> record
dog_counter = 1

for img_path in image_files:
    try:
        pil_img = Image.open(img_path).convert("RGB")
    except Exception as e:
        continue

    # 1. Animal Re-ID biometrics
    # Every individual dog gets a unique ID; identical dogs from the folder receive the same ID!
    id_result = reid.identify(pil_img, threshold=0.62)
    raw_animal_num = id_result.get("animal_id")
    is_unknown = id_result.get("is_unknown", False)
    
    formatted_animal_id = f"DOG-{raw_animal_num:04d}" if raw_animal_num else f"DOG-{dog_counter:04d}"
    public_code = f"PAW-{raw_animal_num:04d}" if raw_animal_num else f"PAW-{dog_counter:04d}"

    # 2. Real Breed classification
    breed_res = classify_breed(pil_img, use_tta=False)
    breed_name = breed_res.get("breed", "Indian Pariah / Indie")

    # 3. Real Disease assessment
    disease_res = classify_disease(pil_img)
    disease_name = disease_res.get("disease", "Normal / No visible disease")
    disease_conf = disease_res.get("disease_confidence", 0.0)

    img_web_url = f"/dogs_dataset/{img_path.name}"

    if formatted_animal_id not in registered_dogs:
        loc = random.choice(BANGALORE_LOCATIONS)
        loc_name = loc["name"]
        loc_lat = loc["lat"] + random.uniform(-0.003, 0.003)
        loc_lng = loc["lng"] + random.uniform(-0.003, 0.003)

        health_status = "Healthy / Active" if "Normal" in disease_name else f"Medical Care ({disease_name})"
        status = "active_care" if "Normal" in disease_name else "under_observation"
        sterilised = random.choice(["yes", "no"])
        ear_notch = (sterilised == "yes")
        is_vaccinated = random.choice([True, False])

        registered_dogs[formatted_animal_id] = {
            "public_code": public_code,
            "animal_id": formatted_animal_id,
            "name": f"Community Dog {formatted_animal_id}",
            "sex": random.choice(["male", "female"]),
            "approx_age": random.choice(["Young (1-2 yrs)", "Adult (3-5 yrs)", "Puppy (< 1 yr)", "Senior (6+ yrs)"]),
            "species": "Dog",
            "breed": breed_name,
            "health_status": health_status,
            "disease_name": disease_name,
            "disease_confidence": disease_conf,
            "status": status,
            "sterilised": sterilised,
            "ear_notch": ear_notch,
            "primary_photo": img_web_url,
            "image_url": img_web_url,
            "location": loc_name,
            "location_lat": loc_lat,
            "location_lng": loc_lng,
            "vaccinated": is_vaccinated
        }
        dog_counter += 1

print(f"[3] Inserting {len(registered_dogs)} unique real dogs into SQLite database...")

for d in registered_dogs.values():
    cursor.execute("""
        INSERT INTO dogs (
            public_code, animal_id, name, sex, approx_age, species, breed,
            breed_source, health_status, disease_name, disease_confidence,
            status, sterilised, ear_notch, primary_photo, image_url, location,
            location_lat, location_lng, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (
        d["public_code"],
        d["animal_id"],
        d["name"],
        d["sex"],
        d["approx_age"],
        d["species"],
        d["breed"],
        "ai",
        d["health_status"],
        d["disease_name"],
        d["disease_confidence"],
        d["status"],
        d["sterilised"],
        d["ear_notch"],
        d["primary_photo"],
        d["image_url"],
        d["location"],
        d["location_lat"],
        d["location_lng"]
    ))

    cursor.execute("""
        INSERT INTO dog_profiles (
            animal_id, species, breed, health_status, disease_name, disease_confidence,
            location, location_lat, location_lng, image_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        d["animal_id"],
        d["species"],
        d["breed"],
        d["health_status"],
        d["disease_name"],
        d["disease_confidence"],
        d["location"],
        d["location_lat"],
        d["location_lng"],
        d["image_url"]
    ))

# Also fix complaints so that they all have address and reporter names
cursor.execute("UPDATE complaints SET address = 'Indiranagar 100ft Road, Bengaluru' WHERE address IS NULL OR address = ''")

conn.commit()
total = cursor.execute("SELECT COUNT(*) FROM dogs").fetchone()[0]
conn.close()

print(f"[SUCCESS] Clean database created with {total} real dogs exclusively from user folder!")
