import threading
import uuid

from service import AgentService

class AgentManager:
    """
    Thread-safe manager for AgentService instances keyed by agent_id.
    """

    def __init__(self):
        self._services: dict[str, AgentService] = {}
        self._lock = threading.Lock()

    def create(self) -> tuple[str, AgentService]:
        """
        Create a new AgentService with a unique ID and store it.
        """
        with self._lock:
            # ensure unique agent_id
            while True:
                agent_id = uuid.uuid4().hex
                if agent_id not in self._services:
                    svc = AgentService(agent_id)
                    self._services[agent_id] = svc
                    return agent_id, svc

    def get_or_create(self, agent_id: str) -> AgentService:
        """
        Retrieve existing AgentService for agent_id or initialize a new one.
        """
        with self._lock:
            if agent_id not in self._services:
                svc = AgentService(agent_id)
                self._services[agent_id] = svc
            return self._services[agent_id]

    def shutdown(self, agent_id: str) -> None:
        """
        Stop and remove the AgentService associated with agent_id.
        """
        with self._lock:
            svc = self._services.pop(agent_id, None)
        if svc:
            svc.shutdown()

    def shutdown_all(self) -> None:
        """
        Stop all AgentService instances and clear the manager.
        """
        with self._lock:
            services = list(self._services.values())
            self._services.clear()
        for svc in services:
            svc.shutdown() 