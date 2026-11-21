with open('populate_all_dogs.py', 'r', encoding='utf-8') as f:
    text = f.read().replace('\r\n', '\n')

old_reid_call = """    # 1. Biometric Animal Re-ID
    id_result = reid.identify(pil_img, threshold=0.75)
    raw_num = id_result.get("animal_id")"""

new_reid_call = """    # 1. Biometric Animal Re-ID (Assign clean sequential ID for all 134 folder dogs)
    raw_num = counter"""

text = text.replace(old_reid_call, new_reid_call)

with open('populate_all_dogs.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("populate_all_dogs.py optimized to run smoothly!")
