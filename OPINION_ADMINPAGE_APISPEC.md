# 소견서 — 관리자 페이지 API 명세

이 문서는 **소견서 관리자 페이지**의 백엔드 API 스펙이다.
응답 shape·쿼리 파라미터·필드 키를 그대로 맞추면 프론트는 `frontend/src/api/opinion.ts`의
각 함수 본문만 교체하여 바로 연결된다.

> **사용자 페이지 명세는 `OPINION_USERPAGE_APISPEC.md`** 다 (별도 문서).

기준 파일:
- `frontend/src/apps/pages/OpinionSettingsPage.tsx` (소견서 설정)
- `frontend/src/apps/pages/OpinionDashboardPage.tsx` (소견서 현황 대시보드 + 입력 명단)
- `frontend/src/apps/pages/OpinionReportPrint.tsx` (PDF 인쇄 레이아웃)
- `frontend/src/apps/pages/PreAssignmentPage.tsx` (팀배치 사전 설정)
- `frontend/src/apps/pages/TeamAssignmentPage.tsx` (팀배치 작업)
- `frontend/src/models/opinion.types.ts`, `teamAssignment.types.ts`
- `frontend/src/api/opinion.ts`, `teamAssignment.ts` ← **현재 목데이터. 백엔드 구현 후 주석 처리된 `get`/`put` 호출로 교체**

기존 데스크톱 도구 (루트) — 웹으로 옮기기 전 원본이다. 결과를 대조할 때 참고한다.

| 파일 | 대응 |
|------|------|
| `팀배치_1번모듈.py` | **팀배치 알고리즘** → §4-2 · `api/teamAssignment.ts` |
| `팀배치_2번모듈.py` | **소견서 A4 출력** (1인 1장 서식) → §2 PDF · `OpinionReportPrint.tsx` |

관련 화면 문서: `frontend/md/14_opinion_settings.md`, `15_opinion_dashboard.md`,
`16_team_assignment.md`, `17_pre_assignment.md`
전체 작업 현황: `opinion_todo.md`

---

## 0. 공통 — 네 화면 모두에 해당

이 장은 **네 화면이 똑같이 따르는 규칙**이다. 화면별 문서로 쪼갤 때는 이 장을
각 문서에 그대로 복제하고, 아래 §1~§4 중 해당 화면 장만 남기면 된다.

| 장 | 화면 | 라우트 |
|----|------|--------|
| §1 | 소견서 설정 | `/opinion/settings` |
| §2 | 소견서 현황 대시보드 | `/opinion/dashboard` |
| §3 | 팀배치 사전 설정 | `/opinion/pre-assignment` |
| §4 | 팀배치 작업 | `/opinion/team-assignment` |

### 0-0. [공통] 담당이 갈려도 반드시 동일하게 구현할 것

화면을 나눠 맡더라도 아래 7개는 **구현이 일치해야 한다.** 한쪽만 다르게 만들면
같은 데이터가 화면마다 다르게 보이거나, 저장이 서로를 덮어쓴다.

| # | 항목 | 규칙 | 근거 |
|---|------|------|------|
| 1 | **연도 스냅샷 조회** | `member_profile` 에서 `updated_at <= '{report_year}-12-31'` 중 최신, 동일 날짜면 `profile_id` 큰 것 | §2-1 |
| 2 | **낙관적 잠금** | 조건을 UPDATE 문에 넣고 `affected_rows = 0` 이면 **409**. 응답에 `current_updated_at` · `last_writer` · `is_self` 포함 | §0-4 |
| 3 | **`updated_at` 정밀도** | `DATETIME(3)`. **미적용 — 누가 먼저 하든 한 번만** ALTER | §0-4-2 |
| 4 | **삭제 멤버** | `member.deleted_at` 은 명단에 **표시하되 집계에서 제외**. 배치 대상에서도 제외 | §2-1 · §4-2 |
| 5 | **항목 키 목록** | 교적 15개 / 입력 9개. 이 목록이 유일한 기준이며 §2 는 이 키를 그대로 렌더·검증한다 | §1-1 |
| 6 | **단답 7개 길이** | **각 20자** (DB 는 `VARCHAR(100)`/`(255)` 지만 더 좁게 막는다). 선택지 문구도 동일 | §2-2 · §1-2 |
| 7 | **회차를 닫는 주체** | `is_active` · `is_open` 을 0으로 내리는 것은 **팀배치 `commit`**. 설정 화면은 읽어서 잠그기만 한다 | §4-5 |

> 3번과 7번이 특히 어긋나기 쉽다.
> **3번** — `DATETIME` 초 단위로 두면 같은 초에 저장한 두 사람이 잠금을 통과한다.
> **7번** — 설정 화면 담당이 직접 플래그를 내리면 팀배치와 이중으로 닫힌다.

---

### 0-1. 페이지 · 권한키

| 페이지 | 라우트 | 사용 API |
|--------|--------|---------|
| 소견서 설정 | `/opinion/settings` (관리자) | `GET/PUT /api/opinion/settings`, `GET /api/opinion/mappings`, `GET /api/opinion/members` |
| 소견서 현황 대시보드 | `/opinion/dashboard` (관리자) | `GET /api/opinion/settings`, `GET /api/opinion/members`, `GET /api/opinion/reports`, `PUT /api/opinion/reports/:memberId` |
| 팀배치 사전 설정 | `/opinion/pre-assignment` (관리자) | `§3` 참고 |
| 팀배치 작업 | `/opinion/team-assignment` (관리자) | `§4` 참고 |
| 소견서 작성 (사용자) | `/opinion` (미구현) | **`OPINION_USERPAGE_APISPEC.md`** 참고 |

사이드바 순서: 소견서 설정 → 소견서 현황 대시보드 → 팀배치 사전 설정 → 팀배치 작업

#### 권한키

`backend/app/schemas/authority.py`에 추가 완료.

| 키 | 라벨 | 그룹 |
|----|------|------|
| `admin.opinion.dashboard` | 소견서 현황 대시보드 | 소견서 |
| `admin.opinion.settings` | 소견서 설정 | 소견서 |
| `admin.opinion.pre_assignment` | 팀배치 사전 설정 | 소견서 |
| `admin.opinion.team_assignment` | 팀배치 작업 | 소견서 |
| `user.opinion` | 소견서 | 사용자 |

---

### 0-2. DDL — 소견서 4테이블

#### `member_opinion_report` — 소견서 본문 (제공받은 DDL)

