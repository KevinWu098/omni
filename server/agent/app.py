from flask import Flask, request, jsonify, Response, stream_with_context
import json
import threading
import queue
import logging
from dotenv import load_dotenv

from manager import AgentManager

# Load environment variables
load_dotenv()

app = Flask(__name__)
manager = AgentManager()


@app.route("/run_command", methods=["POST"])
def run_command():
    data = request.get_json(force=True)
    command = data.get("command")
    if not command:
        return jsonify({"error": "Missing 'command' in JSON body"}), 400

    # Create a new unique agent ID and service instance
    agent_id, svc = manager.create()

    def generate():
        # Send the agent_id first
        yield f"data: {json.dumps({'agent_id': agent_id})}\n\n"

        # Set up logging capture
        log_queue = queue.Queue()

        class QueueHandler(logging.Handler):
            # thread_id will be set after thread starts; used to filter log records
            thread_id: int | None

            def __init__(self, q):
                super().__init__()
                self.queue = q
                self.thread_id = None
                self.setFormatter(
                    logging.Formatter("%(asctime)s %(levelname)s:%(message)s")
                )

            def emit(self, record):
                # only capture logs from the agent thread
                if self.thread_id and record.thread != self.thread_id:
                    return
                msg = self.format(record)
                self.queue.put(msg)

        root_logger = logging.getLogger()
        handler = QueueHandler(log_queue)
        root_logger.addHandler(handler)

        # Run the agent in a background thread
        result_container: dict = {}

        def target():
            try:
                result = svc.run_command(command)
                result_container["result"] = result
            except Exception as e:
                result_container["error"] = str(e)
            finally:
                # signal end of logs
                log_queue.put(None)

        thread = threading.Thread(target=target)
        thread.start()

        # assign thread ID for log filtering
        handler.thread_id = thread.ident

        # Stream logs as they arrive
        while True:
            entry = log_queue.get()
            if entry is None:
                break
            yield f"data: {json.dumps({'log': entry})}\n\n"

        # Clean up handler
        root_logger.removeHandler(handler)

        # Finally send the result or error
        if "error" in result_container:
            yield f"data: {json.dumps({'error': result_container['error']})}\n\n"
        else:
            yield f"data: {json.dumps({'result': result_container['result']})}\n\n"

    return Response(stream_with_context(generate()), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
