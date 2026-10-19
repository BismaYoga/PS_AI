"""
invezgo_client.py — Modul Klien Resmi Invezgo API untuk PintarSaham
Menangani penarikan data harga saham real-time, candlestick histori, data fundamental (EPS, BVPS, PER, PBV, ROE),
serta katalog lengkap seluruh emiten Bursa Efek Indonesia (BEI / IDX).
"""

import os
import requests
import json
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
LOCAL_ENV = os.path.join(BACKEND_DIR, '.env')
PARENT_ENV = os.path.join(BASE_DIR, '.env')

for p_env in (PARENT_ENV, LOCAL_ENV):
    if os.path.exists(p_env):
        load_dotenv(p_env)

INVEZGO_BASE_URL = "https://api.invezgo.com"

# Target PER Rule-based per Ticker & Sektor untuk valuasi MOS
TICKER_TARGET_PE = {
    'BBCA': 15.0, 'BBRI': 12.0, 'BMRI': 12.0, 'BBNI': 12.0, 'BBTN': 9.0, 'BTPS': 10.0, 'PNLF': 8.0,
    'ICBP': 15.0, 'INDF': 12.0, 'MYOR': 15.0, 'UNVR': 18.0, 'AMRT': 18.0, 'CMRY': 18.0, 'CPIN': 14.0, 'JPFA': 12.0, 'SIDO': 15.0,
    'TLKM': 14.0, 'ISAT': 14.0, 'MTEL': 16.0, 'TOWR': 14.0, 'JSMR': 10.0, 'POWR': 10.0,
    'ASII': 9.0, 'UNTR': 8.5,
    'MIKA': 25.0, 'HEAL': 24.0, 'KLBF': 20.0,
    'ADRO': 7.0, 'PTBA': 7.0, 'ITMG': 7.0, 'AADI': 6.5, 'ADMR': 8.0, 'AKRA': 11.0, 'MEDC': 7.5, 'PGAS': 8.0, 'PGEO': 12.0,
    'ANTM': 12.0, 'INCO': 13.0, 'AMMN': 18.0, 'BRPT': 14.0, 'INKP': 7.0, 'INTP': 13.0,
    'ACES': 13.0, 'MAPI': 12.0, 'MAPA': 13.0, 'ERAA': 10.0,
    'BSDE': 8.5, 'CTRA': 8.5, 'PWON': 8.5, 'SMRA': 8.5, 'KIJA': 8.0,
    'GOTO': 25.0, 'BUKA': 18.0, 'EMTK': 16.0, 'WIFI': 14.0
}

SECTOR_TARGET_PE = {
    'Keuangan': 11.5,
    'Barang Konsumen Primer': 15.0,
    'Konsumer Non-Siklikal': 15.0,
    'Barang Konsumen Non-Primer': 12.5,
    'Konsumer Siklikal': 12.5,
    'Kesehatan': 22.0,
    'Infrastruktur': 13.5,
    'Teknologi': 18.0,
    'Energi': 7.5,
    'Bahan Baku': 12.0,
    'Perindustrian': 9.0,
    'Properti & Real Estat': 8.5,
    'Transportasi & Logistik': 10.0,
    'Utilitas': 10.0
}

def get_target_pe(ticker: str, sector: str = None) -> float:
    ticker_clean = ticker.upper().strip()
    if ticker_clean in TICKER_TARGET_PE:
        return TICKER_TARGET_PE[ticker_clean]
    if sector and sector in SECTOR_TARGET_PE:
        return SECTOR_TARGET_PE[sector]
    return 12.0

def get_invezgo_api_key() -> str:
    k = os.getenv("INVESGO_API") or os.getenv("INVEZGO_API") or ""
    return k.strip().strip('"').strip("'")

def get_auth_headers() -> dict:
    key = get_invezgo_api_key()
    if not key:
        raise ValueError("INVESGO_API key tidak ditemukan di .env")
    return {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json"
    }

def fetch_all_stocks_list() -> list:
    """Mengambil daftar lengkap seluruh emiten tercatat di BEI dari Invezgo."""
    url = f"{INVEZGO_BASE_URL}/analysis/list/stock"
    res = requests.get(url, headers=get_auth_headers(), timeout=15)
    if res.status_code != 200:
        raise Exception(f"Gagal mengambil daftar saham dari Invezgo: {res.status_code} {res.text[:200]}")
    return res.json()

