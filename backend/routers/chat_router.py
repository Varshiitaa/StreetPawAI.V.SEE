import os
import json
import time
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Body, Request, status
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User, AuditLog, Contact
from db.audit import audit
from utils.auth import get_current_user_optional

chat_router = APIRouter(prefix="/api/chat", tags=["Pawly AI Animal Welfare Assistant"])

BACKEND_DIR = Path(__file__).resolve().parent.parent
FAQ_FILE = BACKEND_DIR / "faq.json"

# In-Memory Rate Limiter
_chat_rate_limit = defaultdict(list)

def check_chat_rate_limit(ip: str):
    now = time.time()
    _chat_rate_limit[ip] = [t for t in _chat_rate_limit[ip] if now - t < 60]
    if len(_chat_rate_limit[ip]) >= 40:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit reached. Please wait a moment."
        )
    _chat_rate_limit[ip].append(now)

# Comprehensive Set of 8 Predefined Distress & Emergency Questions
GUIDED_DISTRESS_QUESTIONS = [
    {
        "id": "injured_bleeding",
        "question": "What should I do if I find an injured or bleeding stray dog?",
        "category": "Immediate Trauma First-Aid",
        "steps": [
            "1. Approach slowly and talk in calm tones; injured dogs snap out of fear and pain.",
            "2. Gently place a clean blanket or jacket over the dog to keep it calm and prevent shock.",
            "3. If bleeding, apply firm, direct pressure with clean cotton or cloth (do not use tourniquets).",
            "4. Do NOT force-feed water or food to an unconscious or shocked animal.",
            "5. Immediately trigger the 'Report Distress SOS' button or dial a 24/7 rescue ambulance."
        ]
    },
    {
        "id": "dog_bite",
        "question": "What is the immediate protocol if a human gets bitten or scratched by a dog?",
        "category": "Bite Protocol & Anti-Rabies",
        "steps": [
            "1. Wash the bite wound immediately under running tap water with antiseptic soap for at least 15 minutes.",
            "2. Do NOT apply turmeric, chili powder, soil, or tight bandages onto the wound.",
            "3. Visit a hospital or doctor within 24 hours to begin Post-Exposure Anti-Rabies Vaccination (ARV).",
            "4. For deep punctures or category III bites, Rabies Immunoglobulin (RIG) must be infiltrated around the wound.",
            "5. Rabies is 100% preventable when post-exposure prophylaxis is started promptly."
        ]
    },
    {
        "id": "skin_mange",
        "question": "How to treat a street dog with severe hair loss, open sores, or non-stop scratching?",
        "category": "Skin Disease Triage",
        "steps": [
            "1. Most stray skin conditions are Demodicosis or Sarcoptic Mange caused by mites.",
            "2. Use the 'Skin & Health Assessment' feature on StreetPaw AI to classify the condition stage.",
            "3. Consult a field veterinarian for oral Fluralaner (Bravecto chewable) or Ivermectin dosage based on body weight.",
            "4. Supplement daily food with boiled eggs and coconut oil to rebuild damaged fur coat.",
            "5. Never apply toxic chemicals like engine oil or paint to dog skin sores."
        ]
    },
    {
        "id": "abandoned_puppies",
        "question": "What should I do if I find newborn or orphaned puppies on the road?",
        "category": "Puppy Survival Care",
        "steps": [
            "1. Observe from a distance for 2-3 hours to ensure the mother dog isn't simply out foraging.",
            "2. Keep the pups warm in a cardboard box lined with clean dry towels; cold is fatal to neonates.",
            "3. Do NOT feed raw cow milk (causes severe fatal diarrhea). Use canine replacement milk or warm goat milk with an eye dropper.",
            "4. After feeding, gently rub the puppy's tummy and genitals with a warm damp cloth to stimulate excretion.",
            "5. Register their location on the StreetPaw AI map to request volunteer foster support."
        ]
    },
    {
        "id": "animal_cruelty",
        "question": "What are the legal steps if someone is beating, poisoning, or harassing street dogs?",
        "category": "Legal Rights & Police FIR",
        "steps": [
            "1. Under Section 11 of the Prevention of Cruelty to Animals (PCA) Act 1960 and IPC 428/429, harming street dogs is a cognizable criminal offense.",
            "2. Citizens have a constitutional right to feed community animals protected by the Supreme Court of India.",
            "3. Relocating street dogs outside their territory is illegal under Animal Birth Control (ABC) Rules 2023.",
            "4. Gather video evidence safely, call Police Emergency (112), and request an FIR against the perpetrator."
        ]
    },
    {
        "id": "safe_feeding",
        "question": "What foods are safe and healthy to feed stray community dogs daily?",
        "category": "Diet & Community Feeding",
        "steps": [
            "1. Highly recommended foods: Boiled rice with turmeric and shredded boiled chicken/eggs, curd rice, or commercial dog kibble.",
            "2. Fresh clean drinking water is essential, especially in summer months.",
            "3. TOXIC FOODS TO AVOID: Chocolate, onions, garlic, grapes, raisins, xylitol sweetener, and cooked brittle poultry bones.",
            "4. Feed at regular fixed times away from busy roads and pedestrian doorways."
        ]
    },
    {
        "id": "sterilisation_abc",
        "question": "How does the Animal Birth Control (ABC) sterilisation process work in India?",
        "category": "ABC & Ear-Notch Verification",
        "steps": [
            "1. Under the ABC Rules, municipal authorities humanely catch street dogs for spay/neuter surgery and rabies vaccination.",
            "2. A small, painless V-notch is clipped on the right ear during surgery as permanent visual proof of sterilisation.",
            "3. After 3-5 days of post-op antibiotic care, the dog MUST be released back into its exact original territory.",
            "4. You can log ear-notched dogs on StreetPaw AI to track municipal ABC coverage."
        ]
    },
    {
        "id": "heatstroke_seizures",
        "question": "How to recognize and treat heatstroke or severe dehydration in street animals?",
        "category": "Summer Trauma Protocol",
        "steps": [
            "1. Symptoms include extreme panting, bright red gums, thick sticky saliva, dizziness, and collapse.",
            "2. Move the animal immediately into the shade and place wet towels over its neck, armpits, and paws.",
            "3. Do NOT dump freezing ice water directly over the head, as sudden vasoconstriction causes shock.",
            "4. Offer small sips of cool water with a pinch of electrolytes (ORS).",
            "5. Contact a veterinarian immediately if seizures or unresponsiveness occur."
        ]
    },
    {
        "id": "hospitals_closed",
        "question": "What should I do if all veterinary hospitals are closed? What precautions can I take?",
        "category": "After-Hours & Closed Hospital Emergency",
        "steps": [
            "1. CHECK 24/7 CASUALTY EMERGENCY: Major institutions like CUPA Trauma Center (Hebbal/RT Nagar) and Queen's Road Govt Veterinary Hospital run round-the-clock emergency triage. Check our 'Verified Help Directory' tab filtered for 24/7.",
            "2. BLEEDING & TRAUMA: Apply continuous, firm direct pressure with clean sterile gauze/cloth for 10-15 minutes without lifting. Do NOT use tight tourniquets or wires.",
            "3. PREVENT FATAL HYPOTHERMIA & SHOCK: Keep the animal in a warm, dark, silent room wrapped loosely in blankets. Shock causes rapid drop in core body temperature.",
            "4. STRICT WARNING ON HUMAN MEDICINES: NEVER give Paracetamol, Crocin, Dolo, Ibuprofen, or Aspirin. Human pain medications cause acute, irreversible liver/kidney necrosis in canines.",
            "5. SUSPECTED POISONING / TOXINS: Do NOT force-feed salt or oil to induce vomiting (this causes fatal aspiration). Keep airways clear and offer small sips of clean water or ORS if conscious.",
            "6. FRACTURES OR HIT-AND-RUN: Minimize movement. Slide a flat rigid wooden board or taut blanket under the dog to transport without twisting the spinal column.",
            "7. BROADCAST A COMMUNITY DISTRESS SOS: Hit the red 'REGISTER COMPLAINT / SOS' button on StreetPaw AI. Your ticket is dispatched to active field rescue units and nighttime patrol volunteers."
        ]
    },
    {
        "id": "bite_no_hospital",
        "question": "What precautions should I take if a dog bites and no hospitals are nearby?",
        "category": "Remote Bite First-Aid & Rabies Prevention",
        "steps": [
            "1. VIGOROUS FLUSHING (MOST CRITICAL STEP): Wash the bite wound immediately under running tap water with ordinary bathing soap or detergent for a FULL 15 MINUTES. The soap dissolves the lipid envelope of the Rabies virus, washing away >90% of viral load.",
            "2. APPLY ANTISEPTIC: After washing thoroughly, apply Povidone-Iodine (Betadine), Dettol/Savlon, or 70% surgical spirit generously into the wound to neutralize remaining virus particles.",
            "3. STRICT PROHIBITION ON HOME REMEDIES: NEVER put turmeric, red chili powder, lime (chuna), soil, kerosene, or plant poultices on the bite—they trap bacteria and cause severe sepsis.",
            "4. DO NOT BANDAGE TIGHTLY OR SUTURE: Never tie tight bandages or stitch the bite closed. Rabies is an anaerobic virus; airtight covering drives it deeper into peripheral nerves. Leave it open to breathe or cover very loosely with sterile gauze.",
            "5. CONTROL SEVERE BLEEDING: If an artery or large vein is punctured, hold clean pressure with sterile cloth without applying a tourniquet.",
            "6. 24-48 HOUR TRANSIT WINDOW FOR VACCINE: Anti-Rabies Vaccination (ARV) must be administered as early as possible. Plan transport to the nearest government Primary Health Center (PHC) or Taluk hospital where ARV is free. For Category III deep bleeding bites, Rabies Immunoglobulin (RIG) is also mandatory.",
            "7. OBSERVE THE DOG (IF LOCAL): If the stray or pet is known, observe it for 10-14 days. If it remains alive and healthy after 10 days, transmission risk from that bite is essentially zero (still complete your ARV schedule)."
        ]
    }
]

