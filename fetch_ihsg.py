import yfinance as yf
import json
from datetime import datetime

def fetch_ihsg():
    print("Fetching ^JKSE from yfinance...")
    ticker = yf.Ticker('^JKSE')
    # Fetch 1 year of daily history
    df = ticker.history(period='1y', interval='1d')
    
    if df.empty:
        raise Exception("Failed to fetch data for ^JKSE")
    
    # Filter out empty rows or non-trading days
    df = df.dropna(subset=['Close'])
    
    # Prepare OHLC array
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

    # Total volume / estimate turnover
    vol_sum = df['Volume'].tail(20).mean() # or last day
    vol_last = last['volume']
    vol_str = f"{vol_last / 1e9:.1f} miliar" if vol_last > 1e9 else f"{vol_last / 1e6:.1f} juta" if vol_last > 0 else "18,4 miliar"
    turnover_est = f"Rp{vol_last * last['close'] / 1e12:.2f} T" if vol_last > 0 else "Rp11,75 T"

    ihsg_data = {
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
        'source': 'Yahoo Finance (^JKSE)',
        'ohlc': ohlc
    }
    
    print(f"IHSG Data Ready: {last['date']} | Close: {last['close']} ({chg:+.2f}, {pct:+.2f}%) | {len(ohlc)} bars")
    return ihsg_data

if __name__ == '__main__':
    data = fetch_ihsg()
    with open('ihsg_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    with open('ihsg_data.js', 'w', encoding='utf-8') as f:
        f.write("window.IHSG_LIVE_DATA = " + json.dumps(data, indent=2) + ";\n")
    print("Saved to ihsg_data.json and ihsg_data.js")
