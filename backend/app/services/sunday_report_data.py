"""Attendance facts used by the Sunday-report worksheets.

The template has one row for each of three gyogu x twelve teams, plus a
separate executive row. Keep those groups disjoint so its totals reconcile.
Generation sheets have no executive row, so executives count in their own team there.
"""
import datetime
import json
from collections import Counter, defaultdict
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.crud.query_builders import (
    NEWCOMER_TYPE,
    apply_attendance_filters,
    build_attendance_records_range_query,
    build_members_as_of_query,
    get_leader_id,
    unenrolled_newcomers_as_of,
)
from app.models import AttendanceRecord, Member, MemberProfile


GYOGU = (1, 2, 3)
TEAMS = tuple(range(1, 13))
GENERATIONS = (45, 46)
EDUCATION_WEEKS = (1, 2, 3, 4)


@dataclass
class WeekAttendance:
    date: datetime.date
    teams: Counter[tuple[int, int]] = field(default_factory=Counter)
    executive: int = 0
    total: int = 0
    newcomers: int = 0
    generations: Counter[int] = field(default_factory=Counter)
    generation_teams: Counter[tuple[int, int, int]] = field(default_factory=Counter)
    grades: Counter[str] = field(default_factory=Counter)

    def gyogu_total(self, gyogu: int) -> int:
        return sum(self.teams[gyogu, team] for team in TEAMS)


@dataclass
class ReportMember:
    name: str
    gyogu: int
    team: int
    generation: int
    is_newcomer: bool


@dataclass
class SundayReportData:
    weeks: list[WeekAttendance]
    team_leaders: dict[tuple[int, int], str]
    # Present on the report date, executives included in their own team.
    present: list[ReportMember] = field(default_factory=list)
    # Former newcomers whose enrolled_at falls in the report week, by team as of the report date.
    enrolled: dict[tuple[int, int], list[str]] = field(default_factory=dict)
    enrolled_previous_week: int = 0
    enrolled_this_year: Counter[tuple[int, int]] = field(default_factory=Counter)
    # (gyogu, team, category) -> names; see newcomer_category for the categories.
    newcomer_status: dict[tuple[int, int, str], list[str]] = field(default_factory=dict)

    @property
    def enrolled_this_week(self) -> int:
        return sum(len(names) for names in self.enrolled.values())


def _has_role(raw_ids: str | None, role_id: int | None) -> bool:
    if not raw_ids or role_id is None:
        return False
    try:
        return str(role_id) in {str(value) for value in json.loads(raw_ids)}
    except (TypeError, ValueError):
        return False


def newcomer_category(
    member: Member,
    record: AttendanceRecord | None,
    week_start: datetime.date,
    report_date: datetime.date,
    enrolled_this_week: bool,
) -> str:
    """Place one newcomer in exactly one status row: enrollment, registration, then attendance."""
    present = record is not None and record.status == "PRESENT"
    if enrolled_this_week:
        return "등반현장" if present else "등반결석"
    if member.registered_at is not None and week_start <= member.registered_at <= report_date:
        return "등록"
    if not present:
        return "결석"
    if record.edu_week in EDUCATION_WEEKS:
        return f"교육{record.edu_week}"
    return "모임"


def _week_start(report_date: datetime.date) -> datetime.date:
    """First day of the report week: the day after the previous Saturday."""
    return report_date - datetime.timedelta(days=6)


def _day_start(value: datetime.date) -> datetime.datetime:
    return datetime.datetime.combine(value, datetime.time.min)


