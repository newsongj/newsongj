// 팀배치 작업 API
//
// ⚠️ 백엔드 미구현 — 목데이터로 동작한다.
//    배치 알고리즘은 `1번모듈.py`를 그대로 옮겼으므로, 백엔드 구현 시 같은 순서를
//    지켜야 결과가 재현된다. 자세한 내용은 `opinion_todo.md` 「팀배치」 참고.

// import { get, post, put } from '@/api/client';
import { fetchOpinionList, MOCK_COMPANION_STORE } from '@/api/opinion';
import { OpinionMemberCandidate, OpinionReportRow } from '@/models/opinion.types';
import {
  TeamAssignmentBasicsBody,
  TeamAssignmentCompanion,
  TeamAssignmentCompanionPair,
  TeamAssignmentResultResponse,
  TeamAssignmentRow,
  TeamAssignmentRun,
} from '@/models/teamAssignment.types';

const DEFAULT_TEAM_COUNT = 36;   // 3교구 × 12팀
const DEFAULT_GYOGU_COUNT = 3;

// ── 목 상태 ───────────────────────────────────────────────────────────────────

const MOCK_RUNS = new Map<number, TeamAssignmentRun>();
const MOCK_ROWS = new Map<number, TeamAssignmentRow[]>();

// 동반배치 묶음은 소견서 쪽과 공유한다 — 등록하면 관리자 소견서 상세·PDF에 바로 반영된다
const MOCK_COMPANIONS = MOCK_COMPANION_STORE;

const buildDefaultRun = (targetYear: number): TeamAssignmentRun => ({
  target_year: targetYear,
  total_team_count: DEFAULT_TEAM_COUNT,
  gyogu_count: DEFAULT_GYOGU_COUNT,
  status: 'draft',
  assigned_at: null,
  committed_at: null,
});

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const nowIso = () => new Date().toISOString().slice(0, 19);

// ── 배치 대상 풀 ──────────────────────────────────────────────────────────────

/**
 * 배치 대상 = 삭제 명단(`member.deleted_at IS NOT NULL`)을 제외한 전원.
 *
 * 목데이터에서는 소견서 명단 응답을 재활용한다 — 성별·등급·구분·직분이 전부
 * 들어 있어 층화 배분에 필요한 값이 그대로 확보된다.
 */
const loadPool = async (targetYear: number): Promise<OpinionReportRow[]> => {
  const res = await fetchOpinionList({ report_year: targetYear - 1 });
  return res.items.filter((r) => !r.is_deleted);
};

// ── 배치 알고리즘 (1번모듈.py 이식) ───────────────────────────────────────────

/** 시드 기반 셔플 — 같은 seed면 같은 결과가 나오도록 (원본 모듈에는 없던 재현성) */
const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
  const out = [...arr];
  let s = seed || 1;
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * 배치 단위 — 동반배치 묶음은 여러 명이 하나의 단위가 되어 통째로 같은 팀에 들어간다.
 * 층화 기준(성별·등급)은 묶음 대표(첫 멤버)의 값을 쓴다.
 */
interface AssignUnit {
  members: OpinionReportRow[];
  companion_no: number | null;
  gender: string;
  grade: string;
}

const buildUnits = (
  pool: OpinionReportRow[],
  companions: TeamAssignmentCompanionPair[],
): AssignUnit[] => {
  const byMember = new Map(pool.map((r) => [r.member_id, r]));
  const companionOf = new Map(companions.map((c) => [c.member_id, c.companion_no]));

  // 묶음별로 멤버 모으기
  const groups = new Map<number, OpinionReportRow[]>();
  companions.forEach((c) => {
    const row = byMember.get(c.member_id);
    if (!row) return;
    const list = groups.get(c.companion_no) ?? [];
    list.push(row);
    groups.set(c.companion_no, list);
  });

  const units: AssignUnit[] = [];
  groups.forEach((members, companionNo) => {
    if (members.length === 0) return;
    units.push({
      members,
      companion_no: companionNo,
      gender: members[0].gender ?? '남',
      grade: members[0].attendance_grade ?? 'E',
    });
  });

  // 묶음에 속하지 않은 개인
  pool.forEach((r) => {
    if (companionOf.has(r.member_id)) return;
    units.push({
      members: [r],
      companion_no: null,
      gender: r.gender ?? '남',
      grade: r.attendance_grade ?? 'E',
    });
  });

  return units;
};

