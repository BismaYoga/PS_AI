"""
chatbot_agent.py — AI Chatbot Asisten PintarSaham
Menggunakan Google Gemini 3.5 Flash dengan Function Calling terintegrasi
ke Invezgo API dan database lokal PintarSaham.

Prinsip Anti-Halusinasi:
- Hanya menjawab berdasarkan data faktual yang ditarik via tools.
- Menolak dengan sopan jika data di luar cakupan pasar modal BEI atau tidak tersedia di tools.
"""

import os
import sys
import json
import requests
import time
import re
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
for env_p in (os.path.join(BASE_DIR, '.env'), os.path.join(BACKEND_DIR, '.env')):
    if os.path.exists(env_p):
        load_dotenv(env_p)

from invezgo_client import get_invezgo_api_key, get_auth_headers, INVEZGO_BASE_URL
from db_manager import (
    load_all_market_quotes_db,
    save_single_market_quote_db,
    get_company_detail_db,
    get_corporate_events_db,
)

GEMINI_API_KEY = os.getenv("GEMINI_API") or ""
GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash"]

SYSTEM_PROMPT = """Kamu adalah Asisten AI Resmi PintarSaham (PintarSaham Intelligence Assistant).
Tugasmu adalah membantu investor memahami data pasar modal Indonesia (Bursa Efek Indonesia / BEI / IDX) secara komprehensif, berbasis data faktual, dan mendalam.

KEMAMPUAN ANALISIS & TOOLS YANG TERSEDIA:
1. Data Harga & Valuasi Saham: `get_stock_quote` (harga realtime, PER, PBV, ROE, EPS, Fair Value).
2. Analisis Bandarmologi & Broker Flow: `get_broker_summary` (Broker Summary: siapa sekuritas yang akumulasi/distribusi, net buy/sell, average price).
3. Penggerak Pasar & Aliran Dana: `get_market_top_flow` (Top Foreign Flow, Top Bandarmology Accumulation, Top Retail Flow, Top Gainers & Losers).
4. Kedalaman Pasar & Order Book: `get_order_book` (Bid & Offer depth, antrean lot, support/resistance mikro order book).
5. Indeks Acuan Pasar: `get_market_ihsg` (Pergerakan IHSG, turnover total bursa, gainers/losers bursa).
6. Laporan Keuangan Kuartalan: `get_company_financials` (Tren Revenue, Net Profit, Marjin, CFO 5 kuartal).
7. Rasio Statistik Keuangan Mendalam: `get_key_statistics` (Solvabilitas, Profitabilitas, Valuasi lengkap dari bursa).
8. Struktur Kepemilikan Saham: `get_shareholders_and_insiders` (Pemegang saham >5% KSEI).
9. Transaksi Orang Dalam (Insider Trading): `get_insider_transactions` (Pembelian/penjualan saham oleh direksi, komisaris, atau pengendali resmi BEI).
10. Notasi Khusus & Keterbukaan Informasi: `get_special_notations_and_disclosures` (Notasi tato bursa seperti X, E, M, B, serta pengumuman emiten terbaru).
11. Aksi Korporasi & Kalender Pasar: `get_corporate_events` (Dividen, RUPS, Rights Issue, Stock Split, Warrant).
12. Skrining Saham Bursa, RSI & Stochastic: `screen_market_stocks` (Penyaringan multi-emiten berdasarkan formula fundamental maupun teknikal: stochastic mendekati 0 / oversold ('stochastic_oversold'), stochastic overbought ('stochastic_overbought'), oversold RSI < 30 ('oversold_rsi'), overbought RSI > 70, rebound momentum, ROE tinggi, atau undervalued). JANGAN mengecek satu per satu manual jika pengguna meminta mencari/skrining saham stochastic di bursa; langsung gunakan `screen_market_stocks` dengan criteria="stochastic_oversold".
13. Indikator Teknikal & RSI / Stochastic RSI Emiten Spesifik: `get_stock_technicals` (Nilai eksak RSI-14, Stochastic RSI (%K & %D, sinyal Golden Cross/Dead Cross), Moving Average MA20 & MA50, status momentum Oversold/Overbought/Netral, serta level support & resistance teknikal harian untuk saham tunggal seperti BBCA, BBRI, dsb).

ATURAN WAJIB & ANTI-HALUSINASI (STRICT GROUNDING RULES):
1. KAMU HANYA BOLEH MENJAWAB BERDASARKAN HASIL EKSEKUSI TOOLS DI ATAS ATAU DATABASE SISTEM.
2. JANGAN PERNAH MENYEBUT NAMA VENDOR DATA PIHAK KETIGA (seperti Invezgo). Sebut selalu sebagai "Sistem Data Pasar Modal BEI / PintarSaham".
3. JIKA PERTANYAAN DI LUAR DATA SISTEM / PASAR MODAL (misalnya politik, ramalan cuaca, resep, coding umum):
   Tolak secara sopan: "Maaf, saya adalah asisten pasar modal PintarSaham. Saya hanya memiliki akses dan wewenang untuk menjawab pertanyaan seputar data pasar modal dan emiten Bursa Efek Indonesia (BEI) yang tersedia di sistem kami."
4. JIKA DATA SUATU EMITEN BELUM TERSEDIA:
   Sampaikan dengan jujur dan transparan tanpa mengarang angka.
5. GAYA PENYAJIAN & FORMATTING BERSIH (PENTING):
   - Tuliskan jawaban secara bersih, elegan, dan profesional.
   - JANGAN PERNAH mencampur header dengan tanda bintang tebal seperti '### **Judul**'. Cukup tulis '### Judul Bagian'.
   - JANGAN PERNAH memunculkan simbol aneh beruntun seperti '***' atau '**#'.
   - Untuk daftar jadwal atau list emiten, gunakan format rapi:
     * **KODESAHAM** - Nama Emiten: Keterangan (misal: Tanggal / Est. EPS).
   - Gunakan format mata uang Rupiah yang standar (misal: Rp 5.000, Rp 88,0 Miliar).
   - Sajikan tabel markdown yang rapi hanya saat menyajikan data kuantitatif komparasi multi-kolom.
"""

