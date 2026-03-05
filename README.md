# newsongj

## 시스템 구조

```
내 컴퓨터 or 서버
└── Docker
    ├── mariadb  컨테이너  → 데이터베이스 (포트 3306)
    ├── backend  컨테이너  → FastAPI 서버 (포트 8000)
    └── frontend 컨테이너  → React 웹사이트 (포트 80)
```

세 개가 Docker 안에서 같이 돌아간다.
`docker-compose.yml` 파일 하나로 세 개를 한꺼번에 켜고 끈다.

---

## 로컬 실행

```bash
# 켜기
docker-compose up --build

# 끄기
Ctrl+C  →  docker-compose down
```

켜지면:
- http://localhost:8000 → 백엔드 API
- http://localhost:80  → 프론트엔드

---

## 파일 구조

```
newsongj/
├── docker-compose.yml   ← 세 컨테이너를 묶는 설정
├── .env                 ← DB 비밀번호 등 환경변수 (git에 안 올라감)
├── backend/
│   ├── main.py          ← API 엔드포인트 정의
│   ├── database.py      ← DB 연결 설정
│   ├── models.py        ← 테이블 정의 (user 테이블)
│   └── Dockerfile       ← backend 컨테이너 설정
└── frontend/
    └── Dockerfile       ← frontend 컨테이너 설정
```

---

## DB 구조

```
newsongj (데이터베이스)
└── user (테이블)
    ├── id   (숫자, 자동증가)
    └── name (문자열)
```

DB는 컨테이너가 삭제돼도 `db_data` 볼륨에 데이터가 남는다.

---

## 코드 수정 후 반영

```bash
docker-compose up --build
```

`--build`를 붙이면 코드 변경사항이 컨테이너에 반영된다.

---

## API 목록

| 메서드 | 경로      | 설명              |
|--------|-----------|-------------------|
| GET    | /         | 서버 상태 확인    |
| GET    | /users    | user 테이블 전체 조회 |

---

## Git Push (서버 배포)

코드를 수정하고 main 브랜치에 push하면 자동으로 서버에 배포된다.

```bash
git add .
git commit -m "커밋 메시지"
git push origin main
```

### 배포 흐름

```
push
 └── GitHub Actions 시작
      ├── 변경된 폴더 감지 (backend / frontend)
      ├── 테스트 실행 (변경된 쪽만)
      ├── Docker 이미지 빌드 → Docker Hub 푸시 (변경된 쪽만)
      └── 서버에 SSH 접속
           ├── .env 생성 (DB 비밀번호 등)
           ├── docker-compose.yml 생성
           └── docker-compose up -d 실행
```

### 배포 트리거 조건

| 변경 경로 | 배포 여부 |
|---|---|
| `backend/**` | backend만 재빌드/재시작 |
| `frontend/**` | frontend만 재빌드/재시작 |
| `docker-compose.yml` | 전체 스택 재시작 |
| 그 외 (README 등) | 배포 안 됨 |

### 필요한 GitHub Secrets

GitHub 레포 → Settings → Secrets and variables → Actions

| 이름 | 설명 |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub 아이디 |
| `DOCKERHUB_TOKEN` | Docker Hub 액세스 토큰 |
| `LIGHTSAIL_IP` | 서버 IP 주소 |
| `LIGHTSAIL_SSH_KEY` | 서버 SSH 개인키 |
| `DB_ROOT_PASSWORD` | MariaDB root 비밀번호 |
| `DB_USER` | MariaDB 유저명 |
| `DB_PASSWORD` | MariaDB 유저 비밀번호 |

### 배포 중 서버 상태

- MariaDB: 재시작 안 됨 (데이터 유지)
- backend: 코드 변경 시 잠깐 재시작 (수 초)
- frontend: 코드 변경 시 잠깐 재시작 (수 초)

### 뻑났을 때 복구

```bash
# 이전 커밋으로 되돌리기
git revert HEAD
git push origin main
```

---

## 현재 상태 (2026-03-05)

- 로컬: docker-compose로 정상 동작
- 서버: docker-compose 기반으로 전환 완료, MariaDB 포함 전체 스택 배포
