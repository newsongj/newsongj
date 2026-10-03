// 소견서 API
//
// ✅ 명단/수정(§2) 은 백엔드 연동 완료.
// ⚠️ 설정·매핑·멤버 후보(§1) 는 **백엔드 미구현**이라 아직 목데이터를 반환한다.
//    `/api/opinion/settings` · `/mappings` · `/members` 가 생기면 교체한다.
//    계약은 `OPINION_ADMINPAGE_APISPEC.md` §1 참고.

import { get, put } from '@/api/client';
import {
  InputFieldKey,
  MemberFieldKey,
  OpinionListParams,
  OpinionListResponse,
  OpinionMappingGroup,
  OpinionConflictError,
  OpinionMemberCandidate,
  OpinionReportUpdateBody,
  OpinionSettings,
  OpinionSettingsSaveBody,
} from '@/models/opinion.types';

// ── 목데이터 생성 ─────────────────────────────────────────────────────────────

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
const GIVEN_M = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '준서', '건우'];
const GIVEN_F = ['서연', '서윤', '지우', '하윤', '민서', '지유', '채원', '수아', '지아', '다은'];

/** 시드 기반 의사난수 — 새로고침해도 목데이터가 흔들리지 않게 고정 */
const rand = (seed: number): number => {
  const x = Math.sin(seed * 9973) * 10000;
  return x - Math.floor(x);
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(rand(seed) * arr.length) % arr.length];
}

const mockPhone = (seed: number): string =>
  '010-' + String(1000 + (seed * 37) % 9000) + '-' + String(1000 + (seed * 71) % 9000);

const MOCK_MEMBERS: OpinionMemberCandidate[] = (() => {
  const out: OpinionMemberCandidate[] = [];
  let id = 1;
  for (let gyogu = 1; gyogu <= 3; gyogu++) {
    for (let team = 1; team <= 3; team++) {
      for (let group = 1; group <= 2; group++) {
        for (let n = 0; n < 4; n++) {
          const seed = id;
          const isMale = rand(seed * 3) > 0.5;
          const name = pick(SURNAMES, seed) + pick(isMale ? GIVEN_M : GIVEN_F, seed * 7);
          // 그룹 첫 인원은 그룹장, 1그룹 첫 인원은 팀장 겸임, 1교구 1팀 1그룹 첫 인원은 임원단
          const leaderNames: string[] = [];
          if (n === 0) leaderNames.push('그룹장');
          if (n === 0 && group === 1) leaderNames.push('팀장');
          if (n === 0 && group === 1 && team === 1) leaderNames.push('임원단');
          out.push({
            member_id: id,
            name,
            gyogu,
            team,
            group_no: group,
            generation: 10 + Math.floor(rand(seed * 11) * 8),
            phone_number: mockPhone(seed),
            leader_names: leaderNames,
          });
          id++;
        }
      }
    }
  }
  return out;
})();


function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * 기본으로 켜두는 교적 항목.
 *
 * **출석률(`attendance_rate`)은 제외**한다 — `member_profile` 에 실제 값이 거의 없어
 * (출석 데이터 미적재) 켜면 소견서에 `—` 만 늘어난다. 적재가 끝나면 설정 화면에서 켜면 된다.
 */
const DEFAULT_MEMBER_FIELDS: MemberFieldKey[] = [
  'name', 'gender', 'generation', 'gyogu', 'team', 'group_no',
  'member_type', 'leader_names', 'attendance_grade',
];

const DEFAULT_INPUT_FIELDS: InputFieldKey[] = [
  'current_status', 'current_status_etc',
  'group_meeting_attendance_status',
  'sunday_morning_attendance_status',
  'sunday_evening_attendance_status',
  'next_year_plan', 'next_year_plan_etc',
  'general_opinion', 'special_opinion',
];

const MOCK_CURRENT_YEAR = new Date().getFullYear();
const MOCK_SETTINGS = new Map<number, OpinionSettings>();
let MOCK_MAPPINGS: OpinionMappingGroup[] | null = null;

/**
 * 목데이터 기본 상태 — 세 가지 상태를 모두 확인할 수 있도록 연도별로 다르게 준다.
 *   미래 연도 → 미생성 / 올해 → 진행 중 / 과거 연도 → 완료(팀배치까지 끝난 상태)
 */
const buildDefaultSettings = (reportYear: number): OpinionSettings => ({
  report_year: reportYear,
  exists: reportYear <= MOCK_CURRENT_YEAR,
  is_active: reportYear >= MOCK_CURRENT_YEAR,
  // 완료된 회차는 사용자 페이지도 닫혀 있다
  is_open: reportYear >= MOCK_CURRENT_YEAR,
  theme: '하나님의 열심이 이루시리라',
  start_date: reportYear + '-11-01',
  end_date: reportYear + '-12-15',
  guide_text: '담당 지체 한 분 한 분을 떠올리며 사실에 근거해 작성해 주세요.',
  member_fields: DEFAULT_MEMBER_FIELDS,
  input_fields: DEFAULT_INPUT_FIELDS,
});

/** 매핑 목데이터 지연 초기화 — 작성자 산출에서도 쓰이므로 조회 전에 필요할 수 있다 */
const ensureMappings = (): OpinionMappingGroup[] => {
  if (!MOCK_MAPPINGS) {
    const executives = MOCK_MEMBERS.filter((m) => m.leader_names.includes('임원단'));
    MOCK_MAPPINGS = executives.length >= 2
      ? [{ writer: executives[0], targets: executives.slice(1, 3) }]
      : [];
  }
  return MOCK_MAPPINGS;
};

// ── 작성자 산출 ───────────────────────────────────────────────────────────────


