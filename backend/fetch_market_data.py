"""
fetch_market_data.py — Modul Penarikan Data Pasar Modal BEI / IDX
Sumber Utama: Invezgo API (Katalog Lengkap 976 Emiten + IHSG)
Fallback: Yahoo Finance jika Invezgo offline / kuota habis.
"""

import os
import json
import sys
from datetime import datetime
import concurrent.futures

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BASE_DIR, 'data')
DIRECTORY = DATA_DIR if os.path.exists(DATA_DIR) else BACKEND_DIR

try:
    from invezgo_client import (
        fetch_stock_invezgo,
        fetch_ihsg_invezgo,
        fetch_intraday_invezgo,
        fetch_all_screener_invezgo,
        get_invezgo_api_key,
        get_target_pe
    )
except ImportError:
    sys.path.insert(0, BACKEND_DIR)
    from invezgo_client import (
        fetch_stock_invezgo,
        fetch_ihsg_invezgo,
        fetch_intraday_invezgo,
        fetch_all_screener_invezgo,
        get_invezgo_api_key,
        get_target_pe
    )

# Load full catalog (976 emitens)
EMITENS_CATALOG = []
EMITEN_MAP = {}
emitens_path = os.path.join(DIRECTORY, 'emitens.json')
if os.path.exists(emitens_path):
    try:
        with open(emitens_path, 'r', encoding='utf-8') as f:
            EMITENS_CATALOG = json.load(f)
            EMITEN_MAP = {e['ticker']: e for e in EMITENS_CATALOG}
    except Exception as e:
        print(f"Warning loading emitens.json: {e}")

# Core liquid stocks prioritized for offline bundle pre-cache
CORE_PRECACHE_TICKERS = [
    'AADI', 'ACES', 'ADMR', 'ADRO', 'AKRA', 'AMMN', 'AMRT', 'ANTM', 'ASII', 'AVIA',
    'BBCA', 'BBNI', 'BBRI', 'BBTN', 'BMRI', 'BRPT', 'BSDE', 'BTPS', 'BUKA', 'CCSI',
    'CMRY', 'CPIN', 'CTRA', 'CUAN', 'DSNG', 'DSSA', 'ELSA', 'EMTK', 'ENRG', 'ERAA',
    'ESSA', 'GOTO', 'HEAL', 'HMSP', 'HRTA', 'HRUM', 'ICBP', 'INCO', 'INDF', 'INKP',
    'INTP', 'ISAT', 'ITMG', 'JPFA', 'JSMR', 'KIJA', 'KLBF', 'KPIG', 'MAPA', 'MAPI',
    'MEDC', 'MIKA', 'MTEL', 'MYOR', 'PGAS', 'PGEO', 'PNLF', 'POWR', 'PTBA', 'PWON',
    'RAJA', 'SCMA', 'SIDO', 'SMRA', 'SSMS', 'TAPG', 'TLKM', 'TOWR', 'UNTR', 'UNVR',
    'WIFI'
]

def fetch_single_yfinance_fallback(ticker_symbol: str) -> dict:
    import yfinance as yf
    clean_sym = ticker_symbol.upper().strip()
    yf_symbol = '^JKSE' if clean_sym == 'IHSG' else f"{clean_sym}.JK"
    
    t = yf.Ticker(yf_symbol)
    df = t.history(period='1y', interval='1d')
    if df.empty:
        raise Exception(f"Tidak ada data ditemukan untuk {yf_symbol} via yfinance")
    
    df = df.dropna(subset=['Close'])
    if len(df) < 2:
        raise Exception(f"Data histori terlalu sedikit untuk {yf_symbol}")
    
    ohlc = []
    for idx, row in df.iterrows():
        d_str = idx.strftime('%Y-%m-%d')
        ohlc.append({
            'date': d_str,
            'open': round(float(row['Open']), 2 if clean_sym == 'IHSG' else 0),
            'high': round(float(row['High']), 2 if clean_sym == 'IHSG' else 0),
            'low': round(float(row['Low']), 2 if clean_sym == 'IHSG' else 0),
            'close': round(float(row['Close']), 2 if clean_sym == 'IHSG' else 0),
            'volume': int(row['Volume']) if ('Volume' in row and not row.isna()['Volume']) else 0
        })
    
    last = ohlc[-1]
    prev = ohlc[-2]
    chg = last['close'] - prev['close']
    pct = (chg / prev['close']) * 100 if prev['close'] != 0 else 0
    
    last_date = datetime.strptime(last['date'], '%Y-%m-%d')
    date_formatted = last_date.strftime('%d %b %Y')
    
    vol_last = last['volume']
    vol_str = f"{vol_last / 1e9:.1f} miliar" if vol_last >= 1e9 else f"{vol_last / 1e6:.1f} juta" if vol_last >= 1e6 else f"{vol_last:,.0f}"
    turnover_est = f"Rp{vol_last * last['close'] / 1e12:.2f} T" if vol_last * last['close'] >= 1e12 else f"Rp{vol_last * last['close'] / 1e9:.2f} M"
    
    emiten_info = EMITEN_MAP.get(clean_sym, {})
    display_name = 'Indeks Harga Saham Gabungan' if clean_sym == 'IHSG' else emiten_info.get('name', clean_sym)
    sector_name = emiten_info.get('sector')
    subsector_name = emiten_info.get('subsector')
    
    fundamentals = {}
    if clean_sym != 'IHSG':
        try:
            info = t.info or {}
            trailing_eps = info.get('trailingEps') or info.get('forwardEps')
            book_value = info.get('bookValue')
            trailing_pe = info.get('trailingPE')
            price_to_book = info.get('priceToBook')
            roe = info.get('returnOnEquity')
            market_cap = info.get('marketCap')

            eps_val = float(trailing_eps) if (trailing_eps is not None and trailing_eps > 0) else None
            bvps_val = float(book_value) if (book_value is not None and book_value > 0) else None
            target_pe = get_target_pe(clean_sym, sector_name)

            fair_value_per = round(eps_val * target_pe, 0) if eps_val else None
            mos_per = round((1 - (last['close'] / fair_value_per)) * 100, 1) if (fair_value_per and fair_value_per > 0) else None

            fundamentals = {
                'eps': round(eps_val, 2) if eps_val else None,
                'bvps': round(bvps_val, 2) if bvps_val else None,
                'pe': round(float(trailing_pe), 2) if trailing_pe else None,
                'pb': round(float(price_to_book), 2) if price_to_book else None,
                'targetPe': target_pe,
                'fairValue': fair_value_per,
                'mos': mos_per,
                'roe': round(float(roe) * 100, 1) if roe is not None else None,
                'marketCap': market_cap,
                'summary': info.get('longBusinessSummary')
            }
        except Exception:
            pass

    res = {
        'ticker': clean_sym,
        'name': display_name,
        'sector': sector_name,
        'subsector': subsector_name,
        'price': last['close'],
        'previousClose': prev['close'],
        'change': round(chg, 2 if clean_sym == 'IHSG' else 0),
        'changePct': round(pct, 2),
        'date': date_formatted,
        'rawDate': last['date'],
        'volume': vol_str,
        'turnover': turnover_est,
        'gainers': 285 if clean_sym == 'IHSG' else None,
        'losers': 264 if clean_sym == 'IHSG' else None,
        'totalBars': len(ohlc),
        'source': f'Yahoo Finance ({yf_symbol}) [Fallback]',
        'isStock': clean_sym != 'IHSG',
        'ohlc': ohlc
    }
    if fundamentals:
        res.update(fundamentals)
    return res

