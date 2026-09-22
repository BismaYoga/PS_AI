import yfinance as yf
import json
import os
from datetime import datetime
import concurrent.futures

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Load 69 emitens catalog
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
    'Konsumer Non-Siklikal': 15.0,
    'Konsumer Primer': 15.0,
    'Konsumer Siklikal': 12.5,
    'Kesehatan': 22.0,
    'Infrastruktur': 13.5,
    'Komunikasi': 14.0,
    'Energi': 7.5,
    'Bahan Baku': 12.0,
    'Perindustrian': 9.0,
    'Properti & Real Estat': 8.5,
    'Teknologi': 18.0,
    'Utilitas': 10.0
}

def get_target_pe(ticker, sector=None):
    if ticker in TICKER_TARGET_PE:
        return TICKER_TARGET_PE[ticker]
    if not sector and ticker in EMITEN_MAP:
        sector = EMITEN_MAP[ticker].get('sector')
    if sector and sector in SECTOR_TARGET_PE:
        return SECTOR_TARGET_PE[sector]
    return 12.0

def fetch_single(ticker_symbol):
    """
    Fetch 1 year daily OHLC for either IHSG (^JKSE) or an Indonesian stock (<TICKER>.JK).
    """
    clean_sym = ticker_symbol.upper().strip()
    yf_symbol = '^JKSE' if clean_sym == 'IHSG' else f"{clean_sym}.JK"
    
    t = yf.Ticker(yf_symbol)
    df = t.history(period='1y', interval='1d')
    
    if df.empty:
        raise Exception(f"Tidak ada data ditemukan untuk {yf_symbol}")
    
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
            trailing_eps = info.get('trailingEps')
            forward_eps = info.get('forwardEps')
            book_value = info.get('bookValue')
            trailing_pe = info.get('trailingPE')
            price_to_book = info.get('priceToBook')
            dividend_yield = info.get('dividendYield')
            roe = info.get('returnOnEquity')
            market_cap = info.get('marketCap')

            eps_val = None
            if trailing_eps is not None and trailing_eps > 0:
                eps_val = float(trailing_eps)
            elif forward_eps is not None and forward_eps > 0:
                eps_val = float(forward_eps)

            target_pe = get_target_pe(clean_sym, sector_name)

            bvps_val = float(book_value) if (book_value is not None and book_value > 0) else None

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
                'dividendYield': round(float(dividend_yield) * 100, 2) if dividend_yield is not None else None,
                'marketCap': market_cap,
                'summary': info.get('longBusinessSummary')
            }
        except Exception as e_info:
            print(f"Warning fetching fundamental info for {clean_sym}: {e_info}")

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
        'source': f'Yahoo Finance ({yf_symbol})',
        'isStock': clean_sym != 'IHSG',
        'ohlc': ohlc
    }
    if fundamentals:
        res.update(fundamentals)
    return res

def fetch_all_initial():
    """
    Fetch IHSG and ALL 69 emitens in parallel to populate the complete offline market data bundle.
    """
    tickers = ['IHSG']
    if EMITENS_CATALOG:
        tickers += [e['ticker'] for e in EMITENS_CATALOG if e.get('ticker') not in tickers]
    else:
        tickers += ['BBCA', 'BBRI', 'TLKM', 'ASII', 'ICBP', 'MIKA', 'BMRI', 'BBNI', 'ADRO', 'GOTO']

    bundle = {}
    print(f"Mengunduh data pasar real-time untuk {len(tickers)} instrumen secara paralel...")
    
    def worker(sym):
        try:
            data = fetch_single(sym)
            return sym, data, None
        except Exception as e:
            return sym, None, str(e)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(worker, sym): sym for sym in tickers}
        for future in concurrent.futures.as_completed(futures):
            sym, data, err = future.result()
            if data:
                bundle[sym] = data
                mos_str = f"MOS: {data.get('mos')}%" if data.get('mos') is not None else "No MOS"
                print(f"[OK] {sym:5s} -> Close: {data['price']:>7} ({data['changePct']:>+6.2f}%) | {mos_str}")
            else:
                print(f"[FAIL] {sym:5s} -> {err}")

    # Write to market_data.json & market_data.js
    json_path = os.path.join(DIRECTORY, 'market_data.json')
    js_path = os.path.join(DIRECTORY, 'market_data.js')
    
    # Load corporate events
    corporate_events = []
    events_json_path = os.path.join(DIRECTORY, 'corporate_events.json')
    if os.path.exists(events_json_path):
        try:
            with open(events_json_path, 'r', encoding='utf-8') as evf:
                corporate_events = json.load(evf)
        except Exception:
            pass

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({'market': bundle, 'emitens': EMITENS_CATALOG, 'events': corporate_events}, f, indent=2)
        
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("window.MARKET_DATA = " + json.dumps(bundle, indent=2) + ";\n")
        f.write("window.EMITEN_LIST = " + json.dumps(EMITENS_CATALOG, indent=2) + ";\n")
        if corporate_events:
            f.write("window.CORPORATE_EVENTS = " + json.dumps(corporate_events, indent=2) + ";\n")
        if 'IHSG' in bundle:
            f.write("window.IHSG_LIVE_DATA = window.MARKET_DATA['IHSG'];\n")
            
    print(f"\nBundle berhasil disimpan: {len(bundle)} instrumen & {len(corporate_events)} agenda pasar di market_data.json dan market_data.js")
    return bundle

if __name__ == '__main__':
    fetch_all_initial()
