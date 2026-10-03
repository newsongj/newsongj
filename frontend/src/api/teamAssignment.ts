// 팀배치 API — 사전 설정(§3) · 팀배치 작업(§4)
//
// 백엔드 연동 완료. 계약은 `OPINION_ADMINPAGE_APISPEC.md` §3~§4 참고.
// 배치 알고리즘은 서버가 수행한다 (`팀배치_1번모듈.py` 이식분).

import { get, post, put } from '@/api/client';
import {
  TeamAssignmentBasicsBody,
  TeamAssignmentCommitResult,
  TeamAssignmentCompanion,
  TeamAssignmentCompanionPair,
  TeamAssignmentCounts,
  TeamAssignmentExclusion,
  TeamAssignmentExclusionItem,
  TeamAssignmentResultResponse,
  TeamAssignmentRun,
} from '@/models/teamAssignment.types';

// ── 회차 / 기본 정보 ──────────────────────────────────────────────────────────

/** GET /api/opinion/team-assignment?target_year= */
export async function fetchTeamAssignmentRun(targetYear: number): Promise<TeamAssignmentRun> {
  return get<TeamAssignmentRun>('/api/opinion/team-assignment', { target_year: targetYear });
}

/** PUT /api/opinion/team-assignment/basics */
export async function saveTeamAssignmentBasics(body: TeamAssignmentBasicsBody): Promise<void> {
  await put<TeamAssignmentRun>('/api/opinion/team-assignment/basics', body);
}

// ── 제외 명단 (사전 배치) ─────────────────────────────────────────────────────

/**
 * GET /api/opinion/team-assignment/exclusions?target_year=
 *
 * 응답에 `member`(이름·직분·기존 소속)가 함께 실려 오므로 화면이 따로 join 하지 않는다.
 */
export async function fetchTeamAssignmentExclusions(
  targetYear: number,
): Promise<TeamAssignmentExclusion[]> {
  return get<TeamAssignmentExclusion[]>(
    '/api/opinion/team-assignment/exclusions', { target_year: targetYear });
}

/** PUT /api/opinion/team-assignment/exclusions — 해당 연도 전체 대체 */
export async function saveTeamAssignmentExclusions(
  targetYear: number,
  items: TeamAssignmentExclusionItem[],
): Promise<void> {
  await put<void>('/api/opinion/team-assignment/exclusions',
    { target_year: targetYear, items });
}

// ── 동반배치 묶음 ─────────────────────────────────────────────────────────────

/** GET /api/opinion/team-assignment/companions?target_year= — 묶음 기준으로 그룹핑돼 온다 */
export async function fetchTeamAssignmentCompanions(
  targetYear: number,
): Promise<TeamAssignmentCompanion[]> {
  return get<TeamAssignmentCompanion[]>(
    '/api/opinion/team-assignment/companions', { target_year: targetYear });
}

/** PUT /api/opinion/team-assignment/companions — 해당 연도 전체 대체 */
export async function saveTeamAssignmentCompanions(
  targetYear: number,
  pairs: TeamAssignmentCompanionPair[],
): Promise<void> {
  await put<void>('/api/opinion/team-assignment/companions',
    { target_year: targetYear, pairs });
}

// ── 집계 ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/opinion/team-assignment/counts?target_year=
 * 배치 실행 전에도 조회된다. `total = random + companion + excluded` 가 성립한다.
 */
export async function fetchTeamAssignmentCounts(targetYear: number): Promise<TeamAssignmentCounts> {
  return get<TeamAssignmentCounts>(
    '/api/opinion/team-assignment/counts', { target_year: targetYear });
}

// ── 배치 실행 / 조회 / 조정 ───────────────────────────────────────────────────

/** POST /api/opinion/team-assignment/run — 랜덤배치 실행 (기존 결과를 덮어씀) */
export async function runTeamAssignment(targetYear: number): Promise<TeamAssignmentResultResponse> {
  return post<TeamAssignmentResultResponse>(
    '/api/opinion/team-assignment/run', { target_year: targetYear });
}

/** GET /api/opinion/team-assignment/result?target_year= */
export async function fetchTeamAssignmentResult(
  targetYear: number,
): Promise<TeamAssignmentResultResponse> {
  return get<TeamAssignmentResultResponse>(
    '/api/opinion/team-assignment/result', { target_year: targetYear });
}

/**
 * PUT /api/opinion/team-assignment/move — 팀 이동 (수기 조정)
 *
 * **사전 배치(제외 명단) 인원도 이동할 수 있다.** 제외는 랜덤배치에서 뺀다는 뜻일 뿐,
 * 배치 후 조정까지 막는 것은 아니다.
 */
export async function moveTeamAssignmentMember(
  targetYear: number,
  memberId: number,
  gyogu: number,
  team: number,
): Promise<void> {
  await put<void>('/api/opinion/team-assignment/move',
    { target_year: targetYear, member_id: memberId, gyogu, team });
}

/**
 * POST /api/opinion/team-assignment/commit — 소견서 완료 + 교적 이관
 *
 * ⚠️ **되돌릴 수 없다.** 배치 결과를 `member_profile` 에 새 행으로 복사하고
 * 해당 연도 소견서 회차를 닫는다. 이미 `committed` 면 서버가 거절한다.
 */
export async function commitTeamAssignment(targetYear: number): Promise<void> {
  await post<TeamAssignmentCommitResult>(
    '/api/opinion/team-assignment/commit', { target_year: targetYear });
}
