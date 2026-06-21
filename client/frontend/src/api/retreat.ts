import apiClient from './client';
import type { RetreatInfo, ResearchMember, ResearchResponseBody } from '@models/research.types';
import type { SuspendedMealMember, SuspendedMealSubmitBody } from '@models/suspendedMeal.types';

export interface VehicleMyResponse {
    member_id:    number;
    name:         string;
    gyogu:        number | null;
    team:         number | null;
    phone:        string | null;
    day1_bus:     number[];
    day2_bus:     number[];
    day3_bus:     number[];
    day4_bus:     number[];
    submitted_at: string | null;
}

export interface VehicleSubmitBody {
    day1_bus: number[];
    day2_bus: number[];
    day3_bus: number[];
    day4_bus: number[];
}

export const fetchRetreatInfo = () =>
    apiClient.get<RetreatInfo>('/retreat/active').then((r) => r.data);

export const fetchResearchMembers = (groupNo?: number) =>
    apiClient.get<ResearchMember[]>('/retreat/research/members', { params: { group_no: groupNo } }).then((r) => r.data);

export const saveResearchResponse = (memberId: number, body: ResearchResponseBody) =>
    apiClient.put(`/retreat/research/response/${memberId}`, body).then((r) => r.data);

export const fetchVehicleMy = () =>
    apiClient.get<VehicleMyResponse>('/vehicle/my').then((r) => r.data);

export const submitVehicle = (body: VehicleSubmitBody) =>
    apiClient.post('/vehicle', body).then((r) => r.data);

export const fetchSuspendedMealMembers = () =>
    apiClient.get<SuspendedMealMember[]>('/retreat/suspended-meal/members').then((r) => r.data);

export const submitSuspendedMeal = (memberId: number, body: SuspendedMealSubmitBody) =>
    apiClient.put(`/retreat/suspended-meal/response/${memberId}`, body).then((r) => r.data);