TOOL_DEFINITIONS = [
    {
        "name": "get_stock_quote",
        "description": "Mengambil harga saham terkini (realtime/closing), persentase perubahan harga, volume, nilai transaksi, PER, PBV, ROE, EPS, Fair Value, dan profil emiten BEI.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Kode saham 4 huruf kapital (contoh: BBCA, BBRI, TLKM, ASII, BMRI)"
                }
            },
            "required": ["ticker"]
        }
    },
    {
        "name": "get_broker_summary",
        "description": "Mengambil data Broker Summary (Bandarmologi) emiten saham: rincian transaksi broker sekuritas, top 5 net buyers (akumulasi) dan top 5 net sellers (distribusi), rata-rata harga beli/jual broker, dan evaluasi status akumulasi/distribusi bursa.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Kode saham emiten BEI (contoh: BBCA, BBRI, ASII)"
                },
                "days": {
                    "type": "INTEGER",
                    "description": "Jumlah hari rentang analisis (default 1 untuk sesi perdagangan terakhir)"
                }
            },
            "required": ["ticker"]
        }
    },
    {
        "name": "get_market_top_flow",
        "description": "Mengambil daftar emiten penggerak pasar bursa (Top Movers & Flow): top akumulasi & distribusi investor asing ('foreign'), top akumulasi & distribusi bandarmologi ('accumulation'), top aliran transaksi ritel ('ritel'), atau top gainers & losers harian ('movers').",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "category": {
                    "type": "STRING",
                    "description": "Kategori flow: 'foreign' (aliran dana asing), 'accumulation' (akumulasi bandarmologi), 'ritel' (aliran ritel), atau 'movers' (top gainers/losers)"
                }
            },
            "required": ["category"]
        }
    },
    {
        "name": "get_order_book",
        "description": "Mengambil data kedalaman pasar (Order Book Bid & Offer) real-time emiten saham: level harga, volume antrean lot, total bid vs total offer, dan rasio ketebalan beli/jual (analisis support/resistance mikro order book).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Kode saham emiten BEI (contoh: BBCA, TLKM, BREN)"
                }
            },
            "required": ["ticker"]
        }
    },
    {
        "name": "get_market_ihsg",
        "description": "Mengambil ringkasan kondisi pasar acuan Indeks Harga Saham Gabungan (IHSG / COMPOSITE): level indeks terkini, perubahan harian, jumlah saham naik (gainers), jumlah saham turun (losers), dan estimasi total turnover bursa.",
        "parameters": {
            "type": "OBJECT",
            "properties": {}
        }
    },
    {
        "name": "get_company_financials",
        "description": "Mengambil data laporan keuangan kuartalan resmi emiten (5 kuartal terakhir): Pendapatan (Revenue), Laba Bersih (Net Profit), Net Profit Margin, EPS, BVPS, ROE, Total Aset, Total Ekuitas, dan Arus Kas Operasi (CFO).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Kode saham emiten BEI (contoh: BBCA, BBRI, TLKM)"
                }
            },
            "required": ["ticker"]
        }
    },
    {
        "name": "get_key_statistics",
        "description": "Mengambil statistik rasio keuangan utama dan indikator valuasi mendalam emiten (PER, PBV, ROE, ROA, GPM, OPM, NPM, DER, Current Ratio, Cash Ratio, EV/EBITDA, Dividend Yield).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Kode saham emiten BEI (contoh: BBCA, ASII, UNVR)"
                }
            },
            "required": ["ticker"]
        }
    },
    {
        "name": "get_shareholders_and_insiders",
        "description": "Mengambil susunan pemegang saham utama di atas 5% (KSEI) dan keterbukaan informasi / aksi korporasi terbaru yang dilaporkan ke Bursa Efek Indonesia.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Kode saham emiten BEI (contoh: BBCA, ASII)"
                }
            },
            "required": ["ticker"]
        }
    },
    {
        "name": "get_insider_transactions",
        "description": "Mengambil laporan transaksi orang dalam (Insider Trading) resmi dari bursa BEI: pembelian atau penjualan saham oleh direksi, komisaris, atau pemegang saham pengendali emiten.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Opsional: Kode saham spesifik (contoh: BBCA). Kosongkan jika ingin melihat transaksi orang dalam bursa secara umum."
                }
            }
        }
    },
    {
        "name": "get_special_notations_and_disclosures",
        "description": "Memeriksa apakah emiten memiliki Notasi Khusus Bursa (Tato Bursa: notasi X untuk pemantauan khusus, E untuk ekuitas negatif, M untuk PKPU, dll) serta laporan keterbukaan informasi (corporate disclosure) resmi terbaru dari emiten ke bursa.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Opsional: Kode saham spesifik (contoh: BBCA). Kosongkan untuk melihat daftar saham ber-notasi khusus bursa."
                }
            }
        }
    },
    {
        "name": "get_corporate_events",
        "description": "Mengambil jadwal kalender aksi korporasi pasar modal (RUPS, Cum Date Dividen, Ex Date Dividen, Pembayaran Dividen, Rights Issue, Stock Split, Warrant).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Opsional: Kode saham spesifik (contoh: BBCA). Kosongkan jika ingin melihat jadwal pasar secara umum."
                }
            }
        }
    },
    {
        "name": "get_stock_technicals",
        "description": "Mengambil indikator teknikal komprehensif untuk emiten tertentu: Relative Strength Index (RSI 14), Stochastic RSI (%K dan %D, sinyal Golden Cross/Dead Cross), Moving Average (MA20, MA50), status momentum (Oversold/Overbought/Netral), serta level support & resistance harian. Gunakan tool ini jika pengguna menanyakan RSI, Stochastic RSI, analisis teknikal, tren harga, atau posisi jenuh jual/jenuh beli suatu saham.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticker": {
                    "type": "STRING",
                    "description": "Kode saham BEI 4 huruf kapital (contoh: BBCA, BBRI, ASII, TLKM)."
                },
                "period": {
                    "type": "INTEGER",
                    "description": "Periode perhitungan RSI (default 14)."
                }
            },
            "required": ["ticker"]
        }
    },
    {
        "name": "screen_market_stocks",
        "description": "Melakukan skrining multi-emiten bursa secara komprehensif berdasarkan kriteria fundamental & teknikal: saham stochastic mendekati atau di level 0 / oversold ('stochastic_oversold'), stochastic overbought ('stochastic_overbought'), oversold RSI (<30) ('oversold_rsi'), overbought RSI (>70) ('overbought_rsi'), momentum bullish rebound ('rebound_rsi'), undervalued murah ('undervalued'), atau profitabilitas tinggi ('high_roe'). Gunakan tool ini saat pengguna meminta mencari saham dengan kriteria teknikal atau fundamental pasar.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "criteria": {
                    "type": "STRING",
                    "description": "Kriteria skrining: 'stochastic_oversold' (Stochastic RSI mendekati atau di level 0 / jenuh jual ekstrem), 'stochastic_overbought' (Stochastic RSI mendekati 100 / jenuh beli ekstrem), 'oversold_rsi' (RSI < 30 jenuh jual), 'overbought_rsi' (RSI > 70 jenuh beli), 'rebound_rsi' (RSI 40-60 & harga naik), 'undervalued' (PER < 15 & ROE > 15), 'high_roe' (ROE tertinggi), atau 'custom'"
                },
                "limit": {
                    "type": "INTEGER",
                    "description": "Jumlah saham yang ditampilkan (default 5, maksimal 10)"
                }
            }
        }
    }
]



# ==========================================
# TOOL IMPLEMENTATION
# ==========================================

def tool_get_stock_quote(ticker: str) -> dict:
    code = ticker.upper().strip()
    quotes = load_all_market_quotes_db()
    q = quotes.get(code)

    # Cek apakah ada data detail tambahan
    cd = get_company_detail_db(code)
    prof = (cd or {}).get("profile") or {}

    # Jika data harga belum ada di local DB, coba ambil realtime intraday dari Invezgo
    price = (q or {}).get("close")
    change = (q or {}).get("change")
    change_pct = (q or {}).get("changePct")

    if price is None:
        try:
            r = requests.get(
                f"{INVEZGO_BASE_URL}/analysis/intraday/{code}?market=RG",
                headers=get_auth_headers(),
                timeout=6
            )
            if r.status_code == 200:
                bars = r.json()
                if isinstance(bars, list) and len(bars) > 0:
                    last_bar = bars[-1]
                    price = last_bar.get("close")
                    # Langsung perbarui DB lokal agar permanen
                    if q:
                        q['close'] = price
                        save_single_market_quote_db(code, q)
        except Exception:
            pass

    if not q and not prof and price is None:
        return {
            "status": "not_found",
            "message": f"Data saham dengan kode '{code}' tidak ditemukan di sistem BEI PintarSaham."
        }

    return {
        "status": "success",
        "ticker": code,
        "name": prof.get("name") or (q or {}).get("name") or code,
        "sector": prof.get("sector") or (q or {}).get("sector") or "—",
        "subsector": prof.get("subsector") or (q or {}).get("subsector") or "—",
        "price": price,
        "change": change,
        "change_pct": change_pct,
        "volume": (q or {}).get("volume"),
        "pe_ratio": (q or {}).get("pe"),
        "pbv_ratio": (q or {}).get("pb"),
        "roe": (q or {}).get("roe"),
        "dy": (q or {}).get("dy"),
        "eps": (q or {}).get("eps"),
        "fair_value_mos": (q or {}).get("fairValue"),
        "mos_pct": (q or {}).get("mos"),
    }


def tool_get_market_ihsg() -> dict:
    try:
        r = requests.get(
            f"{INVEZGO_BASE_URL}/analysis/intraday-index/COMPOSITE",
            headers=get_auth_headers(),
            timeout=6
        )
        if r.status_code == 200:
            data = r.json()
            close_val = data.get("close")
            prev_val = data.get("prev")
            chg = (close_val - prev_val) if (close_val and prev_val) else None
            chg_pct = (chg / prev_val * 100) if (chg and prev_val) else None
            val_tot = float(data.get("value") or 0)
            turnover_str = f"Rp {val_tot / 1e12:.2f} Triliun" if val_tot >= 1e12 else f"Rp {val_tot / 1e9:.2f} Miliar"
            return {
                "status": "success",
                "index": "IHSG (Indeks Harga Saham Gabungan)",
                "level": close_val,
                "previous_close": prev_val,
                "change": round(chg, 2) if chg else "—",
                "change_pct": f"{chg_pct:+.2f}%" if chg_pct else "—",
                "gainers": data.get("positive"),
                "losers": data.get("negative"),
                "neutral": data.get("neutral"),
                "turnover": turnover_str,
                "volume": data.get("volume"),
            }
    except Exception as e:
        return {"status": "error", "message": f"Gagal menghubungi server data IHSG: {e}"}

    return {"status": "error", "message": "Data pasar IHSG tidak tersedia."}


