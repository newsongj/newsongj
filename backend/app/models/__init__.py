from sqlalchemy import Column, Integer, BigInteger, SmallInteger, String, Date, DateTime, Numeric, Enum, Text, Time, UniqueConstraint
from sqlalchemy.dialects.mysql import YEAR
from app.core.database import Base
from app.core.timezone import now_kst


class UserAccount(Base):
    __tablename__ = "user_account"

    account_id               = Column(BigInteger, primary_key=True, autoincrement=True)
    login_id                 = Column(String(20), unique=True, nullable=False)
    password                 = Column(String(255), nullable=False)
    data_scope               = Column(Enum('all', 'team', 'group', 'member'), nullable=False)
    policy_id                = Column(BigInteger, nullable=True)
    member_id                = Column(BigInteger, nullable=True)
    is_active                = Column(SmallInteger, nullable=False, default=1)
    requires_password_change = Column(SmallInteger, nullable=False, default=0)
    created_at               = Column(DateTime, nullable=True)


class PolicyAccess(Base):
    __tablename__ = "policy_access"

    policy_id   = Column(BigInteger, primary_key=True, autoincrement=True)
    policy_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)


class PolicyAccessMenu(Base):
    __tablename__ = "policy_access_menu"

    policy_id = Column(BigInteger, primary_key=True)
    menu_key  = Column(String(100), primary_key=True)


class PolicyDataScope(Base):
    __tablename__ = "policy_data_scope"

    data_scope = Column(Enum('all', 'team', 'group', 'member'), primary_key=True)
    policy_id  = Column(BigInteger, primary_key=True)


class Member(Base):
    __tablename__ = "member"

    member_id      = Column(BigInteger, primary_key=True, autoincrement=True)
    name           = Column(String(100), nullable=False)
    gender         = Column(Enum('남', '여'), nullable=False)
    generation     = Column(SmallInteger, nullable=False)
    phone_number   = Column(String(13), unique=True, nullable=True)
    v8pid          = Column(String(64), unique=True, nullable=True)
    birthdate      = Column(Date, nullable=True)
    registered_at  = Column(Date, nullable=True)       # 최초 등록일 — 출석 관리 시작 기준
    enrolled_at    = Column(DateTime, nullable=True)   # 등반일 (미등반이면 NULL)
    school_work    = Column(String(255), nullable=True)   # 학교 및 직장
    major          = Column(String(255), nullable=True)   # 전공
    deleted_at     = Column(DateTime, nullable=True)
    deleted_reason = Column(String(255), nullable=True)


class MemberProfile(Base):
    __tablename__ = "member_profile"

    profile_id       = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id        = Column(BigInteger, nullable=False)
    updated_at       = Column(Date, nullable=False)
    member_type      = Column(Enum('토요예배', '주일예배', '래사랑', '군지체', '해외지체', '새가족'), nullable=False)
    attendance_rate  = Column(Numeric(5, 2), nullable=True)
    attendance_grade = Column(Enum('A', 'B', 'C', 'D', 'E'), nullable=True)
    gyogu            = Column(SmallInteger, nullable=False)
    team             = Column(SmallInteger, nullable=False)
    group_no         = Column(SmallInteger, nullable=False)
    leader_ids       = Column(Text, nullable=True)  # JSON 배열 (예: ["1", "3"]), leader 테이블 leader_id 참조
    plt_status       = Column(Enum('수료', '1학기 수료'), nullable=True)


class Leader(Base):
    __tablename__ = "leader"

    leader_id     = Column(SmallInteger, primary_key=True, autoincrement=True)
    leader_name   = Column(String(30), unique=True, nullable=False)
    display_order = Column(SmallInteger, nullable=False, default=0)
    is_active     = Column(SmallInteger, nullable=False, default=1)


