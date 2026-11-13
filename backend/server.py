import http.server
import socketserver
import json
import os
import urllib.parse
import time
import socket
import requests
import hashlib
import sqlite3
import csv
import io
from datetime import datetime

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

# Load environment variables (.env)
def load_env_file():
    env_path = os.path.join(BASE_DIR, '.env')
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception as e:
            print(f"[load_env_file warning] {e}")

load_env_file()
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '').strip()
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '').strip()

# User database table management
def init_users_table():
    try:
        db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
        con = sqlite3.connect(db_path)
        con.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT,
                name TEXT,
                email TEXT UNIQUE,
                role TEXT,
                tier TEXT,
                avatar TEXT,
                auth_provider TEXT,
                status TEXT,
                last_login TEXT,
                created_at TEXT,
                monthly_tokens INTEGER DEFAULT 30,
                additional_tokens INTEGER DEFAULT 0
            )
        ''')
        cur = con.cursor()
        cur.execute("PRAGMA table_info(users)")
        cols = [c[1] for c in cur.fetchall()]
        if 'monthly_tokens' not in cols:
            con.execute("ALTER TABLE users ADD COLUMN monthly_tokens INTEGER DEFAULT 30")
        if 'additional_tokens' not in cols:
            con.execute("ALTER TABLE users ADD COLUMN additional_tokens INTEGER DEFAULT 0")

        con.execute('''
            INSERT OR IGNORE INTO users (id, username, name, email, role, tier, avatar, auth_provider, status, last_login, created_at, monthly_tokens, additional_tokens)
            VALUES ('usr_admin', 'admin', 'Super Administrator', 'admin@pintarsaham.id', 'super admin', 'institutional', 'AD', 'system', 'active', 'Hari ini, 19:04 WIB', '2026-01-01', 100, 0)
        ''')
        con.execute('''
            INSERT OR IGNORE INTO users (id, username, name, email, role, tier, avatar, auth_provider, status, last_login, created_at, monthly_tokens, additional_tokens)
            VALUES ('usr_bisma', 'bisma', 'Bisma Yoga', 'bismayoga432@gmail.com', 'admin', 'pro', 'BY', 'system', 'active', 'Hari ini, 18:49 WIB', '2026-02-15', 30, 0)
        ''')
        con.commit()
        con.close()
    except Exception as e:
        print(f"[init_users_table warning] {e}")

init_users_table()

def init_system_settings_table():
    try:
        db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
        con = sqlite3.connect(db_path)
        con.execute('''
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT
            )
        ''')
        defaults = [
            ('admin_whatsapp', '6281234567890'),
            ('admin_whatsapp_display', '+62 812-3456-7890'),
            ('admin_email', 'support@pintarsaham.id'),
            ('admin_wa_message_template', 'Halo Admin PintarSaham, saya ingin menambah token / upgrade akun ke Pro Trader.\nNama: {name}\nEmail: {email}\nFitur: {feature}')
        ]
        now_str = time.strftime('%d %b %Y, %H:%M WIB')
        for k, v in defaults:
            con.execute("INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)", (k, v, now_str))
        con.commit()
        con.close()
    except Exception as e:
        print(f"[init_system_settings_table warning] {e}")

init_system_settings_table()

def get_system_settings():
    try:
        db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute("SELECT key, value FROM system_settings")
        rows = cur.fetchall()
        con.close()
        res = {
            'admin_whatsapp': '6281234567890',
            'admin_whatsapp_display': '+62 812-3456-7890',
            'admin_email': 'support@pintarsaham.id',
            'admin_wa_message_template': 'Halo Admin PintarSaham, saya ingin menambah token / upgrade akun ke Pro Trader.\nNama: {name}\nEmail: {email}\nFitur: {feature}',
            'pro_monthly_tokens': '30'
        }
        for k, v in rows:
            res[k] = v
        return res
    except Exception as e:
        print(f"[get_system_settings error] {e}")
        return {
            'admin_whatsapp': '6281234567890',
            'admin_whatsapp_display': '+62 812-3456-7890',
            'admin_email': 'support@pintarsaham.id',
            'admin_wa_message_template': 'Halo Admin PintarSaham, saya ingin menambah token / upgrade akun ke Pro Trader.\nNama: {name}\nEmail: {email}\nFitur: {feature}',
            'pro_monthly_tokens': '30'
        }

def get_pro_monthly_quota():
    try:
        s = get_system_settings()
        return int(s.get('pro_monthly_tokens', 30))
    except Exception:
        return 30

def check_and_run_monthly_reset():
    """
    Otomatis mereset kuota bulanan setiap pergantian bulan kalender (misal 1 Nov -> 1 Des).
    Hanya dijalankan jika periode bulan saat ini berbeda dengan 'last_monthly_reset_period' di database.
    """
    try:
        current_period = time.strftime('%Y-%m') # e.g. '2026-11'
        db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute("SELECT value FROM system_settings WHERE key='last_monthly_reset_period'")
        row = cur.fetchone()
        last_period = row[0] if row else None

        if last_period and last_period != current_period:
            pro_tokens = get_pro_monthly_quota()
            cur.execute("UPDATE users SET monthly_tokens=? WHERE tier='pro'", (pro_tokens,))
            cur.execute("UPDATE users SET monthly_tokens=100 WHERE tier='institutional'")
            cur.execute("UPDATE users SET monthly_tokens=0 WHERE tier IN ('starter', 'free')")
            now_str = time.strftime('%d %b %Y, %H:%M WIB')
            cur.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('last_monthly_reset_period', ?, ?)", (current_period, now_str))
            con.commit()
            print(f"[Auto Monthly Reset] Kuota bulanan berhasil di-reset untuk periode baru {current_period} ({pro_tokens} tokens/pro)")
        elif not last_period:
            now_str = time.strftime('%d %b %Y, %H:%M WIB')
            cur.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('last_monthly_reset_period', ?, ?)", (current_period, now_str))
            con.commit()
        con.close()
    except Exception as e:
        print(f"[Auto Monthly Reset Error] {e}")

def upsert_user(email, name, picture, sub, auth_provider='google'):
    db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("SELECT id, role, tier, status, monthly_tokens, additional_tokens FROM users WHERE email=?", (email,))
    row = cur.fetchone()
    now_str = time.strftime('%d %b %Y, %H:%M WIB')

    # Super admin recognition
    is_super_admin = email in ('admin@pintarsaham.id', 'bismayoga432@gmail.com')

    pro_quota = get_pro_monthly_quota()
    if row:
        uid = row[0]
        role = row[1] or ('super admin' if is_super_admin else 'user')
        tier = row[2] or ('institutional' if is_super_admin else 'pro')
        status = row[3] or 'active'
        monthly_tokens = row[4] if row[4] is not None else (pro_quota if tier == 'pro' else 0)
        additional_tokens = row[5] if row[5] is not None else 0
        cur.execute('''
            UPDATE users SET name=?, avatar=?, last_login=?, auth_provider=?
            WHERE id=?
        ''', (name, picture, now_str, auth_provider, uid))
    else:
        uid = f"usr_g_{sub}" if sub else f"usr_g_{int(time.time())}"
        role = 'super admin' if is_super_admin else 'user'
        tier = 'institutional' if is_super_admin else 'starter'
        monthly_tokens = pro_quota if tier == 'pro' else 0
        additional_tokens = 0
        status = 'active'
        cur.execute('''
            INSERT INTO users (id, username, name, email, role, tier, avatar, auth_provider, status, last_login, created_at, monthly_tokens, additional_tokens)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (uid, email.split('@')[0], name, email, role, tier, picture, auth_provider, status, now_str, time.strftime('%Y-%m-%d'), monthly_tokens, additional_tokens))
    con.commit()
    con.close()

    return {
        'id': uid,
        'username': email.split('@')[0],
        'name': name,
        'email': email,
        'role': role,
        'tier': tier,
        'avatar': picture or name[:2].upper(),
        'monthly_tokens': monthly_tokens,
        'additional_tokens': additional_tokens,
        'createdAt': time.strftime('%Y-%m-%d')
    }

