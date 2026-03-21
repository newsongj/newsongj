# Backend 명명 규칙 (Naming Convention)

이 프로젝트의 백엔드 코드에서 사용하는 네이밍 규칙을 정리한 문서.
새 기능 추가 시 이 규칙을 따를 것.

---

## 1. 파일명

| 계층 | 위치 | 규칙 | 예시 |
|------|------|------|------|
| API 라우터 | `api/v1/{도메인}/` | 복수형 | `members.py`, `records.py` |
| CRUD | `crud/` | 복수형 | `members.py` |
| 서비스 | `services/` | 복수형 | `members.py` |
| 스키마 | `schemas/` | 복수형 | `members.py` |
| 모델 | `models/` | `__init__.py`에 통합 | `__init__.py` |

---

## 2. 함수명 (snake_case)

### API 라우터 — CRUD 동사 통일

| 동작 | 함수명 패턴 | 예시 |
|------|------------|------|
| 목록 조회 | `list_{대상}s` | `list_members` |
| 조건부 목록 | `list_{조건}_{대상}s` | `list_deleted_members` |
| 단건 조회 | `get_{대상}` | `get_member` |
| 생성 | `create_{대상}` | `create_member` |
| 수정 | `update_{대상}` | `update_member` |
| 삭제 | `delete_{대상}` | `delete_member` |
| 복원 | `restore_{대상}` | `restore_member` |

### CRUD 계층 — API와 동일한 동사

| 동작 | 함수명 패턴 | 예시 |
|------|------------|------|
| 목록 조회 | `get_{대상}s` | `get_members` |
| 조건부 목록 | `get_{조건}_{대상}s` | `get_deleted_members` |
| 생성 | `create_{대상}` | `create_member` |
| 수정 | `update_{대상}` | `update_member` |
| 삭제 | `delete_{대상}` | `delete_member` |
| 복원 | `restore_{대상}` | `restore_member` |

> CRUD와 API에서 같은 이름이 충돌할 경우 import alias 사용:
> ```python
> from app.crud.members import create_member as crud_create_member
> ```

### 서비스 계층

| 구분 | 함수명 패턴 | 예시 |
|------|------------|------|
| 공개 함수 (외부 호출용) | `build_{결과물}` | `build_member_response`, `build_member_list` |
| 내부 함수 (파일 내에서만) | `_동사_{대상}` | `_to_member_response`, `_get_leader_map` |

> `_` 접두사 = 내부 전용 함수. 다른 파일에서 import하지 않는다.

---

## 3. 클래스명 (PascalCase)

### Pydantic 스키마 — `{도메인}{용도}` 패턴

| 용도 | 네이밍 패턴 | 예시 |
|------|------------|------|
| 응답 | `{도메인}Response` | `MemberResponse` |
| 생성 요청 | `{도메인}Create` | `MemberCreate` |
| 수정 요청 | `{도메인}Update` | `MemberUpdate` |
| 삭제 요청 | `{도메인}DeleteRequest` | `MemberDeleteRequest` |
| 목록 응답 | `{도메인}ListResponse` | `MemberListResponse` |
| 페이지네이션 | `PageMeta` | `PageMeta` |
| ID만 반환 | `{도메인}IdResponse` | `MemberIdResponse` |

### SQLAlchemy 모델 — 테이블명과 일치 (PascalCase)

| 테이블 | 클래스명 | 예시 |
|--------|---------|------|
| `member` | `Member` | `Member` |
| `member_profile` | `MemberProfile` | `MemberProfile` |
| `leader` | `Leader` | `Leader` |
| `attendance_record` | `AttendanceRecord` | `AttendanceRecord` |

---

## 4. 변수명 (snake_case)

| 종류 | 규칙 | 예시 |
|------|------|------|
| DB 세션 | `db` | `db: Session` |
| 요청 본문 | `body` | `body: MemberCreate` |
| 단건 ORM 객체 | 모델명 소문자 | `member`, `profile` |
| 목록 ORM 결과 | `rows` | `rows = query.all()` |
| 전체 개수 | `total` | `total = query.count()` |
| 페이지 번호 | `page` | `page: int` |
| 페이지 크기 | `page_size` | `page_size: int` |
| 딕셔너리 맵 | `{대상}_map` | `leader_map` |

---

## 5. 프로젝트 구조 요약

```
backend/app/
├── api/v1/{도메인}/    # 라우터: 파라미터 파싱 + service 호출만
├── services/           # 비즈니스 로직: ORM → 스키마 변환, 데이터 가공
├── crud/               # 순수 DB 조작: 쿼리, 필터, commit
├── schemas/            # Pydantic 스키마: 요청/응답 정의
├── models/             # SQLAlchemy 모델: 테이블 정의
└── core/               # 설정, DB 연결, 미들웨어
```

각 계층은 **아래 계층만 호출** 가능:
```
api → services → crud → models
         ↓
      schemas
```