def fetch_ihsg_invezgo(days: int = 365) -> dict:
    """Mengambil data candlestick harian IHSG (COMPOSITE) 1 tahun ke belakang."""
    today = datetime.now()
    from_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    to_date = today.strftime("%Y-%m-%d")
    
    url = f"{INVEZGO_BASE_URL}/analysis/chart/index/COMPOSITE?from={from_date}&to={to_date}"
    res = requests.get(url, headers=get_auth_headers(), timeout=15)
    if res.status_code != 200:
        raise Exception(f"Gagal mengambil chart IHSG: {res.status_code} {res.text[:200]}")
    
    bars = res.json()
    if not bars or len(bars) < 2:
        raise Exception("Data bar IHSG tidak mencukupi")
    
    ohlc = []
    for b in bars:
        d_str = b['date'][:10]
        ohlc.append({
            'date': d_str,
            'open': round(float(b['open']), 2),
            'high': round(float(b['high']), 2),
            'low': round(float(b['low']), 2),
            'close': round(float(b['close']), 2),
            'volume': int(b.get('volume', 0))
        })
    
    last = ohlc[-1]
    prev = ohlc[-2]
    chg = last['close'] - prev['close']
    pct = (chg / prev['close']) * 100 if prev['close'] else 0
    
    last_dt = datetime.strptime(last['date'], "%Y-%m-%d")
    date_formatted = last_dt.strftime("%d %b %Y")
    
    vol_last = last['volume']
    vol_str = f"{vol_last / 1e9:.1f} miliar" if vol_last >= 1e9 else f"{vol_last / 1e6:.1f} juta" if vol_last >= 1e6 else f"{vol_last:,}"
    turnover_est = f"Rp{vol_last * last['close'] / 1e12:.2f} T" if (vol_last * last['close']) >= 1e12 else f"Rp{vol_last * last['close'] / 1e9:.2f} M"
    gainers_val = 285
    losers_val = 264

    try:
        r_idx = requests.get(f"{INVEZGO_BASE_URL}/analysis/intraday-index/COMPOSITE", headers=get_auth_headers(), timeout=8)
        if r_idx.status_code == 200:
            idx_meta = r_idx.json()
            if isinstance(idx_meta, dict):
                if idx_meta.get("positive") is not None:
                    gainers_val = int(idx_meta["positive"])
                if idx_meta.get("negative") is not None:
                    losers_val = int(idx_meta["negative"])
                val_tot = float(idx_meta.get("value") or 0)
                if val_tot > 0:
                    turnover_est = f"Rp{val_tot / 1e12:.2f} T" if val_tot >= 1e12 else f"Rp{val_tot / 1e9:.2f} M"
    except Exception:
        pass

    return {
        'ticker': 'IHSG',
        'name': 'Indeks Harga Saham Gabungan',
        'price': last['close'],
        'previousClose': prev['close'],
        'change': round(chg, 2),
        'changePct': round(pct, 2),
        'date': date_formatted,
        'rawDate': last['date'],
        'volume': vol_str,
        'turnover': turnover_est,
        'gainers': gainers_val,
        'losers': losers_val,
        'totalBars': len(ohlc),
        'source': 'Invezgo (BEI COMPOSITE)',
        'isStock': False,
        'ohlc': ohlc
    }

def fetch_intraday_invezgo(ticker: str) -> list:
    """
    Mengambil chart intraday (1D / menit demi menit sesi perdagangan terakhir) dalam 1 kali request dari Invezgo API.
    - IHSG: GET /analysis/intraday/COMPOSITE?market=RG
    - Saham: GET /analysis/intraday/{code}?market=RG
    """
    clean_sym = ticker.upper().strip()
    target_code = "COMPOSITE" if clean_sym == "IHSG" else clean_sym
    is_ihsg = clean_sym == "IHSG"

    url = f"{INVEZGO_BASE_URL}/analysis/intraday/{target_code}?market=RG"
    res = requests.get(url, headers=get_auth_headers(), timeout=12)
    if res.status_code != 200:
        raise Exception(f"Gagal mengambil intraday {clean_sym} dari Invezgo: {res.status_code}")

    bars = res.json()
    if not isinstance(bars, list) or len(bars) < 2:
        raise Exception(f"Data intraday {clean_sym} kosong atau belum tersedia")

    intraday_ohlc = []
    for b in bars:
        raw_dt = str(b.get("date") or "")
        # Simpan format YYYY-MM-DDTHH:MM (waktu WIB dari Invezgo)
        dt_str = raw_dt[:16] if len(raw_dt) >= 16 else raw_dt
        intraday_ohlc.append({
            "date": dt_str,
            "open": round(float(b.get("open") or 0), 2 if is_ihsg else 0),
            "high": round(float(b.get("high") or 0), 2 if is_ihsg else 0),
            "low": round(float(b.get("low") or 0), 2 if is_ihsg else 0),
            "close": round(float(b.get("close") or 0), 2 if is_ihsg else 0),
            "volume": int(float(b.get("volume") or 0))
        })
    return intraday_ohlc

