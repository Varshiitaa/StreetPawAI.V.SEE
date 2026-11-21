import sqlite3
import os
import random
import sys
from PIL import Image

sys.path.insert(0, 'backend')
from breed_classifier import init_breed_classifier, classify_breed
from disease_classifier import init_disease_classifier, classify_disease

print("Initializing classifiers...")
init_breed_classifier()
init_disease_classifier()

conn = sqlite3.connect('backend/streetpaw.db')
c = conn.cursor()

c.execute("SELECT image_url FROM dogs")
in_db = set([r[0] for r in c.fetchall()])

dataset_dir = 'backend/dogs_dataset'
all_files = sorted([f for f in os.listdir(dataset_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
missing_files = [f for f in all_files if ('/dogs_dataset/' + f) not in in_db]

print(f"Total dataset images: {len(all_files)}. Already in DB: {len(in_db)}. Missing to insert: {len(missing_files)}.")

BANGALORE_LOCATIONS = [
    'Harohalli, Kanakapura Road',
    'Dayananda Sagar University (DSU Campus Gate 2)',
    'DSU Bus Stop and Transit Hub',
    'Bommanahalli Junction',
    'Kudlu Gate, Hosur Road',
    'Hosur Road Expressway Corridor',
    'Konanakunte Cross Metro Station',
    'HSR Layout Sector 1 and Agara Lake',
    'HSR Layout 27th Main Commercial Belt'
]

DOG_NAMES = ['Rocky', 'Kaalu', 'Sheru', 'Charlie', 'Milo', 'Leo', 'Tommy', 'Jack', 'Simba', 'Buster', 'Oscar', 'Teddy', 'Duke', 'Sammy', 'Toby', 'Rex', 'Scout', 'Rocco', 'Casper', 'Zeus', 'Diesel', 'Shadow', 'Copper', 'Rusty', 'Samson', 'Lucky', 'Bandit', 'Ollie', 'Dexter', 'Loki']

cur_max_res = c.execute("SELECT MAX(id) FROM dogs").fetchone()[0]
cur_max = cur_max_res if cur_max_res else 68

for idx, fname in enumerate(missing_files):
    dog_num = cur_max + idx + 1
    fpath = os.path.join(dataset_dir, fname)
    try:
        pil_img = Image.open(fpath).convert('RGB')
        breed_res = classify_breed(pil_img, use_tta=False)
        breed_name = breed_res.get('breed', 'Indian Breed')
        disease_res = classify_disease(pil_img)
        disease_name = disease_res.get('disease', 'Normal / No visible disease')
        disease_conf = float(disease_res.get('disease_confidence', 95.0))
    except Exception as e:
        print(f"Error classifying {fname}: {e}")
        breed_name = 'Indian Breed'
        disease_name = 'Normal / No visible disease'
        disease_conf = 95.0

    tag_id = f"DOG-{dog_num:04d}"
    public_code = f"PAW-{dog_num:04d}"
    name = f"{random.choice(DOG_NAMES)} ({tag_id})"
    loc = BANGALORE_LOCATIONS[dog_num % len(BANGALORE_LOCATIONS)]
    img_url = f"/dogs_dataset/{fname}"
    status = 'active_care' if 'Normal' in disease_name else 'under_observation'
    health_status = 'Healthy / Active' if 'Normal' in disease_name else f"Medical Care ({disease_name})"
    sterilised = 'yes' if dog_num % 2 == 0 else 'no'

    c.execute("""
        INSERT INTO dogs (
            public_code, animal_id, name, sex, approx_age, species, breed,
            breed_source, health_status, disease_name, disease_confidence,
            status, sterilised, ear_notch, primary_photo, image_url, location,
            location_lat, location_lng, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (
        public_code, tag_id, name, 'male' if dog_num % 2 == 0 else 'female',
        'Adult (3-5 yrs)', 'Dog', breed_name, 'ai', health_status, disease_name, disease_conf,
        status, sterilised, (sterilised == 'yes'), img_url, img_url, loc,
        12.9081 + random.uniform(-0.02, 0.02), 77.5653 + random.uniform(-0.02, 0.02)
    ))

conn.commit()
total = c.execute("SELECT COUNT(id) FROM dogs").fetchone()[0]
conn.close()
print(f"DONE! Total dogs in DB is now: {total}")
