"""소견서 비즈니스 로직 — CRUD 호출 후 응답 스키마 변환."""
import json
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import OpinionReportCustom
from app.schemas.opinion import (
    MemberFieldOption,
    MyOpinionTargetItem, MyOpinionTargetListResponse,
    OpinionAutoField,
    OpinionMappingBulkCreate, OpinionMappingResponse,
    OpinionReportCreate, OpinionReportCustomResponse, OpinionReportFormResponse,
    OpinionReportSaveBody, OpinionReportUpdate,
)
from app.crud.opinion import (
    bulk_create_mapping as crud_bulk_create_mapping,
    complete_opinion_custom as crud_complete_opinion_custom,
    create_opinion_custom as crud_create_opinion_custom,
    delete_mapping as crud_delete_mapping,
    get_active_opinion_custom as crud_get_active_opinion_custom,
    get_allowed_member_fields as crud_get_allowed_member_fields,
    get_mapping_list as crud_get_mapping_list,
    get_member_with_profile as crud_get_member_with_profile,
    get_my_target_mappings as crud_get_my_target_mappings,
    get_opinion_custom as crud_get_opinion_custom,
    get_opinion_report as crud_get_opinion_report,
    is_writer_assigned as crud_is_writer_assigned,
    update_opinion_custom as crud_update_opinion_custom,
    upsert_opinion_report as crud_upsert_opinion_report,
)
from app.core.exceptions import AppError, ConflictError, NotFoundError


class ForbiddenError(AppError):
    status_code = 403
    default_detail = "접근 권한이 없습니다."