def fetch_stock_invezgo(ticker: str, days: int = 365, emiten_info: dict = None, existing_data: dict = None) -> dict:
    """
    Mengambil data candlestick harian emiten saham dari Invezgo.
    Hemat Request: Jika existing_data dari Screener sudah memiliki rasio fundamental (eps/pb/mos),
    cukup lakukan 1 kali request ke /analysis/chart/stock/{code} tanpa memanggil /keystat & /shareholder-detail lagi.
    """
    clean_sym = ticker.upper().strip()
    today = datetime.now()
    from_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    to_date = today.strftime("%Y-%m-%d")
    headers = get_auth_headers()
    
    # 1. Fetch Chart OHLC (HANYA 1 REQUEST UTAMA)
    url_chart = f"{INVEZGO_BASE_URL}/analysis/chart/stock/{clean_sym}?from={from_date}&to={to_date}"
    res_chart = requests.get(url_chart, headers=headers, timeout=15)
    if res_chart.status_code != 200:
        raise Exception(f"Gagal mengambil chart {clean_sym} dari Invezgo: {res_chart.status_code}")
    
    bars = res_chart.json()
    if not bars or len(bars) < 2:
        raise Exception(f"Data candle {clean_sym} kosong atau kurang dari 2 hari")
    
    ohlc = []
    for b in bars:
        d_str = b['date'][:10]
        ohlc.append({
            'date': d_str,
            'open': round(float(b['open']), 0),
            'high': round(float(b['high']), 0),
            'low': round(float(b['low']), 0),
            'close': round(float(b['close']), 0),
            'volume': int(b.get('volume', 0))
        })
    
    last = ohlc[-1]
    prev = ohlc[-2]
    chg = last['close'] - prev['close']
    pct = (chg / prev['close']) * 100 if prev['close'] else 0
    
    last_dt = datetime.strptime(last['date'], "%Y-%m-%d")
    date_formatted = last_dt.strftime("%d %b %Y")
    
    vol_last = last['volume']
    vol_str = f"{vol_last / 1e9:.1f} miliar" if vol_last >= 1e9 else f"{vol_last / 1e6:.1f} juta" if vol_last >= 1e6 else f"{vol_last:,}"
    turnover_est = f"Rp{vol_last * last['close'] / 1e12:.2f} T" if (vol_last * last['close']) >= 1e12 else f"Rp{vol_last * last['close'] / 1e9:.2f} M"

    # 2. Gunakan metadata dari emiten_info atau existing_data tanpa request tambahan
    display_name = clean_sym
    sector_name = None
    subsector_name = None
    logo_url = f"https://storage.invezgo.com/icon/{clean_sym}.png"
    
    if emiten_info:
        display_name = emiten_info.get('name', clean_sym)
        sector_name = emiten_info.get('sector')
        subsector_name = emiten_info.get('subsector')
        logo_url = emiten_info.get('logo') or logo_url
    elif existing_data:
        display_name = existing_data.get('name', clean_sym)
        sector_name = existing_data.get('sector')
        subsector_name = existing_data.get('subsector')
        logo_url = existing_data.get('logo') or logo_url

    # 3. Hemat Request: Jika existing_data sudah punya data fundamental dari Screener, langsung gunakan tanpa request baru!
    fundamentals = {}
    has_screener_fund = existing_data and (existing_data.get('eps') is not None or existing_data.get('pb') is not None or existing_data.get('roe') is not None)
    if has_screener_fund:
        eps_v = existing_data.get('eps')
        target_pe = existing_data.get('targetPe') or get_target_pe(clean_sym, sector_name)
        fv = round(eps_v * target_pe, 0) if (eps_v and eps_v > 0) else existing_data.get('fairValue')
        mos_v = round((1 - (last['close'] / fv)) * 100, 1) if (fv and fv > 0 and last['close'] > 0) else existing_data.get('mos')
        fundamentals = {
            'eps': eps_v,
            'bvps': existing_data.get('bvps'),
            'pe': existing_data.get('pe'),
            'pb': existing_data.get('pb'),
            'targetPe': target_pe,
            'fairValue': fv,
            'mos': mos_v,
            'roe': existing_data.get('roe'),
            'der': existing_data.get('der'),
            'marketCap': existing_data.get('marketCap'),
            'logo': logo_url
        }
    else:
        try:
            url_keystat = f"{INVEZGO_BASE_URL}/analysis/keystat/{clean_sym}?type=Q"
            res_key = requests.get(url_keystat, headers=headers, timeout=12)
            if res_key.status_code == 200:
                kdata = res_key.json()
                metric_map = {}
                for r in kdata.get('rows', []):
                    for v in r.get('values', []):
                        amt = v.get('amount')
                        if amt is not None and amt != 0:
                            metric_map[r['name']] = float(amt)
                            break

                # Ambil total lembar saham beredar resmi dari KSEI shareholder-detail Invezgo
                sh_ksei = None
                try:
                    url_sh = f"{INVEZGO_BASE_URL}/analysis/shareholder-detail?code={clean_sym}"
                    res_sh = requests.get(url_sh, headers=headers, timeout=10)
                    if res_sh.status_code == 200:
                        sh_list = res_sh.json()
                        if isinstance(sh_list, list):
                            for item in sh_list:
                                val_sh = float(item.get('val') or 0)
                                pct_sh = float(item.get('percent') or 0)
                                if val_sh > 0 and pct_sh >= 1.0:
                                    sh_ksei = val_sh / (pct_sh / 100.0)
                                    break
                except Exception:
                    pass

                total_shares = sh_ksei or metric_map.get('Saham')
                ni_ttm = metric_map.get('Net Income (TTM)')
                equity_total = metric_map.get('Common Equity') or metric_map.get('Total Equity')

                raw_eps = (
                    metric_map.get('Current EPS (TTM)')
                    or metric_map.get('Current EPS (Annualised)')
                    or metric_map.get('EPS')
                )
                raw_bvps = (
                    metric_map.get('Current Book Value Per Share')
                    or metric_map.get('BVPS')
                )

                eps_val = (ni_ttm / total_shares) if (ni_ttm and total_shares and total_shares > 0) else raw_eps
                bvps_val = (equity_total / total_shares) if (equity_total and total_shares and total_shares > 0) else raw_bvps

                pe_val = (
                    round(last['close'] / eps_val, 2)
                    if (eps_val and eps_val > 0)
                    else (
                        metric_map.get('Current PE Ratio (TTM)')
                        or metric_map.get('Current PE Ratio (Annualised)')
                        or metric_map.get('PER')
                    )
                )
                pb_val = (
                    round(last['close'] / bvps_val, 2)
                    if (bvps_val and bvps_val > 0)
                    else (
                        metric_map.get('Current Price to Book Value')
                        or metric_map.get('PBV')
                    )
                )
                roe_val = (
                    metric_map.get('Return on Equity (TTM)')
                    or metric_map.get('ROE')
                )
                der_val = (
                    metric_map.get('Debt to Equity Ratio (Quarter)')
                    or metric_map.get('DER')
                )
                market_cap = (
                    round(last['close'] * total_shares)
                    if (total_shares and total_shares > 0)
                    else metric_map.get('Kapitalisasi Pasar')
                )

                target_pe = get_target_pe(clean_sym, sector_name)
                fair_value_per = round(eps_val * target_pe, 0) if (eps_val and eps_val > 0) else None
                mos_per = round((1 - (last['close'] / fair_value_per)) * 100, 1) if (fair_value_per and fair_value_per > 0) else None

                fundamentals = {
                    'eps': round(float(eps_val), 2) if eps_val is not None else None,
                    'bvps': round(float(bvps_val), 2) if bvps_val is not None else None,
                    'pe': round(float(pe_val), 2) if pe_val is not None else None,
                    'pb': round(float(pb_val), 2) if pb_val is not None else None,
                    'targetPe': target_pe,
                    'fairValue': fair_value_per,
                    'mos': mos_per,
                    'roe': round(float(roe_val), 2) if roe_val is not None else None,
                    'der': round(float(der_val), 2) if der_val is not None else None,
                    'marketCap': market_cap,
                    'logo': logo_url
                }
        except Exception as e_ks:
            print(f"Warning keystat {clean_sym}: {e_ks}")

    res = {
        'ticker': clean_sym,
        'name': display_name,
        'sector': sector_name,
        'subsector': subsector_name,
        'price': last['close'],
        'previousClose': prev['close'],
        'change': round(chg, 0),
        'changePct': round(pct, 2),
        'date': date_formatted,
        'rawDate': last['date'],
        'volume': vol_str,
        'turnover': turnover_est,
        'gainers': None,
        'losers': None,
        'totalBars': len(ohlc),
        'source': 'Invezgo (BEI Official)',
        'isStock': True,
        'ohlc': ohlc
    }
    if fundamentals:
        res.update(fundamentals)
    return res

