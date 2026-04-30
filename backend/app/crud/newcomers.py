"""미등반 새가족 CRUD — 일반 멤버와 분리된 도메인.

정책 SSoT: `MDs/reference/newcomers.md`
공통 요소(목록 조회 등)는 `crud/members.py`의 헬퍼를 재사용한다.
"""
from sqlalchemy.orm import Session
from app.models import Member, MemberProfile
from app.schemas.newcomers import NewcomerCreate, NewcomerUpdate, EnrollRequest
from app.crud.member_profile import insert_profile, upsert_profile_on_date, get_latest_profile
from app.crud.query_builders import (
    active_now,
    build_active_members_query,
    newcomers_only,
    NEWCOMER_TYPE,
)
from app.crud.members import _is_newcomer, _finish_member_list
from app.core.timezone import today_kst
from app.core.exceptions import MemberNotFoundError


def get_newcomers(db: Session, page: int, page_size: int, year: int, gyogu=None, team=None, group_no=None, generation=None, field=None, keyword=None):
    """미등반 새가족 목록 조회 — `member_type='새가족'` 인 활성 멤버 (deleted_at IS NULL)"""
    query = newcomers_only(build_active_members_query(db, year, include_newcomers=True))
    return _finish_member_list(db, query, page, page_size, gyogu, team, group_no, generation, field, keyword)


def create_newcomer(db: Session, data: NewcomerCreate) -> Member:
    """새가족 생성 — `member_type='새가족'`, `enrolled_at`은 등반 전이라 NULL."""
    member = Member(
        name=data.name,
        gender=data.gender,
        generation=data.generation,
        phone_number=data.phone_number,
        v8pid=data.v8pid,
        birthdate=data.birthdate,
        school_work=data.school_work,
        major=data.major,
        enrolled_at=None,  # 등반 전 — enroll_newcomer에서 세팅
    )
    db.add(member)
    db.flush()

    insert_profile(
        db, member.member_id, today_kst(),
        gyogu=data.gyogu, team=data.team, group_no=data.group_no,
        member_type=NEWCOMER_TYPE,
        leader_ids=None, plt_status=None,
    )

    db.commit()
    db.refresh(member)
    return member


def update_newcomer(db: Session, member_id: int, data: NewcomerUpdate) -> int:
    """새가족 정보 수정 — 대상이 새가족이 아니면 404. `member_type`은 변경 불가."""
    member = active_now(db.query(Member).filter(Member.member_id == member_id)).first()
    if not member or not _is_newcomer(db, member_id):
        raise MemberNotFoundError("새가족 멤버를 찾을 수 없습니다.")

    member.name = data.name
    member.gender = data.gender
    member.generation = data.generation
    member.phone_number = data.phone_number
    member.v8pid = data.v8pid
    member.birthdate = data.birthdate
    member.school_work = data.school_work
    member.major = data.major

    upsert_profile_on_date(
        db, member_id, today_kst(),
        gyogu=data.gyogu, team=data.team, group_no=data.group_no,
        member_type=NEWCOMER_TYPE,
        leader_ids=None, plt_status=None,
    )

    db.commit()
    return member_id


def delete_newcomer(db: Session, member_id: int) -> int:
    """새가족 소프트 삭제 — 대상이 새가족이 아니면 404."""
    from app.core.timezone import now_kst
    member = active_now(db.query(Member).filter(Member.member_id == member_id)).first()
    if not member or not _is_newcomer(db, member_id):
        raise MemberNotFoundError("새가족 멤버를 찾을 수 없습니다.")

    member.deleted_at = now_kst()
    member.deleted_reason = "새가족 삭제"
    db.commit()
    return member_id


def enroll_newcomer(db: Session, member_id: int, data: EnrollRequest) -> int:
    """등반 처리 — `member_type` 새가족 → 일반 전환 + `enrolled_at` 세팅.

    오늘 날짜로 새 profile row를 upsert. 이전 새가족 profile은 이력으로 보존.
    """
    member = active_now(db.query(Member).filter(Member.member_id == member_id)).first()
    if not member or not _is_newcomer(db, member_id):
        raise MemberNotFoundError("새가족 멤버를 찾을 수 없습니다.")

    latest = get_latest_profile(db, member_id)
    assert latest is not None, "_is_newcomer가 True면 profile이 반드시 존재"

    upsert_profile_on_date(
        db, member_id, today_kst(),
        gyogu=latest.gyogu, team=latest.team, group_no=latest.group_no,
        member_type=data.member_type,
        leader_ids=latest.leader_ids, plt_status=latest.plt_status,
    )
    member.enrolled_at = data.enrolled_at

    db.commit()
    return member_id
