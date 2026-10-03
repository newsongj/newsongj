# 소견서 — 사용자 페이지 API 명세

이 문서는 **소견서 사용자(작성) 페이지**의 백엔드 API 스펙이다.
확정된 요구사항과 API 계약을 정리한 것으로, 화면은 아직 만들지 않았다.

> **관리자 페이지 명세는 `OPINION_ADMINPAGE_APISPEC.md`** 다 (별도 문서).

## 개요

팀장·그룹장이 담당 지체의 소견서를 작성하는 사용자 페이지.
`client/frontend` (Vite + React + TypeScript + MUI v7 + styled-components).
관리자 페이지(`frontend`)와 동일한 디자인 토큰·컴포넌트 체계를 공유한다.

- **라우트**: `/opinion`
- **권한키**: `user.opinion`
- **파일**: `client/frontend/src/pages/OpinionPage/OpinionPage.tsx`

관리자 화면 문서는 `frontend/md/14~17_*.md`, 전체 작업 현황은 `opinion_todo.md`.

---

## 구현 현황

| | 상태 |
|---|------|
| 화면 (`client/frontend/src/pages/OpinionPage`) | ✅ 완료 — **목데이터로 동작** |
| `GET /api/opinion/my-targets` | ❌ **미구현** |
| `GET /api/opinion/my-reports/:memberId` | ❌ **미구현** |
| `PUT /api/opinion/my-reports/:memberId` | ❌ **미구현** |
| 테이블 | ✅ 전부 생성 완료 (새로 만들 것 없음) |

프론트는 `client/frontend/src/api/opinion.ts` 에서 목을 반환한다.
각 함수의 주석 처리된 `apiClient` 호출로 바꾸면 그대로 붙는다 — 화면 코드는 손댈 게 없다.

---

## 0. 공통 — 먼저 알아야 할 것

### 0-1. 쓰는 테이블 — 관리자와 **같은 DB** 를 본다

이 화면에서 저장한 내용이 곧 관리자 화면에 뜬다. 별도 테이블이 아니다.

| 테이블 | 이 화면이 하는 일 | 관리자 쪽에서 보이는 곳 |
|--------|-------------------|--------------------------|
| `member_opinion_report` | 소견 내용 **읽기 · upsert** | 현황 대시보드 명단 · 상세 모달 · PDF |
| `member_opinion_report_writer` | 저장할 때마다 **작성자 UPSERT** | 명단 「작성자」 칸 · PDF 작성자 블록 |
| `opinion_report_custom` | 회차 설정 **읽기 전용** (`theme` `guide_text` `end_date` `member_fields` `input_fields` `is_active` `is_open`) | 소견서 설정 화면에서 관리 |
| `opinion_report_mapping` | 임원단 대상자 산출 **읽기 전용** | 소견서 설정 화면에서 관리 |
| `member` · `member_profile` | 대상자·교적 항목 **읽기 전용** | 교적관리 |

전체 DDL 은 `OPINION_ADMINPAGE_APISPEC.md` §0-2 에 있다. **이 문서는 테이블을 새로 만들지 않는다.**

> **작성자 기록이 이 화면의 핵심 부수효과다.** 관리자 명단의 「작성자」는 파생이 아니라
> **여기서 저장한 사람**이 쌓인 결과다 (§3-3). 관리자가 대리 수정해도 작성자는 늘지 않는다.

### 0-1-1. 소견서 설정 → 이 화면에 미치는 영향

**관리자 「소견서 설정」에서 지정한 값이 거의 전부 이 화면을 결정한다.**
서버는 `opinion_report_custom` 한 행을 읽어 `my-targets` 응답에 실어 보내면 되고,
화면은 그걸 그대로 쓴다. 아래가 전부다.