```sql
CREATE TABLE member_opinion_report (
  opinion_report_id BIGINT NOT NULL AUTO_INCREMENT,

  member_id BIGINT NOT NULL COMMENT '회원 ID',
  report_year YEAR NOT NULL COMMENT '소견서 기준 연도',

  current_status VARCHAR(100) NULL COMMENT '현재상태',
  current_status_etc VARCHAR(255) NULL COMMENT '현재상태 기타설명란',

  group_meeting_attendance_status VARCHAR(255) NULL COMMENT '그룹모임 출석현황',
  sunday_morning_attendance_status VARCHAR(255) NULL COMMENT '주일낮예배 출석현황',
  sunday_evening_attendance_status VARCHAR(255) NULL COMMENT '주일저녁예배 출석현황',

  next_year_plan VARCHAR(255) NULL COMMENT '다음년도 계획',
  next_year_plan_etc VARCHAR(255) NULL COMMENT '다음년도 계획 기타설명란',

  general_opinion TEXT NULL COMMENT '전체소견',
  special_opinion TEXT NULL COMMENT '특별소견',

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시각',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시각',

  PRIMARY KEY (opinion_report_id),
  UNIQUE KEY uk_member_opinion_report_member_year (member_id, report_year),
  KEY ix_member_opinion_report_member_id (member_id),
  KEY ix_member_opinion_report_report_year (report_year),
  CONSTRAINT fk_member_opinion_report_member
    FOREIGN KEY (member_id) REFERENCES member(member_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `member_opinion_report_writer` — 실제 작성자 기록

**실제로 작성한 사람**을 기록한다. 사용자 페이지에서 저장할 때마다 UPSERT 한다.

한 소견서를 팀장과 그룹장이 나눠 쓰므로 컬럼 하나로는 부족하다 — 마지막 사람만
남아 앞사람 기여가 사라진다. 그래서 별도 테이블을 둔다.

```sql
CREATE TABLE member_opinion_report_writer (
  id                BIGINT NOT NULL AUTO_INCREMENT,
  opinion_report_id BIGINT NOT NULL,
  writer_member_id  BIGINT NOT NULL COMMENT '실제 저장한 사람 — 로그인 토큰의 member_id',
  first_written_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_written_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_morw (opinion_report_id, writer_member_id),
  KEY ix_morw_writer (writer_member_id),
  CONSTRAINT fk_morw_report FOREIGN KEY (opinion_report_id)
    REFERENCES member_opinion_report(opinion_report_id) ON DELETE CASCADE,
  CONSTRAINT fk_morw_member FOREIGN KEY (writer_member_id)
    REFERENCES member(member_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='소견서 실제 작성자 — 사용자 페이지 저장 시마다 UPSERT';
```

**기록 시점** — 사용자 페이지 저장(`PUT /api/opinion/my-reports/:memberId`) 트랜잭션 안에서

```sql
INSERT INTO member_opinion_report_writer (opinion_report_id, writer_member_id)
VALUES (:report_id, :login_member_id)
ON DUPLICATE KEY UPDATE last_written_at = CURRENT_TIMESTAMP;
```

- `writer_member_id` 는 **로그인 토큰의 `member_id`** 를 그대로 쓴다
  (`core/security.py:19`). 이름·전화번호로 다시 대조하지 않는다 — 동명이인과
  전화번호 변경에 취약하고, 로그인 시점에 이미 확정된 값이기 때문이다
- **관리자의 대리 수정은 기록하지 않는다.** 관리자 대시보드의
  `PUT /api/opinion/reports/:memberId` 는 이 테이블을 건드리지 않는다 —
  대리 수정이지 작성이 아니다
- 직분(`role`)은 저장하지 않는다. 조회 시 해당 `report_year` 의 `member_profile`
  스냅샷에서 뽑는다 — 연도 스냅샷이 이미 고정값이라 중복 보관할 이유가 없다

#### `opinion_report_custom` — 회차 설정

`member_opinion_report`는 소견서 **내용**만 담는다. 회차 설정은 이 테이블이 담당한다.

현재 컬럼:

```
opinion_custom_id  bigint      report_year     year
start_date         date        end_date        date
guide_text         varchar(500)
member_fields      text        input_fields    text
is_active          tinyint(1)
status_options     text        plan_options    text     ← 선택지 드롭박스용 (§5-1)
created_at / updated_at  datetime
```

`theme`(VARCHAR(200)) · `is_open`(TINYINT(1)) 도 **추가 완료**되었다.

| 컬럼 | 역할 |
|------|------|
| `is_active` | 회차 진행 상태. `0` = 완료 → **설정 화면이 읽기 전용**이 된다 |
| `is_open` | 사용자 작성 페이지 공개 여부. 수련회의 `is_research_open` 계열과 같은 역할 |

둘은 목적이 다르다. `is_active`는 **관리자 설정 잠금**, `is_open`은 **사용자 화면 개폐**다.
팀배치 완료 시 서버가 **둘 다 0으로** 내린다 (§4-5).

`member_fields` / `input_fields`는 `bus_custom`의 JSON 컬럼과 동일한 방식(문자열 배열)으로 저장한다.

> **`theme`과 `guide_text`는 쓰이는 곳이 다르다.**
> `theme`(주제/표어)은 **PDF 머리말 + 사용자 작성 화면 상단**,
> `guide_text`(작성자 안내 문구)는 **사용자 작성 화면 상단에만** 들어간다.
> `guide_text`는 PDF에 넣지 않는다.

#### `opinion_report_mapping` — 임원단 매핑

임원단 작성 배정. **하나의 매핑 = 작성자 1명 : 대상자 N명.**
행 1개 = `(작성자, 대상자)` 1쌍이며, UI에서는 작성자 기준으로 묶어 한 줄로 보여준다.

```sql
CREATE TABLE opinion_report_mapping (
  mapping_id       BIGINT NOT NULL AUTO_INCREMENT,
  report_year      YEAR NOT NULL,
  writer_member_id BIGINT NOT NULL COMMENT '소견서 작성자 (임원단)',
  target_member_id BIGINT NOT NULL COMMENT '소견서 대상자',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (mapping_id),
  UNIQUE KEY uk_opinion_mapping (report_year, writer_member_id, target_member_id),
  KEY ix_opinion_mapping_writer (report_year, writer_member_id),
  KEY ix_opinion_mapping_target (report_year, target_member_id),
  CONSTRAINT fk_opinion_mapping_writer
    FOREIGN KEY (writer_member_id) REFERENCES member(member_id),
  CONSTRAINT fk_opinion_mapping_target
    FOREIGN KEY (target_member_id) REFERENCES member(member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**예시** — 회장이 국장 3명을 담당

```
(2026, 회장_id, 국장A_id)
(2026, 회장_id, 국장B_id)
(2026, 회장_id, 총무_id)
```

**인덱스 둘 다 UNIQUE가 아니다.**

- `ix_opinion_mapping_writer` — 한 작성자가 여러 대상자를 맡는다 (1:N의 N)
- `ix_opinion_mapping_target` — 한 대상자에 **임원단 작성자가 여럿** 붙을 수 있다
  (예: 부회장 한 명을 회장과 다른 임원이 함께 작성)

`writer_member_id = target_member_id` 인 행은 **애플리케이션에서 막는다**
(자기 소견서를 자기가 쓸 수 없다). MariaDB `CHECK` 로 강제해도 된다.

소견서는 `member_opinion_report` 의 `(member_id, report_year)` 유니크라 대상자당 **1건**이고,
작성자가 여럿이면 같은 건을 나눠 수정한다 (§5-5 · 낙관적 잠금 필수).

**직분 컬럼을 두지 않는 이유**: 회장·부회장·국장 같은 세부 직분은 `leader` 테이블에 등록하지 않는다.
임원단 조직은 매년 달라지므로 **사람 대 사람**으로 직접 지정한다.
후보는 `leader` 의 **「임원단」 직분 보유자로 한정**하며, 그 외 직분(그룹장·팀장)은 매핑 화면에 노출하지 않는다.

---

### 0-3. DDL — 팀배치 4테이블 (전부 생성 완료)

**네 테이블 모두 `target_year` 단위 작업(temp) 테이블**이다 — `member_profile`로
이관(`commit`)하면 역할이 끝난다. 성격은 둘로 갈린다.

| 테이블 | 성격 | 채우는 주체 |
|--------|------|-------------|
| `team_assignment_run` | 회차 메타 | 팀배치 작업 화면 |
| `team_assignment_exclusion` | 배치 **입력** | 팀배치 사전 설정 화면 (사람이 지정) |
| `team_assignment_companion` | 배치 **입력** | 팀배치 사전 설정 화면 (사람이 지정) |
| `team_assignment_result` | 배치 **출력** | 알고리즘 + 수기 조정 |

> 이관 후에도 **삭제하지 않고 보존**한다. `target_year`로 구분되므로 쌓여도
> 충돌하지 않고, 「작년에 왜 이렇게 배치됐나」를 되짚을 유일한 근거다.

기존 세 테이블은 이미 생성되어 있다. **실제 스키마는 아래와 같으며, 초기 설계에서 두 가지가 달라졌다.**

| 초기 설계 | 실제 |
|-----------|------|
| `team_assignment_temp` | **`team_assignment_result`** (PK도 `temp_id` → `id`) |
| `..._temp.member_type` 컬럼 | **없음** → 커밋 시 **직전 프로필에서 승계**한다 (§4-5) |

```sql
-- 회차: 기본 정보 + 진행 상태
CREATE TABLE team_assignment_run (
  run_id BIGINT NOT NULL AUTO_INCREMENT,
  target_year      YEAR NOT NULL COMMENT '배치 대상 연도 (2027)',
  total_team_count SMALLINT NOT NULL DEFAULT 36 COMMENT '총 팀 수',
  gyogu_count      TINYINT NOT NULL DEFAULT 3 COMMENT '교구 수',
  random_seed      INT NULL COMMENT '셔플 시드 — 같은 결과 재현용',
  status ENUM('draft','assigned','committed') NOT NULL DEFAULT 'draft',
  assigned_at  DATETIME NULL,
  committed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id),
  UNIQUE KEY uk_tar_year (target_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 동반배치 묶음: 같은 companion_no = 같은 팀
CREATE TABLE team_assignment_companion (
  id           BIGINT NOT NULL AUTO_INCREMENT,
  target_year  YEAR NOT NULL,
  companion_no SMALLINT NOT NULL COMMENT '묶음 번호',
  member_id    BIGINT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 제외 명단: 랜덤배치에서 빼고 교구·팀을 수기로 사전 지정
CREATE TABLE team_assignment_exclusion (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  target_year YEAR NOT NULL,
  member_id   BIGINT NOT NULL,
  gyogu       SMALLINT NOT NULL COMMENT '사전 배치 교구',
  team        SMALLINT NOT NULL COMMENT '사전 배치 팀',
  reason      VARCHAR(100) NULL COMMENT '제외 사유 — 임원단 사전배치 / 팀장 사전배치 등',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tae_member (target_year, member_id),
  KEY ix_tae_team (target_year, gyogu, team)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 배치 결과: 교적 이관 전 조정 대상
CREATE TABLE team_assignment_result (
  id           BIGINT NOT NULL AUTO_INCREMENT,
  target_year  YEAR NOT NULL,
  member_id    BIGINT NOT NULL,
  gyogu        SMALLINT NOT NULL,
  team         SMALLINT NOT NULL,
  group_no     SMALLINT NOT NULL COMMENT '항상 0 — 그룹은 내년 팀장이 배치',
  companion_no SMALLINT NULL COMMENT '동반배치 묶음 번호',
  is_excluded  SMALLINT NOT NULL DEFAULT 0 COMMENT '제외 명단으로 사전 배치된 행',
  is_manual    SMALLINT NOT NULL DEFAULT 0 COMMENT '수기로 팀을 옮긴 행',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **중복 방지 인덱스 — 적용 완료.** 배치를 다시 실행해도 행이 두 벌 쌓이지 않는다.
>
> ```
> team_assignment_result     uk_tar_member (target_year, member_id)   UNIQUE
>                            ix_tar_team   (target_year, gyogu, team)
> team_assignment_companion  uk_tac_member (target_year, member_id)   UNIQUE  -- 한 사람은 한 묶음만
> ```

`team_assignment_result.is_excluded` 컬럼도 **추가 완료**되었다.

**제외 명단 ↔ 동반배치는 배타다.** 한 사람이 양쪽에 동시에 들어갈 수 없다
(제외자는 랜덤배치에 참여하지 않으므로 묶음이 의미가 없다).
프론트는 양쪽 후보 목록에서 서로를 빼고, 서버도 `PUT` 시 교차 검증해 400으로 거절해야 한다.

### 0-4. 동시 편집 — 여러 계정 · 여러 탭

소견서는 **한 건을 여러 사람이 나눠 쓴다.** 팀장과 그룹장이 같은 팀원을 동시에 열고
있는 상황이 정상이며, 한 사람이 여러 탭을 띄워 두기도 한다. 그냥 두면 나중에 저장한
쪽이 앞사람 내용을 통째로 덮어쓴다.

```
09:00  그룹장이 김민준 소견서를 엶        → 화면에 "성실히 참여함"
09:10  팀장이 같은 건을 열어 크게 고쳐 저장  → DB 갱신
09:15  그룹장이 09:00 시점 화면으로 저장    → 팀장 작업이 조용히 사라짐
```

#### 0-4-1. 낙관적 잠금 — 조건부 UPDATE

조회 때 받은 `updated_at` 을 `base_updated_at` 으로 실어 보내고, 서버는 **그 값이
여전히 유효할 때만** 쓴다. 읽고-비교하고-쓰는 세 단계로 나누면 그 사이에 끼어들 수
있으므로, **조건을 UPDATE 문 자체에 넣는다.**

```sql
UPDATE member_opinion_report
   SET current_status = :current_status, /* … */
       updated_at = CURRENT_TIMESTAMP(3)
 WHERE opinion_report_id = :id
   AND updated_at = :base_updated_at;      -- ← 조건을 쿼리에 넣는다
```

`affected_rows = 0` 이면 그 사이 누군가 저장한 것이므로 **409**.

- `SELECT … FOR UPDATE` 로 잠근 뒤 검사해도 되지만, 사용자가 타이핑하는 동안
  트랜잭션을 열어두는 구조가 아니라 조건부 UPDATE 로 충분하다
- **신규 작성**(`base_updated_at = null`)은 `INSERT` 로 간다. 두 사람이 동시에
  처음 저장하면 `UNIQUE (member_id, report_year)` 가 두 번째를 막는다 →
  중복 키 오류를 잡아 **409** 로 변환한다 (500 이 아니다)
- 작성자 기록(`member_opinion_report_writer`)은 같은 트랜잭션 안에서 UPSERT 한다.
  `UNIQUE (opinion_report_id, writer_member_id)` 라 재시도해도 안전하다

#### 0-4-2. ⚠️ `updated_at` 정밀도 — **DATETIME(3) 필요**

`DATETIME` 은 **초 단위**다. 두 사람이 같은 초에 저장하면 `base_updated_at` 비교가
통과해 버려 낙관적 잠금이 그대로 뚫린다. 동시 편집이 잦은 화면이라 실제로 일어날 수 있다.

```sql
ALTER TABLE member_opinion_report
  MODIFY updated_at DATETIME(3) NOT NULL
    DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '수정 시각',
  MODIFY created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '생성 시각';
```

응답의 `updated_at` 은 밀리초까지 내려간다 (`2026-11-05T14:20:31.482`).
프론트는 이 값을 **그대로 되돌려 보내기만** 하므로 파싱 규칙을 바꿀 필요는 없다.

> 더 엄격하게 가려면 `row_version INT` 를 두고 저장할 때마다 +1 하는 방법도 있다.
> 시간 값에 의존하지 않아 이론적으로 완전하지만, 작성자가 2명 안팎이고 사람이
> 타이핑하는 속도라 밀리초 정밀도로 충분하다고 보고 DATETIME(3) 을 택했다.

#### 0-4-3. 409 응답 — 누가 저장했는지 알려준다

「다른 사람이 고쳤다」와 「내 다른 탭에서 고쳤다」는 사용자가 받아들이는 방식이
완전히 다르다. 서버가 구분해 준다.

```json
{
  "detail": "conflict",
  "current_updated_at": "2026-11-05T14:21:02.117",
  "last_writer": { "member_id": 5, "name": "이서연", "role": "그룹장" },
  "is_self": false
}
```

| 필드 | 용도 |
|------|------|
| `current_updated_at` | 클라이언트가 재조회 없이 곧바로 다음 저장의 기준으로 쓸 수 있다 |
| `last_writer` | `member_opinion_report_writer` 에서 `last_written_at` 이 가장 최근인 행 |
| `is_self` | `last_writer.member_id == 로그인 member_id` — 같은 계정의 다른 탭 |

클라이언트 문구

```
is_self = false →  이서연 님이 방금 저장했습니다. 최신 내용을 불러왔습니다.
is_self = true  →  다른 탭에서 저장된 내용입니다. 최신 내용을 불러왔습니다.
```

**409 를 받아도 모달을 닫지 않는다.** 닫으면 방금 쓴 내용을 전부 잃는다.
최신 내용만 다시 읽어 채우고 편집 상태를 유지한다.

#### 0-4-4. 같은 브라우저의 여러 탭

같은 계정으로 탭을 여러 개 띄우면 서버 입장에서는 남남과 다를 게 없다 —
위 낙관적 잠금이 그대로 동작한다. 다만 **같은 브라우저 안에서는 서버를 거치지 않고
바로 알려줄 수 있다.**

```ts
// 저장 성공 직후
new BroadcastChannel('opinion').postMessage({
  type: 'saved', member_id, report_year, updated_at,
});
```

받는 탭은 같은 소견서를 열고 있으면 **저장을 시도하기 전에** 안내한다.
409 가 나기를 기다리지 않아도 되므로 헛수고를 줄인다.

- `BroadcastChannel` 미지원 브라우저에서는 무시해도 된다. 서버 쪽 낙관적 잠금이
  여전히 최종 방어선이므로 **이것은 편의 기능이지 정합성 장치가 아니다**
- 명단 화면끼리도 같은 채널로 갱신 신호를 주고받아 「작성 완료」 배지를 맞출 수 있다

#### 0-4-5. 명단 화면이 오래 열려 있을 때

대시보드를 띄워 둔 채 다른 사람이 계속 저장하면 화면이 낡는다. 폴링은 넣지 않는다 —
2천 행 규모를 주기적으로 다시 읽을 이유가 없다.

- 탭이 다시 포커스를 받을 때(`visibilitychange`) 재조회
- 저장·409 직후 재조회
- `BroadcastChannel` 신호 수신 시 재조회

#### 0-4-6. 관리자 화면도 같은 규칙

관리자 대시보드의 `PUT /api/opinion/reports/:memberId` 도 **동일하게**
`base_updated_at` 을 받고 409 를 낸다. 관리자라고 덮어쓰기를 허용하면
사용자가 쓰던 내용이 사라진다.

차이는 하나뿐이다 — 관리자 저장은 `member_opinion_report_writer` 를 건드리지 않는다
(§0-2). 따라서 관리자가 저장해도 `last_writer` 는 바뀌지 않는다.

---

## 1. 소견서 설정 (`/opinion/settings`)

| | |
|---|---|
| 권한키 | `admin.opinion.settings` |
| 화면 문서 | `frontend/md/14_opinion_settings.md` |
| 쓰는 테이블 | `opinion_report_custom`, `opinion_report_mapping` |

### 1-1. 설정 조회

`GET /api/opinion/settings?report_year=2026`

해당 연도 설정이 없으면 **404가 아니라 기본값을 반환**한다 (신규 연도 진입 시 화면이 빈 폼으로 뜨게).

```json
{
  "report_year": 2026,
  "exists": true,
  "is_active": true,
  "is_open": true,
  "theme": "하나님의 열심이 이루시리라",
  "start_date": "2026-11-01",
  "end_date": "2026-12-15",
  "guide_text": "담당 지체 한 분 한 분을 떠올리며 사실에 근거해 작성해 주세요.",
  "member_fields": ["name", "gender", "generation", "gyogu", "team", "group_no", "member_type", "leader_names", "attendance_grade"],
  "input_fields": ["current_status", "current_status_etc", "group_meeting_attendance_status", "sunday_morning_attendance_status", "sunday_evening_attendance_status", "next_year_plan", "next_year_plan_etc", "general_opinion", "special_opinion"]
}
```

#### 회차 상태 (`exists` / `is_active`)

설정 화면은 이 두 값으로 3상태를 구분한다.

| 상태 | `exists` | `is_active` | 화면 |
|------|----------|-------------|------|
| 미생성 | `false` | — | 빈 폼 + 「소견서 생성」 |
| 진행 중 | `true` | `true` | 수정 가능 + 「소견서 설정 저장」 |
| 완료 | `true` | `false` | **전체 읽기 전용** |

설정이 없는 연도는 `exists: false`와 함께 기본값을 채워 반환한다 (404 아님).

**연도를 바꾸면 그 연도의 상태가 그대로 나온다.**
현재 진행 중인 연도는 `진행 중`, 팀배치에서 소견서 완료 처리가 끝난 연도는 `완료`로 표시된다.

> **완료 전환은 이 API가 하지 않는다.** `is_active`는 **팀배치 완료 시** 서버가 0으로 내린다 (§4-5).
> 소견서 설정 화면에는 완료 버튼이 없다 — 상태를 읽어 잠그기만 한다.

#### 사용자 페이지 공개 (`is_open`)

`is_active`(관리자 설정 잠금)와 **별개**로, 사용자 작성 화면의 개폐를 따로 제어한다.
수련회 설정 수정 화면의 `is_research_open` 계열과 같은 방식이다.

| 경로 | 동작 |
|------|------|
| 설정 화면 「사용자 페이지 공개 설정」 토글 | 관리자가 직접 열고 닫는다 |
| 팀배치 소견서 완료 | 서버가 `is_active = 0`, `is_open = 0` 을 **함께** 내린다 |

**사용자 작성 화면이 열리는 조건**

```
exists && is_active && is_open
```

하나라도 false면 화면은 **「소견서 기간이 아닙니다」만 표시**한다 (`OPINION_USERPAGE_APISPEC.md` §2-5).
서버도 `my-targets` / `my-reports` 에서 같은 조건을 검사해 **403**으로 막아야 한다 —
프론트만 막으면 우회할 수 있다.

#### 필드별 소비처 — 어디에 쓰이는지

설정값이 여러 화면으로 흩어져 소비된다. 혼동하기 쉬워 정리해 둔다.

| 필드 | 소비처 |
|------|--------|
| `report_year` | 회차 식별. 모든 조회의 기준 |
| `start_date` | 작성 가능 시작일 |
| `end_date` | **사용자 작성 화면의 D-day** — 오늘로부터 남은 일수 (`OPINION_USERPAGE_APISPEC.md` §2-1) |
| `theme` | **① PDF 머리말** + **② 사용자 작성 화면 상단 주제** (수련회 인원조사 화면처럼 표어를 띄우는 자리) |
| `guide_text` | **사용자 작성 화면 안내 문구** (PDF에는 넣지 않는다) |
| `member_fields` | **① 사용자 작성 화면에 보여줄 교적 항목** + **② 현황 대시보드 상세 모달** + **③ PDF 교적 정보** |
| `input_fields` | **① 사용자 작성 화면의 입력 폼** + **② 현황 대시보드 상세 편집** + **③ PDF 소견 내용** |

즉 `member_fields` / `input_fields` 를 켜고 끄는 것만으로 **세 화면(사용자 작성 · 관리자 상세 · PDF)의
표시 항목이 한꺼번에 바뀐다.** 세 곳이 각자 하드코딩하지 않고 이 설정을 따라야 한다.

#### `member_fields` 허용 키 (15개)

`member` + `member_profile` 에서 가져올 수 있는 정보 중 소견서에 쓸 만한 항목이다.
작성자가 입력하는 값이 아니라 **교적에서 읽어와 자동으로 채워지는 값**이다.

| 키 | 라벨 | 출처 |
|----|------|------|
| `name` | 이름 | `member.name` |
| `gender` | 성별 | `member.gender` |
| `generation` | 기수 | `member.generation` |
| `birthdate` | 생년월일 | `member.birthdate` |
| `phone_number` | 연락처 | `member.phone_number` |
| `gyogu` | 교구 | `member_profile.gyogu` |
| `team` | 팀 | `member_profile.team` |
| `group_no` | 그룹 | `member_profile.group_no` |
| `member_type` | 구분 | `member_profile.member_type` |
| `leader_names` | 직분 | `member_profile.leader_ids` → `leader.leader_name` |
| `attendance_grade` | 출석등급 | `member_profile.attendance_grade` |
| `attendance_rate` | 출석률 | `member_profile.attendance_rate` |
| `plt_status` | PLT 수료 | `member_profile.plt_status` |
| `school_work` | 학교 / 직장 | `member.school_work` |
| `major` | 전공 | `member.major` |

> `enrolled_at`(등록일)은 **의도적으로 제외**한다.

#### `input_fields` 허용 키 (9개)

`member_opinion_report`의 `current_status ~ special_opinion` 컬럼명과 1:1 동일.
**작성자가 직접 입력해야 하는 항목**이다.

`current_status_etc`는 `current_status`에, `next_year_plan_etc`는 `next_year_plan`에 종속된다. 프론트가 종속 규칙을 강제하지만, 백엔드도 **부모 없이 자식만 들어온 요청은 400으로 거절**하는 것이 안전하다.

#### 항목 선택 UI 동작 (설정 화면)

두 항목군 모두 같은 방식으로 다룬다.

- **전체 선택 / 전체 해제** 버튼
- **선택 개수 배지** — `9 / 15 선택` 형태. 항목을 켜고 끌 때마다 즉시 반영되고,
  전부 선택되면 색이 바뀌어 한눈에 구분된다
- 저장 시 `MEMBER_FIELD_ORDER` / `INPUT_FIELD_ORDER` **순서대로 정렬해 전송**한다.
  화면에서 체크한 순서가 아니라 고정 순서여야 소비 화면들의 항목 배치가 일정하다

### 1-2. 설정 저장

`PUT /api/opinion/settings`

설정과 임원단 매핑을 한 번에 저장한다 (`report_year` 기준 upsert).

```json
{
  "report_year": 2026,
  "theme": "하나님의 열심이 이루시리라",
  "start_date": "2026-11-01",
  "end_date": "2026-12-15",
  "guide_text": "담당 지체 한 분 한 분을 떠올리며 사실에 근거해 작성해 주세요.",
  "is_open": true,
  "member_fields": ["name", "gyogu", "team", "group_no"],
  "input_fields": ["current_status", "general_opinion"],
  "mappings": [
    { "writer_member_id": 1, "target_member_id": 25 },
    { "writer_member_id": 1, "target_member_id": 31 },
    { "writer_member_id": 1, "target_member_id": 49 }
  ]
}
```

- `mappings`는 `(작성자, 대상자)` 쌍의 평면 배열이다. **해당 연도의 전체 매핑을 통째로 대체**한다
  (delete-then-insert). 위 예시는 작성자 1명이 대상자 3명을 맡는 매핑 하나 = **3행**
- `start_date > end_date`면 400
- `input_fields`가 빈 배열이면 400
- `writer_member_id === target_member_id` 면 400 (**자기 소견서를 자기가 쓸 수 없다**)
- 작성자·대상자 모두 **임원단 직분 보유자로 한정** — 아닌 `member_id`가 오면 400
- **`is_active = 0`(완료)인 연도에 대한 저장 요청은 409로 거절**한다. 프론트가 폼을 잠그지만 서버도 막아야 한다
- `exists` / `is_active`는 요청 본문에 포함되지 않는다 (서버가 관리)
- `is_open`은 **요청 본문에 포함된다** — 관리자가 설정 화면에서 직접 여닫기 때문
- `theme` 200자, `guide_text` 500자 초과 시 400

**선택지 목록(`status_options` / `plan_options`)도 각 항목 20자를 넘으면 400.**
작성자가 고른 값이 그대로 소견서에 찍히고, 그 칸이 PDF 좌측 단 한 줄이기 때문이다
(§2-2 길이 검증과 같은 근거). 등록 UI는 아직 없고 컬럼만 만들어 둔 상태다 (§5-1).

응답: `200 OK`

### 1-3. 임원단 매핑 조회

`GET /api/opinion/mappings?report_year=2026`

저장은 쌍의 평면 배열이지만, 조회는 **작성자 기준으로 묶어** 반환한다.
화면이 작성자 한 명을 한 줄로 그리기 때문이다.

```json
[
  {
    "writer": {
      "member_id": 1, "name": "김민준",
      "gyogu": 1, "team": 1, "group_no": 1,
      "generation": 15, "phone_number": "010-1111-2222"
    },
    "targets": [
      { "member_id": 25, "name": "이서연", "gyogu": 2, "team": 1, "group_no": 1,
        "generation": 14, "phone_number": "010-5555-6666" },
      { "member_id": 31, "name": "최지훈", "gyogu": 3, "team": 2, "group_no": 1,
        "generation": 13, "phone_number": "010-7777-8888" }
    ]
  }
]
```

**작성자 1명이 대상자 여러 명**을 맡는다. 한 대상자가 여러 작성자에게 걸릴 수는 있으므로,
서로 다른 `writer` 항목의 `targets`에 같은 사람이 중복 등장할 수 있다.

`leader_names`는 내려주지 않아도 된다 — 후보가 임원단으로 한정되어 있어 항상 「임원단」이다.

### 1-4. 멤버 후보 목록

`GET /api/opinion/members`

매핑 모달의 작성자/대상자 선택기와 **대시보드 필터 드롭다운 옵션**에 함께 쓰인다.
필터가 걸려도 옵션 목록이 좁아지지 않도록, 이 API는 **항상 전체 재적 멤버**를 반환해야 한다.

```json
[
  {
    "member_id": 1,
    "name": "김민준",
    "gyogu": 1,
    "team": 1,
    "group_no": 1,
    "generation": 15,
    "leader_names": ["그룹장", "팀장", "임원단"]
  }
]
```

- `member_profile.group_no != 0` 인 재적 멤버만 (삭제자 `member.deleted_at IS NOT NULL` 제외)

---

## 2. 소견서 현황 대시보드 (`/opinion/dashboard`)

| | |
|---|---|
| 권한키 | `admin.opinion.dashboard` |
| 화면 문서 | `frontend/md/15_opinion_dashboard.md` |
| 쓰는 테이블 | `member_opinion_report`, `member_opinion_report_writer`, `opinion_report_custom`(읽기), `opinion_report_mapping`(읽기) |

### 2-1. 명단 조회

`GET /api/opinion/reports`

쿼리 파라미터:

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `report_year` | int | O | 기준 연도 |
| `gyogu` | int | X | 교구 |
| `team` | int | X | 팀 |
| `group_no` | int | X | 그룹 |
| `status` | string | X | `all`(기본) / `written` / `not_written` |

> 대시보드의 **이름 검색은 클라이언트에서 처리**하므로 이 API에 검색 파라미터가 없다.
> 대상이 커져 서버 검색이 필요해지면 `keyword` 파라미터를 추가하되, KPI 집계에는 반영하지 않아야 한다
> (이름 검색은 범위 필터가 아니라 조회 보조 수단).

```json
{
  "enrolled": 72,
  "written_total": 49,
  "target": 8,
  "written": 6,
  "items": [ /* OpinionReportRow */ ]
}
```

**대상자 정의 — 중요**

소견서 대상은 **그 해 재적한 전체 교적**이다. 임원단 매핑은 *누가 쓰는지*를 정할 뿐,
*누구를 쓰는지*를 좁히지 않는다. 매핑에 없는 사람도 전부 행으로 나온다.

**교적 정보는 그 해 시점의 `member_profile` 스냅샷을 쓴다 — 중요**

팀배치를 돌리면 전체 교적이 재배치되고 그 결과가 `member_profile`에 새 행으로 복사된다
(`updated_at = {다음연도}-01-01`). 따라서 `member_profile`은 연도별 스냅샷이 쌓이는 이력 테이블이며,
`report_year` 시점의 행을 골라야 한다.

```sql
-- 멤버별로 report_year 시점의 최신 프로필 1건
SELECT mp.*
FROM member_profile mp
JOIN (
  SELECT member_id,
         MAX(CONCAT(updated_at, '-', LPAD(profile_id, 12, '0'))) AS mx
  FROM member_profile
  WHERE updated_at <= CONCAT(:report_year, '-12-31')
  GROUP BY member_id
) t
  ON t.member_id = mp.member_id
 AND t.mx = CONCAT(mp.updated_at, '-', LPAD(mp.profile_id, 12, '0'))
```

- `updated_at <= {report_year}-12-31` 이 다음 해 1월 1일자 팀배치 스냅샷을 자연스럽게 잘라낸다
- 같은 `updated_at`에 여러 행이 있으면 `profile_id`가 큰 것 (`crud/members.py:70`의 tie-break와 동일)
- 이력이 없는 멤버(현재 전체의 약 94%)는 유일한 행이 그대로 쓰인다 — 첫 해에는 현재 소속 = 작성 당시 소속이므로 정상

**집계 규칙 — 중요**

- `enrolled` / `written_total`: **필터와 무관하게 전체 교적 기준**. 진행율 바에 쓰인다
- `target` / `written`: 교구·팀·그룹 필터는 적용하되 **`status` 필터는 적용하기 전** 기준으로 집계한다.
  그래야 "미작성만 보기"를 눌러도 KPI 작성률이 0%로 튀지 않는다
- `items`: `status` 필터까지 모두 적용한 최종 목록

**`items[]` = `OpinionReportRow`**

```json
{
  "opinion_report_id": 1001,
  "member_id": 1,
  "report_year": 2026,
  "is_deleted": false,

  "name": "김민준",
  "gender": "남",
  "generation": 15,
  "birthdate": "1990-03-14",
  "phone_number": "010-1234-5678",
  "gyogu": 1,
  "team": 1,
  "group_no": 1,
  "member_type": "주일예배",
  "attendance_grade": "A",
  "attendance_rate": 87.5,
  "plt_status": "수료",
  "leader_names": ["그룹장"],
  "school_work": "한국대",
  "major": "경영학",

  "is_written": true,
  "writers": [
    { "member_id": 5, "name": "이서연", "gyogu": 3, "team": 1, "group_no": 2,
      "phone_number": "010-1234-5678", "role": "그룹장" }
  ],
  "companions": [
    { "member_id": 25, "name": "박민수", "gyogu": 2, "team": 1, "group_no": 1 }
  ],
  "updated_at": "2026-11-05T14:20:00",

  "current_status": "신앙 성장 중",
  "current_status_etc": null,
  "group_meeting_attendance_status": "꾸준히 참석",
  "sunday_morning_attendance_status": "꾸준히 참석",
  "sunday_evening_attendance_status": "격주 참석",
  "next_year_plan": "계속 섬김",
  "next_year_plan_etc": null,
  "general_opinion": "올 한 해 그룹모임에 성실히 …",
  "special_opinion": null
}
```

- **미작성 대상자도 행으로 반환**한다. 이때 `opinion_report_id`는 `null`, `is_written`은 `false`, 소견 내용 9개 필드는 모두 `null`
- 교적 항목과 소견서 내용을 **한 응답에 모두 담는다**. 상세 모달과 일괄 PDF가 추가 조회 없이 이미 받아둔 배열만으로 동작하게 하기 위함
  (대상이 수천 명 규모로 커지면 `?fields=summary` 같은 축약 모드를 추가하고, 상세는 단건 조회로 분리할 것)

**`writers` = 실제로 작성한 사람 / `expected_writers` = 작성 예정자**

응답에는 두 배열이 나간다. 의미가 다르다.

| 필드 | 의미 | 출처 | 어디에 쓰나 |
|------|------|------|-------------|
| `writers` | **실제로 저장한 사람** | `member_opinion_report_writer` 조인 (§0-2) | 명단·상세·**PDF** |
| `expected_writers` | **쓸 수 있는 사람** (파생) | 임원단 매핑 / `data_scope` — 아래 규칙 | 명단·상세 (회색) |

- `expected_writers` 는 `is_written = false` 일 때만 채운다. 작성 완료 건에는 빈 배열
- **PDF 에는 `writers` 만 넣는다.** 아직 쓰지 않은 사람의 이름이 출력물에 오르면 안 된다.
  `writers` 가 비면 「작성 전입니다.」로 찍는다
- 관리자가 `PUT /api/opinion/reports/:memberId` 로 대리 수정해도 `writers` 는 늘지 않는다.
  관리자만 채운 소견서는 `is_written = true` 이면서 `writers` 가 빌 수 있다

미작성 건에 예정 작성자를 보여주는 이유는 **독촉 대상**을 알기 위해서다.
실제 작성자만 두면 미작성 건의 작성자란이 비어 누구에게 연락할지 알 수 없다.

---

**`expected_writers` 산출 — 두 경로, 단 사람별로 배타**

작성 예정자는 **두 가지 경로**로 정해진다. 둘은 성격이 완전히 다르다.

| 경로 | 근거 | 대상 |
|------|------|------|
| **① 일반 교구** | `user_account.data_scope` (계정관리의 정책·데이터 범위 그대로) | 팀장·그룹장 등 일반 리더 |
| **② 임원단** | `opinion_report_mapping` (소견서 전용, 매년 수기 등록) | 임원단 |

**대상자의 직분이 경로를 가른다.** 팀 안에서 「누가 누구를 쓰는가」는 아래 한 표로 끝난다.

| 대상자 X | 예정 작성자 |
|----------|-------------|
| **임원단** | 매핑된 작성자 (소속 경로 **미적용**) |
| **팀장** | **없음** — 팀장 위에는 작성자가 없다 |
| **그룹장** | 같은 팀의 팀장 |
| **직분 없음** | 같은 팀의 팀장 + 같은 그룹의 그룹장 |

```
expected_writers(대상자 X):
    X 가 임원단      →  (·, X) 매핑의 writer 들
    아니면           →  같은 팀의 팀장
                        + X 가 직분이 없으면 같은 그룹의 그룹장
  − X 자기 자신
```

**팀 안의 모든 리더는 팀장이 쓴다.** 그룹장 경로는 **직분 없는 팀원에게만** 열린다 —
팀장이 아닌 다른 사람이 그룹장을 맡고 있어도, 그 그룹장이 같은 그룹 리더의 작성자가
되지는 않는다. 팀장 본인은 `− X 자기 자신` 에 걸려 결과가 0명이 되므로, 팀장의
소견서는 임원단 매핑이 따로 걸리지 않는 한 예정 작성자가 없다.

리더 판정도 임원단과 마찬가지로 **`report_year` 시점 `member_profile` 스냅샷** 기준이다.

> **합집합이 아니다.** 임원단 직분을 가진 사람은 소견서에서 **임원단 자격이 우선**하고,
> `data_scope` 범위는 적용되지 않는다.
>
> 예) 김민준이 *1교구 3팀 팀장 + 임원단* 이라면 — 매핑에 걸린 대상자만 쓰고,
> 3팀 팀원의 `writers`에는 김민준이 나타나지 않는다.
>
> **왜 배타인가** — 임원단 매핑은 「올해 이 사람이 누구를 쓰는가」를 조직이 직접
> 지정한 결과다. 여기에 `data_scope`를 더하면 조직이 의도하지 않은 대상자가 섞이고,
> 작성 분량도 예측할 수 없게 된다.
>
> 조직상 다른 리더이면서 임원단인 경우는 **거의 없다** — 실무에서 드문 케이스지만
> 구현이 갈리는 지점이라 규칙을 확정해 둔다.

**임원단 판정 시점은 `member_profile`이다.** `report_year` 시점 스냅샷(§2-1의
연도 스냅샷 규칙과 동일)에서 해당 멤버가 임원단 직분을 갖고 있는지로 판정한다.
현재 `member` 테이블 기준이 아니다.

판정 기준은 **직분 보유 여부**이지 매핑 존재 여부가 아니다. 임원단인데 매핑이
아직 등록되지 않았다면 그 계정의 대상자는 0명이 맞다 — `data_scope`로 **폴백하지 않는다**.
(폴백을 허용하면 매핑 등록 전후로 보이는 대상자가 요동쳐 더 혼란스럽다.)

> **⚠️ 본인 제외는 두 경로 공통 규칙이다.**
> 일반 교구든 임원단이든 **자기 소견서를 자기가 쓸 수 없다.**
> 사용자가 로그인해서 작성 화면에 들어오면 본인은 대상자 목록에 나오지 않아야 한다.
> 읽기(목록 조회)와 쓰기(매핑 저장) 양쪽에서 막는다.

#### ① 일반 교구 — 팀장 / 그룹장

**임원단이 아닌 대상자**에게 적용된다. 방향을 뒤집으면 작성자 쪽에서는 이렇게 보인다.

| 로그인 계정 | 쓰게 되는 대상자 |
|-------------|------------------|
| 팀장 | 같은 팀 **전원** (리더 포함, 본인 제외, 임원단 제외) |
| 그룹장 | 같은 그룹의 **직분 없는 팀원** |

`user_account.data_scope` 와 대체로 일치하지만(`team` / `group`) **그대로 쓰지는 않는다** —
그룹장의 `data_scope='group'` 는 같은 그룹 리더까지 포함하는데, 소견서에서는 리더를
팀장이 쓰기 때문이다. `data_scope` 는 **상한**으로만 쓰고 실제 산출은 위 표를 따른다.

기존 수련회 조회(`crud/retreat.py:173~`)의 소속 필터를 재사용하되,
그룹장 경로에는 `AND (대상자의 그 해 직분이 없음)` 조건을 덧붙인다.

> **⚠️ 수련회와 딱 하나 다르다 — 본인은 제외한다.**
> 수련회 명단은 본인을 포함해 보여주지만, 소견서는 **자기 소견서를 자기가 쓸 수 없다.**
> 팀장이 접속하면 **본인을 뺀** 그 팀의 모든 리더·팀원이 보여야 한다.
>
> ```sql
> AND m.member_id <> :login_member_id
> ```

#### ② 임원단 — 매핑 테이블

```sql
SELECT writer_member_id
FROM opinion_report_mapping
WHERE report_year        = :report_year
  AND target_member_id   = :target_member_id
  AND writer_member_id  <> target_member_id   -- 본인 제외 (방어)
```

**임원단 직분을 가진** 계정에만 적용되며, 이 경우 `data_scope`는 무시한다.

임원단은 조직이 매년 달라져 `data_scope` 로는 표현할 수 없다. 그래서 **소견서 전용 매핑**을 따로 둔다.
계정관리의 정책·데이터 범위와는 **무관한 별개 기능**이다.

작성자 1명이 대상자 여러 명을 맡는 구조이므로, 반대 방향(작성자 → 담당 대상자)은
`WHERE report_year = :y AND writer_member_id = :me` 로 조회한다.

> **`role` 표기** — 임원단 경로로 잡힌 작성자는 `writers[].role` 을 `"임원단"` 으로 내린다.
> 그 사람이 팀장을 겸하더라도 소견서에서는 임원단 자격으로 쓰는 것이므로,
> 겸직 직분을 나열하지 않는다.

#### 결과

소견서는 대상자당 **1건**이지만 작성자는 여러 명일 수 있다.
팀원 한 명에 대해 팀장과 그룹장이 같은 1건을 나눠 수정한다. → 낙관적 잠금 필수 (§2-2)

```json
"writers": [
  { "member_id": 5, "name": "이서연", "gyogu": 3, "team": 1, "group_no": 2,
    "phone_number": "010-1234-5678", "role": "그룹장" },
  { "member_id": 1, "name": "김민준", "gyogu": 3, "team": 1, "group_no": 1,
    "phone_number": "010-2345-6789", "role": "팀장" }
]
```

`role`은 **표시용 라벨**이다 (`임원단` / `팀장` / `그룹장`). 같은 사람이 두 경로에 다 걸리면
한 번만 넣고 먼저 잡힌 라벨을 쓴다.

> **소속 비교는 `report_year` 시점 프로필로 해야 한다.**
> 팀배치가 랜덤 재배치라 매년 그룹장·팀장이 완전히 바뀐다. 2026년 소견서의 작성자를
> 2027년 배치로 계산하면 전원 틀린 값이 나온다.

> `member_opinion_report`에 `writer_member_id` 컬럼이 없으므로 **최종 수정자는 추적되지 않는다.**
> `writers`는 "쓸 수 있는 사람 목록"이지 "쓴 사람"이 아니다.

**`companions` 산출 — 동반배치자**

`team_assignment_companion`에서 같은 `companion_no` 인원 중 본인을 제외한 목록이다.
조회 키는 **`report_year + 1`** — 2026년 소견서의 동반배치자는 2027년 팀배치 묶음에서 온다.

```sql
SELECT m.member_id, m.name, mp.gyogu, mp.team, mp.group_no
FROM team_assignment_companion me
JOIN team_assignment_companion other
  ON other.target_year = me.target_year
 AND other.companion_no = me.companion_no
 AND other.member_id <> me.member_id
JOIN member m ON m.member_id = other.member_id
-- mp 는 report_year 시점 프로필 (§2-1 조회 방식)
WHERE me.target_year = :report_year + 1
  AND me.member_id   = :member_id
```

**관리자 상세·PDF 전용이다.** 사용자 작성 페이지 응답에는 포함하지 않는다.

「그룹장」·「팀장」은 `leader.leader_name` 값으로 판별한다 (`member_profile.leader_ids` JSON 배열에 해당 `leader_id` 포함 여부).

> **주의**: `leader_ids`는 JSON 문자열 배열이다. `LIKE '%3%'` 같은 부분일치로 판별하면
> `13`, `30` 등이 오검출된다. 반드시 JSON 파싱 후 정수 비교할 것
> (수련회 차량 만석 판정에서 동일 버그가 있었음 — 커밋 `93fb02d`).

### 2-1-1. 명단 테이블 컬럼

```
교구 · 팀 · 그룹 · 기수 · 직분 · 이름 · 작성자 · 작성 여부 · 최종 수정일
```

- **직분**(`leader_names`) — 직분에 따라 예정 작성자가 갈리므로(팀장은 0명, 리더는 팀장만)
  명단에서 바로 보이게 둔다
- **작성자** — 실제로 쓴 사람(`writers`). 아직 아무도 안 썼으면 `expected_writers` 를
  회색 **(예정)** 으로 대신 보여준다
- **이름** 옆에 `is_deleted` 면 「삭제」 배지
- 미작성자도 행으로 나온다 (`opinion_report_id` 가 `null`)

### 2-1-2. 서버가 관여하지 않는 기능

화면에는 있지만 **백엔드 엔드포인트가 없는** 기능이다. 나중에 「API가 빠졌나」 하지 않도록 적어 둔다.

| 기능 | 처리 방식 |
|------|-----------|
| **PDF 다운로드** (단건 · 일괄) | `window.print()` 로 브라우저가 처리. 이미 받아둔 `items` 만으로 렌더 |
| **행 체크박스 → 선택분만 일괄 PDF** | 클라이언트에서 `member_id` 로 골라 인쇄. 선택은 서버로 가지 않는다 |
| **이름 검색** | 클라이언트 필터 (§2-1). KPI 에는 반영하지 않는다 |

`GET /api/opinion/reports` 가 교적 항목과 소견 내용을 **한 응답에 모두 담는** 이유가 이것이다 —
상세 모달과 일괄 PDF 가 추가 조회 없이 동작해야 한다.

### 2-2. 소견서 수정 (관리자)

`PUT /api/opinion/reports/:memberId?report_year=2026`

관리자가 상세 모달에서 소견 내용을 직접 편집한다. `(member_id, report_year)` 기준 **upsert** — 미작성 상태에서 저장하면 새 레코드가 생성된다.

```json
{
  "current_status": "신앙 성장 중",
  "current_status_etc": null,
  "group_meeting_attendance_status": "꾸준히 참석",
  "sunday_morning_attendance_status": "꾸준히 참석",
  "sunday_evening_attendance_status": "격주 참석",
  "next_year_plan": "계속 섬김",
  "next_year_plan_etc": null,
  "general_opinion": "…",
  "special_opinion": null
}
```

- 전달되는 키는 **설정의 `input_fields`에 포함된 항목만**이다. 설정에서 꺼진 항목은 요청에 아예 없다
- 빈 문자열은 프론트에서 `null`로 변환해 보낸다
- 응답: `200 OK`

**길이 검증 — DB 컬럼이 아니라 지면이 기준이다.**

| 항목 | 한도 | 근거 |
|------|------|------|
| 단답 7개 (`current_status` ~ `next_year_plan_etc`) | **각 20자** | PDF 좌측 단 한 줄 분량 |
| `general_opinion` / `special_opinion` | 20,000자 | TEXT 65,535 **바이트** ÷ 한글 3바이트, 여유 포함 |

단답 7개의 DB 컬럼은 `VARCHAR(100)` / `VARCHAR(255)` 지만 **20자로 더 좁게 막는다.**
PDF 소견 내용이 2단이고 좌측 단이 본문 폭의 약 1/3이라, 항목당 한 줄을 넘기면
7개가 한 장에 들어가지 않는다 (`frontend/src/models/opinion.types.ts` 의
`SHORT_INPUT_MAX_LENGTH`). 초과하면 **400**.

프론트도 `maxLength` 로 막지만 **서버에서 반드시 다시 검증한다.**

#### 낙관적 잠금 — **확정**

소견서 1건을 팀장·그룹장이 함께 수정하므로, 그냥 두면 **나중에 저장한 사람이 앞사람 내용을 통째로 덮어쓴다.**

요청 본문에 조회 시 받은 `updated_at`을 함께 실어 보낸다.

```json
{
  "base_updated_at": "2026-11-05T14:20:00",
  "current_status": "신앙 성장 중",
  "general_opinion": "…"
}
```

- 비교와 쓰기를 나누면 그 사이에 끼어들 수 있으므로 **조건을 UPDATE 문에 넣는다.**
  `affected_rows = 0` 이면 **409 Conflict** (§0-4-1)
- 신규 작성(레코드 없음)이면 `base_updated_at`은 `null`. 그 사이 다른 사람이 먼저 만들었다면
  `UNIQUE (member_id, report_year)` 가 막고, 중복 키 오류를 **409로 변환**한다 (500 아님)
- 409 응답에는 `current_updated_at` · `last_writer` · `is_self` 를 함께 내린다 (§0-4-3).
  프론트는 `is_self` 로 「○○ 님이 방금 저장했습니다」와 「다른 탭에서 저장된 내용입니다」를 가른다
- **모달을 닫지 않고** 최신 내용만 재조회한다 — 닫으면 방금 쓴 내용을 전부 잃는다

> **`updated_at` 은 `DATETIME(3)` 이어야 한다.** 초 단위면 같은 초에 저장한 두 사람이
> 검사를 통과해 잠금이 뚫린다 (§0-4-2).

> 관리자 대시보드의 상세 모달과 사용자 작성 페이지 **양쪽 모두** 이 규칙을 따른다.
> 다만 **관리자 저장은 `member_opinion_report_writer` 를 건드리지 않는다** (§0-2) —
> 대리 수정이지 작성이 아니므로 `last_writer` 도 바뀌지 않는다.

---

## 3. 팀배치 사전 설정 (`/opinion/pre-assignment`)

| | |
|---|---|
| 권한키 | `admin.opinion.pre_assignment` |
| 화면 문서 | `frontend/md/17_pre_assignment.md` |
| 쓰는 테이블 | `team_assignment_exclusion`, `team_assignment_companion`, `team_assignment_run`(읽기) |

팀배치를 돌리기 **전에** 정해둬야 하는 두 가지를 관리한다.

```
제외 명단     랜덤배치에서 빼고 교구·팀을 직접 지정
동반배치 묶음  같은 팀에 배치할 인원을 묶음
```

**왜 팀배치 작업과 나눴나** — 이 둘은 배치 실행 전에 산정되는 **입력값**이고,
배치를 여러 번 다시 돌려도 유지되어야 한다. 팀배치 화면 안에 두면 배치 결과와
입력값이 한 화면에 섞여 「화면을 벗어나면 사라지는 값」으로 오해되기 쉽다.
변경은 **즉시 서버에 저장**하며 별도 저장 버튼이 없다.

**제외 명단 ↔ 동반배치는 배타다.** 한 사람이 양쪽에 동시에 들어갈 수 없다
(제외자는 랜덤배치에 참여하지 않으므로 묶음이 의미가 없다).
프론트는 양쪽 후보 목록에서 서로를 빼고, 서버도 `PUT` 시 교차 검증해 **400**으로 거절한다.

### 3-1. API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/opinion/team-assignment?target_year=` | 회차 조회 — 교구 수·팀 수를 읽어 드롭다운 구성 (**읽기 전용**) |
| `GET` | `/api/opinion/team-assignment/exclusions?target_year=` | 제외 명단 (교구·팀·사유) |
| `PUT` | `/api/opinion/team-assignment/exclusions` | 해당 연도 제외 명단 **전체 대체** |
| `GET` | `/api/opinion/team-assignment/companions?target_year=` | 동반배치 묶음 (묶음 기준 그룹핑) |
| `PUT` | `/api/opinion/team-assignment/companions` | 해당 연도 묶음 **전체 대체** |
| `GET` | `/api/opinion/team-assignment/counts?target_year=` | 배치 인원 집계 (배치 실행 전에도 조회 가능) |

두 `PUT`은 **전체 대체**다. 행 단위 추가/삭제 API를 두지 않은 것은 화면이 항상
전체 목록을 들고 있어 부분 갱신이 이득이 없고, 부분 실패 상태를 만들지 않기 위해서다.

`status='committed'`(교적 이관 완료)면 두 `PUT` 모두 **409로 거절**한다.

### 3-2. 제외 명단

**제외 명단** (`GET/PUT /exclusions`)

```json
{
  "target_year": 2027,
  "items": [
    { "member_id": 42, "gyogu": 1, "team": 3, "reason": "팀장 사전배치" },
    { "member_id": 77, "gyogu": 2, "team": 1, "reason": "임원단 사전배치" }
  ]
}
```

- `gyogu` / `team`은 **필수**다. 「배치 자체를 안 함」은 이 기능이 아니다 —
  배치 대상에서 빼려면 교적관리에서 삭제 처리(`member.deleted_at`)한다
- `reason`은 선택. 화면에서 `임원단 사전배치 / 팀장 사전배치 / 그룹장 사전배치`를
  프리셋 칩으로 제공하되 자유 입력도 허용한다
- `GET` 응답은 `member` 객체(이름·직분·기존 소속)를 함께 내려 화면이 join 없이 그리게 한다
- 동반배치 묶음에 이미 속한 `member_id`가 들어오면 **400**

### 3-3. 배치 인원 집계

**배치 인원 집계** (`GET /counts`)

```json
{
  "total": 1913, "newcomer": 118, "regular": 1795,
  "random": 1840, "companion": 48, "excluded": 25
}
```

- `total = random + companion + excluded` 가 **항상 성립**해야 한다
- `random`은 **동반 묶음에 속하지 않은 개별 랜덤 대상자**만 센다
  (동반배치자도 랜덤배치를 거치지만, 세 값이 전체를 분할하도록 이렇게 정의한다)
- `total = newcomer + regular` 도 성립한다. `newcomer`는 `member_type = '새가족'`
- `deleted_at IS NOT NULL` 인 삭제 명단은 **어디에도 포함되지 않는다**
- 제외 명단이 동반 묶음보다 우선한다 (배타 제약이 지켜지면 실제로는 겹치지 않는다)

> 이 집계는 **팀배치 작업 화면에서도 같은 KPI 4장**으로 쓴다 (§4).

---

## 4. 팀배치 작업 (`/opinion/team-assignment`)

| | |
|---|---|
| 권한키 | `admin.opinion.team_assignment` |
| 화면 문서 | `frontend/md/16_team_assignment.md` |
| 쓰는 테이블 | `team_assignment_run`, `team_assignment_result`, 사전 설정 2테이블(읽기) |

기본 정보 입력 → 배치 실행 → 결과 확인·조정 → 소견서 완료·교적 이관.

제외 명단과 동반배치 묶음은 이 화면에 없다 — **팀배치 사전 설정**(§3)에서 관리한다.

### 4-1. 회차 상태

| 상태 | 의미 | 화면 |
|------|------|------|
| `draft` | 배치 전 | 기본 정보 편집 가능 |
| `assigned` | 조정 중 | 결과 테이블 + 팀 이동 |
| `committed` | 완료 | **전체 읽기 전용** |

### 4-2. 배치 알고리즘

루트의 `팀배치_1번모듈.py`를 그대로 옮긴 것이다. **순서를 지켜야 결과가 재현된다.**

```
대상 = member.deleted_at IS NULL 인 전원          ← 삭제 명단은 배치 제외

  ① 제외 명단은 지정된 (gyogu, team) 에 그대로 앉힌다 — 랜덤배치 미참여
       → 팀별 preCount[gyogu-team] 에 미리 찬 자리로 누적
  ② 나머지에서 동반배치 묶음을 하나의 단위로 압축 (층화 기준은 묶음 대표의 성별·등급)
  ③ random_seed 로 셔플
  ④ (성별 × attendance_grade) 조합별 groupby
  ⑤ total_team_count 만큼 라운드로빈 — 묶음은 통째로 같은 팀에
       배정 직전, 이미 capacity 만큼 찬 팀은 건너뛴다
       capacity = ceil((제외 인원 + 랜덤 대상 인원) / total_team_count)
  ⑥ teamIndex → gyogu = idx // (total/gyogu_count) + 1
                team  = idx %  (total/gyogu_count) + 1
```

> **사전 배치 인원은 팀 정원에 포함된다.** 팀장을 1교구 3팀에 미리 앉혔다면
> 랜덤배치는 그 팀의 **남은 자리만** 채워야 균형이 맞는다. `preCount`를
> 라운드로빈 시작 상태로 넘기는 이유다.

> **`teamIndex`를 조합 사이에서 리셋하면 안 된다.** 원본의 핵심으로, 리셋하면
> 조합 경계에서 팀 간 균형이 깨진다.

`total_team_count`가 `gyogu_count`로 나누어떨어져야 한다 (36 = 3 × 12). 아니면 400.

### 4-3. API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/opinion/team-assignment?target_year=` | 회차 조회 (없으면 기본값 + `status:'draft'`) |
| `PUT` | `/api/opinion/team-assignment/basics` | 총 팀 수 / 교구 수 저장 |
| `GET` | `/api/opinion/team-assignment/counts?target_year=` | 배치 인원 집계 (§3-3과 동일) |
| `POST` | `/api/opinion/team-assignment/run` | 배치 실행 (기존 결과 덮어씀) |
| `GET` | `/api/opinion/team-assignment/result?target_year=` | 배치 결과 조회 |
| `PUT` | `/api/opinion/team-assignment/move` | 팀 이동 (`is_manual=1`) — 사전 배치 인원도 가능 |
| `POST` | `/api/opinion/team-assignment/commit` | 소견서 완료 + 교적 이관 |

`run` / `move` / `commit` / `basics` 는 `status='committed'`면 **409로 거절**한다.

**배치 결과 응답** (`/run`, `/result`)

```json
{
  "run": {
    "target_year": 2027, "total_team_count": 36, "gyogu_count": 3,
    "random_seed": 482910371, "status": "assigned",
    "assigned_at": "2026-12-20T10:00:00", "committed_at": null
  },
  "counts": {
    "total": 1913, "newcomer": 118, "regular": 1795,
    "random": 1840, "companion": 48, "excluded": 25
  },
  "rows": [
    {
      "member_id": 1, "name": "김민준", "gender": "남", "generation": 15,
      "phone_number": "010-1234-5678", "birthdate": "1999-03-14",
      "attendance_grade": "A", "member_type": "토요예배",
      "plt_status": "수료", "school_work": "새노래대학교", "major": "신학과",
      "v8pid": "V8100007", "enrolled_at": "2021-03-07",
      "leader_names": ["그룹장"],
      "prev_gyogu": 3, "prev_team": 1, "prev_group_no": 2,
      "gyogu": 1, "team": 5, "group_no": 0,
      "companion_no": null, "is_excluded": false, "is_manual": false
    }
  ]
}
```

**`rows`는 교적 명단(`MemberListPage`)과 같은 컬럼 구성을 갖는다.** 배치 후 명단을
교적 명단처럼 그대로 훑어볼 수 있어야 하기 때문이다. 화면 컬럼 순서는

```
상태 · 번호 · 교구 · 팀 · 그룹 · 이름 · 성별 · 기수 · 연락처 · 생년월일 · 직분 ·
등반일자 · 교인구분 · 출석등급 · PLT 수료여부 · 학교 및 직장 · 전공 · V8 PID
  + 기존 소속 · 동반
```

교적 명단과 동일하되 세 가지가 다르다.

- **상태**를 **맨 앞**에 둔다 — `사전배치`(파랑, `is_excluded`) / `이동`(주황, `is_manual`) 배지
- **교구 · 팀**은 배치 결과 인라인 드롭다운 (수정 가능)
- **그룹**은 항상 `—` (내년 팀장이 배치)
`member_type` 등은 §2-1과 같은 `member_profile` 스냅샷 규칙으로 조회한다.

**명단 필터** — 배치된 `gyogu` / `team` + 이름 검색. 서버 필터링이 필요하면
`/result`에 `gyogu` / `team` / `name` 쿼리 파라미터를 받되, 2천 행 규모라
클라이언트 필터링으로도 충분하다 (현재 구현은 클라이언트 필터).

**엑셀 다운로드 — 서버 엔드포인트가 없다.** 이미 받아둔 `rows` 를 클라이언트에서
CSV(선두 BOM, `text/csv`)로 만들어 내려준다. 인원조사·차량조사 명단과 같은 방식이고
`xlsx` 의존성을 새로 넣지 않았다. **현재 필터가 걸린 행만** 받으며 컬럼 순서는 위 화면
테이블과 같다 (드롭다운은 값으로 평문화, 그룹은 공란).

### 4-4. 사전 배치 인원의 사후 조정

**사전 배치라도 팀배치 실행 후 팀을 바꿀 수 있다.** 「제외」는 *랜덤배치에 참여하지
않는다*는 뜻일 뿐, 조정까지 잠그는 것이 아니다. 조정은 일반 인원과 똑같이
`PUT /move`로 처리하고 `is_manual=1`이 붙는다.

이때 `team_assignment_exclusion.gyogu/team` 과 `team_assignment_result.gyogu/team`
이 서로 달라질 수 있다. **`team_assignment_result`가 진실**이며,
교적 이관도 `result`만 본다. `exclusion`은 *배치 실행 시점의 입력값* 기록으로 남는다.

- `move`는 `exclusion` 행을 건드리지 않는다 (입력 이력을 보존하기 위해)
- 배치를 **다시 실행**하면 `exclusion`의 값이 다시 기준이 되어 수기 이동은 사라진다.
  화면에서 「다시 배치」 시 이 점을 경고해야 한다
- 사전 배치 자리 자체를 바꾸고 싶으면 「팀배치 사전 설정」 화면에서 고친 뒤 다시 배치한다

### 4-5. 완료 (교적 이관)

**하나의 트랜잭션으로 묶어야 한다.**

```
1) team_assignment_result → member_profile INSERT
     updated_at   = '{target_year}-01-01'
     gyogu / team = result 값,  group_no = 0
     member_type / attendance_grade / plt_status / leader_ids 는 직전 프로필에서 승계
         ↑ result 테이블에 member_type 컬럼이 없으므로 승계가 유일한 경로다.
           새가족은 직전 프로필이 '새가족'이라 그대로 유지된다
2) opinion_report_custom.is_active = 0, is_open = 0   (report_year = target_year - 1)
       ↑ 설정 화면을 잠그고 사용자 작성 페이지도 함께 닫는다
3) team_assignment_run.status = 'committed', committed_at = now
```

- 결과: 새가족은 **{target_year}년 미등반 새가족 명단**, 나머지는 **{target_year}년 교적 명단**.
  `member_type`을 승계하므로 자동으로 갈린다
- 사전 배치 인원도 일반 인원과 구분 없이 `result` 값 그대로 이관된다
- 등반 처리는 이 흐름과 무관하다 — 기존 「등반 처리」 API가 담당
- **중복 실행을 막아야 한다.** 같은 `updated_at`으로 두 번 돌면 프로필이 두 벌 쌓이고,
  §2-1의 tie-break가 `profile_id`뿐이라 잘못된 배치가 선택된다
- 약 2,000행 INSERT다. 실패 시 전량 롤백되어야 한다


> **조정 중(`status='assigned'`)인 값을 `member_profile`에 쓰면 안 된다.**
> 확정 전 배치가 프로필 이력에 섞이면 연도 스냅샷이 오염된다.
> 그래서 `team_assignment_temp`를 따로 두고 `commit` 시점에 한 번에 옮긴다.

> 되돌리기 어려운 작업이다. 실행 전 확인 모달과 생성될 행 수 미리보기가 필요하다.
> 완료 취소(재개)가 필요하면 그것도 팀배치 화면 몫이다 —
> 소견서 설정 화면에는 완료/재개 버튼을 두지 않는다.

---

## 5. 미확정 사항

### 5-1. `current_status` / `next_year_plan` 선택지

DDL에 `_etc`(기타설명란)가 있는 것으로 보아 고정 선택지 + "기타" 구조로 보이나, **선택지 목록이 확정되지 않았다.**

현재 프론트는 자유 텍스트(`TextField`)로 처리한다. 선택지가 확정되면:

1. `opinion_report_custom`에 `status_options` / `plan_options` JSON 컬럼 추가
2. 설정 화면에 선택지 등록 UI 추가
3. 대시보드 상세 모달과 사용자 작성 페이지를 `Select`로 전환

### 5-2. 소견서 사용자 페이지 — **별도 문서로 분리**

`client/` 작성 화면의 요구사항·API 계약은 **`OPINION_USERPAGE_APISPEC.md`** 에 정리했다.

| 엔드포인트 | 설명 |
|------------|------|
| `GET /api/opinion/my-targets?report_year=` | 담당 대상자 목록 + 회차 정보(`end_date` / `guide_text` / `input_fields`) |
| `GET /api/opinion/my-reports/:memberId?report_year=` | 소견서 단건 조회 (낙관적 잠금용 `updated_at` 포함) |
| `PUT /api/opinion/my-reports/:memberId?report_year=` | 저장 — 배정 검증(403) + 낙관적 잠금(409) |

관리자용(§2-2)과의 결정적 차이는 **작성자-대상 배정 검증**이다.
관리자는 아무 대상자나 편집할 수 있지만 사용자는 본인 담당만 가능하다.

확정된 화면 요구사항 두 가지도 그 문서에 있다 —
**작성 마감일 기반 D-day**, **`guide_text`를 상단 가이드 문구로 노출**.
`companions`(동반배치자)는 관리자 전용이라 사용자 응답에 포함하지 않는다.

### 5-3. 임원단 직분 등록

기존 일괄 계정 생성(`GET /api/admin/accounts/preview`)은 `member_profile.leader_ids`가 비어있지 않은 **직분 보유자만** 대상으로 잡는다 (`backend/app/crud/authority.py:167-169`).

임원단이 `leader` 테이블에 「임원단」 직분으로 등록되어 있지 않으면 계정 생성 대상에 뜨지 않는다. 교적 쪽에서 직분을 부여하는 선행 작업이 필요하며, 이는 소견서 기능과 별개 건이다.

### 5-4. 과거 연도에 탈퇴한 멤버 — **확정**

`member_opinion_report`에 행이 있으면 **`member.deleted_at` 여부와 무관하게 명단에 표시**한다.
2026년 소견서를 2028년에 열었을 때 그 사이 탈퇴한 사람의 소견서가 사라지면 안 되기 때문이다.

단, **미작성 집계에서는 제외**한다.

```
items       : 소견서 행이 있으면 탈퇴자도 포함
target      : 그 해 재적자 수 (탈퇴자 제외)
written     : 소견서 행이 있는 수 (탈퇴자 포함)
미작성       : target - (재적자 중 작성된 수)   ← 탈퇴자를 빼고 계산
```

즉 탈퇴자는 "조회는 되지만 독려 대상은 아닌" 상태로 다룬다.
명단에서는 이름 옆에 탈퇴 배지를 붙여 구분한다.

---

### 5-5. 작성자 다수 — **해결됨 (안 B 확정)**

한 대상자에 대해 **여러 사람이 소견서를 쓴다.**

- 교구: 팀장이 그룹장들과 **전체 팀원**을 작성 → 팀원 한 명에 대해 팀장 + 그룹장
- 임원단에서도 같은 상황이 발생

**결정: 소견서는 대상자당 1건을 유지하고, 여러 작성자가 같은 건을 나눠 수정한다.**
제공받은 DDL(`UNIQUE (member_id, report_year)`)을 그대로 쓰며 변경하지 않는다.

이에 따라 API 응답의 작성자는 단수 `writer_name`이 아니라 **`writers` 배열**이다.

산출은 **계정별로 경로가 배타**다 — 임원단 직분이 있으면 매핑만, 없으면 `data_scope`만
본다 (§2-1 참고). 그렇게 판정된 계정들을 모아 `writers` 배열이 된다.
같은 대상자에 여러 작성자가 붙는 건 여전히 가능하다 (예: 팀장 + 그룹장).

#### 남는 한계

- `member_opinion_report`에 `writer_member_id`가 없어 **최종 수정자가 추적되지 않는다.**
  누가 마지막으로 고쳤는지 알아야 할 일이 생기면 컬럼 추가가 필요하다
- **동시 편집 충돌**: 팀장과 그룹장이 같은 시각에 저장하면 나중 사람이 앞사람 내용을 덮어쓴다.
  → **낙관적 잠금으로 해결하기로 확정**했다. §2-2 참고
