#!/usr/bin/env python3
"""
Stable-latency Playwright → RAM-only HLS streamer
• 1-second, self-contained segments (≈1-1.3 s glass-to-glass)
• LIVE / DVR toggle with accurate latency read-out
"""

import asyncio, io, signal, sys, time, subprocess, threading
from collections import deque
from typing import Dict, Optional

import numpy as np
from PIL import Image
from flask import Flask, request, Response
from werkzeug.serving import make_server
from playwright.async_api import async_playwright

# ── config ──────────────────────────────────────────────────────────────
HOST, PORT = "127.0.0.1", 5000
W, H, FPS  = 1280, 720, 3
SEG_DUR    = 1                     # seconds per HLS segment
SEG_KEEP   = 600                   # how many segments to keep in RAM

# ════════════════════════════════════════════════════════════════════════
#  In-memory playlist + segments
# ════════════════════════════════════════════════════════════════════════
class MemHLS:
    def __init__(self, keep=SEG_KEEP):
        self.playlist: str = ""
        self.segs: Dict[str, bytes] = {}
        self.order = deque(maxlen=keep)

    def put_playlist(self, data: bytes):
        self.playlist = data.decode()

    def put_segment(self, name: str, data: bytes):
        self.segs[name] = data
        self.order.append(name)
        while len(self.order) > self.order.maxlen:
            self.segs.pop(self.order.popleft(), None)

    def get_playlist(self) -> str:
        return self.playlist

    def get_segment(self, name: str) -> Optional[bytes]:
        return self.segs.get(name)


STORE = MemHLS()

# ════════════════════════════════════════════════════════════════════════
#  Recorder  (Playwright page → FFmpeg stdin → HLS PUT back to Flask)
# ════════════════════════════════════════════════════════════════════════
class Recorder:
    def __init__(self, page):
        self.page = page
        self.proc: Optional[subprocess.Popen] = None
        self.running = False

    async def start(self):
        self._spawn_ffmpeg()
        self.running = True
        asyncio.create_task(self._capture_loop())

    async def stop(self):
        self.running = False
        if self.proc:
            try:
                self.proc.stdin.close()
                self.proc.wait(timeout=3)
            except Exception:
                self.proc.kill()

    def _spawn_ffmpeg(self):
        seg_url = f"http://{HOST}:{PORT}/segments/seg%09d.ts"
        pl_url  = f"http://{HOST}:{PORT}/playlist.m3u8"

        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "quiet", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",

            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-crf", "30",
            "-g", "3", "-keyint_min", "3",       # every segment starts with I-frame

            "-f", "hls",
            "-method", "PUT",
            "-hls_time", str(SEG_DUR),
            "-hls_list_size", "6",
            "-hls_flags",
              "delete_segments+independent_segments+program_date_time",
            "-hls_base_url", "/segments/",
            "-hls_segment_filename", seg_url,
            "-hls_playlist_type", "event",
            pl_url,
        ]
        self.proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            bufsize=10**7,
        )

    async def _capture_loop(self):
        frame_interval = 1 / FPS
        while self.running:
            t0 = time.perf_counter()

            jpeg = await self.page.screenshot(type="jpeg", quality=75)
            rgb  = np.asarray(
                Image.open(io.BytesIO(jpeg))
                     .resize((W, H), Image.LANCZOS)
                     .convert("RGB"),
                np.uint8,
            )

            try:
                self.proc.stdin.write(rgb.tobytes())
            except BrokenPipeError:
                break

            elapsed = time.perf_counter() - t0
            await asyncio.sleep(max(0, frame_interval - elapsed))

