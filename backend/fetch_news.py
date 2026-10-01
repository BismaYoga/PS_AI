"""
fetch_news.py — Berita & Katalis Pasar Real-time menggunakan Google ADK / Gemini AI + Google Search
Menampilkan 3 berita PALING TERBARU (menit/jam/hari ini) terurut secara kronologis untuk IHSG atau saham IDX.
"""

import os
import json
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Load env dari lokal pintarsaham/.env, lalu fallback ke parent .env jika diperlukan
LOCAL_ENV = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
PARENT_ENV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')

for p_env in (PARENT_ENV, LOCAL_ENV):
    if os.path.exists(p_env):
        load_dotenv(p_env)

def get_gemini_api_key():
    """Ambil API key dari GEMINI_API atau API_AI dengan fallback cerdas."""
    for p_env in (PARENT_ENV, LOCAL_ENV):
        if os.path.exists(p_env):
            load_dotenv(p_env, override=False)
    k = os.getenv("GEMINI_API", "").strip().strip('"').strip("'")
    if not k:
        k = os.getenv("API_AI", "").strip().strip('"').strip("'")
    if k and not k.startswith("AQ.Ab8RN6Ln"):
        return k
    return ""

EMITEN_NAMES = {
    "AADI":"Adaro Andalan Indonesia","ACES":"Aspirasi Hidup Indonesia (ACE Hardware)",
    "ADMR":"Adaro Minerals","ADRO":"Alamtri Resources","AKRA":"AKR Corporindo",
    "AMMN":"Amman Mineral","AMRT":"Alfamart (Sumber Alfaria)","ANTM":"Aneka Tambang (Antam)",
    "ASII":"Astra International","AVIA":"Avia Avian","BBCA":"Bank Central Asia (BCA)",
    "BBNI":"Bank Negara Indonesia (BNI)","BBRI":"Bank Rakyat Indonesia (BRI)","BBTN":"Bank Tabungan Negara (BTN)",
    "BMRI":"Bank Mandiri","BRPT":"Barito Pacific","BSDE":"Bumi Serpong Damai",
    "BTPS":"Bank BTPN Syariah","BUKA":"Bukalapak","CMRY":"Cisarua Mountain Dairy (Cimory)",
    "CPIN":"Charoen Pokphand Indonesia","CTRA":"Ciputra Development","CUAN":"Petrindo Jaya Kreasi",
    "DSNG":"Dharma Satya Nusantara","DSSA":"Dian Swastatika Sentosa","ELSA":"Elnusa",
    "EMTK":"Elang Mahkota Teknologi","ENRG":"Energi Mega Persada","ERAA":"Erajaya Swasembada",
    "ESSA":"ESSA Industries","HEAL":"Medikaloka Hermina","HMSP":"HM Sampoerna",
    "HRTA":"Hartadinata Abadi","HRUM":"Harum Energy","ICBP":"Indofood CBP",
    "INCO":"Vale Indonesia","INDF":"Indofood","INKP":"Indah Kiat Pulp & Paper",
    "INTP":"Indocement","ISAT":"Indosat Ooredoo Hutchison","ITMG":"Indo Tambangraya Megah",
    "JPFA":"Japfa Comfeed","JSMR":"Jasa Marga","KIJA":"Kawasan Industri Jababeka",
    "KLBF":"Kalbe Farma","KPIG":"MNC Land","MAPA":"MAP Aktif Adiperkasa",
    "MAPI":"Mitra Adiperkasa","MEDC":"Medco Energi","MIKA":"Mitra Keluarga Karyasehat",
    "MTEL":"Dayamitra Telekomunikasi (Mitratel)","MYOR":"Mayora Indah","PGAS":"Perusahaan Gas Negara",
    "PGEO":"Pertamina Geothermal Energy","PNLF":"Panin Financial","POWR":"Cikarang Listrindo",
    "PTBA":"Bukit Asam","PWON":"Pakuwon Jati","RAJA":"Rukun Raharja",
    "SCMA":"Surya Citra Media","SMGR":"Semen Indonesia","SMRA":"Summarecon Agung",
    "SSMS":"Sawit Sumbermas Sarana","TBIG":"Tower Bersama Infrastructure","TLKM":"Telkom Indonesia",
    "TOWR":"Sarana Menara Nusantara","TPIA":"Chandra Asri Pacific",
    "UNTR":"United Tractors","UNVR":"Unilever Indonesia","GOTO":"GoTo Gojek Tokopedia",
    "IHSG": "Indeks Harga Saham Gabungan (IDX Composite)",
}

