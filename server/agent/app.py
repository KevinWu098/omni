from flask import Flask, request, jsonify, Response, stream_with_context
from dotenv import load_dotenv
import json
from uuid import uuid4

from service import VideoAgentService
from flask_cors import CORS

# Mapping from run IDs to VideoAgentService instances
agents = {}

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/run_command", methods=["POST"])
def run_command():
    data = request.get_json(force=True)
    command = data.get("command")
    if not command:
        return jsonify({"error": "Missing 'command' in JSON body"}), 400

    # Create a new service instance with a unique run ID
    run_id = str(uuid4())
    service = VideoAgentService(run_id)
    agents[run_id] = service

    def generate():
        try:
            # Stream the unique run ID as the first message
            yield f"data: {{'type': 'uuid', 'id': '{run_id}'}}\n\n"
            # Stream logs and results
            for log_data in service.run_command_streaming(command):
                yield log_data
            # Signal completion to client
            yield "data: {'type': 'done'}\n\n"
        finally:
            service.shutdown()
            # Mark the agent as done for future streaming endpoints
            service.done = True

    return Response(
        stream_with_context(generate()),
        content_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )

@app.route("/stream/<run_id>/playlist.m3u8", methods=["PUT", "GET"])
def playlist(run_id):
    service = agents.get(run_id)
    if not service:
        return "", 404
    if request.method == "PUT":
        service.hls.put_playlist(request.data)
        return ""
    pl = service.get_playlist()
    if not pl:
        return "", 404
    return Response(pl, mimetype="application/vnd.apple.mpegurl")

@app.route("/stream/<run_id>/segments/<name>", methods=["PUT", "GET"])
def segment(run_id, name):
    service = agents.get(run_id)
    if not service:
        return "", 404
    if request.method == "PUT":
        service.hls.put_segment(name, request.data)
        return ""
    data = service.get_segment(name)
    if not data:
        return "", 404
    return Response(data, mimetype="video/mp2t")

@app.route("/stream/<run_id>/offer", methods=["POST"])
def offer(run_id):
    service = agents.get(run_id)
    if not service:
        return jsonify({"error": "Unknown run_id"}), 404
    params = request.get_json(force=True)
    answer = service.handle_offer(params)
    return jsonify(answer)

# Simple UI route for viewing HLS/WebRTC with live/DVR toggle
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
  const fmt=s=>{const m=Math.floor(s/60),sec=Math.floor(s%60);return`${m}:${sec.toString().padStart(2,'0')}`};
  timeInfo.textContent=live?`${fmt(c)} / ${fmt(d)}`:'';
}
function enforceLiveMode(){
  if(!live)return;
  const d=hlsVideo.duration;
  if(d&&d>0){const lp=hls.liveSyncPosition;hlsVideo.currentTime=(lp!==null&&lp>0)?lp:d;}
  if(hlsVideo.paused)hlsVideo.play().catch(()=>{});
}
async function startWebRTC(){
  if(pc){try{pc.close()}catch(e){}}
  pc=new RTCPeerConnection({iceServers:[]});
  statusSpan.textContent='webrtc: connecting';
  pc.onicecandidate=e=>{};
  pc.onconnectionstatechange=()=>{statusSpan.textContent='webrtc: '+pc.connectionState; if(['disconnected','failed','closed'].includes(pc.connectionState))setTimeout(startWebRTC,2000);};
  pc.ontrack=e=>{webrtcVideo.srcObject=e.streams[0]; webrtcVideo.play().catch(()=>{});};
  const offer=await pc.createOffer({offerToReceiveVideo:true}); await pc.setLocalDescription(offer);
  try {
    const res = await fetch(`${base}/offer`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,type:pc.localDescription.type})});
    const data = await res.json(); if(res.ok && !data.error) await pc.setRemoteDescription(data);
  } catch(e) { setTimeout(startWebRTC,2000); }
}
function toggleLiveModeUI(){
  statusSpan.style.display=live?'':'none';
  if(live){hls.stopLoad();hls.detachMedia();document.body.classList.add('live-mode');hlsVideo.style.display='none';hlsVideo.removeAttribute('controls');webrtcVideo.style.display='';startWebRTC();}
  else{document.body.classList.remove('live-mode');webrtcVideo.style.display='none';webrtcVideo.srcObject=null;hlsVideo.style.display='';hlsVideo.setAttribute('controls','');hls.loadSource(`${base}/playlist.m3u8`);hls.attachMedia(hlsVideo);if(pc){try{pc.close()}catch(e){}}pc=null;statusSpan.textContent='';}
  updateTimeDisplay();
}
btn.onclick=()=>{live=!live;btn.textContent=live?'LIVE':'DVR';toggleLiveModeUI();if(!live)enforceLiveMode();};
toggleLiveModeUI();
</script>
"""
@app.route("/view")
def view():
    return VIEW_HTML

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)
