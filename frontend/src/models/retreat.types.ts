// ── 서스펜디드밀 ──────────────────────────────────────────────────────────────

export type ReviewStatus = 'APPROVED' | 'REJECTED';

export interface SuspendedMealApplication {
  application_id: number;
  member_id: number;
  member_name: string;
  meal_count: number;
  fee_support: boolean;
  applicant_reason: string | null;
  applied_at: string;
  review_status: ReviewStatus | null;
  review_comment: string | null;
  reviewed_at: string | null;
}

export interface SuspendedMealListResponse {
  items: SuspendedMealApplication[];
  total: number;
}

export interface SuspendedMealReviewRequest {
  review_status: ReviewStatus;
  review_comment: string;
}

export interface SuspendedMealStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ── 수련회 인원조사 ───────────────────────────────────────────────────────────

export type GenderFilter = 'all' | 'male' | 'female';

export interface RetreatDayHeadcount {
  total: number;
  undecided: number;   // 미정
  absent: number;      // 불참
  normal: number;      // 정상 (첫째날만)
  attend: number;      // 참석 (둘째날~셋째날)
  late: number;        // 후발
}

export interface RetreatHeadcountResponse {
  enrolled: number;    // 재적 인원
  surveyed: number;    // 조사 완료 인원
  total: number;       // 수련회 전체 기간 총인원
  male: number;
  female: number;
  day1: RetreatDayHeadcount;
  day2: RetreatDayHeadcount;
  day3: RetreatDayHeadcount;
}

// ── 수련회 차량조사 ───────────────────────────────────────────────────────────

export interface VehicleTimeSlot {
  time: string;   // e.g. "09:00", "13:00"
  count: number;
}

export interface VehicleDayData {
  total: number;
  slots: VehicleTimeSlot[];
}

export interface RetreatVehicleTypeData {
  day1: VehicleDayData;
  day2: VehicleDayData;
  day3: VehicleDayData;
}

export interface RetreatVehicleResponse {
  normal_depart: number;       // 정상 출발 인원
  late: RetreatVehicleTypeData;   // 후발
  pickup: RetreatVehicleTypeData; // 픽업
  return: RetreatVehicleTypeData; // 귀경
}

// ── 수련회 숙소/야식 인원 ─────────────────────────────────────────────────────

export interface RetreatAccommodationDayData {
  total: number;
  male: number;
  female: number;
}

export interface RetreatAccommodationResponse {
  day1: RetreatAccommodationDayData;
  day2: RetreatAccommodationDayData;
  day3: RetreatAccommodationDayData;
}
