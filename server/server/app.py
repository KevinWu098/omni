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
vms: Dict[str, WebSocketServerProtocol] = {}  # vm_id -> websocket connection
test_case_to_vm: Dict[str, str] = {}  # test_case_id -> vm_id
vm_to_test_case: Dict[str, str] = {}  # vm_id -> test_case_id (for tracking usage)


# ——— VM Management ————————————————————————————————————————————————————————————
async def assign_vms_to_tests(tests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Assign VMs to test cases. Reuse existing VMs or create new ones as needed.
    """
    result = []

    for test in tests:
        test_case_id = test.get("test_case_id")
        steps = test.get("steps", [])

        if not test_case_id:
            continue

        # Check if this test case already has a VM assigned
        if test_case_id in test_case_to_vm:
            vm_id = test_case_to_vm[test_case_id]
            logging.info(f"Reusing VM {vm_id} for test case {test_case_id}")
        else:
            # Find an unused VM or create a new one
            available_vm_id = None
            for vm_id in vms.keys():
                if vm_id not in vm_to_test_case:
                    available_vm_id = vm_id
                    break

            if available_vm_id:
                vm_id = available_vm_id
                logging.info(
                    f"Assigning existing VM {vm_id} to test case {test_case_id}"
                )
            else:
                # Create new VM (placeholder - would be actual IaC in production)
                vm_id = str(uuid.uuid4())
                logging.info(f"Created new VM {vm_id} for test case {test_case_id}")

            # Update mappings
            test_case_to_vm[test_case_id] = vm_id
            vm_to_test_case[vm_id] = test_case_id

        result.append({"test_case_id": test_case_id, "vm_id": vm_id, "steps": steps})

    logging.info(f"Assigned VMs to {len(result)} test cases")
    return result


# ——— Connection Lifecycle ———————————————————————————————————————————————————————
async def register_connection(
    ws: WebSocketServerProtocol,
) -> Tuple[str, Optional[str]]:
    """
    Perform initial registration handshake. Returns (role, vm_id).
    Raises ValueError on invalid registration message.
    """
    raw = await ws.recv()
    msg = json.loads(raw)

    if msg.get("type") != "register" or msg.get("role") not in ("client", "vm"):
        raise ValueError(
            "First message must be {type: 'register', role: 'client'|'vm'}"
        )

    role = msg["role"]
    if role == "client":
        clients.add(ws)
        logging.info("Registered new client: %s", ws.remote_address)
        return "client", None

    vm_id = msg.get("vm_id")
    if not vm_id:
        raise ValueError("VM registration requires a 'vm_id'")
    vms[vm_id] = ws
    logging.info("Registered new VM '%s': %s", vm_id, ws.remote_address)
    return "vm", vm_id


async def unregister(
    ws: WebSocketServerProtocol, role: str, vm_id: Optional[str] = None
) -> None:
    """
    Clean up on disconnect.
    """
    if role == "client":
        clients.discard(ws)
        logging.info("Client disconnected: %s", ws.remote_address)
    else:
        removed = vms.pop(vm_id, None)
        # Clean up test case mappings
        if vm_id in vm_to_test_case:
            test_case_id = vm_to_test_case.pop(vm_id)
            test_case_to_vm.pop(test_case_id, None)
        logging.info(
            "VM '%s' disconnected: %s",
            vm_id,
            ws.remote_address if removed else "not found",
        )


# ——— Message Handlers ——————————————————————————————————————————————————————————
async def handle_client_message(
    ws: WebSocketServerProtocol, msg: Dict[str, Any]
) -> None:
    msg_type = msg.get("type")

    if msg_type == "spin_up":
        tests = msg.get("tests", [])
        assigned_tests = await assign_vms_to_tests(tests)
        await ws.send(json.dumps({"type": "spin_up_response", "tests": assigned_tests}))

    elif msg_type == "list_vms":
        vm_list = []
        for vm_id, ws_conn in vms.items():
            test_case_id = vm_to_test_case.get(vm_id)
            vm_list.append(
                {"vm_id": vm_id, "test_case_id": test_case_id, "status": "connected"}
            )
        await ws.send(json.dumps({"type": "list_vms_response", "vms": vm_list}))

    elif msg_type == "command":
        vm_id = msg.get("vm_id")
        command = msg.get("command", "")
        if vm_id not in vms:
            await ws.send(
                json.dumps({"type": "error", "message": f"Unknown vm_id '{vm_id}'"})
            )
            return
        await vms[vm_id].send(json.dumps({"type": "command", "command": command}))

    elif msg_type == "screenshot":
        vm_id = msg.get("vm_id")
        full_page = msg.get("full_page", False)
        if vm_id not in vms:
            await ws.send(
                json.dumps({"type": "error", "message": f"Unknown vm_id '{vm_id}'"})
            )
            return
        await vms[vm_id].send(
            json.dumps({"type": "screenshot", "full_page": full_page})
        )

    else:
        await ws.send(
            json.dumps(
                {"type": "error", "message": f"Unknown message type '{msg_type}'"}
            )
        )


async def handle_vm_message(
    ws: WebSocketServerProtocol, vm_id: str, msg: Dict[str, Any]
) -> None:
    msg_type = msg.get("type")

    if msg_type in ("command_response", "screenshot_response", "error"):
        # Forward response back to all clients
        response = {
            "type": msg_type,
            "vm_id": vm_id,
            **{k: v for k, v in msg.items() if k != "type"},
        }
        await asyncio.gather(*(client.send(json.dumps(response)) for client in clients))

    elif msg_type == "state_update":
        payload = json.dumps(
            {
                "type": "vm_state",
                "vm_id": vm_id,
                "state": msg.get("state", {}),
            }
        )
        # broadcast to all clients
        await asyncio.gather(*(client.send(payload) for client in clients))


# ——— Main Connection Handler —————————————————————————————————————————————————————
async def handler(ws: WebSocketServerProtocol) -> None:
    """
    Top-level per-connection handler: registers, then dispatches messages.
    """
    try:
        role, vm_id = await register_connection(ws)
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
                await handle_vm_message(ws, vm_id, msg)

    finally:
        await unregister(ws, role, vm_id)


# ——— Server Startup —————————————————————————————————————————————————————————————
async def main() -> None:
    server = await websockets.serve(handler, HOST, PORT)
    logging.info("WebSocket server running on ws://%s:%d", HOST, PORT)
    await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())
