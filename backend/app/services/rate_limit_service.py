import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import HTTPException, status


class RateLimitService:
    """Process-local limiter for the local deployment architecture.

    A shared store such as Redis is required before horizontally scaling the API.
    """

    _lock = threading.Lock()
    _events: Dict[str, Deque[float]] = defaultdict(deque)

    @classmethod
    def enforce(cls, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        with cls._lock:
            events = cls._events[key]
            while events and events[0] <= now - window_seconds:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, int(window_seconds - (now - events[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Image generation rate limit reached. Try again later.",
                    headers={"Retry-After": str(retry_after)},
                )
            events.append(now)

    @classmethod
    def reset(cls) -> None:
        with cls._lock:
            cls._events.clear()
