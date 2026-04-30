# 프론트엔드 작업 요청 — 백엔드 변경사항 정리

> 안녕하세요. 최근 백엔드에서 변경된 사항과 그에 따라 프론트엔드 측에서 확인·반영 부탁드릴 작업을 정리했습니다.
> 위쪽에 작업 체크리스트를, 아래 §1~§3에 상세 근거를 두었습니다. 우선순위대로 진행해주시면 감사하겠습니다.

---

## 작업 체크리스트 (위에서부터 진행 권장)

### 1. `leader_ids` → `leader_names` 응답 모델 반영 (시급)
- [ ] `frontend/src/models/member.types.ts:16` — `leader_ids: string | null` 제거 후 `leader_names: string[]` 추가 부탁드립니다
- [ ] 사용자 목록 / 삭제 명단 / (신규) 새가족 목록 화면에서 `row.leader_ids` 파싱 코드를 `row.leader_names.join(", ")` 등으로 교체 부탁드립니다
- [ ] 요청(`POST`/`PUT`) body의 `leader_ids` 필드는 변경 없이 그대로 유지하시면 됩니다
- 📖 상세 근거: §1

### 1-B. `year` → `updated_at` 응답 필드 확인 부탁 (낮은 우선도)

> 백엔드 응답 필드가 `year` → `updated_at`으로 변경되었으나 프론트 쪽에는 아직 반영되지 않은 것으로 보입니다. 화면 영향 범위가 작아 보이지만 한 번 확인 부탁드립니다.

- [ ] `DeletedMemberPage.tsx:335` — 삭제 멤버 상세 모달에 `<TextField label="년도" value={detailTarget.year}>`가 있고, 현재 `'-'`로 표시되고 있습니다. 이 모달과 "년도" 칸이 실제 사용되는 정보인지 확인 후 처리 방향을 정해주시면 됩니다
  - 필요 시: `value={detailTarget.year}` → `value={detailTarget.updated_at}` (DisplayRow 매핑도 `item.updated_at`으로) 변경
  - 불필요 시: 라벨 제거
- [ ] `MemberListPage.tsx:41` / `DeletedMemberPage.tsx:42` / `NewFamilyMemberPage.tsx:72` — `mapToDisplayRow`에서 `year` 필드를 만들지만 테이블 columns 배열에 `year` 컬럼 정의가 없어 화면에 노출되지 않는 상태입니다. 원래 "년도" 컬럼이 의도적으로 빠진 것인지, 추가가 필요한지 확인 부탁드립니다
  - 필요 시: columns 배열에 `{ id: 'year', label: '년도', ... }` 추가 + 매핑을 `item.updated_at`으로
  - 불필요 시: `mapToDisplayRow`의 `year:` 라인과 DisplayRow 타입의 `year` 필드 정리
- [ ] `frontend/src/models/member.types.ts:20` — 응답 모델 `year: string | null`을 `updated_at: string | null`로 갱신 권장드립니다 (TypeScript 타입 정합성)
- [ ] 요청 파라미터 / UI 상태로 쓰는 `year`(`filters.year`, `useMembers.ts`의 `year: parseInt(...)`, `AttendancePage`의 `calendarView.year` 등)는 변경 없이 유지하시면 됩니다
- 📖 상세 근거: §1-B

### 2. 새가족 전용 API 클라이언트 함수 추가
- [ ] `frontend/src/api/member.ts`에 다음 함수들을 추가 부탁드립니다:
  - `fetchNewcomers(params)` → `GET /api/v1/gyojeok/members/newcomers`
  - `createNewcomer(body)` → `POST /api/v1/gyojeok/members/newcomers`
  - `updateNewcomer(id, body)` → `PUT /api/v1/gyojeok/members/newcomers/{id}`
  - `deleteNewcomer(id)` → `DELETE /api/v1/gyojeok/members/newcomers/{id}`
- [ ] 기존 `enrollMember(id, { enrolled_at, member_type? })` → `PUT /api/v1/gyojeok/members/{id}/enroll` 함수의 body에 `member_type` 옵션 인자만 추가해주시면 됩니다 (경로는 동일)
- 📖 상세 근거: §2

