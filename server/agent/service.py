import asyncio
import os
from pydantic import SecretStr
import threading

from browser_use import BrowserSession, BrowserProfile, Agent
from langchain_openai import ChatOpenAI


class AgentService:
    """
    Manages a persistent browser session and LLM for a single agent.
    """

    def __init__(self):
        # Create a dedicated event loop for this agent and run it in a background thread
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._start_loop, daemon=True)
        self.thread.start()
        # Initialize session and LLM inside the event loop thread
        init_future = asyncio.run_coroutine_threadsafe(self._init(), self.loop)
        init_future.result()

    async def _init(self):
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

    async def _run_command(self, command: str) -> str:
        agent = Agent(task=command, llm=self.llm, browser_session=self.session)
        result = await agent.run()
        return str(result)

    def run_command(self, command: str) -> str:
        """
        Synchronously run the agent on a natural language command.
        """
        future = asyncio.run_coroutine_threadsafe(self._run_command(command), self.loop)
        return future.result()

    async def _take_screenshot(self, full_page: bool) -> str:
        return await self.session.take_screenshot(full_page=full_page)

    def take_screenshot(self, full_page: bool) -> str:
        """
        Synchronously take a screenshot via the browser session.
        """
        future = asyncio.run_coroutine_threadsafe(
            self._take_screenshot(full_page), self.loop
        )
        return future.result()

    def _start_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def shutdown(self) -> None:
        """
        Stop the browser session and close the event loop.
        """
        shutdown_future = asyncio.run_coroutine_threadsafe(
            self.session.stop(), self.loop
        )
        shutdown_future.result()
        # Stop the event loop and wait for thread to exit
        self.loop.call_soon_threadsafe(self.loop.stop)
        self.thread.join()
        self.loop.close()
