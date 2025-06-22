from flask import Flask, request, jsonify, Response, stream_with_context
from dotenv import load_dotenv
import json
import uuid

from service import AgentService

load_dotenv()

app = Flask(__name__)

# Store AgentService instances by agent ID
AGENTS = {}

@app.route("/agents", methods=["POST"])
def create_agent():
    # Generate a unique agent ID
    agent_id = str(uuid.uuid4())
    # Initialize and store the AgentService instance
    AGENTS[agent_id] = AgentService()
    return jsonify({"id": agent_id}), 201

@app.route("/agents/<agent_id>/run_command", methods=["POST"])
def run_command(agent_id):
    data = request.get_json(force=True)
    command = data.get("command")
    if not command:
        return jsonify({"error": "Missing 'command' in JSON body"}), 400

    service = AGENTS.get(agent_id)
    if not service:
        return jsonify({"error": "Unknown agent"}), 404

    def generate():
        try:
            for log_data in service.run_command_streaming(command):
                yield log_data
        finally:
            service.shutdown()

    return Response(
        stream_with_context(generate()),
        content_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)
