import asyncio
import json
import os
import logging

from dotenv import load_dotenv
import websockets

from browser_use import BrowserSession, BrowserProfile, Agent
from langchain_openai import ChatOpenAI

load_dotenv()

WS_SERVER_URL = os.getenv("WS_SERVER_URL")
if not WS_SERVER_URL:
    raise ValueError("Missing WS_SERVER_URL environment variable")

VM_ID = os.getenv("VM_ID")
if not VM_ID:
    raise ValueError("Missing VM_ID environment variable")


def _run_nl_command(command: str) -> asyncio.Future:
    """
    Launches a browser-based agent task for a natural language command.
    """

    async def runner():
        session = BrowserSession(
            cdp_url="http://localhost:9222",
            browser_profile=BrowserProfile(
                viewport_expansion=-1,
                highlight_elements=True,
                headless=True,
                disable_security=True,
            ),
        )
        llm = ChatOpenAI(
            model="gpt-4o", temperature=0.0, api_key=os.getenv("OPENAI_API_KEY")
        )
        agent = Agent(task=command, llm=llm, browser_session=session)
        try:
            result = await agent.run()
            return str(result)
        finally:
            await session.stop()

    return runner()


def _take_screenshot(full_page: bool) -> asyncio.Future:
    """
    Captures a screenshot via browser session, returns base64-encoded image.
    """

    async def runner():
        session = BrowserSession(
            cdp_url="http://localhost:9222",
            browser_profile=BrowserProfile(headless=True, disable_security=True),
        )
        await session.start()
        try:
            img_b64 = await session.take_screenshot(full_page=full_page)
            return img_b64
        finally:
            await session.stop()

    return runner()


async def listen():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s:%(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logging.info("Connecting to WS server at %s", WS_SERVER_URL)
    async with websockets.connect(WS_SERVER_URL) as ws:
        # Register as VM
        register_msg = {"type": "register", "role": "vm", "vm_id": VM_ID}
        await ws.send(json.dumps(register_msg))
        logging.info("Sent registration message: %s", register_msg)

        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                logging.error("Received invalid JSON: %s", raw)
                continue

            msg_type = msg.get("type")
            logging.info("Received message: %s", msg)

            if msg_type == "command":
                command = msg.get("command", "")
                if not command:
                    logging.warning("No 'command' field in message")
                    continue
                try:
                    result = await _run_nl_command(command)
                    response = {
                        "type": "command_response",
                        "result": result,
                    }
                    await ws.send(json.dumps(response))
                    logging.info("Sent command response")
                except Exception as e:
                    error_msg = {
                        "type": "error",
                        "message": str(e),
                    }
                    await ws.send(json.dumps(error_msg))
                    logging.error("Error running command: %s", e)

            elif msg_type == "screenshot":
                full_page = msg.get("full_page", False)
                try:
                    screenshot = await _take_screenshot(full_page)
                    response = {
                        "type": "screenshot_response",
                        "screenshot": screenshot,
                    }
                    await ws.send(json.dumps(response))
                    logging.info("Sent screenshot response")
                except Exception as e:
                    error_msg = {
                        "type": "error",
                        "message": str(e),
                    }
                    await ws.send(json.dumps(error_msg))
                    logging.error("Error taking screenshot: %s", e)

            else:
                logging.warning("Unknown message type: %s", msg_type)


if __name__ == "__main__":
    try:
        asyncio.run(listen())
    except KeyboardInterrupt:
        logging.info("VM WS client shutting down")
