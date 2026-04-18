import { get, put } from '@/api/client';
import {
  RetreatAccommodationResponse,
  RetreatHeadcountResponse,
  RetreatVehicleResponse,
  SuspendedMealListResponse,
  SuspendedMealReviewRequest,
  SuspendedMealStats,
} from '@/models/retreat.types';

// ── 서스펜디드밀 ──────────────────────────────────────────────────────────────

export async function fetchSuspendedMealList(params?: {
  page?: number;
  size?: number;
  review_status?: string;
}): Promise<SuspendedMealListResponse> {
  return get<SuspendedMealListResponse>('/api/retreat/suspended-meal', params);
}

export async function fetchSuspendedMealStats(): Promise<SuspendedMealStats> {
  return get<SuspendedMealStats>('/api/retreat/suspended-meal/stats');
}

export async function reviewSuspendedMeal(
  applicationId: number,
  body: SuspendedMealReviewRequest
): Promise<void> {
  return put<void>(`/api/retreat/suspended-meal/${applicationId}/review`, body);
}

// ── 수련회 인원조사 ───────────────────────────────────────────────────────────

export async function fetchRetreatHeadcount(): Promise<RetreatHeadcountResponse> {
  return get<RetreatHeadcountResponse>('/api/retreat/headcount');
}

// ── 수련회 차량조사 ───────────────────────────────────────────────────────────

export async function fetchRetreatVehicle(): Promise<RetreatVehicleResponse> {
  return get<RetreatVehicleResponse>('/api/retreat/vehicle');
}

// ── 수련회 숙소인원 ───────────────────────────────────────────────────────────

export async function fetchRetreatAccommodation(params?: {
  gyogu_no?: number;
  team_no?: number;
  is_imwondan?: boolean;
}): Promise<RetreatAccommodationResponse> {
  return get<RetreatAccommodationResponse>('/api/retreat/accommodation', params);
}