def fetch_all_screener_invezgo(emiten_map: dict = None, date_str: str = "16 Oct 2026", raw_date: str = "2026-10-16") -> dict:
    """
    Mengambil data harga penutupan dan rasio fundamental (EPS, PER, PBV, ROE, BVPS, Harga Wajar, MOS)
    untuk SELURUH emiten aktif di BEI (900+ saham) sekaligus via POST /screener/screen Invezgo API.
    """
    emiten_map = emiten_map or {}
    headers = get_auth_headers()
    url = f"{INVEZGO_BASE_URL}/screener/screen"
    body = {"formula": "close > 0 or eps != 0 or pbv != 0 or per != 0 or roe != 0"}

    res = requests.post(url, headers=headers, json=body, timeout=25)
    if res.status_code != 200:
        raise Exception(f"Gagal mengambil screener Invezgo: {res.status_code} {res.text[:200]}")

    rows = res.json()
    if not isinstance(rows, list):
        return {}

    from db_manager import load_all_market_quotes_db
    existing_quotes = load_all_market_quotes_db()

    result = {}
    for item in rows:
        code = str(item.get("code") or "").upper().strip()
        if not code:
            continue
        close_val = float(item.get("close") or 0)
        if close_val <= 0:
            continue

        eps_raw = item.get("eps")
        pbv_raw = item.get("pbv")
        per_raw = item.get("per")
        roe_raw = item.get("roe")

        eps_val = float(eps_raw) if eps_raw is not None and float(eps_raw) != 0 else None
        pb_val = float(pbv_raw) if pbv_raw is not None and float(pbv_raw) != 0 else None
        pe_val = float(per_raw) if per_raw is not None and float(per_raw) != 0 else (
            round(close_val / eps_val, 2) if (eps_val and eps_val > 0) else None
        )
        roe_val = float(roe_raw) if roe_raw is not None else None
        bvps_val = round(close_val / pb_val, 2) if (pb_val and pb_val > 0) else None

        info = emiten_map.get(code, {})
        sector_name = info.get("sector") or "Lainnya"
        subsector_name = info.get("subsector") or sector_name
        display_name = info.get("name") or f"PT {code} Tbk"
        logo_url = info.get("logo") or f"https://storage.invezgo.com/icon/{code}.png"

        target_pe = get_target_pe(code, sector_name)
        fair_value_per = round(eps_val * target_pe, 0) if (eps_val and eps_val > 0) else None
        mos_per = (
            round((1 - (close_val / fair_value_per)) * 100, 1)
            if (fair_value_per and fair_value_per > 0)
            else None
        )

        prev_item = existing_quotes.get(code) or {}
        prev_close = float(prev_item.get("previousClose") or close_val)
        chg_val = prev_item.get("change", 0)
        chg_pct = prev_item.get("changePct", 0.0)
        if prev_close > 0 and prev_close != close_val:
            chg_val = round(close_val - prev_close, 2)
            chg_pct = round((chg_val / prev_close) * 100, 2)

        entry = {
            "ticker": code,
            "name": display_name,
            "sector": sector_name,
            "subsector": subsector_name,
            "price": round(close_val, 0),
            "previousClose": round(prev_close, 0),
            "change": chg_val,
            "changePct": chg_pct,
            "date": prev_item.get("date") or date_str,
            "rawDate": prev_item.get("rawDate") or raw_date,
            "volume": prev_item.get("volume") or "—",
            "turnover": prev_item.get("turnover") or "—",
            "gainers": None,
            "losers": None,
            "totalBars": prev_item.get("totalBars") or 0,
            "source": "Invezgo (BEI Official)",
            "isStock": True,
            "eps": round(eps_val, 2) if eps_val is not None else None,
            "bvps": bvps_val,
            "pe": round(pe_val, 2) if pe_val is not None else None,
            "pb": round(pb_val, 2) if pb_val is not None else None,
            "targetPe": target_pe,
            "fairValue": fair_value_per,
            "mos": mos_per,
            "roe": round(roe_val, 2) if roe_val is not None else None,
            "logo": logo_url,
        }
        if prev_item.get("ohlc"):
            entry["ohlc"] = prev_item["ohlc"]
        if prev_item.get("intraday"):
            entry["intraday"] = prev_item["intraday"]
        result[code] = entry

    return result


def _request(path: str, params: dict = None, timeout: int = 12):
    """Helper HTTP GET ke Invezgo API dengan retry & exponential backoff (hemat & tahan rate-limit 429)."""
    import time as _time
    url = f"{INVEZGO_BASE_URL}{path}"
    for attempt in range(3):
        try:
            res = requests.get(url, headers=get_auth_headers(), params=params, timeout=timeout)
            if res.status_code == 200:
                return res.json()
            if res.status_code in (429, 500, 502, 503, 504) and attempt < 2:
                _time.sleep(0.8 * (attempt + 1))
                continue
            return None
        except Exception as e:
            if attempt < 2:
                _time.sleep(0.8 * (attempt + 1))
                continue
            print(f"[invezgo_client._request] Error {path}: {e}")
            return None
    return None