def _parse_list(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return []


def _custom_to_response(custom: OpinionReportCustom) -> OpinionReportCustomResponse:
    return OpinionReportCustomResponse(
        opinion_custom_id=custom.opinion_custom_id,
        report_year=custom.report_year,
        start_date=custom.start_date,
        end_date=custom.end_date,
        guide_text=custom.guide_text,
        member_fields=_parse_list(custom.member_fields),
        input_fields=_parse_list(custom.input_fields),
        status_options=_parse_list(custom.status_options),
        plan_options=_parse_list(custom.plan_options),
        is_active=bool(custom.is_active),
    )


# ── 소견서 회차 설정 (관리자) ───────────────────────────────────────────────────

def svc_get_member_field_options() -> List[MemberFieldOption]:
    return [MemberFieldOption(**f) for f in crud_get_allowed_member_fields()]


def svc_get_active_opinion_custom(db: Session) -> OpinionReportCustomResponse:
    custom = crud_get_active_opinion_custom(db)
    if not custom:
        raise NotFoundError("진행 중인 소견서 회차가 없습니다.")
    return _custom_to_response(custom)


def svc_create_opinion_custom(db: Session, body: OpinionReportCreate) -> OpinionReportCustomResponse:
    custom = crud_create_opinion_custom(db, body)
    return _custom_to_response(custom)


def svc_update_opinion_custom(db: Session, opinion_custom_id: int, body: OpinionReportUpdate) -> None:
    crud_update_opinion_custom(db, opinion_custom_id, body)


def svc_complete_opinion_custom(db: Session, opinion_custom_id: int) -> None:
    crud_complete_opinion_custom(db, opinion_custom_id)


# ── 작성자 배정 (관리자) ───────────────────────────────────────────────────────

def svc_bulk_create_mapping(db: Session, report_year: int, body: OpinionMappingBulkCreate) -> None:
    pairs = [(m.writer_member_id, m.target_member_id) for m in body.mappings]
    crud_bulk_create_mapping(db, report_year, pairs)


def svc_get_mapping_list(db: Session, report_year: int) -> List[OpinionMappingResponse]:
    rows = crud_get_mapping_list(db, report_year)
    return [
        OpinionMappingResponse(
            mapping_id=mapping.mapping_id,
            writer_member_id=writer.member_id,
            writer_name=writer.name,
            target_member_id=target.member_id,
            target_name=target.name,
        )
        for mapping, writer, target in rows
    ]


def svc_delete_mapping(db: Session, mapping_id: int) -> None:
    crud_delete_mapping(db, mapping_id)


# ── 목록 페이지 (작성자 본인) ───────────────────────────────────────────────────

def svc_get_my_targets(db: Session, writer_member_id: int) -> MyOpinionTargetListResponse:
    custom = crud_get_active_opinion_custom(db)
    if not custom:
        raise NotFoundError("진행 중인 소견서 회차가 없습니다.")

    mappings = crud_get_my_target_mappings(db, custom.report_year, writer_member_id)
    targets: List[MyOpinionTargetItem] = []
    for mapping in mappings:
        member, profile = crud_get_member_with_profile(db, mapping.target_member_id)
        if not member:
            continue
        report = crud_get_opinion_report(db, custom.report_year, mapping.target_member_id)
        targets.append(MyOpinionTargetItem(
            target_member_id=member.member_id,
            target_name=member.name,
            gyogu=profile.gyogu if profile else None,
            team=profile.team if profile else None,
            group_no=profile.group_no if profile else None,
            has_report=report is not None,
            updated_at=report.updated_at if report else None,
        ))

    return MyOpinionTargetListResponse(
        report_year=custom.report_year,
        is_active=bool(custom.is_active),
        start_date=custom.start_date,
        end_date=custom.end_date,
        targets=targets,
    )


# ── 작성 페이지 ────────────────────────────────────────────────────────────────

def svc_get_opinion_form(db: Session, writer_member_id: int, target_member_id: int) -> OpinionReportFormResponse:
    custom = crud_get_active_opinion_custom(db)
    if not custom:
        raise NotFoundError("진행 중인 소견서 회차가 없습니다.")
    if not crud_is_writer_assigned(db, custom.report_year, writer_member_id, target_member_id):
        raise ForbiddenError("해당 대상자의 소견서 작성자로 배정되어 있지 않습니다.")

    member, profile = crud_get_member_with_profile(db, target_member_id)
    if not member:
        raise NotFoundError("대상자를 찾을 수 없습니다.")

    labels = {f["key"]: f["label"] for f in crud_get_allowed_member_fields()}
    source = {**vars(member), **({} if not profile else vars(profile))}
    auto_fields = [
        OpinionAutoField(
            key=key,
            label=labels.get(key, key),
            value=None if source.get(key) is None else str(source.get(key)),
        )
        for key in _parse_list(custom.member_fields)
    ]

    report = crud_get_opinion_report(db, custom.report_year, target_member_id)

    return OpinionReportFormResponse(
        target_member_id=member.member_id,
        target_name=member.name,
        is_active=bool(custom.is_active),
        auto_fields=auto_fields,
        input_fields=_parse_list(custom.input_fields),
        status_options=_parse_list(custom.status_options),
        plan_options=_parse_list(custom.plan_options),
        current_status=report.current_status if report else None,
        current_status_etc=report.current_status_etc if report else None,
        group_meeting_attendance_status=report.group_meeting_attendance_status if report else None,
        sunday_morning_attendance_status=report.sunday_morning_attendance_status if report else None,
        sunday_evening_attendance_status=report.sunday_evening_attendance_status if report else None,
        next_year_plan=report.next_year_plan if report else None,
        next_year_plan_etc=report.next_year_plan_etc if report else None,
        general_opinion=report.general_opinion if report else None,
        special_opinion=report.special_opinion if report else None,
    )


def svc_save_opinion_report(
    db: Session, writer_member_id: int, target_member_id: int, body: OpinionReportSaveBody
) -> None:
    custom = crud_get_active_opinion_custom(db)
    if not custom:
        raise NotFoundError("진행 중인 소견서 회차가 없습니다.")
    if not crud_is_writer_assigned(db, custom.report_year, writer_member_id, target_member_id):
        raise ForbiddenError("해당 대상자의 소견서 작성자로 배정되어 있지 않습니다.")
    if not custom.is_active:
        raise ConflictError("작성 기간이 종료되어 수정할 수 없습니다.")

    crud_upsert_opinion_report(db, custom.report_year, target_member_id, body)
