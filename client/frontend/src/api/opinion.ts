// 소견서 작성 API (사용자 페이지) — 계약은 `OPINION_USERPAGE_APISPEC.md` §3 참고.
//
// 대상자 산출(누가 누구를 쓰는가)은 **서버가 판정한다.** 화면은 받은 목록을 그릴 뿐이다.
//   임원단        → opinion_report_mapping 에 걸린 대상자
//   팀장          → 같은 팀 전원 (그룹장 등 리더 포함, 임원단 제외)
//   그룹장        → 같은 그룹의 직분 없는 팀원
//   − 본인은 언제나 제외 (자기 소견서를 자기가 쓸 수 없다)
//
// 세 엔드포인트 모두 `user.opinion` 권한을 요구하고, 회차가 닫혀 있으면(§2-5) 403 이다.
// 403 은 세 종류라 화면이 서버 `detail` 문구를 그대로 보여준다.
//   "접근 권한이 없습니다."   — user.opinion 메뉴 없음
//   "소견서 기간이 아닙니다." — exists && is_active && is_open 중 하나라도 false
//   "담당 대상자가 아닙니다." — 내 담당이 아닌 member_id 를 직접 호출

import apiClient from './client';
import type {
    OpinionMyReportResponse,
    OpinionMyTargetsResponse,
    OpinionSaveBody,
} from '@models/opinion.types';
import { OpinionConflictError } from '@models/opinion.types';

/**
 * GET /api/opinion/my-targets?report_year=
 *
 * 회차 정보와 담당 대상자를 한 번에 받는다 — 작성 화면이 설정을 따로 조회하지 않게.
 * 담당자가 0명이어도 200 + `targets: []` 다. 404 를 쓰지 않는다.
 */
export async function fetchMyTargets(reportYear: number): Promise<OpinionMyTargetsResponse> {
    const res = await apiClient.get<OpinionMyTargetsResponse>('/opinion/my-targets', {
        params: { report_year: reportYear },
    });
    return res.data;
}

/**
 * GET /api/opinion/my-reports/:memberId?report_year=
 *
 * 기존 내용을 이어서 수정하기 위한 조회. `member` 에 교적 15개가 통째로 실려 오므로
 * 설정에서 무엇을 켜든 값이 비지 않는다.
 */
export async function fetchMyReport(
    memberId: number,
    reportYear: number,
): Promise<OpinionMyReportResponse> {
    const res = await apiClient.get<OpinionMyReportResponse>(`/opinion/my-reports/${memberId}`, {
        params: { report_year: reportYear },
    });
    return res.data;
}

/**
 * PUT /api/opinion/my-reports/:memberId?report_year=
 *
 * 검증 순서 — 회차 열림·배정(403) → 낙관적 잠금(409) → 항목 화이트리스트(400) → 길이(400).
 * `base_updated_at` 은 조회 때 받은 값을 **밀리초까지 그대로** 돌려보내야 한다.
 * `updated_at` 이 `DATETIME(3)` 이라 잘라 보내면 정상 저장도 409 가 된다.
 *
 * 저장이 성공하면 서버가 같은 트랜잭션에서 작성자(`member_opinion_report_writer`)를
 * 기록한다 — 관리자 명단의 「작성자」 칸이 그때 회색 (예정) 에서 실명으로 바뀐다.
 */
export async function saveMyReport(
    memberId: number,
    reportYear: number,
    body: OpinionSaveBody,
): Promise<void> {
    try {
        await apiClient.put(`/opinion/my-reports/${memberId}`, body, {
            params: { report_year: reportYear },
        });
    } catch (e: any) {
        if (e?.response?.status === 409) {
            // 409 본문은 평면 구조다 — { detail, current_updated_at, last_writer, is_self }
            const d = e.response.data ?? {};
            throw new OpinionConflictError(
                d.current_updated_at ?? null,
                d.last_writer?.name ?? null,
                !!d.is_self,
            );
        }
        throw e;
    }
}