class RetreatCustom(Base):
    __tablename__ = "retreat_custom"

    retreat_custom_id    = Column(BigInteger, primary_key=True, autoincrement=True)
    retreat_name         = Column(String(100), nullable=False)
    start_date           = Column(Date, nullable=False)
    end_date             = Column(Date, nullable=False)
    meal_price           = Column(Integer, nullable=False, default=0)
    suspended_meal_count = Column(SmallInteger, nullable=False, default=0)
    special_meal_name          = Column(String(50), nullable=True)
    special_meal_price         = Column(Integer, nullable=True)
    personal_vehicle_url  = Column(String(500), nullable=True)
    fee_with_bus               = Column(Integer, nullable=False, default=0)
    fee_without_bus            = Column(Integer, nullable=False, default=0)
    is_active                  = Column(SmallInteger, nullable=False, default=1)
    created_at           = Column(DateTime, nullable=False, default=now_kst)
    updated_at           = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)
    is_research_open       = Column(SmallInteger, nullable=False, default=1)
    is_vehicle_open        = Column(SmallInteger, nullable=False, default=1)
    is_suspended_meal_open = Column(SmallInteger, nullable=False, default=1)
    is_patient_room_open   = Column(SmallInteger, nullable=False, default=1)


class BusCustom(Base):
    __tablename__ = "bus_custom"

    bus_id          = Column(BigInteger, primary_key=True, autoincrement=True)
    bus_name        = Column(String(100), nullable=False)
    seat_count      = Column(SmallInteger, nullable=False)
    departure_date  = Column(Date, nullable=False)
    departure_time  = Column(Time, nullable=False)
    departure_place = Column(String(100), nullable=False)
    arrival_place   = Column(String(100), nullable=False)


class BusWaiting(Base):
    __tablename__ = "bus_waiting"

    waiting_id = Column(BigInteger, primary_key=True, autoincrement=True)
    bus_id     = Column(BigInteger, nullable=False)
    day_no     = Column(SmallInteger, nullable=False)
    member_id  = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, nullable=False, default=now_kst)


class MemberBusRegistration(Base):
    __tablename__ = "member_bus_registration"

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    bus_id        = Column(BigInteger, nullable=False)
    member_id     = Column(BigInteger, nullable=False)
    registered_at = Column(DateTime, nullable=False, default=now_kst)


class AttendanceRecord(Base):
    __tablename__ = "attendance_record"

    attendance_id = Column(BigInteger, primary_key=True, autoincrement=True)
    worship_date  = Column(Date, nullable=False)
    member_id     = Column(BigInteger, nullable=False)
    status        = Column(Enum('PRESENT', 'ABSENT'), nullable=False, default='ABSENT')
    absent_reason = Column(Enum('학교/학원', '회사', '알바', '가족모임', '개인일정', '아픔', '기타'), nullable=True)
    edu_week      = Column(SmallInteger, nullable=True)   # 새가족 교육주차 (1·2·3), 해당 없으면 NULL
    memo          = Column(String(500), nullable=False, default='')  # 새가족 교육 메모
    checked_at    = Column(DateTime, nullable=False)


class RetreatResponse(Base):
    __tablename__ = "retreat_response"

    response_id       = Column(BigInteger, primary_key=True, autoincrement=True)
    retreat_custom_id = Column(BigInteger, nullable=True)
    member_id         = Column(BigInteger, nullable=True)
    day1_attendance   = Column(Enum('정상', '참석', '후발', '불참', '미정'), nullable=True)
    day2_attendance   = Column(Enum('정상', '참석', '후발', '불참', '미정'), nullable=True)
    day3_attendance   = Column(Enum('정상', '참석', '후발', '불참', '미정'), nullable=True)
    day4_attendance   = Column(Enum('정상', '참석', '후발', '불참', '미정'), nullable=True)
    day1_bus          = Column(Text, nullable=True)
    day2_bus          = Column(Text, nullable=True)
    day3_bus          = Column(Text, nullable=True)
    day4_bus          = Column(Text, nullable=True)
    fee_type          = Column(Enum('bus', 'lodging_only'), nullable=True)
    is_fee_paid       = Column(SmallInteger, nullable=False, default=0)
    bus_created_at    = Column(DateTime, nullable=True)
    bus_updated_at    = Column(DateTime, nullable=True)