| 설정 화면 항목 | 컬럼 | 사용자 화면에서 | 명세 |
|----------------|------|------------------|------|
| 작성 마감일 | `end_date` | 상단 **D-day** (`D-12` / `D-DAY` / `마감`) | §2-1 |
| 소견서 주제 | `theme` | 상단 **표어 배너** | §2-2 |
| 작성자 안내 문구 | `guide_text` | 상단 **가이드 문구**. PDF 에는 안 들어간다 | §2-3 |
| 교적 자동 기입 항목 | `member_fields` | 개인 소견서의 **읽기 전용** 교적 블록 | §3-1 · §3-2 |
| 작성자 직접 입력 항목 | `input_fields` | 개인 소견서의 **입력칸**. 켜진 것만 렌더 | §3-1 · §3-3 |
| 사용자 페이지 공개 | `is_open` | 닫히면 **「소견서 기간이 아닙니다」** 만 표시 | §2-5 |
| (팀배치 완료 시 자동) | `is_active` | 위와 동일하게 화면이 닫힌다 | §2-5 |
| 임원단 작성 매핑 | `opinion_report_mapping` | **대상자 산출**. `data_scope` 보다 **우선** | §3-1 |

> 설정이 바뀌면 이 화면도 바뀐다 — 항목을 끄면 입력칸이 사라지고, 마감일을 당기면
> D-day 가 줄고, 공개를 끄면 화면 자체가 닫힌다. **별도 배포 없이 반영된다.**

### 0-1-2. 대상자 산출 — 두 축이 있다

「누가 보이는가」는 **두 가지가 겹쳐서** 정해진다. 서버가 판정하며 화면은 관여하지 않는다.

```
① 임원단 매핑이 있는가?  →  예: opinion_report_mapping 의 대상자만  (data_scope 무시)
                            아니오: 소속 기준 (팀장=같은 팀 전원 / 그룹장=같은 그룹 직분 없는 팀원)
② 본인 제외              →  위 결과에서 **자기 자신은 언제나 뺀다**
```

- **기준은 직분이 아니라 매핑 유무다.** 임원단 직분이어도 매핑이 걸려 있지 않으면
  일반 리더처럼 소속 기준으로 동작한다 — 매핑 누락 때문에 빈 화면을 보는 일이 없게 한다
- **①이 배타다.** 매핑이 걸린 사람은 매핑 대상자만 보이고 자기 팀원은 안 보인다 (§3-1)
- **②는 두 경로 공통이다.** 자기 소견서를 자기가 쓸 수 없다. 임원단도 예외가 아니다
- 조회(`my-targets` · `my-reports`)와 저장(`my-reports` PUT) **양쪽에서** 걸러야 한다.
  조회만 막으면 `memberId` 를 직접 바꿔 호출하는 것을 못 잡는다 → **403** (§0-3)

### 0-2. 권한 · 인증

| | |
|---|---|
| 권한키 | `user.opinion` |
| 토큰 | 로그인 시 발급된 JWT. `Authorization: Bearer …` |
| 작성자 식별 | **토큰의 `member_id`** — 이름·전화번호로 다시 대조하지 않는다 |

**로그인은 리더 계정(`POST /api/auth/login`)으로 한다.** 수련회 인원조사·서스펜디드밀·환자방과
같은 경로이며, 소견서 전용 로그인은 따로 두지 않는다.

> **일반 멤버 로그인(`POST /api/auth/member-login`, 전화번호+이름)으로는 쓸 수 없다.**
> 이 토큰은 `menus = ["user.vehicle"]` · `data_scope = "member"` 로 발급되어
> `user.opinion` 이 없다 → **403**. 차량조사 전용 통로이고, 일반 멤버는 소견서
> 권한을 받을 일이 없다.
>
> 화면도 `/opinion` 을 **`PrivateRoute`**(리더용)로 감싼다 —
> 차량 페이지가 쓰는 `MemberPrivateRoute` 가 아니다.

### 0-3. 오류 코드

세 엔드포인트가 공통으로 쓴다.

| 코드 | 언제 | 화면 처리 |
|------|------|-----------|
| **403** | 회차가 닫혀 있음 (`exists && is_active && is_open` 중 하나라도 false) | 「소견서 기간이 아닙니다」만 표시 (§2-5) |
| **403** | 그 대상자가 내 담당이 아님 (§3-1 산출 결과에 없음) | 「담당 대상자가 아닙니다」 |
| **409** | 낙관적 잠금 충돌 | **폼을 닫지 않고** 최신 내용만 재조회 (§4) |
| **400** | 항목 화이트리스트 위반 · 길이 초과 | 해당 필드에 오류 표시 |

**403 은 프론트가 아니라 서버가 내야 한다.** 화면에서만 막으면 URL 직접 호출로 뚫린다.

### 0-4. 동시 편집

