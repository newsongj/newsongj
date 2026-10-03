// 소견서 작성 (사용자 페이지) 타입
//
// 계약은 `OPINION_USERPAGE_APISPEC.md` 참고.
// 관리자 쪽(`frontend/src/models/opinion.types.ts`)과 항목 키·라벨을 맞춘다.

/** 교적 자동 기입 항목 — 대상자 카드에 읽기 전용으로 보여준다 */
export type MemberFieldKey =
    | 'name' | 'gender' | 'generation' | 'birthdate' | 'phone_number'
    | 'gyogu' | 'team' | 'group_no' | 'member_type'
    | 'attendance_grade' | 'attendance_rate' | 'plt_status'
    | 'leader_names' | 'school_work' | 'major';

/** 작성자 직접 입력 항목 */
export type InputFieldKey =
    | 'current_status'
    | 'current_status_etc'
    | 'group_meeting_attendance_status'
    | 'sunday_morning_attendance_status'
    | 'sunday_evening_attendance_status'
    | 'next_year_plan'
    | 'next_year_plan_etc'
    | 'general_opinion'
    | 'special_opinion';

export const MEMBER_FIELD_LABELS: Record<MemberFieldKey, string> = {
    name: '이름', gender: '성별', generation: '기수', birthdate: '생년월일',
    phone_number: '연락처', gyogu: '교구', team: '팀', group_no: '그룹',
    member_type: '구분', attendance_grade: '출석등급', attendance_rate: '출석률',
    plt_status: 'PLT 수료', leader_names: '직분', school_work: '학교 / 직장', major: '전공',
};

export const INPUT_FIELD_LABELS: Record<InputFieldKey, string> = {
    current_status:                   '현재상태',
    current_status_etc:               '현재상태 기타설명',
    group_meeting_attendance_status:  '그룹모임 출석현황',
    sunday_morning_attendance_status: '주일낮예배 출석현황',
    sunday_evening_attendance_status: '주일저녁예배 출석현황',
    next_year_plan:                   '다음년도 계획',
    next_year_plan_etc:               '다음년도 계획 기타설명',
    general_opinion:                  '전체소견',
    special_opinion:                  '특별소견',
};

/** 화면 노출 순서 — 설정에서 켜진 항목만 이 순서대로 렌더한다 */
export const INPUT_FIELD_ORDER: InputFieldKey[] = [
    'current_status', 'current_status_etc',
    'group_meeting_attendance_status',
    'sunday_morning_attendance_status',
    'sunday_evening_attendance_status',
    'next_year_plan', 'next_year_plan_etc',
    'general_opinion', 'special_opinion',
];

/** 긴 텍스트(textarea)로 받는 항목 */
export const INPUT_FIELD_MULTILINE: InputFieldKey[] = ['general_opinion', 'special_opinion'];

/**
 * 단답 7개의 입력 한도 — DB 컬럼이 아니라 **PDF 지면**이 기준이다.
 *
 * 소견서 PDF 는 소견 내용을 2단으로 싣고 좌측 단이 본문 폭의 약 1/3이라,
 * 항목마다 한 줄을 넘기면 7개가 한 장에 들어가지 않는다.
 * 관리자 쪽 `SHORT_INPUT_MAX_LENGTH` 와 같은 값이어야 한다.
 */
export const SHORT_INPUT_MAX_LENGTH = 20;

/** 전체소견·특별소견 한도 — TEXT 컬럼(65,535바이트 ÷ 한글 3바이트)에 여유를 둔 값 */
export const LONG_INPUT_MAX_LENGTH = 20000;

export const INPUT_FIELD_MAX_LENGTH: Record<InputFieldKey, number> = {
    current_status:                   SHORT_INPUT_MAX_LENGTH,
    current_status_etc:               SHORT_INPUT_MAX_LENGTH,
    group_meeting_attendance_status:  SHORT_INPUT_MAX_LENGTH,
    sunday_morning_attendance_status: SHORT_INPUT_MAX_LENGTH,
    sunday_evening_attendance_status: SHORT_INPUT_MAX_LENGTH,
    next_year_plan:                   SHORT_INPUT_MAX_LENGTH,
    next_year_plan_etc:               SHORT_INPUT_MAX_LENGTH,
    general_opinion:                  LONG_INPUT_MAX_LENGTH,
    special_opinion:                  LONG_INPUT_MAX_LENGTH,
};

