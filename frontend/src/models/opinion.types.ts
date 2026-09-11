// 소견서 (member_opinion_report) 관련 타입
//
// - 교적 자동 기입 항목: member / member_profile 에서 읽어와 소견서에 그대로 표시 (작성자 입력 불가)
// - 작성자 직접 입력 항목: member_opinion_report 의 current_status ~ special_opinion 컬럼

// ── 항목 키 ───────────────────────────────────────────────────────────────────

/** 교적 자동 기입 항목 키 */
export type MemberFieldKey =
  | 'name'
  | 'gender'
  | 'generation'
  | 'birthdate'
  | 'phone_number'
  | 'gyogu'
  | 'team'
  | 'group_no'
  | 'member_type'
  | 'attendance_grade'
  | 'attendance_rate'
  | 'plt_status'
  | 'leader_names'
  | 'school_work'
  | 'major';

/** 작성자 직접 입력 항목 키 */
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

// ── 항목 메타 ─────────────────────────────────────────────────────────────────

export const MEMBER_FIELD_LABELS: Record<MemberFieldKey, string> = {
  name:             '이름',
  gender:           '성별',
  generation:       '기수',
  birthdate:        '생년월일',
  phone_number:     '연락처',
  gyogu:            '교구',
  team:             '팀',
  group_no:         '그룹',
  member_type:      '구분',
  attendance_grade: '출석등급',
  attendance_rate:  '출석률',
  plt_status:       'PLT 수료',
  leader_names:     '직분',
  school_work:      '학교 / 직장',
  major:            '전공',
};

/** 설정 화면·소견서 본문에서의 노출 순서 */
export const MEMBER_FIELD_ORDER: MemberFieldKey[] = [
  'name', 'gender', 'generation', 'birthdate', 'phone_number',
  'gyogu', 'team', 'group_no', 'member_type', 'leader_names',
  'attendance_grade', 'attendance_rate', 'plt_status',
  'school_work', 'major',
];

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

export const INPUT_FIELD_ORDER: InputFieldKey[] = [
  'current_status', 'current_status_etc',
  'group_meeting_attendance_status',
  'sunday_morning_attendance_status',
  'sunday_evening_attendance_status',
  'next_year_plan', 'next_year_plan_etc',
  'general_opinion', 'special_opinion',
];

/**
 * 기타설명란은 단독으로 켤 수 없고 부모 항목이 켜져 있어야 한다.
 * 부모를 끄면 자식도 함께 꺼진다.
 */
export const INPUT_FIELD_PARENT: Partial<Record<InputFieldKey, InputFieldKey>> = {
  current_status_etc: 'current_status',
  next_year_plan_etc: 'next_year_plan',
};

/** 긴 텍스트(textarea)로 입력받는 항목 */
export const INPUT_FIELD_MULTILINE: InputFieldKey[] = ['general_opinion', 'special_opinion'];

/**
 * 입력 최대 길이 — `member_opinion_report` 컬럼 정의에 맞춘 값.
 *
 * VARCHAR(N)은 문자 수 기준이라 그대로 쓴다.
 * TEXT는 65,535 **바이트**이고 utf8mb4 한글이 글자당 3바이트라 약 21,845자가 한계이므로,
 * 여유를 둬 20,000자로 제한한다.
 *
 * 컬럼 길이를 바꿀 때 이 값도 함께 고쳐야 한다.
 */
export const INPUT_FIELD_MAX_LENGTH: Record<InputFieldKey, number> = {
  current_status:                   100,    // VARCHAR(100)
  current_status_etc:               255,    // VARCHAR(255)
  group_meeting_attendance_status:  255,    // VARCHAR(255)
  sunday_morning_attendance_status: 255,    // VARCHAR(255)
  sunday_evening_attendance_status: 255,    // VARCHAR(255)
  next_year_plan:                   255,    // VARCHAR(255)
  next_year_plan_etc:               255,    // VARCHAR(255)
  general_opinion:                  20000,  // TEXT
  special_opinion:                  20000,  // TEXT
};