규칙은 관리자와 **완전히 같다** — `OPINION_ADMINPAGE_APISPEC.md` §0-4 참고.
조건부 UPDATE, 409 응답 형태(`current_updated_at` · `last_writer` · `is_self`),
`updated_at` 은 `DATETIME(3)`. 이 문서 §4 에 화면 동작만 따로 적는다.

---

## 1. 화면 흐름

```
[담당 대상자 목록]  →  [대상자 선택]  →  [소견서 작성/수정]  →  저장
       ↑                                                        │
       └────────────────────  작성 여부 갱신  ←──────────────────┘
```

소견서는 **대상자당 1건**이고 여러 작성자가 같은 건을 나눠 수정한다.
그룹장이 먼저 쓴 내용이 팀장 화면에 그대로 보이고, 팀장이 거기에 덧붙여 저장하는 형태다.
**새로 만드는 게 아니라 같은 레코드를 갱신**한다.

---

## 2. 화면 상단 — 확정 요구사항

### 2-1. D-day

작성 마감일까지 남은 일수를 상단에 표시한다.

| 상태 | 표시 |
|------|------|
| 마감 전 | `D-12` |
| 마감 당일 | `D-DAY` |
| 마감 지남 | `마감` |

**서버는 `end_date`만 내려주고 D-day는 프론트가 계산한다.**
서버가 계산해 내려주면 사용자가 화면을 열어둔 채 자정을 넘길 때 값이 틀어진다.

계산은 **KST 날짜 기준**이다. 관리자 쪽 `frontend/src/utils/kstDate.ts`와 같은 방식으로,
`Intl.DateTimeFormat(timeZone: 'Asia/Seoul')`로 오늘 날짜를 뽑고 문자열 비교로 처리한다.

> `toISOString()`으로 날짜를 만들면 KST 자정이 UTC 전날 15시가 되어 **하루 밀린다.**
> 수련회 출석 관리에서 실제로 발생했던 버그다 (`worship_date`가 토요일 대신 금요일로 저장됨,
> 커밋 `0ce06a2`에서 수정).

### 2-2. 소견서 주제

관리자가 설정에서 입력한 **주제(`theme`)** 를 화면 상단에 표어처럼 띄운다.
수련회 인원조사 사용자 화면에서 주제를 보여주는 방식과 같다.

- 최대 200자
- 값이 없으면 영역 자체를 렌더하지 않는다
- **PDF 머리말에도 같은 값이 쓰인다** — 두 곳이 같은 문구를 공유한다

### 2-3. 가이드 문구

관리자가 소견서 설정에서 입력한 **작성자 안내 문구(`guide_text`)** 를 화면 상단에 그대로 노출한다.

- 최대 500자
- 값이 없으면 영역 자체를 렌더하지 않는다
- **PDF에는 들어가지 않는다** — PDF 머리말은 `theme`(소견서 주제)가 담당한다

### 2-4. 표시하지 않는 것

**동반배치자(`companions`)는 사용자 화면에 노출하지 않는다.** 관리자 전용 정보다.
따라서 아래 API 응답에도 포함하지 않는다.

### 2-5. 닫힘 상태 — 「소견서 기간이 아닙니다」

화면이 열리는 조건은 셋을 모두 만족할 때다.

```
exists && is_active && is_open
```

| 값 | 닫히는 경우 |
|----|-------------|
| `exists` | 해당 연도 회차가 아직 생성되지 않음 |
| `is_active` | **팀배치에서 소견서 완료 처리됨** |
| `is_open` | 관리자가 설정 화면의 「사용자 페이지 공개 설정」에서 직접 닫음 |

하나라도 false면 작성 화면 대신 **「소견서 기간이 아닙니다」** 안내만 표시한다.
대상자 목록·입력 폼은 렌더하지 않는다.

**팀배치에서 소견서 완료 처리를 하면 `is_active`와 `is_open`이 함께 0이 되어 자동으로 닫힌다.**
관리자가 따로 끄지 않아도 된다.

> **서버도 같은 조건을 검사해야 한다.** `my-targets` / `my-reports` 양쪽에서 확인해
> 닫힌 회차면 **403**으로 막는다. 프론트만 막으면 URL 직접 호출로 우회된다.

---

## 3. API

### 3-1. 담당 대상자 목록