def tool_get_company_financials(ticker: str) -> dict:
    code = ticker.upper().strip()
    cd = get_company_detail_db(code)
    if not cd or not cd.get("financials"):
        # Jika belum di cache, coba panggil Invezgo keystat
        try:
            r = requests.get(
                f"{INVEZGO_BASE_URL}/analysis/keystat/{code}?type=Q",
                headers=get_auth_headers(),
                timeout=6
            )
            if r.status_code == 200:
                rows = r.json().get("rows", [])
                return {
                    "status": "success",
                    "ticker": code,
                    "source": "Invezgo Keystat Live",
                    "raw_metrics_count": len(rows),
                    "note": f"Ditemukan {len(rows)} baris metrik keuangan kuartalan untuk {code}."
                }
        except Exception:
            pass
        return {
            "status": "not_found",
            "message": f"Laporan keuangan untuk emiten {code} belum diunduh ke cache lokal."
        }

    fins = cd.get("financials") or []
    return {
        "status": "success",
        "ticker": code,
        "name": (cd.get("profile") or {}).get("name") or code,
        "quarters_available": len(fins),
        "financial_data": fins
    }


def tool_get_shareholders_and_insiders(ticker: str) -> dict:
    code = ticker.upper().strip()
    cd = get_company_detail_db(code)
    if not cd:
        return {"status": "not_found", "message": f"Data pemegang saham {code} tidak ditemukan."}

    return {
        "status": "success",
        "ticker": code,
        "shareholders_ksei": cd.get("shareholders") or [],
        "latest_disclosures_bei": (cd.get("disclosures") or [])[:5]
    }


SCREENER_CACHE = {}

def tool_screen_market_stocks(criteria: str = "undervalued", limit: int = 5) -> dict:
    """
    Melakukan skrining multi-emiten bursa secara batch:
    1 request langsung menyaring seluruh saham aktif BEI, lalu hasilnya disimpan ke DB SQLite.
    Mendukung filter fundamental (undervalued, high_roe) dan filter teknikal (stochastic_oversold, oversold_rsi, overbought_rsi, rebound_rsi).
    Dilengkapi Smart 2-Step Pre-filtering Pipeline untuk Stochastic RSI & in-memory caching untuk mematuhi rate-limit bursa.
    """
    limit_val = min(max(int(limit or 5), 1), 10)
    crit = (criteria or "undervalued").lower().strip()

    # ========================================================
    # SMART 2-STEP PIPELINE UNTUK STOCHASTIC RSI MULTI-EMITEN
    # ========================================================
    is_stoch_oversold = (
        crit in ["stochastic_oversold", "stochastic_near_zero", "stochastic_zero", "stoch_oversold", "stoch_zero", "stochastic", "stoch"]
        or ("stoch" in crit and any(w in crit for w in ["oversold", "zero", "nol", "bawah", "rendah", "0"]))
    )
    is_stoch_overbought = (
        crit in ["stochastic_overbought", "stoch_overbought"]
        or ("stoch" in crit and any(w in crit for w in ["overbought", "atas", "tinggi", "100"]))
    )

    if is_stoch_oversold or is_stoch_overbought:
        cache_key = "stoch_overbought_pipeline" if is_stoch_overbought else "stoch_oversold_pipeline"
        now = time.time()
        cached = SCREENER_CACHE.get(cache_key)
        if cached and (now - cached.get("timestamp", 0) < 300):
            return cached.get("data")

        # Langkah 1: Pre-filter bursa (RSI < 32 untuk oversold, RSI > 68 untuk overbought)
        base_formula = "rsi(14) > 68 and volume > 100000" if is_stoch_overbought else "rsi(14) < 32 and volume > 100000"
        matched_candidates = None
        base_cached = SCREENER_CACHE.get(base_formula)
        if base_cached and (now - base_cached.get("timestamp", 0) < 300):
            matched_candidates = base_cached.get("data")
        else:
            try:
                r = requests.post(
                    f"{INVEZGO_BASE_URL}/screener/screen",
                    headers=get_auth_headers(),
                    json={"formula": base_formula},
                    timeout=10,
                )
                if r.status_code == 200:
                    matched_candidates = r.json()
                    SCREENER_CACHE[base_formula] = {"timestamp": now, "data": matched_candidates}
                elif r.status_code == 429 and base_cached:
                    matched_candidates = base_cached.get("data")
            except Exception as e:
                print(f"[Stoch Pipeline Pre-filter Error] {e}")
                if base_cached:
                    matched_candidates = base_cached.get("data")

        if matched_candidates and isinstance(matched_candidates, list):
            # Ambil top 8 saham dengan volume likuiditas terbesar
            top_candidates = sorted(matched_candidates, key=lambda x: x.get("volume", 0), reverse=True)[:8]
            tickers = [item["code"] for item in top_candidates if item.get("code")]

            # Langkah 2: Hitung Stochastic RSI (%K dan %D) secara paralel
            tech_results = []
            with ThreadPoolExecutor(max_workers=5) as executor:
                tech_results = list(executor.map(tool_get_stock_technicals, tickers))

            quotes_db = load_all_market_quotes_db()
            stoch_items = []
            for t in tech_results:
                if t.get("status") == "success":
                    c = t.get("ticker")
                    stoch_dict = t.get("stochastic_rsi") or {}
                    k_val = stoch_dict.get("stoch_k")
                    d_val = stoch_dict.get("stoch_d")
                    stoch_items.append({
                        "code": c,
                        "company_name": quotes_db.get(c, {}).get("name") or c,
                        "price": t.get("latest_close"),
                        "rsi_14": t.get("rsi_value"),
                        "stoch_k": k_val,
                        "stoch_d": d_val,
                        "signal": stoch_dict.get("stoch_signal"),
                        "support": t.get("support_20d"),
                        "resistance": t.get("resistance_20d"),
                    })

            # Langkah 3: Sortir berdasarkan %K
            if is_stoch_overbought:
                sorted_stoch = sorted(
                    stoch_items,
                    key=lambda x: (x["stoch_k"] if x.get("stoch_k") is not None else -1),
                    reverse=True
                )[:limit_val]
                title_desc = "Emiten Jenuh Beli Ekstrem / Stochastic RSI Mendekati 100"
            else:
                sorted_stoch = sorted(
                    stoch_items,
                    key=lambda x: (x["stoch_k"] if x.get("stoch_k") is not None else 999),
                    reverse=False
                )[:limit_val]
                title_desc = "Emiten Jenuh Jual Ekstrem / Stochastic RSI Mendekati 0"

            res_payload = {
                "status": "success",
                "methodology": f"Smart 2-Step Pipeline: Pre-Filter Bursa ('{base_formula}') + Kalkulasi Presisi StochRSI (%K & %D)",
                "formula_used": base_formula,
                "criteria_category": "stochastic_rsi",
                "total_matched": len(matched_candidates),
                "top_results": sorted_stoch,
                "explanation": (
                    f"Saham-saham ini disaring menggunakan Smart 2-Step Pre-filtering: memfilter emiten dengan likuiditas aktif pada area ekstrem, "
                    f"lalu mengkalkulasi nilai presisi Stochastic RSI (%K dan %D) untuk menemukan emiten yang nilai stochastic-nya paling ekstrem ({'mendekati 100' if is_stoch_overbought else 'mendekati atau di angka 0'})."
                ),
            }
            SCREENER_CACHE[cache_key] = {"timestamp": now, "data": res_payload}
            return res_payload

    sort_key = "roe"
    sort_reverse = True

    # Tentukan formula skrining
    if crit in ["oversold_rsi", "rsi_oversold", "oversold"]:
        formula = "rsi(14) < 30 and volume > 100000"
        desc = "Emiten Jenuh Jual / Oversold (RSI-14 < 30) dengan volume likuid (>100.000 lembar)"
        sort_key = "rsi(14)"
        sort_reverse = False  # Paling jenuh jual (RSI terendah) di urutan teratas
    elif crit in ["overbought_rsi", "rsi_overbought", "overbought"]:
        formula = "rsi(14) > 70 and volume > 100000"
        desc = "Emiten Jenuh Beli / Overbought (RSI-14 > 70) dengan volume likuid (>100.000 lembar)"
        sort_key = "rsi(14)"
        sort_reverse = True
    elif crit in ["rebound_rsi", "bullish_rsi", "momentum_rsi"]:
        formula = "rsi(14) > 40 and rsi(14) < 60 and close > prev and volume > 100000"
        desc = "Emiten Rebound Momentum Bullish (RSI-14 antara 40-60 dan harga bergerak menguat)"
        sort_key = "rsi(14)"
        sort_reverse = True
    elif crit == "high_roe":
        formula = "close > 0 and roe > 20"
        desc = "Emiten dengan tingkat pengembalian ekuitas tertinggi (ROE > 20%)"
        sort_key = "roe"
        sort_reverse = True
    elif crit == "undervalued_mos":
        formula = "close > 0 and per > 0 and per < 15 and roe > 10"
        desc = "Emiten dengan valuasi atraktif (PER < 15x) dan ROE di atas 10%"
        sort_key = "roe"
        sort_reverse = True
    else:  # undervalued default
        formula = "close > 0 and per > 0 and per < 15 and roe > 15"
        desc = "Kriteria Valuasi Murah & Profitabilitas Kuat (PER < 15x & ROE > 15%)"
        sort_key = "roe"
        sort_reverse = True

    now = time.time()
    cached = SCREENER_CACHE.get(formula)
    matched_list = None

    # 1. Cek apakah ada cache yang masih segar (< 300 detik)
    if cached and (now - cached.get("timestamp", 0) < 300):
        matched_list = cached.get("data")
    else:
        try:
            r = requests.post(
                f"{INVEZGO_BASE_URL}/screener/screen",
                headers=get_auth_headers(),
                json={"formula": formula},
                timeout=10,
            )
            if r.status_code == 200:
                matched_list = r.json()
                if isinstance(matched_list, list):
                    SCREENER_CACHE[formula] = {"timestamp": now, "data": matched_list}
            elif r.status_code == 429 and cached:
                # Jika terkena batas 1 req/menit bursa, manfaatkan cache yang ada
                matched_list = cached.get("data")
        except Exception as e:
            print(f"[tool_screen_market_stocks Error] {e}")
            if cached:
                matched_list = cached.get("data")

    if matched_list and isinstance(matched_list, list):
        # Urutkan berdasarkan sort_key
        sorted_items = sorted(
            matched_list,
            key=lambda x: (
                x.get(sort_key) if x.get(sort_key) is not None
                else (float('inf') if not sort_reverse else float('-inf'))
            ),
            reverse=sort_reverse
        )[:limit_val]

        quotes_db = load_all_market_quotes_db()
        enriched = []
        for item in sorted_items:
            c = item.get("code")
            q_info = quotes_db.get(c, {}) if c else {}
            entry = {
                "code": c,
                "company_name": q_info.get("name") or c,
                "price": item.get("close") or q_info.get("close"),
            }
            if "rsi(14)" in item:
                entry["rsi_14"] = round(float(item["rsi(14)"]), 2)
            if "volume" in item:
                entry["volume_lot"] = int(float(item["volume"]) / 100)
            if "roe" in item or q_info.get("roe"):
                entry["roe"] = item.get("roe") or q_info.get("roe")
            if "per" in item or q_info.get("pe"):
                entry["per"] = item.get("per") or q_info.get("pe")
            enriched.append(entry)

        return {
            "status": "success",
            "methodology": desc,
            "formula_used": formula,
            "criteria_category": "teknikal_rsi" if "rsi" in crit else "fundamental",
            "total_matched": len(matched_list),
            "top_results": enriched,
            "explanation": (
                f"Saham-saham ini disaring dari seluruh pasar BEI menggunakan formula bursa resmi: '{formula}'. "
                f"Kategori: {desc}."
            ),
        }

    # Jika untuk kriteria RSI tidak ada data/gagal
    if "rsi" in crit:
        return {
            "status": "rate_limited",
            "message": "Pemindaian multi-emiten RSI bursa sedang dalam batas jeda sinkronisasi bursa (1 menit). Anda juga dapat memeriksa indikator teknikal saham spesifik secara langsung (contoh: get_stock_technicals untuk BBCA, BBRI, dsb)."
        }

    # Fallback ke database lokal jika kriteria fundamental
    quotes = load_all_market_quotes_db()
    valid = []
    for code, q in quotes.items():
        try:
            roe_val = float(q.get("roe") or 0)
            pe_val = float(q.get("pe") or 0)
            if roe_val > 15 and 0 < pe_val < 15:
                valid.append({
                    "code": code,
                    "company_name": q.get("name") or code,
                    "close": q.get("close"),
                    "per": pe_val,
                    "roe": roe_val,
                    "mos": q.get("mos"),
                })
        except Exception:
            pass

    sorted_local = sorted(valid, key=lambda x: x["roe"], reverse=True)[:limit_val]
    return {
        "status": "success_local",
        "methodology": "Database Lokal PintarSaham (ROE > 15% & PER < 15x)",
        "top_results": sorted_local,
        "explanation": "Disaring dari database bursa lokal PintarSaham berdasarkan efisiensi modal tinggi dan valuasi terdiskon.",
    }


