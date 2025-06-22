import asyncio  
import os  
import logging  
import queue  
import threading  
from pydantic import SecretStr  
from flask import stream_with_context  
  
from browser_use import BrowserSession, Agent  
from langchain_openai import ChatOpenAI  
  
# Video streaming dependencies
import io
import subprocess
import time
from collections import deque
from typing import Dict, Optional

import numpy as np
from PIL import Image
import av
from aiortc import RTCPeerConnection, VideoStreamTrack, RTCSessionDescription

# Video streaming config constants
HOST = "127.0.0.1"
PORT = 5000
W, H, FPS = 1280, 720, 3
SEG_DUR = 1
SEG_KEEP = 600
  
class StreamingLogHandler(logging.Handler):  
    def __init__(self, log_queue):  
        super().__init__()  
        self.log_queue = log_queue  
          
    def emit(self, record):  
        try:  
            msg = self.format(record)  
            self.log_queue.put(msg)  
        except Exception:  
            pass  
  
  
class AgentService:  
    def __init__(self):  
        # Flag to indicate agent completion status
        self.done = False
        self.log_queue = queue.Queue()  
        self.streaming_handler = None  
        self.loop = asyncio.new_event_loop()  
        self.thread = threading.Thread(target=self._start_loop, daemon=True)  
        self.thread.start()  
          
        init_future = asyncio.run_coroutine_threadsafe(self._init(), self.loop)  
        init_future.result()  
  
    async def _init(self):  
        # Set up streaming log handler  
        self.streaming_handler = StreamingLogHandler(self.log_queue)  
        self.streaming_handler.setLevel(logging.INFO)  
        formatter = logging.Formatter('%(levelname)-8s [%(name)s] %(message)s')  
        self.streaming_handler.setFormatter(formatter)  
          
        browser_use_logger = logging.getLogger('browser_use')  
        browser_use_logger.addHandler(self.streaming_handler)  
        browser_use_logger.setLevel(logging.INFO)  
          
        # Launch browser with same options as stream.py (except headless for now)
        self.session = BrowserSession(  # type: ignore
            window_size={"width": W, "height": H},  # type: ignore
            viewport={"width": W, "height": H},  # type: ignore
            no_viewport=False,  # type: ignore
            viewport_expansion=-1,  # type: ignore
            highlight_elements=True,  # type: ignore
            headless=True,  # type: ignore
            disable_security=True,  # type: ignore
            user_data_dir=None,  # type: ignore
            chromium_sandbox=False,  # type: ignore
            args=["--no-sandbox", "--disable-gpu-sandbox", "--disable-setuid-sandbox"],  # type: ignore
            keep_alive=True, # type: ignore
        )
        await self.session.start()  
          
        api_key = os.getenv("OPENAI_API_KEY")  
        if not api_key:  
            raise ValueError("Missing OPENAI_API_KEY environment variable")  
        self.llm = ChatOpenAI(  # type: ignore
            model="gpt-4.1",  # type: ignore
            temperature=0.0,  # type: ignore
            api_key=SecretStr(api_key),  # type: ignore
        )  
  
    async def _run_command_async(self, command: str):  
        agent = Agent(task=command, llm=self.llm, browser_session=self.session)  
        result = await agent.run()  
        # Signal completion  
        self.log_queue.put("__COMMAND_COMPLETE__")  
        self.log_queue.put(str(result))  
          
    def run_command_streaming(self, command: str):  
        """Generator that yields logs as they come in"""  
        # Start the command execution  
        future = asyncio.run_coroutine_threadsafe(  
            self._run_command_async(command), self.loop  
        )  
          
        while True:  
            try:  
                # Get log with timeout  
                log_msg = self.log_queue.get(timeout=1.0)  
                  
                if log_msg == "__COMMAND_COMPLETE__":  
                    # Get the final result  
                    result = self.log_queue.get(timeout=1.0)  
                    yield f"data: {{'type': 'result', 'content': '{result}'}}\n\n"  
                    break  
                else:  
                    yield f"data: {{'type': 'log', 'content': '{log_msg}'}}\n\n"  
                      
            except queue.Empty:  
                # Check if the future is done  
                if future.done():  
                    break  
                # Send keepalive  
                yield f"data: {{'type': 'keepalive'}}\n\n"  
  
    def _start_loop(self):  
        asyncio.set_event_loop(self.loop)  
        self.loop.run_forever()  
  
    def shutdown(self):  
        if self.streaming_handler:  
            browser_use_logger = logging.getLogger('browser_use')  
            browser_use_logger.removeHandler(self.streaming_handler)  
        shutdown_future = asyncio.run_coroutine_threadsafe(  
            self.session.stop(), self.loop  
        )  
        shutdown_future.result()  
        self.loop.call_soon_threadsafe(self.loop.stop)  
        self.thread.join()  
        self.loop.close()

# In-memory HLS store for segments and playlist
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
        while self.order.maxlen is not None and len(self.order) > self.order.maxlen:
            self.segs.pop(self.order.popleft(), None)
    def get_playlist(self) -> str:
        return self.playlist
    def get_segment(self, name: str) -> Optional[bytes]:
        return self.segs.get(name)

