import logging
from logging.handlers import QueueHandler, QueueListener
import queue
from database.models import SystemLog
from database.session import get_session
import traceback
import sys

# Global queue for logs
log_queue = queue.Queue(-1)

class DBLogHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.session = None

    def _ensure_session(self):
        if self.session is None:
            self.session = get_session()
        return self.session

    def emit(self, record):
        try:
            session = self._ensure_session()
            
            tb = None
            if record.exc_info:
                tb = "".join(traceback.format_exception(*record.exc_info))
            elif record.exc_text:
                tb = record.exc_text
                
            metadata = {}
            if hasattr(record, "metadata"):
                metadata = record.metadata
                
            log_entry = SystemLog(
                level=record.levelname,
                component=record.name,
                message=record.getMessage(),
                traceback=tb,
                metadata_=metadata
            )
            session.add(log_entry)
            session.commit()
        except Exception:
            self.handleError(record)
            if self.session:
                try:
                    self.session.rollback()
                except Exception:
                    pass

db_handler = DBLogHandler()

# Standard console handler for immediate output
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))

import atexit

# Start QueueListener
listener = QueueListener(log_queue, db_handler, console_handler)
listener.start()

def _cleanup_logger():
    try:
        listener.stop()
    except Exception:
        pass

atexit.register(_cleanup_logger)

def get_centralized_logger(name: str):
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        queue_handler = QueueHandler(log_queue)
        logger.addHandler(queue_handler)
        logger.propagate = False
    return logger