### 3. NewFamilyMemberPage 연결 + 일반 멤버 폼 점검
- [ ] `NewFamilyMemberPage`가 위 §2 함수들을 호출하도록 연결 부탁드립니다
- [ ] 새가족 추가/수정 폼에서 다음 4개 필드는 백엔드 `NewcomerCreate`가 받지 않으므로 제거 부탁드립니다:
  - `member_type` (백엔드가 `'새가족'`으로 자동 설정)
  - `leader_ids`
  - `plt_status`
  - `attendance_grade`
  → 새가족 요청 body는 `name, gender, generation, phone_number?, v8pid?, birthdate?, school_work?, major?, gyogu, team, group_no` 11개 필드입니다
- [ ] 일반 멤버 추가/수정 폼의 `member_type` 드롭다운에서 `'새가족'` 옵션 제거 부탁드립니다 (선택해서 보내면 400 에러)
- [ ] 일반 멤버 추가 폼의 validation 점검 부탁드립니다 — `gyogu` / `team` / `group_no` / `member_type` 4개는 모두 채우거나 모두 비워야 합니다 (1~3개만 채울 경우 422)
- [ ] 일반 사용자 목록 화면에 새가족이 더 이상 노출되지 않는지 확인 부탁드립니다 (이전에 새가족 row를 별도 표시하던 처리가 있다면 정리)
- 📖 상세 근거: §3

### 4. 데드 필드 정리 (선택 사항, 우선도 낮음)
- [ ] `frontend/src/models/auth.types.ts` — `LoginResponse.ticket` 필드는 백엔드 응답에 없고 프론트에서도 사용처가 0건이라 정리하시면 좋을 것 같습니다

---

## §1. `leader_ids` → `leader_names` (응답 형식 변경)

`GET /members`, `GET /members/deleted`, `GET /members/newcomers` 응답에서 `leader_ids` 필드가 더 이상 내려가지 않고 `leader_names: string[]`가 내려갑니다.

| 구분 | 이전 | 현재 |
|------|------|------|
| 응답 필드 | `leader_ids: string` (JSON 문자열, 예: `"[\"1\",\"3\"]"`) | `leader_names: string[]` (예: `["팀장", "그룹장"]`) — 리더 없으면 `[]` |
| 요청(`POST`/`PUT`) body 필드 | `leader_ids: string` | 변경 없음 — 여전히 `leader_ids` JSON 문자열로 전송 |

**핵심**: 요청은 ID로, 응답은 이름으로. 백엔드가 `leader_id → leader_name` 매핑을 미리 처리해서 내려드립니다. 프론트 쪽에서 별도 매핑 로직 없이 바로 표시 가능하실 겁니다.

**참고**: `attendance.types.ts`는 이미 `leader_names: string[]`로 반영되어 있습니다. `member.types.ts`만 갱신 부탁드립니다.

---

## §1-B. `year` → `updated_at` (응답 필드명 변경)

`MemberProfile`의 의미가 "연도 레이블"이 아니라 "소속 유효 시작일(date)"로 재정의되어 응답 필드명이 변경되었습니다.

| 구분 | 이전 | 현재 |
|------|------|------|
| 응답 필드 | `year: string` (예: `"2026-01-11"`) | `updated_at: string` (동일 형식, 같은 의미의 date) |
| 요청 파라미터 (`?year=2026`) | `year: int` | 변경 없음 — 여전히 연도 정수로 전송 |
| UI 상태 변수 (`filters.year`, `calendarView.year` 등) | — | 변경 없음 |

**핵심**: 요청 쿼리는 연도 int 그대로, 응답에서 읽는 필드만 `updated_at`으로 바꾸시면 됩니다.

### 현재 상태 (확인 부탁드립니다)
- `DeletedMemberPage.tsx:335` 상세 모달에 `<TextField label="년도" value={detailTarget.year}>`가 존재하고 현재 `'-'`로 표시됩니다. 이 모달과 칸이 실제 사용 중인지 판단 부탁드립니다
- 메인 테이블 3개(`MemberListPage`, `DeletedMemberPage`, `NewFamilyMemberPage`)는 `mapToDisplayRow`에서 `year` 필드를 만들지만 columns 배열에 `year` 컬럼 정의가 없어 화면에 노출되지 않습니다. 원래 의도가 어떤지 확인 부탁드립니다
- `member.types.ts`의 응답 모델은 옛 필드 `year`를 가지고 있어 TypeScript가 새 필드 `updated_at`을 인식하지 못하는 상태입니다 (위 결정과 무관하게 정합성을 위해 갱신 권장)

