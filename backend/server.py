import http.server
import socketserver
import json
import os
import urllib.parse
import time
import socket
import requests

# Prioritaskan IPv4 untuk mempercepat panggilan API eksternal (Invezgo & Gemini)
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_first_getaddrinfo(*args, **kwargs):
    res = _orig_getaddrinfo(*args, **kwargs)
    return sorted(res, key=lambda x: 0 if x[0] == socket.AF_INET else 1)
socket.getaddrinfo = _ipv4_first_getaddrinfo
from fetch_market_data import fetch_single, fetch_intraday, fetch_all_initial
from fetch_news import get_news
from ai_analyst import analyze_market_instrument
from chatbot_agent import run_chatbot_conversation, analyze_chat_intent_and_estimate
from invezgo_client import fetch_company_complete_invezgo, fetch_whale_network_invezgo
from financial_insight_engine import get_or_generate_financial_insight
from db_manager import (
    save_single_market_quote_db,
    save_market_quotes_bulk_db,
    load_all_market_quotes_db,
    save_corporate_events_db,
    get_corporate_events_db,
)

_intraday_mem_cache: dict[str, tuple[float, list]] = {}
INTRADAY_TTL = 10 * 60  # 10 menit hemat request

PORT = 8080
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BASE_DIR, 'data')
FRONTEND_DIST = os.path.join(BASE_DIR, 'frontend', 'dist')
LEGACY_DIR = os.path.join(BASE_DIR, 'legacy')

def get_data_file(filename):
    for d in (DATA_DIR, BASE_DIR, BACKEND_DIR):
        p = os.path.join(d, filename)
        if os.path.exists(p):
            return p
    return os.path.join(DATA_DIR, filename)

def get_market_cache():
    json_path = get_data_file('market_data.json')
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'market' in data:
                    return data['market']
                return data
        except Exception:
            pass
    return load_all_market_quotes_db()

def get_full_bundle():
    json_path = get_data_file('market_data.json')
    bundle = {'market': {}, 'emitens': [], 'events': []}
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                bundle = json.load(f)
        except Exception:
            pass
    if not bundle.get('market'):
        bundle['market'] = get_market_cache()
    db_events = get_corporate_events_db()
    if db_events:
        bundle['events'] = db_events
    return bundle

def save_market_cache(cache):
    json_path = os.path.join(DATA_DIR, 'market_data.json')
    js_path = os.path.join(DATA_DIR, 'market_data.js')
    
    emiten_list = []
    emitens_json_path = get_data_file('emitens.json')
    if os.path.exists(emitens_json_path):
        try:
            with open(emitens_json_path, 'r', encoding='utf-8') as ef:
                emiten_list = json.load(ef)
        except Exception:
            pass

    corporate_events = get_corporate_events_db()
    if not corporate_events:
        events_json_path = get_data_file('corporate_events.json')
        if os.path.exists(events_json_path):
            try:
                with open(events_json_path, 'r', encoding='utf-8') as evf:
                    raw_events = json.load(evf)
                    save_corporate_events_db(raw_events)
                    corporate_events = get_corporate_events_db() or raw_events
            except Exception:
                pass

    bundle = {'market': cache, 'emitens': emiten_list, 'events': corporate_events}
    
    # Save to data/ + SQLite DB
    os.makedirs(DATA_DIR, exist_ok=True)
    save_market_quotes_bulk_db(cache)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(bundle, f, indent=2)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("window.MARKET_DATA = " + json.dumps(cache, indent=2) + ";\n")
        if emiten_list:
            f.write("window.EMITEN_LIST = " + json.dumps(emiten_list, indent=2) + ";\n")
        if corporate_events:
            f.write("window.CORPORATE_EVENTS = " + json.dumps(corporate_events, indent=2) + ";\n")
        if 'IHSG' in cache:
            f.write("window.IHSG_LIVE_DATA = window.MARKET_DATA['IHSG'];\n")

    # Mirror to BASE_DIR and FRONTEND_DIST/data
    try:
        with open(os.path.join(BASE_DIR, 'market_data.json'), 'w', encoding='utf-8') as f:
            json.dump(bundle, f, indent=2)
        dist_data = os.path.join(FRONTEND_DIST, 'data')
        if os.path.exists(dist_data):
            with open(os.path.join(dist_data, 'market_data.json'), 'w', encoding='utf-8') as f:
                json.dump(bundle, f, indent=2)
    except Exception:
        pass


