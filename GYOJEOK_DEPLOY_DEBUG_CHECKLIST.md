# 교적관리 선배포 전 수정 필요 체크리스트

작성일: 2026-05-12  
범위: 프론트 메인페이지 `교적관리` 섹션 선배포 전 반드시 고쳐야 할 항목  
제외: 보안 강화, 수련회 기능 구현

이 문서는 테스트 절차가 아니라, 현재 코드 조사에서 발견한 “고쳐야 할 것” 목록이다.

---

## P0. 배포 차단

- [ ] 수련회 메뉴 노출 제거 또는 접근 차단
  - 문제: 수련회는 아직 배포 대상이 아닌데 사이드바와 라우트가 살아 있다.
  - 영향: 사용자가 `/retreat/create`, `/retreat/dashboard`, `/retreat/suspended-meal`에 접근 가능하다.
  - 수정 대상:
    - `frontend/src/apps/layout/Container.tsx`
    - `frontend/src/apps/index.tsx`
  - 수정 방향:
    - 선배포 기간에는 사이드바 `수련회` 그룹을 숨긴다.
    - 직접 URL 접근도 `/not-found` 또는 임시 차단 화면으로 보내야 한다.

- [ ] 교적관리 배포 범위 문서/코드 기준 통일
  - 문제: 현재 프론트 교적관리 하위 화면은 5개인데, 기존 API 명세는 4개 화면 기준이다.
  - 현재 실제 화면:
    - 출석 대시보드
    - 출석 관리
    - 사용자 명단
    - 미등반 새가족 명단
    - 삭제 명단
  - 수정 대상:
    - `frontend/교적관리_API_명세.md`
    - `MDs/frontend-readonly/INDEX.md`
  - 수정 방향:
    - `미등반 새가족 명단`을 교적관리 선배포 범위에 명시한다.
    - 새가족 전용 API도 명세에 포함한다.

- [ ] 사용자 명단/삭제 명단/새가족 명단의 `year`, `leader_ids` 응답 불일치 수정
  - 문제: 백엔드는 `updated_at`, `leader_names`를 내려주는데 프론트는 `year`, `leader_ids`를 읽고 있다.
  - 영향:
    - 년도 컬럼이 `-`로 표시될 수 있다.
    - 직분 컬럼이 항상 `-`로 표시될 수 있다.
    - 수정 저장 시 직분 정보가 사라질 수 있다.
  - 수정 대상:
    - `frontend/src/models/member.types.ts`
    - `frontend/src/apps/pages/MemberListPage.tsx`
    - `frontend/src/apps/pages/DeletedMemberPage.tsx`
    - `frontend/src/apps/pages/NewFamilyMemberPage.tsx`
  - 수정 방향:
    - `MemberRow`에 `updated_at`, `leader_names: string[]`를 반영한다.
    - 화면 표시용 직분은 `leader_names.join(', ') || '-'`로 처리한다.
    - `row.year` 접근은 `updated_at` 기반 표시로 바꾼다.

- [ ] 교적 추가/수정 폼의 `교인구분` 필수 정책 수정
  - 문제: 프론트는 교구/팀/그룹을 필수로 요구하면서 `교인구분`은 선택으로 둔다.
  - 백엔드 정책: `gyogu`, `team`, `group_no`, `member_type`는 모두 있거나 모두 없어야 한다.
  - 영향: 사용자가 교인구분 없이 제출하면 422가 발생한다.
  - 수정 대상:
    - `frontend/src/components/user/MemberCreatePage/MemberCreatePage.tsx`
    - `frontend/src/components/user/MemberEditPage/MemberEditPage.tsx`
    - `frontend/src/apps/pages/MemberListPage.tsx`
    - `backend/app/schemas/members.py`
  - 수정 방향:
    - 일반 교적 폼에서 `memberType`을 필수로 만든다.
    - 또는 교구/팀/그룹/memberType 전체 optional 입력 정책으로 UI를 다시 맞춘다.
    - 선배포 기준으로는 `memberType 필수`가 가장 단순하다.

- [ ] 일반 교적 추가 폼에서 `새가족` 선택 금지
  - 문제: 일반 교적 추가 폼에 `새가족` 선택지가 있다.
  - 백엔드 정책: 일반 `/members`에서 `member_type='새가족'` 생성은 거부한다.
  - 영향: 사용자가 새가족을 선택하면 실패한다.
  - 수정 대상:
    - `frontend/src/components/user/memberForm.types.ts`
    - `frontend/src/components/user/MemberCreatePage/MemberCreatePage.tsx`
    - `frontend/src/components/user/MemberEditPage/MemberEditPage.tsx`
  - 수정 방향:
    - 일반 교적 추가/수정에서는 `새가족` 옵션을 제거한다.
    - 새가족은 `/members/new-family` 화면에서만 생성한다.