class SuspendedMealApplication(Base):
    __tablename__ = "suspended_meal_application"

    application_id      = Column(BigInteger, primary_key=True, autoincrement=True)
    retreat_custom_id   = Column(BigInteger, nullable=True)
    member_id           = Column(BigInteger, nullable=False)
    meal_count          = Column(SmallInteger, nullable=False, default=0)
    special_meal_count  = Column(SmallInteger, nullable=False, default=0)
    fee_support         = Column(SmallInteger, nullable=False, default=0)
    applicant_reason    = Column(String(500), nullable=True)
    applied_at          = Column(DateTime, nullable=False)
    review_status       = Column(Enum('PENDING', 'APPROVED', 'REJECTED'), nullable=False, default='PENDING')
    review_comment      = Column(String(500), nullable=True)
    reviewed_at         = Column(DateTime, nullable=True)


class PatientRoomApplication(Base):
    __tablename__ = "patient_room_application"

    application_id    = Column(BigInteger, primary_key=True, autoincrement=True)
    retreat_custom_id = Column(BigInteger, nullable=True)
    member_id         = Column(BigInteger, nullable=False)
    applicant_reason = Column(String(500), nullable=True)
    applied_at       = Column(DateTime, nullable=False)
    review_status    = Column(Enum('PENDING', 'APPROVED', 'REJECTED'), nullable=False, default='PENDING')
    review_comment   = Column(String(500), nullable=True)
    reviewed_at      = Column(DateTime, nullable=True)


class MemberOpinionReport(Base):
    # 소견서 본문 — 대상자(member) 당 report_year 별 1건
    __tablename__ = "member_opinion_report"

    opinion_report_id = Column(BigInteger, primary_key=True, autoincrement=True)

    member_id   = Column(BigInteger, nullable=False)   # 소견서 대상자
    report_year = Column(YEAR, nullable=False)          # 소견서 기준 연도

    current_status     = Column(String(100), nullable=True)  # 현재상태
    current_status_etc = Column(String(255), nullable=True)  # 현재상태 기타설명란

    group_meeting_attendance_status  = Column(String(255), nullable=True)  # 그룹모임 출석현황
    sunday_morning_attendance_status = Column(String(255), nullable=True)  # 주일낮예배 출석현황
    sunday_evening_attendance_status = Column(String(255), nullable=True)  # 주일저녁예배 출석현황

    next_year_plan     = Column(String(255), nullable=True)  # 다음년도 계획
    next_year_plan_etc = Column(String(255), nullable=True)  # 다음년도 계획 기타설명란

    general_opinion = Column(Text, nullable=True)  # 전체소견
    special_opinion = Column(Text, nullable=True)  # 특별소견

    created_at = Column(DateTime, nullable=False, default=now_kst)
    updated_at = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)


class MemberOpinionReportWriter(Base):
    # 소견서 실제 작성자 — 사용자 페이지 저장 시마다 UPSERT (관리자 대리 수정은 기록하지 않음)
    __tablename__ = "member_opinion_report_writer"

    id                 = Column(BigInteger, primary_key=True, autoincrement=True)
    opinion_report_id  = Column(BigInteger, nullable=False)
    writer_member_id   = Column(BigInteger, nullable=False)  # 로그인 토큰의 member_id
    first_written_at   = Column(DateTime, nullable=False, default=now_kst)
    last_written_at    = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)


class OpinionReportMapping(Base):
    # 임원단 간 소견서 작성자 배정 — 매년 수기 등록
    __tablename__ = "opinion_report_mapping"

    mapping_id       = Column(BigInteger, primary_key=True, autoincrement=True)
    report_year      = Column(YEAR, nullable=False)
    writer_member_id = Column(BigInteger, nullable=False)  # 소견서 작성자
    target_member_id = Column(BigInteger, nullable=False)  # 소견서 대상자
    created_at       = Column(DateTime, nullable=False, default=now_kst)
    updated_at       = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)