def _parse_num_str(val) -> float:
    """Konversi string angka dengan koma seperti '1,511,518,985,602,000' atau '21.74' ke float."""
    if val is None or val == "" or val == "-":
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    try:
        cleaned = str(val).replace(",", "").replace("%", "").strip()
        return float(cleaned)
    except Exception:
        return 0.0


def _parse_keystat_to_financials(ks_payload: dict) -> list[dict]:
    """
    Transformasi respons /analysis/keystat/{code}?type=Q menjadi array 5 periode
    dengan format FinancialYearData (dalam Rp Triliun untuk nilai moneter).
    """
    if not isinstance(ks_payload, dict):
        return []
    cols = ks_payload.get("columns") or []
    rows = ks_payload.get("rows") or []
    if not cols or not rows:
        return []

    # Petakan setiap nama metrik ke kamus {col_label: float_val} serta array berdasarkan urutan
    metric_by_col: dict[str, dict[str, float]] = {}
    metric_by_idx: dict[str, list[float]] = {}

    for row in rows:
        if not isinstance(row, dict):
            continue
        # Kadang row langsung punya 'name' & 'values', atau di dalam 'items'
        items_to_iter = row.get("items") if isinstance(row.get("items"), list) else [row]
        for item in items_to_iter:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            vals = item.get("values") or []
            if not name or not isinstance(vals, list):
                continue
            col_dict: dict[str, float] = {}
            idx_list: list[float] = []
            for v in vals:
                if isinstance(v, dict):
                    c_lbl = str(v.get("col") or v.get("label") or "").strip()
                    amt = _parse_num_str(v.get("amount") if "amount" in v else v.get("value"))
                    if c_lbl:
                        col_dict[c_lbl] = amt
                    idx_list.append(amt)
                else:
                    idx_list.append(_parse_num_str(v))
            if name not in metric_by_col:
                metric_by_col[name] = col_dict
                metric_by_idx[name] = idx_list

    def get_metric(names: list[str], col_label: str, idx: int) -> float:
        for n in names:
            c_map = metric_by_col.get(n)
            if c_map and col_label in c_map and c_map[col_label] != 0:
                return c_map[col_label]
            arr = metric_by_idx.get(n)
            if arr and idx < len(arr) and arr[idx] != 0:
                return arr[idx]
        return 0.0

    # Kolom dari Invezgo urut dari terbaru (index 0 = Q2 2026) ke terlama.
    # Kita ambil maksimal 5 periode terbaru, lalu balik urutannya (terlama -> terbaru) agar grafik & tabel rapi.
    max_periods = min(5, len(cols))
    selected_indices = list(range(max_periods - 1, -1, -1))

    result = []
    prev_cash_tril = None
    for i in selected_indices:
        col_obj = cols[i]
        if isinstance(col_obj, dict):
            period_label = str(col_obj.get("label") or col_obj.get("col") or f"{col_obj.get('period', '')} {col_obj.get('year', '')}").strip()
        else:
            period_label = str(col_obj).strip()

        rev_raw = get_metric(["Revenue (TTM)", "Revenue (Quarter)"], period_label, i)
        gp_raw = get_metric(["Gross Profit (TTM)", "Gross Profit (Quarter)"], period_label, i)
        ebitda_raw = get_metric(["EBITDA (TTM)", "EBITDA (Quarter)"], period_label, i)
        net_raw = get_metric(["Net Income (TTM)", "Net Income (Quarter)"], period_label, i)
        eps_val = get_metric(["Current EPS (TTM)", "Current EPS (Annualised)"], period_label, i)

        assets_raw = get_metric(["Total Assets (Quarter)"], period_label, i)
        equity_raw = get_metric(["Common Equity", "Total Equity"], period_label, i)
        liab_raw = get_metric(["Total Liabilities (Quarter)", "Total Debt (Quarter)"], period_label, i)
        cash_raw = get_metric(["Cash (Quarter)"], period_label, i)
        bvps_val = get_metric(["Current Book Value Per Share"], period_label, i)

        cfo_raw = get_metric(["Cash From Operations (TTM)", "Cash From Operations (Quarter)"], period_label, i)
        cfi_raw = get_metric(["Cash From Investing (TTM)", "Cash From Investing (Quarter)"], period_label, i)
        cff_raw = get_metric(["Cash From Financing (TTM)", "Cash From Financing (Quarter)"], period_label, i)
        fcf_raw = get_metric(["Free cash flow (TTM)", "Free cash flow (Quarter)"], period_label, i)

        npm_val = get_metric(["Net Profit Margin (Quarter)"], period_label, i)
        roe_val = get_metric(["Return on Equity (TTM)"], period_label, i)
        roa_val = get_metric(["Return on Assets (TTM)"], period_label, i)
        der_val = get_metric(["Debt to Equity Ratio (Quarter)"], period_label, i)
        pe_val = get_metric(["PE Ratio (Quarter)", "Current PE Ratio (TTM)"], period_label, i)
        pbv_val = get_metric(["Price to Book Value (Quarter)"], period_label, i)
        div_yield = get_metric(["Dividend Yield"], period_label, i)
        payout_ratio = get_metric(["Payout Ratio"], period_label, i)

        # Konversi ke Rp Triliun (bagi 10^12)
        rev_t = round(rev_raw / 1e12, 2)
        gp_t = round(gp_raw / 1e12, 2)
        ebitda_t = round(ebitda_raw / 1e12, 2)
        net_t = round(net_raw / 1e12, 2)
        pretax_t = ebitda_t if abs(ebitda_t) > 0.01 else (gp_t if abs(gp_t) > 0.01 else round(net_t * 1.25, 2))

        assets_t = round(assets_raw / 1e12, 2)
        equity_t = round(equity_raw / 1e12, 2)
        liab_t = round(liab_raw / 1e12, 2) if liab_raw > 0 else round(max(0.0, assets_t - equity_t), 2)
        cash_t = round(cash_raw / 1e12, 2)

        cfo_t = round(cfo_raw / 1e12, 2)
        cfi_t = round(cfi_raw / 1e12, 2)
        cff_t = round(cff_raw / 1e12, 2)
        fcf_t = round(fcf_raw / 1e12, 2)
        net_cash_t = round(cfo_t + cfi_t + cff_t, 2)

        begin_cash_t = prev_cash_tril if prev_cash_tril is not None else round(max(0.0, cash_t - net_cash_t), 2)
        prev_cash_tril = cash_t

        margin_pct = round(npm_val, 1) if npm_val != 0 else (round((net_t / rev_t) * 100, 1) if rev_t > 0 else 0.0)
        conv_pct = int(round((cfo_t / net_t) * 100)) if abs(net_t) > 0.01 else 100

        result.append({
            "year": period_label,
            "revenue": rev_t,
            "grossProfit": gp_t,
            "pretax": pretax_t,
            "net": net_t,
            "margin": margin_pct,
            "eps": round(eps_val, 1),
            "assets": assets_t,
            "equity": equity_t,
            "liabilities": liab_t,
            "cash": cash_t,
            "bvps": round(bvps_val, 0),
            "cfo": cfo_t,
            "cfi": cfi_t,
            "cff": cff_t,
            "fcf": fcf_t,
            "netCash": net_cash_t,
            "begin": begin_cash_t,
            "end": cash_t,
            "conversion": conv_pct,
            "roe": round(roe_val, 2),
            "roa": round(roa_val, 2),
            "der": round(der_val, 2),
            "pe": round(pe_val, 2),
            "pbv": round(pbv_val, 2),
            "dividendYield": round(div_yield, 2),
            "payoutRatio": round(payout_ratio, 2),
        })

    return result