/**
 * **실제 작성자** — 사용자 페이지에서 저장한 사람들.
 *
 * 실제 구현에서는 `member_opinion_report_writer` 를 조인해 가져온다. 저장 시
 * 로그인 토큰의 `member_id` 를 UPSERT 하므로 팀장·그룹장이 나눠 쓰면 둘 다 쌓인다.
 * 관리자의 대리 수정은 기록하지 않는다.
 *
 * 목데이터에는 저장 이력이 없으므로, 예정 작성자 중 일부가 실제로 썼다고

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ── 설정 API ──────────────────────────────────────────────────────────────────

/** GET /api/opinion/settings?report_year= */
export async function fetchOpinionSettings(reportYear: number): Promise<OpinionSettings> {
  // return get<OpinionSettings>('/api/opinion/settings', { report_year: reportYear });
  return delay(MOCK_SETTINGS.get(reportYear) ?? buildDefaultSettings(reportYear));
}

/** PUT /api/opinion/settings */
export async function saveOpinionSettings(body: OpinionSettingsSaveBody): Promise<void> {
  // return put<void>('/api/opinion/settings', body);
  const prev = MOCK_SETTINGS.get(body.report_year) ?? buildDefaultSettings(body.report_year);
  MOCK_SETTINGS.set(body.report_year, {
    ...body,
    exists: true,
    // 완료 전환은 팀배치가 담당한다 — 설정 저장으로는 상태가 바뀌지 않는다
    is_active: prev.is_active,
  });

  const byWriter = new Map<number, OpinionMemberCandidate[]>();
  body.mappings.forEach((pair) => {
    const list = byWriter.get(pair.writer_member_id) ?? [];
    const target = MOCK_MEMBERS.find((m) => m.member_id === pair.target_member_id);
    if (target) list.push(target);
    byWriter.set(pair.writer_member_id, list);
  });

  const groups: OpinionMappingGroup[] = [];
  byWriter.forEach((targets, writerId) => {
    const writer = MOCK_MEMBERS.find((m) => m.member_id === writerId);
    if (writer) groups.push({ writer, targets });
  });
  MOCK_MAPPINGS = groups;

  return delay(undefined);
}

/**
 * 팀배치 완료 시 서버가 수행하는 상태 전환 — 목데이터용 헬퍼.
 * 회차를 완료 처리하면서 사용자 작성 페이지도 함께 닫는다.
 */
export function closeOpinionRound(reportYear: number): void {
  const prev = MOCK_SETTINGS.get(reportYear) ?? buildDefaultSettings(reportYear);
  MOCK_SETTINGS.set(reportYear, { ...prev, exists: true, is_active: false, is_open: false });
}

/** GET /api/opinion/mappings?report_year= */
export async function fetchOpinionMappings(reportYear: number): Promise<OpinionMappingGroup[]> {
  // return get<OpinionMappingGroup[]>('/api/opinion/mappings', { report_year: reportYear });
  void reportYear;
  return delay(ensureMappings());
}

/**
 * 멤버 후보 목록 — **삭제 제외 교적 + 미등반 새가족 전체**.
 * 매핑 모달 후보 · 제외/동반 추가 모달 후보 · 대시보드 필터 옵션에 쓴다.
 *
 * 전용 엔드포인트를 두지 않고 `GET /api/opinion/reports` 를 재활용한다.
 * 소견서 현황 대시보드에 뜨는 바로 그 명단이고, 권한키가 `admin.opinion.*` 라
 * 소견서만 담당하는 계정이 교적 권한(`admin.gyojeok.members`) 없이 쓸 수 있다.
 * `/api/members` 를 쓰면 그 계정이 403 을 받는다.
 */
export async function fetchOpinionMemberCandidates(
  reportYear: number,
): Promise<OpinionMemberCandidate[]> {
  const res = await get<OpinionListResponse>('/api/opinion/reports', { report_year: reportYear });
  return res.items
    .filter((r) => !r.is_deleted)   // 삭제 명단은 선택 대상이 아니다
    .map((r) => ({
      member_id: r.member_id,
      name: r.name,
      gyogu: r.gyogu,
      team: r.team,
      group_no: r.group_no,
      generation: r.generation,
      phone_number: r.phone_number,
      leader_names: r.leader_names,
    }));
}

// ── 명단 / 대시보드 ───────────────────────────────────────────────────────────
//
// ✅ 백엔드 연동 완료 (`OPINION_ADMINPAGE_APISPEC.md` §2).

/** GET /api/opinion/reports — KPI 4장 + 진행율 바 + 명단을 한 응답에 담아 온다 */
export async function fetchOpinionList(params: OpinionListParams): Promise<OpinionListResponse> {
  return get<OpinionListResponse>('/api/opinion/reports', params);
}

/**
 * PUT /api/opinion/reports/:member_id?report_year=
 *
 * 낙관적 잠금 — `base_updated_at` 이 서버 값과 다르면 **409**.
 * 서버가 `current_updated_at` · `last_writer` · `is_self` 를 함께 내려주므로
 * 화면은 「○○ 님이 방금 저장했습니다」와 「다른 탭에서 저장된 내용입니다」를 가를 수 있다.
 *
 * `updated_at` 은 `DATETIME(3)` 이다 — 받은 밀리초를 **자르지 말고 그대로** 돌려보내야 한다.
 */
export async function updateOpinionReport(
  memberId: number,
  reportYear: number,
  body: OpinionReportUpdateBody,
): Promise<void> {
  try {
    await put<void>(`/api/opinion/reports/${memberId}?report_year=${reportYear}`, body);
  } catch (e: any) {
    if (e?.response?.status === 409) {
      const d = e.response.data ?? {};
      throw new OpinionConflictError(d.current_updated_at ?? null, d.last_writer ?? null, !!d.is_self);
    }
    throw e;
  }
}