`GET /api/opinion/my-targets?report_year=2026`

로그인한 작성자가 담당하는 대상자 목록 + 회차 정보를 함께 반환한다.
작성 화면이 설정을 따로 조회하지 않아도 되게 하기 위함이다.

```json
{
  "report_year": 2026,
  "theme": "하나님의 열심이 이루시리라",
  "end_date": "2026-12-15",
  "guide_text": "담당 지체 한 분 한 분을 떠올리며 사실에 근거해 작성해 주세요.",
  "input_fields": [
    "current_status", "current_status_etc",
    "group_meeting_attendance_status",
    "sunday_morning_attendance_status",
    "sunday_evening_attendance_status",
    "next_year_plan", "next_year_plan_etc",
    "general_opinion", "special_opinion"
  ],
  "member_fields": ["name", "gender", "generation", "gyogu", "team", "group_no"],
  "targets": [
    {
      "member_id": 42,
      "name": "김민준",
      "gender": "남",
      "generation": 15,
      "gyogu": 3, "team": 1, "group_no": 2,
      "member_type": "토요예배",
      "is_written": true,
      "updated_at": "2026-11-05T14:20:00.482"
    }
  ]
}
```

| 필드 | 쓰임 |
|------|------|
| `end_date` | **D-day** 계산 (§2-1) |
| `theme` | **상단 주제(표어)** (§2-2) |
| `guide_text` | **상단 가이드 문구** (§2-3) |
| `input_fields` | 설정에서 켜둔 항목만 입력 폼에 렌더 |
| `member_fields` | 대상자 카드에 보여줄 교적 항목 |
| `targets[].is_written` | 목록에서 작성 완료/미작성 구분 |

**정렬** — `gyogu` → `team` → `group_no` → `name` 오름차순. 화면이 다시 정렬하지 않으므로
서버가 이 순서로 내려준다.

**담당자가 0명이어도 200 이다.** `targets: []` 로 내려주고 화면이
「담당 대상자가 없습니다」를 보여준다. 404 를 쓰지 않는다 — 회차는 정상이고
단지 배정이 없는 상태이기 때문이다.

#### 대상자 산출 — 두 경로, 단 **배타**

로그인한 사람이 볼 수 있는 대상자는 두 경로 중 **하나만** 적용된다.
산출 규칙은 `OPINION_ADMINPAGE_APISPEC.md` §2-1과 같다.

```
targets(로그인 사용자 U) =
    U 가 writer 인 매핑이 있으면  →  ② 그 매핑의 target 들
    U 가 팀장이면                →  ① 같은 팀 전원 (리더 포함, 매핑된 작성자 제외)
    U 가 그룹장이면              →  ① 같은 그룹의 직분 없는 팀원
  − U 자기 자신
```

**팀 안의 모든 리더는 팀장이 쓴다.** 그룹장에게는 직분 없는 팀원만 배정된다 —
그룹장이 같은 그룹의 다른 리더를 쓰지는 않는다. 그래서 **팀장의 소견서는
예정 작성자가 없다**(임원단 매핑이 따로 걸리지 않는 한).

> **합집합이 아니다.** 임원단 직분을 가진 사람은 소견서 화면에서 **임원단 자격이
> 우선**하고, `data_scope` 범위는 적용되지 않는다.
>
> 예) 김민준이 *1교구 3팀 팀장 + 임원단* 이라면 — 매핑에 걸린 대상자만 보이고
> 3팀 팀원은 보이지 않는다.
>
> **왜 배타인가** — 임원단 매핑은 「올해 이 사람이 누구를 쓰는가」를 조직이 직접
> 지정한 결과다. 여기에 `data_scope` 범위를 더하면 조직이 의도하지 않은 대상자가
> 섞여 들어가고, 작성 분량도 예측할 수 없게 된다.
>
> 조직상 다른 리더이면서 임원단인 경우는 **거의 없다** — 실무에서 드문 케이스지만
> 구현이 갈리는 지점이라 규칙을 확정해 둔다.

**판정 기준은 `opinion_report_mapping` 에 그 해(`report_year`) 행이 있는지**다.
직분이 아니다 — 임원단 직분이어도 매핑이 없으면 소속 경로를 탄다.

