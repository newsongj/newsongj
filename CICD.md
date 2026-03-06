# CI/CD 가이드

## 전체 흐름

```
개발자
 └── feature 브랜치에서 작업
      └── PR 생성
           └── CI 자동 실행 (테스트) ← ci.yml
                └── CI 통과 + 팀장 Approve
                     └── main 머지
                          └── CD 자동 실행 (빌드 + 배포) ← deploy.yml
```

---

## 워크플로우 파일 역할

| 파일 | 트리거 | 실행 내용 |
|---|---|---|
| `ci.yml` | PR 생성/업데이트 시 | 테스트만 실행 |
| `deploy.yml` | main 머지 시 | 빌드 → Docker Hub 푸시 → 서버 배포 |

---

## 브랜치 전략

| 브랜치 | 역할 |
|---|---|
| `main` | 서버에 배포되는 브랜치. 직접 push 불가. PR 승인 후 머지만 가능 |
| `feature/기능명` | 새 기능 개발 |
| `fix/버그명` | 버그 수정 |
| `hotfix/긴급수정` | 긴급 패치 |

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
- CI가 자동으로 실행됨 (테스트 통과 여부 확인)

### 4. 팀장 승인 대기
팀장이 코드 리뷰 후 Approve → Merge
CI 미통과 시 머지 불가

### 5. 머지 후 브랜치 정리
```bash
git checkout main
git pull origin main
git branch -d feature/기능명  # 로컬 브랜치 삭제
```

---

## 팀장 승인 순서

1. GitHub → Pull requests → PR 클릭
2. **Files changed** 탭에서 코드 리뷰
3. 우상단 **Review changes** → **Approve** → **Submit review**
4. **Conversation** 탭으로 이동 → **Merge pull request**

---

## 배포 트리거 조건

main에 머지되면 아래 경로 변경 시에만 배포 실행:

| 변경 경로 | 실행 내용 |
|---|---|
| `backend/**` | 빌드 → 서버 재시작 → alembic upgrade |
| `frontend/**` | 빌드 → 서버 재시작 |
| `docker-compose.yml` | 전체 스택 재시작 |
| 그 외 (README 등) | 배포 안 됨 |

---

## GitHub 설정 (최초 1회)

### Branch Protection
GitHub 레포 → Settings → Branches → Add branch ruleset
```
Branch name pattern: main
체크:
- Require a pull request before merging
  - Required approvals: 1
- Require status checks to pass
  - test-backend
  - test-frontend
```

### Collaborator 추가 (팀장)
GitHub 레포 → Settings → Collaborators → Add people → 팀장 계정 초대

---

## 주의사항

- feature 브랜치는 작업 단위로 잘게 나눌수록 리뷰하기 좋음
- DB 스키마 변경(alembic)도 같은 브랜치에 포함해서 PR
- PR 머지 전 로컬에서 충분히 테스트 후 올릴 것
- main에 직접 push하면 거부됨
