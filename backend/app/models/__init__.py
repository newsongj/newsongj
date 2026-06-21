from sqlalchemy import Column, Integer, BigInteger, SmallInteger, String, Date, DateTime, Numeric, Enum, Text, Time
from app.core.database import Base


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
    enrolled_at    = Column(DateTime, nullable=True)
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
    bus_types            = Column(Text, nullable=True)   # JSON, 레거시
    meal_price           = Column(Integer, nullable=False, default=0)
    fee_with_bus         = Column(Integer, nullable=False, default=0)
    fee_without_bus      = Column(Integer, nullable=False, default=0)
    suspended_meal_count = Column(SmallInteger, nullable=False, default=0)
    is_active            = Column(SmallInteger, nullable=False, default=1)
    created_at           = Column(DateTime, nullable=True)
    updated_at           = Column(DateTime, nullable=True)


class BusCustom(Base):
    __tablename__ = "bus_custom"

    bus_id          = Column(BigInteger, primary_key=True, autoincrement=True)
    bus_name        = Column(String(100), nullable=False)
    seat_count      = Column(SmallInteger, nullable=False)
    departure_date  = Column(Date, nullable=False)
    departure_time  = Column(Time, nullable=False)
    departure_place = Column(String(100), nullable=False)
    arrival_place   = Column(String(100), nullable=False)


class AttendanceRecord(Base):
    __tablename__ = "attendance_record"

    attendance_id = Column(BigInteger, primary_key=True, autoincrement=True)
    worship_date  = Column(Date, nullable=False)
    member_id     = Column(BigInteger, nullable=False)
    status        = Column(Enum('PRESENT', 'ABSENT'), nullable=False, default='ABSENT')
    absent_reason = Column(Enum('학교/학원', '회사', '알바', '가족모임', '개인일정', '아픔', '기타'), nullable=True)
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
    note              = Column(String(255), nullable=True)
    meal_count        = Column(SmallInteger, nullable=False, default=0)
    fee_support       = Column(SmallInteger, nullable=False, default=0)
    bus_created_at    = Column(DateTime, nullable=True)
    bus_updated_at    = Column(DateTime, nullable=True)
    meal_created_at   = Column(DateTime, nullable=True)
    meal_updated_at   = Column(DateTime, nullable=True)


class SuspendedMealApplication(Base):
    __tablename__ = "suspended_meal_application"

    application_id   = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id        = Column(BigInteger, nullable=False)
    meal_count       = Column(SmallInteger, nullable=False, default=0)
    fee_support      = Column(SmallInteger, nullable=False, default=0)
    applicant_reason = Column(String(500), nullable=True)
    applied_at       = Column(DateTime, nullable=False)
    review_status    = Column(Enum('APPROVED', 'REJECTED'), nullable=True)
    review_comment   = Column(String(500), nullable=True)
    reviewed_at      = Column(DateTime, nullable=True)
