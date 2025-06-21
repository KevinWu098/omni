#!/usr/bin/env python3
"""
Playwright   → JPEG frames @ 3 fps
FFmpeg PUTs → in-memory HLS (playlist + TS) to Flask
Client      → hls.js scrubs/plays live stream
"""

import asyncio, io, signal, sys, time, subprocess, threading
from pathlib import Path
from collections import deque
from typing import Optional, Dict

import numpy as np
from PIL import Image
from flask import Flask, request, Response, jsonify
from werkzeug.serving import make_server

from playwright.async_api import async_playwright  # pip install playwright

HOST, PORT = "127.0.0.1", 5000           # Flask + FFmpeg target
WIDTH, HEIGHT, FPS = 1280, 720, 3        # capture / encode params
SEG_KEEP = 50                            # how many TS segments in RAM


# ════════════════════════════════════════════════════════════════════════
#  In-memory store for playlist + segments
# ════════════════════════════════════════════════════════════════════════
class MemHLS:
    def __init__(self, keep=SEG_KEEP):
        self.playlist: str = ""
        self.segs: Dict[str, bytes] = {}
        self.order = deque(maxlen=keep)  # rolling key order

    # playlist ----------------------------------------------------------------
    def put_playlist(self, data: bytes):
        self.playlist = data.decode("utf-8")

    def get_playlist(self) -> str:
        return self.playlist

    # segments -----------------------------------------------------------------
    def put_seg(self, name: str, data: bytes):
        self.segs[name] = data
        self.order.append(name)
        # drop oldest beyond keep limit
        while len(self.order) > self.order.maxlen:
            old = self.order.popleft()
            self.segs.pop(old, None)

    def get_seg(self, name: str) -> Optional[bytes]:
        return self.segs.get(name)


MEM = MemHLS()     # global instance Flask + recorder share


# ════════════════════════════════════════════════════════════════════════
#  Playwright page grab → feed FFmpeg stdin
# ════════════════════════════════════════════════════════════════════════
class ScreenRecorder:
    def __init__(self, page):
        self.page = page
        self.proc: Optional[subprocess.Popen] = None
        self.running = False
        self.frames = 0

    async def start(self):
        self._spawn_ffmpeg()
        self.running = True
        asyncio.create_task(self._loop())
        print("🎥 Recorder started (memory-only HLS)")

    async def stop(self):
        self.running = False
        if self.proc:
            try:
                self.proc.stdin.close(); self.proc.wait(5)
            except Exception: self.proc.kill()
            self.proc = None
        print("🛑 Recorder stopped")

    # --------------------------------------------------------------------------
    def _spawn_ffmpeg(self):
        seg_url   = f"http://{HOST}:{PORT}/segments/seg%05d.ts"
        plist_url = f"http://{HOST}:{PORT}/playlist.m3u8"

        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",

            "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
            "-crf", "30", "-g", str(FPS*2),

            # HLS → PUT  playlist + segs back to Flask ----------------------
            "-f", "hls",
            "-method", "PUT",                     # HTTP PUT
            "-hls_time", "2",
            "-hls_list_size", "10",
            "-hls_flags", "delete_segments+independent_segments",
            "-hls_base_url", "/segments/",
            "-hls_segment_filename", seg_url,
            "-hls_playlist_type", "event",
            plist_url
        ]
        print("📝 FFmpeg:", " ".join(cmd))
        self.proc = subprocess.Popen(
            cmd, stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, bufsize=10**7
        )

    # --------------------------------------------------------------------------
    async def _loop(self):
        interval = 1 / FPS
        while self.running:
            t0 = time.perf_counter()

            # Playwright screenshot → RGB numpy
            buf = await self.page.screenshot(type="jpeg", quality=80)
            img = Image.open(io.BytesIO(buf)).convert("RGB")
            rgb = np.asarray(img.resize((WIDTH, HEIGHT), Image.LANCZOS),
                             dtype=np.uint8)

            try:
                self.proc.stdin.write(rgb.tobytes())
                self.frames += 1
            except BrokenPipeError:
                print("❌ FFmpeg pipe closed")
                self.running = False; break

            await asyncio.sleep(max(0, interval - (time.perf_counter()-t0)))


# ════════════════════════════════════════════════════════════════════════
#  Flask: accepts PUTs from FFmpeg  +  serves to browser
# ════════════════════════════════════════════════════════════════════════
def build_app():
    app = Flask(__name__)

    # index / player
    PLAYER = """<!doctype html><html><head>
    <title>Stream</title><style>html,body{margin:0;background:#000}video{width:100%}</style></head>
    <body><video id=v controls autoplay muted playsinline></video>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <script>
    const v=document.getElementById('v');
    if(Hls.isSupported()){const h=new Hls({lowLatencyMode:true});
      h.loadSource('/playlist.m3u8');h.attachMedia(v);}
    else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src='/playlist.m3u8'}
    else alert('No HLS support');
    </script></body></html>"""

    @app.route("/")
    def index(): return PLAYER

    # playlist ---------------------------------------------------------------
    @app.route("/playlist.m3u8", methods=["PUT", "GET"])
    def playlist():
        if request.method == "PUT":
            MEM.put_playlist(request.data)
            return "", 200
        data = MEM.get_playlist()
        if not data:
            return "Playlist not ready", 404
        return Response(data, mimetype="application/vnd.apple.mpegurl")

    # segments ---------------------------------------------------------------
    @app.route("/segments/<name>", methods=["PUT", "GET"])
    def segment(name):
        if request.method == "PUT":
            MEM.put_seg(name, request.data)
            return "", 200
        data = MEM.get_seg(name)
        if data is None:
            return "Segment gone", 404
        return Response(data, mimetype="video/mp2t")

    # debug ------------------------------------------------------------------
    @app.route("/status")
    def status():
        return jsonify({"playlist_bytes": len(MEM.playlist),
                        "segment_count": len(MEM.segs)})

    return app


# ════════════════════════════════════════════════════════════════════════
#  Coordinator
# ════════════════════════════════════════════════════════════════════════
class Streamer:
    def __init__(self, url="https://example.com", headless=False):
        self.url, self.headless = url, headless
        self.pw = self.browser = self.page = None
        self.rec: Optional[ScreenRecorder] = None
        self.httpd = make_server(HOST, PORT, build_app(), threaded=True)

    async def start(self):
        threading.Thread(target=self.httpd.serve_forever,
                         daemon=True).start()
        print(f"🌐 Flask up on http://{HOST}:{PORT}")

        # launch Playwright browser
        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.launch(headless=self.headless)
        self.page = await self.browser.new_page(
            viewport={'width': WIDTH, 'height': HEIGHT})
        await self.page.goto(self.url)

        # recorder
        self.rec = ScreenRecorder(self.page)
        await self.rec.start()

        print("🚀 Stream live — open http://127.0.0.1:5000")

    async def stop(self):
        print("🛑 Shutting down …")
        if self.rec:    await self.rec.stop()
        if self.browser: await self.browser.close()
        if self.pw:     await self.pw.stop()
        self.httpd.shutdown()


# ════════════════════════════════════════════════════════════════════════
async def _main():
    s = Streamer()
    signal.signal(signal.SIGINT,
                  lambda *_: asyncio.create_task(s.stop()) or sys.exit())
    await s.start()
    while True: await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(_main())