def _parse_shareholders(sh_list: list) -> list[dict]:
    """Format daftar komposisi pemegang saham KSEI terbaru (deduplikasi berdasarkan tanggal terbaru)."""
    if not isinstance(sh_list, list) or not sh_list:
        return []
    # Cari tanggal snapshot terbaru jika field 'date' ada
    dates = [str(item.get("date") or "") for item in sh_list if isinstance(item, dict) and item.get("date")]
    latest_date = max(dates) if dates else None

    by_name: dict[str, dict] = {}
    for item in sh_list:
        if not isinstance(item, dict):
            continue
        if latest_date and item.get("date") and str(item.get("date")) != latest_date:
            continue
        name = str(item.get("name") or "").strip().title()
        pct = _parse_num_str(item.get("percent") if "percent" in item else item.get("percentage"))
        shares = _parse_num_str(item.get("val") if "val" in item else item.get("shares"))
        badge = str(item.get("badge") or "").strip()
        if name and pct > 0:
            by_name[name] = {
                "name": name,
                "percentage": round(pct, 2),
                "shares": int(shares),
                "badge": badge,
            }
    parsed = list(by_name.values())
    parsed.sort(key=lambda x: x["percentage"], reverse=True)
    return parsed


def _parse_disclosures(disc_payload: dict) -> list[dict]:
    """Format daftar dokumen Keterbukaan Informasi BEI dari /analysis/disclosure."""
    if not isinstance(disc_payload, dict):
        return []
    items = disc_payload.get("data") or []
    if not isinstance(items, list):
        return []
    result = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        raw_date = str(item.get("date") or "")[:10]
        attachments = item.get("list") or []
        first_url = ""
        clean_attachments = []
        for att in attachments:
            if isinstance(att, dict) and att.get("url"):
                if not first_url:
                    first_url = att["url"]
                clean_attachments.append({
                    "name": str(att.get("name") or "Lampiran PDF"),
                    "url": str(att.get("url")),
                })
        if not title:
            continue
        fmt_date = raw_date
        if raw_date:
            try:
                fmt_date = datetime.strptime(raw_date, "%Y-%m-%d").strftime("%d %b %Y")
            except Exception:
                fmt_date = raw_date
        result.append({
            "title": title,
            "date": fmt_date or "Terbaru",
            "rawDate": raw_date,
            "category": "Keterbukaan Informasi BEI",
            "url": first_url,
            "attachments": clean_attachments,
        })
    return result


