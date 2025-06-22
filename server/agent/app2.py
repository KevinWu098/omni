from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio
import json
import os
import logging
from uuid import uuid4
from pydantic import BaseModel
from typing import Dict, List, Optional

from service import VideoAgentService

# Mapping from run IDs to VideoAgentService instances
agents: Dict[str, VideoAgentService] = {}

# Load environment variables
load_dotenv()

app = FastAPI()
# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request bodies
default_error = HTTPException(status_code=400, detail="Invalid request")


class RunCommandBody(BaseModel):
    commands: List[str]
    run_id: Optional[str] = None
    soft_shutdown_on_end: Optional[bool] = False


class ShutdownBody(BaseModel):
    delete_video: Optional[bool] = False


class OfferParams(BaseModel):
    sdp: str
    type: str


@app.get("/diag")
async def diag():
    return {"agents": list(agents.keys())}


@app.post("/run_command")
async def run_command(body: RunCommandBody):
    commands = body.commands
    if not commands:
        raise HTTPException(
            status_code=400, detail="Missing 'commands' in request body"
        )
    run_id = body.run_id
    # Create or reuse agent service
    if not run_id:
        run_id = str(uuid4())
        service = VideoAgentService(run_id)
        agents[run_id] = service
    else:
        if run_id not in agents:
            service = VideoAgentService(run_id)
            agents[run_id] = service
        else:
            service = agents[run_id]
            service.done = False

    def event_stream():
        try:
            # Send the generated run ID first
            yield f"data: {{'type': 'uuid', 'id': '{run_id}'}}\n\n"
            # Ensure recorder is running
            asyncio.run_coroutine_threadsafe(
                service.recorder.start(), service.loop
            ).result()
            # Stream logs and results
            for log_data in service.run_command_streaming(commands):
                yield log_data
            # Signal completion to client
            yield "data: {'type': 'done'}\n\n"
            # Pause recording
            asyncio.run_coroutine_threadsafe(
                service.recorder.stop(), service.loop
            ).result()
            if body.soft_shutdown_on_end:
                service.shutdown()
        except Exception as e:
            yield f"data: {{'type': 'error', 'content': '{str(e)}'}}\n\n"
            # Pause recording and shutdown
            asyncio.run_coroutine_threadsafe(
                service.recorder.stop(), service.loop
            ).result()
            service.shutdown()
            agents.pop(run_id, None)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/shutdown_run/{run_id}")
async def shutdown_run(run_id: str, body: ShutdownBody):
    if body.delete_video:
        service = agents.pop(run_id, None)
    else:
        service = agents.get(run_id)
    if service:
        service.shutdown()
        return {"message": f"Run ID {run_id} shut down successfully."}
    raise HTTPException(status_code=404, detail=f"Run ID {run_id} not found.")


@app.put("/stream/{run_id}/playlist.m3u8")
async def put_playlist(run_id: str, request: Request):
    service = agents.get(run_id)
    if not service:
        raise HTTPException(status_code=404, detail="Unknown run_id")
    data = await request.body()
    service.hls.put_playlist(data)
    return Response(status_code=200)


@app.get("/stream/{run_id}/playlist.m3u8")
async def get_playlist(run_id: str):
    service = agents.get(run_id)
    if not service:
        raise HTTPException(status_code=404, detail="Unknown run_id")
    pl = service.get_playlist()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return Response(content=pl, media_type="application/vnd.apple.mpegurl")


@app.put("/stream/{run_id}/segments/{name}")
async def put_segment(run_id: str, name: str, request: Request):
    service = agents.get(run_id)
    if not service:
        raise HTTPException(status_code=404, detail="Unknown run_id")
    data = await request.body()
    service.hls.put_segment(name, data)
    return Response(status_code=200)


@app.get("/stream/{run_id}/segments/{name}")
async def get_segment(run_id: str, name: str):
    service = agents.get(run_id)
    if not service:
        raise HTTPException(status_code=404, detail="Unknown run_id")
    data = service.get_segment(name)
    if not data:
        raise HTTPException(status_code=404, detail="Segment not found")
    return Response(content=data, media_type="video/mp2t")


@app.post("/stream/{run_id}/offer")
async def offer(run_id: str, params: OfferParams):
    service = agents.get(run_id)
    if not service:
        raise HTTPException(status_code=404, detail="Unknown run_id")
    if getattr(service, "done", False):
        raise HTTPException(status_code=410, detail="WebRTC stream has ended")
    try:
        answer = service.handle_offer(params.dict())
        return answer
    except RuntimeError:
        raise HTTPException(status_code=410, detail="Agent not available")