소속 비교에 쓰는 교구·팀·그룹은 `report_year` 시점 `member_profile` 스냅샷을 본다
(현재 `member_profile` 최신 행이 아니다). 팀배치가 매년 돌아 소속이 바뀌기 때문이다.

**① 일반 교구 — 팀장 / 그룹장**

**매핑에 작성자로 등록되지 않은** 사람에게 적용된다.

| 로그인 직분 | 대상자 |
|-------------|--------|
| 팀장 | 같은 교구·팀 **전원** (그룹장 등 리더 포함, 임원단 제외) |
| 그룹장 | 같은 교구·팀·그룹의 **직분 없는 팀원** |
| 직분 없음 | 없음 |

`user_account.data_scope` 와 대체로 겹치지만(`team` / `group`) **그대로 쓰지 않는다** —
그룹장의 `data_scope='group'` 는 같은 그룹 리더까지 포함하는데, 소견서에서는 리더를
팀장이 쓰기 때문이다. `data_scope` 는 **상한**으로만 보고 실제 산출은 위 표를 따른다.

> **⚠️ 수련회와 딱 하나 다르다 — 본인은 목록에 나오지 않는다.**
> 수련회 명단은 본인을 포함하지만, 소견서는 **자기 소견서를 자기가 쓸 수 없다.**
> 팀장이 접속하면 **본인을 뺀** 그 팀의 모든 리더·팀원이 보여야 한다.
> 이 규칙은 **임원단 경로(②)에도 똑같이 적용**된다.

**② 임원단 — `opinion_report_mapping`**

**매핑에 작성자로 등록된** 사람에게 적용되며, 이 경우 `data_scope`는 무시한다.

임원단은 조직이 매년 달라져 `data_scope` 로 표현할 수 없어 소견서 전용 매핑을 쓴다.
계정관리의 정책·데이터 범위와는 **무관한 별개 기능**이다.

**작성자 1명이 대상자 여러 명**을 맡는 구조다.

```sql
SELECT target_member_id
FROM opinion_report_mapping
WHERE report_year        = :report_year
  AND writer_member_id   = :login_member_id
  AND target_member_id  <> writer_member_id   -- 본인 제외 (방어)
```

> **⚠️ 임원단도 본인은 목록에 나오지 않는다.**
> 일반 교구와 동일한 규칙이다 — 자기 소견서를 자기가 쓸 수 없다.
> 매핑 저장 시에도 막지만(§`OPINION_ADMINPAGE_APISPEC.md` 1-2), 조회에서도 한 번 더 걸러낸다.

소속 비교는 **`report_year` 시점 프로필** 기준이어야 한다. 팀배치가 랜덤이라 매년 그룹장이 바뀐다.

### 3-2. 소견서 단건 조회

`GET /api/opinion/my-reports/:memberId?report_year=2026`

기존 내용을 불러와 이어서 수정하기 위한 조회다.

