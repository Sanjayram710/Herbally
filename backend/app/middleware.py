from typing import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import settings


class RequestSizeLimitMiddleware:
    """Reject declared oversized requests before FastAPI parses their body."""

    def __init__(self, app):
        self.app = app

    @staticmethod
    def _limit_for_path(path: str) -> int:
        if path.endswith("/media/generate"):
            return settings.IMAGE_GENERATION_REQUEST_MAX_BYTES
        return settings.REQUEST_MAX_BYTES

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        limit = self._limit_for_path(scope.get("path", ""))
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        raw_length = headers.get(b"content-length")
        if raw_length:
            try:
                if int(raw_length) > limit:
                    response = JSONResponse(status_code=413, content={"detail": "Request body exceeds the configured size limit"})
                    await response(scope, receive, send)
                    return
            except ValueError:
                response = JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header"})
                await response(scope, receive, send)
                return

        consumed = 0
        rejected = False

        async def limited_receive():
            nonlocal consumed, rejected
            message = await receive()
            if message.get("type") == "http.request":
                consumed += len(message.get("body", b""))
                if consumed > limit:
                    rejected = True
                    return {"type": "http.disconnect"}
            return message

        await self.app(scope, limited_receive, send)
