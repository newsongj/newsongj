import { get, post, put, patch, del } from '@/api/client';

export interface AccountResponse {
    account_id: number;
    login_id: string;
    data_scope: 'all' | 'team' | 'group' | 'member';
    is_active: boolean;
    member_id: number | null;
    name: string | null;
    gyogu: number | null;
    team: number | null;
    group_no: number | null;
    policy_id: number | null;
    policy_name: string | null;
}

export interface PolicyResponse {
    policy_id: number;
    policy_name: string;
    description: string | null;
    menus: string[];
}

export interface ScopePolicies {
    all: number[];
    team: number[];
    group: number[];
    member: number[];
}

export interface MenuKeyItem {
    key: string;
    label: string;
}

export type MenuKeysResponse = Record<string, MenuKeyItem[]>;

export const fetchAccounts = () =>
    get<AccountResponse[]>('/api/admin/accounts');

export const createAccount = (body: { login_id: string; password: string; data_scope: string }) =>
    post<AccountResponse>('/api/admin/accounts', body);

export const updateAccountPassword = (id: number, password: string) =>
    put<void>(`/api/admin/accounts/${id}/password`, { password });

export const updateAccountScope = (id: number, data_scope: string) =>
    patch<void>(`/api/admin/accounts/${id}/scope`, { data_scope });

export const updateAccountPolicy = (id: number, policy_id: number | null) =>
    patch<void>(`/api/admin/accounts/${id}/policy`, { policy_id });

export const updateAccountStatus = (id: number, is_active: boolean) =>
    patch<void>(`/api/admin/accounts/${id}/status`, { is_active });

export const bulkDeactivateAccounts = (account_ids: number[]) =>
    patch<void>('/api/admin/accounts/bulk-deactivate', { account_ids });

export const fetchPolicies = () =>
    get<PolicyResponse[]>('/api/admin/policies');

export const createPolicy = (body: { policy_name: string; description?: string; menus: string[] }) =>
    post<PolicyResponse>('/api/admin/policies', body);

export const updatePolicy = (id: number, body: { policy_name: string; description?: string; menus: string[] }) =>
    put<PolicyResponse>(`/api/admin/policies/${id}`, body);

export const deletePolicy = (id: number) =>
    del<void>(`/api/admin/policies/${id}`);

export const fetchScopePolicies = () =>
    get<ScopePolicies>('/api/admin/scope-policies');

export const updateScopePolicies = (body: ScopePolicies) =>
    put<void>('/api/admin/scope-policies', body);

export const fetchMenuKeys = () =>
    get<MenuKeysResponse>('/api/admin/menu-keys');

export interface LeaderPreviewItem {
    member_id: number;
    name: string;
    login_id: string;
    gyogu: number;
    team: number;
    group_no: number;
    leader_names: string[];
}

export interface LeaderWithAccountItem {
    member_id: number;
    name: string;
    login_id: string;
    gyogu: number;
    team: number;
    group_no: number;
    leader_names: string[];
    account_id: number | null;
    has_account: boolean;
    is_active: boolean;
    policy_id: number | null;
    data_scope: string | null;
}

export interface BulkLeaderCreateResultItem {
    name: string;
    login_id: string;
    password: string;
}

export interface BulkSyncResult {
    created: BulkLeaderCreateResultItem[];
    deactivated_count: number;
}

export const fetchAccountPreview = () =>
    get<LeaderPreviewItem[]>('/api/admin/accounts/preview');

export const fetchAllLeaders = () =>
    get<LeaderWithAccountItem[]>('/api/admin/accounts/leaders-all');

export const deleteAccount = (id: number) =>
    del<void>(`/api/admin/accounts/${id}`);

export const bulkCreateAccounts = (body: { member_ids: number[]; data_scope: string; policy_id?: number | null }) =>
    post<BulkLeaderCreateResultItem[]>('/api/admin/accounts/bulk', body);

export const bulkDeleteAccounts = (account_ids: number[]) =>
    post<void>('/api/admin/accounts/bulk-delete', { account_ids });

export const bulkSyncAccounts = (body: {
    all_leader_member_ids: number[];
    active_member_ids: number[];
    data_scope: string;
    policy_id?: number | null;
}) => post<BulkSyncResult>('/api/admin/accounts/bulk-sync', body);
