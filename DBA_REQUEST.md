# DBA 변경 요청

> 안녕하세요. 운영 DB(`newsongj`) 스키마 변경 한 가지 부탁드리고 싶어 정리드립니다.
> 작업 가능하실 때 검토 후 진행 부탁드립니다.

---

## 요청 1. `member_profile.attendance_grade` enum에 `'E'` 추가

### 대상 컬럼
- 테이블: `member_profile`
- 컬럼: `attendance_grade`
- 현재 정의: `Enum('A', 'B', 'C', 'D')`, nullable
- 변경 후: `Enum('A', 'B', 'C', 'D', 'E')`, nullable



### 변경 SQL (예시)
```sql
ALTER TABLE member_profile
  MODIFY COLUMN attendance_grade ENUM('A', 'B', 'C', 'D', 'E') NULL;
```

### 영향 범위
- 기존 `'A'`/`'B'`/`'C'`/`'D'` 값에는 영향 없음 (enum 확장만)
- 기존 row의 데이터 마이그레이션 불필요
- 백엔드는 SQLAlchemy 모델(`backend/app/models/__init__.py:30`)을 동시 갱신 예정. **DB 변경이 먼저 적용된 후 백엔드 배포가 안전**합니다 (역순으로 하면 백엔드가 `'E'` 저장 시도 시 enum 위배로 실패할 수 있음)

### 진행 후 알려주실 사항
- 운영 DB에 적용 완료 시 한마디 주시면, 백엔드 모델/스키마/Alembic 갱신 PR 올리겠습니다.

---

## 참고
- 진행 중 추가 확인이 필요하시거나, 다른 환경(스테이징/로컬)에서 먼저 검증을 원하시면 편하게 말씀해주세요.
- 감사합니다.
