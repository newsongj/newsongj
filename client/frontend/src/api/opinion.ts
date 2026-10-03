// 소견서 작성 API (사용자 페이지)
//
// ⚠️ 백엔드 미구현 — `/api/opinion/my-targets` · `/my-reports` 가 아직 없다.
//    현재는 목데이터를 반환하며, 각 함수의 주석 처리된 호출로 교체하면 바로 붙는다.
//    계약은 `OPINION_USERPAGE_APISPEC.md` §3 참고.
//
// 대상자 산출(누가 누구를 쓰는가)은 **서버가 판정한다.** 화면은 받은 목록을 그릴 뿐이다.
//   임원단        → opinion_report_mapping 에 걸린 대상자
//   팀장          → 같은 팀 전원 (그룹장 등 리더 포함, 임원단 제외)
//   그룹장        → 같은 그룹의 직분 없는 팀원
//   − 본인은 언제나 제외 (자기 소견서를 자기가 쓸 수 없다)

// import apiClient from './client';
import type {
    InputFieldKey,
    MemberFieldKey,
    OpinionMyReportResponse,
    OpinionMyTargetsResponse,
    OpinionSaveBody,
    OpinionTarget,
} from '@models/opinion.types';
import { OpinionConflictError } from '@models/opinion.types';

// ── 목데이터 ──────────────────────────────────────────────────────────────────

/** 관리자 설정 기본값과 동일 — 9개 전부 */
const MOCK_INPUT_FIELDS: InputFieldKey[] = [
    'current_status', 'current_status_etc',
    'group_meeting_attendance_status',
    'sunday_morning_attendance_status',
    'sunday_evening_attendance_status',
    'next_year_plan', 'next_year_plan_etc',
    'general_opinion', 'special_opinion',
];

/**
 * 관리자 「소견서 설정」에서 체크한 항목만 이 화면에 나온다.
 * 아래 목은 관리자 쪽 기본값(`frontend/src/api/opinion.ts` 의 `DEFAULT_MEMBER_FIELDS`)과
 * **같은 값**으로 맞춰 둔 것이다 — 백엔드가 붙으면 서버가 내려주는 값으로 대체된다.
 *
 * **출석률(`attendance_rate`)은 빠져 있다** — `member_profile` 에 실제 값이 거의 없다.
 */
const MOCK_MEMBER_FIELDS: MemberFieldKey[] = [
    'name', 'gender', 'generation', 'gyogu', 'team', 'group_no',
    'member_type', 'leader_names', 'attendance_grade',
];

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤'];
const GIVEN = ['민준', '서연', '도윤', '지우', '시우', '하윤', '준서', '채원', '예준', '수아'];

/** 팀장 시점을 가정한 담당 대상자 — 같은 팀 전원, 본인 제외 */
const MOCK_TARGETS: OpinionTarget[] = Array.from({ length: 11 }, (_, i) => {
    const id = 101 + i;
    return {
        member_id: id,
        name: SURNAMES[i % SURNAMES.length] + GIVEN[i % GIVEN.length],
        gender: i % 3 === 0 ? '여' : '남',
        generation: 12 + (i % 6),
        gyogu: 3,
        team: 1,
        group_no: (i % 2) + 1,
        member_type: i % 4 === 0 ? '새가족' : '주일예배',
        is_written: i % 3 === 0,
        updated_at: i % 3 === 0 ? `2026-11-0${(i % 9) + 1}T14:20:31.482` : null,
    };
});

/** 저장된 내용 — 새로고침 전까지만 유지된다 */
const MOCK_SAVED = new Map<string, { fields: Record<string, string | null>; updated_at: string }>();
const savedKey = (reportYear: number, memberId: number) => `${reportYear}:${memberId}`;

function delay<T>(value: T, ms = 300): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const nowStamp = () => new Date().toISOString().replace('Z', '').slice(0, 23);

// ── API ───────────────────────────────────────────────────────────────────────

/**
 * GET /api/opinion/my-targets?report_year=
 *
 * 회차 정보와 담당 대상자를 한 번에 받는다 — 작성 화면이 설정을 따로 조회하지 않게.
 * 회차가 닫혀 있으면(`exists && is_active && is_open` 중 하나라도 false) 서버가 **403**.
 */
