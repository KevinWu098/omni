import asyncio
import os
import tempfile
from pydantic import SecretStr

from browser_use import BrowserSession, BrowserProfile, Agent
from langchain_openai import ChatOpenAI


class AgentService:
    """
    Manages a persistent browser session and LLM for a single agent.
    """

    def __init__(self, agent_id: str):
        # Assign agent ID (used as profile directory)
        self.agent_id = agent_id
        # Create a dedicated event loop for this agent
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        # Prepare a unique profile directory for this agent's persistent context
        base = tempfile.gettempdir()
        profile_dir = os.path.join(base, "omni_agent_profiles", agent_id)
        os.makedirs(profile_dir, exist_ok=True)
        # Start the browser session with a unique user_data_dir (persistent context)
        self.session = BrowserSession(
            browser_profile=BrowserProfile(
                viewport_expansion=-1,
                highlight_elements=True,
                headless=False,
                disable_security=True,
            ),
            user_data_dir=profile_dir,  # type: ignore
        )
        self.loop.run_until_complete(self.session.start())

        # Initialize the LLM with SecretStr for api_key
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
        return self.loop.run_until_complete(self._run_command(command))

    async def _take_screenshot(self, full_page: bool) -> str:
        return await self.session.take_screenshot(full_page=full_page)

    def take_screenshot(self, full_page: bool) -> str:
        """
        Synchronously take a screenshot via the browser session.
        """
        return self.loop.run_until_complete(self._take_screenshot(full_page))

    def shutdown(self) -> None:
        """
        Stop the browser session and close the event loop.
        """
        self.loop.run_until_complete(self.session.stop())
        self.loop.close()
