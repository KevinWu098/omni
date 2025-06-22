from flask import Flask, request, jsonify, Response, stream_with_context
from dotenv import load_dotenv
import json
from uuid import uuid4

from service import AgentService

# Mapping from run IDs to AgentService instances
agents = {}

load_dotenv()

app = Flask(__name__)


@app.route("/run_command", methods=["POST"])
def run_command():
    data = request.get_json(force=True)
    command = data.get("command")
    if not command:
        return jsonify({"error": "Missing 'command' in JSON body"}), 400

    # Create a new service instance with a unique run ID
    run_id = str(uuid4())
    service = AgentService()
    service.done = False
    agents[run_id] = service

    def generate():
        try:
            # Stream the unique run ID as the first message
            yield f"data: {{'type': 'uuid', 'id': '{run_id}'}}\n\n"
            # Stream logs and results
            for log_data in service.run_command_streaming(command):
                yield log_data
        finally:
            service.shutdown()
            # Mark the agent as done for future streaming endpoints
            service.done = True

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
