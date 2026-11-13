import os
import sys
import shutil
import socket
import threading
import http.client
import http.server
import socketserver

# =====================================================================
# PASSENGER WSGI ADAPTER UNTUK CPANEL / HOSTINGER PYTHON APP
# File ini memungkinkan PintarSaham AI berjalan langsung di cPanel
# melalui menu "Setup Python App" (Application Startup File: passenger_wsgi.py,
# Application Entry Point: application).
# =====================================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Pastikan folder statis (logos & data) di frontend/dist tersinkron dari frontend/public
# agar pengguna di cPanel tidak wajib menjalankan 'npm run build' di server.
def _ensure_frontend_dist_assets():
    pub_dir = os.path.join(BASE_DIR, "frontend", "public")
    dist_dir = os.path.join(BASE_DIR, "frontend", "dist")
    if os.path.exists(pub_dir) and os.path.exists(dist_dir):
        for folder_name in ("logos", "data"):
            src = os.path.join(pub_dir, folder_name)
            dst = os.path.join(dist_dir, folder_name)
            if os.path.exists(src) and not os.path.exists(dst):
                try:
                    shutil.copytree(src, dst)
                except Exception:
                    pass

_ensure_frontend_dist_assets()
os.chdir(BACKEND_DIR)

import server as ps_server

_INTERNAL_PORT = None
_SERVER_LOCK = threading.Lock()

def _get_or_start_internal_server():
    global _INTERNAL_PORT
    with _SERVER_LOCK:
        if _INTERNAL_PORT is not None:
            return _INTERNAL_PORT

        # Cari port lokal kosong untuk jembatan internal WSGI
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", 0))
        _, free_port = sock.getsockname()
        sock.close()

        class _InternalThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
            daemon_threads = True
            allow_reuse_address = True

        httpd = _InternalThreadedServer(("127.0.0.1", free_port), ps_server.CustomHandler)
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        _INTERNAL_PORT = free_port
        return _INTERNAL_PORT

def application(environ, start_response):
    """Entry point standar WSGI untuk cPanel Phusion Passenger."""
    port = _get_or_start_internal_server()

    method = environ.get("REQUEST_METHOD", "GET")
    path = environ.get("PATH_INFO", "/") or "/"
    query = environ.get("QUERY_STRING", "")
    full_path = f"{path}?{query}" if query else path

    # Baca body request (jika POST/PUT)
    try:
        content_length = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        content_length = 0
    body = environ["wsgi.input"].read(content_length) if content_length > 0 else None

    # Teruskan header HTTP penting
    headers = {}
    if environ.get("CONTENT_TYPE"):
        headers["Content-Type"] = environ["CONTENT_TYPE"]
    if content_length > 0:
        headers["Content-Length"] = str(content_length)
    for k, v in environ.items():
        if k.startswith("HTTP_"):
            h_name = k[5:].replace("_", "-").title()
            headers[h_name] = v

    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=90)
    try:
        conn.request(method, full_path, body=body, headers=headers)
        resp = conn.getresponse()
        resp_body = resp.read()
        status_str = f"{resp.status} {resp.reason}"

        hop_by_hop = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade"}
        resp_headers = [
            (k, v) for k, v in resp.getheaders()
            if k.lower() not in hop_by_hop
        ]
        start_response(status_str, resp_headers)
        return [resp_body]
    except Exception as e:
        err_msg = f"Internal Server Error: {e}".encode("utf-8")
        start_response("500 Internal Server Error", [
            ("Content-Type", "text/plain; charset=utf-8"),
            ("Content-Length", str(len(err_msg)))
        ])
        return [err_msg]
    finally:
        conn.close()
