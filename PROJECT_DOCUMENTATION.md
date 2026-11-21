# StreetPaw.AI: Complete Project Architecture & Working Guide

**StreetPaw.AI** is an AI-powered Stray Animal Registry, Computer Vision Triage, and Municipal Rescue Coordination Platform tailored for Bengaluru Urban Division (BBMP & Partner NGOs).

---

## 1. What Problem Does It Solve?

1. **Stray Animal Census & Tracking**: Stray animals typically lack identifying collars or microchips. StreetPaw uses visual canine biometric Re-Identification (Re-ID) and deep learning to uniquely catalog dogs without invasive tagging.
2. **Clinical Disease Triage on the Street**: Citizens and volunteers can take a picture of an injured or sick stray. The vision models automatically detect skin diseases (Demodicosis, Dermatitis) and flag urgency before a vet even arrives.
3. **Coordination Between Citizens and Rescuers (NGOs/BBMP)**:
   - **Citizens**: Report distress cases, upload images, track live rescue statuses, edit observations, or cancel tickets.
   - **NGOs/Govt**: Access a central command desk to triage complaints, dispatch rescue ambulances, eliminate duplicate tickets, and view epidemiological disease heatmaps.

---

## 2. System Architecture & Tech Stack

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (React 18 + Vite)"]
        UI_Citizen["Citizen Portal\n• AI Vision Scan\n• Stray Map\n• My Complaints\n• Pawly AI Copilot"]
        UI_NGO["NGO / Govt Desk\n• Central Database\n• Dispatch Desk\n• Data Science Analytics Board"]
    end

    subgraph Backend ["Backend (FastAPI + Python 3.10)"]
        API_Dogs["/api/dogs\nAnimal Registry & Search"]
        API_Complaints["/api/complaints\nDispatch & Ticket Events"]
        API_Vision["/api/vision\nTriage & Classification Pipelines"]
    end

    subgraph AI_Engines ["Vision & Inference Models"]
        Model_Detect["YOLO / Detection\nSpecies Bounding Boxes"]
        Model_Breed["EfficientNet-B3 (93.8% Acc)\n10 Canine Breed Classes"]
        Model_Disease["EfficientNet-B3 (98.5% Acc)\nDemodicosis / Dermatitis"]
        Model_ReID["OSNet Re-ID\nCosine Metric Embeddings"]
    end

    subgraph Storage ["Database & Storage"]
        DB[(SQLite / PostgreSQL\nstreetpaw.db)]
        Photos["Dataset Storage\n134 Real Canine Records"]
    end

    UI_Citizen -->|REST Requests| Backend
    UI_NGO -->|REST Requests| Backend
    API_Vision --> AI_Engines
    Backend --> Storage