# ════════════════════════════════════════════════════════════════════════
#  Flask app  (serves player & handles PUTs from FFmpeg)
# ════════════════════════════════════════════════════════════════════════
def create_app():
    app = Flask(__name__)

    PLAYER_HTML = """
<!doctype html><html><head>
<title>Live Stream</title>
<style>
html,body{margin:0;background:#000;font-family:sans-serif;color:#fff}
#bar{padding:6px;background:#111;display:flex;gap:8px;align-items:center}
button{padding:2px 6px}
/* Hide loading spinner completely */
video::-webkit-media-controls-loading-panel {display: none !important;}
video::-webkit-media-controls-buffering-indicator {display: none !important;}
</style></head><body>
<div id="bar">
  <button id="live">LIVE</button><span id="lat"></span>
</div>
<video id="v" playsinline muted autoplay controls style="width:100%"></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
let live = true;
const v   = document.getElementById('v');
const btn = document.getElementById('live');
const hls = new Hls({ 
  lowLatencyMode: true, 
  liveSyncDurationCount: 1,
  maxBufferLength: 2,
  maxMaxBufferLength: 4,
  liveMaxLatencyNum: 1
});

hls.loadSource('/playlist.m3u8');
hls.attachMedia(v);

// Enhanced live mode function
function enforceLibeMode() {
  if (!live) return;
  
  // Force to live edge if not already there
  const currentTime = v.currentTime;
  const duration = v.duration;
  if (duration && currentTime < duration - 0.5) {
    // Seek to live position using HLS.js liveSyncPosition
    const livePos = hls.liveSyncPosition;
    if (livePos !== null && livePos > 0) {
      v.currentTime = livePos;
    } else {
      // Fallback: seek to end of buffer
      v.currentTime = duration;
    }
  }
  
  // Force play if paused
  if (v.paused) {
    v.play().catch(() => {}); // Ignore errors
  }
}

btn.onclick = () => { 
  live = !live; 
  btn.textContent = live ? 'LIVE' : 'DVR';
  if (live) {
    enforceLibeMode();
  }
};

// Multiple event handlers to ensure live mode stays active
hls.on(Hls.Events.LEVEL_UPDATED, () => {
  if (live) enforceLibeMode();
});

hls.on(Hls.Events.FRAG_LOADED, () => {
  if (live) enforceLibeMode();
});

// Prevent pausing in live mode
v.addEventListener('pause', () => {
  if (live) {
    setTimeout(() => {
      if (live && v.paused) {
        v.play().catch(() => {});
      }
    }, 10);
  }
});

// Regularly enforce live mode
setInterval(() => {
  if (live) enforceLibeMode();
}, 200);

// Latency display
setInterval(() => {
  const lat = hls.latency !== undefined ? hls.latency.toFixed(2) : '-';
  document.getElementById('lat').textContent = ' ' + lat + ' s';
}, 500);
</script></body></html>
"""

    # index
    @app.route("/")
    @app.route("/index.html")
    def index():
        return PLAYER_HTML

    # playlist PUT / GET
    @app.route("/playlist.m3u8", methods=["PUT", "GET"])
    def playlist():
        if request.method == "PUT":
            STORE.put_playlist(request.data)
            return ""
        pl = STORE.get_playlist()
        if not pl:
            return "", 404
        return Response(pl, mimetype="application/vnd.apple.mpegurl")

    # segment PUT / GET
    @app.route("/segments/<name>", methods=["PUT", "GET"])
    def segment(name):
        if request.method == "PUT":
            STORE.put_segment(name, request.data)
            return ""
        data = STORE.get_segment(name)
        return Response(data, mimetype="video/mp2t") if data else ("", 404)

    return app

# ════════════════════════════════════════════════════════════════════════
#  Orchestrator
# ════════════════════════════════════════════════════════════════════════
async def main():
    # Flask
    httpd = make_server(HOST, PORT, create_app(), threaded=True)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print(f"Player → http://{HOST}:{PORT}")

    # Playwright
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=False)
    page = await browser.new_page(viewport={'width': W, 'height': H})
    await page.goto("https://example.com")

    recorder = Recorder(page)
    await recorder.start()

    # graceful Ctrl-C
    def shutdown(*_):
        print("Stopping…")
        asyncio.create_task(recorder.stop())
        httpd.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)

    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