def fetch_intraday(ticker_symbol: str) -> list:
    """
    Fetch intraday 1D OHLCV (menit demi menit) dari Invezgo API dalam 1 request.
    """
    clean_sym = ticker_symbol.upper().strip()
    return fetch_intraday_invezgo(clean_sym)

def fetch_single(ticker_symbol: str, existing_data: dict = None) -> dict:
    """
    Fetch 1-year OHLC and fundamentals for IHSG or ANY Indonesian stock (976+ emitens) via Invezgo API.
    """
    clean_sym = ticker_symbol.upper().strip()
    
    if clean_sym == 'IHSG':
        if get_invezgo_api_key():
            try:
                return fetch_ihsg_invezgo()
            except Exception as e:
                print(f"[fetch_single] IHSG Invezgo error ({e}), mencoba fallback yfinance...")
                return fetch_single_yfinance_fallback('IHSG')
        return fetch_single_yfinance_fallback('IHSG')

    # Emiten Saham
    emiten_info = EMITEN_MAP.get(clean_sym)
    if get_invezgo_api_key():
        try:
            return fetch_stock_invezgo(clean_sym, days=365, emiten_info=emiten_info, existing_data=existing_data)
        except Exception as e:
            print(f"[fetch_single] Invezgo error for {clean_sym} ({e}), mencoba fallback yfinance...")
            return fetch_single_yfinance_fallback(clean_sym)
    else:
        return fetch_single_yfinance_fallback(clean_sym)

def fetch_all_initial(limit_tickers: list = None) -> dict:
    """
    Fetch all 900+ BEI emitens via Invezgo screener API + full 1-year OHLC for IHSG and core emitens.
    """
    market_data = {}
    if get_invezgo_api_key():
        try:
            print("[fetch_all_initial] Mengunduh screener fundamental seluruh emiten BEI dari Invezgo API...")
            screener_map = fetch_all_screener_invezgo(EMITEN_MAP)
            if screener_map:
                market_data.update(screener_map)
                print(f"[fetch_all_initial] Berhasil memuat {len(screener_map)} emiten aktif dari Invezgo Screener.")
        except Exception as e:
            print(f"[fetch_all_initial] Invezgo screener warning: {e}")

    tickers = ['IHSG']
    selected = limit_tickers or CORE_PRECACHE_TICKERS
    for t in selected:
        if t not in tickers:
            tickers.append(t)
    
    print(f"[fetch_all_initial] Mengunduh histori 1 tahun untuk {len(tickers)} instrumen utama dari Invezgo API...")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        future_to_ticker = {executor.submit(fetch_single, t): t for t in tickers}
        for future in concurrent.futures.as_completed(future_to_ticker):
            t = future_to_ticker[future]
            try:
                data = future.result()
                market_data[t] = data
                print(f"  [OK] {t} ({data.get('price')}) via {data.get('source')}")
            except Exception as exc:
                print(f"  [ERR] {t} error: {exc}")

    return market_data

if __name__ == '__main__':
    data = fetch_all_initial()
    out_file = os.path.join(DIRECTORY, 'market_data.json')
    
    existing_bundle = {}
    if os.path.exists(out_file):
        try:
            with open(out_file, 'r', encoding='utf-8') as f:
                existing_bundle = json.load(f)
        except Exception:
            pass

    existing_bundle['market'] = data
    if EMITENS_CATALOG:
        existing_bundle['emitens'] = EMITENS_CATALOG

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(existing_bundle, f, indent=2, ensure_ascii=False)
        
    print(f"Sukses menyimpan market bundle Invezgo ke {out_file}")
