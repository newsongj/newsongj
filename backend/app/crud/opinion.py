"""소견서 CRUD — 순수 DB 조작만 담당"""
import datetime
from typing import Dict, List, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    Member, MemberProfile,
    MemberOpinionReport, MemberOpinionReportWriter,
    OpinionReportMapping, TeamAssignmentCompanion,
)


def _profile_as_of_year_subquery(db: Session, report_year: int):
    """§2-1 스냅샷 규칙 — report_year 12/31 시점 최신 profile_id.

    동일 member_id에서 updated_at이 가장 늦은 것을 고르고, 그 날짜가 같으면
    profile_id가 큰 것을 고른다 (crud/members.py의 tie-break와 동일).
    """
    cutoff = datetime.date(report_year, 12, 31)
    date_sq = (
        db.query(
            MemberProfile.member_id.label("member_id"),
            func.max(MemberProfile.updated_at).label("max_date"),
        )
        .filter(MemberProfile.updated_at <= cutoff)
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    id_sq = (
        db.query(
            MemberProfile.member_id.label("member_id"),
            func.max(MemberProfile.profile_id).label("profile_id"),
        )
        .join(
            date_sq,
            (MemberProfile.member_id == date_sq.c.member_id)
            & (MemberProfile.updated_at == date_sq.c.max_date),
        )
        .group_by(MemberProfile.member_id)
        .subquery()
    )
    return id_sq


def get_report_year_snapshot(db: Session, report_year: int) -> List[Tuple[Member, MemberProfile]]:
    """report_year 시점 재적 전체 (Member, MemberProfile) 목록 — 소견서 대상자 전체."""
    id_sq = _profile_as_of_year_subquery(db, report_year)
    return (
        db.query(Member, MemberProfile)
        .join(id_sq, Member.member_id == id_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == id_sq.c.profile_id)
        .all()
    )


def get_opinion_reports_by_year(db: Session, report_year: int) -> Dict[int, MemberOpinionReport]:
    """member_id → 해당 연도 소견서 매핑."""
    rows = (
        db.query(MemberOpinionReport)
        .filter(MemberOpinionReport.report_year == report_year)
        .all()
    )
    return {r.member_id: r for r in rows}


def get_writer_ids_by_report(db: Session, opinion_report_ids: List[int]) -> Dict[int, List[int]]:
    """opinion_report_id → 실제 작성자 member_id 목록 (§0-2 member_opinion_report_writer)."""
    if not opinion_report_ids:
        return {}
    rows = (
        db.query(MemberOpinionReportWriter)
        .filter(MemberOpinionReportWriter.opinion_report_id.in_(opinion_report_ids))
        .all()
    )
    result: Dict[int, List[int]] = {}
    for r in rows:
        result.setdefault(r.opinion_report_id, []).append(r.writer_member_id)
    return result


def get_mapping_by_target(db: Session, report_year: int) -> Dict[int, List[int]]:
    """target_member_id → writer_member_id 목록 (임원단 매핑, 본인 제외)."""
    rows = (
        db.query(OpinionReportMapping)
        .filter(OpinionReportMapping.report_year == report_year)
        .all()
    )
    result: Dict[int, List[int]] = {}
    for r in rows:
        if r.writer_member_id == r.target_member_id:
            continue
        result.setdefault(r.target_member_id, []).append(r.writer_member_id)
    return result


def get_companion_ids_by_member(db: Session, report_year: int) -> Dict[int, List[int]]:
    """member_id → 동반배치 묶음의 다른 인원 member_id 목록.

    조회 키는 report_year + 1 — 2026년 소견서의 동반배치자는 2027년 팀배치 묶음에서 온다.
    """
    target_year = report_year + 1
    rows = (
        db.query(TeamAssignmentCompanion)
        .filter(TeamAssignmentCompanion.target_year == target_year)
        .all()
    )
    by_companion_no: Dict[int, List[int]] = {}
    for r in rows:
        by_companion_no.setdefault(r.companion_no, []).append(r.member_id)

    result: Dict[int, List[int]] = {}
    for member_ids in by_companion_no.values():
        for mid in member_ids:
            result[mid] = [x for x in member_ids if x != mid]
    return result


def get_member_profile_as_of_year(db: Session, member_id: int, report_year: int):
    """§2-1 스냅샷 규칙 — 단건 멤버의 report_year 시점 최신 profile."""
    id_sq = _profile_as_of_year_subquery(db, report_year)
    return (
        db.query(MemberProfile)
        .join(id_sq, MemberProfile.profile_id == id_sq.c.profile_id)
        .filter(MemberProfile.member_id == member_id)
        .first()
    )


def get_report_by_member_year(db: Session, member_id: int, report_year: int):
    return (
        db.query(MemberOpinionReport)
        .filter(
            MemberOpinionReport.member_id == member_id,
            MemberOpinionReport.report_year == report_year,
        )
        .first()
    )


def get_last_writer(db: Session, opinion_report_id: int):
    """§0-4-3 409 응답의 last_writer — last_written_at이 가장 최근인 작성자."""
    return (
        db.query(MemberOpinionReportWriter)
        .filter(MemberOpinionReportWriter.opinion_report_id == opinion_report_id)
        .order_by(MemberOpinionReportWriter.last_written_at.desc())
        .first()
    )


def create_report(db: Session, member_id: int, report_year: int, fields: dict) -> MemberOpinionReport:
    report = MemberOpinionReport(member_id=member_id, report_year=report_year, **fields)
    db.add(report)
    db.flush()
    return report


def update_report_conditional(
    db: Session, opinion_report_id: int, base_updated_at, fields: dict, new_updated_at,
) -> int:
    """§0-4-1 낙관적 잠금 — 조건을 UPDATE 문 자체에 넣는다. affected_rows 반환."""
    return (
        db.query(MemberOpinionReport)
        .filter(
            MemberOpinionReport.opinion_report_id == opinion_report_id,
            MemberOpinionReport.updated_at == base_updated_at,
        )
        .update({**fields, "updated_at": new_updated_at}, synchronize_session=False)
    )
