from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "user"

    member_id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    gender = Column(Enum("남", "여"), nullable=False)
    generation = Column(TINYINT(unsigned=True), nullable=False)
    phone_number = Column(String(13), unique=True, nullable=True)
    v8pid = Column(String(64), unique=True, nullable=True)
    birthdate = Column(Date, nullable=True)
    enrolled_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    deleted_reason = Column(String(255), nullable=True)

    profile = relationship("UserProfile", back_populates="user")
    attendance_records = relationship("AttendanceRecord", back_populates="user")


class UserProfile(Base):
    __tablename__ = "member_profile"

    profile_id = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id = Column(BigInteger, ForeignKey("user.member_id"), nullable=False)

    year = Column(Integer, unique=True, nullable=False)
    member_type = Column(
        Enum("토요예배", "주일예배", "래사랑", "군지체", "해외지체", "새가족"),
        nullable=False,
    )
    attendance_rate = Column(Numeric(5, 2), nullable=True)
    attendance_grade = Column(Enum("A", "B", "C", "D"), nullable=True)
    gyogu = Column(TINYINT(unsigned=True), nullable=False)
    team = Column(TINYINT(unsigned=True), nullable=False)
    group_no = Column(TINYINT(unsigned=True), nullable=False)
    leader = Column(String(100), nullable=True)
    plt_status = Column(Enum("수료", "1학기 수료"), nullable=True)

    user = relationship("User", back_populates="profile")


class Leader(Base):
    __tablename__ = "leader"

    leader_id = Column(TINYINT, primary_key=True, autoincrement=True, nullable=False)
    leader_name = Column(String(30), unique=True, nullable=False)
    display_order = Column(TINYINT, nullable=False, default=0)
    is_active = Column(TINYINT, nullable=False, default=1)


class AttendanceRecord(Base):
    __tablename__ = "attendance_record"
    __table_args__ = (
        UniqueConstraint("worship_date", "member_id", name="uk_attendance_worship_member"),
        Index("ix_attendance_member_date", "member_id", "worship_date"),
        Index("ix_attendance_date_status", "worship_date", "status"),
        Index("ix_attendance_date_org", "worship_date", "gyogu", "team", "group_no", "status"),
    )

    attendance_id = Column(BigInteger, primary_key=True, autoincrement=True)
    worship_date = Column(Date, nullable=False)
    member_id = Column(BigInteger, ForeignKey("user.member_id"), nullable=False)
    gyogu = Column(TINYINT(unsigned=True), nullable=False)
    team = Column(TINYINT(unsigned=True), nullable=False)
    group_no = Column(TINYINT(unsigned=True), nullable=False)
    status = Column(Enum("PRESENT", "ABSENT"), nullable=False, default="ABSENT")
    absent_reason = Column(
        Enum("학교/학원", "회사", "알바", "가족모임", "개인일정", "아픔", "기타"),
        nullable=True,
    )
    checked_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="attendance_records")
