from sqlalchemy import Column, Integer, BigInteger, SmallInteger, String, Date, DateTime, Numeric, Enum, Text
from app.core.database import Base


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
    year             = Column(Date, nullable=False)
    member_type      = Column(Enum('토요예배', '주일예배', '래사랑', '군지체', '해외지체', '새가족'), nullable=False)
    attendance_rate  = Column(Numeric(5, 2), nullable=True)
    attendance_grade = Column(Enum('A', 'B', 'C', 'D'), nullable=True)
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


class AttendanceRecord(Base):
    __tablename__ = "attendance_record"

    attendance_id = Column(BigInteger, primary_key=True, autoincrement=True)
    worship_date  = Column(Date, nullable=False)
    member_id     = Column(BigInteger, nullable=False)
    gyogu         = Column(SmallInteger, nullable=False)
    team          = Column(SmallInteger, nullable=False)
    group_no      = Column(SmallInteger, nullable=False)
    status        = Column(Enum('PRESENT', 'ABSENT'), nullable=False, default='ABSENT')
    absent_reason = Column(Enum('학교/학원', '회사', '알바', '가족모임', '개인일정', '아픔', '기타'), nullable=True)
    checked_at    = Column(DateTime, nullable=False)
