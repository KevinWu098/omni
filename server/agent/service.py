import asyncio  
import os  
import logging  
import queue  
import threading  
from pydantic import SecretStr  
from flask import stream_with_context  
  
from browser_use import BrowserSession, BrowserProfile, Agent  
from langchain_openai import ChatOpenAI  
  
  
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
          
        self.session = BrowserSession(  
            browser_profile=BrowserProfile(  
                viewport_expansion=-1,  
                highlight_elements=True,  
                headless=False,  
                disable_security=True,  
                user_data_dir=None,  
            )  
        )  
        await self.session.start()  
          
        api_key = os.getenv("OPENAI_API_KEY")  
        if not api_key:  
            raise ValueError("Missing OPENAI_API_KEY environment variable")  
        self.llm = ChatOpenAI(  
            model="gpt-4o", temperature=0.0, api_key=SecretStr(api_key)  
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
