# static_site.py
# Serves a folder the way Vercel will: with the real headers from vercel.json.
# This proves that the Content-Security-Policy lets the page reach the API.
#
#   python tests/static_site.py <port> <folder> <api url to use in place of Render>

import functools
import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RENDER_URL = "https://attendance-register-qty3.onrender.com"

with open(os.path.join(ROOT, "vercel.json"), encoding="utf-8") as file:
    HEADERS = json.load(file)["headers"][0]["headers"]


class Site(SimpleHTTPRequestHandler):
    def end_headers(self):
        for header in HEADERS:
            self.send_header(header["key"], header["value"].replace(RENDER_URL, sys.argv[3]))
        super().end_headers()

    def log_message(self, *args):
        pass


handler = functools.partial(Site, directory=sys.argv[2])
ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), handler).serve_forever()
