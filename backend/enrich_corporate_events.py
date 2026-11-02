"""
Modul Pengayaan AI untuk Aksi Korporasi (Corporate Events) PintarSaham.
Menghasilkan ringkasan cerdas (ai_summary), sentimen (ai_sentiment), dan dampak investor (ai_impact)
menggunakan Gemini Flash dengan perlindungan kuota, anti-duplikasi permanen, dan zero-latency frontend.
"""

import os
import sys
import json
import time
import re
import urllib.request
import urllib.error

# Path konfigurasi
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BASE_DIR, "data")
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")

if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from fetch_news import get_gemini_api_key
from db_manager import get_corporate_events_db, save_corporate_events_db

# Cache emiten untuk konteks analisis
_EMITEN_MAP: dict[str, dict] = {}


def _get_emiten_info(ticker: str) -> dict:
    global _EMITEN_MAP
    if not _EMITEN_MAP:
        em_file = os.path.join(DATA_DIR, "emitens.json")
        if os.path.exists(em_file):
            try:
                with open(em_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        t = item.get("ticker", "").upper()
                        if t:
                            _EMITEN_MAP[t] = item
            except Exception:
                pass
    return _EMITEN_MAP.get(ticker.upper(), {})


def call_gemini_for_event(event: dict) -> dict | None:
    """Panggil Gemini Flash API untuk menghasilkan analisis ringkas aksi korporasi."""
    api_key = get_gemini_api_key()
    if not api_key:
        print("[enrich_corporate_events] API key tidak tersedia.")
        return None

    ticker = event.get("ticker", "").upper().strip()
    em_info = _get_emiten_info(ticker)
    name = em_info.get("name", f"PT {ticker} Tbk")
    sector = em_info.get("sector", "Pasar Modal")
    subsector = em_info.get("subsector", "-")

    ev_type = event.get("type", "Aksi Korporasi")
    ev_title = event.get("title", "")
    ev_sub = event.get("sub", "")
    ev_date = event.get("date", "")
    ev_amount = event.get("amount", "")
    ev_note = event.get("note", "")

    prompt = f"""Kamu adalah analis riset pasar modal Bursa Efek Indonesia (IDX) untuk platform PintarSaham.
Analisis agenda aksi korporasi riil berikut secara profesional dan berbobot bagi investor saham:

- Emiten: {ticker} ({name})
- Sektor/Subsektor: {sector} / {subsector}
- Kategori Aksi: {ev_type}
- Judul Agenda: {ev_title}
- Rincian / Sub: {ev_sub}
- Tanggal Pelaksanaan: {ev_date}
- Nilai / Estimasi: {ev_amount}
- Catatan Resmi: {ev_note}

Tugas:
Buat analisis padat dan objektif. Output HANYA sebuah valid JSON object dengan 3 atribut berikut:
{{
  "ai_summary": "Ringkasan 2-3 kalimat padat mengenai inti agenda, konteks fundamental emiten, serta signifikansinya bagi investor.",
  "ai_sentiment": "Positif" atau "Netral" atau "Waspada",
  "ai_impact": "1 kalimat katalis utama atau dampak langsung terhadap valuasi/dividen/harga saham emiten."
}}

PANDUAN SENTIMEN:
- "Positif": Dividen bertumbuh/yield tinggi, laba melampaui estimasi, ekspansi bernilai tambah.
- "Netral": Laporan keuangan rutin yang sesuai ekspektasi konsensus, jadwal RUPS tahunan standar.
- "Waspada": Penurunan EPS tajam, penundaan dividen, rights issue dengan dilusi besar.

PENTING: Keluarkan HANYA string JSON murni tanpa pembuka/penutup markdown backtick (```json)."""

    # Model fallback: gemini-3-flash-preview terbukti paling cepat dan andal
    models_to_try = [
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3.5-flash",
        "gemma-4-26b-a4b-it",
        "gemini-3-flash-preview"
    ]

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1500
            }
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=18) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                candidates = res_json.get("candidates", [])
                if not candidates:
                    continue
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    continue
                raw_text = parts[0].get("text", "").strip()
                # Bersihkan format markdown jika model menyertakan
                raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.IGNORECASE)
                raw_text = re.sub(r"\s*```$", "", raw_text)
                
                # Ekstrak objek JSON dengan regex jika ada teks ekstra di sekitarnya
                match = re.search(r"\{[\s\S]*\}", raw_text)
                if match:
                    raw_text = match.group(0)

                parsed = json.loads(raw_text)
                if isinstance(parsed, dict) and "ai_summary" in parsed:
                    return {
                        "ai_summary": str(parsed.get("ai_summary", "")).strip(),
                        "ai_sentiment": str(parsed.get("ai_sentiment", "Netral")).strip(),
                        "ai_impact": str(parsed.get("ai_impact", "")).strip()
                    }
        except urllib.error.HTTPError as e:
            # 503 / 404 / 429 lanjut ke model berikutnya
            print(f"[enrich_corporate_events] Model {model} HTTP {e.code}: {e.reason}")
            continue
        except Exception as e:
            print(f"[enrich_corporate_events] Model {model} error: {e}")
            continue

    return None


