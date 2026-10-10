// 소견서 API — 계약은 `OPINION_ADMINPAGE_APISPEC.md` §1 · §2 참고.

import { get, put } from '@/api/client';
import {
  OpinionListParams,
  OpinionListResponse,
  OpinionMappingGroup,
  OpinionConflictError,
  OpinionMemberCandidate,
  OpinionReportUpdateBody,
  OpinionSettings,
  OpinionSettingsSaveBody,
} from '@/models/opinion.types';

// ── 설정 API (§1) ─────────────────────────────────────────────────────────────

/**
 * GET /api/opinion/settings?report_year=
 *
 * 설정이 없는 연도도 404 가 아니라 `exists: false` + 기본값으로 온다.
 */
export async function fetchOpinionSettings(reportYear: number): Promise<OpinionSettings> {
  return get<OpinionSettings>('/api/opinion/settings', { report_year: reportYear });
}

/**
 * PUT /api/opinion/settings — 설정 + 임원단 매핑을 한 번에 저장한다.
 *
 * `mappings` 는 해당 연도 전체를 통째로 대체한다. 완료(`is_active = false`)된 연도는 409.
 * 완료 전환은 팀배치 commit 이 담당하므로 이 API 로는 상태가 바뀌지 않는다.
 */
export async function saveOpinionSettings(body: OpinionSettingsSaveBody): Promise<void> {
  return put<void>('/api/opinion/settings', body);
}

/** GET /api/opinion/mappings?report_year= — 작성자 기준으로 묶여 온다 */
export async function fetchOpinionMappings(reportYear: number): Promise<OpinionMappingGroup[]> {
  return get<OpinionMappingGroup[]>('/api/opinion/mappings', { report_year: reportYear });
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