def fetch_company_complete_invezgo(ticker: str, force: bool = False) -> dict:
    """
    Ambil data fundamental lengkap per perusahaan (Profil, Laporan Keuangan 5 Kuartal,
    Pemegang Saham KSEI, dan Keterbukaan Informasi BEI).
    Menggunakan database SQLite lokal (data/pintarsaham.db) dengan TTL Kuartalan (90 hari)
    agar SANGAT HEMAT KUOTA API Invezgo (0 request jika sudah tersimpan di DB).
    """
    import time
    from db_manager import (
        get_company_detail_db,
        save_company_detail_db,
        TTL_QUARTERLY_FUNDAMENTALS,
        TTL_DISCLOSURES,
    )

    clean = ticker.upper().strip()
    now = time.time()
    cached = get_company_detail_db(clean)

    need_fundamentals = True
    need_disclosures = True

    if cached and not force:
        fund_age = now - float(cached.get("fundamentals_updated_at") or 0)
        disc_age = now - float(cached.get("disclosures_updated_at") or 0)
        if (
            cached.get("profile")
            and cached.get("financials")
            and fund_age < TTL_QUARTERLY_FUNDAMENTALS
        ):
            need_fundamentals = False
        if cached.get("disclosures") is not None and disc_age < TTL_DISCLOSURES:
            need_disclosures = False

    if not need_fundamentals and not need_disclosures and cached:
        return {
            "ticker": clean,
            "profile": cached.get("profile"),
            "financials": cached.get("financials") or [],
            "shareholders": cached.get("shareholders") or [],
            "disclosures": cached.get("disclosures") or [],
            "fundamentalsUpdatedAt": cached.get("fundamentals_updated_at"),
            "disclosuresUpdatedAt": cached.get("disclosures_updated_at"),
            "cachedDb": True,
            "apiRequestsUsed": 0,
        }

    profile = cached.get("profile") if cached else None
    financials = cached.get("financials") if cached else None
    shareholders = cached.get("shareholders") if cached else None
    disclosures = cached.get("disclosures") if cached else None
    requests_used = 0

    if need_fundamentals:
        # 1. Profil Perusahaan (/analysis/information/{code})
        info_resp = _request(f"/analysis/information/{clean}", timeout=12)
        requests_used += 1
        if isinstance(info_resp, dict) and info_resp.get("code"):
            profile = {
                "code": info_resp.get("code") or clean,
                "name": info_resp.get("name") or f"PT {clean} Tbk",
                "sector": info_resp.get("sector") or "",
                "subsector": info_resp.get("subsector") or "",
                "industry": info_resp.get("industry") or "",
                "subsindustry": info_resp.get("subsindustry") or "",
                "activity": info_resp.get("activity") or "",
                "board": info_resp.get("board") or "Utama",
                "listingDate": info_resp.get("listing_date") or "",
                "website": info_resp.get("website") or "",
                "address": info_resp.get("address") or "",
                "email": info_resp.get("email") or "",
                "phone": info_resp.get("phone") or "",
                "ipoPrice": info_resp.get("ipo_price"),
                "ipoShare": info_resp.get("ipo_share"),
                "directors": info_resp.get("director") or [],
                "commissioners": info_resp.get("commissioner") or [],
                "subsidiaries": info_resp.get("subsidiary") or [],
            }

        # 2. Laporan Keuangan Kuartalan 5 Periode (/analysis/keystat/{code}?type=Q)
        ks_resp = _request(f"/analysis/keystat/{clean}", params={"type": "Q"}, timeout=15)
        requests_used += 1
        parsed_fin = _parse_keystat_to_financials(ks_resp)
        if parsed_fin:
            financials = parsed_fin

        # 3. Komposisi Pemegang Saham KSEI (/analysis/shareholder-detail?code={code})
        sh_resp = _request("/analysis/shareholder-detail", params={"code": clean}, timeout=12)
        requests_used += 1
        parsed_sh = _parse_shareholders(sh_resp)
        if parsed_sh:
            shareholders = parsed_sh

    if need_disclosures:
        # 4. Dokumen Keterbukaan Informasi BEI (/analysis/disclosure?code={code}&page=1&limit=8)
        disc_resp = _request(
            "/analysis/disclosure",
            params={"code": clean, "page": 1, "limit": 8},
            timeout=12,
        )
        requests_used += 1
        disclosures = _parse_disclosures(disc_resp)

    save_company_detail_db(
        clean,
        profile=profile,
        financials=financials,
        shareholders=shareholders,
        disclosures=disclosures,
    )

    updated = get_company_detail_db(clean) or {}
    return {
        "ticker": clean,
        "profile": updated.get("profile") or profile,
        "financials": updated.get("financials") or financials or [],
        "shareholders": updated.get("shareholders") or shareholders or [],
        "disclosures": updated.get("disclosures") or disclosures or [],
        "fundamentalsUpdatedAt": updated.get("fundamentals_updated_at") or now,
        "disclosuresUpdatedAt": updated.get("disclosures_updated_at") or now,
        "cachedDb": False,
        "apiRequestsUsed": requests_used,
    }


