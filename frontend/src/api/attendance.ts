import { get, post } from '@/api/client';
import {
  AttendanceBatchRequest,
  AttendanceBatchResponse,
  AttendancePageResponse,
  AttendanceRecordsParams,
  DashboardQuery,
  DashboardResponse,
  NewcomerAttendanceBatchRequest,
  NewcomerAttendanceHistoryItem,
  NewcomerAttendancePageResponse,
  NewcomerAttendanceRecordsParams,
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

export async function fetchNewcomerAttendanceRecords(
  params: NewcomerAttendanceRecordsParams
): Promise<NewcomerAttendancePageResponse> {
  return get<NewcomerAttendancePageResponse>('/api/attendance/newcomers', params);
}

export async function saveNewcomerAttendanceBatch(
  body: NewcomerAttendanceBatchRequest
): Promise<AttendanceBatchResponse> {
  return post<AttendanceBatchResponse>('/api/attendance/newcomers/records/batch', body);
}

export async function fetchNewcomerAttendanceHistory(
  memberId: number,
  limit?: number
): Promise<NewcomerAttendanceHistoryItem[]> {
  return get<NewcomerAttendanceHistoryItem[]>(`/api/attendance/newcomers/${memberId}/history`, { limit });
}

export async function fetchAttendanceDashboard(
  params: DashboardQuery
): Promise<DashboardResponse> {
  return get<DashboardResponse>('/api/attendance/dashboard', params);
}

export async function fetchSundayReport(params: {
  date: string;
  gyogu_no?: number;
  team_no?: number;
}): Promise<Blob> {
  try {
    return await get<Blob>('/api/attendance/dashboard/sunday-report', params, {
      responseType: 'blob',
    });
  } catch (error: unknown) {
    // Binary requests also receive JSON error responses as a Blob.
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (data instanceof Blob) {
      const body = await data.text();
      let detail: unknown;
      try { detail = JSON.parse(body).detail; } catch { /* Non-JSON server error. */ }
      if (typeof detail === 'string') throw new Error(detail);
      throw new Error('주일보고 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw error;
  }
}
