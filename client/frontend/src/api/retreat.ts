import apiClient from './client';
import type { RetreatInfo, ResearchMember, ResearchResponseBody } from '@models/research.types';

export const fetchRetreatInfo = () =>
    apiClient.get<RetreatInfo>('/retreat/active').then((r) => r.data);

export const fetchResearchMembers = (groupNo?: number) =>
    apiClient.get<ResearchMember[]>('/retreat/research/members', { params: { group_no: groupNo } }).then((r) => r.data);

export const saveResearchResponse = (memberId: number, body: ResearchResponseBody) =>
    apiClient.put(`/retreat/research/response/${memberId}`, body).then((r) => r.data);
