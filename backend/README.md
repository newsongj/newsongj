# 백엔드 구조 설명서

> "이 파일이 뭐하는 건지 모르겠다" 싶을 때 여기를 읽으세요.

---

## 전체 구조 한눈에 보기

```
backend/
├── app/                    ← 실제 서버 코드가 다 여기에 있음
│   ├── main.py             ← 서버 시작점 (여기서 FastAPI 앱이 켜짐)
│   │
│   ├── api/                ← 클라이언트(프론트)와 통신하는 창구
│   │   ├── deps.py         ← 공통으로 쓰는 의존성 모음 (DB 세션 등)
│   │   └── v1/             ← API 버전 1 (URL: /api/v1/...)
│   │       ├── gyojeok/       ← gyojeok 관련 API 엔드포인트
│   │       ├── retreat/    ← 수련회 관련 API 엔드포인트
│   │       └── authority/  ← 권한 관련 API 엔드포인트
│   │
│   ├── core/               ← 서버 전체에서 공통으로 쓰는 핵심 설정
│   │   ├── config.py       ← 환경변수, 앱 설정값 (JWT 키, 앱 이름 등)
│   │   ├── database.py     ← DB 연결 설정 (MariaDB 접속 주소, 세션 생성)
│   │   ├── security.py     ← 보안 관련 (비밀번호 암호화, JWT 토큰 처리)
│   │   └── middleware.py   ← 모든 요청에 공통 적용되는 처리 (CORS 등)
│   │
│   ├── models/             ← DB 테이블 구조 정의 (테이블 = 엑셀 시트라고 생각)
│   ├── schemas/            ← API 요청/응답 데이터 형식 정의 (뭘 받고 뭘 줄지)
│   ├── crud/               ← DB에서 데이터를 꺼내고 넣는 함수 모음
│   ├── services/           ← 복잡한 비즈니스 로직 (여러 crud를 조합하는 곳)
│   └── tests/              ← 자동화 테스트 코드
│
├── Dockerfile              ← 서버를 도커 컨테이너로 만드는 설계도
└── requirements.txt        ← 이 서버가 필요로 하는 파이썬 패키지 목록
```

---

## 폴더별 역할 쉽게 이해하기

### 요청이 들어왔을 때 흐름

```
프론트에서 API 요청
       ↓
  api/v1/gyojeok/     ← 1. 어떤 URL인지 여기서 받음
       ↓
  api/deps.py      ← 2. DB 세션 등 공통 준비
       ↓
  services/        ← 3. 실제 처리 로직 실행
       ↓
  crud/            ← 4. DB에서 데이터 읽기/쓰기
       ↓
  schemas/         ← 5. 응답 데이터 형식에 맞게 포장
       ↓
  프론트로 응답 반환
```

---

### `models/` — DB 테이블 설계도

"DB에 어떤 테이블이 있고, 컬럼이 뭔지" 정의하는 곳.

```python
# 예시: member 테이블
class Member(Base):
    name = Column(String)    # 이름
    gender = Column(Enum)    # 성별
    ...
```

현재 테이블: `member`, `member_profile`, `leader`, `attendance_record`

---

### `schemas/` — 요청/응답 형식 설계도

"프론트에서 뭘 보내야 하고, 백엔드가 뭘 돌려줄지" 정의하는 곳.
모델(DB 구조)과 다르게, **API 통신용 데이터 형식**만 담당함.

```python
# 예시: 멤버 생성 요청 형식
class MemberCreate(BaseModel):
    name: str
    gender: str
```

---

### `crud/` — DB 쿼리 함수 모음

"DB에서 데이터 가져와", "DB에 데이터 저장해" 같은 함수들.
SQL 직접 쓰는 대신 여기 함수를 호출함.

```python
# 예시
def get_member(db, member_id): ...
def create_member(db, data): ...
```

---

### `services/` — 비즈니스 로직

crud 함수들을 조합해서 실제 기능을 구현하는 곳.
예: "멤버 등록" = 멤버 생성 + 프로필 생성 + 리더 배정 → 이걸 하나로 묶는 곳.

---

### `core/database.py` — DB 연결

`.env` 파일의 접속 정보를 읽어서 MariaDB에 연결함.
`SessionLocal`을 통해 DB 세션을 만들고, `Base`로 테이블 구조를 등록함.

---

### `core/config.py` — 설정값

앱 이름, JWT 비밀키, 토큰 만료 시간 같은 설정값들.
`.env` 파일에서 환경변수를 읽어오는 곳이기도 함.

---

## 새 API 만들 때 체크리스트

1. **`models/`** — DB 테이블이 없으면 추가
2. **`schemas/`** — 요청/응답 형식 정의
3. **`crud/`** — DB 조회/저장 함수 작성
4. **`services/`** — 로직이 복잡하면 여기에 묶기
5. **`api/v1/해당폴더/`** — 엔드포인트(URL) 추가
6. **`main.py`** — 새 라우터 등록

---

## 로컬 실행

```bash
# 전체 서버 실행 (백엔드 + 프론트 + DB)
docker compose up --build

# 백엔드 코드 수정 후 재시작
docker compose restart backend

# 로그 확인
docker compose logs -f backend

# API 문서 (Swagger)
http://localhost:8000/docs
```