CATEGORY_MAP = {
    "IHSG": "Pasar Modal",
    "BBCA": "Perbankan", "BBRI": "Perbankan", "BBNI": "Perbankan",
    "BMRI": "Perbankan", "BBTN": "Perbankan", "BTPS": "Perbankan",
    "TLKM": "Teknologi & Telco", "ISAT": "Teknologi & Telco", "EMTK": "Teknologi & Telco",
    "BUKA": "Teknologi & Telco", "MTEL": "Teknologi & Telco", "TOWR": "Teknologi & Telco",
    "GOTO": "Teknologi & Telco",
    "ADRO": "Energi", "AADI": "Energi", "ADMR": "Energi", "ITMG": "Energi",
    "PTBA": "Energi", "HRUM": "Energi", "MEDC": "Energi", "PGAS": "Energi",
    "PGEO": "Energi", "ELSA": "Energi", "DSSA": "Energi", "RAJA": "Energi",
    "ANTM": "Bahan Baku", "AMMN": "Bahan Baku", "INCO": "Bahan Baku",
    "INKP": "Bahan Baku", "INTP": "Bahan Baku", "AVIA": "Bahan Baku",
    "ESSA": "Bahan Baku", "BRPT": "Bahan Baku", "TPIA": "Bahan Baku",
    "ASII": "Industri", "UNTR": "Industri", "JSMR": "Infrastruktur",
    "KIJA": "Properti", "BSDE": "Properti", "CTRA": "Properti",
    "PWON": "Properti", "KPIG": "Properti", "SMRA": "Properti",
    "ICBP": "Konsumer", "INDF": "Konsumer", "MYOR": "Konsumer",
    "UNVR": "Konsumer", "HMSP": "Konsumer", "AMRT": "Konsumer",
    "ACES": "Konsumer", "CPIN": "Konsumer", "JPFA": "Konsumer",
    "CMRY": "Konsumer", "DSNG": "Konsumer", "SSMS": "Konsumer",
    "KLBF": "Kesehatan", "HEAL": "Kesehatan", "MIKA": "Kesehatan",
    "PNLF": "Keuangan", "AKRA": "Keuangan", "ERAA": "Ritel",
    "MAPI": "Ritel", "MAPA": "Ritel", "HRTA": "Ritel",
    "ENRG": "Energi", "CUAN": "Energi", "TBIG": "Infrastruktur",
    "POWR": "Utilitas", "SMGR": "Bahan Baku", "SCMA": "Media",
}

