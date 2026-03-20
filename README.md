# newsongj

사내 관리 대시보드 프로젝트입니다.

---

## 시작하기 (로컬 실행)

**1. 환경변수 설정**

루트에 `.env` 파일을 만들어 DB 접속 정보를 입력하세요.
파일 형식은 팀원에게 요청하세요.

**2. 실행**

```bash
docker compose up --build
```

켜지면:
- http://localhost:8000 → 백엔드 API
- http://localhost:8000/docs → Swagger (API 문서)
- http://localhost:80 → 프론트엔드

> **참고:** MariaDB는 서버에 별도 운영 중입니다. `.env`에 서버 DB 접속 정보를 넣어야 정상 동작합니다.

---

## 코드 수정 후 반영

```bash
# 전체 재빌드
docker compose up --build

# 백엔드 코드만 바꿨을 때 (--reload로 자동 반영되지 않는 경우)
docker compose restart backend

# 로그 보기
docker compose logs -f backend
```

---

## 배포

`main` 브랜치에 머지하면 GitHub Actions가 자동으로 서버에 배포합니다.

```bash
git push origin main  # PR → 머지 → 자동 배포
```

변경된 서비스(backend / frontend)만 골라서 재빌드하므로,
frontend만 바꿨으면 frontend 이미지만 새로 올라갑니다.

---

## 문제가 생겼을 때

```bash
# 직전 커밋으로 되돌리기
git revert HEAD
git push origin main
```

---

## 더 자세한 내용

| 문서 | 내용 |
|------|------|
| `frontend/COMMON_UI_GUIDE.md` | 프론트 공통 컴포넌트 사용법 |
