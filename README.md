# StreetPaw.AI — Collaborative Stray Animal Welfare & Rescue Ecosystem

StreetPaw.AI is an AI-powered canine welfare and rescue management platform connecting Citizens, Municipal Bodies (BBMP/Local Govts), and registered NGO Shelters.

---

## ⚡ Quick Start for Setup on Any Machine

### Prerequisites
- **Python 3.10+** (Tested on Python 3.11 & 3.13)
- **Node.js 18+** & npm
- **Git**

---

### Step 1: Clone Repository
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd radiant-raman
```

---

### Step 2: Backend Setup (FastAPI + PyTorch + SQLite)
```bash
cd backend
python -m venv venv

# Windows activate:
venv\Scripts\activate
# Linux/Mac activate:
source venv/bin/activate

# Install dependencies:
pip install -r requirements.txt

# Start backend server:
python main.py
```
*Backend runs on `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.*

---

### Step 3: Frontend Setup (Vite + React)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs live on `http://localhost:5173`.*

---

### 🚀 One-Click Launch (Windows)
Double-click `start_all.bat` in the root folder to launch both backend and frontend simultaneously in separate terminals.

---

## 🔑 Demo Access Credentials

| Role | Username | Password | Notes |
|---|---|---|---|
| **System Admin** | `admin_varshita` | `admin123` | Full admin privileges, audit log inspection, organization approvals |
| **Govt / NGO Official** | `gov_officer` | `ngo123` | Match recovery approvals, kennel management, dispatch tickets |
| **Citizen User** | `citizen_user` | `cit123` | Lost & found pet reporting, complaints, vision scan triage |

*Or click **"Fill Demo Citizen"** or **"Fill Demo Govt/NGO"** directly on the login screen.*

---

## 🛠 Features Overview
- **AI Computer Vision & Triage Suite**: Quadruped localization (YOLOv8), 120-class dog breed classification (PyTorch ViT/ResNet), and skin lesion disease screening.
- **Lost & Found Recovery Desk**: Re-ID embedding similarity scoring, phone privacy masks, in-app direct chat, and community voting/remarks.
- **Distress & Rescue Complaint Tracking**: Live tracking timeline, municipal dispatch status, and interactive OpenStreetMap incident pins.
- **Master Export Center**: Real-time downloadable formatted Excel (`.xlsx`) and CSV reports for municipal census and analytics.
