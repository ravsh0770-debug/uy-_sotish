# Toshkent Uy Narxlari

Toshkent shahridagi kvartira narxlarini tumanlar bo'yicha solishtirish uchun fullstack veb-ilova.

## Imkoniyatlar

- **E'lonlar** — tuman, xonalar soni, narx oralig'i, bino turi va ta'mir bo'yicha filtrlash, saralash.
- **Tumanlar statistikasi** — har bir tumanda o'rtacha narx va $/m², eng arzon/eng qimmat oralig'i, xonalar soni bo'yicha jadval.
- **Solishtirish** — 2–4 ta e'lonni yonma-yon solishtirish; eng yaxshi qiymatlar yashil rangda, har bir e'lon tuman o'rtachasidan necha foiz arzon/qimmatligi ko'rsatiladi.
- **E'lon qo'shish / o'chirish** — server tomonida tekshiruv (validatsiya) bilan.

## Texnologiyalar

| Qism     | Texnologiya                                    |
|----------|------------------------------------------------|
| Backend  | Python 3 (standart kutubxona: `http.server`)   |
| Baza     | SQLite (`backend/uylar.db`, avtomatik yaratiladi) |
| Frontend | HTML, CSS, JavaScript (kutubxonasiz)           |

Hech qanday paket o'rnatish shart emas.

## Ishga tushirish

```bash
python3 backend/server.py
```

So'ng brauzerda oching: <http://localhost:8000>

Boshqa port kerak bo'lsa: `PORT=8080 python3 backend/server.py`

Birinchi ishga tushirishda baza 72 ta namunaviy e'lon bilan to'ldiriladi (har tumanda 6 tadan).
Bazani qaytadan yaratish uchun `backend/uylar.db` faylini o'chirib, serverni qayta ishga tushiring.

> Namunaviy narxlar taxminiy va faqat sinov uchun — haqiqiy bozor ma'lumoti emas.

## Tuzilma

```
backend/
  server.py     — HTTP server va API marshrutlari
  database.py   — SQLite bilan ishlash, filtrlar, statistika, validatsiya
  seed.py       — namunaviy ma'lumotlar generatori
frontend/
  index.html    — sahifa
  style.css     — dizayn (yorug'/qorong'i rejim)
  app.js        — frontend mantiqi
```

## API

| Metod  | Manzil                     | Tavsif |
|--------|----------------------------|--------|
| GET    | `/api/meta`                | Tumanlar, bino turlari, ta'mir turlari ro'yxati |
| GET    | `/api/listings`            | E'lonlar. Parametrlar: `district`, `rooms`, `min_price`, `max_price`, `building_type`, `renovation`, `sort` (`newest`, `price_asc`, `price_desc`, `ppm_asc`, `ppm_desc`, `area_desc`) |
| GET    | `/api/listings/{id}`       | Bitta e'lon |
| POST   | `/api/listings`            | Yangi e'lon (JSON) |
| DELETE | `/api/listings/{id}`       | E'lonni o'chirish |
| GET    | `/api/stats`               | Umumiy, tumanlar va xonalar bo'yicha statistika |
| GET    | `/api/compare?ids=1,2,3`   | 4 tagacha e'lonni tuman o'rtachasi bilan solishtirish |

POST misoli:

```bash
curl -X POST http://localhost:8000/api/listings \
  -H "Content-Type: application/json" \
  -d '{"district":"Chilonzor","rooms":2,"area":56,"floor":3,"total_floors":9,
       "price":68000,"building_type":"ikkilamchi","renovation":"oddiy"}'
```
