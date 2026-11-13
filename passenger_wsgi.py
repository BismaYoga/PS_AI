import os
import sys
import shutil
import socket
import traceback
import threading
import http.client
import http.server
import socketserver

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
LOG_FILE = os.path.join(BASE_DIR, "error_app.log")

def _write_log(msg):
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass

for path in (BASE_DIR, BACKEND_DIR):
    if os.path.exists(path) and path not in sys.path:
        sys.path.insert(0, path)

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

ps_server = None
_BOOT_ERROR = None

try:
    _ensure_frontend_dist_assets()
    if os.path.exists(BACKEND_DIR):
        os.chdir(BACKEND_DIR)
    else:
        os.chdir(BASE_DIR)

    import server as ps_server
except Exception:
    _BOOT_ERROR = traceback.format_exc()
    _write_log("=== BOOT ERROR ===\n" + _BOOT_ERROR)

_INTERNAL_PORT = None
_SERVER_LOCK = threading.Lock()

def _get_or_start_internal_server():
    global _INTERNAL_PORT
    with _SERVER_LOCK:
        if _INTERNAL_PORT is not None:
            return _INTERNAL_PORT

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
    if _BOOT_ERROR or ps_server is None:
        err_text = _BOOT_ERROR or "Module server gagal dimuat."
        err_bytes = err_text.encode("utf-8")
        start_response("500 Internal Server Error", [
            ("Content-Type", "text/plain; charset=utf-8"),
            ("Content-Length", str(len(err_bytes)))
        ])
        return [err_bytes]

    try:
        port = _get_or_start_internal_server()

        method = environ.get("REQUEST_METHOD", "GET")
        path = environ.get("PATH_INFO", "/") or "/"
        query = environ.get("QUERY_STRING", "")
        full_path = f"{path}?{query}" if query else path

        try:
            content_length = int(environ.get("CONTENT_LENGTH") or 0)
        except ValueError:
            content_length = 0
        body = environ["wsgi.input"].read(content_length) if content_length > 0 else None

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

            hop_by_hop = {
                "connection", "keep-alive", "proxy-authenticate",
                "proxy-authorization", "te", "trailers",
                "transfer-encoding", "upgrade"
            }
            resp_headers = [
                (k, v) for k, v in resp.getheaders()
                if k.lower() not in hop_by_hop
            ]
            start_response(status_str, resp_headers)
            return [resp_body]
        finally:
            conn.close()
    except Exception:
        runtime_err = traceback.format_exc()
        _write_log("=== RUNTIME ERROR ===\n" + runtime_err)
        err_msg = runtime_err.encode("utf-8")
        start_response("500 Internal Server Error", [
            ("Content-Type", "text/plain; charset=utf-8"),
            ("Content-Length", str(len(err_msg)))
        ])
        return [err_msg]
