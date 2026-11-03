"""Namunaviy (sinov uchun) e'lonlarni yaratish.

Narxlar taxminiy va faqat namuna sifatida — haqiqiy bozor ma'lumoti emas.
"""
import random
from datetime import datetime, timedelta

# Har bir tuman uchun taxminiy o'rtacha narx ($ / m²)
BASE_PPM = {
    "Mirobod": 1950, "Yakkasaroy": 1900, "Yunusobod": 1600, "Mirzo Ulug'bek": 1550,
    "Shayxontohur": 1500, "Chilonzor": 1250, "Olmazor": 1200, "Yashnobod": 1150,
    "Uchtepa": 1100, "Sergeli": 950, "Yangihayot": 850, "Bektemir": 800,
}

AREA_BY_ROOMS = {1: (32, 50), 2: (48, 72), 3: (68, 98), 4: (92, 135), 5: (120, 190)}

DESCRIPTIONS = [
    "Metroga yaqin, atrofida maktab va bog'cha bor.",
    "Yorug' kvartira, oynalari hovli tomonga qaragan.",
    "Lift bor, kirish yo'lagi toza, parkovka mavjud.",
    "Mebel va texnika bilan sotiladi.",
    "Hujjatlari tayyor, tez sotiladi.",
    "Balkon oynalangan, avtonom isitish tizimi o'rnatilgan.",
    "Tinch hudud, yaqinida supermarket va park bor.",
    "Yangi turar-joy majmuasi, yopiq hudud va qo'riqlash.",
]


def generate_listings(per_district=6, seed=42):
    rng = random.Random(seed)
    now = datetime.now()
    items = []
    for district, base in BASE_PPM.items():
        for _ in range(per_district):
            rooms = rng.choices([1, 2, 3, 4, 5], weights=[20, 35, 30, 11, 4])[0]
            area = round(rng.uniform(*AREA_BY_ROOMS[rooms]), 1)
            building_type = rng.choice(["yangi", "ikkilamchi"])
            renovation = rng.choices(["yevro", "oddiy", "tamirsiz"], weights=[40, 40, 20])[0]
            total_floors = rng.choice([9, 12, 16]) if building_type == "yangi" else rng.choice([4, 5, 9])
            floor = rng.randint(1, total_floors)

            ppm = base
            ppm *= 1.10 if building_type == "yangi" else 1.0
            ppm *= {"yevro": 1.08, "oddiy": 1.0, "tamirsiz": 0.90}[renovation]
            ppm *= rng.uniform(0.88, 1.12)
            price = int(round(area * ppm / 500) * 500)  # 500$ ga yaxlitlaymiz

            created = now - timedelta(days=rng.randint(0, 60), hours=rng.randint(0, 23))
            items.append({
                "title": f"{rooms} xonali kvartira, {district}",
                "district": district,
                "rooms": rooms,
                "area": area,
                "floor": floor,
                "total_floors": total_floors,
                "price": price,
                "building_type": building_type,
                "renovation": renovation,
                "description": rng.choice(DESCRIPTIONS),
                "created_at": created.strftime("%Y-%m-%d %H:%M:%S"),
            })
    return items