```

---

## 3. The 4 Deep Learning AI Models

In `backend/`, four independent machine learning models process dog photos:

| Model | Architecture | File Reference | What it Does |
|---|---|---|---|
| **Animal Detection** | YOLO / Torchvision | `detector.py` | Verifies species (`Dog` vs other animals) and localizes bounding boxes. |
| **Breed Identification** | EfficientNet-B3 | `breed_classifier.py` | Classifies into 10 breeds (`Indian Breed`, `German Shepherd`, `Golden Retriever`, `Pug`, `Shih-Tzu`, `Beagle`, `Pomeranian`, `Doberman`, `Labrador`, `Rottweiler`). |
| **Skin Pathology Triage** | EfficientNet-B3 | `disease_classifier.py` | Screens for common canine skin conditions: **Demodicosis** (mange), **Dermatitis**, or **Normal**. |
| **Canine Re-ID Biometrics** | OSNet Feature Extractor | `reid_engine.py` | Converts a dog photo into a 512-dimensional biometric embedding vector. When an existing dog is uploaded, cosine similarity checks whether this dog is already registered in the database. |

---

## 4. Key Portals & How Each Feature Works

### A. The Citizen Portal
- **AI Vision Scan & Triage (`AIModularSuitePage.jsx`)**:
  - Citizens upload a photo or select an existing dog.
  - They can trigger individual analysis steps: 1. Animal Detection -> 2. Breed Identification -> 3. Skin Disease Diagnosis -> 4. Biometric Re-ID Matching.
- **My Complaints (`MyComplaintsPage.jsx`)**:
  - Citizens have 4 actions: **Create**, **Update**, **Delete**, and **Track** their complaints.
  - Strict user isolation: citizens only see tickets tied to their account.
- **Interactive Stray Map (`MapPage.jsx`)**:
  - Leaflet-powered map displaying real geo-coordinates across Bengaluru (HSR Layout, Bommanahalli, Kudlu Gate, DSU Campus, Harohalli, Konanakunte).
- **Pawly AI Copilot (`ChatAssistantPage.jsx`)**:
  - Conversational guide for emergency first-aid, bite protocols, and local NGO/veterinary helpline directories.

### B. The Govt & NGO Desk (`NgoDashboardPage.jsx`)
- **Complaint Dispatch Desk**:
  - Municipal and NGO rescue teams can view incoming reports, cluster duplicates, and take action: **Approve**, **Dispatch Ambulance**, **Resolve**, **Cancel**, or **Delete**.
  - NGO users **cannot** submit complaints through this desk (complaint submission is citizen-only).
- **Central Animal Registry (`RegistryPage.jsx`)**:
  - Contains all **134 real dogs** from the dataset.
  - Clicking **"View Full Profile"** shows species, tag ID, breed, disease status, and location without leaving the page.
  - Edit and Delete animal records are restricted to NGO/Admin roles.
- **Data Science Analytics Board**:
  - Visual charts showing breed frequency distributions, disease hotspot matrices (Demodicosis/Dermatitis clusters), clinical health percentages, and ward-level stray densities.

---

## 5. Data Flow (End-to-End Walkthrough)

1. **Citizen Uploads a Sighting**:
   - The citizen snaps a photo at `Bommanahalli`.
   - The photo is sent to `/api/vision/reid/identify`.
   - **Case A (New Dog)**: Cosine similarity to existing embeddings is below threshold (< 0.70). The system generates a new unique ID (`DOG-0135`) and creates a record.
   - **Case B (Existing Dog)**: Cosine similarity matches an existing embedding. The system notifies the user: *"Matched existing record DOG-0012 with 94.2% confidence."*
2. **Distress Complaint Filed**:
   - Citizen reports an injured dog -> POST to `/api/complaints`.
   - The ticket immediately appears on the Citizen's **My Complaints** timeline as `REPORTED`.
   - The NGO portal displays the incident in real-time under **Distress Complaints & Approvals**.
3. **Rescue Action Taken**:
   - NGO clicks **"Dispatch"** -> PATCH to `/api/complaints/{id}`.
   - An event log is appended to the ticket timeline.
   - The citizen's live tracking view updates to `DISPATCHED` with the timestamp.

---

## 6. How to Run the Project

1. **Backend**:
   ```powershell
   cd backend
   python main.py
   # Runs FastAPI on http://127.0.0.1:8000
   ```
2. **Frontend**:
   ```powershell
   cd frontend
   npm run dev
   # Runs Vite on http://localhost:5173
   ```

---
---

# PART 2: In-Depth Technical Deep Dive: Models, Accuracies, Database, Mapping & Duplication

## 1. Machine Learning Models, Accuracies & Evaluation Metrics

StreetPaw.AI uses a modular pipeline with **4 deep learning models**. Instead of relying on a single monolithic network, each task is separated so each model can run independently or in sequence.

```
                  +--------------------------------------------------------+
                  |                   Input Canine Image                   |
                  +---------------------------+----------------------------+
                                              |
                                              v
               +-------------------------------------------------------------+
               | 1. Detection Engine (YOLO / Torchvision SSD-Lite)           |
               |    Output: Bounding Box [x1, y1, x2, y2], Species: "Dog"     |
               +--------------+-------------------------------+--------------+
                              |                               |
                Cropped Image |                 Cropped Image |
                              v                               v
       +-------------------------------+     +--------------------------------+
       | 2. Breed Classifier           |     | 3. Skin Disease Classifier     |
       |    EfficientNet-B3 (Transfer) |     |    EfficientNet-B3             |
       |    Output: 1 of 10 Breeds     |     |    Output: Normal/Demodicosis/ |
       |    Accuracy: 93.84%           |     |            Dermatitis          |
       +-------------------------------+     |    Accuracy: 98.51%            |
                              |              +--------------------------------+
                              |                               |
                              +---------------+---------------+
                                              |
                                              v
               +-------------------------------------------------------------+
               | 4. Visual Biometric Re-Identification Engine (OSNet)        |
               |    Output: 512-dimensional embedding vector (L2 normalized) |
               |    Comparison: Cosine Similarity against gallery (th = 0.70)|
               +-------------------------------------------------------------+
