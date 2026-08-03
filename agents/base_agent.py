import logging
from tenacity import retry, stop_after_attempt, wait_fixed
from utils.logger import get_centralized_logger

class BaseAgent:
    def __init__(self, name: str):
        self.name = name
        self.logger = get_centralized_logger(name)

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(7))
    async def fetch_with_retry(self, coro_func, *args, **kwargs):
        """
        Universal method to call async functions with retries.
        """
        try:
            return await coro_func(*args, **kwargs)
        except Exception as e:
            self.logger.error(f"Error executing {coro_func.__name__}: {e}")
            raise e