def tool_get_stock_technicals(ticker: str, period: int = 14) -> dict:
    """
    Mengambil data grafik OHLCV harian dan menghitung indikator teknikal lengkap:
    - Relative Strength Index (Wilder's RSI-14)
    - Moving Average MA20 dan MA50
    - Support & Resistance mikro 20 hari
    - Klasifikasi momentum (Oversold / Bearish / Netral / Bullish / Overbought)
    """
    code = (ticker or "").upper().strip()
    if not code:
        return {"status": "error", "message": "Kode emiten wajib dicantumkan."}

    period_val = max(int(period or 14), 5)
    try:
        url = f"{INVEZGO_BASE_URL}/analysis/chart/stock/{code}"
        r = requests.get(url, headers=get_auth_headers(), timeout=10)
        if r.status_code == 200:
            candles = r.json()
            if isinstance(candles, list) and len(candles) >= period_val + 1:
                closes = [c["close"] for c in candles if c.get("close") is not None]
                if len(closes) >= period_val + 1:
                    # Hitung Wilder's RSI secara presisi
                    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
                    gains = [max(d, 0.0) for d in deltas]
                    losses = [max(-d, 0.0) for d in deltas]

                    avg_gain = sum(gains[:period_val]) / period_val
                    avg_loss = sum(losses[:period_val]) / period_val

                    for i in range(period_val, len(deltas)):
                        avg_gain = (avg_gain * (period_val - 1) + gains[i]) / period_val
                        avg_loss = (avg_loss * (period_val - 1) + losses[i]) / period_val

                    if avg_loss == 0:
                        rsi_val = 100.0
                    else:
                        rs = avg_gain / avg_loss
                        rsi_val = round(100.0 - (100.0 / (1.0 + rs)), 2)

                    current_close = closes[-1]
                    prev_close = closes[-2]
                    change_pct = round(((current_close - prev_close) / prev_close) * 100, 2)

                    # Moving Averages
                    ma20 = round(sum(closes[-20:]) / len(closes[-20:]), 2) if len(closes) >= 20 else None
                    ma50 = round(sum(closes[-50:]) / len(closes[-50:]), 2) if len(closes) >= 50 else None

                    # Support & Resistance (20 hari terakhir)
                    recent_20 = closes[-20:]
                    support_20 = min(recent_20)
                    resistance_20 = max(recent_20)

                    # Status momentum RSI 14
                    if rsi_val < 30:
                        zone = "Oversold (Jenuh Jual)"
                        summary = f"Indikator RSI {rsi_val} menunjukkan {code} berada di zona jenuh jual (oversold). Tekanan jual sudah sangat jenuh dan terbuka peluang technical rebound/pantulan jika mulai terbentuk konfirmasi pembalikan arah."
                    elif rsi_val <= 45:
                        zone = "Bearish / Konsolidasi Bawah"
                        summary = f"Indikator RSI {rsi_val} menunjukkan momentum {code} masih berada di zona bawah (bearish), perhatikan level support teknikal Rp {support_20:,}."
                    elif rsi_val <= 55:
                        zone = "Netral / Sideways"
                        summary = f"Indikator RSI {rsi_val} berada di area netral. Kekuatan beli dan jual relatif seimbang dalam fase konsolidasi."
                    elif rsi_val <= 70:
                        zone = "Bullish / Penguatan Terarah"
                        summary = f"Indikator RSI {rsi_val} mengindikasikan momentum penguatan beli (bullish) yang sehat dan aktif."
                    else:
                        zone = "Overbought (Jenuh Beli)"
                        summary = f"Indikator RSI {rsi_val} telah memasuki area jenuh beli (overbought >70). Tren kenaikan sangat kuat namun rawan mengalami aksi profit taking/koreksi jangka pendek."

                    trend_ma = "Netral"
                    if ma20 and ma50:
                        if current_close > ma20 and current_close > ma50:
                            trend_ma = "Uptrend (Harga di atas MA20 & MA50)"
                        elif current_close < ma20 and current_close < ma50:
                            trend_ma = "Downtrend (Harga di bawah MA20 & MA50)"
                        elif current_close > ma20 and current_close <= ma50:
                            trend_ma = "Rebound Awal (Menembus ke atas MA20)"

                    # Hitung Stochastic RSI (14, 14, 3, 3)
                    stoch_rsi_data = {}
                    rsi_series = []
                    avg_g = sum(gains[:period_val]) / period_val
                    avg_l = sum(losses[:period_val]) / period_val
                    rsi_series.append(100.0 if avg_l == 0 else (100.0 - (100.0 / (1.0 + (avg_g / avg_l)))))
                    for i in range(period_val, len(deltas)):
                        avg_g = (avg_g * (period_val - 1) + gains[i]) / period_val
                        avg_l = (avg_l * (period_val - 1) + losses[i]) / period_val
                        rsi_series.append(100.0 if avg_l == 0 else (100.0 - (100.0 / (1.0 + (avg_g / avg_l)))))

                    stoch_len = 14
                    if len(rsi_series) >= stoch_len + 4:
                        raw_stoch = []
                        for i in range(stoch_len - 1, len(rsi_series)):
                            win = rsi_series[i - stoch_len + 1 : i + 1]
                            min_r = min(win)
                            max_r = max(win)
                            if max_r == min_r:
                                raw_stoch.append(100.0 if rsi_series[i] >= max_r else 0.0)
                            else:
                                raw_stoch.append(((rsi_series[i] - min_r) / (max_r - min_r)) * 100.0)

                        # %K = SMA 3 dari raw_stoch
                        k_vals = [sum(raw_stoch[i - 2 : i + 1]) / 3.0 for i in range(2, len(raw_stoch))]
                        # %D = SMA 3 dari %K
                        d_vals = [sum(k_vals[i - 2 : i + 1]) / 3.0 for i in range(2, len(k_vals))]

                        if k_vals and d_vals:
                            latest_k = round(k_vals[-1], 2)
                            latest_d = round(d_vals[-1], 2)
                            prev_k = round(k_vals[-2], 2) if len(k_vals) >= 2 else latest_k
                            prev_d = round(d_vals[-2], 2) if len(d_vals) >= 2 else latest_d

                            stoch_signal = "Netral"
                            if latest_k < 20 and latest_d < 20:
                                if prev_k <= prev_d and latest_k > latest_d:
                                    stoch_signal = "Golden Cross di Area Oversold (Sinyal Beli Cepat)"
                                else:
                                    stoch_signal = "Oversold Jenuh Jual (<20)"
                            elif latest_k > 80 and latest_d > 80:
                                if prev_k >= prev_d and latest_k < latest_d:
                                    stoch_signal = "Dead Cross di Area Overbought (Sinyal Ambil Untung / Waspada Koreksi)"
                                else:
                                    stoch_signal = "Overbought Jenuh Beli (>80)"
                            elif prev_k <= prev_d and latest_k > latest_d:
                                stoch_signal = "Bullish Crossover (%K memotong %D ke atas)"
                            elif prev_k >= prev_d and latest_k < latest_d:
                                stoch_signal = "Bearish Crossover (%K memotong %D ke bawah)"

                            stoch_rsi_data = {
                                "stoch_k": latest_k,
                                "stoch_d": latest_d,
                                "stoch_signal": stoch_signal,
                                "stoch_interpretation": f"Stochastic RSI berada di level %K: {latest_k} | %D: {latest_d} ({stoch_signal})."
                            }

                    return {
                        "status": "success",
                        "ticker": code,
                        "latest_close": current_close,
                        "change_pct": f"{change_pct:+.2f}%",
                        "rsi_period": period_val,
                        "rsi_value": rsi_val,
                        "zone": zone,
                        "stochastic_rsi": stoch_rsi_data,
                        "trend_ma": trend_ma,
                        "ma20": ma20,
                        "ma50": ma50,
                        "support_20d": support_20,
                        "resistance_20d": resistance_20,
                        "technical_summary": summary,
                    }
    except Exception as e:
        print(f"[tool_get_stock_technicals Error] {e}")

    return {
        "status": "error",
        "message": f"Data historis grafik/indikator teknikal untuk {code} saat ini belum dapat diakses."
    }