```json
{
  "member_id": 42,
  "report_year": 2026,
  "updated_at": "2026-11-05T14:20:00.482",
  "member": {
    "name": "김민준", "gender": "남", "generation": 15,
    "birthdate": "1999-03-14", "phone_number": "010-1234-5678",
    "gyogu": 3, "team": 1, "group_no": 2,
    "member_type": "토요예배", "attendance_grade": "A", "attendance_rate": 87.5,
    "plt_status": "수료", "leader_names": ["그룹장"],
    "school_work": "새노래대학교", "major": "신학과"
  },
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

**`member` 는 교적 항목 15개를 전부 담는다.**

작성 화면이 `member_fields` 에 켜진 항목을 **읽기 전용으로 모두** 보여주므로,
어떤 조합이 켜져 있든 값이 있어야 한다. 서버가 `member_fields` 를 보고 추려 보내도
되지만, **15개를 통째로 보내는 쪽을 권한다** — 설정이 바뀌어도 이 API 를 손댈 필요가 없다.

| 키 | 비고 |
|----|------|
| `name` `gender` `generation` `birthdate` `phone_number` | `member` 테이블 |
| `gyogu` `team` `group_no` `member_type` `attendance_grade` `plt_status` `school_work` `major` | `report_year` 시점 `member_profile` 스냅샷 |
| `attendance_rate` | 숫자(%). 화면이 `87.5%` 로 포맷한다 |
| `leader_names` | **배열**. 화면이 `, ` 로 이어 붙인다 |

- 아직 작성 전이면 소견 항목은 전부 `null`, `updated_at`도 `null`
- `updated_at`은 **낙관적 잠금 기준값**이므로 반드시 내려줘야 한다
- **`companions` / `writers`는 포함하지 않는다** (관리자 전용)

### 3-3. 소견서 저장

`PUT /api/opinion/my-reports/:memberId?report_year=2026`

```json
{
  "base_updated_at": "2026-11-05T14:20:00.482",
  "current_status": "신앙 성장 중",
  "general_opinion": "…"
}
```

**검증 — 순서대로**

1. **작성자-대상 배정 확인** — 요청자가 그 대상자의 `expected_writers`에 없으면 **403**
   (§3-1의 배타 규칙으로 산출)
2. **낙관적 잠금** — `base_updated_at`이 DB의 `updated_at`과 다르면 **409**
   (신규 작성이면 `null`. 그 사이 누가 먼저 만들었으면 역시 409)
3. **항목 화이트리스트** — 설정의 `input_fields`에 없는 키가 오면 무시하거나 400
4. **길이 제한** — 단답 7개는 **각 20자**, 전체소견·특별소견은 20,000자.
   단답은 DB 컬럼(100/255자)보다 지면 제약이 빡빡하다 — PDF 좌측 단 한 줄 분량이다
   (`frontend/src/models/opinion.types.ts` 의 `SHORT_INPUT_MAX_LENGTH`)

**저장 성공 시 — 작성자 기록 (같은 트랜잭션 안에서)**

```sql
INSERT INTO member_opinion_report_writer (opinion_report_id, writer_member_id)
VALUES (:report_id, :login_member_id)
ON DUPLICATE KEY UPDATE last_written_at = CURRENT_TIMESTAMP;
```

이 기록이 관리자 화면·PDF의 **작성자란**이 된다 (`OPINION_ADMINPAGE_APISPEC.md` §0-2).

저장 한 번으로 관리자 쪽 세 곳이 바뀐다.

```
member_opinion_report          →  명단의 「작성 여부」가 작성 완료로
                                  KPI(작성 완료 / 미작성 / 작성률) 재집계
member_opinion_report_writer   →  명단 「작성자」 칸에 이름이 뜬다
                                  (그 전까지는 expected_writers 가 회색 「(예정)」)
updated_at                     →  명단 「최종 수정일」
```

- `writer_member_id` 는 **로그인 토큰의 `member_id`** 를 그대로 쓴다.
  이름·전화번호로 교적을 다시 대조하지 않는다 — 동명이인과 전화번호 변경에 취약하고,
  로그인 시점에 이미 확정된 값이기 때문이다
- 팀장과 그룹장이 나눠 쓰면 두 줄이 쌓여 작성자가 두 명이 된다
- 관리자 대리 수정(`PUT /api/opinion/reports/:memberId`)은 이 테이블을 건드리지 않는다

응답: `200 OK`

> 1번이 관리자용(`OPINION_ADMINPAGE_APISPEC.md` §2-2)과의 결정적 차이다.
> 관리자는 아무 대상자나 편집할 수 있지만 사용자는 본인 담당만 가능하다.

---

## 4. 낙관적 잠금 — 사용자 페이지에서 특히 중요

작성자가 여럿이라 그냥 두면 나중에 저장한 사람이 앞사람 내용을 통째로 덮어쓴다.

```
09:00  그룹장이 김민준 소견서를 엶      → 화면에 "성실히 참여함"
09:05  팀장도 같은 소견서를 엶          → 화면에 "성실히 참여함"
09:10  그룹장이 크게 고쳐 저장          → DB: "올해 리더로 성장…"
09:15  팀장이 자기 화면 내용으로 저장    → DB: "성실히 참여함"  ← 그룹장 작업 소실
```

조회 시 받은 `updated_at`을 저장 요청에 `base_updated_at`으로 실어 보내고,
서버는 **그 값이 여전히 유효할 때만** 쓴다. 검사와 쓰기를 나누면 그 사이에 끼어들 수
있으므로 조건을 UPDATE 문 자체에 넣는다.

```sql
UPDATE member_opinion_report
   SET /* … */, updated_at = CURRENT_TIMESTAMP(3)
 WHERE opinion_report_id = :id
   AND updated_at = :base_updated_at;
