import os, random, sqlite3
from pathlib import Path
from PIL import Image

BASE_DIR = Path('backend').resolve()
os.chdir(str(BASE_DIR))
import sys
sys.path.insert(0, str(BASE_DIR))

from animal_reid import AnimalReID
from breed_classifier import init_breed_classifier, classify_breed
from disease_classifier import init_disease_classifier, classify_disease

print('[1] Loading AI Models...')
init_breed_classifier()
init_disease_classifier()
reid = AnimalReID()
reid._save_registry = lambda: None

BANGALORE_LOCATIONS = [
    {"name": "Harohalli, Kanakapura Road", "lat": 12.6782, "lng": 77.4589},
    {"name": "Dayananda Sagar University (DSU Campus Gate 2)", "lat": 12.9081, "lng": 77.5653},
    {"name": "DSU Bus Stop and Transit Hub", "lat": 12.9095, "lng": 77.5670},
    {"name": "Bommanahalli Junction", "lat": 12.9089, "lng": 77.6245},
    {"name": "Kudlu Gate, Hosur Road", "lat": 12.8906, "lng": 77.6412},
    {"name": "Hosur Road Expressway Corridor", "lat": 12.8720, "lng": 77.6530},
    {"name": "Konanakunte Cross Metro Station", "lat": 12.8890, "lng": 77.5744},
    {"name": "HSR Layout Sector 1 and Agara Lake", "lat": 12.9121, "lng": 77.6446},
    {"name": "HSR Layout 27th Main Commercial Belt", "lat": 12.9165, "lng": 77.6508}
]

DOG_NAMES = [
    "Bruno", "Max", "Rocky", "Kaalu", "Sheru", "Tiger", "Charlie", "Buddy", "Milo", "Leo",
    "Tommy", "Jack", "Simba", "Cooper", "Buster", "Oscar", "Teddy", "Duke", "Sammy", "Toby",
    "Rex", "Scout", "Rocco", "Casper", "Zeus", "Diesel", "Shadow", "Copper", "Rusty", "Samson",
    "Pepper", "Lucky", "Bandit", "Bowie", "Ollie", "Dexter", "Chico", "Loki", "Scooter", "Hunter",
    "Simba", "Rusty", "Bella", "Daisy", "Luna", "Lucy", "Bailey", "Stella", "Zoey", "Chloe",
    "Penny", "Nala", "Ruby", "Rosie", "Lily", "Millie", "Sophie", "Lola", "Roxy", "Gracie",
    "Abby", "Mia", "Sasha", "Maya", "Kona", "Layla", "Pepper", "Hazel", "Zoe", "Maggie"
]

images_dir = BASE_DIR / "dogs_dataset"
image_files = sorted([f for f in images_dir.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]])
print(f'[2] Processing all {len(image_files)} real folder images through AI models...')

db_path = BASE_DIR / "streetpaw.db"
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()
cursor.execute("DELETE FROM dogs")
cursor.execute("DELETE FROM dog_profiles")

counter = 1

for img_path in image_files:
    try:
        pil_img = Image.open(img_path).convert("RGB")
    except Exception:
        continue

    # 1. Biometric Animal Re-ID (Assign clean sequential ID for all 134 folder dogs)
    raw_num = counter
    
    # Ensure every single image record in the registry gets its unique tag DOG-0001 ...
    tag_id = f"DOG-{counter:04d}"
    public_code = f"PAW-{counter:04d}"

    # 2. Real Breed classification
    breed_res = classify_breed(pil_img, use_tta=False)
    breed_name = breed_res.get("breed", "Indian Breed")

    # 3. Real Disease assessment
    disease_res = classify_disease(pil_img)
    disease_name = disease_res.get("disease", "Normal / No visible disease")
    disease_conf = float(disease_res.get("disease_confidence", 95.0))

    img_web_url = f"/dogs_dataset/{img_path.name}"
    loc = BANGALORE_LOCATIONS[(counter - 1) % len(BANGALORE_LOCATIONS)]
    loc_lat = loc["lat"] + random.uniform(-0.002, 0.002)
    loc_lng = loc["lng"] + random.uniform(-0.002, 0.002)

    name = f"{DOG_NAMES[(counter - 1) % len(DOG_NAMES)]} ({tag_id})"
    health_status = "Healthy / Active" if "Normal" in disease_name else f"Medical Care ({disease_name})"
    status = "active_care" if "Normal" in disease_name else "under_observation"
    sterilised = "yes" if counter % 2 == 0 else "no"
    ear_notch = (sterilised == "yes")

    cursor.execute("""
        INSERT INTO dogs (
            public_code, animal_id, name, sex, approx_age, species, breed,
            breed_source, health_status, disease_name, disease_confidence,
            status, sterilised, ear_notch, primary_photo, image_url, location,
            location_lat, location_lng, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (
        public_code, tag_id, name, "male" if counter % 2 != 0 else "female",
        "Adult (3-5 yrs)" if counter % 3 == 0 else ("Young (1-2 yrs)" if counter % 3 == 1 else "Puppy (< 1 yr)"),
        "Dog", breed_name, "ai", health_status, disease_name, disease_conf, status,
        sterilised, ear_notch, img_web_url, img_web_url, loc["name"], loc_lat, loc_lng
    ))

    cursor.execute("""
        INSERT INTO dog_profiles (
            animal_id, species, breed, health_status, disease_name, disease_confidence,
            location, location_lat, location_lng, image_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        tag_id, "Dog", breed_name, health_status, disease_name, disease_conf,
        loc["name"], loc_lat, loc_lng, img_web_url
    ))

    counter += 1

conn.commit()
total = cursor.execute("SELECT COUNT(*) FROM dogs").fetchone()[0]
conn.close()
print(f"[SUCCESS] Registered exactly {total} unique dogs in SQLite database from user folder!")
