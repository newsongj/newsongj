# 백엔드 구조 설명서

> "이 파일이 뭐하는 건지 모르겠다" 싶을 때 여기를 읽으세요.
> 레이어 규칙 상세: [`MDs/reference/layer-rules.md`](../MDs/reference/layer-rules.md)

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
│   │       ├── gyojeok/    ← 교적 관련 API 엔드포인트
│   │       ├── attendance/ ← 출석 관련 API 엔드포인트
│   │       └── meta/       ← 공통 메타 API (직분 목록 등)
│   │
│   ├── core/               ← 서버 전체에서 공통으로 쓰는 핵심 설정
│   │   ├── config.py       ← 환경변수, 앱 설정값 (JWT 키, 앱 이름 등)
│   │   ├── database.py     ← DB 연결 설정 (MariaDB 접속 주소, 세션 생성)
│   │   ├── security.py     ← 보안 관련 (비밀번호 암호화, JWT 토큰 처리)
│   │   ├── middleware.py   ← 모든 요청에 공통 적용되는 처리 (CORS 등)
│   │   └── timezone.py     ← KST 시간 유틸 (now_kst, today_kst)
│   │
│   ├── models/             ← DB 테이블 구조 정의
│   ├── schemas/            ← API 요청/응답 데이터 형식 정의
│   ├── crud/               ← DB에서 데이터를 꺼내고 넣는 함수 모음
│   ├── services/           ← 복잡한 비즈니스 로직 (여러 crud를 조합하는 곳)
│   └── tests/              ← 자동화 테스트 코드
│
├── Dockerfile              ← 서버를 도커 컨테이너로 만드는 설계도
└── requirements.txt        ← 이 서버가 필요로 하는 파이썬 패키지 목록
```

---

## 요청 처리 흐름

```
프론트에서 API 요청
       ↓
  api/v1/{도메인}/   ← 파라미터 파싱 + service 호출만
       ↓
  services/          ← 비즈니스 로직, ORM → 스키마 변환
       ↓
  crud/              ← DB 읽기/쓰기
       ↓
  schemas/           ← 응답 데이터 형식으로 포장
       ↓
  프론트로 응답 반환
```

> 레이어 경계 규칙 상세(호출 방향, 금지 패턴, API 체크리스트): [`MDs/reference/layer-rules.md`](../MDs/reference/layer-rules.md)

---

## 새 API 만들 때 체크리스트

1. **`models/`** — DB 테이블이 없으면 추가
2. **`schemas/`** — 요청/응답 형식 정의
3. **`crud/`** — DB 조회/저장 함수 작성 (`query_builders.py` 체이너 재사용)
4. **`services/`** — 로직이 복잡하면 여기에 묶기 (`build_*` 함수)
5. **`api/v1/해당폴더/`** — 엔드포인트 추가 (crud 직접 import 금지)
6. **`main.py`** — 새 라우터 등록
7. **`/docker-verify`** — openapi.json 확인 + 실제 호출

---

## 로컬 실행

```bash
docker compose up -d backend     # 백엔드만 시작 (--build 없이)
docker compose logs -f backend   # 로그 확인
# API 문서: http://localhost:8000/docs
```
