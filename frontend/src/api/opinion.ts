// 소견서 API
//
// ⚠️ 현재 백엔드 미구현 상태로, 아래 함수들은 목데이터를 반환한다.
//    실제 연동 시 각 함수 본문의 목데이터 처리를 주석 처리된 get/put 호출로 교체하면 된다.
//    엔드포인트·요청/응답 형태는 `OPINION_API_SPEC.md` 참고.

// import { get, put } from '@/api/client';
import {
  InputFieldKey,
  MemberFieldKey,
  OpinionCompanion,
  OpinionListParams,
  OpinionListResponse,
  OpinionMappingGroup,
  OpinionConflictError,
  OpinionMemberCandidate,
  OpinionReportRow,
  OpinionReportUpdateBody,
  OpinionSettings,
  OpinionSettingsSaveBody,
  OpinionWriter,
  OpinionWriterRole,
} from '@/models/opinion.types';

// ── 목데이터 생성 ─────────────────────────────────────────────────────────────

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
const GIVEN_M = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '준서', '건우'];
const GIVEN_F = ['서연', '서윤', '지우', '하윤', '민서', '지유', '채원', '수아', '지아', '다은'];

const MEMBER_TYPES = ['주일예배', '토요예배', '래사랑', '군지체', '해외지체'];
const GRADES = ['A', 'B', 'C', 'D', 'E'];
const PLT: (string | null)[] = ['수료', '1학기 수료', null];

const CURRENT_STATUS = ['신앙 성장 중', '정체', '회복 필요', '기타'];
const NEXT_YEAR_PLAN = ['계속 섬김', '리더 지원', '휴식', '기타'];
const ATT_STATUS = ['꾸준히 참석', '격주 참석', '월 1회 이하', '거의 미참석'];
const SCHOOLS = ['한국대', '서울대', '연세대', '고려대', '(주)뉴송'];
const MAJORS = ['경영학', '컴퓨터공학', '신학', '교육학', '기계공학'];

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

/** 삭제(soft delete)된 멤버 — 실제로는 member.deleted_at 으로 판정한다 */
const isDeletedMock = (memberId: number): boolean => memberId % 17 === 0;

// ── 동반배치 묶음 공유 저장소 (목데이터 전용) ─────────────────────────────────
//
// 팀배치 화면(`api/teamAssignment.ts`)이 등록하고, 소견서가 읽는다.
// teamAssignment → opinion 단방향 의존이므로 저장소를 이쪽에 둔다.

export interface MockCompanionPair {
  companion_no: number;
  member_id: number;
}

/** key = 팀배치 대상 연도 (소견서 report_year + 1) */
export const MOCK_COMPANION_STORE = new Map<number, MockCompanionPair[]>();

/**
 * 해당 멤버의 동반배치자 — 같은 묶음에서 본인을 제외한 인원.
 * 소견서 `report_year` 기준이므로 팀배치 연도는 +1 이다.
 */
const findCompanions = (memberId: number, reportYear: number): OpinionCompanion[] => {
  const pairs = MOCK_COMPANION_STORE.get(reportYear + 1);
  if (!pairs) return [];

  const mine = pairs.find((p) => p.member_id === memberId);
  if (!mine) return [];

  return pairs
    .filter((p) => p.companion_no === mine.companion_no && p.member_id !== memberId)
    .map((p) => MOCK_MEMBERS.find((m) => m.member_id === p.member_id))
    .filter((m): m is OpinionMemberCandidate => m !== undefined)
    .map((m) => ({
      member_id: m.member_id,
      name: m.name,
      gyogu: m.gyogu,
      team: m.team,
      group_no: m.group_no,
    }));
};

// ── 설정 ──────────────────────────────────────────────────────────────────────

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
 * 대상자 1명의 작성자 목록 — 우선순위가 아니라 **합집합**이다.
 *
 * 교구에서 팀장이 그룹장들과 전체 팀원을 함께 작성하므로, 팀원 한 명에 대해
 * 팀장과 그룹장이 모두 작성자가 된다. 소견서 자체는 대상자당 1건이고
 * 여러 작성자가 같은 건을 나눠 수정하는 형태다.
 */
