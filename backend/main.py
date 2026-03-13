from fastapi import FastAPI

from api.v1.gyojeok import member
from tests import member_test

app = FastAPI()

app.include_router(member.router, prefix="/api/v1")
app.include_router(member_test.router)
