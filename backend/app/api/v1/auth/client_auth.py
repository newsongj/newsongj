from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth_client import ClientLoginRequest, ClientLoginResponse, MemberLoginRequest
from app.services.auth_client import login_client, login_member

router = APIRouter()


@router.post("/api/auth/login", response_model=ClientLoginResponse, tags=["사용자 인증"], summary="사용자 로그인")
def post_client_login(body: ClientLoginRequest, db: Session = Depends(get_db)) -> ClientLoginResponse:
    return login_client(db, body)


@router.post("/api/auth/member-login", response_model=ClientLoginResponse, tags=["사용자 인증"], summary="일반 멤버 로그인 (전화번호+이름)")
def post_member_login(body: MemberLoginRequest, db: Session = Depends(get_db)) -> ClientLoginResponse:
    return login_member(db, body)