def enrich_event(event: dict) -> dict:
    """Perkaya satu agenda dengan ringkasan AI jika belum tersedia."""
    if not isinstance(event, dict):
        return event
    
    # Cek apakah sudah memiliki ai_summary yang valid
    if event.get("ai_summary") and len(str(event["ai_summary"]).strip()) > 15:
        return event

    result = call_gemini_for_event(event)
    if result:
        event["ai_summary"] = result["ai_summary"]
        event["ai_sentiment"] = result.get("ai_sentiment", "Netral")
        event["ai_impact"] = result.get("ai_impact", "")
        print(f"[enrich_corporate_events] Berhasil memperkaya {event.get('ticker')} ({event.get('type')}) - Sentimen: {event['ai_sentiment']}")
    return event


def enrich_all_corporate_events(only_upcoming: bool = True, max_count: int = 5) -> int:
    """
    Perkaya aksi korporasi di database SQLite & file JSON.
    Mengutamakan event mendatang atau hari ini terlebih dahulu agar kuota efisien.
    """
    events = get_corporate_events_db()
    if not events:
        ev_file = os.path.join(DATA_DIR, "corporate_events.json")
        if os.path.exists(ev_file):
            try:
                with open(ev_file, "r", encoding="utf-8") as f:
                    events = json.load(f)
            except Exception:
                pass

    if not events:
        print("[enrich_corporate_events] Tidak ada data peristiwa.")
        return 0

    today_str = time.strftime("%Y-%m-%d")

    # Filter event yang belum memiliki ai_summary
    candidates = []
    for ev in events:
        if not isinstance(ev, dict):
            continue
        if not ev.get("ai_summary"):
            candidates.append(ev)

    if not candidates:
        print("[enrich_corporate_events] Seluruh agenda aksi korporasi telah diperkaya AI.")
        return 0

    # Urutkan: tanggal >= hari ini diutamakan dari yang terdekat, lalu event lampau dari yang terbaru
    def sort_key(e):
        d = str(e.get("date", ""))
        is_upcoming = 0 if d >= today_str else 1
        return (is_upcoming, d if is_upcoming == 0 else f"~{d}")

    candidates.sort(key=sort_key)

    enriched_count = 0
    updated_map = {}

    for ev in candidates:
        if enriched_count >= max_count:
            break
        ev_id = ev.get("id")
        ticker = ev.get("ticker")
        print(f"[enrich_corporate_events] Memproses ({enriched_count + 1}/{max_count}): {ticker} - {ev.get('title')} ({ev.get('date')})")
        enriched = enrich_event(ev)
        if enriched.get("ai_summary"):
            enriched_count += 1
            updated_map[ev_id] = enriched
            # Berikan jeda 1 detik antar-panggilan agar santai pada rate limit
            time.sleep(1.2)

    if not updated_map:
        return 0

    # Gabungkan perubahan ke seluruh dataset
    merged_events = []
    for ev in events:
        ev_id = ev.get("id")
        if ev_id in updated_map:
            merged_events.append(updated_map[ev_id])
        else:
            merged_events.append(ev)

    # Simpan kembali ke SQLite DB
    save_corporate_events_db(merged_events)

    # Simpan ke data/corporate_events.json
    ev_json_path = os.path.join(DATA_DIR, "corporate_events.json")
    try:
        with open(ev_json_path, "w", encoding="utf-8") as f:
            json.dump(merged_events, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[enrich_corporate_events] Gagal menyimpan ke {ev_json_path}: {e}")

    # Sinkronkan file market_data.json / market_data.js jika ada
    market_json_path = os.path.join(DATA_DIR, "market_data.json")
    if os.path.exists(market_json_path):
        try:
            with open(market_json_path, "r", encoding="utf-8") as f:
                b = json.load(f)
            b["events"] = merged_events
            with open(market_json_path, "w", encoding="utf-8") as f:
                json.dump(b, f, indent=2, ensure_ascii=False)

            # Sinkronkan juga ke root & dist
            for dest in [
                os.path.join(BASE_DIR, "market_data.json"),
                os.path.join(FRONTEND_DIST, "data", "market_data.json")
            ]:
                if os.path.exists(os.path.dirname(dest)):
                    with open(dest, "w", encoding="utf-8") as f:
                        json.dump(b, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[enrich_corporate_events] Gagal update market_data bundle: {e}")

    print(f"[enrich_corporate_events] Selesai! {enriched_count} agenda sukses diperkaya dan disimpan permanen.")
    return enriched_count


if __name__ == "__main__":
    enrich_all_corporate_events(only_upcoming=True, max_count=3)
