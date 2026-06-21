import bcrypt as _bcrypt_lib

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_client_token
from app.crud.auth_client import get_leader_names_for_member, get_menus_for_policy, get_member_by_phone_and_name, get_member_profile, get_user_account_by_login_id
from app.schemas.auth_client import ClientLoginRequest, ClientLoginResponse, MemberLoginRequest

def login_client(db: Session, body: ClientLoginRequest) -> ClientLoginResponse:
    account = get_user_account_by_login_id(db, body.login_id)
    pw_match = account is not None and _bcrypt_lib.checkpw(
        body.password.encode("utf-8"), account.password.encode("utf-8")
    )
    if not pw_match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="전화번호 또는 비밀번호가 올바르지 않습니다.",
        )

    gyogu = team = group_no = None
    profile = None
    if account.member_id:
        profile = get_member_profile(db, account.member_id)
        if profile:
            gyogu = profile.gyogu
            team = profile.team
            group_no = profile.group_no

    menus = get_menus_for_policy(db, account.policy_id)
    leader_names = get_leader_names_for_member(db, profile)

    token = create_client_token(
        account_id=account.account_id,
        data_scope=account.data_scope,
        member_id=account.member_id,
        gyogu=gyogu,
        team=team,
        group_no=group_no,
    )

    return ClientLoginResponse(
        token=token,
        data_scope=account.data_scope,
        member_id=account.member_id,
        gyogu=gyogu,
        team=team,
        group_no=group_no,
        requires_password_change=bool(account.requires_password_change),
        menus=menus,
        leader_names=leader_names,
    )


def login_member(db: Session, body: MemberLoginRequest) -> ClientLoginResponse:
    member = get_member_by_phone_and_name(db, body.phone, body.name)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="전화번호 또는 이름이 올바르지 않습니다.",
        )

    profile = get_member_profile(db, member.member_id)
    leader_names = get_leader_names_for_member(db, profile)

    token = create_client_token(
        account_id=0,
        data_scope="member",
        member_id=member.member_id,
        gyogu=profile.gyogu if profile else None,
        team=profile.team if profile else None,
        group_no=profile.group_no if profile else None,
    )

    return ClientLoginResponse(
        token=token,
        data_scope="member",
        member_id=member.member_id,
        gyogu=profile.gyogu if profile else None,
        team=profile.team if profile else None,
        group_no=profile.group_no if profile else None,
        requires_password_change=False,
        menus=["user.vehicle"],
        leader_names=leader_names,
    )