/** 입력 길이 카운터를 노출할 임계 비율 — 이 비율을 넘으면 `N/최대` 를 보여준다 */
export const INPUT_COUNTER_THRESHOLD = 0.8;

// ── 설정 ──────────────────────────────────────────────────────────────────────

/** 소견서 회차 상태 */
export type OpinionPhase = 'none' | 'active' | 'done';

/** 소견서 설정 (opinion_report_custom) */
export interface OpinionSettings {
  report_year: number;
  /** 해당 연도 설정이 생성되어 있는지 — false면 '미생성' */
  exists: boolean;
  /**
   * true=진행 중, false=완료.
   * 완료 전환은 팀배치 화면에서 팀배치를 마칠 때 일어난다.
   * 소견서 설정 화면은 이 값을 읽어 잠그기만 하고 직접 바꾸지 않는다.
   */
  is_active: boolean;
  /** 소견서 주제(표어) — PDF 머리말에 표시 */
  theme: string | null;
  start_date: string | null;
  end_date: string | null;
  /**
   * 작성자 안내 문구 — **사용자 소견서 작성 페이지(client) 상단 전용**.
   * PDF에는 넣지 않는다.
   */
  guide_text: string | null;
  member_fields: MemberFieldKey[];
  input_fields: InputFieldKey[];
}

/** 소견서 설정 저장 요청 — exists / is_active 는 서버가 관리하므로 보내지 않는다 */
export interface OpinionSettingsSaveBody extends Omit<OpinionSettings, 'exists' | 'is_active'> {
  mappings: OpinionMappingPair[];
}

/** 설정 상태 판정 */
export const getOpinionPhase = (s: OpinionSettings | null): OpinionPhase => {
  if (!s || !s.exists) return 'none';
  return s.is_active ? 'active' : 'done';
};

export const OPINION_PHASE_LABEL: Record<OpinionPhase, string> = {
  none: '미생성',
  active: '진행 중',
  done: '완료',
};

// ── 임원단 매핑 ───────────────────────────────────────────────────────────────

/** 매핑 저장 단위 — (작성자, 대상) 1쌍 = opinion_report_mapping 1행 */
export interface OpinionMappingPair {
  writer_member_id: number;
  target_member_id: number;
}

/** 멤버 선택 모달·매핑 테이블에서 쓰는 멤버 요약 */
export interface OpinionMemberCandidate {
  member_id: number;
  name: string;
  gyogu: number | null;
  team: number | null;
  group_no: number | null;
  generation: number | null;
  phone_number: string | null;
  leader_names: string[];
}

/** 이 대상자를 작성하게 된 근거 */
export type OpinionWriterRole = '임원단' | '팀장' | '그룹장';

/**
 * 소견서 작성자.
 *
 * 소견서는 대상자당 1건이지만 작성자는 여러 명일 수 있다 —
 * 교구에서 팀장이 그룹장들과 전체 팀원을 함께 작성하므로, 팀원 한 명에 대해
 * 팀장과 그룹장이 같은 1건을 나눠 수정하는 형태다.
 */
export interface OpinionWriter {
  member_id: number;
  name: string;
  gyogu: number | null;
  team: number | null;
  group_no: number | null;
  phone_number: string | null;
  role: OpinionWriterRole;
}

/**
 * 동반배치자 — 팀배치에서 같은 팀에 배치되도록 묶인 사람.
 *
 * `team_assignment_companion` 에 등록된 같은 묶음 인원 중 본인을 제외한 목록이다.
 * **관리자 소견서 상세·PDF에만 표시하고, 작성자(사용자) 페이지에는 노출하지 않는다.**
 */
export interface OpinionCompanion {
  member_id: number;
  name: string;
  gyogu: number | null;
  team: number | null;
  group_no: number | null;
}

