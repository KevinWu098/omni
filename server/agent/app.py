from flask import Flask, request, jsonify
from dotenv import load_dotenv

from manager import AgentManager

# Load environment variables
load_dotenv()

app = Flask(__name__)
manager = AgentManager()

@app.route("/run_command", methods=["POST"])
def run_command():
    data = request.get_json(force=True)
    agent_id = data.get("agent_id")
    command = data.get("command")
    if not agent_id:
        return jsonify({"error": "Missing 'agent_id' in JSON body"}), 400
    if not command:
        return jsonify({"error": "Missing 'command' in JSON body"}), 400
    try:
        result = manager.get_or_create(agent_id).run_command(command)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)