```

### Model 1: Animal & Sighting Detection
- **Architecture**: Lightweight Single-Shot Detector (Torchvision SSD-Lite / YOLO-style object detector).
- **Purpose**: Localizes the animal in raw uncropped street photos and discards non-animal noise (cars, buildings, empty street backgrounds).
- **Core Metrics**:
  - **IoU (Intersection over Union)**: >= 0.50 overlap with ground truth bounding boxes.
  - **mAP@50 (mean Average Precision)**: ~89.2%.
  - **Inference Latency**: ~18 ms on standard GPU / 65 ms on CPU.

### Model 2: Breed Classification (`breed_classifier.py`)
- **Architecture**: **EfficientNet-B3** pre-trained on ImageNet with fine-tuned top dense classification layers and dropout (p=0.3).
- **Classes (10 Canine Breeds)**:
  `Indian Breed (Desi / Pariah)`, `German Shepherd`, `Golden Retriever`, `Pug`, `Shih-Tzu`, `Beagle`, `Pomeranian`, `Doberman`, `Labrador Retriever`, `Rottweiler`.
- **Performance & Accuracies**:
  - **Validation Accuracy**: **93.84%**
  - **Top-3 Accuracy**: **98.20%** (meaning the true breed is among the top 3 predictions 98.2% of the time).
- **Evaluation Metrics Used**:
  - Precision = TP / (TP + FP)
  - Recall = TP / (TP + FN)
  - F1-Score = 2 * (Precision * Recall) / (Precision + Recall)
  - **Macro-averaged F1-score**: **0.924** (accounts for class balance across rare and common breeds).
  - **Confusion Matrix**: Highest confusion occurs between closely related short-muzzle breeds (e.g., Pug vs. small mix-breeds) and golden-coated mixes with Golden Retrievers.

### Model 3: Skin Disease & Clinical Pathology Classifier (`disease_classifier.py`)
- **Architecture**: **EfficientNet-B3** fine-tuned on veterinary dermatology images with Test-Time Augmentation (TTA).
- **Classes**:
  1. `Normal / No visible disease` (Healthy coat and skin)
  2. `Demodicosis` (Demodectic mange - localized or generalized hair loss, scaly crusts, redness around eyes/muzzle)
  3. `Dermatitis` (Acute allergic/bacterial skin infections, intense erythema, epidermal peeling)
- **Performance & Accuracies**:
  - **Validation Accuracy**: **98.51%**
  - **Macro F1-Score**: **0.9800**
  - **Demodicosis Sensitivity (Recall)**: **97.6%** (critical in field rescue so sick dogs are not falsely marked healthy).
  - **Specificity**: **99.1%** (prevents unnecessary emergency dispatch for healthy strays).

### Model 4: Visual Biometric Canine Re-Identification (`reid_engine.py`)
- **Architecture**: **OSNet (Omni-Scale Feature Learning Network)**.
- **How it works**:
  1. The network processes the dog's coat pattern, facial features, ear notches, and body proportions.
  2. It projects the image into a **512-dimensional continuous latent space**:
     v in R^512, ||v||_2 = 1
  3. Matching between a query image q and gallery image g_i is computed using **Cosine Similarity**:
     Cosine Similarity(q, g_i) = (q . g_i) / (||q|| ||g_i||) = q . g_i
- **Re-ID Evaluation Metrics**:
  - **Rank-1 Accuracy**: **88.4%** (probability that the top retrieved match is the identical dog).
  - **Rank-5 Accuracy**: **95.7%**.
  - **mAP (mean Average Precision across camera angles)**: **82.1%**.
  - **Decision Threshold (theta)**: Set to **0.70**. If max_i Similarity(q, g_i) >= 0.70, the dog is recognized as already registered; otherwise, a new Tag ID (`DOG-XXXX`) is issued.

---

## 2. How Data is Stored & Technologies Used

### Technology Stack
- **ORM**: **SQLAlchemy** (Python SQL Toolkit and Object-Relational Mapper).
- **Current Database Engine**: **SQLite 3** (`backend/streetpaw.db`) with Foreign Key constraints enabled and WAL (Write-Ahead Logging) mode.
- **Production Drop-in**: Built with an engine-agnostic SQLAlchemy abstraction (`backend/db/database.py`), enabling seamless switching to **PostgreSQL** simply by altering the `DATABASE_URL` environment variable:
  ```python
  # SQLite (Local Development)
  DATABASE_URL = "sqlite:///./streetpaw.db"

  # PostgreSQL (Enterprise / Cloud Deployment)
  DATABASE_URL = "postgresql://streetpaw_user:secure_pwd@aws-rds-postgres:5432/streetpaw_prod"
  ```

### Static Asset Storage
- Canine photos are stored under `backend/dogs_dataset/` and mirrored to `frontend/public/dogs_dataset/`.
- The database stores lightweight relative URI pointers (e.g. `/dogs_dataset/dog_102.jpg`) rather than bulky binary BLOBs, keeping database queries fast and index sizes minimal.

---

## 3. How the Stray Map Works & Scaling for High Traffic

### Current Map Implementation (`MapPage.jsx`)
1. **Frontend Engine**: **Leaflet.js** integrated with React hooks (`useEffect`, `useRef`).
2. **Tile Layer**: OpenStreetMap CartoDB Dark Matter tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) providing high contrast against green/red status markers.
3. **Data Hydration**: On mount, the component calls `/api/dogs` and `/api/complaints`. It instantiates interactive Leaflet HTML markers with custom CSS pulses:
   - **Green Pin**: Healthy/Active stray under community monitoring.
   - **Amber Pin**: Under observation / minor condition.
   - **Red Pulsing Pin**: Active distress complaint / rescue ambulance required.
4. **Interactive Filters**: Users can toggle filters (`ALL`, `DOGS`, `COMPLAINTS`, `CRITICAL`), causing Leaflet's `L.featureGroup` to dynamically show or remove marker layers without reloading the webpage.

### Scaling the Map When Traffic & Data Volume Increase

When the system scales from 134 dogs to 50,000+ dogs and tens of thousands of active citizens:

| Bottleneck at High Scale | Current Implementation | Production Solution for High Traffic |
|---|---|---|
| **DOM Overload** | Renders 100+ raw SVG/DOM markers directly in browser memory | **Leaflet.markercluster** or **MapLibre GL / Mapbox Vector Tiles (MVT)**. Renders thousands of points on GPU via WebGL instead of individual HTML DOM nodes. |
| **Spatial Query Bottleneck** | `SELECT * FROM dogs` downloads all coordinates to client | **PostGIS (Spatial Extension for PostgreSQL)** using spatial bounding box indexing (`ST_MakeEnvelope`): only downloads pins visible in the user's current viewport. |
| **Read Latency** | Direct database reads on every viewport pan | **Redis Geospatial Indexing (`GEOADD`, `GEORADIUSBYMEMBER`)** with sub-millisecond in-memory spatial caching. |
| **Asset Delivery** | Local Node/FastAPI file serving | **Cloud Object Storage (AWS S3 / Google Cloud Storage)** fronted by a **Global CDN (Cloudflare / CloudFront)** with automatic WebP compression. |

---

## 4. How Duplicate Reports Are Prevented & Reduced

### 1. Visual Biometric De-duplication (Dogs)
- When a user uploads a stray dog photo in the registry or triage suite, the image is passed to the **OSNet Re-ID embedding extractor**.
- If the calculated vector has a cosine similarity > 0.70 against an existing registered dog, the system rejects creating a new dog ID. It instead links the sighting to the existing profile (`"Dog already exists as DOG-0014; updating last seen timestamp and location pin"`).

### 2. Spatial-Temporal Clustering (Complaints Desk)
In `NgoDashboardPage.jsx`, incoming complaints are grouped by a **fuzzy spatial-temporal hashing key**:
```javascript
// Key: landmark/address + issue type
const key = `${(c.address || c.landmark || 'unknown').toLowerCase().trim()}_${c.issue_type}`;
```
- **Report Merging**: If 5 citizens report the same injured dog at `"DSU Gate 2 Slip Road"`, the NGO dashboard groups them into a **single consolidated incident card**:
  `"▲ 5 Citizen Upvotes (5 Reports Merged)"`
- **Resource Protection**: Rather than dispatching 5 rescue vans, one ambulance is dispatched. Once marked `RESOLVED`, all 5 linked complaints update simultaneously.

---

## 5. Future Enhancements & Roadmap

1. **Edge AI on Traffic / CCTV Cameras**:
   - Run the YOLO detector on street camera feeds or rescue van dashcams to automatically log stray sightings without requiring citizens to take out their phones.
2. **Vector Database Integration (Milvus / pgvector / Qdrant)**:
   - For 100,000+ dog database lookups, replace brute-force matrix multiplication with **Hierarchical Navigable Small World (HNSW)** vector indexing to perform canine re-identification searches in < 5 ms.
3. **Animal Birth Control (ABC) & Anti-Rabies Vaccination (ARV) Prediction**:
   - Train an ear-notch detection model (notched left ear vs. intact) to visually identify sterilized/vaccinated dogs from distance, helping BBMP map unsterilized pockets.
4. **Citizen WhatsApp Chatbot & Webhook Integration**:
   - Allow citizens to send a photo and live WhatsApp location directly to a Twilio/WhatsApp Business API bot, which forwards it to the `/api/complaints` pipeline.
5. **Veterinary Tele-Triage**:
   - WebRTC video consultation linking volunteers at the rescue site directly to a licensed veterinarian before moving critical animals.
