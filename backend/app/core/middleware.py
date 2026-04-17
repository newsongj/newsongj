"""전역 예외 핸들러 + 요청 로깅 미들웨어.

main.py 에서 `register_exception_handlers(app)` 와 `register_request_logger(app)` 호출.
"""
import logging
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError

logger = logging.getLogger("newsongj")


def register_exception_handlers(app: FastAPI) -> None:
    """도메인 예외 → JSON 응답 매핑. 라우터에서 try/except 없이 raise 가능."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        logger.warning(
            f"{request.method} {request.url.path} -> {exc.status_code}: {exc.detail}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exc_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def fallback_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled: {request.method} {request.url.path}")
        return JSONResponse(
            status_code=500,
            content={"detail": "서버 오류가 발생했습니다."},
        )


def register_request_logger(app: FastAPI) -> None:
    """요청별 메서드/경로/상태/소요시간 로그."""

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} {response.status_code} "
            f"{elapsed_ms:.1f}ms"
        )
        return response