@chat_router.get("/guided-questions")
def get_guided_questions():
    """Returns predefined questions and interactive triage workflows"""
    return {
        "success": True,
        "questions": GUIDED_DISTRESS_QUESTIONS
    }

@chat_router.get("/emergency-contacts")
def get_emergency_contacts(
    q: Optional[str] = None,
    type: Optional[str] = None,
    city: Optional[str] = None,
    is_24x7: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Returns verified rescue ambulances, NGOs, and municipal helplines with optional search & filters"""
    query = db.query(Contact)
    
    if type and type != "all":
        query = query.filter(Contact.type.ilike(f"%{type}%"))
    if city and city != "all":
        query = query.filter(Contact.city.ilike(f"%{city}%"))
    if is_24x7 is not None:
        query = query.filter(Contact.is_24x7 == is_24x7)
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            (Contact.name.ilike(pattern)) |
            (Contact.city.ilike(pattern)) |
            (Contact.phone.ilike(pattern)) |
            (Contact.type.ilike(pattern)) |
            (Contact.state.ilike(pattern))
        )
        
    contacts = query.order_by(Contact.is_24x7.desc(), Contact.name.asc()).all()
    
    return {
        "success": True,
        "count": len(contacts),
        "contacts": [
            {
                "id": c.id,
                "name": c.name,
                "phone": c.phone,
                "type": c.type,
                "email": c.email,
                "website": c.website,
                "is_24x7": c.is_24x7,
                "city": c.city or "Bengaluru",
                "state": c.state or "Karnataka",
                "services": c.services or ["Rescue Ambulance", "Veterinary Care"],
                "hours": c.hours or "24/7"
            } for c in contacts
        ]
    }

@chat_router.post("/query")
def chat_query(
    data: dict = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Processes user query and provides structured first-aid guidance"""
    client_ip = request.client.host if request and request.client else "127.0.0.1"
    check_chat_rate_limit(client_ip)
    
    query = (data.get("message") or data.get("query") or "").strip().lower()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. First check high-priority emergency and specific queries (e.g. bite with no hospital, closed hospitals)
    if ("bite" in query or "bitten" in query) and any(phrase in query for phrase in ["no hospital", "hospitals closed", "no clinic", "nearby", "far", "remote", "precaution"]):
        for q in GUIDED_DISTRESS_QUESTIONS:
            if q["id"] == "bite_no_hospital":
                return {
                    "success": True,
                    "reply": "\n".join(q["steps"]),
                    "category": q["category"],
                    "is_guided": True
                }

    if any(phrase in query for phrase in ["closed", "no vet", "no hospital", "night emergency", "after hours", "precaution"]):
        for q in GUIDED_DISTRESS_QUESTIONS:
            if q["id"] == "hospitals_closed":
                return {
                    "success": True,
                    "reply": "\n".join(q["steps"]),
                    "category": q["category"],
                    "is_guided": True
                }

    # 2. Match predefined guided questions by key phrase match
    for q in GUIDED_DISTRESS_QUESTIONS:
        keywords = q["id"].split("_")
        # Ensure multi-token keywords match sensibly
        if all(k in query for k in keywords):
            return {
                "success": True,
                "reply": "\n".join(q["steps"]),
                "category": q["category"],
                "is_guided": True
            }

    # 3. Match FAQ database with scored keyword overlap (longer match wins)
    best_faq = None
    best_len = 0
    if FAQ_FILE.exists():
        with open(FAQ_FILE, "r", encoding="utf-8") as f:
            faqs = json.load(f)
            for item in faqs:
                for kw in item.get("keywords", []):
                    kw_lower = kw.lower()
                    if kw_lower in query and len(kw_lower) > best_len:
                        best_faq = item
                        best_len = len(kw_lower)

    if best_faq:
        return {
            "success": True,
            "reply": best_faq.get("answer"),
            "category": "Welfare Knowledge Base",
            "is_guided": False
        }

    return {
        "success": True,
        "reply": "I am here to guide you with any stray animal emergency. You can click any of our 8 guided emergency triage protocols above, check verified rescue ambulances in Bengaluru, or report an urgent distress SOS directly to our rescue dispatch units.",
        "category": "Assistant Response",
        "is_guided": False
    }
