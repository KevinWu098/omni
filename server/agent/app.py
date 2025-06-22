from flask import Flask, request, jsonify, Response, stream_with_context
from dotenv import load_dotenv
import json

from service import AgentService
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/run_command", methods=["POST"])
def run_command():
    data = request.get_json(force=True)
    command = data.get("command")
    if not command:
        return jsonify({"error": "Missing 'command' in JSON body"}), 400

    service = AgentService()

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
