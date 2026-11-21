import torch
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import numpy as np
import cv2

# Global classifier model
classifier_model = None
preprocess_transform = None

# Comprehensive ImageNet Class Index Sets
# 151..268 are domestic dog breeds (Golden, German shepherd, Beagle, Pug, Terrier, etc.)
# 269..275 are wild canids (timber wolf, white wolf, red wolf, coyote, dingo, dhole, African hunting dog)
DOG_INDICES = set(range(151, 276))

# 281..285 domestic cats (tabby, tiger cat, Persian, Siamese, Egyptian cat) + 286..293 wild felids
CAT_INDICES = set(range(281, 294))

# 341: hog, 342: wild boar, 343: warthog
PIG_INDICES = {341, 342, 343}

# Bovine / Cattle: 345: ox, 346: water buffalo, 347: bison
BOVINE_INDICES = {345, 346, 347}

# Equine / Horse: 339: sorrel (horse), 340: zebra
EQUINE_INDICES = {339, 340}

def init_classifier():
    global classifier_model, preprocess_transform
    if classifier_model is None:
        try:
            print("[INFO] Initializing Specialized Multi-Species Neural Classifier...")
            weights = models.MobileNet_V3_Small_Weights.DEFAULT
            classifier_model = models.mobilenet_v3_small(weights=weights)
            classifier_model.eval()
            preprocess_transform = weights.transforms()
            print("[SUCCESS] Multi-Species Neural Classifier ready!")
        except Exception as e:
            print(f"[WARNING] Could not load MobileNetV3: {e}")

def classify_roi(pil_img_crop, yolo_cls_id=None, yolo_conf=0.0):
    """
    Evaluates cropped ROI using MobileNetV3 deep embeddings + color texture heuristics.
    Prioritizes high accuracy for Dogs (domestic + street mixes), Cats, Pigs, Cattle/Cows/Buffalo, and Horses.
    """
    global classifier_model, preprocess_transform
    if classifier_model is None:
        init_classifier()
        
    if pil_img_crop is None:
        if yolo_cls_id == 16: return "Dog", yolo_conf
        if yolo_cls_id == 15: return "Cat", yolo_conf
        if yolo_cls_id == 18: return "Pig", yolo_conf
        if yolo_cls_id == 19: return "Cattle / Cow", yolo_conf
        if yolo_cls_id == 17: return "Horse", yolo_conf
        return None, 0.0

    # Color & Texture heuristics (HSV space)
    hsv_is_pig = False
    is_dark_bovine = False
    try:
        img_np = np.array(pil_img_crop)
        if img_np.size > 0:
            hsv = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
            avg_h = np.mean(hsv[:, :, 0])
            avg_s = np.mean(hsv[:, :, 1])
            avg_v = np.mean(hsv[:, :, 2])
            h, w, _ = img_np.shape
            ratio = w / float(h) if h > 0 else 1.0
            
            # Pig pinkish/light-grey skin tone
            if (0 <= avg_h <= 30) and (20 <= avg_s <= 140) and (avg_v > 90) and (0.9 <= ratio <= 2.2):
                hsv_is_pig = True
                
            # Water buffalo dark slate-grey / black skin tone
            if avg_v < 65 and avg_s < 80:
                is_dark_bovine = True
    except Exception as e:
        pass

    # Deep Neural Feature Evaluation via MobileNetV3
    if classifier_model is not None and preprocess_transform is not None:
        try:
            tensor_img = preprocess_transform(pil_img_crop).unsqueeze(0)
            with torch.no_grad():
                outputs = classifier_model(tensor_img)
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
                top_prob, top_catid = torch.topk(probabilities, 15)
                
            top1_idx = top_catid[0].item()
            top1_prob = float(top_prob[0].item())

            # Category aggregate probabilities in top 15
            p_dog = sum(float(probabilities[i].item()) for i in DOG_INDICES)
            p_cat = sum(float(probabilities[i].item()) for i in CAT_INDICES)
            p_pig = sum(float(probabilities[i].item()) for i in PIG_INDICES)
            p_bovine = sum(float(probabilities[i].item()) for i in BOVINE_INDICES)
            p_equine = sum(float(probabilities[i].item()) for i in EQUINE_INDICES)

            # High priority: DOG detection accuracy
            if yolo_cls_id == 16:
                # YOLO detected dog - verify it isn't an obvious cat or pig
                if p_cat > 0.45 and p_cat > p_dog:
                    return "Cat", max(p_cat, yolo_conf)
                if (top1_idx in PIG_INDICES or hsv_is_pig) and p_pig > 0.35 and p_pig > p_dog:
                    return "Pig", max(p_pig, yolo_conf)
                return "Dog", max(yolo_conf, p_dog, 0.88)

            # High priority: MobileNet detected dog
            if top1_idx in DOG_INDICES or p_dog > 0.25:
                if not (top1_idx in CAT_INDICES and p_cat > 0.5):
                    return "Dog", max(top1_prob if top1_idx in DOG_INDICES else p_dog, 0.85)

            # Cat detection
            if yolo_cls_id == 15 or top1_idx in CAT_INDICES or (p_cat > 0.25 and p_cat > p_dog):
                conf = max(top1_prob if top1_idx in CAT_INDICES else 0.0, p_cat, yolo_conf if yolo_cls_id == 15 else 0.0, 0.86)
                return "Cat", conf

            # Pig / Swine
            if top1_idx in PIG_INDICES or p_pig > 0.20 or (hsv_is_pig and p_pig > 0.08):
                conf = max(top1_prob if top1_idx in PIG_INDICES else p_pig, 0.88)
                return "Pig", conf

            # Bovine / Cattle / Cow / Buffalo
            if yolo_cls_id == 19 or top1_idx in BOVINE_INDICES or (p_bovine > 0.20 and p_bovine > p_dog):
                p_buffalo = float(probabilities[346].item()) if 346 < len(probabilities) else 0.0
                if top1_idx == 346 or p_buffalo > 0.15 or is_dark_bovine:
                    return "Buffalo (Cattle)", max(p_buffalo, yolo_conf if yolo_cls_id == 19 else 0.0, 0.85)
                return "Cow (Cattle)", max(p_bovine, yolo_conf if yolo_cls_id == 19 else 0.0, 0.88)

            # Equine / Horse
            if yolo_cls_id == 17 or top1_idx in EQUINE_INDICES or (p_equine > 0.20 and p_equine > p_dog):
                return "Horse", max(p_equine, yolo_conf if yolo_cls_id == 17 else 0.0, 0.87)

        except Exception as e:
            print(f"[ERROR in classify_roi]: {e}")

    # Fallback to YOLO classes if present
    if yolo_cls_id == 16: return "Dog", max(yolo_conf, 0.85)
    if yolo_cls_id == 15: return "Cat", max(yolo_conf, 0.85)
    if yolo_cls_id == 17: return "Horse", max(yolo_conf, 0.85)
    if yolo_cls_id == 19: return "Cow (Cattle)", max(yolo_conf, 0.85)
    if yolo_cls_id == 18: return "Pig", max(yolo_conf, 0.85)

    return None, 0.0
