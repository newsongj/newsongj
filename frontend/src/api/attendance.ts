import { get, post } from '@/api/client';
import {
  AbsentReasonItem,
  AttendanceBatchRequest,
  AttendanceBatchResponse,
  AttendanceKpiResponse,
  AttendancePageResponse,
  AttendanceRecordsParams,
  DashboardBaseParams,
  DimensionItem,
  DimensionParams,
  GyoguStatusItem,
  GyoguStatusParams,
  TrendItem,
  TrendParams,
} from '@/models/attendance.types';

export async function fetchAttendanceRecords(
  params: AttendanceRecordsParams
): Promise<AttendancePageResponse> {
  return get<AttendancePageResponse>('/api/attendance/records', params);
}

export async function saveAttendanceBatch(
  body: AttendanceBatchRequest
): Promise<AttendanceBatchResponse> {
  return post<AttendanceBatchResponse>('/api/attendance/records/batch', body);
}

export async function fetchAttendanceKpi(params: {
  start_date: string;
  end_date: string;
  gyogu_no?: number;
  team_no?: number;
  is_imwondan?: boolean;
}): Promise<AttendanceKpiResponse> {
  return get<AttendanceKpiResponse>('/api/attendance/dashboard/kpi', params);
}

export async function fetchAttendanceTrend(params: TrendParams): Promise<TrendItem[]> {
  return get<TrendItem[]>('/api/attendance/dashboard/trend', params);
}

export async function fetchAttendanceDimension(params: DimensionParams): Promise<DimensionItem[]> {
  return get<DimensionItem[]>('/api/attendance/dashboard/dimension', params);
}

export async function fetchAttendanceAbsentReason(
  params: DashboardBaseParams
): Promise<AbsentReasonItem[]> {
  return get<AbsentReasonItem[]>('/api/attendance/dashboard/absent-reason', params);
}

export async function fetchAttendanceGyoguStatus(
  params: GyoguStatusParams
): Promise<GyoguStatusItem[]> {
  return get<GyoguStatusItem[]>('/api/attendance/dashboard/gyogu-status', params);
}
