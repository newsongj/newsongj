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

## DB 현황 및 Alembic 사용법

### 현재 상태 (2026-03-05)

```
서버
├── 호스트 MariaDB (직접 설치, 포트 3306) ← 기존 데이터 여기 있음, 현재 사용 중
└── Docker MariaDB (컨테이너, 포트 3306 내부) ← 신규, 현재 비어있음
```

현재 backend는 Docker MariaDB에 연결되어 있고, 기존 데이터는 호스트 MariaDB에 있다.
기존 데이터를 Docker MariaDB로 옮기는 마이그레이션은 아직 진행하지 않음.

---

### Alembic 사용법 (스키마 변경 시)

**스키마 변경은 반드시 아래 순서로 진행한다.**
DBeaver 등으로 직접 DB를 수정하면 Alembic과 충돌이 생기므로 절대 금지.
**.env는 건드리지 않는다. docker-compose가 떠있는 상태에서 진행한다.**

**1. models.py 수정**
```python
# 예: name 컬럼 길이 변경, email 컬럼 추가 등
class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True)
    name = Column(String(100))       # 50 → 100으로 변경
    email = Column(String(200))      # 신규 추가
```

**2. 마이그레이션 파일 생성 (docker-compose 실행 중 상태에서)**
```bash
docker-compose exec backend alembic revision --autogenerate -m "add email column"
```
`backend/alembic/versions/` 에 파일이 생성된다. 내용을 확인하고 이상하면 수정.

**3. 로컬 DB에 적용 후 확인**
```bash
docker-compose exec backend alembic upgrade head
```

**4. push**
```bash
git add .
git commit -m "스키마 변경 내용"
git push origin main
```
CI/CD가 서버에서 자동으로 `alembic upgrade head` 실행.

---

### SQL만 아는 사람의 역할 분리

| 작업 | 방법 |
|---|---|
| 데이터 조회 | DBeaver에서 SELECT 직접 실행 |
| 데이터 삽입/수정/삭제 | DBeaver에서 INSERT/UPDATE/DELETE 직접 실행 |
| 테이블 구조 변경 (컬럼 추가/수정/삭제 등) | 개발자에게 요청 → 개발자가 Alembic으로 처리 |

**테이블 구조 변경이 필요하면 개발자에게 이렇게 전달:**
```
"user 테이블에 email 컬럼(문자열 200자) 추가해줘"
"user 테이블의 name 컬럼 길이를 100자로 늘려줘"
```

DBeaver로 직접 `ALTER TABLE` 실행 시 Alembic과 충돌 발생. 데이터 유실 가능성 있음.

---

### 기존 호스트 DB → Docker DB 마이그레이션 시 주의사항

나중에 호스트 MariaDB 데이터를 Docker MariaDB로 옮길 때:

1. 호스트 DB에서 덤프
```bash
mysqldump -u [유저] -p [DB명] > backup.sql
```

2. Docker MariaDB에 복원
```bash
docker exec -i newsongj-mariadb-1 mariadb -u newsongj_user -p newsongj < backup.sql
```

3. Alembic 상태 확인 - 복원한 테이블 구조와 models.py가 일치하는지 확인
```bash
alembic revision --autogenerate -m "sync check"
```
생성된 파일의 `upgrade()`가 `pass`면 일치하는 것. 내용이 있으면 충돌이므로 수동으로 맞춰야 함.

---

## 현재 상태 (2026-03-05)

- 로컬: docker-compose로 정상 동작
- 서버: docker-compose 기반으로 전환 완료, MariaDB 포함 전체 스택 배포
- DB: 호스트 MariaDB(기존 데이터) / Docker MariaDB(신규, 비어있음) 공존 중