const findWriters = (m: OpinionMemberCandidate): OpinionWriter[] => {
  const out: OpinionWriter[] = [];

  const push = (x: OpinionMemberCandidate, role: OpinionWriterRole) => {
    if (x.member_id === m.member_id) return;                    // 자기 자신 제외
    if (out.some((w) => w.member_id === x.member_id)) return;   // 중복 제거
    out.push({
      member_id: x.member_id,
      name: x.name,
      gyogu: x.gyogu,
      team: x.team,
      group_no: x.group_no,
      phone_number: x.phone_number,
      role,
    });
  };

  // 1) 임원단 매핑
  ensureMappings().forEach((g) => {
    if (g.targets.some((t) => t.member_id === m.member_id)) push(g.writer, '임원단');
  });

  // 2) 같은 그룹의 그룹장
  MOCK_MEMBERS
    .filter((x) => x.gyogu === m.gyogu && x.team === m.team && x.group_no === m.group_no
      && x.leader_names.includes('그룹장'))
    .forEach((x) => push(x, '그룹장'));

  // 3) 같은 팀의 팀장
  MOCK_MEMBERS
    .filter((x) => x.gyogu === m.gyogu && x.team === m.team && x.leader_names.includes('팀장'))
    .forEach((x) => push(x, '팀장'));

  return out;
};

// ── 행 생성 ───────────────────────────────────────────────────────────────────

const pad2 = (n: number): string => String(n).padStart(2, '0');

const buildRow = (m: OpinionMemberCandidate, reportYear: number): OpinionReportRow => {
  const seed = m.member_id;
  const isMale = rand(seed * 3) > 0.5;
  const written = rand(seed * 17) < 0.68;   // 약 68% 작성 완료
  const status = pick(CURRENT_STATUS, seed * 23);
  const plan = pick(NEXT_YEAR_PLAN, seed * 29);
  const birthYear = 2005 - (m.generation ?? 10);

  return {
    opinion_report_id: written ? 1000 + m.member_id : null,
    member_id: m.member_id,
    report_year: reportYear,
    is_deleted: isDeletedMock(m.member_id),

    name: m.name,
    gender: isMale ? '남' : '여',
    generation: m.generation,
    birthdate: birthYear + '-' + pad2(1 + (seed % 12)) + '-' + pad2(1 + (seed % 27)),
    phone_number: m.phone_number,
    gyogu: m.gyogu,
    team: m.team,
    group_no: m.group_no,
    member_type: pick(MEMBER_TYPES, seed * 5),
    attendance_grade: pick(GRADES, seed * 13),
    attendance_rate: Math.round(rand(seed * 19) * 6000) / 100,
    plt_status: pick(PLT, seed * 31),
    leader_names: m.leader_names,
    school_work: pick(SCHOOLS, seed * 41),
    major: pick(MAJORS, seed * 43),

    is_written: written,
    writers: findWriters(m),
    companions: findCompanions(m.member_id, reportYear),
    updated_at: written ? reportYear + '-11-' + pad2(1 + (seed % 28)) + 'T14:20:00' : null,

    current_status: written ? status : null,
    current_status_etc: written && status === '기타' ? '군 복무로 인한 장기 미참석' : null,
    group_meeting_attendance_status: written ? pick(ATT_STATUS, seed * 47) : null,
    sunday_morning_attendance_status: written ? pick(ATT_STATUS, seed * 53) : null,
    sunday_evening_attendance_status: written ? pick(ATT_STATUS, seed * 59) : null,
    next_year_plan: written ? plan : null,
    next_year_plan_etc: written && plan === '기타' ? '학업 병행으로 사역 조정 예정' : null,
    general_opinion: written
      ? m.name + ' 지체는 올 한 해 그룹모임에 성실히 참여하며 공동체 안에서 꾸준히 성장하는 모습을 보였습니다. '
        + '관계 안에서 섬김의 자세가 돋보였고, 바쁜 일정 가운데서도 신앙의 중심을 지키려 애썼습니다.'
      : null,
    special_opinion: written && rand(seed * 61) > 0.6
      ? '내년도 리더 후보로 추천드립니다. 다만 학업 일정이 바쁜 편이라 사역 강도 조절이 필요해 보입니다.'
      : null,
  };
};

/**
 * 상세 모달에서 수정한 내용을 세션 동안 유지 (목데이터 전용).
 * `updated_at`을 함께 보관해 낙관적 잠금 충돌을 실제로 재현할 수 있게 한다.
 */