class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        static_dir = FRONTEND_DIST if os.path.exists(FRONTEND_DIST) else BASE_DIR
        super().__init__(*args, directory=static_dir, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 1. API: Full bundle for React
        if path in ('/api/market-data', '/api/all', '/api/initial-data'):
            force_refresh = 'refresh' in query and query['refresh'][0].lower() in ('1', 'true', 'yes')
            if force_refresh:
                try:
                    fresh_market = fetch_all_initial()
                    if fresh_market:
                        cache = get_market_cache()
                        cache.update(fresh_market)
                        save_market_cache(cache)
                except Exception as e:
                    print(f"[API /api/market-data refresh error] {e}")
            bundle = get_full_bundle()
            payload = json.dumps(bundle, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 1b. API: /api/emitens, /api/stocks
        if path in ('/api/emitens', '/api/stocks'):
            emitens_json_path = get_data_file('emitens.json')
            if os.path.exists(emitens_json_path):
                with open(emitens_json_path, 'rb') as ef:
                    payload = ef.read()
            else:
                payload = json.dumps([]).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 1c. API: /api/top-foreign (hemat token, refresh 1x per hari)
        if path == '/api/top-foreign':
            force_refresh = 'refresh' in query and query['refresh'][0].lower() in ('1', 'true', 'yes')
            try:
                from fetch_top_foreign import fetch_top_foreign
                top_data = fetch_top_foreign(force=force_refresh)
            except Exception as e:
                print(f"[API /api/top-foreign error] {e}")
                top_data = {"top_tickers": ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'AMMN', 'ADRO', 'ICBP', 'GOTO'], "items": []}
            payload = json.dumps(top_data, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # 2. API: /api/ihsg, /api/stock, /api/chart (Hemat Request: Gunakan cache kecuali force=1 atau belum ada ohlc)
        if path in ('/api/ihsg', '/api/stock', '/api/chart'):
            ticker = 'IHSG'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            force = (
                ('force' in query and query['force'][0].lower() in ('1', 'true', 'yes'))
                or ('refresh' in query and query['refresh'][0].lower() in ('1', 'true', 'yes'))
            )
            
            try:
                cache = get_market_cache()
                existing_item = cache.get(ticker)
                if not force and existing_item and existing_item.get('ohlc') and len(existing_item['ohlc']) >= 2:
                    payload = json.dumps(existing_item).encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Content-Length', str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                    return

                print(f"[API] Mengambil chart harian (1 request) dari Invezgo untuk: {ticker}")
                data = fetch_single(ticker, existing_data=existing_item)
                if existing_item and existing_item.get('intraday') and not data.get('intraday'):
                    data['intraday'] = existing_item['intraday']
                
                cache[ticker] = data
                save_single_market_quote_db(ticker, data)
                save_market_cache(cache)

                payload = json.dumps(data).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API Error] {e}")
                err_payload = json.dumps({'error': str(e), 'ticker': ticker}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 2b. API: /api/intraday (Chart Daily / 1 Hari Menit-demi-Menit dari Invezgo API, Hemat Request)
        if path == '/api/intraday':
            ticker = 'IHSG'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            force = (
                ('force' in query and query['force'][0].lower() in ('1', 'true', 'yes'))
                or ('refresh' in query and query['refresh'][0].lower() in ('1', 'true', 'yes'))
            )
            now = time.time()
            try:
                if not force and ticker in _intraday_mem_cache:
                    ts, cached_bars = _intraday_mem_cache[ticker]
                    if (now - ts) < INTRADAY_TTL and cached_bars:
                        payload = json.dumps({'ticker': ticker, 'intraday': cached_bars, 'cached': True}).encode('utf-8')
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.send_header('Content-Length', str(len(payload)))
                        self.end_headers()
                        self.wfile.write(payload)
                        return

                cache = get_market_cache()
                existing_item = cache.get(ticker, {})
                if not force and existing_item.get('intraday') and len(existing_item['intraday']) >= 2:
                    bars = existing_item['intraday']
                    _intraday_mem_cache[ticker] = (now, bars)
                    payload = json.dumps({'ticker': ticker, 'intraday': bars, 'cached': True}).encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Content-Length', str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                    return

                print(f"[API] Mengambil chart Intraday 1D (1 request) dari Invezgo untuk: {ticker}")
                bars = fetch_intraday(ticker)
                _intraday_mem_cache[ticker] = (now, bars)
                if ticker in cache and isinstance(cache[ticker], dict):
                    cache[ticker]['intraday'] = bars
                    save_market_cache(cache)

                payload = json.dumps({'ticker': ticker, 'intraday': bars, 'cached': False}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API/intraday Error] {e}")
                err_payload = json.dumps({'error': str(e), 'ticker': ticker}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 2c. API: /api/invezgo-usage (Cek kuota, limit & logs langsung dari Invezgo API)
        if path == '/api/invezgo-usage':
            try:
                from invezgo_client import get_auth_headers, INVEZGO_BASE_URL
                headers = get_auth_headers()
                
                # GET /usage/api
                r_quota = requests.get(f"{INVEZGO_BASE_URL}/usage/api", headers=headers, timeout=8)
                quota_data = r_quota.json() if r_quota.status_code == 200 else {"error": r_quota.text}
                
                # GET /usage/logs
                r_logs = requests.get(f"{INVEZGO_BASE_URL}/usage/logs", headers=headers, timeout=8)
                logs_data = r_logs.json() if r_logs.status_code == 200 else []
                
                res_payload = json.dumps({
                    "quota": quota_data,
                    "logs": logs_data,
                    "status": "success"
                }, ensure_ascii=False).encode('utf-8')
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(res_payload)))
                self.end_headers()
                self.wfile.write(res_payload)
                return
            except Exception as e:
                print(f"[API/invezgo-usage Error] {e}")
                err_payload = json.dumps({'error': str(e), 'status': 'error'}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 2c. API: /api/company-detail (Laporan Keuangan 5 Kuartal, Profil, KSEI, & Keterbukaan Informasi via SQLite DB)
        if path == '/api/company-detail':
            ticker = 'BBCA'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            force = (
                ('force' in query and query['force'][0].lower() in ('1', 'true', 'yes'))
                or ('refresh' in query and query['refresh'][0].lower() in ('1', 'true', 'yes'))
            )
            try:
                res = fetch_company_complete_invezgo(ticker, force=force)
                if res.get('cachedDb'):
                    print(f"[API /api/company-detail] Memuat {ticker} dari SQLite DB lokal (0 request API)")
                else:
                    print(f"[API /api/company-detail] Mengambil data baru {ticker} dari Invezgo ({res.get('apiRequestsUsed', 0)} request API) & simpan ke SQLite DB")
                payload = json.dumps(res, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API/company-detail Error] {e}")
                err_payload = json.dumps({'error': str(e), 'ticker': ticker}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 2c-2. API: /api/financial-insight (Smart Financial Summary & Health Insight dengan auto-update on new data)
        if path == '/api/financial-insight':
            ticker = 'BBCA'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            elif 'symbol' in query and query['symbol']:
                ticker = query['symbol'][0].upper().strip()
            force = (
                ('force' in query and query['force'][0].lower() in ('1', 'true', 'yes'))
                or ('refresh' in query and query['refresh'][0].lower() in ('1', 'true', 'yes'))
            )
            try:
                res = get_or_generate_financial_insight(ticker, force_refresh=force)
                payload = json.dumps(res, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API/financial-insight Error] {e}")
                err_payload = json.dumps({'error': str(e), 'ticker': ticker}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 2d. API: /api/whale-network (Peta Jaring-Jaring Kepemilikan Saham & Whale Tracker KSEI via SQLite DB)
        if path == '/api/whale-network':
            holder_name = query.get('name', [None])[0]
            ticker_param = query.get('ticker', [None])[0]
            force = (
                ('force' in query and query['force'][0].lower() in ('1', 'true', 'yes'))
                or ('refresh' in query and query['refresh'][0].lower() in ('1', 'true', 'yes'))
            )
            try:
                res = fetch_whale_network_invezgo(
                    holder_name=holder_name, ticker=ticker_param, force=force
                )
                payload = json.dumps(res, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API/whale-network Error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 3. API: /api/news
        if path == '/api/news':
            ticker = 'IHSG'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            force = (
                ('force' in query and query['force'][0].lower() in ('1', 'true', 'yes'))
                or ('refresh' in query and query['refresh'][0].lower() in ('1', 'true', 'yes'))
            )
            try:
                print(f"[API] Permintaan berita untuk: {ticker} (force={force})")
                news_data = get_news(ticker, force_refresh=force)
                payload = json.dumps(news_data, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API/news Error] {e}")
                err_payload = json.dumps({'error': str(e), 'ticker': ticker}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 4. API: /api/ai-analysis
        if path == '/api/ai-analysis':
            ticker = 'IHSG'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            
            force = 'force' in query and query['force'][0].lower() in ('1', 'true', 'yes')
            
            tech_data = {
                "price": query.get('price', ['—'])[0],
                "change": query.get('change', ['—'])[0],
                "period": query.get('period', ['3M'])[0],
                "ma20": query.get('ma20', ['—'])[0],
                "ma50": query.get('ma50', ['—'])[0],
                "rsi": query.get('rsi', ['50'])[0],
                "support": query.get('support', ['—'])[0],
                "resistance": query.get('resistance', ['—'])[0],
                "above_ma20": query.get('above_ma20', ['true'])[0].lower() == 'true',
                "above_ma50": query.get('above_ma50', ['true'])[0].lower() == 'true',
            }
            try:
                print(f"[API] Permintaan Analisis AI untuk: {ticker} (force={force})")
                analysis_res = analyze_market_instrument(ticker, tech_data, force_refresh=force)
                payload = json.dumps(analysis_res, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API/ai-analysis Error] {e}")
                err_payload = json.dumps({'error': str(e), 'ticker': ticker}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 5. Static Admin Console support
        if path == '/admin.html':
            admin_file = os.path.join(LEGACY_DIR, 'admin.html')
            if not os.path.exists(admin_file):
                admin_file = os.path.join(BASE_DIR, 'admin.html')
            if os.path.exists(admin_file):
                with open(admin_file, 'rb') as af:
                    content = af.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        # 6. Legacy single-page interactive dashboard support
        if path in ('/legacy', '/legacy/', '/legacy/index.html', '/PintarSaham_Dashboard_Interaktif.html'):
            legacy_file = os.path.join(LEGACY_DIR, 'PintarSaham_Dashboard_Interaktif.html')
            if not os.path.exists(legacy_file):
                legacy_file = os.path.join(BASE_DIR, 'PintarSaham_Dashboard_Interaktif.html')
            if os.path.exists(legacy_file):
                with open(legacy_file, 'rb') as lf:
                    content = lf.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        # 7. Fallback for SPA routing: if route (no file extension) doesn't exist, serve frontend/dist/index.html
        static_dir = FRONTEND_DIST if os.path.exists(FRONTEND_DIST) else BASE_DIR
        local_path = os.path.normpath(os.path.join(static_dir, path.lstrip('/')))
        _, ext = os.path.splitext(path)
        if not os.path.exists(local_path) and not path.startswith('/api/') and not ext:
            index_path = os.path.join(FRONTEND_DIST, 'index.html')
            if os.path.exists(index_path):
                with open(index_path, 'rb') as inf:
                    content = inf.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/ai-chat-estimate':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}
                text = data.get('text', '')
                estimate_res = analyze_chat_intent_and_estimate(text)
                payload = json.dumps(estimate_res, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        if parsed.path == '/api/ai-chat':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}
                messages = data.get('messages', [])
                print(f"[API POST /api/ai-chat] Memproses percakapan ({len(messages)} pesan)")
                chat_res = run_chatbot_conversation(messages)
                payload = json.dumps(chat_res, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API POST /api/ai-chat Error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        if parsed.path == '/api/ai-analysis':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}
                ticker = data.get('ticker', 'IHSG').upper().strip()
                tech_data = data.get('technical', {})
                force = bool(data.get('force', False))
                
                print(f"[API POST] Permintaan Analisis AI untuk: {ticker}")
                analysis_res = analyze_market_instrument(ticker, tech_data, force_refresh=force)
                payload = json.dumps(analysis_res, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API POST /ai-analysis Error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        self.send_response(404)
        self.end_headers()

def main():
    import threading
    os.chdir(BACKEND_DIR)
    js_path = get_data_file('market_data.js')
    if not os.path.exists(js_path):
        print("Bundle data awal belum ada, mengunduh dari Invezgo API...")
        try:
            fresh = fetch_all_initial()
            if fresh:
                save_market_cache(fresh)
        except Exception as err:
            print(f"Gagal mengambil bundle awal: {err}")
    else:
        def _bg_sync_if_needed():
            try:
                cache = get_market_cache()
                save_market_quotes_bulk_db(cache)
                ihsg_cached = cache.get('IHSG', {})
                ihsg_live = fetch_single('IHSG', existing_data=ihsg_cached)
                latest_raw_date = ihsg_live.get('rawDate')
                cached_raw_date = ihsg_cached.get('rawDate')
                if latest_raw_date and latest_raw_date != cached_raw_date:
                    print(f"[Auto-Sync] Data pasar baru terdeteksi ({latest_raw_date} vs {cached_raw_date}), memperbarui bundle Invezgo...")
                    fresh = fetch_all_initial()
                    if fresh:
                        cache.update(fresh)
                        save_market_cache(cache)
                        print("[Auto-Sync] Bundle pasar berhasil diperbarui.")
                elif ihsg_cached.get('gainers') is None and ihsg_live.get('gainers') is not None:
                    if ihsg_cached.get('intraday') and not ihsg_live.get('intraday'):
                        ihsg_live['intraday'] = ihsg_cached['intraday']
                    cache['IHSG'] = ihsg_live
                    save_market_cache(cache)
                    print("[Auto-Sync] Statistik Gainers/Losers/Turnover IHSG berhasil disinkronkan ke DB.")
            except Exception as e_sync:
                print(f"[Auto-Sync Warning] {e_sync}")
        threading.Thread(target=_bg_sync_if_needed, daemon=True).start()

    class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True
        allow_reuse_address = True

    try:
        with ThreadedServer(("", PORT), CustomHandler) as httpd:
            print(f"PintarSaham Local Server aktif di http://localhost:{PORT}")
            print(f"Buka: http://localhost:{PORT}/")
            print("Tekan Ctrl+C untuk menghentikan server.")
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}")

if __name__ == '__main__':
    main()

