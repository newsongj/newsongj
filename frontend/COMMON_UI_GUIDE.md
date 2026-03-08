# Admin 공통 UI 가이드

신규 서비스 관리자 화면을 만들 때, 기존 공통 구조를 유지하면서 빠르게 화면을 구성하기 위한 기준 문서입니다.

## 1) 디자인 토큰

### 폰트
- 전역 기본 폰트: `Noto Sans KR`
- 참조: `src/styles/GlobalStyle.ts`

### 키 컬러
- Primary Main: `#187EF4` (`theme.custom.colors.primary._500`)
- Header 배경: `#021730` (`theme.custom.colors.primary._900`)
- 공통 아웃라인(보더): `rgba(93, 96, 100, 0.12)` (`theme.custom.colors.primary.outline`)
- 참조: `src/styles/theme.ts`

### 타이포그래피 토큰
- `hero`, `h1`, `h2`, `h3`, `subtitle`, `body1`, `body2`, `button`, `caption`
- 참조: `src/styles/theme.ts`

### 간격/라운드
- 기본 라운드: `8px` (`theme.custom.borderRadius`)
- spacing: `xs/sm/md/lg/xl/xxl`
- 참조: `src/styles/theme.ts`

## 2) 레이아웃 공통 구조

### 기본 페이지 래핑 구조
- `Container`
  - `Header`
  - `Sidebar`
  - `MainContent(title, breadcrumb, children)`

참조:
- `src/apps/layout/Container.tsx`
- `src/apps/layout/Header/*`
- `src/apps/layout/Sidebar/*`
- `src/apps/layout/MainContent/*`

### 고정 치수 기준
- Header 높이: `66px`
- Sidebar 폭: 펼침 `256px`, 접힘 `64px` (본문/세로 divider는 `56px` 기준 이동)

## 3) 핵심 공통 컴포넌트

## 버튼
- 컴포넌트: `@components/common/Button`
- variant: `filled | outlined | text | elevated | destructive`
- size: `small | medium | large`
- 스타일 특징: uppercase, pill 형태(`borderRadius: 100px`)

## 셀렉트(드롭다운)
- 컴포넌트: `@components/common/Select`
- 지원: `placeholder`, `clearable`, `helperText`, `error`, `fullWidth`, `width`
- 기본 폭: `210px`

## 텍스트 입력
- 컴포넌트: `@components/common/TextField`
- 지원: outlined/filled, size, leading/trailing icon, multiline, helperText

## 검색
- 컴포넌트: `@components/common/SearchField`
- 구조: `Select + TextField + Search Button`
- 툴바: `@components/common/SearchToolbar`

## 데이터 테이블
- 컴포넌트: `@components/common/DataTable`
- 지원:
  - 정렬(`sortable`)
  - 다중 선택(`selectable`)
  - 행별 메뉴(`rowActions`)
  - 페이지네이션(`pagination`)
  - 검색 툴바 연동(`useSearchToolbar`)

## 모달
- 베이스: `BaseModal`
- 생성형: `BaseCreateModal`
- 상세/수정형: `BaseDetailModal`
- 크기: `small | medium | large | xlarge` (`src/styles/modalSizes.ts`)

## 피드백 UI
- 토스트: `@components/common/Snackbar`
- 확인 팝업: `@components/common/Popup`

## 4) 기존 화면에서의 공통 사용 패턴

관리형 화면(사용자/권한/파일)에서 주로 아래 패턴을 반복 사용:

- `DataTable + SearchToolbar + Popup + Snackbar`

참조:
- `src/apps/pages/UserManagementPage.tsx`
- `src/apps/pages/PermissionManagementPage.tsx`
- `src/apps/pages/FileManagementPage.tsx`

## 5) 신규 화면 작성 규칙 (중요)

1. 레이아웃은 `Container/Header/Sidebar/MainContent`를 그대로 사용.
2. 색상/폰트/간격은 하드코딩 대신 `theme.custom.*` 토큰 사용.
3. 목록형 화면은 `DataTable + SearchToolbar`를 기본으로 시작.
4. CRUD 모달은 `BaseCreateModal/BaseDetailModal` 우선 사용.
5. 버튼/입력/셀렉트/알림은 `components/common` 우선 재사용.

## 6) 신규 화면 시작 템플릿(권장 순서)

1. `apps/pages`에 페이지 생성
2. `Container.tsx`의 `menuItems`/`getPageInfo`에 경로와 breadcrumb 추가
3. `DataTable` 컬럼/정렬/페이지네이션 연결
4. 등록/상세 모달을 `BaseCreateModal`/`BaseDetailModal`로 연결
5. 저장/삭제 후 `Snackbar`로 피드백 처리

