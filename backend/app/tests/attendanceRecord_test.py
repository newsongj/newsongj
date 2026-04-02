from fastapi import APIRouter
from sqlalchemy.orm import Session
from app.models import AttendanceRecord, Member, MemberProfile
from app.schemas.attendances import AttendanceRecord as RecordItem
from app.crud.AttendanceRecords import create_attendance_record
from app.core.database import SessionLocal
import datetime


# ── 헬퍼 ──────────────────────────────────────────────────────────────────────

def get_db() -> Session:
    return SessionLocal()


def create_test_members(db: Session, names: list[str]) -> list[int]:
    """테스트용 멤버 여럿 추가. 생성된 member_id 목록 반환."""
    ids = []
    for name in names:
        member = Member(
            name=name,
            gender="남",
            generation=1,
            enrolled_at=datetime.datetime.now(),
        )
        db.add(member)
        db.flush()
        ids.append(member.member_id)
    db.commit()
    print(f"[create_test_members] 추가됨: {list(zip(names, ids))}")
    return ids


def create_test_attendance(db: Session, member_ids: list[int], worship_date: datetime.date) -> list[AttendanceRecord | None]:
    """멤버 목록에 대해 출석 레코드 추가(또는 수정). 결과 레코드 목록 반환."""
    results = []
    for mid in member_ids:
        data = RecordItem(
            member_id=mid,
            status="PRESENT",
            absent_reason=None,
        )
        record = create_attendance_record(db, data, worship_date)
        results.append(record)
        if record:
            print(f"  [OK] member_id={mid} → attendance_id={record.attendance_id}, status={record.status}")
        else:
            print(f"  [FAIL] member_id={mid} → None 반환")
    return results


def delete_test_members(db: Session, member_ids: list[int]) -> None:
    """테스트 후 정리: 출석 기록 → 멤버 순으로 삭제."""
    db.query(AttendanceRecord).filter(AttendanceRecord.member_id.in_(member_ids)).delete(synchronize_session=False)
    db.query(Member).filter(Member.member_id.in_(member_ids)).delete(synchronize_session=False)
    db.commit()
    print(f"[cleanup] member_ids {member_ids} 삭제 완료")


# ── 테스트 ─────────────────────────────────────────────────────────────────────


def test_create_attendance(db: Session):
    """멤버 추가 → 출석 추가 → upsert 확인 → 정리"""
    worship_date = datetime.date(2026, 3, 30)
    names = ["테스트홍길동", "테스트이순신", "테스트강감찬"]

    try:
        # 1. 멤버 추가
        member_ids = create_test_members(db, names)

        # 2. 출석 추가
        print("\n--- 최초 출석 저장 ---")
        records = create_test_attendance(db, member_ids, worship_date)
        assert all(r is not None for r in records), "출석 저장 실패"

        # 3. 동일 날짜·멤버로 재저장 → upsert (수정) 확인
        print("\n--- 동일 날짜 재저장 (upsert) ---")
        for mid in member_ids:
            data = RecordItem(member_id=mid, status="ABSENT", absent_reason="개인일정")
            record = create_attendance_record(db, data, worship_date)
            assert record is not None
            assert record.status == "ABSENT", f"status가 ABSENT여야 함: {record.status}"
            print(f"  [upsert OK] member_id={mid}, status={record.status}, reason={record.absent_reason}")

        print("\n[PASS] test_create_attendance")

    finally:
        
        db.close()

