// 팀배치 작업 관련 타입
//
// 소견서 작성이 끝나면 팀배치를 돌려 다음 연도 교적을 만든다.
// 배치 결과는 곧바로 member_profile 에 쓰지 않고 템프 테이블에 두고 조정한 뒤,
// 「소견서 완료」 시점에 한 번에 커밋한다 (조정 중 값이 연도 스냅샷을 오염시키지 않게).
//
// 배치 알고리즘은 기존 `팀배치_1번모듈.py`를 그대로 옮긴 것이다:
//   (성별 × 출석등급) 조합별 groupby → 총 팀 수만큼 라운드로빈 분배

import { OpinionMemberCandidate } from '@/models/opinion.types';

/** 회차 진행 상태 */
export type TeamAssignmentStatus = 'draft' | 'assigned' | 'committed';

export const TEAM_ASSIGNMENT_STATUS_LABEL: Record<TeamAssignmentStatus, string> = {
  draft: '배치 전',
  assigned: '조정 중',
  committed: '완료',
};

/** 팀배치 회차 — 기본 정보 + 상태 */
export interface TeamAssignmentRun {
  target_year: number;
  /** 총 팀 수 (기본 36 = 3교구 × 12팀) */
  total_team_count: number;
  /** 교구 수 (기본 3) */
  gyogu_count: number;
  /** 배치에 쓴 셔플 시드 — 같은 결과를 재현할 때 사용 */
  random_seed?: number | null;
  status: TeamAssignmentStatus;
  assigned_at: string | null;
  committed_at: string | null;
}

/** 기본 정보 저장 요청 */
export interface TeamAssignmentBasicsBody {
  target_year: number;
  total_team_count: number;
  gyogu_count: number;
}

/**
 * 동반배치 묶음 — 같은 `companion_no` 는 같은 팀에 배치된다.
 * 랜덤배치 **전에** 등록해야 배치가 이 제약을 지킬 수 있다.
 */
export interface TeamAssignmentCompanion {
  companion_no: number;
  members: OpinionMemberCandidate[];
}

/** 동반배치 저장 단위 — (묶음번호, 멤버) 1쌍 = 테이블 1행 */
export interface TeamAssignmentCompanionPair {
  companion_no: number;
  member_id: number;
}

/**
 * 제외 명단 — 랜덤배치에서 빼고 교구·팀을 **수기로 사전 지정**하는 인원.
 *
 * 임원단 사전 매치, 팀장·그룹장 사전 배치 등에 쓴다.
 * 랜덤배치는 이 사람들이 앉은 자리를 제외한 나머지를 채우므로,
 * **팀 정원 계산에는 포함**된다.
 *
 * 사전 배치라도 팀배치 실행 뒤 결과 화면에서 팀을 다시 옮길 수 있다.
 */
export interface TeamAssignmentExclusion {
  member: OpinionMemberCandidate;
  gyogu: number;
  team: number;
  /** 제외 사유 — 임원단 사전배치 / 팀장 사전배치 등 */
  reason: string | null;
}

/** 제외 명단 저장 단위 */
export interface TeamAssignmentExclusionItem {
  member_id: number;
  gyogu: number;
  team: number;
  reason: string | null;
}

/**
 * 배치 인원 집계 — KPI 카드용.
 *
 * `total = random + companion + excluded` 가 성립하도록 정의한다.
 * `random`은 **동반 묶음에 속하지 않은 개별 랜덤 대상자**만 센다.
 * 삭제 명단(`member.deleted_at`)은 어디에도 포함되지 않는다.
 */
export interface TeamAssignmentCounts {
  /** 배치 대상 전체 (삭제 제외) */
  total: number;
  /** 그중 새가족 */
  newcomer: number;
  /** 그중 일반 교적 */
  regular: number;
  /** 개별 랜덤배치 대상 */
  random: number;
  /** 동반배치 묶음에 속한 인원 */
  companion: number;
  /** 제외(사전 배치) 인원 */
  excluded: number;
}

/**
 * 배치 결과 1행 = 멤버 1명.
 *
 * 교적 명단(`MemberListPage`)과 **같은 컬럼 구성**을 갖는다 — 배치 후 명단을
 * 교적 명단처럼 그대로 훑어볼 수 있어야 하기 때문이다.
 */
export interface TeamAssignmentRow {
  member_id: number;
  name: string;
  gender: '남' | '여' | null;
  generation: number | null;
  phone_number: string | null;
  birthdate: string | null;
  /** 배치 층화 기준 — (성별 × 등급) */
  attendance_grade: string | null;
  member_type: string | null;
  plt_status: string | null;
  school_work: string | null;
  major: string | null;
  v8pid: string | null;
  /** 등반일자 */
  enrolled_at: string | null;
  leader_names: string[];

  // 기존(올해) 소속
  prev_gyogu: number | null;
  prev_team: number | null;
  prev_group_no: number | null;

  // 배치 결과
  gyogu: number;
  team: number;
  /**
   * 항상 0 — 팀배치는 교구·팀까지만 정하고, 그룹은 내년 팀장이 배치한다.
   * `member_profile.group_no` 가 NOT NULL 이라 0으로 채운다.
   */
  group_no: number;

  /** 동반배치 묶음 번호 (없으면 null) */
  companion_no: number | null;
  /** 제외 명단으로 사전 배치된 행 */
  is_excluded: boolean;
  /** 배치 후 수기로 팀을 옮긴 행 */
  is_manual: boolean;
}

/** 교구·팀별 인원 요약 — 배치 균형 확인용 */
export interface TeamAssignmentSummaryCell {
  gyogu: number;
  team: number;
  total: number;
  male: number;
  female: number;
}

/** 배치 결과 조회 응답 */
export interface TeamAssignmentResultResponse {
  run: TeamAssignmentRun;
  counts: TeamAssignmentCounts;
  rows: TeamAssignmentRow[];
}

/** 팀 이동 요청 */
export interface TeamAssignmentMoveBody {
  member_id: number;
  gyogu: number;
  team: number;
}