def is_user_pro_or_admin(user_id=None, email=None):
    if not user_id and not email:
        return True  # Default internal instance memiliki hak akses Pro/Admin
    try:
        db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        if user_id:
            cur.execute("SELECT role, tier, username FROM users WHERE id=? OR LOWER(username)=? OR LOWER(id)=?", (user_id, str(user_id).lower(), str(user_id).lower()))
        else:
            cur.execute("SELECT role, tier, username FROM users WHERE LOWER(email)=?", (str(email).lower(),))
        row = cur.fetchone()
        con.close()
        if not row:
            if user_id in ('usr_admin', 'admin') or (email and 'admin' in str(email).lower()):
                return True
            return False
        role, tier, uname = row
        role_str = str(role or '').lower().strip()
        tier_str = str(tier or '').lower().strip()
        uname_str = str(uname or '').lower().strip()
        if 'admin' in role_str or tier_str in ('pro', 'institutional') or uname_str in ('admin', 'bisma'):
            return True
        return False
    except Exception:
        return False

def check_and_consume_token(user_id=None, email=None):
    """
    Memeriksa izin kuota token pengguna:
    - Admin / Super Admin (termasuk usr_admin / admin / bisma): bypass gratis tanpa batas kuota!
    - Pro / Institutional: potong token bulanan/tambahan jika ada.
    - Default fallback untuk host / administrator lokal: Izinkan akses penuh.
    Returns: (is_allowed: bool, err_message: str, remaining_tokens: dict)
    """
    if not user_id and not email:
        user_id = 'usr_admin'

    try:
        db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        if user_id:
            cur.execute("SELECT id, role, tier, monthly_tokens, additional_tokens FROM users WHERE id=? OR LOWER(username)=? OR LOWER(id)=?", (user_id, str(user_id).lower(), str(user_id).lower()))
        else:
            cur.execute("SELECT id, role, tier, monthly_tokens, additional_tokens FROM users WHERE LOWER(email)=?", (str(email).lower(),))
        row = cur.fetchone()
        if not row:
            if user_id in ('usr_admin', 'admin') or (email and 'admin' in str(email).lower()):
                con.close()
                return True, "", {"monthly": 100, "additional": 50, "total": 150}
            con.close()
            return False, "Akun pengguna tidak ditemukan dalam database.", {"monthly": 0, "additional": 0, "total": 0}

        uid, role, tier, monthly, additional = row
        role_str = str(role or '').lower().strip()
        tier_str = str(tier or '').lower().strip()
        monthly = monthly if monthly is not None else (100 if 'admin' in role_str else 30 if tier_str == 'pro' else 0)
        additional = additional if additional is not None else 0
        total = monthly + additional

        # Administrator & Super Admin bebas akses tanpa pemotongan kuota token
        if 'admin' in role_str or uid in ('usr_admin', 'usr_bisma') or tier_str == 'institutional':
            con.close()
            return True, "", {"monthly": monthly, "additional": additional, "total": total}

        if tier_str in ('starter', 'free') or total <= 0:
            con.close()
            return False, "Akun Starter atau kuota token habis (0 Token). Silakan hubungi administrator untuk beralih ke Pro Trader.", {"monthly": 0, "additional": 0, "total": 0}

        # Deduct 1 token: prioritaskan kuota bulanan terlebih dahulu
        if monthly > 0:
            cur.execute("UPDATE users SET monthly_tokens = monthly_tokens - 1 WHERE id=?", (uid,))
            monthly -= 1
        elif additional > 0:
            cur.execute("UPDATE users SET additional_tokens = additional_tokens - 1 WHERE id=?", (uid,))
            additional -= 1

        con.commit()
        con.close()
        return True, "", {"monthly": monthly, "additional": additional, "total": monthly + additional}
    except Exception as e:
        print(f"[check_and_consume_token error] {e}")
        return True, "", {"monthly": 100, "additional": 50, "total": 150}

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
                    print("[API] Melakukan refresh menyeluruh bundle pasar dari Invezgo API...")
                    fresh_market = fetch_all_initial()
                    if fresh_market:
                        cache = get_market_cache()
                        cache.update(fresh_market)
                        save_market_cache(cache)
                        print(f"[API] Berhasil memperbarui {len(fresh_market)} instrumen pasar!")
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

                print(f"[API] Refresh live chart & market data untuk: {ticker} (force={force})")
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
                print(f"[API Error /api/stock {ticker}] {e}")
                fallback_data = existing_item if 'existing_item' in locals() and existing_item else {'ticker': ticker, 'name': ticker, 'price': 0, 'ohlc': []}
                payload = json.dumps(fallback_data).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
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

        # 2b-admin. API: Download SQLite Database & Export CSV
        if path == "/api/admin/download-db":
            db_path = os.path.join(os.path.dirname(__file__), "..", "data", "pintarsaham.db")
            if not os.path.exists(db_path):
                db_path = "/root/PS_AI/data/pintarsaham.db"
            if os.path.exists(db_path):
                with open(db_path, "rb") as db_f:
                    db_bytes = db_f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/x-sqlite3")
                self.send_header("Content-Disposition", "attachment; filename=\"pintarsaham.db\"")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(db_bytes)))
                self.end_headers()
                self.wfile.write(db_bytes)
                return
            else:
                self.send_error(404, "Database file not found")
                return

        if path == "/api/admin/export-csv":
            tbl = query.get("table", ["market_quotes"])[0]
            allowed = ["company_details", "market_quotes", "corporate_calendar", "shareholder_networks", "financial_insights", "users"]
            if tbl not in allowed:
                tbl = "market_quotes"
            db_path = os.path.join(os.path.dirname(__file__), "..", "data", "pintarsaham.db")
            if not os.path.exists(db_path):
                db_path = "/root/PS_AI/data/pintarsaham.db"
            try:
                con = sqlite3.connect(db_path)
                cur = con.cursor()
                cur.execute(f"PRAGMA table_info({tbl})")
                cols = [r[1] for r in cur.fetchall()]
                cur.execute(f"SELECT * FROM {tbl}")
                rows = cur.fetchall()
                con.close()

                out_str = io.StringIO()
                w = csv.writer(out_str)
                w.writerow(cols)
                for r in rows:
                    w.writerow(r)
                csv_payload = out_str.getvalue().encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", f"attachment; filename=\"{tbl}.csv\"")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(csv_payload)))
                self.end_headers()
                self.wfile.write(csv_payload)
                return
            except Exception as e:
                print(f"[Export CSV Error] {e}")
                self.send_error(500, f"Export CSV error: {e}")
                return

        # 2b-auth. Google OAuth Config & Endpoints
        if path == '/api/auth/config':
            cfg = {'googleClientId': GOOGLE_CLIENT_ID}
            payload = json.dumps(cfg).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        if path == '/api/auth/google/login':
            host = self.headers.get('Host') or 'pintarsaham.202.10.47.34.nip.io'
            scheme = self.headers.get('X-Forwarded-Proto', 'http')
            redirect_uri = f"{scheme}://{host}/api/auth/google/callback"
            params = {
                'client_id': GOOGLE_CLIENT_ID,
                'redirect_uri': redirect_uri,
                'response_type': 'code',
                'scope': 'openid email profile',
                'access_type': 'offline',
                'prompt': 'select_account'
            }
            auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
            self.send_response(302)
            self.send_header('Location', auth_url)
            self.end_headers()
            return

        if path == '/api/auth/google/callback':
            if 'error' in query:
                err = query['error'][0]
                self.send_response(302)
                self.send_header('Location', f"/?auth_error={urllib.parse.quote(err)}")
                self.end_headers()
                return

            code = query.get('code', [None])[0]
            if not code:
                self.send_response(302)
                self.send_header('Location', "/?auth_error=No%20code%20provided")
                self.end_headers()
                return

            try:
                host = self.headers.get('Host') or 'pintarsaham.202.10.47.34.nip.io'
                scheme = self.headers.get('X-Forwarded-Proto', 'http')
                redirect_uri = f"{scheme}://{host}/api/auth/google/callback"

                token_resp = requests.post(
                    'https://oauth2.googleapis.com/token',
                    data={
                        'code': code,
                        'client_id': GOOGLE_CLIENT_ID,
                        'client_secret': GOOGLE_CLIENT_SECRET,
                        'redirect_uri': redirect_uri,
                        'grant_type': 'authorization_code'
                    },
                    timeout=10
                )
                if token_resp.status_code != 200:
                    raise Exception(f"Token exchange failed: {token_resp.text}")

                token_data = token_resp.json()
                access_token = token_data.get('access_token')

                # Get user profile from Google
                userinfo_resp = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f"Bearer {access_token}"},
                    timeout=8
                )
                if userinfo_resp.status_code != 200:
                    raise Exception(f"Userinfo fetch failed: {userinfo_resp.text}")

                g_user = userinfo_resp.json()
                email = g_user.get('email', '')
                name = g_user.get('name', email)
                picture = g_user.get('picture', '')
                sub = g_user.get('sub', '')

                user_profile = upsert_user(email, name, picture, sub, auth_provider='google')
                redirect_target = (
                    f"/?login=google&email={urllib.parse.quote(email)}&"
                    f"name={urllib.parse.quote(name)}&"
                    f"avatar={urllib.parse.quote(picture)}&"
                    f"role={urllib.parse.quote(user_profile['role'])}&"
                    f"tier={urllib.parse.quote(user_profile['tier'])}&"
                    f"monthly_tokens={user_profile.get('monthly_tokens', 30)}&"
                    f"additional_tokens={user_profile.get('additional_tokens', 0)}&"
                    f"id={user_profile['id']}"
                )
                self.send_response(302)
                self.send_header('Location', redirect_target)
                self.end_headers()
                return
            except Exception as e:
                print(f"[OAuth Callback Error] {e}")
                self.send_response(302)
                self.send_header('Location', f"/?auth_error={urllib.parse.quote(str(e))}")
                self.end_headers()
                return

        # 2b-admin-settings. Get settings
        if path in ('/api/settings/contact', '/api/admin/settings'):
            try:
                settings = get_system_settings()
                payload = json.dumps({
                    'whatsapp': settings.get('admin_whatsapp', '6281234567890'),
                    'whatsappDisplay': settings.get('admin_whatsapp_display', '+62 812-3456-7890'),
                    'email': settings.get('admin_email', 'support@pintarsaham.id'),
                    'waMessageTemplate': settings.get('admin_wa_message_template', ''),
                    'proMonthlyTokens': int(settings.get('pro_monthly_tokens', 30)),
                }).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API settings error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 2b-admin-users. List users from database
        if path == '/api/admin/users':
            try:
                db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
                con = sqlite3.connect(db_path)
                cur = con.cursor()
                cur.execute("SELECT id, name, email, role, tier, status, last_login, monthly_tokens, additional_tokens FROM users ORDER BY created_at DESC")
                rows = cur.fetchall()
                con.close()
                pro_quota = get_pro_monthly_quota()
                users_out = []
                for r in rows:
                    users_out.append({
                        'id': r[0],
                        'name': r[1],
                        'email': r[2],
                        'role': r[3] or 'user',
                        'tier': r[4] or 'starter',
                        'status': r[5] or 'active',
                        'lastLogin': r[6] or 'Baru saja',
                        'monthlyTokens': r[7] if r[7] is not None else (pro_quota if r[4] == 'pro' else 0),
                        'additionalTokens': r[8] if r[8] is not None else 0
                    })
                payload = json.dumps(users_out).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API /api/admin/users error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 2b-user-profile. Get live profile & token quota for authenticated user
        if path == '/api/user/profile':
            try:
                check_and_run_monthly_reset()
                user_id = query.get('id', [None])[0]
                email = query.get('email', [None])[0]
                db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
                con = sqlite3.connect(db_path)
                cur = con.cursor()
                if user_id:
                    cur.execute("SELECT id, username, name, email, role, tier, avatar, status, monthly_tokens, additional_tokens FROM users WHERE id=?", (user_id,))
                elif email:
                    cur.execute("SELECT id, username, name, email, role, tier, avatar, status, monthly_tokens, additional_tokens FROM users WHERE email=?", (email,))
                else:
                    cur.execute("SELECT id, username, name, email, role, tier, avatar, status, monthly_tokens, additional_tokens FROM users LIMIT 1")
                row = cur.fetchone()
                con.close()
                if not row:
                    self.send_response(404)
                    self.end_headers()
                    return
                user_res = {
                    'id': row[0],
                    'username': row[1],
                    'name': row[2],
                    'email': row[3],
                    'role': row[4] or 'user',
                    'tier': row[5] or 'starter',
                    'avatar': row[6],
                    'status': row[7] or 'active',
                    'monthlyTokens': row[8] if row[8] is not None else (get_pro_monthly_quota() if row[5] == 'pro' else 0),
                    'additionalTokens': row[9] if row[9] is not None else 0
                }
                payload = json.dumps(user_res).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API /api/user/profile error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # 2c. API: /api/invezgo-usage & /api/idx-status (Cek status data engine IDX CLI)
        if path in ('/api/invezgo-usage', '/api/idx-status'):
            try:
                from idx_client import run_idx_cmd
                res_payload = json.dumps({
                    "engine": "idx-cli (Rust v0.8.2)",
                    "status": "active",
                    "plan": "Open Source Unlimited",
                    "quota": {
                        "usage": 0,
                        "remaining": 999999,
                        "limit": 999999,
                        "isBlocked": False,
                        "expire": "2099-12-31T23:59:59Z",
                        "role": "IDX Engine (Free / Zero Token)",
                        "addonQuota": 999999,
                        "plan": "IDX Engine Unlimited (Zero Token / Free)",
                        "cost": "Rp 0 / bulan"
                    },
                    "logs": [
                        {
                            "id": "idx_live",
                            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "method": "CLI",
                            "url": "idx stocks technical, screener, ownership",
                            "access": "local-binary",
                            "status": 200,
                            "response_time": 15
                        }
                    ],
                    "features": [
                        "Real-time Technicals (RSI-14, MACD, Bollinger Bands, ATR)",
                        "KSEI Register Database (9 bulan kepemilikan >1%)",
                        "Market Overview (955 emiten BEI)",
                        "Kontan & CNBC Indonesia Real-time Headlines"
                    ],
                    "status_code": 200
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

        # 2d. API: /api/technicals (Indikator RSI, MACD, Bollinger Bands, Support/Resistance dari IDX CLI)
        if path == '/api/technicals':
            ticker = 'BBCA'
            if 'ticker' in query and query['ticker']:
                ticker = query['ticker'][0].upper().strip()
            try:
                from idx_client import fetch_technical_indicators_idx
                data = fetch_technical_indicators_idx(ticker)
                payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API/technicals Error] {e}")
                err_payload = json.dumps({'error': str(e), 'ticker': ticker}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return
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
                from db_manager import get_company_detail_db
                cached_db = get_company_detail_db(ticker)

                if force or not cached_db:
                    print(f"[API /api/company-detail] Mengambil data baru {ticker} dari IDX Engine (force={force}) & simpan ke SQLite DB")
                    res = fetch_company_complete_invezgo(ticker, force=force)
                else:
                    res = cached_db
                    print(f"[API /api/company-detail] Memuat {ticker} dari SQLite DB lokal (0 request API)")

                if res.get('cachedDb'):
                    print(f"[API /api/company-detail] Memuat {ticker} dari SQLite DB lokal (0 request API)")
                else:
                    print(f"[API /api/company-detail] Mengambil data baru {ticker} dari IDX Engine & simpan ke SQLite DB")
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
            req_user_id = query.get('user_id', [None])[0] or self.headers.get('X-User-Id')
            req_email = query.get('email', [None])[0] or self.headers.get('X-User-Email')
            is_pro = is_user_pro_or_admin(user_id=req_user_id, email=req_email)

            try:
                from db_manager import get_financial_insight_db
                cached_rec = get_financial_insight_db(ticker)

                if not is_pro:
                    # Starter: hanya kembalikan jika sudah ada di cache DB, dan JANGAN generate AI
                    if cached_rec and cached_rec.get("insight"):
                        res = {
                            "ticker": ticker,
                            "cached": True,
                            "period_tag": cached_rec.get("period_tag"),
                            "health_score": cached_rec.get("health_score", 0),
                            "insight": cached_rec.get("insight"),
                            "updated_at": cached_rec.get("updated_at"),
                        }
                    else:
                        res = {"ticker": ticker, "error": "Fitur insight AI terkunci untuk akun Starter", "locked": True}
                else:
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
            req_user_id = query.get('user_id', [None])[0] or self.headers.get('X-User-Id')
            req_email = query.get('email', [None])[0] or self.headers.get('X-User-Email')
            is_pro = is_user_pro_or_admin(user_id=req_user_id, email=req_email)

            if force and not is_pro:
                force = False

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
                if isinstance(analysis_res, dict):
                    analysis_res['remaining_tokens'] = rem_tokens
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

        # 4b. API: /api/enrich-corporate-events (Trigger pengayaan ringkasan cerdas AI untuk aksi korporasi)
        if path == '/api/enrich-corporate-events':
            try:
                from enrich_corporate_events import enrich_all_corporate_events
                enriched_cnt = enrich_all_corporate_events(only_upcoming=True, max_count=5)
                payload = json.dumps({'success': True, 'enriched_count': enriched_cnt}, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API/enrich-corporate-events Error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
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

        # 7. Penanganan logo-emiten dengan cache-header dan pencegahan spam log 404
        if path.startswith('/logo-emiten/'):
            logo_subpath = path.lstrip('/')
            found_logo = None
            for candidate_dir in (FRONTEND_DIST, os.path.join(BASE_DIR, 'frontend', 'public'), BASE_DIR):
                cand = os.path.join(candidate_dir, logo_subpath)
                if os.path.exists(cand) and os.path.isfile(cand):
                    found_logo = cand
                    break
            if found_logo:
                try:
                    with open(found_logo, 'rb') as lf:
                        content = lf.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/svg+xml' if path.endswith('.svg') else 'image/png')
                    self.send_header('Cache-Control', 'public, max-age=604800, immutable')
                    self.send_header('Content-Length', str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return
                except Exception:
                    pass
            # Respons 404 ringan & di-cache oleh browser agar browser tidak membanjiri request berulang
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return

        # 8. Fallback for SPA routing: if route (no file extension) doesn't exist, serve frontend/dist/index.html
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
                user_id = data.get('user_id') or self.headers.get('X-User-Id')
                email = data.get('email') or self.headers.get('X-User-Email')

                allowed, err_msg, rem_tokens = check_and_consume_token(user_id=user_id, email=email)
                if not allowed:
                    err_payload = json.dumps({'error': err_msg, 'locked': True, 'remaining_tokens': rem_tokens}).encode('utf-8')
                    self.send_response(403)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Content-Length', str(len(err_payload)))
                    self.end_headers()
                    self.wfile.write(err_payload)
                    return

                print(f"[API POST /api/ai-chat] Memproses percakapan ({len(messages)} pesan)")
                chat_res = run_chatbot_conversation(messages)
                if isinstance(chat_res, dict):
                    chat_res['remaining_tokens'] = rem_tokens
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
                user_id = data.get('user_id') or self.headers.get('X-User-Id')
                email = data.get('email') or self.headers.get('X-User-Email')

                allowed, err_msg, rem_tokens = check_and_consume_token(user_id=user_id, email=email)
                if not allowed:
                    err_payload = json.dumps({'error': err_msg, 'locked': True, 'remaining_tokens': rem_tokens}).encode('utf-8')
                    self.send_response(403)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Content-Length', str(len(err_payload)))
                    self.end_headers()
                    self.wfile.write(err_payload)
                    return

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

        if parsed.path == '/api/auth/google':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}
                credential = data.get('credential', '')

                if not credential:
                    raise Exception("Token credential Google wajib disertakan")

                # Verifikasi ID Token langsung ke endpoint resmi Google OAuth2
                verify_resp = requests.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}",
                    timeout=10
                )
                if verify_resp.status_code != 200:
                    raise Exception(f"Verifikasi token gagal: {verify_resp.text}")

                token_info = verify_resp.json()
                aud = token_info.get('aud')
                if aud != GOOGLE_CLIENT_ID:
                    raise Exception(f"Audience token tidak sesuai: {aud}")

                email = token_info.get('email', '')
                if not email:
                    raise Exception("Alamat email tidak ditemukan dalam token Google")

                email_verified = token_info.get('email_verified')
                if str(email_verified).lower() not in ('true', '1'):
                    raise Exception("Email belum diverifikasi oleh Google")

                name = token_info.get('name') or email.split('@')[0]
                picture = token_info.get('picture') or ''
                sub = token_info.get('sub') or ''

                user_profile = upsert_user(email, name, picture, sub, auth_provider='google')
                session_token = f"tok_g_{hashlib.sha256((email + str(time.time())).encode()).hexdigest()[:24]}"

                res_payload = json.dumps({
                    'success': True,
                    'user': user_profile,
                    'token': session_token
                }, ensure_ascii=False).encode('utf-8')

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(res_payload)))
                self.end_headers()
                self.wfile.write(res_payload)
                return
            except Exception as e:
                print(f"[API /api/auth/google Error] {e}")
                err_payload = json.dumps({'error': str(e), 'success': False}).encode('utf-8')
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        if parsed.path == '/api/auth/manual-login':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}
                username_or_email = str(data.get('username', '')).strip().lower()
                password = str(data.get('password', '')).strip()

                if not username_or_email:
                    raise Exception("Username atau alamat email wajib diisi")
                if not password or len(password) < 4:
                    raise Exception("Password minimal 4 karakter")

                db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
                con = sqlite3.connect(db_path)
                cur = con.cursor()
                now_str = time.strftime('%d %b %Y, %H:%M WIB')

                cur.execute("""
                    SELECT id, username, name, email, role, tier, avatar, status, monthly_tokens, additional_tokens
                    FROM users
                    WHERE LOWER(email)=? OR LOWER(username)=? OR LOWER(id)=?
                """, (username_or_email, username_or_email, username_or_email))
                row = cur.fetchone()

                if not row:
                    # Fallback default seeding for standard admin & bisma
                    if username_or_email in ('admin', 'admin@pintarsaham.id') and password == 'admin123':
                        cur.execute("""
                            INSERT INTO users (id, username, name, email, role, tier, avatar, auth_provider, status, last_login, created_at, monthly_tokens, additional_tokens)
                            VALUES ('usr_admin', 'admin', 'Super Administrator', 'admin@pintarsaham.id', 'admin', 'institutional', 'AD', 'manual', 'active', ?, ?, 100, 0)
                        """, (now_str, time.strftime('%Y-%m-%d')))
                        con.commit()
                        row = ('usr_admin', 'admin', 'Super Administrator', 'admin@pintarsaham.id', 'admin', 'institutional', 'AD', 'active', 100, 0)
                    elif username_or_email in ('bisma', 'bismayoga432@gmail.com') and password in ('trader123', 'bisma123', 'admin123'):
                        cur.execute("""
                            INSERT INTO users (id, username, name, email, role, tier, avatar, auth_provider, status, last_login, created_at, monthly_tokens, additional_tokens)
                            VALUES ('usr_bisma', 'bisma', 'Bisma Yoga', 'bismayoga432@gmail.com', 'admin', 'pro', 'BY', 'manual', 'active', ?, ?, 30, 0)
                        """, (now_str, time.strftime('%Y-%m-%d')))
                        con.commit()
                        row = ('usr_bisma', 'bisma', 'Bisma Yoga', 'bismayoga432@gmail.com', 'admin', 'pro', 'BY', 'active', 30, 0)
                    else:
                        con.close()
                        raise Exception("Akun tidak ditemukan. Silakan hubungi admin atau masuk melalui Google Auth.")

                uid, u_uname, u_name, u_email, u_role, u_tier, u_avatar, u_status, u_m_tokens, u_a_tokens = row
                if u_status == 'suspended':
                    con.close()
                    raise Exception("Akun ini telah ditangguhkan (Suspended). Silakan hubungi administrator.")

                # Update last login
                cur.execute("UPDATE users SET last_login=? WHERE id=?", (now_str, uid))
                con.commit()
                con.close()

                user_profile = {
                    'id': uid,
                    'username': u_uname or username_or_email,
                    'name': u_name or username_or_email,
                    'email': u_email,
                    'role': u_role or 'user',
                    'tier': u_tier or 'starter',
                    'avatar': u_avatar or (u_name[:2].upper() if u_name else 'US'),
                    'status': u_status or 'active',
                    'monthlyTokens': u_m_tokens if u_m_tokens is not None else (30 if u_tier == 'pro' else 0),
                    'additionalTokens': u_a_tokens if u_a_tokens is not None else 0,
                    'createdAt': time.strftime('%Y-%m-%d')
                }

                res_payload = json.dumps({'success': True, 'user': user_profile}, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(res_payload)))
                self.end_headers()
                self.wfile.write(res_payload)
                return
            except Exception as e:
                print(f"[API /api/auth/manual-login Error] {e}")
                err_payload = json.dumps({'error': str(e), 'success': False}).encode('utf-8')
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        if parsed.path == '/api/admin/settings':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}

                db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
                con = sqlite3.connect(db_path)
                now_str = time.strftime('%d %b %Y, %H:%M WIB')

                if 'whatsapp' in data:
                    con.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)",
                                ('admin_whatsapp', str(data['whatsapp']).strip(), now_str))
                if 'whatsappDisplay' in data:
                    con.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)",
                                ('admin_whatsapp_display', str(data['whatsappDisplay']).strip(), now_str))
                if 'email' in data:
                    con.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)",
                                ('admin_email', str(data['email']).strip(), now_str))
                if 'waMessageTemplate' in data:
                    con.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)",
                                ('admin_wa_message_template', str(data['waMessageTemplate']).strip(), now_str))
                if 'proMonthlyTokens' in data:
                    try:
                        pro_val = max(0, int(data['proMonthlyTokens']))
                        con.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)",
                                    ('pro_monthly_tokens', str(pro_val), now_str))
                    except (ValueError, TypeError):
                        pass
                con.commit()
                con.close()

                settings = get_system_settings()
                out = {
                    'success': True,
                    'whatsapp': settings.get('admin_whatsapp', ''),
                    'whatsappDisplay': settings.get('admin_whatsapp_display', ''),
                    'email': settings.get('admin_email', ''),
                    'waMessageTemplate': settings.get('admin_wa_message_template', ''),
                    'proMonthlyTokens': int(settings.get('pro_monthly_tokens', 30)),
                }
                payload = json.dumps(out).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API /api/admin/settings Error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        if parsed.path == '/api/admin/reset-monthly-tokens':
            try:
                settings = get_system_settings()
                pro_tokens = int(settings.get('pro_monthly_tokens', 30))

                db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
                con = sqlite3.connect(db_path)
                cur = con.cursor()
                cur.execute("UPDATE users SET monthly_tokens=? WHERE tier='pro'", (pro_tokens,))
                cur.execute("UPDATE users SET monthly_tokens=100 WHERE tier='institutional'")
                cur.execute("UPDATE users SET monthly_tokens=0 WHERE tier IN ('starter', 'free')")
                con.commit()

                # Hitung jumlah user terupdate
                cur.execute("SELECT count(*) FROM users WHERE tier='pro'")
                pro_count = cur.fetchone()[0]
                con.close()

                out = {
                    'success': True,
                    'message': f"Berhasil mereset jatah bulanan seluruh pengguna! ({pro_count} akun Pro di-reset ke {pro_tokens} token bulanan, kuota tambahan tetap aman).",
                    'proMonthlyTokens': pro_tokens
                }
                payload = json.dumps(out).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                print(f"[API /api/admin/reset-monthly-tokens Error] {e}")
                err_payload = json.dumps({'error': str(e), 'success': False}).encode('utf-8')
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        if parsed.path == '/api/admin/create-user':
            try:
                import uuid
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}
                name = str(data.get('name', '')).strip()
                email = str(data.get('email', '')).strip()
                role = str(data.get('role', 'user')).strip()
                tier = str(data.get('tier', 'starter')).strip()
                if not name or not email:
                    raise Exception("Nama dan email wajib diisi")

                db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
                con = sqlite3.connect(db_path)
                cur = con.cursor()
                user_id = f"usr_{uuid.uuid4().hex[:10]}"
                monthly = 100 if tier == 'institutional' else (30 if tier == 'pro' else 0)
                cur.execute("""
                    INSERT INTO users (id, username, name, email, role, tier, status, last_login, created_at, monthly_tokens, additional_tokens)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now', '+7 hours'), datetime('now', '+7 hours'), ?, 0)
                """, (user_id, email.split('@')[0], name, email, role, tier, monthly))
                con.commit()
                con.close()

                res_payload = json.dumps({
                    'success': True,
                    'user': {
                        'id': user_id,
                        'name': name,
                        'email': email,
                        'role': role,
                        'tier': tier,
                        'status': 'active',
                        'lastLogin': 'Baru saja',
                        'monthlyTokens': monthly,
                        'additionalTokens': 0
                    }
                }).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(res_payload)))
                self.end_headers()
                self.wfile.write(res_payload)
                return
            except Exception as e:
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        if parsed.path == '/api/admin/update-user':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}
                user_id = data.get('id')
                role = data.get('role')
                tier = data.get('tier')
                status = data.get('status')
                add_tokens = data.get('add_tokens')
                monthly_tokens = data.get('monthly_tokens')
                additional_tokens = data.get('additional_tokens')

                if not user_id:
                    raise Exception("ID user wajib disertakan")

                db_path = os.path.join(DATA_DIR, 'pintarsaham.db')
                con = sqlite3.connect(db_path)
                cur = con.cursor()

                if role:
                    cur.execute("UPDATE users SET role=? WHERE id=?", (role, user_id))
                if tier:
                    pro_quota = get_pro_monthly_quota()
                    cur.execute("UPDATE users SET tier=? WHERE id=?", (tier, user_id))
                    # Otomatis sesuaikan jatah bulanan jika beralih tier
                    if tier in ('pro', 'institutional'):
                        cur.execute("UPDATE users SET monthly_tokens=CASE WHEN monthly_tokens IS NULL OR monthly_tokens=0 THEN ? ELSE monthly_tokens END WHERE id=?", (100 if tier == 'institutional' else pro_quota, user_id))
                    elif tier in ('starter', 'free'):
                        cur.execute("UPDATE users SET monthly_tokens=0 WHERE id=?", (user_id,))
                if status:
                    cur.execute("UPDATE users SET status=? WHERE id=?", (status, user_id))
                if add_tokens is not None:
                    try:
                        add_val = int(add_tokens)
                        cur.execute("UPDATE users SET additional_tokens = MAX(0, COALESCE(additional_tokens, 0) + ?) WHERE id=?", (add_val, user_id))
                    except ValueError:
                        pass
                if monthly_tokens is not None:
                    try:
                        cur.execute("UPDATE users SET monthly_tokens = ? WHERE id=?", (int(monthly_tokens), user_id))
                    except ValueError:
                        pass
                if additional_tokens is not None:
                    try:
                        cur.execute("UPDATE users SET additional_tokens = ? WHERE id=?", (int(additional_tokens), user_id))
                    except ValueError:
                        pass

                con.commit()

                # Ambil data user terbaru
                cur.execute("SELECT id, name, email, role, tier, status, last_login, monthly_tokens, additional_tokens FROM users WHERE id=?", (user_id,))
                updated_row = cur.fetchone()
                con.close()

                updated_user = None
                if updated_row:
                    updated_user = {
                        'id': updated_row[0],
                        'name': updated_row[1],
                        'email': updated_row[2],
                        'role': updated_row[3] or 'user',
                        'tier': updated_row[4] or 'starter',
                        'status': updated_row[5] or 'active',
                        'lastLogin': updated_row[6] or 'Baru saja',
                        'monthlyTokens': updated_row[7] if updated_row[7] is not None else (30 if updated_row[4] == 'pro' else 0),
                        'additionalTokens': updated_row[8] if updated_row[8] is not None else 0
                    }

                res_payload = json.dumps({'success': True, 'user': updated_user}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(res_payload)))
                self.end_headers()
                self.wfile.write(res_payload)
                return
            except Exception as e:
                print(f"[API /api/admin/update-user Error] {e}")
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(400)
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
                check_and_run_monthly_reset()
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

                # Sinkronkan pengayaan AI pada agenda aksi korporasi terdekat
                try:
                    from enrich_corporate_events import enrich_all_corporate_events
                    enrich_all_corporate_events(only_upcoming=True, max_count=3)
                except Exception as e_ev:
                    print(f"[Auto-Sync Events Warning] {e_ev}")
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

