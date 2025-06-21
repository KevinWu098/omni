import asyncio
import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

import websockets
from websockets.server import WebSocketServerProtocol

# ——— Configuration ——————————————————————————————————————————————————————————————
HOST = "0.0.0.0"
PORT = 8765

# ——— Logging Setup —————————————————————————————————————————————————————————————
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# ——— In-Memory State ————————————————————————————————————————————————————————————
clients: Set[WebSocketServerProtocol] = set()
agents: Dict[str, WebSocketServerProtocol] = {}
vms: Dict[str, str] = {}  # vm_id -> public_url


# ——— VM Management Placeholders ————————————————————————————————————————————————————
async def spin_up_vms(count: int) -> List[Dict[str, str]]:
    """
    Fake-spin up `count` VMs by generating UUIDs and dummy public URLs.
    Stores them in the global `vms` dict.
    """
    new_list = []
    for _ in range(count):
        vm_id = str(uuid.uuid4())
        url = f"https://vm-{vm_id[:8]}.example.com"
        vms[vm_id] = url
        new_list.append({"vm_id": vm_id, "url": url})
    logging.info("Spun up %d VMs", count)
    return new_list


async def send_command_to_agent(vm_url: str, command: str) -> str:
    """
    Placeholder for sending an HTTP command to the VM at `vm_url`.
    """
    await asyncio.sleep(0.1)
    result = f"sent '{command}' to {vm_url}"
    logging.debug("Command result: %s", result)
    return result


# ——— Connection Lifecycle ———————————————————————————————————————————————————————
async def register_connection(
    ws: WebSocketServerProtocol,
) -> Tuple[str, Optional[str]]:
    """
    Perform initial registration handshake. Returns (role, agent_id).
    Raises ValueError on invalid registration message.
    """
    raw = await ws.recv()
    msg = json.loads(raw)

    if msg.get("type") != "register" or msg.get("role") not in ("client", "agent"):
        raise ValueError("First message must be {type: 'register', role: 'client'|'agent'}")

    role = msg["role"]
    if role == "client":
        clients.add(ws)
        logging.info("Registered new client: %s", ws.remote_address)
        return "client", None

    agent_id = msg.get("agent_id")
    if not agent_id:
        raise ValueError("Agent registration requires an 'agent_id'")
    agents[agent_id] = ws
    logging.info("Registered new agent '%s': %s", agent_id, ws.remote_address)
    return "agent", agent_id


async def unregister(
    ws: WebSocketServerProtocol, role: str, agent_id: Optional[str] = None
) -> None:
    """
    Clean up on disconnect.
    """
    if role == "client":
        clients.discard(ws)
        logging.info("Client disconnected: %s", ws.remote_address)
    else:
        removed = agents.pop(agent_id, None)
        logging.info("Agent '%s' disconnected: %s", agent_id, ws.remote_address if removed else "not found")


# ——— Message Handlers ——————————————————————————————————————————————————————————
async def handle_client_message(ws: WebSocketServerProtocol, msg: Dict[str, Any]) -> None:
    msg_type = msg.get("type")

    if msg_type == "spin_up":
        count = int(msg.get("count", 1))
        new_vms = await spin_up_vms(count)
        await ws.send(json.dumps({"type": "spin_up_response", "vms": new_vms}))

    elif msg_type == "list_agents":
        listing = [{"vm_id": vid, "url": url} for vid, url in vms.items()]
        await ws.send(json.dumps({"type": "list_agents_response", "vms": listing}))

    elif msg_type == "command":
        vm_id = msg.get("vm_id")
        command = msg.get("command", "")
        if vm_id not in vms:
            await ws.send(json.dumps({"type": "error", "message": f"Unknown vm_id '{vm_id}'"}))
            return
        result = await send_command_to_agent(vms[vm_id], command)
        await ws.send(json.dumps({"type": "command_response", "result": result}))

    else:
        await ws.send(json.dumps({"type": "error", "message": f"Unknown message type '{msg_type}'"}))


async def handle_agent_message(
    ws: WebSocketServerProtocol, agent_id: str, msg: Dict[str, Any]
) -> None:
    if msg.get("type") == "state_update":
        payload = json.dumps({
            "type": "agent_state",
            "agent_id": agent_id,
            "state": msg.get("state", {}),
        })
        # broadcast to all clients
        await asyncio.gather(*(client.send(payload) for client in clients))


# ——— Main Connection Handler —————————————————————————————————————————————————————
async def handler(ws: WebSocketServerProtocol) -> None:
    """
    Top-level per-connection handler: registers, then dispatches messages.
    """
    try:
        role, agent_id = await register_connection(ws)
    except Exception as e:
        await ws.send(json.dumps({"type": "error", "message": str(e)}))
        await ws.close()
        return

    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send(json.dumps({"type": "error", "message": "Invalid JSON"}))
                continue

            if role == "client":
                await handle_client_message(ws, msg)
            else:
                await handle_agent_message(ws, agent_id, msg)

    finally:
        await unregister(ws, role, agent_id)


# ——— Server Startup —————————————————————————————————————————————————————————————
async def main() -> None:
    server = await websockets.serve(handler, HOST, PORT)
    logging.info("WebSocket server running on ws://%s:%d", HOST, PORT)
    await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())