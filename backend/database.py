"""Ma'lumotlar bazasi bilan ishlash (SQLite)."""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uylar.db")

# Toshkent shahri tumanlari
DISTRICTS = [
    "Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor", "Sergeli",
    "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yangihayot", "Yashnobod", "Yunusobod",
]
BUILDING_TYPES = ["yangi", "ikkilamchi"]
RENOVATIONS = ["yevro", "oddiy", "tamirsiz"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    district      TEXT    NOT NULL,
    rooms         INTEGER NOT NULL,
    area          REAL    NOT NULL,      -- m²
    floor         INTEGER NOT NULL,
    total_floors  INTEGER NOT NULL,
    price         INTEGER NOT NULL,      -- USD
    building_type TEXT    NOT NULL,      -- yangi | ikkilamchi
    renovation    TEXT    NOT NULL,      -- yevro | oddiy | tamirsiz
    description   TEXT    DEFAULT '',
    created_at    TEXT    DEFAULT (datetime('now', 'localtime'))
);
"""

SELECT_FIELDS = "*, CAST(ROUND(price / area) AS INTEGER) AS price_per_m2"

SORTS = {
    "newest": "created_at DESC, id DESC",
    "price_asc": "price ASC",
    "price_desc": "price DESC",
    "ppm_asc": "price_per_m2 ASC",
    "ppm_desc": "price_per_m2 DESC",
    "area_desc": "area DESC",
}


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Jadvalni yaratadi va bo'sh bo'lsa namunaviy ma'lumotlar bilan to'ldiradi."""
    from seed import generate_listings

    with connect() as conn:
        conn.executescript(SCHEMA)
        count = conn.execute("SELECT COUNT(*) FROM listings").fetchone()[0]
        if count == 0:
            items = generate_listings()
            for item in items:
                insert(conn, item)
            print(f"Bazaga {len(items)} ta namunaviy e'lon qo'shildi.")


def insert(conn, d):
    cur = conn.execute(
        """INSERT INTO listings (title, district, rooms, area, floor, total_floors, price,
                                 building_type, renovation, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now', 'localtime')))""",
        (d["title"], d["district"], d["rooms"], d["area"], d["floor"], d["total_floors"],
         d["price"], d["building_type"], d["renovation"], d.get("description", ""),
         d.get("created_at")),
    )
    return cur.lastrowid


def list_listings(f):
    """Filtrlar asosida e'lonlarni qaytaradi. Noto'g'ri raqam bo'lsa ValueError."""
    where, params = [], []

    if f.get("district") in DISTRICTS:
        where.append("district = ?")
        params.append(f["district"])
    if f.get("rooms"):
        rooms = int(f["rooms"])
        if rooms >= 5:
            where.append("rooms >= 5")
        else:
            where.append("rooms = ?")
            params.append(rooms)
    if f.get("min_price"):
        where.append("price >= ?")
        params.append(int(f["min_price"]))
    if f.get("max_price"):
        where.append("price <= ?")
        params.append(int(f["max_price"]))
    if f.get("building_type") in BUILDING_TYPES:
        where.append("building_type = ?")
        params.append(f["building_type"])
    if f.get("renovation") in RENOVATIONS:
        where.append("renovation = ?")
        params.append(f["renovation"])

    order = SORTS.get(f.get("sort"), SORTS["newest"])
    sql = f"SELECT {SELECT_FIELDS} FROM listings"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += f" ORDER BY {order} LIMIT 500"

    with connect() as conn:
        return [dict(r) for r in conn.execute(sql, params)]


def get_listing(listing_id):
    with connect() as conn:
        row = conn.execute(f"SELECT {SELECT_FIELDS} FROM listings WHERE id = ?", (listing_id,)).fetchone()
        return dict(row) if row else None


def create_listing(data):
    with connect() as conn:
        new_id = insert(conn, data)
    return get_listing(new_id)


def delete_listing(listing_id):
    with connect() as conn:
        return conn.execute("DELETE FROM listings WHERE id = ?", (listing_id,)).rowcount > 0