/**
 * (성별 × 등급) 조합별 라운드로빈 분배.
 *
 * `1번모듈.py`와 동일하게 **teamIndex 를 조합 사이에서 리셋하지 않는다** —
 * 그래야 조합 경계에서도 팀 간 균형이 유지된다.
 */
const assignUnits = (
  units: AssignUnit[],
  totalTeamCount: number,
  gyoguCount: number,
  seed: number,
): TeamAssignmentRow[] => {
  const shuffled = seededShuffle(units, seed);

  // (성별, 등급) 조합별로 묶음
  const buckets = new Map<string, AssignUnit[]>();
  shuffled.forEach((u) => {
    const key = `${u.gender}-${u.grade}`;
    const list = buckets.get(key) ?? [];
    list.push(u);
    buckets.set(key, list);
  });

  const teamPerGyogu = Math.max(1, Math.floor(totalTeamCount / gyoguCount));
  const rows: TeamAssignmentRow[] = [];
  let teamIndex = 0;

  [...buckets.keys()].sort().forEach((key) => {
    (buckets.get(key) ?? []).forEach((unit) => {
      const gyogu = Math.min(gyoguCount, Math.floor(teamIndex / teamPerGyogu) + 1);
      const team = (teamIndex % teamPerGyogu) + 1;

      unit.members.forEach((m) => {
        rows.push({
          member_id: m.member_id,
          name: m.name,
          gender: m.gender,
          generation: m.generation,
          attendance_grade: m.attendance_grade,
          member_type: m.member_type,
          leader_names: m.leader_names,
          prev_gyogu: m.gyogu,
          prev_team: m.team,
          prev_group_no: m.group_no,
          gyogu,
          team,
          group_no: 0,   // 그룹은 내년 팀장이 배치
          companion_no: unit.companion_no,
          is_manual: false,
        });
      });

      teamIndex = (teamIndex + 1) % totalTeamCount;
    });
  });

  return rows;
};

// ── 회차 / 기본 정보 ──────────────────────────────────────────────────────────

/** GET /api/opinion/team-assignment?target_year= */
export async function fetchTeamAssignmentRun(targetYear: number): Promise<TeamAssignmentRun> {
  // return get<TeamAssignmentRun>('/api/opinion/team-assignment', { target_year: targetYear });
  return delay(MOCK_RUNS.get(targetYear) ?? buildDefaultRun(targetYear));
}

/** PUT /api/opinion/team-assignment/basics */
export async function saveTeamAssignmentBasics(body: TeamAssignmentBasicsBody): Promise<void> {
  // return put<void>('/api/opinion/team-assignment/basics', body);
  const prev = MOCK_RUNS.get(body.target_year) ?? buildDefaultRun(body.target_year);
  MOCK_RUNS.set(body.target_year, {
    ...prev,
    total_team_count: body.total_team_count,
    gyogu_count: body.gyogu_count,
  });
  return delay(undefined);
}

// ── 동반배치 묶음 ─────────────────────────────────────────────────────────────

/** GET /api/opinion/team-assignment/companions?target_year= */
export async function fetchTeamAssignmentCompanions(
  targetYear: number,
  memberPool: OpinionMemberCandidate[],
): Promise<TeamAssignmentCompanion[]> {
  // return get<TeamAssignmentCompanion[]>('/api/opinion/team-assignment/companions', { target_year: targetYear });
  const pairs = MOCK_COMPANIONS.get(targetYear) ?? [];
  const byMember = new Map(memberPool.map((m) => [m.member_id, m]));

  const grouped = new Map<number, OpinionMemberCandidate[]>();
  pairs.forEach((p) => {
    const m = byMember.get(p.member_id);
    if (!m) return;
    const list = grouped.get(p.companion_no) ?? [];
    list.push(m);
    grouped.set(p.companion_no, list);
  });

  const out: TeamAssignmentCompanion[] = [];
  [...grouped.keys()].sort((a, b) => a - b).forEach((no) => {
    out.push({ companion_no: no, members: grouped.get(no) ?? [] });
  });
  return delay(out);
}