/** 작성자 기준으로 묶은 매핑 (화면 표시용) */
export interface OpinionMappingGroup {
  writer: OpinionMemberCandidate;
  targets: OpinionMemberCandidate[];
}

// ── 대시보드 ──────────────────────────────────────────────────────────────────

/** 필터 조건 */
export interface OpinionListParams {
  report_year: number;
  gyogu?: number;
  team?: number;
  group_no?: number;
  /** 'all' | 'written' | 'not_written' */
  status?: OpinionWriteStatus;
}

export type OpinionWriteStatus = 'all' | 'written' | 'not_written';

/**
 * 소견서 1건 = 대상자 1명.
 * 미작성이어도 대상자면 행이 나오며 opinion_report_id 가 null 이다.
 *
 * 교적 항목과 소견서 내용을 한 응답에 모두 담는다 — 상세 모달과 일괄 PDF가
 * 추가 조회 없이 이미 받아둔 배열만으로 동작하게 하기 위함.
 */
export interface OpinionReportRow {
  opinion_report_id: number | null;
  member_id: number;
  report_year: number;
  /**
   * member.deleted_at 이 있으면 true.
   * 조회 시점 값이므로 멤버를 복원하면 자동으로 false가 된다 (스냅샷 아님).
   */
  is_deleted: boolean;

  // 교적 자동 기입
  name: string;
  gender: '남' | '여' | null;
  generation: number | null;
  birthdate: string | null;
  phone_number: string | null;
  gyogu: number | null;
  team: number | null;
  group_no: number | null;
  member_type: string | null;
  attendance_grade: string | null;
  attendance_rate: number | null;
  plt_status: string | null;
  leader_names: string[];
  school_work: string | null;
  major: string | null;

  // 작성 현황
  is_written: boolean;
  /** 이 소견서를 작성·수정할 수 있는 사람들 (임원단 매핑 ∪ 그룹장 ∪ 팀장) */
  writers: OpinionWriter[];
  /** 동반배치 묶음의 다른 인원 — 관리자 상세·PDF 전용, 작성자 페이지 미노출 */
  companions: OpinionCompanion[];
  updated_at: string | null;

  // 작성자 직접 입력
  current_status: string | null;
  current_status_etc: string | null;
  group_meeting_attendance_status: string | null;
  sunday_morning_attendance_status: string | null;
  sunday_evening_attendance_status: string | null;
  next_year_plan: string | null;
  next_year_plan_etc: string | null;
  general_opinion: string | null;
  special_opinion: string | null;
}

/** 소견서 명단 응답 */
export interface OpinionListResponse {
  /** 전체 교적 인원 — 진행율 바의 분모 (필터 무관) */
  enrolled: number;
  /** 전체 작성 완료 인원 — 진행율 바의 분자 (필터 무관) */
  written_total: number;
  /** 필터 적용 후 대상 인원 — 삭제된 멤버는 제외 */
  target: number;
  /** 필터 적용 후 작성 완료 인원 — 삭제된 멤버는 제외 */
  written: number;
  items: OpinionReportRow[];
}

/** 소견서 내용 수정 요청 — 작성자 직접 입력 항목 + 낙관적 잠금 기준값 */
export type OpinionReportUpdateBody = Partial<Record<InputFieldKey, string | null>> & {
  /**
   * 조회 시 받은 `updated_at`. 서버가 DB 값과 비교해 다르면 409로 거절한다.
   *
   * 소견서 1건을 팀장·그룹장이 함께 수정하므로, 없으면 나중에 저장한 사람이
   * 앞사람 내용을 통째로 덮어쓴다. 신규 작성(레코드 없음)이면 null.
   */
  base_updated_at: string | null;
};

/** 낙관적 잠금 충돌 — 다른 작성자가 먼저 저장한 경우 */
export class OpinionConflictError extends Error {
  constructor(message = '다른 작성자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 작성해 주세요.') {
    super(message);
    this.name = 'OpinionConflictError';
  }
}