def stats():
    """Tumanlar va xonalar soni bo'yicha statistika."""
    with connect() as conn:
        overall = dict(conn.execute(
            """SELECT COUNT(*) AS count,
                      CAST(ROUND(AVG(price)) AS INTEGER) AS avg_price,
                      CAST(ROUND(AVG(price / area)) AS INTEGER) AS avg_ppm
               FROM listings""").fetchone())
        districts = [dict(r) for r in conn.execute(
            """SELECT district,
                      COUNT(*) AS count,
                      CAST(ROUND(AVG(price)) AS INTEGER) AS avg_price,
                      CAST(ROUND(AVG(price / area)) AS INTEGER) AS avg_ppm,
                      CAST(ROUND(MIN(price / area)) AS INTEGER) AS min_ppm,
                      CAST(ROUND(MAX(price / area)) AS INTEGER) AS max_ppm
               FROM listings GROUP BY district ORDER BY avg_ppm DESC""")]
        by_rooms = [dict(r) for r in conn.execute(
            """SELECT CASE WHEN rooms >= 5 THEN 5 ELSE rooms END AS rooms,
                      COUNT(*) AS count,
                      CAST(ROUND(AVG(price)) AS INTEGER) AS avg_price,
                      CAST(ROUND(AVG(area)) AS INTEGER) AS avg_area,
                      CAST(ROUND(AVG(price / area)) AS INTEGER) AS avg_ppm
               FROM listings GROUP BY 1 ORDER BY 1""")]
    return {"overall": overall, "districts": districts, "by_rooms": by_rooms}


def compare(ids):
    """Bir nechta e'lonni tuman o'rtacha narxi bilan birga qaytaradi."""
    if not ids:
        return []
    placeholders = ",".join("?" * len(ids))
    with connect() as conn:
        rows = {r["id"]: dict(r) for r in conn.execute(
            f"SELECT {SELECT_FIELDS} FROM listings WHERE id IN ({placeholders})", ids)}
        district_avg = {r["district"]: r["avg_ppm"] for r in conn.execute(
            "SELECT district, ROUND(AVG(price / area)) AS avg_ppm FROM listings GROUP BY district")}

    result = []
    for i in ids:  # tanlangan tartibni saqlaymiz
        item = rows.get(i)
        if not item:
            continue
        avg = district_avg.get(item["district"]) or 0
        item["district_avg_ppm"] = int(avg)
        item["diff_pct"] = round((item["price_per_m2"] - avg) / avg * 100, 1) if avg else 0
        result.append(item)
    return result


def validate_listing(body):
    """Yangi e'lon ma'lumotlarini tekshiradi. (data, errors) qaytaradi."""
    errors = {}
    data = {}

    def num(key, label, cast, lo, hi):
        try:
            value = cast(body.get(key))
        except (TypeError, ValueError):
            errors[key] = f"{label} raqam bo'lishi kerak"
            return None
        if not lo <= value <= hi:
            errors[key] = f"{label} {lo} va {hi} oralig'ida bo'lishi kerak"
            return None
        data[key] = value
        return value

    district = body.get("district")
    if district not in DISTRICTS:
        errors["district"] = "Tumanni tanlang"
    else:
        data["district"] = district

    rooms = num("rooms", "Xonalar soni", int, 1, 10)
    num("area", "Maydon", float, 10, 1000)
    floor = num("floor", "Qavat", int, 1, 60)
    total = num("total_floors", "Umumiy qavatlar", int, 1, 60)
    num("price", "Narx", int, 1000, 10_000_000)
    if floor and total and floor > total:
        errors["floor"] = "Qavat umumiy qavatlar sonidan katta bo'lmasligi kerak"

    if body.get("building_type") not in BUILDING_TYPES:
        errors["building_type"] = "Bino turini tanlang"
    else:
        data["building_type"] = body["building_type"]
    if body.get("renovation") not in RENOVATIONS:
        errors["renovation"] = "Ta'mir holatini tanlang"
    else:
        data["renovation"] = body["renovation"]

    description = str(body.get("description") or "").strip()[:1000]
    data["description"] = description
    title = str(body.get("title") or "").strip()[:120]
    if not title and rooms and district in DISTRICTS:
        title = f"{rooms} xonali kvartira, {district}"
    data["title"] = title

    return data, errors