/** 기타설명란은 부모 항목이 켜져 있어야 의미가 있다 */
export const INPUT_FIELD_PARENT: Partial<Record<InputFieldKey, InputFieldKey>> = {
    current_status_etc: 'current_status',
    next_year_plan_etc: 'next_year_plan',
};

// ── 응답 ──────────────────────────────────────────────────────────────────────

/** 담당 대상자 1명 — 목록 카드에 쓰는 요약 */
export interface OpinionTarget {
    member_id:    number;
    name:         string;
    gender:       string | null;
    generation:   number | null;
    gyogu:        number | null;
    team:         number | null;
    group_no:     number | null;
    member_type:  string | null;
    is_written:   boolean;
    /** 낙관적 잠금 기준값. `DATETIME(3)` 이라 밀리초가 실려 온다 */
    updated_at:   string | null;
}

/** `GET /api/opinion/my-targets` 응답 — 회차 정보 + 담당 대상자 */
export interface OpinionMyTargetsResponse {
    report_year:   number;
    /** 소견서 주제(표어) — 상단 배너. 없으면 영역을 렌더하지 않는다 */
    theme:         string | null;
    /** 작성 마감일 — D-day 계산용 */
    end_date:      string | null;
    /** 작성자 안내 문구 — 상단 가이드. PDF 에는 들어가지 않는다 */
    guide_text:    string | null;
    input_fields:  InputFieldKey[];
    member_fields: MemberFieldKey[];
    targets:       OpinionTarget[];
}

/** 소견서 본문 9개 항목 */
export type OpinionFields = Partial<Record<InputFieldKey, string | null>>;

/**
 * 교적 항목 값 — `leader_names` 만 배열이고 `attendance_rate` 는 숫자(%)다.
 * 나머지는 문자열이거나 null.
 */
export type MemberValueMap = Partial<Record<MemberFieldKey, string | number | string[] | null>>;

/** `GET /api/opinion/my-reports/:memberId` 응답 */
export interface OpinionMyReportResponse extends OpinionFields {
    member_id:   number;
    report_year: number;
    /** 미작성이면 null */
    updated_at:  string | null;
    /**
     * 교적 항목 15개 — 설정에서 무엇을 켜든 값이 나오도록 **통째로** 내려온다.
     * 화면은 `member_fields` 에 켜진 것만 골라 읽기 전용으로 보여준다.
     */
    member:      MemberValueMap;
}

/** 저장 요청 — 낙관적 잠금 기준값을 함께 싣는다 */
export interface OpinionSaveBody extends OpinionFields {
    /** 조회 때 받은 `updated_at` 을 **자르지 말고 그대로** 돌려보낸다 */
    base_updated_at: string | null;
}

/** 저장 충돌(409) — 서버가 누가 저장했는지 알려준다 */
export class OpinionConflictError extends Error {
    readonly currentUpdatedAt: string | null;
    readonly isSelf: boolean;

    constructor(currentUpdatedAt: string | null, writerName: string | null, isSelf: boolean) {
        super(isSelf
            ? '다른 탭에서 저장된 내용입니다. 최신 내용을 불러왔습니다.'
            : writerName
                ? `${writerName} 님이 방금 저장했습니다. 최신 내용을 불러왔습니다.`
                : '다른 작성자가 먼저 수정했습니다. 최신 내용을 불러왔습니다.');
        this.name = 'OpinionConflictError';
        this.currentUpdatedAt = currentUpdatedAt;
        this.isSelf = isSelf;
    }
}

// ── D-day ─────────────────────────────────────────────────────────────────────

/**
 * 마감까지 남은 일수 — **KST 날짜 기준**.
 *
 * `toISOString()` 을 쓰면 KST 자정이 UTC 전날 15시가 되어 하루 밀린다.
 * 수련회 출석에서 실제로 났던 버그라 문자열 비교로 처리한다.
 */
export const kstToday = (): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

export const daysUntil = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const [ty, tm, td] = kstToday().split('-').map(Number);
    const [ey, em, ed] = endDate.slice(0, 10).split('-').map(Number);
    const diff = Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td);
    return Math.round(diff / 86400000);
};

/** `D-12` / `D-DAY` / `마감` */
export const formatDday = (endDate: string | null): string | null => {
    const d = daysUntil(endDate);
    if (d === null) return null;
    if (d > 0) return `D-${d}`;
    return d === 0 ? 'D-DAY' : '마감';
};