def fetch_whale_network_invezgo(
    holder_name: str = None, ticker: str = None, force: bool = False
) -> dict:
    """
    Membangun Peta Jaring-Jaring Kepemilikan Saham (Conglomerate & Whale Tracker KSEI):
    - Jika `holder_name` diberikan (misal 'ANTHONI SALIM'): mencari seluruh saham di BEI yang
      dimiliki oleh tokoh/institusi tersebut, menghitung nilai pasar portofolio (Rp), tren akumulasi/distribusi
      bulanan, serta jaring koneksi pemegang saham lain di emiten terkait (tersimpan di SQLite DB).
    - Jika `ticker` diberikan (misal 'BBCA'): menampilkan jaring pemegang saham utama emiten tersebut
      beserta cabang kepemilikan mereka di emiten BEI lainnya.
    """
    import time
    from db_manager import (
        get_shareholder_network_db,
        save_shareholder_network_db,
        get_company_detail_db,
        load_all_market_quotes_db,
        TTL_QUARTERLY_FUNDAMENTALS,
    )

    now = time.time()
    quotes = load_all_market_quotes_db()

    # MODE 1: Berpusat pada Saham (Ticker)
    if ticker and not holder_name:
        clean_ticker = ticker.upper().strip()
        comp = fetch_company_complete_invezgo(clean_ticker, force=force)
        sh_list = comp.get("shareholders") or []
        q_info = quotes.get(clean_ticker) or {}
        stock_price = float(q_info.get("price") or 0)

        enriched_holders = []
        for s in sh_list:
            s_name = str(s.get("name") or "").upper().strip()
            shares = int(s.get("shares") or 0)
            pct = float(s.get("percentage") or 0)
            val_rp = shares * stock_price
            # Cek apakah jaring tokoh ini sudah ada di SQLite (0 request tambahan)
            other_stocks = []
            cached_holder = get_shareholder_network_db(s_name)
            if cached_holder and cached_holder.get("holdings"):
                for h in cached_holder["holdings"]:
                    if h.get("ticker") != clean_ticker:
                        other_stocks.append({
                            "ticker": h.get("ticker"),
                            "percentage": h.get("latestPct"),
                            "marketValueT": h.get("marketValueT"),
                        })
            enriched_holders.append({
                "name": s.get("name"),
                "queryName": s_name,
                "shares": shares,
                "percentage": pct,
                "marketValueRp": val_rp,
                "marketValueT": round(val_rp / 1e12, 2),
                "otherHoldings": other_stocks[:6],
            })

        return {
            "mode": "stock",
            "centerLabel": clean_ticker,
            "centerSub": comp.get("profile", {}).get("name") or q_info.get("name") or f"PT {clean_ticker} Tbk",
            "sector": comp.get("profile", {}).get("sector") or q_info.get("sector") or "",
            "price": stock_price,
            "shareholders": enriched_holders,
            "directors": (comp.get("profile") or {}).get("directors") or [],
            "commissioners": (comp.get("profile") or {}).get("commissioners") or [],
            "subsidiaries": (comp.get("profile") or {}).get("subsidiaries") or [],
            "cachedDb": comp.get("cachedDb", True),
            "apiRequestsUsed": comp.get("apiRequestsUsed", 0),
        }

    # MODE 2: Berpusat pada Nama Tokoh / Institusi / Whale
    clean_holder = (holder_name or "ANTHONI SALIM").upper().strip()
    cached = get_shareholder_network_db(clean_holder)
    requests_used = 0
    cached_db = False

    raw_holdings_parsed = None
    if (
        cached
        and not force
        and cached.get("holdings")
        and (now - float(cached.get("updated_at") or 0)) < TTL_QUARTERLY_FUNDAMENTALS
    ):
        raw_holdings_parsed = cached["holdings"]
        cached_db = True
    else:
        resp = _request("/analysis/shareholder-detail", params={"name": clean_holder}, timeout=15)
        requests_used += 1
        if isinstance(resp, list) and len(resp) > 0:
            by_code: dict[str, list[dict]] = {}
            for row in resp:
                if not isinstance(row, dict):
                    continue
                c = str(row.get("code") or "").upper().strip()
                dt = str(row.get("date") or "")[:10]
                sh_val = int(_parse_num_str(row.get("val")))
                pct_val = round(_parse_num_str(row.get("percent")), 2)
                if c and sh_val > 0:
                    by_code.setdefault(c, []).append({
                        "date": dt,
                        "shares": sh_val,
                        "percentage": pct_val,
                    })

            parsed_list = []
            for c, timeline in by_code.items():
                timeline.sort(key=lambda x: x["date"])
                latest = timeline[-1]
                prev = timeline[-2] if len(timeline) >= 2 else timeline[0]
                first = timeline[0]

                delta_shares = latest["shares"] - prev["shares"]
                delta_pct = round(latest["percentage"] - prev["percentage"], 2)
                if delta_shares == 0 and len(timeline) > 2:
                    delta_shares = latest["shares"] - first["shares"]
                    delta_pct = round(latest["percentage"] - first["percentage"], 2)

                status = (
                    "Akumulasi"
                    if delta_shares > 0
                    else "Distribusi"
                    if delta_shares < 0
                    else "Tetap"
                )
                parsed_list.append({
                    "ticker": c,
                    "latestDate": latest["date"],
                    "latestShares": latest["shares"],
                    "latestPct": latest["percentage"],
                    "prevDate": prev["date"],
                    "prevShares": prev["shares"],
                    "prevPct": prev["percentage"],
                    "shareChange": delta_shares,
                    "pctChange": delta_pct,
                    "flowStatus": status,
                    "history": timeline[-6:],
                })
            raw_holdings_parsed = parsed_list
            if parsed_list:
                save_shareholder_network_db(clean_holder, parsed_list)
        else:
            raw_holdings_parsed = cached.get("holdings") if cached else []

    # Perkaya dengan harga saham live, market value, & co-shareholders dari SQLite DB (0 request tambahan)
    enriched_holdings = []
    total_portfolio_rp = 0.0
    for h in raw_holdings_parsed or []:
        sym = h.get("ticker")
        q = quotes.get(sym) or {}
        price = float(q.get("price") or 0)
        shares = int(h.get("latestShares") or 0)
        val_rp = shares * price
        total_portfolio_rp += val_rp

        co_holders = []
        comp_db = get_company_detail_db(sym)
        if comp_db and comp_db.get("shareholders"):
            for sh in comp_db["shareholders"]:
                sh_n = str(sh.get("name") or "").upper().strip()
                if clean_holder not in sh_n and sh_n not in clean_holder:
                    co_holders.append({
                        "name": sh.get("name"),
                        "percentage": sh.get("percentage"),
                    })

        enriched_holdings.append({
            **h,
            "companyName": q.get("name") or f"PT {sym} Tbk",
            "sector": q.get("sector") or "Lainnya",
            "price": price,
            "pe": q.get("pe"),
            "pb": q.get("pb"),
            "mos": q.get("mos"),
            "marketValueRp": val_rp,
            "marketValueT": round(val_rp / 1e12, 2),
            "coShareholders": co_holders[:4],
        })

    enriched_holdings.sort(key=lambda x: x["marketValueRp"], reverse=True)

    return {
        "mode": "holder",
        "centerLabel": clean_holder.title(),
        "queryName": clean_holder,
        "totalPortfolioRp": total_portfolio_rp,
        "totalPortfolioT": round(total_portfolio_rp / 1e12, 2),
        "totalStocks": len(enriched_holdings),
        "holdings": enriched_holdings,
        "cachedDb": cached_db,
        "apiRequestsUsed": requests_used,
    }


