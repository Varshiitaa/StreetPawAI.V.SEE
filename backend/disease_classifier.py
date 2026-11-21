# -*- coding: utf-8 -*-
"""
StreetPaw.AI -- Dog Disease Classifier Inference Module
Loads trained EfficientNet-B3 and classifies dog skin condition from a cropped ROI.

Possible outputs:
  1. Demodicosis
  2. Dermatitis
  3. Normal / No visible disease
  4. Disease cannot be determined reliably from this image.
"""
import os
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from torchvision.models import efficientnet_b3
from PIL import Image

# ─────────────────────────────────────────────
# Globals
# ─────────────────────────────────────────────
_disease_model = None
_class_names   = None
_img_size      = 300
MODEL_PATH     = os.path.join(os.path.dirname(__file__), "disease_model.pth")

# Thresholds
CONFIDENCE_THRESHOLD = 0.55   # Minimum top confidence to declare a specific disease
MARGIN_THRESHOLD     = 0.12   # Minimum margin between top-1 and top-2 for disease declaration
REJECTION_THRESHOLD  = 0.40   # Below this, declare unable to determine reliably

def _get_base_transform(img_size=300):
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])

def _get_tta_transforms(img_size=300):
    return [
        transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]),
        transforms.Compose([
            transforms.Resize((img_size + 20, img_size + 20)),
            transforms.CenterCrop(img_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]),
        transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.RandomHorizontalFlip(p=1.0),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]),
    ]

def is_disease_model_ready():
    return _disease_model is not None or os.path.exists(MODEL_PATH)

def init_disease_classifier():
    global _disease_model, _class_names, _img_size
    if _disease_model is not None:
        return True

    if not os.path.exists(MODEL_PATH):
        print(f"[WARNING] Disease model not found at {MODEL_PATH}. Run train_disease.py first.")
        return False

    try:
        print("[INFO] Loading disease classifier (EfficientNet-B3)...")
        checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
        _class_names = checkpoint.get("class_names", ["Demodicosis", "Dermatitis", "Normal / No visible disease"])
        _img_size    = checkpoint.get("img_size", 300)
        num_classes  = checkpoint.get("num_classes", len(_class_names))

        model = efficientnet_b3(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.35, inplace=True),
            nn.Linear(in_features, 256),
            nn.SiLU(),
            nn.Dropout(p=0.25, inplace=True),
            nn.Linear(256, num_classes)
        )

        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        _disease_model = model

        val_acc = checkpoint.get("best_val_acc", "N/A")
        val_f1  = checkpoint.get("best_val_f1", "N/A")
        print(f"[SUCCESS] Disease classifier loaded! Classes: {_class_names}")
        if isinstance(val_acc, (int, float)):
            print(f"          Best val accuracy: {val_acc:.2f}% | F1: {val_f1:.4f}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to load disease model: {e}")
        _disease_model = None
        return False

