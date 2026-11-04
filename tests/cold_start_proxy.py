# cold_start_proxy.py
# Pretends to be Render's front door, so the cold start can be tested on a laptop.
#
#   python tests/cold_start_proxy.py <listen port> <server port>
#
# Requests are passed on to the real C++ server, unless the proxy is "asleep".
# While asleep it answers 503 with a plain HTML page and no CORS headers, as a
# sleeping host does. GET /__sleep?seconds=N puts it to sleep for N seconds.
# GET /__hold?seconds=N makes the next requests wait N seconds, then succeed.

import http.client
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

SERVER_PORT = int(sys.argv[2])
state = {"asleep_until": 0.0, "hold_until": 0.0, "hold_seconds": 0.0}


class Proxy(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def reply(self, status, body, content_type="text/html", extra=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def control(self):
        url = urlparse(self.path)
        seconds = float(parse_qs(url.query).get("seconds", ["0"])[0])
        if url.path == "/__sleep":
            state["asleep_until"] = time.time() + seconds
        elif url.path == "/__hold":
            state["hold_until"] = time.time() + seconds
            state["hold_seconds"] = seconds
        else:
            return False
        self.reply(200, b"ok", "text/plain", {"Access-Control-Allow-Origin": "*"})
        return True

    def forward(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None

        if self.path.startswith("/__") and self.control():
            return
        if time.time() < state["asleep_until"]:
            self.reply(503, b"<html><body>Service is waking up</body></html>")
            return
        if time.time() < state["hold_until"]:
            time.sleep(state["hold_seconds"])

        connection = http.client.HTTPConnection("127.0.0.1", SERVER_PORT, timeout=30)
        headers = {key: value for key, value in self.headers.items() if key.lower() not in ("host", "connection")}
        connection.request(self.command, self.path, body=body, headers=headers)
        answer = connection.getresponse()
        data = answer.read()

        self.send_response(answer.status)
        for key, value in answer.getheaders():
            if key.lower() not in ("content-length", "connection", "transfer-encoding", "date", "server"):
                self.send_header(key, value)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        connection.close()

    # A browser may close a connection early, which is not a problem here.
    def handle(self):
        try:
            super().handle()
        except ConnectionError:
            pass

    do_GET = do_POST = do_PUT = do_DELETE = do_OPTIONS = forward


ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), Proxy).serve_forever()