class TeamAssignmentCompanion(Base):
    # 동반배치 묶음 — (companion_no, member_id) 1쌍 = 1행. 한 사람은 한 묶음만 (uk_tac_member)
    __tablename__ = "team_assignment_companion"
    __table_args__ = (UniqueConstraint("target_year", "member_id", name="uk_tac_member"),)

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    target_year   = Column(YEAR, nullable=False)
    companion_no  = Column(SmallInteger, nullable=False)
    member_id     = Column(BigInteger, nullable=False)


class TeamAssignmentExclusion(Base):
    # 제외 명단 — 랜덤배치에서 빼고 교구·팀을 수기로 사전 지정 (uk_tae_member)
    __tablename__ = "team_assignment_exclusion"
    __table_args__ = (UniqueConstraint("target_year", "member_id", name="uk_tae_member"),)

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    target_year = Column(YEAR, nullable=False)
    member_id   = Column(BigInteger, nullable=False)
    gyogu       = Column(SmallInteger, nullable=False)  # 사전 배치 교구
    team        = Column(SmallInteger, nullable=False)  # 사전 배치 팀
    reason      = Column(String(100), nullable=True)    # 제외 사유
    created_at  = Column(DateTime, nullable=False, default=now_kst)
    updated_at  = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)


class TeamAssignmentRun(Base):
    # 팀배치 회차 — 기본 정보 + 진행 상태 (§3에서는 읽기 전용, §4에서 편집)
    __tablename__ = "team_assignment_run"
    __table_args__ = (UniqueConstraint("target_year", name="uk_tar_year"),)

    run_id           = Column(BigInteger, primary_key=True, autoincrement=True)
    target_year      = Column(YEAR, nullable=False)
    total_team_count = Column(SmallInteger, nullable=False, default=36)
    gyogu_count      = Column(SmallInteger, nullable=False, default=3)
    random_seed      = Column(Integer, nullable=True)
    status           = Column(Enum("draft", "assigned", "committed"), nullable=False, default="draft")
    assigned_at      = Column(DateTime, nullable=True)
    committed_at     = Column(DateTime, nullable=True)
    created_at       = Column(DateTime, nullable=False, default=now_kst)
    updated_at       = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)


class TeamAssignmentResult(Base):
    # 배치 결과 — 교적 이관(commit) 전 조정 대상 (§4)
    __tablename__ = "team_assignment_result"
    __table_args__ = (UniqueConstraint("target_year", "member_id", name="uk_tar_member"),)

    id           = Column(BigInteger, primary_key=True, autoincrement=True)
    target_year  = Column(YEAR, nullable=False)
    member_id    = Column(BigInteger, nullable=False)
    gyogu        = Column(SmallInteger, nullable=False)
    team         = Column(SmallInteger, nullable=False)
    group_no     = Column(SmallInteger, nullable=False, default=0)  # 항상 0 — 그룹은 내년 팀장이 배치
    companion_no = Column(SmallInteger, nullable=True)   # 동반배치 묶음 번호
    is_excluded  = Column(SmallInteger, nullable=False, default=0)  # 제외 명단으로 사전 배치된 행
    is_manual    = Column(SmallInteger, nullable=False, default=0)  # 수기로 팀을 옮긴 행
    created_at   = Column(DateTime, nullable=False, default=now_kst)
    updated_at   = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)


class OpinionReportCustom(Base):
    # 소견서 회차 설정 — §4-5 완료 처리에서 is_active/is_open을 0으로 내린다 (전체 설정 API는 §1, 별도 구현)
    __tablename__ = "opinion_report_custom"

    opinion_custom_id = Column(BigInteger, primary_key=True, autoincrement=True)
    report_year       = Column(YEAR, nullable=False)
    is_active         = Column(SmallInteger, nullable=False, default=1)
    is_open           = Column(SmallInteger, nullable=False, default=1)
    created_at        = Column(DateTime, nullable=False, default=now_kst)
    updated_at        = Column(DateTime, nullable=False, default=now_kst, onupdate=now_kst)