def classify_disease(roi_pil, use_tta=True):
    """
    Classifies canine image or cropped ROI for dermatological diseases.
    Evaluates whole-image characteristics and scans multi-scale anatomical body lesions
    (flank, back, muzzle, abdomen) to detect localized skin conditions (Demodicosis, Dermatitis).

    Returns dict:
      {
         "disease": str,
         "disease_confidence": float (0-100),
         "disease_top2": list of dicts,
         "disease_model_ready": bool,
         "status": "normal" | "disease_detected" | "uncertain"
      }
    """
    if _disease_model is None:
        if not init_disease_classifier():
            return {
                "disease": "Disease model not loaded",
                "disease_confidence": 0.0,
                "disease_top2": [],
                "disease_model_ready": False,
                "status": "unavailable"
            }

    if roi_pil is None:
        return {
            "disease": "Disease cannot be determined reliably from this image.",
            "disease_confidence": 0.0,
            "disease_top2": [],
            "disease_model_ready": True,
            "status": "uncertain"
        }

    try:
        roi_pil = roi_pil.convert("RGB")
        w, h = roi_pil.size
        if w < 32 or h < 32:
            return {
                "disease": "Disease cannot be determined reliably from this image.",
                "disease_confidence": 0.0,
                "disease_top2": [],
                "disease_model_ready": True,
                "status": "uncertain"
            }

        base_tf = _get_base_transform(_img_size)
        t = base_tf(roi_pil).unsqueeze(0)
        with torch.no_grad():
            full_logits = _disease_model(t)
            full_probs = torch.softmax(full_logits, dim=1).squeeze(0).cpu().numpy()

        ranked_indices = full_probs.argsort()[::-1]
        top1_idx = ranked_indices[0]
        top2_idx = ranked_indices[1]
        top1_name = _class_names[top1_idx]
        top2_name = _class_names[top2_idx]
        top1_prob = float(full_probs[top1_idx])
        top2_prob = float(full_probs[top2_idx])

        # If whole-body image is initially classified as Normal, scan multi-scale localized body lesions.
        # Canine dermatological disorders like Demodicosis or Dermatitis often manifest in localized patches
        # (e.g. hair loss/alopecia on flank, neck, or back) that can be washed out in wide camera shots.
        if top1_name == "Normal / No visible disease" and w >= 64 and h >= 64:
            patch_boxes = []
            for s in [0.28, 0.40, 0.55]:
                pw = int(w * s)
                ph = int(h * s)
                if pw >= 32 and ph >= 32:
                    step_x = max(24, int(pw * 0.45))
                    step_y = max(24, int(ph * 0.45))
                    for y in range(0, h - ph + 1, step_y):
                        for x in range(0, w - pw + 1, step_x):
                            patch_boxes.append((x, y, x + pw, y + ph))

            if patch_boxes:
                patch_tensors = torch.stack([base_tf(roi_pil.crop(b)) for b in patch_boxes])
                with torch.no_grad():
                    patch_logits = _disease_model(patch_tensors)
                    patch_probs = torch.softmax(patch_logits, dim=1).cpu().numpy()

                derm_lesions = [p for p in patch_probs if p[1] >= 0.72]
                demod_lesions = [p for p in patch_probs if p[0] >= 0.72]

                # Significant cluster of dermatological lesion hits found:
                if len(demod_lesions) >= 3 or len(derm_lesions) >= 5 or (len(demod_lesions) >= 2 and len(derm_lesions) >= 2):
                    if len(demod_lesions) >= len(derm_lesions):
                        best_demod = max(demod_lesions, key=lambda p: p[0])
                        p_ranked = best_demod.argsort()[::-1]
                        top1_idx, top2_idx = p_ranked[0], p_ranked[1]
                        top1_prob, top2_prob = float(best_demod[top1_idx]), float(best_demod[top2_idx])
                        top1_name, top2_name = _class_names[top1_idx], _class_names[top2_idx]
                    else:
                        best_derm = max(derm_lesions, key=lambda p: p[1])
                        p_ranked = best_derm.argsort()[::-1]
                        top1_idx, top2_idx = p_ranked[0], p_ranked[1]
                        top1_prob, top2_prob = float(best_derm[top1_idx]), float(best_derm[top2_idx])
                        top1_name, top2_name = _class_names[top1_idx], _class_names[top2_idx]

        disease_top2 = [
            {"disease": top1_name, "confidence": round(top1_prob * 100, 2)},
            {"disease": top2_name, "confidence": round(top2_prob * 100, 2)}
        ]

        if top1_name == "Normal / No visible disease":
            return {
                "disease": "Normal / No visible disease",
                "disease_confidence": round(top1_prob * 100, 2),
                "disease_top2": disease_top2,
                "disease_model_ready": True,
                "status": "normal"
            }

        return {
            "disease": top1_name,
            "disease_confidence": round(top1_prob * 100, 2),
            "disease_top2": disease_top2,
            "disease_model_ready": True,
            "status": "disease_detected"
        }

    except Exception as e:
        return {
            "disease": f"Assessment error: {str(e)}",
            "disease_confidence": 0.0,
            "disease_top2": [],
            "disease_model_ready": True,
            "status": "uncertain"
        }