# Recorder feeding ffmpeg and capturing screen frames
class Recorder:
    def __init__(self, session, run_id: str):
        self.session = session
        self.run_id = run_id
        self.proc = None
        self.running = False
        self.latest_frame = None
    async def _get_capture_page(self):
        # Use the library's human_current_page and agent_current_page first, skipping blank tabs
        hc = getattr(self.session, 'human_current_page', None)
        if hc:
            try:
                if not hc.is_closed() and getattr(hc, 'url', None) != 'about:blank':
                    return hc
            except Exception:
                pass
        ap = getattr(self.session, 'agent_current_page', None)
        if ap:
            try:
                if not ap.is_closed() and getattr(ap, 'url', None) != 'about:blank':
                    return ap
            except Exception:
                pass
        # 3. first non-blank page in context pages
        context = getattr(self.session, 'browser_context', None)
        if context:
            for pg in context.pages:
                try:
                    if pg.is_closed():
                        continue
                    if getattr(pg, 'url', None) and pg.url != 'about:blank':
                        return pg
                except Exception:
                    continue
        # 4. fallback to get_current_page()
        return await self.session.get_current_page()
    async def start(self):
        if self.running:
            return
        if self.proc is None:
            self._spawn_ffmpeg()
        # Use custom capture page selection
        self.page = await self._get_capture_page()  # type: ignore
        self.running = True
        asyncio.create_task(self._capture_loop())
    async def stop(self):
        self.running = False
    def _spawn_ffmpeg(self):
        seg_url = f"http://{HOST}:{PORT}/stream/{self.run_id}/segments/seg%09d.ts"
        pl_url = f"http://{HOST}:{PORT}/stream/{self.run_id}/playlist.m3u8"
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
            "-hls_flags", "delete_segments+independent_segments+program_date_time",
            "-hls_base_url", f"/stream/{self.run_id}/segments/",
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
            # update page before screenshot
            self.page = await self._get_capture_page()  # type: ignore
            t0 = time.perf_counter()
            jpeg = await self.page.screenshot(type="jpeg", quality=75)
            rgb = np.asarray(
                Image.open(io.BytesIO(jpeg))
                     .resize((W, H), Image.Resampling.LANCZOS)  # type: ignore
                     .convert("RGB"),
                np.uint8,
            )
            self.latest_frame = rgb
            proc = self.proc
            if proc is None or proc.stdin is None:
                break
            try:
                proc.stdin.write(rgb.tobytes())
            except BrokenPipeError:
                break
            elapsed = time.perf_counter() - t0
            await asyncio.sleep(max(0, frame_interval - elapsed))

# WebRTC track wrapping the latest screen frames
class ScreenTrack(VideoStreamTrack):
    def __init__(self, recorder: Recorder):
        super().__init__()
        self.recorder = recorder
    async def recv(self):
        while self.recorder.latest_frame is None:
            await asyncio.sleep(0.01)
        pts, time_base = await self.next_timestamp()
        frame = self.recorder.latest_frame
        video_frame = av.VideoFrame.from_ndarray(frame, format="rgb24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

# Full subclass adding video endpoints and recorder lifecycle
class VideoAgentService(AgentService):
    recorder: Recorder
    async def _prepare_page(self):
        # navigate to test page and set viewport
        page = await self.session.get_current_page()
        # await page.goto("https://example.com")
    def __init__(self, run_id: str):
        self.run_id = run_id
        super().__init__()
        # prep the browser page to a known test site
        prep_future = asyncio.run_coroutine_threadsafe(
            self._prepare_page(), self.loop
        )
        prep_future.result()
        self.hls = MemHLS()
        self.pcs = set()
        self.recorder = Recorder(self.session, run_id)
    def handle_offer(self, params):
        async def _handle():
            offer_desc = RTCSessionDescription(sdp=params["sdp"], type=params["type"])
            pc = RTCPeerConnection()
            self.pcs.add(pc)
            @pc.on("iceconnectionstatechange")
            async def on_ice():
                if pc.iceConnectionState == "failed":
                    await pc.close()
                    self.pcs.discard(pc)
            pc.addTrack(ScreenTrack(self.recorder))
            await pc.setRemoteDescription(offer_desc)
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            while pc.iceGatheringState != "complete":
                await asyncio.sleep(0.1)
            return pc.localDescription
        future = asyncio.run_coroutine_threadsafe(_handle(), self.loop)
        answer = future.result(timeout=30)
        return {"sdp": answer.sdp, "type": answer.type}
    def get_playlist(self) -> str:
        return self.hls.get_playlist()
    def get_segment(self, name: str) -> Optional[bytes]:
        return self.hls.get_segment(name)
    def shutdown(self):
        shutdown_future = asyncio.run_coroutine_threadsafe(
            self.recorder.stop(), self.loop
        )
        shutdown_future.result()
        super().shutdown()