interface MockEdit {
  fields: Partial<Record<InputFieldKey, string | null>>;
  updated_at: string;
}
const MOCK_EDITS = new Map<string, MockEdit>();

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

/** GET /api/opinion/mappings?report_year= */
export async function fetchOpinionMappings(reportYear: number): Promise<OpinionMappingGroup[]> {
  // return get<OpinionMappingGroup[]>('/api/opinion/mappings', { report_year: reportYear });
  void reportYear;
  return delay(ensureMappings());
}

/** GET /api/opinion/members — 매핑 모달 후보 + 대시보드 필터 옵션 (항상 전체 재적) */
export async function fetchOpinionMemberCandidates(): Promise<OpinionMemberCandidate[]> {
  // return get<OpinionMemberCandidate[]>('/api/opinion/members');
  return delay(MOCK_MEMBERS.filter((m) => !isDeletedMock(m.member_id)));
}

// ── 명단 / 대시보드 ───────────────────────────────────────────────────────────

/** GET /api/opinion/reports */
export async function fetchOpinionList(params: OpinionListParams): Promise<OpinionListResponse> {
  // return get<OpinionListResponse>('/api/opinion/reports', params);
  const scoped = MOCK_MEMBERS.filter((m) => {
    if (params.gyogu && m.gyogu !== params.gyogu) return false;
    if (params.team && m.team !== params.team) return false;
    if (params.group_no && m.group_no !== params.group_no) return false;
    return true;
  });

  let items = scoped
    .map((m) => {
      const row = buildRow(m, params.report_year);
      const edit = MOCK_EDITS.get(params.report_year + ':' + m.member_id);
      return edit
        ? { ...row, ...edit.fields, is_written: true, updated_at: edit.updated_at }
        : row;
    })
    // 삭제된 멤버는 소견서 행이 있을 때만 남긴다 — 재적자도 아니고 기록도 없으면 볼 이유가 없다
    .filter((r) => !r.is_deleted || r.is_written);

  // KPI는 전부 재적자(삭제 제외) 기준이며, 작성여부 필터를 적용하기 전에 집계한다
  const enrolledRows = items.filter((r) => !r.is_deleted);
  const target = enrolledRows.length;
  const written = enrolledRows.filter((r) => r.is_written).length;

  // 진행율 바는 필터와 무관한 전체 재적 기준
  const allEnrolled = MOCK_MEMBERS.filter((m) => !isDeletedMock(m.member_id));
  const writtenTotal = allEnrolled.filter((m) => {
    if (MOCK_EDITS.has(params.report_year + ':' + m.member_id)) return true;
    return buildRow(m, params.report_year).is_written;
  }).length;

  if (params.status === 'written') items = items.filter((r) => r.is_written);
  if (params.status === 'not_written') items = items.filter((r) => !r.is_written);

  return delay({
    enrolled: allEnrolled.length,
    written_total: writtenTotal,
    target,
    written,
    items,
  });
}

/**
 * PUT /api/opinion/reports/:member_id?report_year=
 *
 * 낙관적 잠금: `base_updated_at`이 서버가 들고 있는 값과 다르면 409로 거절한다.
 * 목데이터에서도 같은 판정을 재현해 프론트의 충돌 처리를 검증할 수 있게 했다.
 */
export async function updateOpinionReport(
  memberId: number,
  reportYear: number,
  body: OpinionReportUpdateBody,
): Promise<void> {
  // return put<void>(`/api/opinion/reports/${memberId}?report_year=${reportYear}`, body);
  const { base_updated_at: baseUpdatedAt, ...fields } = body;
  const key = reportYear + ':' + memberId;

  const current = MOCK_EDITS.get(key);
  const serverUpdatedAt = current
    ? current.updated_at
    : buildRow(MOCK_MEMBERS.find((m) => m.member_id === memberId)!, reportYear).updated_at;

  if ((serverUpdatedAt ?? null) !== (baseUpdatedAt ?? null)) {
    await delay(undefined, 120);
    throw new OpinionConflictError();
  }

  MOCK_EDITS.set(key, {
    fields: { ...current?.fields, ...fields },
    updated_at: new Date().toISOString().slice(0, 19),
  });
  return delay(undefined);
}