- [ ] 미등반 새가족 추가/수정 폼의 `그룹` 필수 정책 수정
  - 문제: 새가족 화면에서는 `그룹`이 선택처럼 보이지만 백엔드는 `group_no`를 필수로 받는다.
  - 영향: 그룹 없이 제출하면 422가 발생한다.
  - 수정 대상:
    - `frontend/src/apps/pages/NewFamilyMemberPage.tsx`
    - `frontend/src/api/newcomer.ts`
    - `backend/app/schemas/newcomers.py`
  - 수정 방향:
    - 새가족 추가/수정 폼에서 그룹을 필수로 만든다.
    - 검증 메시지와 submit disabled 조건에 `group`을 포함한다.

- [ ] 임원단 필터 의미 통일
  - 문제: 프론트의 `임원단` 선택은 “임원단만”처럼 보이지만 백엔드는 `is_imwondan=true`를 “임원단 포함”으로 처리한다.
  - 영향:
    - 대시보드 임원단 필터 결과가 사용자가 기대한 값과 다를 수 있다.
    - 출석 관리에서는 `gyogu_no=0&is_imwondan=true` 조합으로 잘못 조회될 수 있다.
  - 수정 대상:
    - `frontend/src/apps/pages/AttendanceDashboard.tsx`
    - `frontend/src/apps/pages/AttendancePage.tsx`
    - `backend/app/crud/query_builders.py`
    - `backend/app/api/v1/attendance/dashboard.py`
    - `backend/app/api/v1/attendance/records.py`
  - 수정 방향:
    - 정책을 먼저 확정한다.
    - 선택지명이 `임원단 포함`인지 `임원단만`인지 명확히 한다.
    - `임원단만`이 필요하면 백엔드에 별도 필터 의미를 구현한다.
    - `gyogu_no=0` 같은 암묵 표현은 제거한다.

- [ ] 출석 관리 결석 저장 검증 수정
  - 문제: 출석에서 결석으로 바꾸고 결석사유를 비워둔 채 저장하면, 해당 변경분이 요청에서 빠지고 UI는 성공으로 처리될 수 있다.
  - 영향: 사용자는 저장됐다고 보지만 실제 저장은 안 되는 데이터 손실성 버그.
  - 수정 대상:
    - `frontend/src/apps/pages/AttendancePage.tsx`
    - `backend/app/schemas/attendance.py`
  - 수정 방향:
    - `ABSENT` 상태에서는 결석사유를 필수로 요구한다.
    - 사유 없는 결석 행이 있으면 저장 버튼 비활성화 또는 명확한 오류 표시.
    - 유효하지 않은 변경분을 조용히 필터링하지 않는다.

---

## P1. 중요 수정

- [ ] 출석 관리 행 표시값을 API 응답 기준으로 수정
  - 문제: 백엔드는 `gyogu`, `team`, `group_no`를 내려주는데 프론트는 행 표시를 현재 필터값으로 만든다.
  - 영향:
    - 교구만 선택한 조회에서 팀이 `-`로 보인다.
    - 그룹이 `0그룹`처럼 잘못 표시될 수 있다.
  - 수정 대상:
    - `frontend/src/models/attendance.types.ts`
    - `frontend/src/apps/pages/AttendancePage.tsx`
    - `backend/app/schemas/attendance.py`
  - 수정 방향:
    - `AttendanceMemberRow` 타입에 `gyogu`, `team`, `group_no`를 추가한다.
    - `toAttendanceRow`는 필터값이 아니라 API 응답값을 사용한다.

- [ ] 출석 관리 내부 이동 시 미저장 변경 보호
  - 문제: 현재는 브라우저 이탈만 `beforeunload`로 막고, 화면 내부의 날짜/필터/페이지 변경은 막지 않는다.
  - 영향: 저장 전 필터/날짜/페이지를 바꾸면 변경사항이 사라질 수 있다.
  - 수정 대상:
    - `frontend/src/apps/pages/AttendancePage.tsx`
  - 수정 방향:
    - 날짜 변경, 필터 변경, 페이지 변경 전에 dirty 상태를 확인한다.
    - 확인 팝업을 띄우거나 변경 중에는 이동을 막는다.

