import json
import secrets
import string
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import bcrypt as _bcrypt_lib
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.timezone import now_kst
from app.models import (
    Leader,
    Member,
    MemberProfile,
    PolicyAccess,
    PolicyAccessMenu,
    PolicyDataScope,
    UserAccount,
)
from app.schemas.authority import AccountCreate, PolicyCreate, PolicyUpdate, ScopePoliciesUpdate

def _hash_pw(plain: str) -> str:
    return _bcrypt_lib.hashpw(plain.encode("utf-8"), _bcrypt_lib.gensalt()).decode("utf-8")


# ── 계정 ─────────────────────────────────────────────────────────────────────

def list_accounts(db: Session) -> List[Tuple]:
    latest_sq = (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.profile_id).label("max_id"),
        )
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    return (
        db.query(
            UserAccount,
            Member.name,
            MemberProfile.gyogu,
            MemberProfile.team,
            MemberProfile.group_no,
            PolicyAccess.policy_name,
        )
        .outerjoin(Member, UserAccount.member_id == Member.member_id)
        .outerjoin(latest_sq, UserAccount.member_id == latest_sq.c.member_id)
        .outerjoin(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .outerjoin(PolicyAccess, UserAccount.policy_id == PolicyAccess.policy_id)
        .order_by(UserAccount.data_scope, UserAccount.account_id)
        .all()
    )


def get_member_by_phone(db: Session, phone: str) -> Optional[Member]:
    normalized = phone.replace("-", "")
    return (
        db.query(Member)
        .filter(func.replace(Member.phone_number, "-", "") == normalized)
        .first()
    )


def create_account(db: Session, data: AccountCreate) -> UserAccount:
    normalized = data.login_id.replace("-", "")
    if db.query(UserAccount).filter(
        func.replace(UserAccount.login_id, "-", "") == normalized
    ).first():
        raise ConflictError("이미 등록된 전화번호입니다.")
    member = get_member_by_phone(db, data.login_id)
    account = UserAccount(
        login_id=normalized,
        password=_hash_pw(data.password),
        data_scope=data.data_scope,
        policy_id=data.policy_id if data.policy_id else None,
        member_id=member.member_id if member else None,
        is_active=1,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account_password(db: Session, account_id: int, new_password: str) -> None:
    account = db.query(UserAccount).filter(UserAccount.account_id == account_id).first()
    if not account:
        raise NotFoundError("계정을 찾을 수 없습니다.")
    account.password = _hash_pw(new_password)
    db.commit()


def update_account_scope(db: Session, account_id: int, data_scope: str) -> None:
    account = db.query(UserAccount).filter(UserAccount.account_id == account_id).first()
    if not account:
        raise NotFoundError("계정을 찾을 수 없습니다.")
    account.data_scope = data_scope
    db.commit()


def update_account_status(db: Session, account_id: int, is_active: bool) -> None:
    account = db.query(UserAccount).filter(UserAccount.account_id == account_id).first()
    if not account:
        raise NotFoundError("계정을 찾을 수 없습니다.")
    account.is_active = 1 if is_active else 0
    db.commit()


def bulk_deactivate_accounts(db: Session, account_ids: List[int]) -> None:
    db.query(UserAccount).filter(UserAccount.account_id.in_(account_ids)).update(
        {"is_active": 0}, synchronize_session=False
    )
    db.commit()


def delete_account(db: Session, account_id: int) -> None:
    account = db.query(UserAccount).filter(UserAccount.account_id == account_id).first()
    if not account:
        raise NotFoundError("계정을 찾을 수 없습니다.")
    db.delete(account)
    db.commit()


def bulk_delete_accounts(db: Session, account_ids: List[int]) -> None:
    db.query(UserAccount).filter(UserAccount.account_id.in_(account_ids)).delete(synchronize_session=False)
    db.commit()


def update_account_policy(db: Session, account_id: int, policy_id: Optional[int]) -> None:
    account = db.query(UserAccount).filter(UserAccount.account_id == account_id).first()
    if not account:
        raise NotFoundError("계정을 찾을 수 없습니다.")
    account.policy_id = policy_id
    db.commit()


# ── 리더 일괄 계정 생성 ──────────────────────────────────────────────────────

def _latest_profile_subquery(db: Session):
    return (
        db.query(
            MemberProfile.member_id,
            func.max(MemberProfile.profile_id).label("max_id"),
        )
        .group_by(MemberProfile.member_id)
        .subquery()
    )


def get_leader_preview(db: Session) -> List[Dict]:
    latest_sq = _latest_profile_subquery(db)

    existing_member_ids = (
        db.query(UserAccount.member_id)
        .filter(UserAccount.member_id.isnot(None))
        .subquery()
    )

    rows = (
        db.query(Member, MemberProfile)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .filter(Member.deleted_at.is_(None))
        .filter(Member.phone_number.isnot(None))
        .filter(MemberProfile.leader_ids.isnot(None))
        .filter(MemberProfile.leader_ids != "[]")
        .filter(MemberProfile.leader_ids != "null")
        .filter(~Member.member_id.in_(existing_member_ids))
        .order_by(MemberProfile.gyogu, MemberProfile.team, MemberProfile.group_no)
        .all()
    )

    leaders: Dict[int, str] = {
        row.leader_id: row.leader_name
        for row in db.query(Leader).filter(Leader.is_active == 1).all()
    }

    result = []
    for member, profile in rows:
        try:
            raw_ids = json.loads(profile.leader_ids or "[]")
            leader_names = [leaders[int(lid)] for lid in raw_ids if lid and int(lid) in leaders]
        except (json.JSONDecodeError, ValueError):
            leader_names = []

        result.append({
            "member_id": member.member_id,
            "name": member.name,
            "login_id": member.phone_number.replace("-", ""),
            "gyogu": profile.gyogu,
            "team": profile.team,
            "group_no": profile.group_no,
            "leader_names": leader_names,
        })
    return result


def get_all_leaders_with_account_status(db: Session) -> List[Dict]:
    latest_sq = _latest_profile_subquery(db)
    rows = (
        db.query(Member, MemberProfile)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .filter(Member.deleted_at.is_(None))
        .filter(Member.phone_number.isnot(None))
        .filter(MemberProfile.leader_ids.isnot(None))
        .filter(MemberProfile.leader_ids != "[]")
        .filter(MemberProfile.leader_ids != "null")
        .order_by(MemberProfile.gyogu, MemberProfile.team, MemberProfile.group_no)
        .all()
    )
    member_ids = [m.member_id for m, _ in rows]
    accounts = {
        a.member_id: a
        for a in db.query(UserAccount).filter(UserAccount.member_id.in_(member_ids)).all()
        if a.member_id is not None
    }
    leaders = {
        row.leader_id: row.leader_name
        for row in db.query(Leader).filter(Leader.is_active == 1).all()
    }
    result = []
    for member, profile in rows:
        account = accounts.get(member.member_id)
        try:
            raw_ids = json.loads(profile.leader_ids or "[]")
            leader_names = [leaders[int(lid)] for lid in raw_ids if lid and int(lid) in leaders]
        except (json.JSONDecodeError, ValueError):
            leader_names = []
        result.append({
            "member_id": member.member_id,
            "name": member.name,
            "login_id": member.phone_number.replace("-", ""),
            "gyogu": profile.gyogu,
            "team": profile.team,
            "group_no": profile.group_no,
            "leader_names": leader_names,
            "account_id": account.account_id if account else None,
            "has_account": account is not None,
            "is_active": bool(account.is_active) if account else False,
            "policy_id": account.policy_id if account else None,
            "data_scope": account.data_scope if account else None,
        })
    return result


def bulk_sync_accounts(db: Session, all_leader_member_ids: List[int], active_member_ids: List[int], data_scope: str, policy_id: Optional[int]) -> Dict:
    active_set = set(active_member_ids)
    all_set = set(all_leader_member_ids)
    existing_accounts = {
        a.member_id: a
        for a in db.query(UserAccount).filter(UserAccount.member_id.in_(list(all_set))).all()
        if a.member_id is not None
    }
    alphabet = string.ascii_letters + string.digits
    now = now_kst()
    created = []
    deactivated_count = 0

    for member_id in active_set:
        acc = existing_accounts.get(member_id)
        if acc is None:
            member = db.query(Member).filter(Member.member_id == member_id, Member.phone_number.isnot(None)).first()
            if member:
                login_id = member.phone_number.replace("-", "")
                dup = db.query(UserAccount).filter(func.replace(UserAccount.login_id, "-", "") == login_id).first()
                if not dup:
                    plain_pw = "".join(secrets.choice(alphabet) for _ in range(8))
                    db.add(UserAccount(
                        login_id=login_id, password=_hash_pw(plain_pw),
                        data_scope=data_scope, policy_id=policy_id,
                        member_id=member_id, is_active=1,
                        created_at=now,
                    ))
                    created.append({"name": member.name, "login_id": login_id, "password": plain_pw})
        elif not acc.is_active:
            acc.is_active = 1

    for member_id in all_set - active_set:
        acc = existing_accounts.get(member_id)
        if acc and acc.is_active:
            acc.is_active = 0
            deactivated_count += 1

    db.commit()
    return {"created": created, "deactivated_count": deactivated_count}


def bulk_create_leader_accounts(db: Session, member_ids: List[int], data_scope: str, policy_id: Optional[int] = None) -> List[Dict]:
    latest_sq = _latest_profile_subquery(db)

    existing_member_ids = (
        db.query(UserAccount.member_id)
        .filter(UserAccount.member_id.isnot(None))
        .subquery()
    )

    rows = (
        db.query(Member, MemberProfile)
        .join(latest_sq, Member.member_id == latest_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == latest_sq.c.max_id)
        .filter(Member.member_id.in_(member_ids))
        .filter(Member.phone_number.isnot(None))
        .filter(~Member.member_id.in_(existing_member_ids))
        .all()
    )

    alphabet = string.ascii_letters + string.digits
    result = []
    now = now_kst()

    for member, _ in rows:
        login_id = member.phone_number.replace("-", "")
        plain_pw = "".join(secrets.choice(alphabet) for _ in range(8))
        db.add(UserAccount(
            login_id=login_id,
            password=_hash_pw(plain_pw),
            data_scope=data_scope,
            policy_id=policy_id,
            member_id=member.member_id,
            is_active=1,
            created_at=now,
        ))
        result.append({"name": member.name, "login_id": login_id, "password": plain_pw})

    db.commit()
    return result


# ── 정책 ─────────────────────────────────────────────────────────────────────

def list_policies(db: Session) -> List[PolicyAccess]:
    return db.query(PolicyAccess).order_by(PolicyAccess.policy_id).all()


def get_policy_menus(db: Session, policy_id: int) -> List[str]:
    return [
        row.menu_key
        for row in db.query(PolicyAccessMenu.menu_key)
        .filter(PolicyAccessMenu.policy_id == policy_id)
        .all()
    ]


def create_policy(db: Session, data: PolicyCreate) -> PolicyAccess:
    policy = PolicyAccess(policy_name=data.policy_name, description=data.description)
    db.add(policy)
    db.flush()
    for key in data.menus:
        db.add(PolicyAccessMenu(policy_id=policy.policy_id, menu_key=key))
    db.commit()
    db.refresh(policy)
    return policy


def update_policy(db: Session, policy_id: int, data: PolicyUpdate) -> PolicyAccess:
    policy = db.query(PolicyAccess).filter(PolicyAccess.policy_id == policy_id).first()
    if not policy:
        raise NotFoundError("정책을 찾을 수 없습니다.")
    policy.policy_name = data.policy_name
    policy.description = data.description
    db.query(PolicyAccessMenu).filter(PolicyAccessMenu.policy_id == policy_id).delete()
    for key in data.menus:
        db.add(PolicyAccessMenu(policy_id=policy_id, menu_key=key))
    db.commit()
    db.refresh(policy)
    return policy


def delete_policy(db: Session, policy_id: int) -> None:
    policy = db.query(PolicyAccess).filter(PolicyAccess.policy_id == policy_id).first()
    if not policy:
        raise NotFoundError("정책을 찾을 수 없습니다.")
    db.query(UserAccount).filter(UserAccount.policy_id == policy_id).update({"policy_id": None})
    db.query(PolicyDataScope).filter(PolicyDataScope.policy_id == policy_id).delete()
    db.query(PolicyAccessMenu).filter(PolicyAccessMenu.policy_id == policy_id).delete()
    db.delete(policy)
    db.commit()


# ── 범위별 정책 할당 ──────────────────────────────────────────────────────────

def get_scope_policies(db: Session) -> dict:
    result: dict = {"all": [], "team": [], "group": [], "member": []}
    for row in db.query(PolicyDataScope).all():
        if row.data_scope in result:
            result[row.data_scope].append(row.policy_id)
    return result


def update_scope_policies(db: Session, data: ScopePoliciesUpdate) -> None:
    db.query(PolicyDataScope).delete()
    for pid in data.all:
        db.add(PolicyDataScope(data_scope="all", policy_id=pid))
    for pid in data.team:
        db.add(PolicyDataScope(data_scope="team", policy_id=pid))
    for pid in data.group:
        db.add(PolicyDataScope(data_scope="group", policy_id=pid))
    for pid in data.member:
        db.add(PolicyDataScope(data_scope="member", policy_id=pid))
    db.commit()