---

## §2. 새가족 전용 도메인 (신규 엔드포인트 5종)

| Method | Path | 설명 |
|--------|------|------|
| `GET`  | `/api/v1/gyojeok/members/newcomers` | 미등반 새가족 목록 |
| `POST` | `/api/v1/gyojeok/members/newcomers` | 새가족 추가 |
| `PUT`  | `/api/v1/gyojeok/members/newcomers/{member_id}` | 새가족 정보 수정 |
| `DELETE` | `/api/v1/gyojeok/members/newcomers/{member_id}` | 새가족 소프트 삭제 |
| `PUT`  | `/api/v1/gyojeok/members/{member_id}/enroll` | 새가족 → 일반 멤버 등반 처리 |

### 2-1. `POST /members/newcomers` — 새가족 추가
```json
// Request
{
  "name": "홍길동",
  "gender": "남",                  // '남' | '여'
  "generation": 21,
  "phone_number": "010-1234-5678", // optional
  "v8pid": null,                   // optional
  "birthdate": null,               // optional, "YYYY-MM-DD"
  "school_work": null,             // optional
  "major": null,                   // optional
  "gyogu": 1,
  "team": 1,
  "group_no": 1
}
// Response 201
{ "member_id": 3456 }
```
- `member_type`은 자동으로 `"새가족"`으로 저장됩니다 (요청에 포함하지 않으셔도 됩니다).
- `enrolled_at`은 등반 처리 전까지 `null`로 유지됩니다.

### 2-2. `PUT /members/newcomers/{id}` — 새가족 수정
- body 구조는 §2-1과 동일합니다.
- `member_type` 변경은 불가합니다.

### 2-3. `DELETE /members/newcomers/{id}` — 새가족 소프트 삭제
- body 없음.
- 대상이 새가족이 아닐 경우 404 응답입니다.

### 2-4. `PUT /members/{id}/enroll` — 등반 처리
```json
// Request
{
  "enrolled_at": "2026-05-04T10:00:00",  // 실제 등반 일시
  "member_type": "토요예배"               // optional, default "토요예배"
                                         // 가능: 토요예배|주일예배|래사랑|군지체|해외지체
}
// Response 200
{ "member_id": 3456 }
```

### 2-5. `GET /members/newcomers` — 새가족 목록
- 응답 형식은 `GET /members`와 동일합니다 (`MemberListResponse`).
- 쿼리 파라미터도 동일합니다: `year`(필수), `page`, `page_size`, `gyogu`, `team`, `group_no`, `generation`, `field`, `keyword`.

---

## §3. 일반 멤버 API 동작 변경 (Breaking)

`member_type='새가족'`인 사람은 일반 API에서 "없는 사람"으로 취급됩니다. 새가족 작업은 §2의 전용 도메인을 사용해주세요.

| 엔드포인트 | 변경 사항 |
|-----------|------|
| `GET /members` | 새가족 자동 제외 |
| `GET /members/deleted` | 최신 profile이 새가족인 멤버 제외 |
| `GET /members/deleted/{id}` | 대상이 새가족이면 404 |
| `POST /members` | `member_type='새가족'` 요청 시 **400** ("새가족은 미등반새가족 전용 API로 생성하세요.") |
| `PUT /members/{id}` | 대상이 새가족이면 **404** |
| `DELETE /members/{id}` | 대상이 새가족이면 **404** |
| `POST /members/restore/{id}` | 대상이 새가족이면 **404** |
| `GET /attendance/records` | 새가족 자동 제외 |
| `GET /attendance/dashboard` | 새가족 자동 제외 |
| `POST /attendance/records/batch` | 새가족 `member_id` 포함 시 **404** (`InvalidMemberIds`) |

---

## 참고

- 백엔드 회귀 테스트 통과 상태입니다: `pytest tests/` 15건 (새가족 정책 6 + 새가족 CRUD 9)
- Swagger에서 직접 호출해보실 수 있습니다: `/docs` → 우상단 `Authorize`에 토큰 입력 후 시도
- 진행 중 궁금한 점 있으시면 편하게 말씀해주세요.