- [ ] 새가족 삭제 사유 UI와 API 동작 통일
  - 문제: 팝업은 삭제 사유를 입력받지만 API 호출에는 전달하지 않는다.
  - 백엔드 현재 동작: 항상 `"새가족 삭제"`로 저장한다.
  - 수정 대상:
    - `frontend/src/apps/pages/NewFamilyMemberPage.tsx`
    - `frontend/src/api/newcomer.ts`
    - `backend/app/api/v1/gyojeok/newcomers.py`
    - `backend/app/crud/newcomers.py`
  - 수정 방향:
    - 선택 A: 새가족 삭제 사유 입력 UI 제거.
    - 선택 B: 새가족 삭제 API도 `deleted_reason`을 받도록 수정.
    - 선배포 기준으로는 A가 더 작다.

- [ ] 다건 삭제/복원/등반의 부분 성공 처리 정책 확정
  - 문제: 프론트가 단건 API를 `Promise.all`로 반복 호출한다.
  - 영향: 일부는 성공하고 일부는 실패해도 원자적으로 롤백되지 않는다.
  - 수정 대상:
    - `frontend/src/apps/pages/MemberListPage.tsx`
    - `frontend/src/apps/pages/NewFamilyMemberPage.tsx`
    - `frontend/src/hooks/member/useDeletedMembers.ts`
    - `backend/app/api/v1/gyojeok/members.py`
    - `backend/app/api/v1/gyojeok/newcomers.py`
  - 수정 방향:
    - 선택 A: 백엔드 다건 API 추가.
    - 선택 B: 프론트에서 단건 반복 결과를 성공/실패로 나눠 표시.
    - 현재 `MDs/tasks/open.md`에도 다건 삭제/복원 불일치가 남아 있다.

- [ ] 목록 API 실패를 조용히 삼키지 않도록 수정
  - 문제: 목록 훅들이 `catch`에서 로딩만 끄고 사용자에게 실패를 보여주지 않는다.
  - 영향: 빈 결과인지 API 실패인지 운영자가 구분할 수 없다.
  - 수정 대상:
    - `frontend/src/hooks/member/useMembers.ts`
    - `frontend/src/hooks/member/useNewcomers.ts`
    - `frontend/src/hooks/member/useDeletedMembers.ts`
    - 각 페이지의 `Snackbar` 처리
  - 수정 방향:
    - 훅에서 error 상태를 반환한다.
    - 페이지에서 Snackbar 또는 명확한 에러 상태를 표시한다.

- [ ] 일반 사용자 명단과 새가족 명단의 Recoil 상태 분리
  - 문제: `useMembers`와 `useNewcomers`가 같은 `membersState`, `selectedMemberIdsState`를 공유한다.
  - 영향: 화면 전환 시 이전 목록/선택 상태가 섞일 수 있다.
  - 수정 대상:
    - `frontend/src/recoil/member/atoms.ts`
    - `frontend/src/hooks/member/useMembers.ts`
    - `frontend/src/hooks/member/useNewcomers.ts`
  - 수정 방향:
    - 일반 멤버와 새가족의 items/loading/pagination/selectedIds atom을 분리한다.
    - 또는 화면 unmount/route change 시 선택 상태를 확실히 초기화한다.

- [ ] 삭제 명단의 삭제일 범위 필터 정책 확정
  - 문제: 백엔드는 `deleted_from`, `deleted_to`를 지원하지만 화면에는 UI가 없다.
  - 영향: 삭제 명단 운영 검색이 부족하거나 명세와 화면이 어긋난다.
  - 수정 대상:
    - `frontend/src/apps/pages/DeletedMemberPage.tsx`
    - `frontend/src/hooks/member/useDeletedMembers.ts`
    - `frontend/src/api/member.ts`
  - 수정 방향:
    - 삭제일 범위 UI를 추가하거나, 선배포 범위에서 명세상 제외로 정리한다.

---

## P2. 정리/품질

- [ ] 교적관리 API 명세 최신화
  - 문제: `frontend/교적관리_API_명세.md`가 현재 구현과 다르다.
  - 현재 차이:
    - 대시보드는 개별 5개 API가 아니라 `GET /api/attendance/dashboard` 통합 API를 사용한다.
    - 교적 API는 `/api/members`가 아니라 `/api/v1/gyojeok/members`를 사용한다.
    - 삭제/복원 다건 API는 현재 구현되어 있지 않다.
    - 새가족 화면/API가 문서에 빠져 있다.
  - 수정 대상:
    - `frontend/교적관리_API_명세.md`
    - `MDs/specs/members.md`
    - `MDs/specs/dashboard.md`

