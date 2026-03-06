# CI/CD 가이드

## 전체 흐름

```
개발자
 └── feature 브랜치에서 작업
      └── PR 생성
           └── 팀장 코드 리뷰 & 승인
                └── main 머지
                     └── GitHub Actions 자동 실행
                          └── 테스트 → 빌드 → 서버 배포
```

---

## 브랜치 전략

| 브랜치 | 역할 |
|---|---|
| `main` | 서버에 배포되는 브랜치. 직접 push 불가. PR 승인 후 머지만 가능 |
| `feature/기능명` | 기능 개발용 브랜치. 개발자가 자유롭게 push 가능 |

---

## 개발자 작업 순서

### 1. 새 기능 시작 시
```bash
# main 최신 상태로 업데이트
git checkout main
git pull origin main

# 새 브랜치 생성 및 전환
git checkout -b feature/기능명
# 예: git checkout -b feature/login
```

### 2. 코드 수정 후 push
```bash
git add .
git commit -m "기능 설명"
git push origin feature/기능명
```

### 3. PR 생성
GitHub 레포 → Pull requests → New pull request
- base: `main` ← compare: `feature/기능명`
- 제목과 설명 작성 후 Create pull request

### 4. 팀장 승인 대기
팀장이 코드 리뷰 후 Approve → Merge

### 5. 머지 후 브랜치 정리
```bash
git checkout main
git pull origin main
git branch -d feature/기능명  # 로컬 브랜치 삭제
```

---

## 팀장 승인 순서

1. GitHub → Pull requests → PR 클릭
2. Files changed 탭에서 코드 리뷰
3. 이상 없으면 Review changes → Approve → Submit review
4. Merge pull request

---

## 배포 트리거 조건

main에 머지되면 아래 경로 변경 시에만 CI/CD 실행:

| 변경 경로 | 실행 내용 |
|---|---|
| `backend/**` | backend 테스트 → 빌드 → 서버 재시작 → alembic upgrade |
| `frontend/**` | frontend 빌드 확인 → 빌드 → 서버 재시작 |
| `docker-compose.yml` | 전체 스택 재시작 |
| 그 외 (README 등) | 배포 안 됨 |

---

## GitHub Branch Protection 설정 (최초 1회)

GitHub 레포 → Settings → Branches → Add branch ruleset

```
Branch name pattern: main
체크:
- Require a pull request before merging
  - Required approvals: 1
```

이 설정 후 main에 직접 push하면 거부됩니다.

---

## 주의사항

- feature 브랜치는 작업 단위로 잘게 나눌수록 리뷰하기 좋음
- DB 스키마 변경(alembic)도 같은 브랜치에 포함해서 PR
- PR 머지 전 로컬에서 충분히 테스트 후 올릴 것
