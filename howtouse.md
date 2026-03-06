# newsongj 팀원 개발 가이드

---

## 목차

1. [내 컴퓨터에 개발환경 설정](#1-내-컴퓨터에-개발환경-설정)
2. [도커 사용법](#2-도커-사용법)
3. [DB 수정법 (GitHub)](#3-db-수정법-github)
4. [파일 수정법 (GitHub)](#4-파일-수정법-github)

---

## 1. 내 컴퓨터에 개발환경 설정

### 1-1. 필수 프로그램 설치

아래 3가지를 순서대로 설치한다.

#### Git
- 다운로드: https://git-scm.com/downloads
- 설치 후 터미널(또는 PowerShell)에서 확인:
```
git --version
```
> `git version 2.xx.x` 처럼 뜨면 정상

#### Docker Desktop
- 다운로드: https://www.docker.com/products/docker-desktop/
- 설치 후 Docker Desktop 앱 실행 (메뉴바/트레이에 고래 아이콘 뜨면 정상)
- 터미널에서 확인:
```
docker --version
```

#### VSCode (코드 에디터)
- 다운로드: https://code.visualstudio.com/
- 설치 후 실행

---

### 1-2. 프로젝트 클론 (처음 한 번만)

터미널을 열고 아래 명령어를 순서대로 입력한다.

```bash
# 1. 원하는 위치로 이동 (예: 바탕화면)
cd ~/Desktop

# 2. 프로젝트 받기
git clone https://github.com/newsongj/newsongj.git

# 3. 프로젝트 폴더로 이동
cd newsongj
```

---

### 1-3. .env 파일 생성 (처음 한 번만)

`.env` 파일은 DB 비밀번호 등 민감한 정보를 담고 있어서 GitHub에 올라가지 않는다.
팀장에게 받아서 프로젝트 루트(newsongj 폴더 바로 안)에 넣으면 된다.

파일 위치:
```
newsongj/
├── .env          ← 여기에 위치해야 함
├── backend/
├── frontend/
└── docker-compose.yml
```

`.env` 파일 내용 형식 (팀장에게 실제 값 받을 것):
```
DB_ROOT_PASSWORD=****
DB_USER=****
DB_PASSWORD=****
DB_HOST=mariadb
DB_NAME=newsongj
```

---

### 1-4. VSCode로 프로젝트 열기

VSCode 실행 후 상단 메뉴 `파일 > 폴더 열기`에서 newsongj 폴더 선택.

---

## 2. 도커 사용법

> Docker Desktop이 실행 중인 상태에서 진행해야 한다.
> 모든 명령어는 newsongj 폴더 안 터미널에서 실행.

---

### 2-1. 개발 시작

터미널을 **2개** 열어서 진행한다.

**터미널 1 — Docker (mariadb + backend)**
```bash
# newsongj 폴더에서 실행
docker compose up -d
```

- 처음 실행 시 이미지 빌드 때문에 3~5분 걸릴 수 있음
- 이후에는 보통 30초 이내

정상 실행 확인:
```bash
docker compose ps
```
아래처럼 2개가 `running` 상태여야 함:
```
NAME        STATUS
mariadb     running (healthy)
backend     running
```

**터미널 2 — 프론트엔드 개발 서버**
```bash
# frontend 폴더로 이동 후 실행
cd frontend
npm run dev
```

`VITE ready` 메시지가 뜨면 정상.

**접속 주소:**
| 서비스 | 주소 |
|--------|------|
| 프론트엔드 | http://localhost:5173 |
| 백엔드 API | http://localhost:8000 |
| API 문서 | http://localhost:8000/docs |

---

### 2-2. 코드 수정 시 반영 방법

**백엔드 코드 수정 시:**
`backend/` 폴더는 컨테이너와 실시간 동기화되어 있으므로, uvicorn이 자동으로 변경을 감지하고 재시작한다. 별도 작업 불필요.

**프론트엔드 코드 수정 시:**
`npm run dev` 가 실행 중이면 파일 저장 즉시 브라우저에 자동 반영된다. 별도 작업 불필요.

---

### 2-3. 로그 보기

```bash
# 실시간으로 계속 보기 (Ctrl+C로 종료)
docker compose logs -f

# 특정 서비스만 보기
docker compose logs backend
docker compose logs mariadb
```

---

### 2-4. 개발 종료

**순서대로 진행한다.**

**1단계 — 프론트엔드 서버 종료**
터미널 2에서 `Ctrl+C`

**2단계 — Docker 컨테이너 중지**
```bash
docker compose stop
```

> `docker compose down` 은 컨테이너를 삭제한다. DB 데이터는 볼륨에 저장되므로 사라지진 않지만, 다음 시작이 조금 더 느려진다.

---

### 2-5. 컨테이너 내부 접속 (필요할 때)

```bash
# 백엔드 컨테이너 내부 쉘 접속
docker compose exec backend bash

# MariaDB 접속
docker compose exec mariadb mariadb -u [DB_USER] -p
# 비밀번호 입력 후 SQL 사용 가능
```

---

### 2-6. 자주 쓰는 명령어 요약

| 상황 | 명령어 |
|------|--------|
| 개발 시작 (Docker) | `docker compose up -d` |
| 개발 시작 (프론트) | `cd frontend && npm run dev` |
| 개발 종료 (프론트) | 터미널에서 `Ctrl+C` |
| 개발 종료 (Docker) | `docker compose stop` |
| 컨테이너 상태 확인 | `docker compose ps` |
| 로그 실시간 보기 | `docker compose logs -f` |
| 백엔드만 재시작 | `docker compose restart backend` |
| 완전 초기화 (주의) | `docker compose down -v` |

> `down -v` 는 DB 데이터까지 전부 삭제되므로 주의.

---

## 3. DB 수정법 (GitHub)

DB 구조(테이블/컬럼) 변경은 **Alembic 마이그레이션**으로 관리한다.
직접 DB에 SQL 날리는 것이 아니라, Python 코드로 변경 내역을 기록하고 GitHub에 올린다.
`main` 브랜치에 push되면 서버에서 자동으로 마이그레이션이 실행된다.

---

### 3-1. DB 구조 변경 흐름 (전체 요약)

```
models.py 수정 → alembic revision 생성 → 로컬 테스트 → GitHub push → 서버 자동 반영
```

---

### 3-2. 컬럼/테이블 추가하기

**예시: User 테이블에 `phone` 컬럼 추가**

#### Step 1. `backend/models.py` 수정

```python
class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    email = Column(String(200))
    age = Column(Integer)
    phone = Column(String(20))   # ← 이 줄 추가
```

#### Step 2. 마이그레이션 파일 생성

컨테이너가 실행 중인 상태에서:
```bash
docker compose exec backend alembic revision --autogenerate -m "add phone column to user"
```

> `-m` 뒤에는 변경 내용을 알아보기 쉽게 설명 작성

`backend/alembic/versions/` 폴더에 새 파일이 생긴다.
파일을 열어서 `upgrade()` 함수 안에 내용이 제대로 들어갔는지 확인한다.

```python
def upgrade() -> None:
    op.add_column('user', sa.Column('phone', sa.String(length=20), nullable=True))

def downgrade() -> None:
    op.drop_column('user', 'phone')
```

#### Step 3. 로컬에서 마이그레이션 적용 및 테스트

```bash
docker compose exec backend alembic upgrade head
```

http://localhost:8000/docs 에서 API 동작 확인.

#### Step 4. GitHub에 올리기

아래 [4. 파일 수정법](#4-파일-수정법-github) 절차와 동일하게 push.
반드시 `models.py` 와 `alembic/versions/` 파일을 함께 커밋해야 한다.

---

### 3-3. 새 테이블 추가하기

**예시: `Post` 테이블 추가**

#### Step 1. `backend/models.py`에 새 클래스 추가

```python
class Post(Base):
    __tablename__ = "post"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    content = Column(String(2000))
    user_id = Column(Integer)
```

#### Step 2. 이후 Step 2~4는 위와 동일

```bash
docker compose exec backend alembic revision --autogenerate -m "add post table"
docker compose exec backend alembic upgrade head
```

확인 후 GitHub push.

---

### 3-4. 주의사항

- 마이그레이션 파일(`alembic/versions/*.py`)은 절대 손으로 삭제하거나 수정하지 말 것
- 여러 명이 동시에 마이그레이션 파일을 만들면 충돌날 수 있음 → DB 변경은 한 명이 담당하거나 순서를 맞춰서 진행
- 컬럼 삭제는 데이터 손실 위험 → 팀원과 반드시 사전 논의

---

## 4. 파일 수정법 (GitHub)

코드를 수정하고 GitHub에 올리면 CI/CD가 자동으로 서버에 배포한다.

---

### 4-1. 배포 흐름 전체 요약

```
코드 수정 → 로컬 테스트 → git commit → main 브랜치에 push → GitHub Actions 자동 실행 → 서버 배포 완료
```

`backend/` 또는 `frontend/` 파일이 변경된 경우에만 자동 배포가 실행된다.

---

### 4-2. 기본 작업 순서

#### Step 1. 최신 코드 받기 (작업 전 항상 먼저)

```bash
git pull origin main
```

#### Step 2. 새 브랜치 만들기 (권장)

```bash
# 브랜치 이름은 작업 내용을 알아보기 쉽게
git checkout -b feature/유저-로그인-기능
```

#### Step 3. 코드 수정

VSCode에서 파일 수정.

#### Step 4. 로컬 테스트

도커 켜고 http://localhost 또는 http://localhost:8000/docs 에서 동작 확인.

#### Step 5. 변경 파일 확인

```bash
git status
```

수정된 파일 목록이 보인다.

#### Step 6. 커밋

```bash
# 전체 변경사항 스테이징
git add .

# 커밋 (메시지는 무엇을 바꿨는지 한 줄로)
git commit -m "유저 로그인 API 추가"
```

#### Step 7. GitHub에 push

```bash
# 처음 push하는 브랜치라면
git push origin feature/유저-로그인-기능

# main에 직접 push하는 경우 (간단한 수정)
git push origin main
```

#### Step 8. Pull Request (브랜치 사용 시)

1. GitHub 사이트 접속
2. 방금 push한 브랜치 → `Compare & pull request` 버튼 클릭
3. 변경 내용 설명 작성 후 PR 생성
4. 팀원 리뷰 후 `main`으로 Merge
5. Merge되면 자동 배포 시작

---

### 4-3. 자동 배포 확인

GitHub 레포지토리 → `Actions` 탭에서 배포 진행 상황을 실시간으로 볼 수 있다.

| 표시 | 의미 |
|------|------|
| 노란 원 (돌아가는 중) | 빌드/배포 진행 중 |
| 초록 체크 | 배포 성공 |
| 빨간 X | 실패 → 클릭해서 로그 확인 |

배포는 보통 **3~5분** 걸린다.

---

### 4-4. 어느 파일을 수정하면 뭐가 배포되나

| 수정한 파일 위치 | 배포되는 것 |
|-----------------|------------|
| `backend/` 안 파일 | 백엔드만 재배포 |
| `frontend/` 안 파일 | 프론트엔드만 재배포 |
| 둘 다 수정 | 백엔드 + 프론트엔드 모두 재배포 |
| 그 외 파일 (README 등) | 배포 안 됨 |

---

### 4-5. 커밋 메시지 작성 규칙 (권장)

```
기능 추가:   feat: 유저 회원가입 API 추가
버그 수정:   fix: 로그인 토큰 만료 오류 수정
UI 변경:     style: 메인 페이지 레이아웃 수정
DB 변경:     db: user 테이블에 phone 컬럼 추가
기타 수정:   chore: 패키지 버전 업데이트
```

---

### 4-6. 주의사항

- `.env` 파일은 절대 커밋하지 말 것 (비밀번호 유출 위험)
- `main` 브랜치에 push하면 바로 실서버에 배포되므로, 테스트 안 된 코드는 올리지 말 것
- 충돌(conflict) 발생 시 팀원과 상의 후 해결