def _format_rupiah(val: float) -> str:
    abs_val = abs(val)
    sign = "-" if val < 0 else ""
    if abs_val >= 1e12:
        return f"{sign}Rp {abs_val / 1e12:.2f} Triliun"
    elif abs_val >= 1e9:
        return f"{sign}Rp {abs_val / 1e9:.2f} Miliar"
    elif abs_val >= 1e6:
        return f"{sign}Rp {abs_val / 1e6:.2f} Juta"
    else:
        return f"{sign}Rp {abs_val:,.0f}".replace(",", ".")

_cached_market_date = {"date": None, "ts": 0}

def get_latest_active_trading_date() -> str:
    now_ts = time.time()
    if _cached_market_date["date"] and (now_ts - _cached_market_date["ts"] < 900):
        return _cached_market_date["date"]

    now = datetime.now()
    for d in range(10):
        dt_str = (now - timedelta(days=d)).strftime('%Y-%m-%d')
        try:
            r = requests.get(f"{INVEZGO_BASE_URL}/analysis/top/foreign?date={dt_str}", headers=get_auth_headers(), timeout=3)
            if r.status_code == 200 and r.json().get('accum'):
                _cached_market_date["date"] = dt_str
                _cached_market_date["ts"] = now_ts
                return dt_str
        except Exception:
            pass
    fallback_dt = now.strftime('%Y-%m-%d')
    _cached_market_date["date"] = fallback_dt
    _cached_market_date["ts"] = now_ts
    return fallback_dt


