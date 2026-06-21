import { get, post, put, del } from '@/api/client';
import {
  RetreatAccommodationResponse,
  RetreatHeadcountResponse,
  SuspendedMealListResponse,
  SuspendedMealReviewRequest,
  SuspendedMealStats,
  RetreatActiveResponse,
  RetreatCreateBody,
  RetreatCreateResponse,
  RetreatUpdateBody,
  BusCreateBody,
  ResearchListResponse,
  VehicleMemberListResponse,
  VehicleDashboardData,
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

// ── 수련회 설정 ───────────────────────────────────────────────────────────────

export async function getActiveRetreat(): Promise<RetreatActiveResponse> {
  return get<RetreatActiveResponse>('/api/retreat/active');
}

export async function createRetreat(body: RetreatCreateBody): Promise<RetreatCreateResponse> {
  return post<RetreatCreateResponse>('/api/retreat', body);
}

export async function updateRetreat(retreatId: number, body: RetreatUpdateBody): Promise<void> {
  return put<void>(`/api/retreat/${retreatId}`, body);
}

export async function createBus(body: BusCreateBody): Promise<{ bus_id: number }> {
  return post<{ bus_id: number }>('/api/bus', body);
}

export async function deleteBus(busId: number): Promise<void> {
  return del<void>(`/api/bus/${busId}`);
}

export async function completeRetreat(retreatId: number): Promise<void> {
  return put<void>(`/api/retreat/${retreatId}/complete`);
}

// ── 수련회 인원조사 ───────────────────────────────────────────────────────────

export async function fetchRetreatHeadcount(): Promise<RetreatHeadcountResponse> {
  return get<RetreatHeadcountResponse>('/api/retreat/headcount');
}

export async function fetchResearchList(): Promise<ResearchListResponse> {
  return get<ResearchListResponse>('/api/retreat/research/list');
}

export async function fetchVehicleMemberList(): Promise<VehicleMemberListResponse> {
  return get<VehicleMemberListResponse>('/api/retreat/vehicle-members');
}

// ── 수련회 차량조사 ───────────────────────────────────────────────────────────

export async function fetchRetreatVehicle(): Promise<VehicleDashboardData> {
  return get<VehicleDashboardData>('/api/retreat/vehicle');
}

// ── 수련회 숙소인원 ───────────────────────────────────────────────────────────

export async function fetchRetreatAccommodation(params?: {
  gyogu_no?: number;
  team_no?: number;
  is_imwondan?: boolean;
}): Promise<RetreatAccommodationResponse> {
  return get<RetreatAccommodationResponse>('/api/retreat/accommodation', params);
}
