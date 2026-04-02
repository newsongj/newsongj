# gyojeok API 현황

> 백엔드 API 진행 상황 및 사용법 정리 (프론트 참고용)
>
> Base URL: `/api/v1/gyojeok`

---

## 상태 요약

| Method | Endpoint | 설명 | 상태 |
|--------|----------|------|------|
| GET | `/members` | 멤버 목록 조회 | ✅ 완료 |
| POST | `/members` | 멤버 추가 | ✅ 완료 |
| PUT | `/members/{member_id}` | 멤버 수정 | ✅ 완료 |
| DELETE | `/members/{member_id}` | 멤버 삭제 (soft delete) | ✅ 완료 |
| GET | `/members/deleted` | 삭제된 멤버 목록 조회 | ✅ 완료 |
| POST | `/members/restore/{member_id}` | 삭제된 멤버 복원 | ✅ 완료 |
| GET | `/members/filters` | 필터링 조건 조회 | 🔴 미구현 |
| GET | `/members/search` | 멤버 검색 | 🔴 미구현 |
| PUT | `/members/deleted/{member_id}` | 삭제 명단 수정 | 🔴 미구현 |
| GET | `/members/deleted/filters` | 삭제 명단 필터링 조건 | 🔴 미구현 |
| GET | `/members/deleted/search` | 삭제 명단 검색 | 🔴 미구현 |
| GET | `/api/attendance/dashboard/kpi` | KPI 4종 집계 | 🔴 미구현 |
| GET | `/api/attendance/dashboard/trend` | 출석 인원 추이 | 🔴 미구현 |
---

## 완료 API 상세

### 1. 멤버 목록 조회