def tool_get_broker_summary(ticker: str, days: int = 1) -> dict:
    code = (ticker or "").upper().strip()
    if not code:
        return {"status": "error", "message": "Kode saham wajib diisi."}

    dt = get_latest_active_trading_date()
    try:
        url = f"{INVEZGO_BASE_URL}/analysis/summary/stock/{code}?from={dt}&to={dt}&investor=all&market=RG"
        r = requests.get(url, headers=get_auth_headers(), timeout=7)
        if r.status_code == 200:
            items = r.json()
            if isinstance(items, list) and len(items) > 0:
                buyers = sorted(
                    [x for x in items if float(x.get("net_value") or 0) > 0],
                    key=lambda x: float(x.get("net_value") or 0),
                    reverse=True
                )
                sellers = sorted(
                    [x for x in items if float(x.get("net_value") or 0) < 0],
                    key=lambda x: float(x.get("net_value") or 0)
                )

                top_buyers = []
                for b in buyers[:5]:
                    net_val = float(b.get("net_value") or 0)
                    top_buyers.append({
                        "broker_code": b.get("code"),
                        "broker_name": b.get("name"),
                        "net_buy_value": _format_rupiah(net_val),
                        "net_volume_lot": int(float(b.get("net_volume") or 0) / 100),
                        "buy_avg_price": round(float(b.get("buy_avg") or 0), 1) if b.get("buy_avg") else None
                    })

                top_sellers = []
                for s in sellers[:5]:
                    net_val = float(s.get("net_value") or 0)
                    top_sellers.append({
                        "broker_code": s.get("code"),
                        "broker_name": s.get("name"),
                        "net_sell_value": _format_rupiah(net_val),
                        "net_volume_lot": int(float(s.get("net_volume") or 0) / 100),
                        "sell_avg_price": round(float(s.get("sell_avg") or 0), 1) if s.get("sell_avg") else None
                    })

                top3_buy = sum(float(x.get("net_value") or 0) for x in buyers[:3])
                top3_sell = abs(sum(float(x.get("net_value") or 0) for x in sellers[:3]))

                if top3_buy > 1.5 * top3_sell:
                    status_bandar = "Big Accumulation (Akumulasi Kuat oleh Broker Penggerak)"
                elif top3_buy > 1.15 * top3_sell:
                    status_bandar = "Normal Accumulation (Akumulasi Ringan/Moderat)"
                elif top3_sell > 1.5 * top3_buy:
                    status_bandar = "Big Distribution (Distribusi Kuat / Tekanan Jual Broker Utama)"
                elif top3_sell > 1.15 * top3_buy:
                    status_bandar = "Normal Distribution (Distribusi Ringan/Moderat)"
                else:
                    status_bandar = "Neutral (Arus Beli dan Jual Berimbang)"

                return {
                    "status": "success",
                    "ticker": code,
                    "date": dt,
                    "bandarmology_status": status_bandar,
                    "top_3_buyer_net_value": _format_rupiah(top3_buy),
                    "top_3_seller_net_value": _format_rupiah(top3_sell),
                    "top_buyers": top_buyers,
                    "top_sellers": top_sellers,
                    "total_brokers_active": len(items)
                }
    except Exception as e:
        print(f"[tool_get_broker_summary Error] {e}")

    return {
        "status": "not_available",
        "ticker": code,
        "message": f"Data broker summary untuk {code} pada tanggal {dt} belum tersedia di sistem."
    }


def tool_get_market_top_flow(category: str = "foreign") -> dict:
    cat = (category or "foreign").lower().strip()
    dt = get_latest_active_trading_date()

    ep_map = {
        "foreign": "foreign",
        "accumulation": "accumulation",
        "ritel": "ritel",
        "retail": "ritel",
        "movers": "change",
        "change": "change"
    }
    ep = ep_map.get(cat, "foreign")

    try:
        url = f"{INVEZGO_BASE_URL}/analysis/top/{ep}?date={dt}"
        r = requests.get(url, headers=get_auth_headers(), timeout=8)
        if r.status_code == 200:
            data = r.json()
            quotes_db = load_all_market_quotes_db()

            if ep == "change":
                gainers = (data.get("gain") or [])[:5]
                losers = (data.get("loss") or [])[:5]

                # Update SQLite DB
                for item in gainers + losers:
                    c = item.get("code")
                    if c and c in quotes_db and item.get("price") is not None:
                        quotes_db[c]["close"] = item["price"]
                        quotes_db[c]["changePct"] = item.get("change")
                        save_single_market_quote_db(c, quotes_db[c])

                return {
                    "status": "success",
                    "category": "Top Market Gainers & Losers",
                    "date": dt,
                    "top_gainers": [{
                        "ticker": g.get("code"),
                        "name": g.get("name"),
                        "price": g.get("price"),
                        "change_pct": f"{g.get('change'):+.2f}%",
                        "turnover": _format_rupiah(float(g.get("value") or 0))
                    } for g in gainers],
                    "top_losers": [{
                        "ticker": l.get("code"),
                        "name": l.get("name"),
                        "price": l.get("price"),
                        "change_pct": f"{l.get('change'):+.2f}%",
                        "turnover": _format_rupiah(float(l.get("value") or 0))
                    } for l in losers]
                }
            else:
                acc_list = (data.get("accum") or [])[:5]
                dist_list = (data.get("dist") or [])[:5]

                label_accum = {
                    "foreign": "Top Net Foreign Buy (Akumulasi Investor Asing)",
                    "accumulation": "Top Bandarmology Accumulation",
                    "ritel": "Top Net Retail Buy (Akumulasi Investor Ritel)"
                }.get(ep, "Top Accumulation")

                label_dist = {
                    "foreign": "Top Net Foreign Sell (Distribusi Investor Asing)",
                    "accumulation": "Top Bandarmology Distribution",
                    "ritel": "Top Net Retail Sell (Distribusi Investor Ritel)"
                }.get(ep, "Top Distribution")

                # Sync ke DB
                for item in acc_list + dist_list:
                    c = item.get("code")
                    if c and c in quotes_db and item.get("price") is not None:
                        quotes_db[c]["close"] = item["price"]
                        save_single_market_quote_db(c, quotes_db[c])

                return {
                    "status": "success",
                    "category": f"Market Flow - {ep.capitalize()}",
                    "date": dt,
                    "label_accum": label_accum,
                    "top_accumulation": [{
                        "ticker": a.get("code"),
                        "name": a.get("name"),
                        "price": a.get("price"),
                        "flow_value": _format_rupiah(float(a.get("value") or 0)),
                        "volume_lot": int(float(a.get("volume") or 0) / 100)
                    } for a in acc_list],
                    "label_dist": label_dist,
                    "top_distribution": [{
                        "ticker": d.get("code"),
                        "name": d.get("name"),
                        "price": d.get("price"),
                        "flow_value": _format_rupiah(float(d.get("value") or 0)),
                        "volume_lot": int(float(d.get("volume") or 0) / 100)
                    } for d in dist_list]
                }
    except Exception as e:
        print(f"[tool_get_market_top_flow Error] {e}")

    return {
        "status": "error",
        "message": f"Data market flow kategori '{category}' pada tanggal {dt} sedang tidak dapat diakses."
    }


def tool_get_order_book(ticker: str) -> dict:
    code = (ticker or "").upper().strip()
    if not code:
        return {"status": "error", "message": "Kode saham wajib diisi."}

    try:
        url = f"{INVEZGO_BASE_URL}/analysis/order-book/{code}?market=RG"
        r = requests.get(url, headers=get_auth_headers(), timeout=6)
        if r.status_code == 200:
            data = r.json()
            bids = []
            offers = []

            for idx, b in enumerate(data.get("bid", [])[:5], start=1):
                p = b.get(f"bid{idx}price")
                lot = b.get(f"bid{idx}lot")
                freq = b.get(f"bid{idx}freq")
                if p is not None:
                    bids.append({"level": idx, "price": p, "lot": lot, "queue_orders": freq})

            for idx, o in enumerate(data.get("offer", [])[:5], start=1):
                p = o.get(f"offer{idx}price")
                lot = o.get(f"offer{idx}lot")
                freq = o.get(f"offer{idx}freq")
                if p is not None:
                    offers.append({"level": idx, "price": p, "lot": lot, "queue_orders": freq})

            tot_bid_lot = sum(x["lot"] for x in bids if x.get("lot"))
            tot_offer_lot = sum(x["lot"] for x in offers if x.get("lot"))
            ratio_str = f"{(tot_bid_lot / tot_offer_lot):.2f}x" if tot_offer_lot > 0 else "—"

            if tot_bid_lot > 1.5 * tot_offer_lot:
                book_analysis = "Dinding Bid Sangat Tebal (Tekanan beli menahan harga, potensi support kuat)"
            elif tot_offer_lot > 1.5 * tot_bid_lot:
                book_analysis = "Dinding Offer Sangat Tebal (Tekanan antrean jual tinggi, resistensi kuat di atas)"
            else:
                book_analysis = "Antrean Beli & Jual Berimbang"

            return {
                "status": "success",
                "ticker": code,
                "order_book_depth": {
                    "top_5_bids": bids,
                    "top_5_offers": offers,
                    "total_bid_lot_top5": tot_bid_lot,
                    "total_offer_lot_top5": tot_offer_lot,
                    "bid_to_offer_ratio": ratio_str,
                    "order_book_pressure": book_analysis
                }
            }
    except Exception as e:
        print(f"[tool_get_order_book Error] {e}")

    return {"status": "error", "message": f"Order book {code} belum dapat diakses saat ini."}