- [ ] `PeriodUnit`의 `3years` 잔여 코드 처리
  - 문제: 타입에는 `3years`가 있지만 선택지에는 없고, 목데이터 코드가 남아 있다.
  - 수정 대상:
    - `frontend/src/apps/pages/AttendanceDashboard.tsx`
  - 수정 방향:
    - 선배포 범위에서 완전히 제거하거나 실제 기능으로 승격한다.

- [ ] 버튼/팝업 문구와 실제 동작 일치
  - 대상:
    - 교적 삭제
    - 새가족 삭제
    - 등반 처리
    - 교적 복원
  - 수정 방향:
    - “선택한 N명” 문구가 실제 대상과 일치해야 한다.
    - 처리 결과도 성공/실패/부분성공을 구분해야 한다.

- [ ] 날짜 기준 KST 통일
  - 문제: 일부 프론트 날짜 계산은 브라우저 로컬 날짜 기준이다.
  - 대상:
    - `frontend/src/apps/pages/AttendanceDashboard.tsx`
    - `frontend/src/apps/pages/NewFamilyMemberPage.tsx`
    - `frontend/src/utils/kstDate.ts`
  - 수정 방향:
    - 출석 날짜와 등반일은 KST 기준 유틸로 통일한다.

- [ ] 숫자 표시 정책 정리
  - 문제: `번호` 컬럼이 실제 순번인지 `member_id`인지 화면마다 애매하다.
  - 대상:
    - `MemberListPage.tsx`
    - `NewFamilyMemberPage.tsx`
    - `DeletedMemberPage.tsx`
  - 수정 방향:
    - 운영자가 원하는 값이 순번이면 페이지 기준 순번으로 변경.
    - `member_id`면 컬럼명을 `ID` 또는 `member_id`에 맞게 변경.

---

## 관련 파일 빠른 참조

- 메뉴/라우팅
  - `frontend/src/apps/layout/Container.tsx`
  - `frontend/src/apps/index.tsx`

- 출석 대시보드
  - `frontend/src/apps/pages/AttendanceDashboard.tsx`
  - `frontend/src/api/attendance.ts`
  - `frontend/src/models/attendance.types.ts`
  - `backend/app/api/v1/attendance/dashboard.py`
  - `backend/app/services/dashboard.py`

- 출석 관리
  - `frontend/src/apps/pages/AttendancePage.tsx`
  - `frontend/src/utils/kstDate.ts`
  - `backend/app/api/v1/attendance/records.py`
  - `backend/app/schemas/attendance.py`
  - `backend/app/services/attendance.py`
  - `backend/app/crud/attendance.py`

- 사용자 명단
  - `frontend/src/apps/pages/MemberListPage.tsx`
  - `frontend/src/components/user/MemberCreatePage/MemberCreatePage.tsx`
  - `frontend/src/components/user/MemberEditPage/MemberEditPage.tsx`
  - `frontend/src/components/user/memberForm.types.ts`
  - `frontend/src/api/member.ts`
  - `frontend/src/models/member.types.ts`
  - `backend/app/api/v1/gyojeok/members.py`
  - `backend/app/schemas/members.py`

- 미등반 새가족
  - `frontend/src/apps/pages/NewFamilyMemberPage.tsx`
  - `frontend/src/api/newcomer.ts`
  - `backend/app/api/v1/gyojeok/newcomers.py`
  - `backend/app/schemas/newcomers.py`
  - `backend/app/crud/newcomers.py`

- 삭제 명단
  - `frontend/src/apps/pages/DeletedMemberPage.tsx`
  - `frontend/src/hooks/member/useDeletedMembers.ts`
  - `frontend/src/api/member.ts`

- 공통 테이블/상태
  - `frontend/src/components/common/DataTable/DataTable.tsx`
  - `frontend/src/components/common/SearchToolbar/SearchToolbar.tsx`
  - `frontend/src/recoil/member/atoms.ts`

---

## 권장 처리 순서

1. 수련회 메뉴/라우트 차단
2. `MemberRow` 타입과 `leader_names`/`updated_at` 표시 수정
3. 일반 교적 폼의 `memberType` 필수화 및 `새가족` 옵션 제거
4. 새가족 폼의 `group` 필수화
5. 임원단 필터 정책 확정 및 프론트/백엔드 의미 통일
6. 출석 관리 결석사유 저장 검증 수정
7. 출석 관리 행 표시값을 API 응답 기준으로 수정
8. 새가족 삭제 사유 UI/API 불일치 정리
9. 다건 삭제/복원/등반의 부분 성공 처리 정책 정리
10. 목록 API 실패 표시 추가
11. 일반 멤버/새가족 Recoil 상태 분리
12. 관련 명세 문서 최신화