```
GET /api/v1/gyojeok/members
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| year | date (YYYY-MM-DD) | ✅ | 조회 연도 (예: `2026-01-01`) |
| page | int | | 페이지 번호 (기본값: 1) |
| page_size | int | | 페이지 크기 (기본값: 10) |
| gyogu | int | | 교구 필터 |
| team | int | | 팀 필터 |
| group_no | int | | 그룹 필터 |
| generation | int | | 기수 필터 |

**Response (200)**
```json
{
  "items": [
    {
      "member_id": 1,
      "name": "홍길동",
      "gender": "남",
      "generation": 30,
      "gyogu": 1,
      "team": 2,
      "group_no": 3,
      "phone_number": "010-1234-5678",
      "birthdate": "2000-01-15",
      "member_type": "토요예배",
      "attendance_grade": "A",
      "plt_status": "수료",
      "leader_ids": "팀장, 그룹장",
      "v8pid": null,
      "school_work": "서울대학교",
      "major": "컴퓨터공학",
      "year": "2026-01-01",
      "enrolled_at": "2026-03-22T15:00:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "page_size": 10,
    "total_items": 50
  }
}
```

> `leader_ids`는 응답에서 ID가 아닌 **이름 문자열**로 변환되어 내려감 (예: `"팀장, 그룹장"`)

---

### 2. 멤버 추가

```
POST /api/v1/gyojeok/members
```

**Request Body**
```json
{
  "name": "홍길동",
  "gender": "남",
  "generation": 30,
  "phone_number": "010-1234-5678",
  "birthdate": "2000-01-15",
  "gyogu": 1,
  "team": 2,
  "group_no": 3,
  "member_type": "토요예배",
  "leader_ids": "[\"1\", \"3\"]",
  "plt_status": "수료",
  "attendance_grade": null,
  "v8pid": null,
  "school_work": "서울대학교",
  "major": "컴퓨터공학"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | ✅ | 이름 |
| gender | string | ✅ | "남" 또는 "여" |
| generation | int | ✅ | 기수 |
| phone_number | string | | 전화번호 |
| birthdate | date | | 생년월일 |
| gyogu | int | | 교구 |
| team | int | | 팀 |
| group_no | int | | 그룹 |
| member_type | string | | "토요예배", "주일예배", "래사랑", "군지체", "해외지체", "새가족" |
| leader_ids | string | | JSON 배열 문자열 (예: `"[\"1\", \"3\"]"`) |
| plt_status | string | | "수료" 또는 "1학기 수료" |
| attendance_grade | string | | 현재 미사용 (동적 계산 예정) |
| v8pid | string | | PID |
| school_work | string | | 학교/직장 |
| major | string | | 전공 |

> `enrolled_at`(등록일시), `year`(프로필 연도)는 **서버에서 자동 생성** — 프론트에서 보내지 않음

**Response (201)** — `MemberResponse` 객체 (목록 조회의 items 단건과 동일)

---

### 3. 멤버 수정

```
PUT /api/v1/gyojeok/members/{member_id}
```

**Path Parameter**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| member_id | int | 수정할 멤버 ID |

**Request Body** — 멤버 추가와 동일 구조

> 서버에서 수정하지 않는 필드: `enrolled_at`(등록일시), `attendance_grade`(동적 계산)

**Response (200)**
```json
{ "member_id": 13 }
```

---

### 4. 멤버 삭제 (Soft Delete)

```
DELETE /api/v1/gyojeok/members/{member_id}
```

**Path Parameter**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| member_id | int | 삭제할 멤버 ID |

**Request Body**
```json
{
  "deleted_reason": "본인 요청"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| deleted_reason | string | ✅ | 삭제 사유 |

> `deleted_at`(삭제 시각)은 **서버에서 자동 생성**

**Response (200)** — `MemberResponse` 객체

---

### 5. 삭제된 멤버 목록 조회

```
GET /api/v1/gyojeok/members/deleted
```

**Query Parameters** — 멤버 목록 조회와 동일 (단, `year`는 선택)

> 최신 연도 프로필 하나만 조인하여 반환

**Response (200)**
```json
{
  "items": [
    {
      "member_id": 13,
      "name": "홍길동",
      "gender": "남",
      "generation": 30,
      "gyogu": 1,
      "team": 2,
      "group_no": 3,
      "phone_number": "010-1234-5678",
      "birthdate": "2000-01-15",
      "member_type": "토요예배",
      "attendance_grade": null,
      "plt_status": "수료",
      "leader_ids": "팀장",
      "v8pid": null,
      "school_work": "서울대학교",
      "major": "경영학",
      "year": "2026-01-01",
      "enrolled_at": "2026-03-22T15:00:00",
      "deleted_at": "2026-03-22T16:30:00",
      "deleted_reason": "본인 요청"
    }
  ],
  "meta": {
    "current_page": 1,
    "page_size": 10,
    "total_items": 3
  }
}
```

---

### 6. 삭제된 멤버 복원

```
POST /api/v1/gyojeok/members/restore/{member_id}
```

**Path Parameter**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| member_id | int | 복원할 멤버 ID |

**Request Body** — 없음

> `deleted_at`, `deleted_reason`을 NULL로 초기화

**Response (200)** — `MemberResponse` 객체

---

### 2-1. KPI 카드 집계

```
GET /api/attendance/dashboard/kpi
```

| 항목 | 내용 |
|------|------|
| 설명 | 기간 평균 출석 인원, 45기/46기 출석 인원 |
| 사용 화면 | 출석 대시보드 > KPI 카드 3개 |

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| start_date | string (YYYY-MM-DD) | O | 기간 시작일 |
| end_date | string (YYYY-MM-DD) | O | 기간 종료일 |
| gyogu_no | number | - | 교구 번호 (없으면 전체) |
| team_no | number | - | 팀 번호 (없으면 전체, gyogu_no 필요) |
| is_imwondan | boolean | - | true 이면 임원단 필터 적용; 어떻게 할지 논의 필요 |

**Response**
```json
{
  "avg_present": 75,
  "total_members": 109,
  "gen45": {
    "present": 22,
    "total": 26
  },
  "gen46": {
    "present": 18,
    "total": 23
  }
}
```

---

## 공통 사항

### 에러 응답
```json
{ "detail": "에러 메시지" }
```

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 |
| 404 | 멤버 또는 프로필 없음 |
| 422 | 요청 형식 오류 (필수 필드 누락 등) |
| 500 | 서버 에러 |

### 서버에서 자동 생성하는 값 (프론트에서 보내지 않음)

| 필드 | 저장 위치 | 설명 |
|------|----------|------|
| enrolled_at | member | 등록일시 (생성 시 서버 시각) |
| year | member_profile | 프로필 연도 (생성 시 현재 연도) |
| deleted_at | member | 삭제 시각 (삭제 시 서버 시각) |

### 페이징

모든 목록 API는 `page`, `page_size` 파라미터를 지원하며, 응답에 `meta` 객체가 포함됨.

```json
{
  "meta": {
    "current_page": 1,
    "page_size": 10,
    "total_items": 50
  }
}
```
