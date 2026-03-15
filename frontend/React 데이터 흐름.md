# React 데이터 흐름 - 백엔드 통신 구조

## 1. 전체 흐름 개요

프론트엔드에서 백엔드로 데이터를 요청하고 받아오는 흐름은 아래 4단계 레이어로 구성됩니다.

```
[페이지 컴포넌트]
      ↓ 훅 호출 (함수 실행)
[커스텀 훅 - hooks/]
      ↓ API 함수 호출
[API 함수 - api/]
      ↓ HTTP 요청 (Axios)
[api/client.ts - Axios 인스턴스]
      ↓ 실제 네트워크 통신
[백엔드 서버 - FastAPI]
```

각 레이어는 역할이 명확히 분리되어 있습니다.

| 레이어 | 위치 | 역할 |
|--------|------|------|
| 페이지 컴포넌트 | `apps/pages/` | UI 렌더링, 사용자 이벤트 처리 |
| 커스텀 훅 | `hooks/` | 비즈니스 로직, 상태(Recoil) 관리 |
| API 함수 | `api/` | 엔드포인트별 함수 정의, 타입 지정 |
| Axios 클라이언트 | `api/client.ts` | 실제 HTTP 요청, 인증 처리 |

---

## 2. Axios 클라이언트 (`api/client.ts`)

모든 HTTP 통신의 기반이 되는 파일입니다.

### 인증 토큰 자동 첨부 (Request Interceptor)

모든 요청이 나가기 전에 브라우저 쿠키에서 토큰을 꺼내 헤더에 자동으로 붙입니다.

```
요청 발생
  → 쿠키에서 access_token 꺼내기
  → Authorization: Bearer {토큰} 헤더 추가
  → 백엔드로 전송
```

### 응답 에러 자동 처리 (Response Interceptor)

| 상황 | 처리 방식 |
|------|----------|
| 401 응답 (토큰 만료/무효) | 쿠키 토큰 삭제 → `/login`으로 강제 이동 |
| 400 응답 + `detail` 필드 | 백엔드 에러 메시지를 그대로 `throw` |

### 공통 헬퍼 함수

```typescript
get<T>(url, params)   // GET  - 쿼리스트링으로 params 전달
post<T>(url, data)    // POST - body에 data 전달
put<T>(url, data)     // PUT  - body에 data 전달
del<T>(url, data)     // DELETE
```

### 환경변수 설정 (`.env`)

```env
VITE_ENABLE_BACKEND=true     # false면 mock 데이터 사용 (로컬 개발용)
VITE_API_URL=http://...      # 백엔드 서버 주소
```

`VITE_API_URL`이 없으면 Vite 개발 서버의 프록시 기능을 사용합니다.
`/api` 경로로 오는 요청을 자동으로 `http://localhost:8000`으로 포워딩해 CORS 문제를 우회합니다.

### 토큰 저장 방식 (`utils/auth.ts`)

```
로그인 성공 → access_token 쿠키 저장 (1시간 만료, SameSite: strict)
로그아웃 or 401 → 쿠키 삭제
```

---

## 3. API 파일 목록 (`api/`)

도메인별로 파일이 분리되어 있습니다.

| 파일 | 담당 | 주요 엔드포인트 |
|------|------|----------------|
| `auth.ts` | 인증 | `POST /api/v1/local/login`, `GET /api/v1/me`, `POST /api/v1/logout`, `PUT /api/v1/password` |
| `user.ts` | 시스템 사용자 CRUD | `GET /api/v1/users`, `POST /api/v1/users`, `PUT /api/v1/users/{id}`, `DELETE /api/v1/users/{id}` |
| `admin.ts` | 교인 명부 조회/검색 | `GET /api/v1/users`, `GET /api/v1/users/search` |
| `role.ts` | 역할/권한 CRUD | `GET /api/v1/roles`, `POST /api/v1/roles`, `PUT /api/v1/roles/{id}`, `DELETE /api/v1/roles` |
| `department.ts` | 부서 목록 | `GET /api/v1/departments`, `GET /api/v1/departments/admin` |
| `dashboard.ts` | 대시보드 통계 | `GET /api/v1/dashboard/*` (총 사용량, 응답시간, 차트, 키워드 등) |

---

## 4. 실전 예시 - 사용자 관리 API 전체 흐름

사용자 관리 페이지(`/permission/users`)를 예시로 데이터가 어떻게 오가는지 단계별로 설명합니다.

---

### 4-1. 사용자 목록 조회 (GET)

#### 흐름

```
UserManagementPage
  → useEffect 실행 → loadUsers(1, 10) 호출
    → fetchUsers(1, 10) 호출 (api/user.ts)
      → GET /api/v1/users?page=1&pageSize=10
        → 백엔드 응답
      → Page<UserResponse> 타입으로 반환
    → Recoil usersState에 저장
  → DataTable 컴포넌트에 데이터 전달 → 화면 렌더링
```

#### 프론트 → 백엔드 (Request)

```
GET /api/v1/users?page=1&pageSize=10
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 백엔드 → 프론트 (Response)

```json
{
  "items": [
    {
      "user_idx": 1,
      "name": "홍길동",
      "email": "hong@example.com",
      "auth_mode": "LOCAL",
      "status": "active",
      "rank": "팀장",
      "dept_name": "청년부",
      "roles": ["사용자 관리", "권한 관리"]
    },
    {
      "user_idx": 2,
      "name": "김철수",
      "email": "kim@example.com",
      "auth_mode": "SSO",
      "dept_name": "대학부",
      "roles": ["사용자 관리"]
    }
  ],
  "meta": {
    "current_page": 1,
    "page_size": 10,
    "total_items": 42
  }
}
```

#### TypeScript 타입 정의

```typescript
// models/common.types.ts
interface Page<T> {
  items: T[];           // 실제 데이터 배열
  meta: PageMeta;       // 페이지네이션 메타 정보
}