def _load_enrolled(
    db: Session,
    data: SundayReportData,
    report_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> dict[int, tuple[Member, MemberProfile]]:
    """Fill enrollment counts and return this week's enrolled members by id.

    Direct member creation also sets enrolled_at, so only members with a
    newcomer profile in their history count as enrolled.
    """
    week_start = _week_start(report_date)
    previous_start = week_start - datetime.timedelta(weeks=1)
    year_start = datetime.date(report_date.year, 1, 1)
    had_newcomer_profile = db.query(MemberProfile.member_id).filter(
        MemberProfile.member_type == NEWCOMER_TYPE,
    )
    rows = build_members_as_of_query(db, report_date, include_newcomers=True).filter(
        Member.member_id.in_(had_newcomer_profile),
        Member.enrolled_at >= _day_start(min(year_start, previous_start)),
        Member.enrolled_at < _day_start(report_date + datetime.timedelta(days=1)),
    )
    rows = apply_attendance_filters(rows, gyogu_no, team_no)

    this_week: dict[int, tuple[Member, MemberProfile]] = {}
    enrolled: dict[tuple[int, int], list[str]] = defaultdict(list)
    for member, profile in rows.all():
        enrolled_on = member.enrolled_at.date()
        key = (profile.gyogu, profile.team)
        if enrolled_on >= week_start:
            this_week[member.member_id] = (member, profile)
            enrolled[key].append(member.name)
        elif enrolled_on >= previous_start:
            data.enrolled_previous_week += 1
        if enrolled_on >= year_start:
            data.enrolled_this_year[key] += 1
    data.enrolled = {key: sorted(names) for key, names in enrolled.items()}
    return this_week


def _load_newcomer_status(
    db: Session,
    data: SundayReportData,
    report_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
    enrolled: dict[int, tuple[Member, MemberProfile]],
) -> None:
    newcomers = unenrolled_newcomers_as_of(
        build_members_as_of_query(db, report_date, include_newcomers=True), report_date,
    )
    newcomers = apply_attendance_filters(newcomers, gyogu_no, team_no)
    targets = {member.member_id: (member, profile) for member, profile in newcomers.all()}
    targets.update(enrolled)
    if not targets:
        return
    records = {
        record.member_id: record
        for record in db.query(AttendanceRecord).filter(
            AttendanceRecord.worship_date == report_date,
            AttendanceRecord.member_id.in_(list(targets)),
        )
    }
    week_start = _week_start(report_date)
    status: dict[tuple[int, int, str], list[str]] = defaultdict(list)
    for member_id, (member, profile) in targets.items():
        category = newcomer_category(
            member, records.get(member_id), week_start, report_date, member_id in enrolled,
        )
        status[profile.gyogu, profile.team, category].append(member.name)
    data.newcomer_status = {key: sorted(names) for key, names in status.items()}


def load_sunday_report_data(
    db: Session,
    report_date: datetime.date,
    gyogu_no: int | None,
    team_no: int | None,
) -> SundayReportData:
    dates = [report_date - datetime.timedelta(weeks=offset) for offset in (3, 2, 1, 0)]
    weeks = [WeekAttendance(date=date) for date in dates]
    by_date = {week.date: week for week in weeks}
    data = SundayReportData(weeks=weeks, team_leaders={})

    executive_id = get_leader_id(db, "임원단")
    records = build_attendance_records_range_query(
        db, dates[0], dates[-1], include_newcomers=True,
    )
    records = apply_attendance_filters(records, gyogu_no, team_no)
    for record, member, profile in records.all():
        if record.status != "PRESENT":
            continue
        week = by_date[record.worship_date]
        is_executive = _has_role(profile.leader_ids, executive_id)
        placed = profile.gyogu in GYOGU and profile.team in TEAMS
        if is_executive:
            week.executive += 1
        elif placed:
            week.teams[profile.gyogu, profile.team] += 1
        else:
            raise ValueError(
                "Sunday report cannot place a present member outside gyogu 1-3/team 1-12"
            )
        week.total += 1
        week.generations[member.generation] += 1
        is_newcomer = profile.member_type == NEWCOMER_TYPE
        if is_newcomer:
            week.newcomers += 1
        if profile.attendance_grade:
            week.grades[profile.attendance_grade] += 1
        if placed:
            week.generation_teams[member.generation, profile.gyogu, profile.team] += 1
            if week is weeks[-1]:
                data.present.append(ReportMember(
                    member.name, profile.gyogu, profile.team, member.generation, is_newcomer,
                ))
    data.present.sort(key=lambda item: item.name)

    team_leader_id = get_leader_id(db, "팀장")
    if team_leader_id is not None:
        leaders = build_members_as_of_query(db, report_date, include_newcomers=True)
        leaders = apply_attendance_filters(leaders, gyogu_no, team_no)
        names: dict[tuple[int, int], set[str]] = defaultdict(set)
        for member, profile in leaders.all():
            if _has_role(profile.leader_ids, team_leader_id):
                names[profile.gyogu, profile.team].add(member.name)
        data.team_leaders = {key: " / ".join(sorted(values)) for key, values in names.items()}

    enrolled = _load_enrolled(db, data, report_date, gyogu_no, team_no)
    _load_newcomer_status(db, data, report_date, gyogu_no, team_no, enrolled)
    return data
