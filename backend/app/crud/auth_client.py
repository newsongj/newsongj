import json
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Leader, Member, MemberProfile, PolicyAccessMenu, PolicyDataScope, UserAccount


def get_menus_for_policy(db: Session, policy_id: Optional[int]) -> List[str]:
    if not policy_id:
        return []
    return [
        row.menu_key
        for row in db.query(PolicyAccessMenu.menu_key)
        .filter(PolicyAccessMenu.policy_id == policy_id)
        .all()
    ]


def get_user_account_by_login_id(db: Session, login_id: str) -> Optional[UserAccount]:
    # 입력값과 DB값 모두 '-' 제거 후 비교 (010-1234-5678 / 01012345678 둘 다 허용)
    normalized = login_id.replace('-', '')
    return (
        db.query(UserAccount)
        .filter(
            func.replace(UserAccount.login_id, '-', '') == normalized,
            UserAccount.is_active == 1,
        )
        .first()
    )


def get_member_by_phone_and_name(db: Session, phone: str, name: str) -> Optional[Member]:
    normalized = phone.replace('-', '')
    return (
        db.query(Member)
        .filter(
            func.replace(Member.phone_number, '-', '') == normalized,
            Member.name == name,
            Member.deleted_at.is_(None),
        )
        .first()
    )


def get_member_profile(db: Session, member_id: int) -> Optional[MemberProfile]:
    return (
        db.query(MemberProfile)
        .filter(MemberProfile.member_id == member_id)
        .order_by(MemberProfile.updated_at.desc())
        .first()
    )


def get_leader_names_for_member(db: Session, profile: Optional[MemberProfile]) -> List[str]:
    if not profile or not profile.leader_ids:
        return []
    try:
        raw_ids = json.loads(profile.leader_ids)
    except (ValueError, TypeError):
        return []
    if not raw_ids:
        return []
    leaders = {
        row.leader_id: row.leader_name
        for row in db.query(Leader).filter(Leader.leader_id.in_([int(i) for i in raw_ids if i])).all()
    }
    return [leaders[int(i)] for i in raw_ids if i and int(i) in leaders]


def get_menus_for_scope(db: Session, data_scope: str) -> List[str]:
    policy_ids = [
        row.policy_id
        for row in db.query(PolicyDataScope.policy_id)
        .filter(PolicyDataScope.data_scope == data_scope)
        .all()
    ]
    if not policy_ids:
        return []
    return [
        row.menu_key
        for row in db.query(PolicyAccessMenu.menu_key)
        .filter(PolicyAccessMenu.policy_id.in_(policy_ids))
        .distinct()
        .all()
    ]