interface PageMeta {
  current_page: number; // 현재 페이지 번호
  page_size: number;    // 페이지당 항목 수
  total_items: number;  // 전체 항목 수
}

// models/user.types.ts
interface UserResponse {
  user_idx: number;     // 사용자 고유 ID
  name: string;         // 이름
  email: string;        // 이메일
  auth_mode: string;    // 로그인 방식 (LOCAL / SSO)
  status?: string;      // 활성 상태
  rank?: string;        // 직급
  dept_name: string;    // 부서명
  roles: string[];      // 할당된 역할 목록
}
```

---

### 4-2. 사용자 검색 (GET with 쿼리스트링)

#### 프론트 → 백엔드 (Request)

이름으로 "홍길동" 검색 시:

```
GET /api/v1/users/search?field=name&keyword=홍길동&page=1&pageSize=10
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 백엔드 → 프론트 (Response)

검색 결과도 동일한 `Page<UserResponse>` 형식으로 반환됩니다.

---

### 4-3. 사용자 생성 (POST)

#### 흐름

```
UserCreateModal → 폼 제출
  → createNewUser(userData) 호출 (useUserManagement 훅)
    → createUser(userData) 호출 (api/user.ts)
      → POST /api/v1/users (body에 JSON 전달)
        → 백엔드 응답
      → UserCreateResponse 타입으로 반환
    → 성공 시 loadUsers()로 목록 새로고침
  → Snackbar로 성공/실패 메시지 표시
```

#### 프론트 → 백엔드 (Request)

```
POST /api/v1/users
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json

Body:
{
  "name": "이영희",
  "email": "lee@example.com",
  "password": "SecurePass123!",
  "dept_name": "대학부",
  "role_names": ["사용자 관리"]
}
```

#### TypeScript 타입 정의

```typescript
// models/user.types.ts
interface UserCreateRequest {
  name: string;           // 이름 (필수)
  email: string;          // 이메일 (필수)
  password: string;       // 초기 비밀번호 (필수)
  dept_name: string;      // 부서명 (필수)
  role_names?: string[];  // 역할 이름 목록 (선택)
}
```

#### 백엔드 → 프론트 (Response)

```json
{
  "success": true,
  "message": "사용자가 성공적으로 생성되었습니다."
}
```

#### TypeScript 타입 정의

```typescript
// models/user.types.ts
interface UserCreateResponse {
  success: boolean;
  message: string;
}
```

---

### 4-4. 사용자 수정 (PUT)

#### 프론트 → 백엔드 (Request)

user_idx = 1인 사용자의 부서와 역할 변경 시:

```
PUT /api/v1/users/1
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json

Body:
{
  "dept_name": "청년부",
  "role_names": ["사용자 관리", "권한 관리"]
}
```

#### TypeScript 타입 정의

```typescript
// models/user.types.ts
interface UserUpdateRequest {
  password?: string;      // 변경할 비밀번호 (선택)
  role_names?: string[];  // 변경할 역할 목록 (선택)
  dept_name?: string;     // 변경할 부서명 (선택)
}
```

#### 백엔드 → 프론트 (Response)

```json
{
  "success": true,
  "message": "사용자 정보가 수정되었습니다."
}
```

---

### 4-5. 사용자 삭제 (DELETE)

#### 프론트 → 백엔드 (Request)

user_idx = 1인 사용자 삭제 시:

```
DELETE /api/v1/users/1?user_idx=1
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 백엔드 → 프론트 (Response)

```json
{
  "success": true,
  "message": "사용자가 삭제되었습니다."
}
```

---

## 5. 에러 처리 흐름

### 에러 종류별 처리

| 상황 | 백엔드 응답 | 프론트 처리 |
|------|------------|-----------|
| 토큰 만료 | `401 Unauthorized` | 쿠키 삭제 + `/login` 강제 이동 |
| 잘못된 요청 | `400 Bad Request` + `{ "detail": "..." }` | interceptor가 메시지를 `Error`로 변환 후 throw |
| 서버 오류 | `500 Internal Server Error` | 훅에서 catch → Snackbar 에러 메시지 표시 |

### 400 에러 메시지 처리 예시

```
백엔드: { "detail": "이미 존재하는 이메일입니다." }
  → interceptor: new Error("이미 존재하는 이메일입니다.") throw
    → 훅의 catch 블록에서 포착
      → Snackbar에 "이미 존재하는 이메일입니다." 표시
```

---

## 6. 공통 응답 포맷 정리

### 목록 조회 (페이지네이션 포함)

```json
{
  "items": [...],
  "meta": {
    "current_page": 1,
    "page_size": 10,
    "total_items": 100
  }
}
```

### 단건 생성/수정/삭제

```json
{
  "success": true,
  "message": "처리 결과 메시지"
}
```

### 대시보드 통계

```json
{
  "success": true,
  "message": "",
  "data": {
    "value": 42
  }
}
```

### 에러

```json
{
  "detail": "에러 내용 설명"
}
```