# Embedded HTML for simple viewer
VIEW_HTML = """
<!doctype html><html><head>
<title>Live Stream Viewer</title>
<style>
html,body{margin:0;background:#000;font-family:sans-serif;color:#fff}
#bar{padding:6px;background:#111;display:flex;gap:8px;align-items:center}
button{padding:2px 6px}
#timeInfo{margin-left:auto;font-size:12px;color:#999}
video::-webkit-media-controls-loading-panel{display:none!important}
video::-webkit-media-controls-buffering-indicator{display:none!important}
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
let pc = null;
const params = new URLSearchParams(window.location.search);
const runId = params.get('run_id');
if (!runId) { document.body.innerHTML = '<p style="color:white">Missing run_id</p>'; }
const base = `/stream/${runId}`;
let live = true;
const hlsVideo = document.getElementById('hlsVideo');
const webrtcVideo = document.getElementById('webrtcVideo');
const btn = document.getElementById('live');
const timeInfo = document.getElementById('timeInfo');
const statusSpan = document.getElementById('webrtcStatus');
const hls = new Hls({ lowLatencyMode:true, liveSyncDurationCount:1, maxBufferLength:2, maxMaxBufferLength:4, liveMaxLatencyNum:1 });
function updateTimeDisplay(){
  const c=hlsVideo.currentTime||0,d=hlsVideo.duration||0;
  const fmt=s=>{const m=Math.floor(s/60),sec=Math.floor(s%60);
    return`${m}:${sec.toString().padStart(2,'0')}`};
  timeInfo.textContent=live?`${fmt(c)} / ${fmt(d)}`:'';
}
function enforceLiveMode(){ if(!live)return; const d=hlsVideo.duration;
  if(d&&d>0){const lp=hls.liveSyncPosition;
    hlsVideo.currentTime=(lp!==null&&lp>0)?lp:d;} if(hlsVideo.paused)hlsVideo.play().catch(()=>{});
}
async function startWebRTC(){
  if(pc){try{pc.close()}catch(e){}}
  pc=new RTCPeerConnection({iceServers:[]});
  statusSpan.textContent='webrtc: connecting';
  pc.onicecandidate=e=>{};
  pc.onconnectionstatechange=()=>{statusSpan.textContent='webrtc: '+pc.connectionState;
    if(['disconnected','failed','closed'].includes(pc.connectionState))setTimeout(startWebRTC,2000);
  };
  pc.ontrack=e=>{webrtcVideo.srcObject=e.streams[0]; webrtcVideo.play().catch(()=>{});};
  const offer=await pc.createOffer({offerToReceiveVideo:true}); await pc.setLocalDescription(offer);
  try {
    const res = await fetch(`${base}/offer`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,type:pc.localDescription.type})});
    const data = await res.json(); if(res.ok && !data.error) await pc.setRemoteDescription(data);
  } catch(e) { setTimeout(startWebRTC,2000); }
}
function toggleLiveModeUI(){
  statusSpan.style.display=live?'':'none';
  if(live){
    hls.stopLoad();hls.detachMedia();document.body.classList.add('live-mode');
    hlsVideo.style.display='none';hlsVideo.removeAttribute('controls');
    webrtcVideo.style.display='';startWebRTC();
  } else {
    document.body.classList.remove('live-mode');
    webrtcVideo.style.display='none';webrtcVideo.srcObject=null;
    hlsVideo.style.display='';hlsVideo.setAttribute('controls','');
    hls.loadSource(`${base}/playlist.m3u8`);hls.attachMedia(hlsVideo);
    if(pc){try{pc.close()}catch(e){}}pc=null;statusSpan.textContent='';
  }
  updateTimeDisplay();
}
btn.onclick=()=>{live=!live;btn.textContent=live?'LIVE':'DVR';toggleLiveModeUI();if(!live)enforceLiveMode();};
toggleLiveModeUI();
</script>
"""


@app.get("/view")
async def view():
    return HTMLResponse(content=VIEW_HTML, media_type="text/html")


# Add an exception handler on startup to silence benign ConnectionResetError in ProactorEventLoop
@app.on_event("startup")
def _silence_conn_resets():
    loop = asyncio.get_event_loop()

    def handler(loop, context):
        exc = context.get("exception")
        if isinstance(exc, ConnectionResetError):
            return
        loop.default_exception_handler(context)

    loop.set_exception_handler(handler)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