export async function fetchMyTargets(reportYear: number): Promise<OpinionMyTargetsResponse> {
    // return apiClient.get('/opinion/my-targets', { params: { report_year: reportYear } })
    //     .then((r) => r.data);
    const targets = MOCK_TARGETS.map((t) => {
        const saved = MOCK_SAVED.get(savedKey(reportYear, t.member_id));
        return saved ? { ...t, is_written: true, updated_at: saved.updated_at } : t;
    });
    return delay({
        report_year: reportYear,
        theme: '하나님의 열심이 이루시리라',
        end_date: `${reportYear}-12-15`,
        guide_text: '담당 지체 한 분 한 분을 떠올리며 사실에 근거해 작성해 주세요.',
        input_fields: MOCK_INPUT_FIELDS,
        member_fields: MOCK_MEMBER_FIELDS,
        targets,
    });
}

/** GET /api/opinion/my-reports/:memberId?report_year= — 기존 내용을 이어서 수정하기 위한 조회 */
export async function fetchMyReport(
    memberId: number,
    reportYear: number,
): Promise<OpinionMyReportResponse> {
    // return apiClient.get(`/opinion/my-reports/${memberId}`, { params: { report_year: reportYear } })
    //     .then((r) => r.data);
    const target = MOCK_TARGETS.find((t) => t.member_id === memberId)!;
    const saved = MOCK_SAVED.get(savedKey(reportYear, memberId));
    return delay({
        member_id: memberId,
        report_year: reportYear,
        updated_at: saved?.updated_at ?? target.updated_at,
        // 교적 15개를 통째로 — 설정이 바뀌어도 이 응답을 손댈 필요가 없다
        member: {
            name: target.name,
            gender: target.gender,
            generation: target.generation,
            birthdate: `19${90 + (memberId % 10)}-0${(memberId % 9) + 1}-1${memberId % 10}`,
            phone_number: `010-${1000 + (memberId * 7) % 9000}-${1000 + (memberId * 13) % 9000}`,
            gyogu: target.gyogu,
            team: target.team,
            group_no: target.group_no,
            member_type: target.member_type,
            leader_names: memberId % 5 === 0 ? ['그룹장'] : [],
            attendance_grade: ['A', 'B', 'C', 'D'][memberId % 4],
            attendance_rate: Math.round((40 + (memberId * 7) % 60) * 10) / 10,
            plt_status: memberId % 3 === 0 ? '수료' : null,
            school_work: ['한국대', '서울대', '(주)뉴송'][memberId % 3],
            major: ['경영학', '컴퓨터공학', '신학'][memberId % 3],
        },
        ...(saved?.fields ?? {}),
    });
}

/**
 * PUT /api/opinion/my-reports/:memberId?report_year=
 *
 * 검증 순서 — 배정 확인(403) → 낙관적 잠금(409) → 항목 화이트리스트 → 길이.
 * `base_updated_at` 은 조회 때 받은 값을 **밀리초까지 그대로** 돌려보내야 한다.
 */
export async function saveMyReport(
    memberId: number,
    reportYear: number,
    body: OpinionSaveBody,
): Promise<void> {
    // try {
    //     await apiClient.put(`/opinion/my-reports/${memberId}?report_year=${reportYear}`, body);
    // } catch (e: any) {
    //     if (e?.response?.status === 409) {
    //         const d = e.response.data ?? {};
    //         throw new OpinionConflictError(
    //             d.current_updated_at ?? null, d.last_writer?.name ?? null, !!d.is_self);
    //     }
    //     throw e;
    // }
    const { base_updated_at: base, ...fields } = body;
    const target = MOCK_TARGETS.find((t) => t.member_id === memberId)!;
    const serverUpdatedAt = MOCK_SAVED.get(savedKey(reportYear, memberId))?.updated_at ?? target.updated_at;

    if ((serverUpdatedAt ?? null) !== (base ?? null)) {
        await delay(undefined, 120);
        throw new OpinionConflictError(serverUpdatedAt, '이서연', false);
    }

    MOCK_SAVED.set(savedKey(reportYear, memberId), {
        fields: fields as Record<string, string | null>,
        updated_at: nowStamp(),
    });
    return delay(undefined);
}
