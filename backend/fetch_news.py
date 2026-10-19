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

# Load env dari lokal backend/.env, pintarsaham/.env, dan root .env
LOCAL_ENV = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
PARENT_ENV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
ROOT_ENV = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')

for p_env in (ROOT_ENV, PARENT_ENV, LOCAL_ENV):
    if os.path.exists(p_env):
        load_dotenv(p_env, override=True)

def get_gemini_api_key():
    """Ambil API key dari GEMINI_API atau API_AI dengan fallback cerdas."""
    for p_env in (ROOT_ENV, PARENT_ENV, LOCAL_ENV):
        if os.path.exists(p_env):
            load_dotenv(p_env, override=False)
    for var_name in ("API_AI", "GEMINI_API"):
        k = os.getenv(var_name, "").strip().strip('"').strip("'")
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

def _parse_invezgo_date(date_str: str) -> str:
    if not date_str:
        return "Hari ini"
    try:
        wib = timezone(timedelta(hours=7))
        clean = str(date_str).strip().replace("Z", "")
        dt = datetime.fromisoformat(clean[:19]).replace(tzinfo=wib)
        return format_relative_date(dt)
    except Exception:
        return str(date_str)[:10]

def _detect_sentiment_and_catalyst(title: str, content: str, cat: str, ticker: str) -> tuple[str, str, str]:
    txt = f"{title} {content}".lower()
    pos_words = (
        "melonjak", "menguat", "naik", "laba", "tumbuh", "dividen", "ekspansi",
        "akumulasi", "buyback", "rekor", "optimis", "surplus", "positif", "untung",
        "meroket", "peningkatan", "inflow", "upgrade", "sehat", "terpercaya"
    )
    neg_words = (
        "anjlok", "melemah", "turun", "rugi", "aksi jual", "koreksi", "tekanan",
        "beban", "penurunan", "amblas", "ambles", "loyo", "defisit", "negatif",
        "merugi", "suspensi", "longsor", "outflow", "downgrade", "sanksi", "manipulasi", "terancam"
    )
    pos_score = sum(1 for w in pos_words if w in txt)
    neg_score = sum(1 for w in neg_words if w in txt)

    if pos_score > neg_score:
        bias = "positif"
        impact = f"Katalis Positif · Sentimen {cat}"
        watch = f"Pantau kelanjutan momentum beli dan area resistance terdekat pada {ticker}."
    elif neg_score > pos_score:
        bias = "negatif"
        impact = f"Tekanan Pasar · Risiko {cat}"
        watch = f"Cermati pertahanan level support terdekat dan potensi meredanya tekanan jual pada {ticker}."
    else:
        bias = "netral"
        impact = f"Update Pasar · Sektor {cat}"
        watch = f"Pantau respons pelaku pasar serta dinamika volume perdagangan pada {ticker}."

    return bias, impact, watch

def _is_relevant_market_news(title: str, content: str, is_ihsg: bool = True) -> bool:
    """Filter artikel dari Invezgo agar hanya berita pasar modal Indonesia, IHSG, BEI, OJK, dan emiten yang tampil."""
    txt_title = title.lower()
    txt_full = f"{title} {content[:400]}".lower()

    # Blacklist artikel clickbait / kripto / luar negeri yang tidak relevan dengan saham BEI
    blacklist = (
        "tuyul", "petani", "sawah", "anak pejabat", "melarat",
        "roadster", "tesla", "bitget", "stablecoin", "kripto",
        "bitcoin", "tentara didakwa", "celah fraud bi-fast"
    )
    if any(b in txt_title for b in blacklist):
        return False

    if not is_ihsg:
        return True

    # Cek apakah ada kode saham 4 huruf di dalam kurung pada judul, misal (BMRI), (CUAN), (SMAR)
    if re.search(r"\([A-Z]{4}\)", title):
        return True

    market_keywords = (
        "ihsg", "bei", "bursa efek", "pasar modal", "ojk", "msci",
        "saham", "emiten", "ipo", "dividen", "buyback", "trading halt",
        "asing borong", "investor asing", "rupiah", "laba", "rugi",
        "marketing sales", "akuisisi", "obligasi", "perpetual bond",
        "prajogo pangestu", "haji isam", "bca", "bbca", "bmri", "bbri",
        "tlkm", "goto", "danantara", "keterbukaan informasi"
    )
    return any(k in txt_full for k in market_keywords)

