"""
seed_top_stocks.py — Utilitas Pre-Seed Hemat Kuota untuk Database SQLite (data/pintarsaham.db)
Mengisi data fundamental kuartalan, profil BEI, pemegang saham KSEI, dan keterbukaan informasi BEI
untuk saham-saham utama LQ45 & populer.
Otomatis MELEWATI (0 Request API) saham yang sudah tersimpan di SQLite dalam 90 hari terakhir.
"""

import sys
import time
import json
import os
from invezgo_client import fetch_company_complete_invezgo
from db_manager import (
    get_company_detail_db,
    save_corporate_events_db,
    get_corporate_events_db,
    DATA_DIR,
)

DEFAULT_TOP_STOCKS = [
    "BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII",
    "ICBP", "INDF", "UNVR", "AMRT", "KLBF", "UNTR",
    "ADRO", "PTBA", "PGAS", "ANTM", "INCO", "MDKA",
    "GOTO", "BREN", "AMMN", "BRPT", "TPIA", "BYAN",
    "JSMR", "ISAT", "EXCL", "MTEL", "TOWR", "CPIN",
    "JPFA", "MYOR", "SIDO", "MIKA", "HEAL", "ACES",
    "MAPI", "CTRA", "BSDE", "PWON", "SMRA", "ITMG",
    "MEDC", "AKRA", "INKP",
]


def sync_corporate_calendar_initial():
    """Sinkronkan file corporate_events.json ke tabel SQLite corporate_calendar & bersihkan teks lama."""
    ev_path = os.path.join(DATA_DIR, "corporate_events.json")
    if os.path.exists(ev_path):
        try:
            with open(ev_path, "r", encoding="utf-8") as f:
                raw_events = json.load(f)
            save_corporate_events_db(raw_events)
            cleaned = get_corporate_events_db()
            with open(ev_path, "w", encoding="utf-8") as f:
                json.dump(cleaned, f, indent=2, ensure_ascii=False)
            print(f"[seed_top_stocks] {len(cleaned)} agenda korporasi disinkronkan ke SQLite corporate_calendar.")
        except Exception as e:
            print(f"[seed_top_stocks] Gagal sinkronisasi kalender: {e}")


def seed_stocks(tickers: list[str], delay_sec: float = 0.6):
    total_reqs = 0
    skipped = 0
    seeded = 0
    for sym in tickers:
        clean = sym.upper().strip()
        res = fetch_company_complete_invezgo(clean, force=False)
        reqs = res.get("apiRequestsUsed", 0)
        total_reqs += reqs
        if res.get("cachedDb"):
            skipped += 1
            print(f"  [SKIP - Sudah di DB (0 Req)] {clean}")
        else:
            seeded += 1
            periods = [p.get("year") for p in (res.get("financials") or [])]
            print(f"  [SAVED ke SQLite ({reqs} Req)] {clean} -> Periode: {periods}")
            time.sleep(delay_sec)
    print(
        f"\nSelesai! Baru disimpan: {seeded} emiten | Dilewati (sudah di DB): {skipped} emiten | Total Request API: {total_reqs}"
    )


if __name__ == "__main__":
    sync_corporate_calendar_initial()
    limit = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 16
    target_list = DEFAULT_TOP_STOCKS[:limit]
    print(f"Memulai pre-seed {len(target_list)} saham utama ke SQLite DB (data/pintarsaham.db)...")
    seed_stocks(target_list)
