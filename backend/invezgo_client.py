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
        'gainers': 285,
        'losers': 264,
        'totalBars': len(ohlc),
        'source': 'Invezgo (BEI COMPOSITE)',
        'isStock': False,
        'ohlc': ohlc
    }

def fetch_stock_invezgo(ticker: str, days: int = 365, emiten_info: dict = None) -> dict:
    """
    Mengambil data candlestick harian + fundamental lengkap emiten saham dari Invezgo.
    """
    clean_sym = ticker.upper().strip()
    today = datetime.now()
    from_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    to_date = today.strftime("%Y-%m-%d")
    headers = get_auth_headers()
    
    # 1. Fetch Chart OHLC
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

    # 2. Fetch Metadata / Company Information jika belum ada
    display_name = clean_sym
    sector_name = None
    subsector_name = None
    logo_url = None
    
    if emiten_info:
        display_name = emiten_info.get('name', clean_sym)
        sector_name = emiten_info.get('sector')
        subsector_name = emiten_info.get('subsector')
        logo_url = emiten_info.get('logo')
    else:
        try:
            url_info = f"{INVEZGO_BASE_URL}/analysis/information/{clean_sym}"
            res_info = requests.get(url_info, headers=headers, timeout=10)
            if res_info.status_code == 200:
                inf = res_info.json()
                display_name = inf.get('name', clean_sym)
                if not display_name.startswith("PT") and not display_name.endswith("Tbk"):
                    display_name = f"PT {display_name} Tbk"
                sector_name = inf.get('sector')
                subsector_name = inf.get('subsector') or inf.get('subsindustry')
        except Exception:
            pass

    if not logo_url and clean_sym != 'IHSG':
        logo_url = f"https://storage.invezgo.com/icon/{clean_sym}.png"

    # 3. Fetch Key Statistics (Fundamentals)
    fundamentals = {}
    try:
        url_keystat = f"{INVEZGO_BASE_URL}/analysis/keystat/{clean_sym}?type=FY"
        res_key = requests.get(url_keystat, headers=headers, timeout=12)
        if res_key.status_code == 200:
            kdata = res_key.json()
            metric_map = {}
            for r in kdata.get('rows', []):
                vals = r.get('values', [])
                if vals and 'amount' in vals[0]:
                    metric_map[r['name']] = vals[0]['amount']
            
            eps_val = metric_map.get('EPS')
            bvps_val = metric_map.get('BVPS')
            pe_val = metric_map.get('PER')
            pb_val = metric_map.get('PBV')
            roe_val = metric_map.get('ROE')
            der_val = metric_map.get('DER')
            market_cap = metric_map.get('Kapitalisasi Pasar')
            
            # Hitung target PE dan MOS
            target_pe = get_target_pe(clean_sym, sector_name)
            fair_value_per = round(eps_val * target_pe, 0) if (eps_val and eps_val > 0) else None
            mos_per = round((1 - (last['close'] / fair_value_per)) * 100, 1) if (fair_value_per and fair_value_per > 0) else None

            fundamentals = {
                'eps': round(eps_val, 2) if eps_val is not None else None,
                'bvps': round(bvps_val, 2) if bvps_val is not None else None,
                'pe': round(pe_val, 2) if pe_val is not None else (round(last['close']/eps_val, 2) if (eps_val and eps_val > 0) else None),
                'pb': round(pb_val, 2) if pb_val is not None else (round(last['close']/bvps_val, 2) if (bvps_val and bvps_val > 0) else None),
                'targetPe': target_pe,
                'fairValue': fair_value_per,
                'mos': mos_per,
                'roe': round(roe_val, 2) if roe_val is not None else None,
                'der': round(der_val, 2) if der_val is not None else None,
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
