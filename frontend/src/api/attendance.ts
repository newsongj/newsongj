import { get, post } from '@/api/client';
import {
  AttendanceBatchRequest,
  AttendanceBatchResponse,
  AttendancePageResponse,
  AttendanceRecordsParams,
  DashboardQuery,
  DashboardResponse,
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

export async function fetchAttendanceDashboard(
  params: DashboardQuery
): Promise<DashboardResponse> {
  return get<DashboardResponse>('/api/attendance/dashboard', params);
}
