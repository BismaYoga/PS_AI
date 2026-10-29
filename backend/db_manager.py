"""
db_manager.py — Manajemen Database Lokal SQLite (data/pintarsaham.db)
Menyimpan data fundamental kuartalan, laporan keuangan 5 periode, profil perusahaan,
komposisi pemegang saham KSEI, keterbukaan informasi BEI, serta histori chart OHLC & Intraday
agar SANGAT HEMAT REQUEST ke Invezgo API (data kuartalan tidak perlu ditarik berulang kali).
"""

import os
import json
import time
import sqlite3
import threading

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "pintarsaham.db")
_db_lock = threading.Lock()

# TTL (Time-To-Live) berdasarkan siklus rilis data bursa:
TTL_QUARTERLY_FUNDAMENTALS = 90 * 24 * 3600  # 90 Hari (1 Kuartal) untuk Laporan Keuangan, Profil, & KSEI
TTL_DISCLOSURES = 7 * 24 * 3600              # 7 Hari untuk dokumen Keterbukaan Informasi per emiten
TTL_DAILY_OHLC = 18 * 3600                   # 18 Jam untuk histori candlestick harian
TTL_INTRADAY = 30 * 60                       # 30 Menit untuk chart intraday 1D


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=20, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Inisialisasi tabel SQLite jika belum ada."""
    with _db_lock:
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS company_details (
                    ticker TEXT PRIMARY KEY,
                    profile_json TEXT,
                    financials_json TEXT,
                    shareholders_json TEXT,
                    disclosures_json TEXT,
                    fundamentals_updated_at REAL DEFAULT 0,
                    disclosures_updated_at REAL DEFAULT 0
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS market_quotes (
                    ticker TEXT PRIMARY KEY,
                    data_json TEXT,
                    ohlc_updated_at REAL DEFAULT 0,
                    intraday_updated_at REAL DEFAULT 0,
                    updated_at REAL DEFAULT 0
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS corporate_calendar (
                    id TEXT PRIMARY KEY,
                    ticker TEXT,
                    event_date TEXT,
                    event_type TEXT,
                    data_json TEXT,
                    updated_at REAL DEFAULT 0
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS shareholder_networks (
                    holder_name TEXT PRIMARY KEY,
                    holdings_json TEXT,
                    updated_at REAL DEFAULT 0
                )
            """)
            conn.commit()
        finally:
            conn.close()


init_db()


def get_company_detail_db(ticker: str) -> dict | None:
    """Ambil data lengkap perusahaan (profil, laporan keuangan kuartalan, pemegang saham, keterbukaan informasi) dari SQLite."""
    clean = ticker.upper().strip()
    conn = _get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM company_details WHERE ticker = ?", (clean,))
        row = cur.fetchone()
        if not row:
            return None
        return {
            "ticker": clean,
            "profile": json.loads(row["profile_json"]) if row["profile_json"] else None,
            "financials": json.loads(row["financials_json"]) if row["financials_json"] else None,
            "shareholders": json.loads(row["shareholders_json"]) if row["shareholders_json"] else None,
            "disclosures": json.loads(row["disclosures_json"]) if row["disclosures_json"] else None,
            "fundamentals_updated_at": float(row["fundamentals_updated_at"] or 0),
            "disclosures_updated_at": float(row["disclosures_updated_at"] or 0),
        }
    except Exception as e:
        print(f"[db_manager] Error reading company_details {clean}: {e}")
        return None
    finally:
        conn.close()


