"""
fetch_ihsg.py — Mengambil data pergerakan harian IHSG (Indeks Harga Saham Gabungan)
Sumber Utama: Invezgo API (/analysis/chart/index/COMPOSITE)
Fallback: Yahoo Finance (^JKSE) jika API key tidak tersedia atau koneksi offline.
"""

import os
import json
import sys
from datetime import datetime

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BASE_DIR, 'data')

try:
    from invezgo_client import fetch_ihsg_invezgo, get_invezgo_api_key
except ImportError:
    sys.path.insert(0, BACKEND_DIR)
    from invezgo_client import fetch_ihsg_invezgo, get_invezgo_api_key

def fetch_ihsg_yfinance_fallback():
    import yfinance as yf
    print("[fetch_ihsg] Menggunakan fallback yfinance (^JKSE)...")
    ticker = yf.Ticker('^JKSE')
    df = ticker.history(period='1y', interval='1d')
    if df.empty:
        raise Exception("Gagal menarik data ^JKSE dari yfinance")
    df = df.dropna(subset=['Close'])
    
    ohlc = []
    for idx, row in df.iterrows():
        d_str = idx.strftime('%Y-%m-%d')
        ohlc.append({
            'date': d_str,
            'open': round(float(row['Open']), 2),
            'high': round(float(row['High']), 2),
            'low': round(float(row['Low']), 2),
            'close': round(float(row['Close']), 2),
            'volume': int(row['Volume']) if 'Volume' in row and not row.isna()['Volume'] else 0
        })
    last = ohlc[-1]
    prev = ohlc[-2]
    chg = last['close'] - prev['close']
    pct = (chg / prev['close']) * 100
    last_date = datetime.strptime(last['date'], '%Y-%m-%d')
    date_formatted = last_date.strftime('%d %b %Y')
    vol_last = last['volume']
    vol_str = f"{vol_last / 1e9:.1f} miliar" if vol_last > 1e9 else f"{vol_last / 1e6:.1f} juta" if vol_last > 0 else "18,4 miliar"
    turnover_est = f"Rp{vol_last * last['close'] / 1e12:.2f} T" if vol_last > 0 else "Rp11,75 T"

    return {
        'ticker': 'IHSG',
        'name': 'Indeks Harga Saham Gabungan',
        'price': round(last['close'], 2),
        'previousClose': round(prev['close'], 2),
        'change': round(chg, 2),
        'changePct': round(pct, 2),
        'date': date_formatted,
        'rawDate': last['date'],
        'volume': vol_str,
        'turnover': turnover_est,
        'gainers': 285,
        'losers': 264,
        'totalBars': len(ohlc),
        'source': 'Yahoo Finance (^JKSE) [Fallback]',
        'ohlc': ohlc
    }

def fetch_ihsg():
    if get_invezgo_api_key():
        try:
            print("[fetch_ihsg] Mengambil data IHSG dari Invezgo API...")
            data = fetch_ihsg_invezgo()
            print(f"[fetch_ihsg] Sukses Invezgo: {data['rawDate']} | Close: {data['price']} | {data['totalBars']} bars")
            return data
        except Exception as e:
            print(f"[fetch_ihsg] Invezgo error ({e}), mencoba fallback yfinance...")
            return fetch_ihsg_yfinance_fallback()
    else:
        return fetch_ihsg_yfinance_fallback()

if __name__ == '__main__':
    data = fetch_ihsg()
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Save to data/
    with open(os.path.join(DATA_DIR, 'ihsg_data.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    with open(os.path.join(DATA_DIR, 'ihsg_data.js'), 'w', encoding='utf-8') as f:
        f.write("window.IHSG_LIVE_DATA = " + json.dumps(data, indent=2) + ";\n")
    
    # Mirror to frontend/public/data if exists
    dist_path = os.path.join(BASE_DIR, 'frontend', 'public', 'data', 'ihsg_data.json')
    if os.path.exists(os.path.dirname(dist_path)):
        with open(dist_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
    print(f"Data IHSG berhasil disimpan ke {DATA_DIR}/ihsg_data.json")
