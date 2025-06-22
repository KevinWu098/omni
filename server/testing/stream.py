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
import av  # Requires python-av
from aiortc import RTCPeerConnection, VideoStreamTrack, RTCSessionDescription

# Globals for WebRTC streaming
LATEST_FRAME = None  # holds the most recent captured frame
pcs = set()  # active peer connections
MAIN_LOOP = None  # will hold the main asyncio event loop

# WebRTC video track for low-latency live streaming
class ScreenTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()

    async def recv(self):
        global LATEST_FRAME
        # Wait until a frame is available
        while LATEST_FRAME is None:
            await asyncio.sleep(0.01)
        pts, time_base = await self.next_timestamp()
        frame = LATEST_FRAME
        video_frame = av.VideoFrame.from_ndarray(frame, format='rgb24')
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

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

            # Update global latest frame for WebRTC
            global LATEST_FRAME
            LATEST_FRAME = rgb

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
#timeInfo{margin-left:auto;font-size:12px;color:#999}
/* Hide loading spinner completely */
video::-webkit-media-controls-loading-panel {display: none !important;}
video::-webkit-media-controls-buffering-indicator {display: none !important;}
/* Hide controls when in live mode */
.live-mode video {pointer-events: none;}
.live-mode video::-webkit-media-controls {display: none !important;}
.live-mode video::-webkit-media-controls-panel {display: none !important;}
</style></head><body>
<div id="bar">
  <button id="live">LIVE</button><span id="lat"></span>
  <span id="webrtcStatus" style="margin-left:8px;color:#0f0;display:none;">webrtc: connecting</span>
  <div id="timeInfo"></div>
</div>
<video id="hlsVideo" playsinline muted autoplay controls style="width:100%"></video>
<video id="webrtcVideo" autoplay muted playsinline style="width:100%;display:none;"></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script>
let live = true;
const hlsVideo = document.getElementById('hlsVideo');
const webrtcVideo = document.getElementById('webrtcVideo');
const btn = document.getElementById('live');
const timeInfo = document.getElementById('timeInfo');
const statusSpan = document.getElementById('webrtcStatus');
const hls = new Hls({ 
  lowLatencyMode: true, 
  liveSyncDurationCount: 1,
  maxBufferLength: 2,
  maxMaxBufferLength: 4,
  liveMaxLatencyNum: 1
});

// Function to update time display
function updateTimeDisplay() {
  const currentTime = hlsVideo.currentTime || 0;
  const duration = hlsVideo.duration || 0;
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (live) {
    timeInfo.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  } else {
    timeInfo.textContent = '';
  }
}

// Function to toggle live mode UI
function toggleLiveModeUI() {
  console.log("toggleLiveModeUI live=", live);
  statusSpan.style.display = live ? '' : 'none';
  if (live) {
    hls.stopLoad();
    hls.detachMedia();
    document.body.classList.add('live-mode');
    hlsVideo.style.display = 'none';
    hlsVideo.removeAttribute('controls');
    webrtcVideo.style.display = '';
    startWebRTC();
  } else {
    document.body.classList.remove('live-mode');
    webrtcVideo.style.display = 'none';
    webrtcVideo.srcObject = null;
    hlsVideo.style.display = '';
    hlsVideo.setAttribute('controls', '');
    hls.loadSource('/playlist.m3u8');
    hls.attachMedia(hlsVideo);
    // Reset WebRTC connection and status
    if (pc) {
      try { pc.close(); } catch(e) { console.error("Error closing PC on DVR toggle", e); }
      pc = null;
    }
    statusSpan.textContent = '';
  }
  updateTimeDisplay();
}

// Enhanced live mode function - always go to absolute latest frame
function enforceLiveMode() {
  if (!live) return;
  
  // Always seek to the absolute latest frame
  const duration = hlsVideo.duration;
  if (duration && duration > 0) {
    // Use HLS.js liveSyncPosition for most accurate live position
    const livePos = hls.liveSyncPosition;
    if (livePos !== null && livePos > 0) {
      // Always seek to live position, regardless of current position
      hlsVideo.currentTime = livePos;
    } else {
      // Fallback: seek to absolute end
      hlsVideo.currentTime = duration;
    }
  }
  
  // Force play if paused
  if (hlsVideo.paused) {
    hlsVideo.play().catch(() => {}); // Ignore errors
  }
}

btn.onclick = () => { 
  live = !live; 
  btn.textContent = live ? 'LIVE' : 'DVR';
  toggleLiveModeUI();
  if (!live) {
    // when switching back to DVR, sync HLS to live
    enforceLiveMode();
  }
};

// Multiple event handlers to ensure live mode stays active
hls.on(Hls.Events.LEVEL_UPDATED, () => {
  if (live) enforceLiveMode();
});

