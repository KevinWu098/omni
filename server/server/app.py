import asyncio
import json
import uuid

import websockets

# In-memory state
clients = set()      # set of client websockets
agents = {}          # agent_id -> websocket
vms = {}             # vm_id    -> public_url

# Placeholder: spin up VMs (just fakes IDs and URLs)
async def spin_up_vms(count: int):
    new = []
    for _ in range(count):
        vm_id = str(uuid.uuid4())
        public_url = f"https://vm-{vm_id[:8]}.example.com"
        vms[vm_id] = public_url
        new.append({"vm_id": vm_id, "url": public_url})
    return new

# Placeholder: send a command to an agent over HTTP
async def send_command_to_agent(vm_url: str, command: str):
    # If you add aiohttp, you can do real HTTP posts here.
    await asyncio.sleep(0.1)
    return f"sent '{command}' to {vm_url}"

async def register_connection(ws):
    """
    First message must be:
      {"type": "register", "role": "client"}
    or
      {"type": "register", "role": "agent", "agent_id": "some-id"}
    """
    raw = await ws.recv()
    msg = json.loads(raw)
    if msg.get("type") != "register" or msg.get("role") not in ("client", "agent"):
        raise ValueError("First message must be register with role 'client' or 'agent'")
    role = msg["role"]
    if role == "client":
        clients.add(ws)
        return "client", None
    agent_id = msg.get("agent_id")
    if not agent_id:
        raise ValueError("Agents must provide an 'agent_id'")
    agents[agent_id] = ws
    return "agent", agent_id

async def unregister(ws, role, agent_id=None):
    if role == "client":
        clients.discard(ws)
    else:
        agents.pop(agent_id, None)

async def handle_client_message(ws, msg):
    t = msg.get("type")
    if t == "spin_up":
        count = int(msg.get("count", 1))
        new_vms = await spin_up_vms(count)
        await ws.send(json.dumps({
            "type": "spin_up_response",
            "vms": new_vms
        }))
    elif t == "list_agents":
        all_vms = [{"vm_id": vid, "url": url} for vid, url in vms.items()]
        await ws.send(json.dumps({
            "type": "list_agents_response",
            "vms": all_vms
        }))
    elif t == "command":
        vm_id = msg.get("vm_id")
        cmd   = msg.get("command")
        if vm_id not in vms:
            await ws.send(json.dumps({
                "type": "error",
                "message": f"Unknown vm_id '{vm_id}'"
            }))
            return
        result = await send_command_to_agent(vms[vm_id], cmd)
        await ws.send(json.dumps({
            "type": "command_response",
            "result": result
        }))
    else:
        await ws.send(json.dumps({
            "type": "error",
            "message": f"Unknown message type '{t}'"
        }))

async def handle_agent_message(ws, agent_id, msg):
    if msg.get("type") == "state_update":
        broadcast = json.dumps({
            "type": "agent_state",
            "agent_id": agent_id,
            "state": msg.get("state")
        })
        # forward to all clients
        await asyncio.gather(*(c.send(broadcast) for c in clients))

async def handler(ws):
    # If you need the request path, use ws.request.path
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
                await ws.send(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON"
                }))
                continue

            if role == "client":
                await handle_client_message(ws, msg)
            else:
                await handle_agent_message(ws, agent_id, msg)

    finally:
        await unregister(ws, role, agent_id)

async def main():
    HOST = "0.0.0.0"
    PORT = 8765

    server = await websockets.serve(handler, HOST, PORT)
    print(f"WebSocket server running on ws://{HOST}:{PORT}")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())