"""소견서 설정 CRUD — opinion_report_custom / opinion_report_mapping (§1). 커밋은 호출자가 한다."""
from typing import Dict, Iterable, List, Tuple

from sqlalchemy.orm import Session

from app.crud.opinion import _profile_as_of_year_subquery
from app.models import Member, MemberProfile, OpinionReportCustom, OpinionReportMapping


def create_opinion_custom(db: Session, report_year: int) -> OpinionReportCustom:
    custom = OpinionReportCustom(report_year=report_year, is_active=1)
    db.add(custom)
    db.flush()
    return custom


def get_mappings_by_year(db: Session, report_year: int) -> List[OpinionReportMapping]:
    return (
        db.query(OpinionReportMapping)
        .filter(OpinionReportMapping.report_year == report_year)
        .order_by(OpinionReportMapping.mapping_id)
        .all()
    )


def replace_mappings(db: Session, report_year: int, pairs: Iterable[Tuple[int, int]]) -> None:
    """해당 연도 매핑을 통째로 대체한다 (delete-then-insert)."""
    db.query(OpinionReportMapping).filter(
        OpinionReportMapping.report_year == report_year,
    ).delete(synchronize_session=False)
    for writer_id, target_id in pairs:
        db.add(OpinionReportMapping(
            report_year=report_year, writer_member_id=writer_id, target_member_id=target_id,
        ))
    db.flush()


def get_members_as_of_year(
    db: Session, member_ids: Iterable[int], report_year: int,
) -> Dict[int, Tuple[Member, MemberProfile]]:
    """member_id → (Member, report_year 스냅샷 profile). 스냅샷이 없는 멤버는 빠진다."""
    ids = list(set(member_ids))
    if not ids:
        return {}
    id_sq = _profile_as_of_year_subquery(db, report_year)
    rows = (
        db.query(Member, MemberProfile)
        .join(id_sq, Member.member_id == id_sq.c.member_id)
        .join(MemberProfile, MemberProfile.profile_id == id_sq.c.profile_id)
        .filter(Member.member_id.in_(ids))
        .all()
    )
    return {m.member_id: (m, p) for m, p in rows}
