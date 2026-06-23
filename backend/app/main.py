import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.core.config import settings
from app.core.middleware import register_exception_handlers, register_request_logger
import app.models  # noqa: F401
from app.api.v1.auth import auth as auth_router
from app.api.v1.auth import client_auth as client_auth_router
from app.api.v1.gyojeok import members
from app.api.v1.gyojeok import newcomers
from app.api.v1.meta import leaders
from app.api.v1.attendance import records as attendance_records
from app.api.v1.attendance import dashboard as attendance_dashboard
from app.api.v1.retreat import retreat as retreat_router
from app.api.v1.retreat import bus as bus_router
from app.api.v1.retreat import client as retreat_client_router
from app.api.v1.authority import authority as authority_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
register_request_logger(app)

app.include_router(auth_router.router)
app.include_router(client_auth_router.router)
app.include_router(members.router, prefix=f"{settings.API_PREFIX}/gyojeok")
app.include_router(newcomers.router, prefix=f"{settings.API_PREFIX}/gyojeok")
app.include_router(leaders.router)
app.include_router(attendance_records.router)
app.include_router(attendance_dashboard.router)
app.include_router(retreat_router.router, prefix="/api/retreat")
app.include_router(bus_router.router, prefix="/api/bus")
app.include_router(authority_router.router)
app.include_router(retreat_client_router.router)


@app.get("/")
def read_root():
    return {"message": "ok"}
