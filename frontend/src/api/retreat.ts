import { get, post, put, del, patch } from '@/api/client';
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
  PatientRoomListResponse,
  PatientRoomReviewRequest,
  PatientRoomStats,
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

export async function patchResearchFeePaid(memberId: number, isFeePaid: boolean): Promise<void> {
  return patch<void>(`/api/retreat/research/${memberId}/fee-paid`, { is_fee_paid: isFeePaid });
}

export async function fetchVehicleMemberList(params?: { gyogu?: number; team?: number; bus_id?: number }): Promise<VehicleMemberListResponse> {
  const query = new URLSearchParams();
  if (params?.gyogu)  query.set('gyogu',  String(params.gyogu));
  if (params?.team)   query.set('team',   String(params.team));
  if (params?.bus_id) query.set('bus_id', String(params.bus_id));
  const qs = query.toString();
  return get<VehicleMemberListResponse>(`/api/retreat/vehicle-members${qs ? `?${qs}` : ''}`);
}

// ── 환자방 ────────────────────────────────────────────────────────────────────

export async function fetchPatientRoomList(params?: {
  page?: number;
  size?: number;
  review_status?: string;
}): Promise<PatientRoomListResponse> {
  return get<PatientRoomListResponse>('/api/retreat/patient-room', params);
}

export async function fetchPatientRoomStats(): Promise<PatientRoomStats> {
  return get<PatientRoomStats>('/api/retreat/patient-room/stats');
}

export async function reviewPatientRoom(applicationId: number, body: PatientRoomReviewRequest): Promise<void> {
  return put<void>(`/api/retreat/patient-room/${applicationId}/review`, body);
}

// ── 수련회 차량조사 ───────────────────────────────────────────────────────────

export async function fetchRetreatVehicle(): Promise<VehicleDashboardData> {
  return get<VehicleDashboardData>('/api/retreat/vehicle');
}

// ── 수련회 숙소인원 ───────────────────────────────────────────────────────────

export async function fetchRetreatAccommodation(params?: {
  gyogu_no?: number;
  team_no?: number;
}): Promise<RetreatAccommodationResponse> {
  return get<RetreatAccommodationResponse>('/api/retreat/accommodation', params);
}