def tool_get_insider_transactions(ticker: str = "") -> dict:
    code = (ticker or "").upper().strip()
    try:
        url = f"{INVEZGO_BASE_URL}/analysis/shareholder-insider?limit=10"
        if code:
            url += f"&code={code}"
        r = requests.get(url, headers=get_auth_headers(), timeout=6)
        if r.status_code == 200:
            res = r.json()
            rows = res.get("data") or []
            clean_rows = []
            for item in rows[:10]:
                clean_rows.append({
                    "ticker": item.get("code"),
                    "insider_name": item.get("name"),
                    "position_relationship": item.get("relation"),
                    "action": item.get("action"),
                    "shares_transacted": f"{item.get('shares'):,}" if item.get("shares") else "—",
                    "price_per_share": f"Rp {item.get('price'):,}" if item.get("price") else "—",
                    "date": (item.get("date") or "")[:10],
                    "post_transaction_pct": f"{item.get('pct_after')}%" if item.get("pct_after") else None
                })
            return {
                "status": "success",
                "ticker": code or "Pasar BEI Keseluruhan",
                "total_records": len(clean_rows),
                "insider_transactions": clean_rows
            }
    except Exception as e:
        print(f"[tool_get_insider_transactions Error] {e}")

    return {"status": "not_found", "message": "Belum ada catatan transaksi orang dalam (insider trading) terkini."}


def tool_get_special_notations_and_disclosures(ticker: str = "") -> dict:
    code = (ticker or "").upper().strip()
    result = {"status": "success", "ticker": code or "Pasar BEI"}

    # 1. Cek Notasi Khusus
    try:
        r_not = requests.get(f"{INVEZGO_BASE_URL}/analysis/notation", headers=get_auth_headers(), timeout=5)
        if r_not.status_code == 200:
            not_list = r_not.json()
            if isinstance(not_list, list):
                if code:
                    match = next((x for x in not_list if x.get("code") == code), None)
                    if match:
                        result["special_notations"] = match.get("list") or []
                        result["has_special_notation"] = True
                    else:
                        result["special_notations"] = []
                        result["has_special_notation"] = False
                else:
                    result["total_stocks_with_notation"] = len(not_list)
                    result["noted_tickers_sample"] = [x.get("code") for x in not_list[:20]]
    except Exception as e:
        print(f"[Notations Error] {e}")

    # 2. Cek Keterbukaan Informasi jika ada ticker
    if code:
        try:
            r_disc = requests.get(f"{INVEZGO_BASE_URL}/analysis/disclosure?code={code}&limit=5", headers=get_auth_headers(), timeout=5)
            if r_disc.status_code == 200:
                disc_data = r_disc.json().get("data") or []
                result["recent_disclosures"] = [{
                    "date": (d.get("date") or "")[:10],
                    "title": d.get("title") or d.get("subject"),
                    "category": d.get("category")
                } for d in disc_data[:5]]
        except Exception as e:
            print(f"[Disclosures Error] {e}")

    return result


def tool_get_key_statistics(ticker: str) -> dict:
    code = (ticker or "").upper().strip()
    if not code:
        return {"status": "error", "message": "Kode saham wajib diisi."}

    try:
        url = f"{INVEZGO_BASE_URL}/analysis/keystat/{code}?type=Q&limit=2"
        r = requests.get(url, headers=get_auth_headers(), timeout=7)
        if r.status_code == 200:
            js = r.json()
            rows = js.get("rows") or []
            metrics = {}
            period_col = "Kuartal Terbaru"
            for row in rows:
                name = row.get("name")
                vals = row.get("values") or []
                if vals:
                    latest = vals[0]
                    period_col = latest.get("col", period_col)
                    amt = latest.get("amount")
                    if amt is not None:
                        metrics[name] = amt

            return {
                "status": "success",
                "ticker": code,
                "period": period_col,
                "total_metrics_available": len(metrics),
                "key_statistics": metrics
            }
    except Exception as e:
        print(f"[tool_get_key_statistics Error] {e}")

    return {"status": "error", "message": f"Data statistik rasio keuangan {code} belum dapat diakses."}


def tool_get_corporate_events(ticker: str = "") -> dict:
    events = get_corporate_events_db()
    code = (ticker or "").upper().strip()
    if code:
        filtered = [e for e in events if e.get("ticker", "").upper() == code]
        return {
            "status": "success",
            "ticker": code,
            "total_events": len(filtered),
            "events": filtered[:10]
        }
    return {
        "status": "success",
        "scope": "Pasar Modal BEI",
        "total_events": len(events),
        "events": events[:15]
    }


DISPATCHER = {
    "get_stock_quote": lambda args: tool_get_stock_quote(args.get("ticker", "")),
    "get_broker_summary": lambda args: tool_get_broker_summary(args.get("ticker", ""), args.get("days", 1)),
    "get_market_top_flow": lambda args: tool_get_market_top_flow(args.get("category", "foreign")),
    "get_order_book": lambda args: tool_get_order_book(args.get("ticker", "")),
    "get_market_ihsg": lambda args: tool_get_market_ihsg(),
    "get_company_financials": lambda args: tool_get_company_financials(args.get("ticker", "")),
    "get_key_statistics": lambda args: tool_get_key_statistics(args.get("ticker", "")),
    "get_shareholders_and_insiders": lambda args: tool_get_shareholders_and_insiders(args.get("ticker", "")),
    "get_insider_transactions": lambda args: tool_get_insider_transactions(args.get("ticker", "")),
    "get_special_notations_and_disclosures": lambda args: tool_get_special_notations_and_disclosures(args.get("ticker", "")),
    "get_corporate_events": lambda args: tool_get_corporate_events(args.get("ticker", "")),
    "get_stock_technicals": lambda args: tool_get_stock_technicals(args.get("ticker", ""), args.get("period", 14)),
    "screen_market_stocks": lambda args: tool_screen_market_stocks(args.get("criteria", "undervalued"), args.get("limit", 5)),
}



# ==========================================
# CHAT AGENT EXECUTION LOOP
# ==========================================