def _score_market_relevance(item: dict, key: str) -> int:
    """Berikan skor prioritas agar berita paling krusial untuk IHSG/Emiten tampil di urutan teratas."""
    t = item.get("title", "").lower()
    score = 0
    if key == "IHSG":
        if any(w in t for w in ("ihsg", "pasar modal", "bei", "msci", "ojk", "ipo", "trading halt")):
            score += 30
        if re.search(r"\([A-Z]{4}\)", item.get("title", "")):
            score += 20
        if any(w in t for w in ("saham", "emiten", "asing", "rupiah", "dividen", "laba")):
            score += 15
    else:
        if key.lower() in t:
            score += 40
        if item.get("category") != "Keterbukaan BEI":
            score += 10
    return score

def fetch_invezgo_news(ticker: str, limit: int = 50) -> list[dict]:
    """
    Mengambil berita real-time pasar & emiten langsung dari Invezgo API dalam 1 kali request maksimal (limit=100).
    Hanya memanggil endpoint kedua jika hasil request pertama kosong (0 berita).
    """
    import requests
    try:
        from invezgo_client import get_auth_headers, INVEZGO_BASE_URL, get_invezgo_api_key
    except ImportError:
        import sys
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from invezgo_client import get_auth_headers, INVEZGO_BASE_URL, get_invezgo_api_key

    if not get_invezgo_api_key():
        return []

    key = ticker.upper().strip()
    cat = CATEGORY_MAP.get(key, "Pasar Modal")
    headers = get_auth_headers()
    results = []
    seen_titles = set()

    def _add_news_row(row: dict, is_disclosure: bool = False):
        raw_title = str(row.get("title") or "").replace("\ufffd", "-").strip()
        if not raw_title or raw_title.lower() in seen_titles:
            return

        raw_content = str(row.get("content") or "").replace("\ufffd", "-").strip()
        if not is_disclosure and not _is_relevant_market_news(raw_title, raw_content, is_ihsg=(key == "IHSG")):
            return

        seen_titles.add(raw_title.lower())
        date_rel = _parse_invezgo_date(row.get("date", ""))

        if is_disclosure:
            doc_code = row.get("code") or key
            doc_list = row.get("list") or []
            pdf_url = doc_list[0].get("url", "") if doc_list and isinstance(doc_list[0], dict) else ""
            doc_name = doc_list[0].get("name", "") if doc_list and isinstance(doc_list[0], dict) else raw_title
            desc_text = f"Keterbukaan Informasi Resmi BEI ({doc_code}): {raw_title}."
            body_text = f"Dokumen pengumuman bursa resmi untuk emiten {doc_code} ({doc_name}) yang diterbitkan melalui Keterbukaan Informasi IDX / Invezgo."
            bias, impact, watch = _detect_sentiment_and_catalyst(raw_title, body_text, cat, doc_code)
            results.append({
                "title": f"[{doc_code}] {raw_title}"[:90] if key == "IHSG" else raw_title[:90],
                "desc": desc_text[:170],
                "body": body_text,
                "category": "Keterbukaan BEI",
                "icon": "file",
                "impact": impact,
                "bias": bias,
                "watch": watch,
                "source": "Invezgo · Keterbukaan BEI",
                "url": pdf_url,
                "date": date_rel,
                "ticker": doc_code,
                "live": True
            })
            return

        paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\r\n\s*\r\n", raw_content) if p.strip()]
        if len(paragraphs) > 1 and len(paragraphs[0]) < 85 and (" - " in paragraphs[0] or "Bloomberg" in paragraphs[0] or "Bisnis" in paragraphs[0]):
            byline = paragraphs[0]
            main_paras = paragraphs[1:]
        else:
            byline = ""
            main_paras = paragraphs

        first_para = main_paras[0] if main_paras else raw_title
        first_para_clean = re.sub(r"^(Bloomberg,\s*|Bisnis\.com,\s*[A-Za-z\s]+\s*[-–—]\s*)", "", first_para).strip()
        desc_text = first_para_clean[:165] + ("..." if len(first_para_clean) > 165 else "")
        body_text = "\n\n".join(main_paras[:4]) if main_paras else desc_text

        source_label = "Invezgo Market Feed"
        if "bloomberg" in (byline + raw_content[:120]).lower():
            source_label = "Invezgo · Bloomberg"
        elif "bisnis" in (byline + raw_content[:120]).lower():
            source_label = "Invezgo · Bisnis"
        elif "kontan" in (byline + raw_content[:120]).lower():
            source_label = "Invezgo · Kontan"
        elif "cnbc" in (byline + raw_content[:120]).lower():
            source_label = "Invezgo · CNBC"

        detected_code = key
        m_code = re.search(r"\(([A-Z]{4})\)", raw_title)
        if key == "IHSG" and m_code:
            detected_code = m_code.group(1)
        row_cat = CATEGORY_MAP.get(detected_code, cat)

        bias, impact, watch = _detect_sentiment_and_catalyst(raw_title, raw_content, row_cat, detected_code)
        icon_name = "building" if detected_code != "IHSG" else ("globe" if "msci" in raw_title.lower() or "rupiah" in raw_title.lower() else "chart")

        results.append({
            "title": raw_title[:90],
            "desc": desc_text,
            "body": body_text,
            "category": row_cat,
            "icon": icon_name,
            "impact": impact,
            "bias": bias,
            "watch": watch,
            "source": source_label,
            "url": str(row.get("url") or ""),
            "date": date_rel,
            "ticker": detected_code,
            "live": True
        })

    # 1 KALI REQUEST UTAMA dengan limit=100 (tetap dihitung 1 hit API)
    try:
        if key == "IHSG":
            url = f"{INVEZGO_BASE_URL}/analysis/news?page=1&limit=100"
        else:
            url = f"{INVEZGO_BASE_URL}/analysis/news?code={urllib.parse.quote(key)}&page=1&limit=100"

        res = requests.get(url, headers=headers, timeout=12)
        if res.status_code == 200:
            payload = res.json()
            rows = payload.get("data", []) if isinstance(payload, dict) else (payload if isinstance(payload, list) else [])
            for r in rows:
                _add_news_row(r, is_disclosure=False)
                if len(results) >= limit:
                    break
    except Exception as e:
        print(f"[fetch_invezgo_news] Error news {key}: {e}")

    # HANYA jika saham spesifik tidak punya berita sama sekali di /analysis/news (0 hasil), baru cek Keterbukaan Informasi BEI
    if len(results) == 0 and key != "IHSG":
        try:
            url_disc = f"{INVEZGO_BASE_URL}/analysis/disclosure?code={urllib.parse.quote(key)}&page=1&limit=30"
            res_d = requests.get(url_disc, headers=headers, timeout=10)
            if res_d.status_code == 200:
                payload_d = res_d.json()
                rows_d = payload_d.get("data", []) if isinstance(payload_d, dict) else []
                for r in rows_d:
                    _add_news_row(r, is_disclosure=True)
                    if len(results) >= limit:
                        break
        except Exception as e_d:
            print(f"[fetch_invezgo_news] Error disclosure {key}: {e_d}")

    # Urutkan agar berita paling krusial untuk IHSG/Emiten berada di Top 3 teratas, namun seluruh berita tetap disimpan untuk input Analisis AI
    if key == "IHSG" and len(results) > 3:
        results.sort(key=lambda x: _score_market_relevance(x, key), reverse=True)

    return results[:limit]

# Cache berita di memori dengan kedaluwarsa 10 menit (agar hemat request API & bisa langsung dipakai oleh Analisis AI)
_news_cache: dict[str, tuple[float, list]] = {}
CACHE_TTL = 10 * 60  # 10 menit

def get_news(ticker: str, force_refresh: bool = False) -> list[dict]:
    """Mengambil seluruh berita relevan dalam 1 request untuk ticker/IHSG dari Invezgo API."""
    import time
    key = ticker.upper().strip()
    now = time.time()

    if not force_refresh and key in _news_cache:
        ts, cached_data = _news_cache[key]
        if (now - ts) < CACHE_TTL:
            print(f"[get_news] Menggunakan cache 10m untuk {key} ({len(cached_data)} berita)")
            return cached_data

    print(f"[get_news] Mengambil paket berita maksimal (1 request limit=100) dari Invezgo API untuk {key}...")
    invezgo_items = fetch_invezgo_news(key, limit=50)
    if invezgo_items:
        _news_cache[key] = (now, invezgo_items)
        return invezgo_items

    print(f"[get_news] Fallback Google Search + Gemini untuk {key}...")
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
            "source": "Invezgo & IDX",
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