hls.on(Hls.Events.FRAG_LOADED, () => {
  if (live) enforceLiveMode();
});

// Prevent pausing in live mode
hlsVideo.addEventListener('pause', () => {
  if (live) {
    setTimeout(() => {
      if (live && hlsVideo.paused) {
        hlsVideo.play().catch(() => {});
      }
    }, 10);
  }
});

// Prevent seeking in live mode
hlsVideo.addEventListener('seeking', () => {
  if (live) {
    setTimeout(() => {
      if (live) {
        enforceLiveMode();
      }
    }, 10);
  }
});

// Regularly enforce live mode - more aggressively
setInterval(() => {
  if (live) enforceLiveMode();
}, 100); // More frequent updates

// Update time display regularly
setInterval(() => {
  updateTimeDisplay();
}, 250);

// Latency display
setInterval(() => {
  const lat = hls.latency !== undefined ? hls.latency.toFixed(2) : '-';
  document.getElementById('lat').textContent = ' ' + lat + ' s';
}, 500);
</script>
<script>
// WebRTC setup for live
let pc = null;
const status = document.getElementById('webrtcStatus');
async function startWebRTC() {
  console.log("startWebRTC called");
  if (pc) {
    try { pc.close(); } catch(e) { console.error("Error closing old PC", e); }
  }
  pc = new RTCPeerConnection({iceServers: []});
  status.textContent = 'webrtc: connecting';
  console.log("RTCPeerConnection created", pc);
  pc.onicecandidate = event => {
    if (event.candidate) console.log("ICE candidate", event.candidate);
  };
  pc.onconnectionstatechange = () => {
    console.log("Connection state:", pc.connectionState);
    if (status) {
      status.textContent = 'webrtc: ' + pc.connectionState;
    }
    if (['disconnected','failed','closed'].includes(pc.connectionState)) {
      console.warn("WebRTC connection state is", pc.connectionState, "-- retrying in 2s");
      setTimeout(startWebRTC, 2000);
    }
  };
  pc.ontrack = (event) => {
    console.log("ontrack event:", event);
    webrtcVideo.srcObject = event.streams[0];
    try {
      const playPromise = webrtcVideo.play();
      if (playPromise instanceof Promise) {
        playPromise.catch(e => console.error("webrtcVideo play error", e));
      }
    } catch(e) {
      console.error("webrtcVideo play invocation error", e);
    }
  };
  const offer = await pc.createOffer({offerToReceiveVideo: true});
  console.log("Offer SDP generated");
  await pc.setLocalDescription(offer);
  console.log("Local SDP set, sending to server");
  try {
    const response = await fetch('/offer', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sdp: pc.localDescription.sdp, type: pc.localDescription.type})
    });
    console.log("fetch /offer status", response.status);
    const data = await response.json();
    console.log("Server SDP answer", data);
    if (!response.ok || data.error) {
      console.error('WebRTC offer error', data.error || data);
      return;
    }
    await pc.setRemoteDescription(data);
    console.log("Remote SDP set");
  } catch (e) {
    console.error("startWebRTC error", e);
  }
}

// Initialize UI after WebRTC setup
toggleLiveModeUI();
</script>
</body></html>
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

    # serve missing favicon to avoid browser 404
    @app.route('/favicon.ico')
    def favicon():
        return '', 204

    # WebRTC offer signaling endpoint
    @app.route('/offer', methods=['POST'])
    def offer():
        params = request.get_json()
        offer_desc = RTCSessionDescription(sdp=params['sdp'], type=params['type'])
        try:
            # Perform SDP negotiation on main loop
            async def handle_offer():
                pc = RTCPeerConnection()
                pcs.add(pc)
                @pc.on('iceconnectionstatechange')
                async def on_icestatechange():
                    if pc.iceConnectionState == 'failed':
                        await pc.close()
                        pcs.discard(pc)
                pc.addTrack(ScreenTrack())
                await pc.setRemoteDescription(offer_desc)
                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                # Wait for ICE gathering
                while pc.iceGatheringState != 'complete':
                    await asyncio.sleep(0.1)
                return pc.localDescription

            # Schedule negotiation in the main event loop
            assert MAIN_LOOP is not None, "Main event loop is not initialized"
            future = asyncio.run_coroutine_threadsafe(handle_offer(), MAIN_LOOP)
            answer = future.result(timeout=30)
            return {'sdp': answer.sdp, 'type': answer.type}
        except Exception as e:
            import traceback; traceback.print_exc()
            return {'error': str(e)}, 500

    return app

# ════════════════════════════════════════════════════════════════════════
#  Orchestrator
# ════════════════════════════════════════════════════════════════════════
async def main():
    global MAIN_LOOP
    MAIN_LOOP = asyncio.get_running_loop()
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

