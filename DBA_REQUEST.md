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

## 요청 2. 팀배치 신규 테이블 3개 생성

### 대상 테이블

**`team_assignment_run`** — 팀배치 회차, 연도당 1행
| 컬럼 | 타입 | 제약 |
|---|---|---|
| run_id | BIGINT | PK, AUTO_INCREMENT |
| target_year | YEAR | NOT NULL, UNIQUE |
| total_team_count | SMALLINT | NOT NULL, DEFAULT 36 |
| gyogu_count | SMALLINT | NOT NULL, DEFAULT 3 |
| random_seed | INT | NULL |
| status | ENUM('draft','assigned','committed') | NOT NULL, DEFAULT 'draft' |
| assigned_at | DATETIME | NULL |
| committed_at | DATETIME | NULL |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

**`team_assignment_companion`** — 동반배치 묶음, (companion_no, member_id) 1쌍 = 1행
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT |
| target_year | YEAR | NOT NULL |
| companion_no | SMALLINT | NOT NULL |
| member_id | BIGINT | NOT NULL |

**`team_assignment_result`** — 배치 결과 임시 테이블, 확정 전까지 조정하다 커밋 시 `member_profile`로 이관
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT |
| target_year | YEAR | NOT NULL |
| member_id | BIGINT | NOT NULL |
| gyogu | SMALLINT | NOT NULL |
| team | SMALLINT | NOT NULL |
| group_no | SMALLINT | NOT NULL, DEFAULT 0 |
| companion_no | SMALLINT | NULL |
| is_manual | SMALLINT | NOT NULL, DEFAULT 0 |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

### 변경 SQL (예시)
```sql
CREATE TABLE team_assignment_run (
  run_id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_year       YEAR NOT NULL UNIQUE,
  total_team_count  SMALLINT NOT NULL DEFAULT 36,
  gyogu_count       SMALLINT NOT NULL DEFAULT 3,
  random_seed       INT NULL,
  status            ENUM('draft', 'assigned', 'committed') NOT NULL DEFAULT 'draft',
  assigned_at       DATETIME NULL,
  committed_at      DATETIME NULL,
  created_at        DATETIME NOT NULL,
  updated_at        DATETIME NOT NULL
);

CREATE TABLE team_assignment_companion (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_year   YEAR NOT NULL,
  companion_no  SMALLINT NOT NULL,
  member_id     BIGINT NOT NULL
);

CREATE TABLE team_assignment_result (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_year   YEAR NOT NULL,
  member_id     BIGINT NOT NULL,
  gyogu         SMALLINT NOT NULL,
  team          SMALLINT NOT NULL,
  group_no      SMALLINT NOT NULL DEFAULT 0,
  companion_no  SMALLINT NULL,
  is_manual     SMALLINT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL,
  updated_at    DATETIME NOT NULL
);
```

### 영향 범위
- 신규 테이블 3개 생성 — 기존 테이블/데이터에는 영향 없음
- `(target_year, member_id)` 유니크 제약은 DB 레벨에 걸지 않음 — 이 프로젝트의 다른 테이블들처럼 앱(백엔드) 레벨에서 "해당 연도 전체 삭제 후 재삽입" 방식으로 정합성을 관리함
- 백엔드는 SQLAlchemy 모델(`backend/app/models/__init__.py`)에 이미 동일 정의를 추가해둔 상태 — **DB 변경이 먼저 적용된 후 백엔드 배포가 안전**합니다 (역순으로 하면 배치 실행/확정 시 테이블 없음 오류가 날 수 있음)

### 진행 후 알려주실 사항
- 운영 DB에 적용 완료 시 한마디 주시면, 배포 순서 맞춰 진행하겠습니다.

---

## 참고
- 진행 중 추가 확인이 필요하시거나, 다른 환경(스테이징/로컬)에서 먼저 검증을 원하시면 편하게 말씀해주세요.
- 감사합니다.
