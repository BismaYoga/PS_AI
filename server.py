import http.server
import socketserver
import json
import os
import urllib.parse
from fetch_market_data import fetch_single, fetch_all_initial
from fetch_news import get_news
from ai_analyst import analyze_market_instrument

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_market_cache():
    json_path = os.path.join(DIRECTORY, 'market_data.json')
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'market' in data:
                    return data['market']
                return data
        except Exception:
            pass
    return {}

def save_market_cache(cache):
    json_path = os.path.join(DIRECTORY, 'market_data.json')
    js_path = os.path.join(DIRECTORY, 'market_data.js')
    
    emiten_list = []
    emitens_json_path = os.path.join(DIRECTORY, 'emitens.json')
    if os.path.exists(emitens_json_path):
        try:
            with open(emitens_json_path, 'r', encoding='utf-8') as ef:
                emiten_list = json.load(ef)
        except Exception:
            pass

    corporate_events = []
    events_json_path = os.path.join(DIRECTORY, 'corporate_events.json')
    if os.path.exists(events_json_path):
        try:
            with open(events_json_path, 'r', encoding='utf-8') as evf:
                corporate_events = json.load(evf)
        except Exception:
            pass

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({'market': cache, 'emitens': emiten_list, 'events': corporate_events}, f, indent=2)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("window.MARKET_DATA = " + json.dumps(cache, indent=2) + ";\n")
        if emiten_list:
            f.write("window.EMITEN_LIST = " + json.dumps(emiten_list, indent=2) + ";\n")
        if corporate_events:
            f.write("window.CORPORATE_EVENTS = " + json.dumps(corporate_events, indent=2) + ";\n")
        if 'IHSG' in cache:
            f.write("window.IHSG_LIVE_DATA = window.MARKET_DATA['IHSG'];\n")

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Support /api/ihsg, /api/stock, /api/chart
        if path in ('/api/ihsg', '/api/stock', '/api/chart'):
            ticker = 'IHSG'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            
            try:
                print(f"[API] Permintaan data pasar untuk: {ticker}")
                data = fetch_single(ticker)
                
                # Update persistent bundle
                cache = get_market_cache()
                cache[ticker] = data
                save_market_cache(cache)

                # Send response
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

        # /api/news?ticker=IHSG  — Berita real-time via Gemini ADK + Google Search
        if path == '/api/news':
            ticker = 'IHSG'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            try:
                print(f"[API] Permintaan berita untuk: {ticker}")
                news_data = get_news(ticker)
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

        # /api/ai-analysis — Ringkasan AI memadukan data teknikal chart & 3 berita terkini
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

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
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

if __name__ == '__main__':
    js_path = os.path.join(DIRECTORY, 'market_data.js')
    if not os.path.exists(js_path):
        print("Bundle data awal belum ada, mengunduh dari yfinance...")
        try:
            fetch_all_initial()
        except Exception as err:
            print(f"Gagal mengambil bundle awal: {err}")

    class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True
        allow_reuse_address = True

    try:
        with ThreadedServer(("", PORT), CustomHandler) as httpd:
            print(f"PintarSaham Local Server aktif di http://localhost:{PORT}")
            print(f"Buka: http://localhost:{PORT}/PintarSaham_Dashboard_Interaktif.html")
            print("Tekan Ctrl+C untuk menghentikan server.")
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}")