def run_chatbot_conversation(messages: list) -> dict:
    """
    Menjalankan siklus chat multi-turn dengan tool calling Google Gemini (dengan auto-fallback model).
    Format messages: [{"role": "user"|"model", "text": "..."}]
    """
    if not GEMINI_API_KEY:
        return {
            "reply": "Konfigurasi GEMINI_API belum terpasang di sistem PintarSaham.",
            "tool_calls": []
        }

    # Format history ke standard Gemini API contents
    contents = []
    for m in messages:
        role = "user" if m.get("role") == "user" else "model"
        text = m.get("text") or m.get("content") or ""
        if text:
            contents.append({
                "role": role,
                "parts": [{"text": text}]
            })

    if not contents:
        return {"reply": "Silakan ajukan pertanyaan seputar data pasar modal BEI.", "tool_calls": []}

    payload = {
        "contents": contents,
        "tools": [{"functionDeclarations": TOOL_DEFINITIONS}],
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1000
        }
    }

    executed_tools = []

    # Coba model-model yang tersedia secara fallback
    for model_name in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        model_payload = json.loads(json.dumps(payload))  # deep copy payload untuk model ini
        success = False

        # Iterasi Function Calling (Maksimal 3 putaran jika model memanggil tool berantai)
        for _ in range(3):
            try:
                resp = requests.post(url, json=model_payload, timeout=20)
                if resp.status_code != 200:
                    print(f"[chatbot_agent {model_name} Error] Status {resp.status_code}: {resp.text[:150]}")
                    break  # Coba model berikutnya jika 429 atau error

                js = resp.json()
                candidate = js.get("candidates", [{}])[0]
                content = candidate.get("content", {})
                parts = content.get("parts", [])

                # Cek apakah ada function call
                function_calls = [p["functionCall"] for p in parts if "functionCall" in p]

                if not function_calls:
                    # Ambil teks jawaban final
                    texts = [p.get("text", "") for p in parts if "text" in p and not p.get("thought")]
                    final_reply = "\n".join(texts).strip()
                    if not final_reply:
                        final_reply = "Informasi telah diproses namun tidak ada teks output yang dihasilkan."
                    return {
                        "reply": final_reply,
                        "tool_calls": executed_tools
                    }

                # Eksekusi tool call
                model_payload["contents"].append({
                    "role": "model",
                    "parts": parts
                })

                tool_response_parts = []
                for fc in function_calls:
                    fname = fc.get("name")
                    fargs = fc.get("args") or {}
                    executed_tools.append({"name": fname, "args": fargs})

                    dispatcher_func = DISPATCHER.get(fname)
                    if dispatcher_func:
                        try:
                            result = dispatcher_func(fargs)
                        except Exception as e_dispatch:
                            result = {"status": "error", "error": str(e_dispatch)}
                    else:
                        result = {"status": "error", "error": f"Tool '{fname}' tidak terdaftar"}

                    func_resp = {
                        "name": fname,
                        "response": result
                    }
                    if "id" in fc:
                        func_resp["id"] = fc["id"]

                    tool_response_parts.append({
                        "functionResponse": func_resp
                    })

                model_payload["contents"].append({
                    "role": "user",
                    "parts": tool_response_parts
                })
                success = True

            except Exception as e:
                print(f"[chatbot_agent {model_name} Exception] {e}")
                break

        if success:
            # Jika putaran loop selesai dan ada tool response terakhir yang belum diambil teks akhirnya
            try:
                resp_final = requests.post(url, json=model_payload, timeout=20)
                if resp_final.status_code == 200:
                    candidate = resp_final.json().get("candidates", [{}])[0]
                    parts = candidate.get("content", {}).get("parts", [])
                    texts = [p.get("text", "") for p in parts if "text" in p and not p.get("thought")]
                    final_reply = "\n".join(texts).strip()
                    if final_reply:
                        return {
                            "reply": final_reply,
                            "tool_calls": executed_tools
                        }
            except Exception as e_final:
                print(f"[chatbot_agent {model_name} final text error] {e_final}")

    return {
        "reply": "Maaf, sistem AI sedang mengalami kepadatan antrian pemrosesan. Silakan coba beberapa saat lagi.",
        "tool_calls": executed_tools
    }


# ==========================================
# ESTIMATION & APPROVAL LOGIC
# ==========================================

def analyze_chat_intent_and_estimate(user_text: str) -> dict:
    """
    Menganalisis pesan pengguna secara cerdas menggunakan Google Gemini (AI Planner)
    untuk menentukan kebutuhan penarikan data, menyusun rancangan eksekusi tools,
    dan mengestimasi kuota data pasar yang dibutuhkan sebelum persetujuan (approval) pengguna.
    """
    text_lower = user_text.lower().strip()

    # 1. Sapaan murni atau pesan sangat pendek tidak butuh penarikan data pasar
    pure_greetings = [
        "halo", "hai", "hi", "selamat pagi", "selamat siang", "selamat sore", "selamat malam",
        "terima kasih", "makasih", "thanks", "siapa kamu", "bisa apa saja", "bantuan", "tes", "test"
    ]
    if text_lower in pure_greetings or len(text_lower) < 3:
        return {
            "needs_approval": False,
            "action_type": "greeting",
            "estimated_quota": 0
        }

    # 2. Panggil AI Planner (Gemini) untuk menganalisis kebutuhan tools dan menyusun rancangan secara dinamis
    tools_summary = "\n".join([f"- {t['name']}: {t['description']}" for t in TOOL_DEFINITIONS])

    planner_prompt = f"""Kamu adalah Asisten Perencana (AI Planner) PintarSaham untuk Bursa Efek Indonesia (BEI).
Tugasmu: Menganalisis pesan pengguna dan menyusun rencana pengambilan data serta estimasi kuota data pasar secara CERDAS, DINAMIS, dan TEPAT SASARAN (tanpa template kaku).

DAFTAR TOOLS DATA PASAR:
{tools_summary}

PESAN PENGGUNA:
"{user_text}"

INSTRUKSI:
1. Jika pertanyaan di luar pasar modal BEI (misal politik umum, cuaca, hiburan), set "needs_approval": false.
2. Jika pertanyaan memerlukan data bursa/emiten/indikator pasar:
   - "needs_approval": true
   - "action_type": kategori aksi dinamis (misal: "market_analysis", "stock_analysis", "screening", "bandarmologi", dll)
   - "title": Judul singkat, padat, dan sangat spesifik mencerminkan apa yang diminta pengguna (misal: 'Analisis Saham Terkoreksi dengan Akumulasi Pasar', 'Komparasi Kinerja BBCA vs BBRI', 'Pemeriksaan Laporan Keuangan ASII', dsb). JANGAN gunakan nama vendor pihak ketiga.
   - "description": 1-2 kalimat ringkas menjelaskan data pasar resmi yang akan ditarik oleh sistem PintarSaham.
   - "methodology": Metode atau tool yang akan dijalankan secara teknis (misal sebutkan kombinasi tools get_market_top_flow 'movers' & 'accumulation', formula skrining, atau broker net flow).
   - "estimated_quota": Estimasi jumlah kuota (1 untuk penarikan data/batch/screening, atau sejumlah emiten jika komparasi multi-emiten).
   - "quota_label": Teks informasi kuota yang ramah pengguna, contoh: 'Pesan ini akan menggunakan 1 Kuota Data Pasar Bursa' (atau 'Kuota Data Emiten').
   - "continue_label": Teks tombol persetujuan yang spesifik dan kontekstual (misal: 'Lanjutkan Analisis Saham Terakumulasi', 'Lanjutkan Analisis BBCA', 'Lanjutkan Skrining Saham').
   - "cancel_label": 'Batal'
   - "execution_plan": Petunjuk teknis 1-2 kalimat untuk eksekusi tools agar AI pemroses mengeksekusi seluruh kebutuhan pengguna secara tepat sasaran tanpa ada parameter atau kriteria yang terlewat.

KEMBALIKAN HANYA FORMAT JSON MURNI:
{{
  "needs_approval": true,
  "action_type": "market_analysis",
  "title": "...",
  "description": "...",
  "methodology": "...",
  "estimated_quota": 1,
  "quota_label": "Pesan ini akan menggunakan 1 Kuota Data Pasar Bursa",
  "continue_label": "Lanjutkan ...",
  "cancel_label": "Batal",
  "execution_plan": "..."
}}
"""

    if GEMINI_API_KEY:
        for model in GEMINI_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                resp = requests.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": planner_prompt}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 600}
                    },
                    timeout=6
                )
                if resp.status_code == 200:
                    js = resp.json()
                    candidates = js.get("candidates") or []
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts") or []
                        if parts and "text" in parts[0]:
                            txt = parts[0]["text"].strip()
                            txt = re.sub(r'^```json\s*', '', txt)
                            txt = re.sub(r'^```\s*', '', txt)
                            txt = re.sub(r'\s*```$', '', txt).strip()
                            plan = json.loads(txt)
                            if isinstance(plan, dict) and "needs_approval" in plan:
                                return plan
            except Exception as e:
                print(f"[AI Planner Error {model}] {e}")
                continue

    # Fallback dinamis jika Gemini tidak merespon dalam waktu timeout:
    return {
        "needs_approval": True,
        "action_type": "general_market",
        "title": "Rencana Analisis Data Pasar Modal BEI",
        "description": "Sistem PintarSaham akan memproses permintaan Anda dengan memindai basis data pasar modal Bursa Efek Indonesia.",
        "methodology": "Penarikan data pasar modal bursa resmi dan kalkulasi analitis terkait",
        "estimated_quota": 1,
        "quota_label": "Pesan ini akan menggunakan 1 Kuota Data Pasar Bursa",
        "continue_label": "Lanjutkan Analisis",
        "cancel_label": "Batal",
        "execution_plan": "Panggil tools data bursa yang relevan untuk menjawab permintaan pengguna secara komprehensif."
    }

