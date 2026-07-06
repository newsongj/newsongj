import apiClient from './client';
import type { RetreatInfo, ResearchMember, ResearchResponseBody } from '@models/research.types';
import type { SuspendedMealMember, SuspendedMealSubmitBody } from '@models/suspendedMeal.types';
import type { PatientRoomMember, PatientRoomSubmitBody } from '@models/patientRoom.types';

export interface WaitingBusInfo {
    bus_id:          number;
    bus_name:        string;
    departure_date:  string;
    departure_time:  string;
    waiting_number:  number;
}

export interface VehicleMyResponse {
    member_id:     number;
    name:          string;
    gyogu:         number | null;
    team:          number | null;
    phone:         string | null;
    day1_bus:      number[];
    day2_bus:      number[];
    day3_bus:      number[];
    day4_bus:      number[];
    submitted_at:  string | null;
    waiting_buses: WaitingBusInfo[];
}

export interface VehicleSubmitBody {
    day1_bus:       number[];
    day2_bus:       number[];
    day3_bus:       number[];
    day4_bus:       number[];
    accept_waiting?: boolean;
}

export interface FullBusInfo {
    bus_id:         number;
    bus_name:       string;
    departure_time: string;
}

export interface VehicleSubmitResponse {
    waiting_required: boolean;
    full_buses:       FullBusInfo[];
    waiting_numbers:  Record<number, number>;
}

export const fetchRetreatInfo = () =>
    apiClient.get<RetreatInfo>('/retreat/active').then((r) => r.data);

export const fetchGyoguList = () =>
    apiClient.get<number[]>('/gyogu-list').then((r) => r.data);

export const fetchResearchMembers = (params?: { groupNo?: number; gyogu?: number; team?: number }) =>
    apiClient.get<ResearchMember[]>('/retreat/research/members', {
        params: { group_no: params?.groupNo, gyogu: params?.gyogu, team: params?.team },
    }).then((r) => r.data);

export const saveResearchResponse = (memberId: number, body: ResearchResponseBody) =>
    apiClient.put(`/retreat/research/response/${memberId}`, body).then((r) => r.data);

export const fetchVehicleMy = () =>
    apiClient.get<VehicleMyResponse>('/vehicle/my').then((r) => r.data);

export const submitVehicle = (body: VehicleSubmitBody) =>
    apiClient.post<VehicleSubmitResponse>('/vehicle', body).then((r) => r.data);

export const fetchSuspendedMealMembers = (params?: { gyogu?: number; team?: number }) =>
    apiClient.get<SuspendedMealMember[]>('/retreat/suspended-meal/members', {
        params: { gyogu: params?.gyogu, team: params?.team },
    }).then((r) => r.data);

export const submitSuspendedMeal = (memberId: number, body: SuspendedMealSubmitBody) =>
    apiClient.put(`/retreat/suspended-meal/response/${memberId}`, body).then((r) => r.data);

export const fetchPatientRoomMembers = (params?: { gyogu?: number; team?: number }) =>
    apiClient.get<PatientRoomMember[]>('/retreat/patient-room/members', {
        params: { gyogu: params?.gyogu, team: params?.team },
    }).then((r) => r.data);

export const submitPatientRoom = (memberId: number, body: PatientRoomSubmitBody) =>
    apiClient.put(`/retreat/patient-room/response/${memberId}`, body).then((r) => r.data);
