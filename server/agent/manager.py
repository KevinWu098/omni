import threading

from service import AgentService

class AgentManager:
    """
    Thread-safe manager for AgentService instances keyed by agent_id.
    """

    def __init__(self):
        self._services: dict[str, AgentService] = {}
        self._lock = threading.Lock()

    def get_or_create(self, agent_id: str) -> AgentService:
        """
        Retrieve existing AgentService for agent_id or initialize a new one.
        """
        with self._lock:
            if agent_id not in self._services:
                self._services[agent_id] = AgentService()
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