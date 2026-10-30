"""
Modul Fetch Top Foreign Accumulation dari Invezgo API.
Dioptimalkan untuk hemat token/kuota: Cache lokal di file top_foreign.json dan hanya refresh 1 hari sekali.
"""

import os
import sys
import json
import datetime
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'))

INVEZGO_BASE_URL = "https://api.invezgo.com"
DATA_DIR = os.path.join(BASE_DIR, 'data')
CACHE_FILE = os.path.join(DATA_DIR, 'top_foreign.json')
PUBLIC_DATA_FILE = os.path.join(BASE_DIR, 'frontend', 'public', 'data', 'top_foreign.json')
DIST_DATA_FILE = os.path.join(BASE_DIR, 'frontend', 'dist', 'data', 'top_foreign.json')


def get_invezgo_api_key() -> str:
    k = os.getenv("INVESGO_API") or os.getenv("INVEZGO_API") or ""
    return k.strip().strip('"').strip("'")


def get_cached_top_foreign() -> dict | None:
    if not os.path.exists(CACHE_FILE):
        return None
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data
    except Exception as e:
        print(f"[get_cached_top_foreign] Error: {e}")
        return None


def is_cache_valid(cached_data: dict, max_age_hours: int = 24) -> bool:
    if not cached_data or not cached_data.get('top_tickers'):
        return False
    updated_at_str = cached_data.get('updated_at')
    if not updated_at_str:
        return False
    try:
        updated_at = datetime.datetime.fromisoformat(updated_at_str)
        now = datetime.datetime.now()
        age_hours = (now - updated_at).total_seconds() / 3600.0
        return age_hours < max_age_hours
    except Exception:
        return False


def save_top_foreign_cache(data: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Mirror ke frontend public & dist
    for dest_file in (PUBLIC_DATA_FILE, DIST_DATA_FILE):
        try:
            os.makedirs(os.path.dirname(dest_file), exist_ok=True)
            with open(dest_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[save_top_foreign_cache] Mirror error to {dest_file}: {e}")


def fetch_top_foreign(force: bool = False) -> dict:
    # 1. Cek cache (1 hari sekali)
    cached = get_cached_top_foreign()
    if not force and is_cache_valid(cached):
        print(f"[fetch_top_foreign] Menggunakan cache top_foreign.json (diperbarui: {cached.get('updated_at')}, hemat token)")
        return cached

    # 2. Ambil dari Invezgo API
    api_key = get_invezgo_api_key()
    if not api_key:
        print("[fetch_top_foreign] Peringatan: API key Invezgo tidak ditemukan di .env")
        if cached:
            return cached
        # Fallback default 10 saham
        return {
            "updated_at": datetime.datetime.now().isoformat(),
            "trading_date": "N/A",
            "top_tickers": ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'AMMN', 'ADRO', 'ICBP', 'GOTO'],
            "items": []
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }

    now = datetime.datetime.now()
    found_date = None
    res_payload = None

    # Coba dari hari ini mundur hingga 5 hari (mencari hari bursa aktif terakhir)
    for offset in range(5):
        d_str = (now.date() - datetime.timedelta(days=offset)).strftime('%Y-%m-%d')
        try:
            url = f"{INVEZGO_BASE_URL}/analysis/top/foreign?date={d_str}"
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code == 200:
                payload = r.json()
                accum = payload.get('accum', [])
                if len(accum) > 0:
                    found_date = d_str
                    res_payload = payload
                    break
        except Exception as e:
            print(f"[fetch_top_foreign] Error fetching {d_str}: {e}")

    if not res_payload:
        print("[fetch_top_foreign] Gagal mendapatkan data top foreign dari Invezgo.")
        if cached:
            return cached
        return {
            "updated_at": now.isoformat(),
            "trading_date": "N/A",
            "top_tickers": ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'AMMN', 'ADRO', 'ICBP', 'GOTO'],
            "items": []
        }

    accum = res_payload.get('accum', [])
    dist = res_payload.get('dist', [])

    # Ambil top 15 emiten teratas dari Invezgo
    top_tickers = [x.get('code') for x in accum if x.get('code')][:15]
    if not top_tickers:
        top_tickers = ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'AMMN', 'ADRO', 'ICBP', 'GOTO']

    # Filter items ringkas agar file json ringan & cepat di-load
    top_items = []
    for item in accum[:20]:
        top_items.append({
            "ticker": item.get('code'),
            "name": item.get('name'),
            "price": item.get('price'),
            "change": item.get('change'),
            "value": item.get('value'),
            "volume": item.get('volume'),
            "calculated_value": item.get('calculated_value'),
            "logo": item.get('logo')
        })

    result = {
        "updated_at": now.isoformat(),
        "trading_date": found_date,
        "top_tickers": top_tickers,
        "items": top_items,
        "total_accum_count": len(accum)
    }

    save_top_foreign_cache(result)
    print(f"[fetch_top_foreign] Berhasil memperbarui top_foreign.json ({len(top_tickers)} emiten per tanggal bursa {found_date})")
    return result


if __name__ == '__main__':
    force_run = '--force' in sys.argv
    data = fetch_top_foreign(force=force_run)
    print("Result summary:")
    print(f"Trading Date: {data.get('trading_date')}")
    print(f"Updated At: {data.get('updated_at')}")
    print(f"Top Tickers ({len(data.get('top_tickers', []))}): {data.get('top_tickers')}")
