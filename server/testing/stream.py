#!/usr/bin/env python3
"""
Browser Stream Recorder (Playwright viewport only → live HLS)
• Launches Chromium with Playwright
• Captures page screenshots at 3 fps (JPEG)
• Converts to raw RGB → pipes to FFmpeg → HLS “event” playlist
• Serves /playlist.m3u8 + /segments/* via Flask + hls.js
"""

import asyncio, signal, sys, time, io, subprocess, threading
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image
from flask import Flask, send_from_directory, jsonify
from werkzeug.serving import make_server

from playwright.async_api import async_playwright  # pip install playwright

# ────────────────────────────────────────────────────────────────────────────────
#  Playwright controller
# ────────────────────────────────────────────────────────────────────────────────
class BrowserController:
    def __init__(self, headless=False):
        self.headless = headless
        self._pw = self._browser = self.page = None

    async def start(self, url: str):
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(headless=self.headless)
        self.page = await self._browser.new_page(
            viewport={'width': 1280, 'height': 720})
        await self.page.goto(url)
        print(f"🌐 Chromium ready → {url}")

    async def stop(self):
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()

# ────────────────────────────────────────────────────────────────────────────────
#  Screen recorder (captures page only)
# ────────────────────────────────────────────────────────────────────────────────
class ScreenRecorder:
    WIDTH, HEIGHT, FPS = 1280, 720, 3

    def __init__(self, page, out_dir="stream_output"):
        self.page = page
        self.out_dir = Path(out_dir); self.out_dir.mkdir(exist_ok=True)
        self.seg_dir = self.out_dir / "segments"; self.seg_dir.mkdir(exist_ok=True)
        self.playlist = self.out_dir / "playlist.m3u8"
        self.ffmpeg: Optional[subprocess.Popen] = None
        self.frames = 0
        self._task: Optional[asyncio.Task] = None
        self.running = False

    # –– public ––
    async def start(self):
        if self.running:
            return
        self._launch_ffmpeg()
        self.running = True
        self._task = asyncio.create_task(self._loop())
        print("🎥 Recorder started (capturing Playwright page)")

    async def stop(self):
        if not self.running:
            return
        self.running = False
        if self._task:
            await self._task
        if self.ffmpeg:
            try:
                self.ffmpeg.stdin.close()
                self.ffmpeg.wait(timeout=5)
            except Exception:
                self.ffmpeg.kill()
        print("🛑 Recorder stopped")

    # –– internals ––
    def _launch_ffmpeg(self):
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{self.WIDTH}x{self.HEIGHT}", "-r", str(self.FPS), "-i", "-",
            "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
            "-crf", "30", "-g", str(self.FPS * 2),
            "-f", "hls",
            "-hls_time", "2", "-hls_list_size", "10",
            "-hls_flags", "delete_segments+independent_segments",
            "-hls_base_url", "/segments/",
            "-hls_segment_filename", str(self.seg_dir / "seg%05d.ts"),
            "-hls_playlist_type", "event",
            str(self.playlist),
        ]
        self.ffmpeg = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                                       stdout=subprocess.DEVNULL,
                                       stderr=subprocess.PIPE, bufsize=10**7)
        print(f"📝 FFmpeg PID {self.ffmpeg.pid}")

    async def _loop(self):
        interval = 1 / self.FPS
        while self.running:
            start = time.perf_counter()

            # --- Grab Playwright screenshot (JPEG, quality 80) ---
            buf = await self.page.screenshot(type="jpeg", quality=80)
            img = Image.open(io.BytesIO(buf)).convert("RGB")
            img = img.resize((self.WIDTH, self.HEIGHT), Image.LANCZOS)
            frame = np.asarray(img, dtype=np.uint8)

            try:
                self.ffmpeg.stdin.write(frame.tobytes())
                self.frames += 1
            except BrokenPipeError:
                print("❌ FFmpeg pipe closed")
                self.running = False
                break

            # pacing
            elapsed = time.perf_counter() - start
            await asyncio.sleep(max(0, interval - elapsed))

# ────────────────────────────────────────────────────────────────────────────────
#  Flask HLS server
# ────────────────────────────────────────────────────────────────────────────────
PLAYER_HTML = """<!doctype html><html><head><title>Stream</title>
<style>html,body{margin:0;background:#000}video{width:100%}</style></head>
<body><video id="v" controls autoplay muted playsinline></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
const v=document.getElementById('v');
if(Hls.isSupported()){const h=new Hls({lowLatencyMode:true});
h.loadSource('/playlist.m3u8');h.attachMedia(v);}
else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src='/playlist.m3u8'}
else alert('No HLS support');</script></body></html>"""

class StreamServer:
    def __init__(self, recorder: ScreenRecorder, host="127.0.0.1", port=5000):
        self.rec = recorder
        self.app = Flask(__name__)
        self.host, self.port = host, port

        # routes
        self.app.add_url_rule("/", "index", lambda: PLAYER_HTML)
        self.app.add_url_rule("/playlist.m3u8", "pl", self._playlist)
        self.app.add_url_rule("/segments/<path:name>", "seg", self._segment)
        self.app.add_url_rule("/status", "status", self._status)

        self.httpd = make_server(host, port, self.app, threaded=True)

    def _playlist(self):
        if self.rec.playlist.exists():
            return send_from_directory(self.rec.playlist.parent,
                                       self.rec.playlist.name,
                                       mimetype="application/vnd.apple.mpegurl")
        return "Playlist not ready", 404

    def _segment(self, name):
        return send_from_directory(self.rec.seg_dir, name,
                                   mimetype="video/mp2t")

    def _status(self):
        return jsonify({"frames": self.rec.frames,
                        "running": self.rec.running})

    def start(self):
        threading.Thread(target=self.httpd.serve_forever,
                         daemon=True).start()
        print(f"🌐 Flask → http://{self.host}:{self.port}")

    def stop(self):
        self.httpd.shutdown()

# ────────────────────────────────────────────────────────────────────────────────
#  Coordinator
# ────────────────────────────────────────────────────────────────────────────────
class BrowserStreamer:
    def __init__(self, url="https://example.com", headless=False):
        self.browser = BrowserController(headless)
        self.url = url
        self.rec: Optional[ScreenRecorder] = None
        self.server: Optional[StreamServer] = None
        self.alive = False

    async def start(self):
        # Launch browser
        await self.browser.start(self.url)

        # Recorder & server
        self.rec = ScreenRecorder(self.browser.page)
        self.server = StreamServer(self.rec)
        self.server.start()
        await self.rec.start()

        self.alive = True
        print("🚀 Ready — open http://127.0.0.1:5000")

    async def stop(self):
        if not self.alive:
            return
        await self.rec.stop()
        await self.browser.stop()
        self.server.stop()
        self.alive = False
        print("✅ Shutdown complete")

# ────────────────────────────────────────────────────────────────────────────────
#  Entry
# ────────────────────────────────────────────────────────────────────────────────
async def _main():
    bs = BrowserStreamer(headless=False)  # True = headless capture
    # graceful Ctrl-C
    signal.signal(signal.SIGINT,
                  lambda *_: asyncio.create_task(bs.stop()) or sys.exit())

    await bs.start()
    while bs.alive:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(_main())
