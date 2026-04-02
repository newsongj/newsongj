import { get } from '@/api/client';

export interface LeaderOption {
  leader_id: number;
  leader_name: string;
}

/** 직분 목록 조회 */
export async function fetchLeaders(): Promise<LeaderOption[]> {
  return get<LeaderOption[]>('/api/meta/leaders');
}
