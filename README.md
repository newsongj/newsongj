# newsongj

> **명성교회 대학부 HRM** — 교적·출석·새가족을 한 곳에서 관리하는 사역자 전용 운영 도구.

엑셀 기반으로 흩어져 있던 교인 정보·출석부·새가족 명단을 단일 웹 대시보드로 통합. 연도별 소속 이력, 주별 출석 추이, 미등반 새가족 추적까지 한 화면에서 처리할 수 있도록 설계했습니다.

---

## 기능

- **교적 관리** — 멤버 등록·수정·삭제·복원, 연도별 소속 이력 추적
- **출석 관리** — 주별 출석 체크, 결석 사유 분류, 기간별 통계 대시보드
- **미등반 새가족** — 별도 도메인으로 관리, 등반 처리 시 일반 멤버로 전환
- **인증** — JWT 기반 로그인

---

## 스택

- **Backend** — FastAPI · SQLAlchemy · MariaDB
- **Frontend** — React · TypeScript · MUI · Recoil · Vite
- **Infra** — Docker Compose · AWS Lightsail · GitHub Actions