def format_relative_date(dt_utc: datetime) -> str:
    """Format tanggal relatif human-readable (WIB)."""
    wib = timezone(timedelta(hours=7))
    dt = dt_utc.astimezone(wib)
    now = datetime.now(wib)
    diff = now - dt

    if diff.days == 0:
        hours = int(diff.total_seconds() // 3600)
        if hours < 1:
            mins = max(1, int(diff.total_seconds() // 60))
            return f"{mins} menit lalu"
        return f"{hours} jam lalu"
    elif diff.days == 1:
        return "Kemarin"
    elif diff.days < 7:
        return f"{diff.days} hari lalu"
    else:
        months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
        return f"{dt.day} {months[dt.month-1]} {dt.year}"

def search_recent_news(query: str, limit: int = 5) -> list[dict]:
    """
    Pencarian Google News real-time dengan filter waktu (when:2d -> when:7d -> when:30d)
    dan mengurutkan berita dari yang PALING BARU (menit/jam terakhir).
    """
    timeframes = ['2d', '7d', '14d', '30d']
    all_items = []
    seen_links = set()

    for tf in timeframes:
        q_with_tf = f"{query} when:{tf}"
        url = f"https://news.google.com/rss/search?q={urllib.parse.quote(q_with_tf)}&hl=id&gl=ID&ceid=ID:id"
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                xml_data = resp.read()
                tree = ET.fromstring(xml_data)
                for item in tree.findall('.//item'):
                    link = item.find('link').text if item.find('link') is not None else ""
                    if not link or link in seen_links:
                        continue
                    seen_links.add(link)

                    pdate = item.find('pubDate').text if item.find('pubDate') is not None else ""
                    try:
                        dt = parsedate_to_datetime(pdate)
                    except Exception:
                        dt = datetime.now(timezone.utc)

                    title = item.find('title').text if item.find('title') is not None else ""
                    source_el = item.find('source')
                    source_name = source_el.text if source_el is not None and source_el.text else ""

                    if " - " in title and not source_name:
                        title_clean, source_name = title.rsplit(" - ", 1)
                    else:
                        title_clean = title

                    all_items.append({
                        "raw_title": title_clean.strip(),
                        "source": source_name.strip() or "Google News",
                        "link": link,
                        "dt": dt,
                        "date_str": format_relative_date(dt)
                    })
        except Exception as e:
            print(f"[search_recent_news] tf={tf} error: {e}")

        # Jika sudah dapat cukup berita segar, hentikan loop
        if len(all_items) >= 5:
            break

    # Urutkan berdasarkan waktu publikasi: TERBARU di atas
    all_items.sort(key=lambda x: x["dt"], reverse=True)
    return all_items[:limit]

def analyze_with_gemini(ticker: str, news_items: list[dict]) -> list[dict]:
    """Analisis dan sintesis 3 berita teratas menggunakan Gemini AI dengan mempertahankan tanggal rilis aktual."""
    api_key = get_gemini_api_key()
    if not api_key:
        print("[analyze_with_gemini] API key tidak tersedia.")
        return []

    from google import genai
    from google.genai import types

    name = EMITEN_NAMES.get(ticker, ticker)
    cat = CATEGORY_MAP.get(ticker, "Pasar Modal")

    # Siapkan payload input untuk Gemini beserta tanggal rilis terverifikasinya
    prepared_items = []
    for it in news_items:
        prepared_items.append({
            "title": it["raw_title"],
            "source": it["source"],
            "published_at": it["date_str"],
            "url": it["link"]
        })

    client = genai.Client(api_key=api_key)

    prompt = f"""Kamu adalah analis pasar modal Bursa Efek Indonesia (IDX).
Berikut adalah 3 berita Google Search TERBARU yang baru saja dirilis untuk instrumen {ticker} ({name}):

{json.dumps(prepared_items, indent=2, ensure_ascii=False)}

Tugas:
Analisis ketiga berita tersebut untuk investor pasar saham.
Format output HANYA sebuah valid JSON array berisi 3 objek berurutan dengan format:
[
  {{
    "title": "Judul berita yang padat, menarik, dan informatif (maksimal 75 karakter)",
    "desc": "Ringkasan 1-2 kalimat mengenai inti berita (maksimal 160 karakter)",
    "body": "Analisis mendalam 2-3 kalimat mengenai dampak berita ini terhadap kinerja emiten atau pergerakan harga saham.",
    "category": "{cat}",
    "icon": "chart",
    "impact": "Katalis ringkas (contoh: Katalis Positif: Ekspansi Kredit / Buyback Saham)",
    "bias": "positif atau negatif atau netral",
    "watch": "Poin penting yang wajib dicermati investor (contoh: Level support Rp6.150 atau rilis kinerja Q3)",
    "source": "Nama media sumber",
    "url": "Tautan URL asli berita",
    "date": "Gunakan nilai 'published_at' dari berita terkait (misal: '30 menit lalu', '2 jam lalu', 'Kemarin')"
  }}
]
PENTING:
- Urutan harus tetap dari yang paling baru
- Pertahankan tanggal dari field 'published_at'
- Output HANYA JSON array tanpa markdown pembuka/penutup.
"""

    models_to_try = ["gemini-flash-lite-latest", "gemini-3.6-flash", "gemini-3.8-flash"]

    for model_name in models_to_try:
        try:
            resp = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=1500
                )
            )
            text = resp.text.strip()
            text = re.sub(r"^```json\s*", "", text)
            text = re.sub(r"^```\s*", "", text)
            text = re.sub(r"\s*```$", "", text)

            parsed = json.loads(text)
            if isinstance(parsed, list) and len(parsed) > 0:
                result = []
                for idx, item in enumerate(parsed[:3]):
                    orig = news_items[idx] if idx < len(news_items) else {}
                    url = item.get("url") or orig.get("link", "")
                    source = item.get("source") or orig.get("source", "Media IDX")
                    date_val = item.get("date") or orig.get("date_str", "Hari ini")
                    
                    result.append({
                        "title": str(item.get("title", orig.get("raw_title", f"Katalis {ticker}")))[:90],
                        "desc": str(item.get("desc", ""))[:180],
                        "body": str(item.get("body", item.get("desc", ""))),
                        "category": str(item.get("category", cat)),
                        "icon": str(item.get("icon", "chart")),
                        "impact": str(item.get("impact", f"Sektor {cat}")),
                        "bias": str(item.get("bias", "netral")).lower(),
                        "watch": str(item.get("watch", "Pantau pergerakan harga dan volume transaksi.")),
                        "source": source,
                        "url": url,
                        "date": date_val,
                        "ticker": ticker,
                        "live": True
                    })
                return result
        except Exception as e:
            print(f"[analyze_with_gemini] Model {model_name} notice: {e}")
            continue

    return []

# Cache berita di memori dengan kedaluwarsa 5 menit (agar berita segar cepat diperbarui)
_news_cache: dict[str, tuple[float, list]] = {}
CACHE_TTL = 5 * 60  # 5 menit

def get_news(ticker: str, force_refresh: bool = False) -> list[dict]:
    """Mengambil 3 berita PALING TERBARU untuk ticker/IHSG."""
    import time
    key = ticker.upper().strip()
    now = time.time()

    if not force_refresh and key in _news_cache:
        ts, cached_data = _news_cache[key]
        if (now - ts) < CACHE_TTL:
            print(f"[get_news] Menggunakan cache 5m untuk {key}")
            return cached_data

    print(f"[get_news] Mengambil 3 berita PALING TERBARU Google Search + Gemini untuk {key}...")
    name = EMITEN_NAMES.get(key, key)

    if key == "IHSG":
        query = 'IHSG'
    else:
        query = f'saham {key}'

    raw_news = search_recent_news(query, limit=5)

    # Jika pencarian spesifik 'saham {key}' kurang dari 3, coba dengan nama perusahaan
    if len(raw_news) < 3 and key != "IHSG":
        extra = search_recent_news(f'"{name}"', limit=5)
        for ex in extra:
            if not any(r["link"] == ex["link"] for r in raw_news):
                raw_news.append(ex)
        raw_news.sort(key=lambda x: x["dt"], reverse=True)

    if raw_news:
        analyzed = analyze_with_gemini(key, raw_news[:3])
        if analyzed:
            _news_cache[key] = (now, analyzed)
            return analyzed

    # Fallback langsung dari Google Search jika kuota Gemini sibuk
    if raw_news:
        cat = CATEGORY_MAP.get(key, "Pasar Modal")
        direct_news = []
        for item in raw_news[:3]:
            direct_news.append({
                "title": item["raw_title"][:85],
                "desc": f"Publikasi terkini mengenai pergerakan dan sentimen {key} dari {item['source']}.",
                "body": f"Berita resmi dari {item['source']}. Pantau keterbukaan informasi dan reaksi pasar terhadap saham {key}.",
                "category": cat,
                "icon": "chart",
                "impact": f"Sentimen Terkini: {item['source']}",
                "bias": "netral",
                "watch": f"Cermati pergerakan harga dan volume transaksi saham {key}.",
                "source": item["source"],
                "url": item["link"],
                "date": item["date_str"],
                "ticker": key,
                "live": True
            })
        _news_cache[key] = (now, direct_news)
        return direct_news

    # Fallback minimal
    return [
        {
            "title": f"Aktivitas Perdagangan Saham {key}",
            "desc": f"Informasi pasar modal terkini untuk instrumen {key}.",
            "body": f"Data pasar dan keterbukaan informasi untuk {key} dapat dipantau langsung melalui chart dan tabel valuasi interaktif.",
            "category": CATEGORY_MAP.get(key, "Pasar Modal"),
            "icon": "chart",
            "impact": "Pemantauan Pasar Harian",
            "bias": "netral",
            "watch": "Perhatikan level support/resistance dan volume perdagangan.",
            "source": "IDX & Yahoo Finance",
            "url": "",
            "date": "Hari ini",
            "ticker": key,
            "live": False
        }
    ]

if __name__ == "__main__":
    import sys
    t = sys.argv[1] if len(sys.argv) > 1 else "IHSG"
    res = get_news(t, force_refresh=True)
    print(json.dumps(res, indent=2, ensure_ascii=False))
