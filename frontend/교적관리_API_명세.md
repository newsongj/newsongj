# 교적관리 API 명세

> 교적관리 하위 4개 화면(출석 대시보드, 출석 관리, 사용자 목록, 삭제 명단)에서 필요한 API 목록입니다.
> 화면 코드 분석 기반으로 도출했으며, 실제 구현 시 백엔드와 협의하여 확정합니다.

---

## 목차

1. [공통 메타 API](#1-공통-메타-api)
2. [출석 대시보드](#2-출석-대시보드)
3. [출석 관리](#3-출석-관리)
4. [사용자 목록](#4-사용자-목록)
5. [삭제 명단](#5-삭제-명단)

---

## 1. 공통 메타 API

화면 전반에서 필터 드롭박스 옵션 구성에 사용되는 코드성 데이터입니다.

### 1-1. 직분(리더) 목록 조회

```
GET /api/meta/leaders
```

| 항목 | 내용 |
|------|------|
| 설명 | `leader` 테이블의 전체 직분 목록 반환 |
| 사용 화면 | 출석 관리(직분 Chip), 사용자 목록(직분 필터) |

**Response**
```json
[
  { "leader_id": 1, "leader_name": "팀장" },
  { "leader_id": 2, "leader_name": "그룹장" },
  { "leader_id": 3, "leader_name": "부팀장" },
  { "leader_id": 4, "leader_name": "부서장" },
  { "leader_id": 5, "leader_name": "PLT" },
  { "leader_id": 6, "leader_name": "새큼터" },
  { "leader_id": 7, "leader_name": "새가족" },
  { "leader_id": 8, "leader_name": "임원단" }
]
```

---

## 2. 출석 대시보드

### 2-1. KPI 카드 집계

```
GET /api/attendance/dashboard/kpi
```

| 항목 | 내용 |
|------|------|
| 설명 | 기간 평균 출석 인원, 45기/46기 출석 인원, 최다 출석 교구 |
| 사용 화면 | 출석 대시보드 > KPI 카드 4개 |

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| start_date | string (YYYY-MM-DD) | O | 기간 시작일 |
| end_date | string (YYYY-MM-DD) | O | 기간 종료일 |
| gyogu_no | number | - | 교구 번호 (없으면 전체) |
| team_no | number | - | 팀 번호 (없으면 전체, gyogu_no 필요) |
| is_imwondan | boolean | - | true 이면 임원단 필터 적용 |

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
  },
  "top_gyogu": {
    "gyogu_name": "1교구",
    "present": 36
  }
}
```

---

### 2-2. 출석 인원 추이

```
GET /api/attendance/dashboard/trend
```

| 항목 | 내용 |
|------|------|
| 설명 | 기간 단위별(주간/월간/연간) 출석 인원 시계열 데이터 |
| 사용 화면 | 출석 대시보드 > ① 출석 인원 추이 (LineChart) |

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| period_unit | `weekly` \| `monthly` \| `yearly` \| `custom` | O | 집계 단위 |
| start_date | string (YYYY-MM-DD) | O | 기간 시작일 |
| end_date | string (YYYY-MM-DD) | O | 기간 종료일 |
| gyogu_no | number | - | 교구 번호 |
| team_no | number | - | 팀 번호 |
| is_imwondan | boolean | - | 임원단 필터 |

**Response**
```json
[
  { "period": "1/4",  "present": 71 },
  { "period": "1/11", "present": 67 },
  { "period": "1/18", "present": 74 }
]
```

> `period` 포맷: weekly → `M/D`, monthly → `N월`, yearly → `YYYY년`

---

### 2-3. 차원별 출석 인원

```
GET /api/attendance/dashboard/dimension
```

| 항목 | 내용 |
|------|------|
| 설명 | 선택한 차원(교구/팀/기수/성별/직분)별 출석 인원 |
| 사용 화면 | 출석 대시보드 > ② 차원별 출석 인원 (BarChart, 드롭박스) |

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| dimension | `gyogu` \| `team` \| `generation` \| `gender` \| `leader` | O | 집계 차원 |
| start_date | string | O | |
| end_date | string | O | |
| gyogu_no | number | - | |
| team_no | number | - | |
| is_imwondan | boolean | - | |

**Response**
```json
[
  { "name": "1교구", "present": 36 },
  { "name": "2교구", "present": 28 },
  { "name": "3교구", "present": 18 },
  { "name": "임원단", "present": 12 }
]
```

---

### 2-4. 결석사유 분포

```
GET /api/attendance/dashboard/absent-reason
```

| 항목 | 내용 |
|------|------|
| 설명 | 결석 인원의 사유별 건수 |
| 사용 화면 | 출석 대시보드 > ③ 결석사유 분포 (Donut PieChart) |

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| start_date | string | O | |
| end_date | string | O | |
| gyogu_no | number | - | |
| team_no | number | - | |
| is_imwondan | boolean | - | |

**Response**
```json
[
  { "reason": "학교/학원", "count": 28 },
  { "reason": "알바",     "count": 22 },
  { "reason": "회사",     "count": 15 },
  { "reason": "개인일정",  "count": 18 },
  { "reason": "가족모임",  "count": 10 },
  { "reason": "아픔",     "count": 5  },
  { "reason": "기타",     "count": 2  }
]
```

---

### 2-5. 교구별 출석/결석 현황

```
GET /api/attendance/dashboard/gyogu-status
```

| 항목 | 내용 |
|------|------|
| 설명 | 교구별 출석/결석 인원 Stacked 데이터 |
| 사용 화면 | 출석 대시보드 > ④ 교구별 출석 현황 (Stacked BarChart) |

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| start_date | string | O | |
| end_date | string | O | |
| gyogu_no | number | - | 없으면 전체 교구 |
| is_imwondan | boolean | - | |

**Response**
```json
[
  { "name": "1교구", "present": 36, "absent": 10 },
  { "name": "2교구", "present": 28, "absent": 11 },
  { "name": "3교구", "present": 18, "absent": 6  },
  { "name": "임원단", "present": 12, "absent": 2  }
]
```

---

## 3. 출석 관리

### 3-1. 출석 대상 멤버 + 출석 기록 조회

```
GET /api/attendance/records
```

| 항목 | 내용 |
|------|------|
| 설명 | 특정 날짜 + 필터 조건에 해당하는 멤버 목록과 해당 주차 출석 여부 반환 |
| 사용 화면 | 출석 관리 > 테이블 조회 |

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| worship_date | string (YYYY-MM-DD) | O | 예배 날짜 (토요일) |
| gyogu_no | number | O | 교구 번호 (또는 `imwondan`) |
| team_no | number | - | 팀 번호 |
| group_no | number | - | 그룹 번호 |
| is_imwondan | boolean | - | 임원단 필터 |
| page | number | - | 페이지 (0-based) |
| size | number | - | 페이지당 건수 |

**Response**
```json
{
  "total_count": 45,
  "items": [
    {
      "member_id": 1,
      "name": "김민서",
      "generation": "37기",
      "leader_names": ["팀장"],
      "gyogu": 1,
      "team": 1,
      "group_no": 1,
      "status": "PRESENT",
      "absent_reason": null
    }
  ]
}
```

---

### 3-2. 출석 기록 일괄 저장

```
POST /api/attendance/records/batch
```

| 항목 | 내용 |
|------|------|
| 설명 | 변경된 출석 기록만 추려서 일괄 저장 (upsert) |
| 사용 화면 | 출석 관리 > 저장 버튼 |

**Request Body**
```json
{
  "worship_date": "2026-03-15",
  "records": [
    {
      "member_id": 1,
      "status": "ABSENT",
      "absent_reason": "학교/학원"
    },
    {
      "member_id": 5,
      "status": "PRESENT",
      "absent_reason": null
    }
  ]
}
```

**Response**
```json
{ "saved_count": 2 }
```

> 기존에 해당 `(member_id, worship_date)` 레코드가 있으면 UPDATE, 없으면 INSERT (upsert).

---

## 4. 사용자 목록

### 4-1. 교적 목록 조회

```
GET /api/members
```

| 항목 | 내용 |
|------|------|
| 설명 | 활성 멤버 목록 조회 (필터 + 검색 + 페이징) |
| 사용 화면 | 사용자 목록 > 테이블 |

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| year | number | - | 연도 (member_profile.year 기준) |
| gyogu_no | number | - | 교구 번호 |
| team_no | number | - | 팀 번호 |
| group_no | number | - | 그룹 번호 |
| generation | number | - | 기수 |
| search_field | string | - | 검색 대상 필드 (`name`, `phone`, `pid` 등) |
| keyword | string | - | 검색어 |
| page | number | - | 페이지 (0-based) |
| size | number | - | 페이지당 건수 |

**Response**
```json
{
  "total_count": 109,
  "items": [
    {
      "id": 1,
      "year": "2026",
      "parish": "1교구",
      "team": "1팀",
      "group": "1그룹",
      "name": "김민서",
      "gender": "여",
      "generation": "37기",
      "phone": "010-1234-5678",
      "birth_date": "1998-01-01",
      "role": "그룹장",
      "created_at": "2026-02-10",
      "member_type": "토요예배",
      "attendance_grade": "A",
      "plt_completed": "수료",
      "school_work": "연세대학교",
      "major": "경영학",
      "pid": "10021"
    }
  ]
}
```

---

### 4-2. 교적 추가

```
POST /api/members
```

| 항목 | 내용 |
|------|------|
| 설명 | 신규 멤버 등록 |
| 사용 화면 | 사용자 목록 > 교적 추가 모달 |

**Request Body**
```json
{
  "name": "홍길동",
  "generation": 46,
  "gender": "남",
  "phone": "010-0000-0000",
  "birth_date": "2005-03-15",
  "gyogu_no": 1,
  "team_no": 2,
  "group_no": 3,
  "leader_ids": [2],
  "member_type": "토요예배",
  "attendance_grade": "A",
  "plt_completed": "수료",
  "school_work": "한양대학교",
  "major": "경제학",
  "pid": ""
}
```

**Response**
```json
{ "member_id": 110 }
```

---

### 4-3. 교적 수정

```
PUT /api/members/{member_id}
```

| 항목 | 내용 |
|------|------|
| 설명 | 멤버 정보 수정 |
| 사용 화면 | 사용자 목록 > 교적 수정 모달 |

**Request Body** : 4-2와 동일 구조

**Response**
```json
{ "member_id": 1 }
```

---

### 4-4. 교적 삭제 (Soft Delete)

```
DELETE /api/members
```

| 항목 | 내용 |
|------|------|
| 설명 | 선택한 멤버 소프트 삭제 (삭제 사유 포함) |
| 사용 화면 | 사용자 목록 > 교적 삭제 팝업 |

**Request Body**
```json
{
  "member_ids": [1, 2, 3],
  "delete_reason": "본인 요청"
}
```

**Response**
```json
{ "deleted_count": 3 }
```

> DB에서 실제 삭제하지 않고 `deleted_at`, `deleted_reason` 컬럼에 기록 (Soft Delete).

---

## 5. 삭제 명단

### 5-1. 삭제 멤버 목록 조회

```
GET /api/members/deleted
```

| 항목 | 내용 |
|------|------|
| 설명 | Soft Delete된 멤버 목록 조회 (필터 + 검색 + 페이징) |
| 사용 화면 | 삭제 명단 > 테이블 |

**Query Params** : 4-1과 동일 + 추가 항목

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| deleted_from | string (YYYY-MM-DD) | 삭제일 범위 시작 |
| deleted_to | string (YYYY-MM-DD) | 삭제일 범위 종료 |

**Response**
```json
{
  "total_count": 12,
  "items": [
    {
      "id": 101,
      "year": "2026",
      "parish": "1교구",
      "team": "1팀",
      "group": "1그룹",
      "name": "김민서",
      "gender": "여",
      "generation": "37기",
      "phone": "010-1234-5678",
      "birth_date": "1998-01-01",
      "role": "그룹장",
      "created_at": "2026-02-10",
      "member_type": "토요예배",
      "attendance_grade": "A",
      "plt_completed": "수료",
      "school_work": "연세대학교",
      "major": "경영학",
      "pid": "10021",
      "deleted_at": "2026-03-01T10:12:33",
      "deleted_reason": "본인 요청"
    }
  ]
}
```

---

### 5-2. 삭제 멤버 상세 조회

```
GET /api/members/deleted/{member_id}
```

| 항목 | 내용 |
|------|------|
| 설명 | 삭제된 특정 멤버 상세 정보 |
| 사용 화면 | 삭제 명단 > 행 클릭 시 상세 모달 |

**Response** : 5-1 items 단건과 동일 구조

---

### 5-3. 교적 복원

```
POST /api/members/restore
```

| 항목 | 내용 |
|------|------|
| 설명 | 삭제된 멤버를 활성 상태로 복원 (`deleted_at`, `deleted_reason` 초기화) |
| 사용 화면 | 삭제 명단 > 교적 복원 버튼 / 상세 모달 복원 버튼 |

**Request Body**
```json
{
  "member_ids": [101, 102]
}
```

**Response**
```json
{ "restored_count": 2 }
```

---

## 요약 테이블

| 화면 | Method | Endpoint | 설명 |
|------|--------|----------|------|
| 공통 | GET | `/api/meta/leaders` | 직분 목록 |
| 출석 대시보드 | GET | `/api/attendance/dashboard/kpi` | KPI 4종 집계 |
| 출석 대시보드 | GET | `/api/attendance/dashboard/trend` | 출석 인원 추이 |
| 출석 대시보드 | GET | `/api/attendance/dashboard/dimension` | 차원별 출석 인원 |
| 출석 대시보드 | GET | `/api/attendance/dashboard/absent-reason` | 결석사유 분포 |
| 출석 대시보드 | GET | `/api/attendance/dashboard/gyogu-status` | 교구별 출석/결석 |
| 출석 관리 | GET | `/api/attendance/records` | 출석 대상 멤버 + 출석 기록 조회 |
| 출석 관리 | POST | `/api/attendance/records/batch` | 출석 기록 일괄 저장 |
| 사용자 목록 | GET | `/api/members` | 교적 목록 조회 |
| 사용자 목록 | POST | `/api/members` | 교적 추가 |
| 사용자 목록 | PUT | `/api/members/{id}` | 교적 수정 |
| 사용자 목록 | DELETE | `/api/members` | 교적 삭제 (Soft Delete) |
| 삭제 명단 | GET | `/api/members/deleted` | 삭제 멤버 목록 |
| 삭제 명단 | GET | `/api/members/deleted/{id}` | 삭제 멤버 상세 |
| 삭제 명단 | POST | `/api/members/restore` | 교적 복원 |

---

*작성일: 2026-03-15*
