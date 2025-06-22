#!/usr/bin/env python3
"""
Stable-latency Playwright → RAM-only HLS streamer
• 1-second, self-contained segments (≈1-1.3 s glass-to-glass)
• LIVE / DVR toggle with accurate latency read-out

Logging (log(msg)) prints seconds since program start so we can spot slow steps.
"""

import asyncio, io, signal, sys, time, subprocess, threading
from collections import deque
from typing import Dict, Optional

import numpy as np
from PIL import Image
from flask import Flask, request, Response
from werkzeug.serving import make_server
import av  # Requires python-av
from aiortc import RTCPeerConnection, VideoStreamTrack, RTCSessionDescription
from browser_use import BrowserSession

# ════════════════════════════════════════════════════════════════════════
#  Logging util
# ════════════════════════════════════════════════════════════════════════
_START = time.perf_counter()
def log(msg: str):
    print(f"[{time.perf_counter() - _START:8.3f}s] {msg}", flush=True)

# Globals for WebRTC streaming
LATEST_FRAME = None
pcs = set()
MAIN_LOOP = None

# WebRTC video track for low-latency live streaming
class ScreenTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()

    async def recv(self):
        global LATEST_FRAME
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
SEG_DUR    = 1
SEG_KEEP   = 600

# ════════════════════════════════════════════════════════════════════════
#  In-memory playlist + segments
# ════════════════════════════════════════════════════════════════════════
class MemHLS:
    def __init__(self, keep=SEG_KEEP):
        self.playlist: str = ""
        self.segs: Dict[str, bytes] = {}
        self.order = deque(maxlen=keep)

    def put_playlist(self, data: bytes):
        log(f"PUT playlist ({len(data)} B)")
        self.playlist = data.decode()

    def put_segment(self, name: str, data: bytes):
        log(f"PUT segment {name} ({len(data)} B)")
        self.segs[name] = data
        self.order.append(name)
        # Only trim when maxlen is set and exceeded
        while self.order.maxlen is not None and len(self.order) > self.order.maxlen:
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
    def __init__(self, session):
        self.session = session
        self.proc: Optional[subprocess.Popen] = None
        self.running = False

    async def start(self):
        log("Recorder.start")
        self._spawn_ffmpeg()
        # get the underlying Playwright page for screenshots
        self.page = await self.session.get_current_page()
        self.running = True
        asyncio.create_task(self._capture_loop())

    async def stop(self):
        log("Recorder.stop")
        self.running = False
        if self.proc:
            try:
                self.proc.stdin.close()
                self.proc.wait(timeout=3)
            except Exception:
                self.proc.kill()

    def _spawn_ffmpeg(self):
        log("Spawning ffmpeg")
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
            "-g", "3", "-keyint_min", "3",
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
        log("ffmpeg spawned")

    async def _capture_loop(self):
        frame_interval = 1 / FPS
        first = True
        while self.running:
            t0 = time.perf_counter()

            # Take screenshot directly for performance
            jpeg = await self.page.screenshot(type="jpeg", quality=75)
            rgb  = np.asarray(
                Image.open(io.BytesIO(jpeg))
                     .resize((W, H), Image.LANCZOS)
                     .convert("RGB"),
                np.uint8,
            )

            global LATEST_FRAME
            LATEST_FRAME = rgb

            try:
                self.proc.stdin.write(rgb.tobytes())
            except BrokenPipeError:
                log("ffmpeg pipe broken")
                break

            if first:
                log("First frame captured and sent to ffmpeg")
                first = False

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
video::-webkit-media-controls-loading-panel{display:none!important}
video::-webkit-media-controls-buffering-indicator{display:none!important}
/* Hide controls when in live mode */
.live-mode video{pointer-events:none}
.live-mode video::-webkit-media-controls{display:none!important}
.live-mode video::-webkit-media-controls-panel{display:none!important}
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
  lowLatencyMode:true,
  liveSyncDurationCount:1,
  maxBufferLength:2,
  maxMaxBufferLength:4,
  liveMaxLatencyNum:1
});
function updateTimeDisplay(){
  const c=hlsVideo.currentTime||0,d=hlsVideo.duration||0;
  const fmt=s=>{const m=Math.floor(s/60),sec=Math.floor(s%60);return`${m}:${sec.toString().padStart(2,'0')}`};
  timeInfo.textContent=live?`${fmt(c)} / ${fmt(d)}`:'';
}
function toggleLiveModeUI(){
  console.log("toggleLiveModeUI live=",live);
  statusSpan.style.display=live?'':'none';
  if(live){
    hls.stopLoad();hls.detachMedia();document.body.classList.add('live-mode');
    hlsVideo.style.display='none';hlsVideo.removeAttribute('controls');
    webrtcVideo.style.display='';startWebRTC();
  }else{
    document.body.classList.remove('live-mode');
    webrtcVideo.style.display='none';webrtcVideo.srcObject=null;
    hlsVideo.style.display='';hlsVideo.setAttribute('controls','');
    hls.loadSource('/playlist.m3u8');hls.attachMedia(hlsVideo);
    if(pc){try{pc.close()}catch(e){}pc=null;}statusSpan.textContent='';
  }
  updateTimeDisplay();
}
function enforceLiveMode(){
  if(!live)return;
  const d=hlsVideo.duration;
  if(d&&d>0){
    const lp=hls.liveSyncPosition;
    hlsVideo.currentTime=(lp!==null&&lp>0)?lp:d;
  }
  if(hlsVideo.paused)hlsVideo.play().catch(()=>{});
}
btn.onclick=()=>{live=!live;btn.textContent=live?'LIVE':'DVR';toggleLiveModeUI();if(!live)enforceLiveMode();};
hls.on(Hls.Events.LEVEL_UPDATED,()=>{if(live)enforceLiveMode();});
hls.on(Hls.Events.FRAG_LOADED,()=>{if(live)enforceLiveMode();});
hlsVideo.addEventListener('pause',()=>{if(live)setTimeout(()=>{if(live&&hlsVideo.paused)hlsVideo.play().catch(()=>{})},10);});
hlsVideo.addEventListener('seeking',()=>{if(live)setTimeout(()=>{if(live)enforceLiveMode();},10);});
setInterval(()=>{if(live)enforceLiveMode();},100);
setInterval(()=>{updateTimeDisplay();},250);
setInterval(()=>{const lat=hls.latency!==undefined?hls.latency.toFixed(2):'-';document.getElementById('lat').textContent=' '+lat+' s';},500);
// WebRTC setup
let pc=null;
const status=document.getElementById('webrtcStatus');
async function startWebRTC(){
  console.log("startWebRTC called");
  if(pc){try{pc.close()}catch(e){}}
  pc=new RTCPeerConnection({iceServers:[]});
  status.textContent='webrtc: connecting';
  pc.onicecandidate=e=>{if(e.candidate)console.log("ICE",e.candidate)};
  pc.onconnectionstatechange=()=>{
    console.log("state",pc.connectionState);
    status.textContent='webrtc: '+pc.connectionState;
    if(['disconnected','failed','closed'].includes(pc.connectionState))setTimeout(startWebRTC,2000);
  };
  pc.ontrack=e=>{
    console.log("ontrack",e);
    webrtcVideo.srcObject=e.streams[0];
    webrtcVideo.play().catch(()=>{});
  };
  const offer=await pc.createOffer({offerToReceiveVideo:true});
  await pc.setLocalDescription(offer);
  try {
    const res = await fetch('/offer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,type:pc.localDescription.type})});
    const data = await res.json();
    if(res.ok && !data.error) {
      await pc.setRemoteDescription(data);
    } else {
      throw new Error('Bad response from /offer');
    }
  } catch (e) {
    console.error('startWebRTC fetch error', e);
    setTimeout(startWebRTC, 2000);
  }
}
toggleLiveModeUI();
</script>
</body></html>
"""

    @app.route("/")
    @app.route("/index.html")
    def index():
        log("GET /")
        return PLAYER_HTML

    @app.route("/playlist.m3u8", methods=["PUT", "GET"])
    def playlist():
        if request.method == "PUT":
            STORE.put_playlist(request.data)
            return ""
        log("GET playlist")
        pl = STORE.get_playlist()
        if not pl:
            return "", 404
        return Response(pl, mimetype="application/vnd.apple.mpegurl")

    @app.route("/segments/<name>", methods=["PUT", "GET"])
    def segment(name):
        if request.method == "PUT":
            STORE.put_segment(name, request.data)
            return ""
        log(f"GET segment {name}")
        data = STORE.get_segment(name)
        return Response(data, mimetype="video/mp2t") if data else ("", 404)

    @app.route('/favicon.ico')
    def favicon():
        return '', 204

    @app.route('/offer', methods=['POST'])
    def offer():
        log("POST /offer")
        params = request.get_json()
        offer_desc = RTCSessionDescription(sdp=params['sdp'], type=params['type'])
        async def handle_offer():
            pc = RTCPeerConnection()
            pcs.add(pc)
            @pc.on('iceconnectionstatechange')
            async def _():
                log(f"ICE state {pc.iceConnectionState}")
                if pc.iceConnectionState == 'failed':
                    await pc.close()
                    pcs.discard(pc)
            pc.addTrack(ScreenTrack())
            await pc.setRemoteDescription(offer_desc)
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            while pc.iceGatheringState != 'complete':
                await asyncio.sleep(0.1)
            return pc.localDescription
        future = asyncio.run_coroutine_threadsafe(handle_offer(), MAIN_LOOP)
        answer = future.result(timeout=30)
        log("POST /offer done")
        return {'sdp': answer.sdp, 'type': answer.type}
    return app

# ════════════════════════════════════════════════════════════════════════
#  Orchestrator
# ════════════════════════════════════════════════════════════════════════
async def main():
    global MAIN_LOOP
    MAIN_LOOP = asyncio.get_running_loop()

    httpd = make_server(HOST, PORT, create_app(), threaded=True)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    log(f"Serving http://{HOST}:{PORT}")

    # launch a headful browser with fixed window and viewport size
    session = BrowserSession(
        viewport_expansion=-1,   # type: ignore
        highlight_elements=True,  # type: ignore
        headless=True, # type: ignore
        disable_security=True,  # type: ignore
        user_data_dir=None, # type: ignore
        chromium_sandbox=False, # type: ignore
        args=["--no-sandbox", "--disable-gpu-sandbox", "--disable-setuid-sandbox"], # type: ignore
    )
    await session.start()
    # Navigate to the starting URL
    page = await session.get_current_page()
    await page.set_viewport_size({"width": W, "height": H})
    await page.goto("https://example.com")
    log("Page loaded")

    recorder = Recorder(session)
    await recorder.start()
    log("Recorder started")

    def shutdown(*_):
        log("Shutdown")
        asyncio.create_task(recorder.stop())
        asyncio.create_task(session.stop())
        httpd.shutdown()
        sys.exit(0)
    signal.signal(signal.SIGINT, shutdown)

    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