def save_company_detail_db(
    ticker: str,
    profile: dict = None,
    financials: list = None,
    shareholders: list = None,
    disclosures: list = None,
):
    """Simpan atau perbarui data fundamental kuartalan, profil, pemegang saham, dan keterbukaan informasi ke SQLite."""
    clean = ticker.upper().strip()
    now = time.time()
    existing = get_company_detail_db(clean) or {}

    new_profile = profile if profile is not None else existing.get("profile")
    new_financials = financials if financials is not None else existing.get("financials")
    new_shareholders = shareholders if shareholders is not None else existing.get("shareholders")
    new_disclosures = disclosures if disclosures is not None else existing.get("disclosures")

    fund_ts = (
        now
        if ((profile and len(profile) > 0) or (financials and len(financials) > 0))
        else existing.get("fundamentals_updated_at", 0)
    )
    disc_ts = now if disclosures is not None else existing.get("disclosures_updated_at", 0)

    with _db_lock:
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO company_details (
                    ticker, profile_json, financials_json, shareholders_json, disclosures_json,
                    fundamentals_updated_at, disclosures_updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(ticker) DO UPDATE SET
                    profile_json = excluded.profile_json,
                    financials_json = excluded.financials_json,
                    shareholders_json = excluded.shareholders_json,
                    disclosures_json = excluded.disclosures_json,
                    fundamentals_updated_at = excluded.fundamentals_updated_at,
                    disclosures_updated_at = excluded.disclosures_updated_at
                """,
                (
                    clean,
                    json.dumps(new_profile, ensure_ascii=False) if new_profile is not None else None,
                    json.dumps(new_financials, ensure_ascii=False) if new_financials is not None else None,
                    json.dumps(new_shareholders, ensure_ascii=False) if new_shareholders is not None else None,
                    json.dumps(new_disclosures, ensure_ascii=False) if new_disclosures is not None else None,
                    fund_ts,
                    disc_ts,
                ),
            )
            conn.commit()
        except Exception as e:
            print(f"[db_manager] Error saving company_details {clean}: {e}")
        finally:
            conn.close()

    # Sinkronkan keterbukaan informasi penting (RUPS, Dividen, Laporan Keuangan) ke tabel corporate_calendar
    if disclosures and isinstance(disclosures, list):
        cal_events = []
        for idx, d in enumerate(disclosures[:5]):
            if not isinstance(d, dict):
                continue
            title = str(d.get("title") or "").strip()
            raw_date = str(d.get("rawDate") or "")[:10]
            if not title or not raw_date:
                continue
            low = title.lower()
            ev_type = "Lainnya"
            if "dividen" in low:
                ev_type = "Dividen"
            elif "rups" in low or "rapat umum" in low:
                ev_type = "RUPS"
            elif "laporan keuangan" in low or "audit" in low or "kuartal" in low:
                ev_type = "Laporan Keuangan"
            elif "split" in low:
                ev_type = "Stock Split"
            elif "rights" in low or "hmetd" in low:
                ev_type = "Rights Issue"
            else:
                continue
            ev_id = f"bei_{clean}_{raw_date.replace('-', '')}_{idx}"
            cal_events.append({
                "id": ev_id,
                "ticker": clean,
                "date": raw_date,
                "type": ev_type,
                "title": title[:95],
                "sub": f"Keterbukaan Informasi Resmi BEI ({clean})",
                "amount": "Dokumen Resmi BEI",
                "note": f"Pengumuman resmi Bursa Efek Indonesia untuk {clean} pada {d.get('date', raw_date)}: {title}.",
            })
        if cal_events:
            save_corporate_events_db(cal_events)


def save_corporate_events_db(events_list: list):
    """Simpan daftar agenda aksi korporasi ke tabel SQLite corporate_calendar & bersihkan teks sumber lama."""
    if not events_list or not isinstance(events_list, list):
        return
    now = time.time()
    rows = []
    for ev in events_list:
        if not isinstance(ev, dict):
            continue
        ev_id = str(ev.get("id") or "").strip()
        ticker = str(ev.get("ticker") or "").upper().strip()
        ev_date = str(ev.get("date") or "")[:10]
        ev_type = str(ev.get("type") or "Lainnya").strip()
        if not ev_id or not ticker or not ev_date:
            continue
        cleaned_ev = dict(ev)
        if "note" in cleaned_ev and isinstance(cleaned_ev["note"], str):
            cleaned_ev["note"] = cleaned_ev["note"].replace(
                "Yahoo Finance", "Invezgo & IDX Official Feed (BEI)"
            )
        rows.append((
            ev_id,
            ticker,
            ev_date,
            ev_type,
            json.dumps(cleaned_ev, ensure_ascii=False),
            now,
        ))
    if not rows:
        return
    with _db_lock:
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.executemany(
                """
                INSERT INTO corporate_calendar (id, ticker, event_date, event_type, data_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    data_json = excluded.data_json,
                    updated_at = excluded.updated_at
                """,
                rows,
            )
            conn.commit()
        except Exception as e:
            print(f"[db_manager] Error saving corporate_calendar: {e}")
        finally:
            conn.close()


def get_corporate_events_db() -> list:
    """Ambil seluruh agenda aksi korporasi dari tabel SQLite corporate_calendar diurutkan dari yang terdekat (mendatang) terlebih dahulu, disusul riwayat."""
    conn = _get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT data_json FROM corporate_calendar
            ORDER BY
                CASE WHEN event_date >= date('now') THEN 0 ELSE 1 END ASC,
                CASE WHEN event_date >= date('now') THEN event_date END ASC,
                CASE WHEN event_date < date('now') THEN event_date END DESC
        """)
        res = []
        for row in cur.fetchall():
            try:
                res.append(json.loads(row["data_json"]))
            except Exception:
                pass
        return res
    except Exception:
        return []
    finally:
        conn.close()


def save_market_quotes_bulk_db(cache_dict: dict):
    """Sinkronkan seluruh kamus market_data (910 instrumen) ke tabel SQLite market_quotes."""
    if not cache_dict:
        return
    now = time.time()
    rows = []
    for sym, data in cache_dict.items():
        if not isinstance(data, dict):
            continue
        has_ohlc = 1 if (data.get("ohlc") and len(data["ohlc"]) >= 2) else 0
        has_intra = 1 if (data.get("intraday") and len(data["intraday"]) >= 2) else 0
        rows.append((
            sym.upper().strip(),
            json.dumps(data, ensure_ascii=False),
            now if has_ohlc else 0,
            now if has_intra else 0,
            now,
        ))
    with _db_lock:
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.executemany(
                """
                INSERT INTO market_quotes (ticker, data_json, ohlc_updated_at, intraday_updated_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(ticker) DO UPDATE SET
                    data_json = excluded.data_json,
                    ohlc_updated_at = CASE WHEN excluded.ohlc_updated_at > 0 THEN excluded.ohlc_updated_at ELSE market_quotes.ohlc_updated_at END,
                    intraday_updated_at = CASE WHEN excluded.intraday_updated_at > 0 THEN excluded.intraday_updated_at ELSE market_quotes.intraday_updated_at END,
                    updated_at = excluded.updated_at
                """,
                rows,
            )
            conn.commit()
        except Exception as e:
            print(f"[db_manager] Error bulk saving market_quotes: {e}")
        finally:
            conn.close()


def load_all_market_quotes_db() -> dict:
    """Muat seluruh kamus market_quotes dari SQLite jika tersedia."""
    conn = _get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT ticker, data_json FROM market_quotes")
        res = {}
        for row in cur.fetchall():
            try:
                res[row["ticker"]] = json.loads(row["data_json"])
            except Exception:
                pass
        return res
    except Exception:
        return {}
    finally:
        conn.close()


def get_shareholder_network_db(holder_name: str) -> dict | None:
    """Ambil data jaring kepemilikan saham oleh tokoh/institusi dari SQLite."""
    clean = holder_name.upper().strip()
    conn = _get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM shareholder_networks WHERE holder_name = ?", (clean,))
        row = cur.fetchone()
        if not row:
            return None
        return {
            "holderName": clean,
            "holdings": json.loads(row["holdings_json"]) if row["holdings_json"] else [],
            "updated_at": float(row["updated_at"] or 0),
        }
    except Exception as e:
        print(f"[db_manager] Error reading shareholder_networks {clean}: {e}")
        return None
    finally:
        conn.close()


def save_shareholder_network_db(holder_name: str, holdings: list):
    """Simpan data jaring kepemilikan saham oleh tokoh/institusi ke SQLite."""
    clean = holder_name.upper().strip()
    now = time.time()
    with _db_lock:
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO shareholder_networks (holder_name, holdings_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(holder_name) DO UPDATE SET
                    holdings_json = excluded.holdings_json,
                    updated_at = excluded.updated_at
                """,
                (
                    clean,
                    json.dumps(holdings, ensure_ascii=False),
                    now,
                ),
            )
            conn.commit()
        except Exception as e:
            print(f"[db_manager] Error saving shareholder_networks {clean}: {e}")
        finally:
            conn.close()