```

`affected_rows = 0` 이면 **409**. 상세 규칙은 `OPINION_ADMINPAGE_APISPEC.md` §4 에 정리했다.

> **`updated_at` 은 `DATETIME(3)` 이다.** 응답의 밀리초를 자르지 말고 그대로
> 되돌려 보내야 한다 — 초 단위로 잘라 보내면 정상 저장이 409 로 거절된다
> (`OPINION_ADMINPAGE_APISPEC.md` §0-4-2).

**409를 받았을 때 화면 동작** — 관리자 상세 모달과 같은 방식으로 한다.

- **입력 화면을 닫지 않는다.** 닫으면 방금 쓴 내용을 전부 잃는다
- 응답의 `is_self` 로 문구를 가른다
  - `false` → `이서연 님이 방금 저장했습니다. 최신 내용을 불러왔습니다.`
  - `true` → `다른 탭에서 저장된 내용입니다. 최신 내용을 불러왔습니다.`
- 최신 내용만 다시 조회해 사용자가 비교·판단할 수 있게 한다
- 응답에 `current_updated_at` 이 함께 오므로 재조회 없이 곧바로 다음 저장의 기준으로 쓸 수 있다

### 여러 탭 / 동시 접속

작성 기간에는 팀장·그룹장이 **동시에 붙어 있는 게 정상**이고, 한 사람이 탭을 여러 개
띄우기도 한다. 서버 입장에서 둘은 구분되지 않으며 위 낙관적 잠금이 그대로 막는다.

같은 브라우저 안에서는 서버를 거치지 않고 바로 알릴 수 있다.

```ts
// 저장 성공 직후
new BroadcastChannel('opinion').postMessage({
  type: 'saved', member_id, report_year, updated_at,
});
```

- 같은 소견서를 열어 둔 다른 탭은 **저장을 시도하기 전에** 안내를 띄운다 — 409 를
  기다릴 필요가 없다
- 목록 화면도 이 신호로 「작성 완료」 표시를 맞춘다
- **정합성 장치가 아니라 편의 기능이다.** 미지원 브라우저에서는 무시해도 되며,
  서버 쪽 낙관적 잠금이 최종 방어선이다

목록 화면이 오래 열려 있으면 낡는다. 폴링 대신 **탭이 포커스를 되찾을 때
(`visibilitychange`)** 와 저장·409 직후에 재조회한다.

관리자 쪽 구현은 `frontend/src/apps/pages/OpinionDashboardPage.tsx`의 `handleSaveDetail` 참고.

---

## 5. 미정 사항

| 항목 | 내용 |
|------|------|
| **마감일 이후 저장 차단** | D-day가 `마감`이면 저장을 막을지 미정. 막는다면 **서버도 `end_date` 검증**이 필요하다 (프론트만 막으면 우회 가능) |
| **`current_status` / `next_year_plan` 선택지** | 목록 미확정이라 현재 자유 텍스트. 확정되면 `Select` + 「기타」 선택 시에만 `_etc` 활성화로 전환. 절차는 `opinion_todo.md` 「선택지 드롭박스 전환」 |
| 회차 미생성/완료 연도 접근 | `opinion_report_custom`이 없거나 `is_active = 0`인 연도에 사용자가 들어왔을 때의 처리 미정 |
| **연도 선택** | 현재 화면은 `report_year = 올해` 고정이다. 지난 회차를 읽기 전용으로 보여줄지 미정 |

---

## 6. 참고 — 관련 문서

| 문서 | 내용 |
|------|------|
| `OPINION_ADMINPAGE_APISPEC.md` | 관리자 API 전체 + DDL 8개 + 동시 편집 규칙 |
| `opinion_todo.md` | 작업 현황 · 확정 결정사항 · 남은 작업 |
| `frontend/md/14_opinion_settings.md` | 소견서 설정 화면 (`theme` / `guide_text` 용도 구분) |
| `frontend/md/15_opinion_dashboard.md` | 현황 대시보드 + PDF |
| `frontend/md/16_team_assignment.md` | 팀배치 작업 |
| `retreat_user_page.md` | 수련회 사용자 페이지 — 클라이언트 구조·공통 컴포넌트 참고 |