/** PUT /api/opinion/team-assignment/companions — 해당 연도 전체 대체 */
export async function saveTeamAssignmentCompanions(
  targetYear: number,
  pairs: TeamAssignmentCompanionPair[],
): Promise<void> {
  // return put<void>('/api/opinion/team-assignment/companions', { target_year: targetYear, pairs });
  MOCK_COMPANIONS.set(targetYear, pairs);
  return delay(undefined);
}

// ── 배치 실행 / 조회 / 조정 ───────────────────────────────────────────────────

/** POST /api/opinion/team-assignment/run — 랜덤배치 실행 (기존 결과를 덮어씀) */
export async function runTeamAssignment(targetYear: number): Promise<TeamAssignmentResultResponse> {
  // return post<TeamAssignmentResultResponse>('/api/opinion/team-assignment/run', { target_year: targetYear });
  const run = MOCK_RUNS.get(targetYear) ?? buildDefaultRun(targetYear);
  if (run.status === 'committed') {
    throw new Error('이미 완료된 회차입니다. 다시 배치할 수 없습니다.');
  }

  const pool = await loadPool(targetYear);
  const companions = MOCK_COMPANIONS.get(targetYear) ?? [];
  const seed = Math.floor(Math.random() * 2147483647);

  // 동반배치 묶음을 하나의 배치 단위로 압축한 뒤 층화 라운드로빈
  const units = buildUnits(pool, companions);
  const rows = assignUnits(units, run.total_team_count, run.gyogu_count, seed);
  MOCK_ROWS.set(targetYear, rows);

  const next: TeamAssignmentRun = {
    ...run, status: 'assigned', assigned_at: nowIso(), random_seed: seed,
  };
  MOCK_RUNS.set(targetYear, next);

  return delay({ run: next, target_count: pool.length, rows });
}

/** GET /api/opinion/team-assignment/result?target_year= */
export async function fetchTeamAssignmentResult(
  targetYear: number,
): Promise<TeamAssignmentResultResponse> {
  // return get<TeamAssignmentResultResponse>('/api/opinion/team-assignment/result', { target_year: targetYear });
  const run = MOCK_RUNS.get(targetYear) ?? buildDefaultRun(targetYear);
  const rows = MOCK_ROWS.get(targetYear) ?? [];
  return delay({ run, target_count: rows.length, rows });
}

/** PUT /api/opinion/team-assignment/move — 팀 이동 (수기 조정) */
export async function moveTeamAssignmentMember(
  targetYear: number,
  memberId: number,
  gyogu: number,
  team: number,
): Promise<void> {
  // return put<void>('/api/opinion/team-assignment/move', { target_year: targetYear, member_id: memberId, gyogu, team });
  const rows = MOCK_ROWS.get(targetYear);
  if (!rows) throw new Error('배치 결과가 없습니다.');

  MOCK_ROWS.set(
    targetYear,
    rows.map((r) => (r.member_id === memberId ? { ...r, gyogu, team, is_manual: true } : r)),
  );
  return delay(undefined);
}

/**
 * POST /api/opinion/team-assignment/commit — 소견서 완료 + 교적 이관
 *
 * 서버에서는 트랜잭션으로 묶어야 한다:
 *   temp → member_profile INSERT (updated_at = '{target_year}-01-01')
 *   opinion_report_custom.is_active = 0  (report_year = target_year - 1)
 *   run.status = 'committed'
 * 이미 committed 면 거절 — 프로필이 두 벌 쌓이는 걸 막는다.
 */
export async function commitTeamAssignment(targetYear: number): Promise<void> {
  // return post<void>('/api/opinion/team-assignment/commit', { target_year: targetYear });
  const run = MOCK_RUNS.get(targetYear);
  if (!run || run.status !== 'assigned') {
    throw new Error('배치를 먼저 실행해주세요.');
  }
  MOCK_RUNS.set(targetYear, { ...run, status: 'committed', committed_at: nowIso() });
  return delay(undefined);
}
