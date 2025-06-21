# WebSocket Server API

A WebSocket server that manages client-agent communication and VM orchestration.

## Connection & Registration

### Server Address

```ws://localhost:8765

```

### Registration (Required First Message)

**Client Registration:**

```json
{
    "type": "register",
    "role": "client"
}
```

**Agent Registration:**

```json
{
    "type": "register",
    "role": "agent",
    "agent_id": "your-unique-agent-id"
}
```

## Client Message Types

### Spin Up VMs

```json
{
    "type": "spin_up",
    "count": 3
}
```

### List Available Agents/VMs

```json
{
    "type": "list_agents"
}
```

### Send Command to VM

```json
{
    "type": "command",
    "vm_id": "vm-uuid",
    "command": "your-command-here"
}
```

## Agent Message Types

### State Update (Broadcast to all clients)

```json
{
    "type": "state_update",
    "state": {
        "status": "running",
        "progress": 75
    }
}
```

## Server Response Endpoints

### Spin Up Response

```json
{
    "type": "spin_up_response",
    "vms": [
        {
            "vm_id": "uuid-string",
            "url": "https://vm-12345678.example.com"
        }
    ]
}
```

### List Agents Response

```json
{
    "type": "list_agents_response",
    "vms": [
        {
            "vm_id": "uuid-string",
            "url": "https://vm-12345678.example.com"
        }
    ]
}
```

### Command Response

```json
{
    "type": "command_response",
    "result": "sent 'your-command' to https://vm-url.com"
}
```

### Agent State Broadcast (to all clients)

```json
{
    "type": "agent_state",
    "agent_id": "agent-uuid",
    "state": {
        "status": "running",
        "progress": 75
    }
}
```

### Error Response

```json
{
    "type": "error",
    "message": "Error description"
}
```

## Usage Flow

1. Connect to WebSocket server
2. Send registration message as first message
3. Send/receive messages based on your role (client/agent)
4. Server handles VM management and message routing automatically
