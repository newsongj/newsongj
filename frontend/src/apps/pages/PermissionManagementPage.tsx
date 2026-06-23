import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { ChevronDown, ChevronRight, Info, Shield } from 'lucide-react';
import {
    AccountResponse,
    BulkLeaderCreateResultItem,
    LeaderPreviewItem,
    LeaderWithAccountItem,
    MenuKeyItem,
    MenuKeysResponse,
    PolicyResponse,
    bulkCreateAccounts,
    bulkDeleteAccounts,
    bulkDeactivateAccounts,
    bulkSyncAccounts,
    createPolicy,
    deleteAccount,
    deletePolicy,
    fetchAccountPreview,
    fetchAllLeaders,
    fetchAccounts,
    fetchMenuKeys,
    fetchPolicies,
    updateAccountPassword,
    updateAccountPolicy,
    updateAccountScope,
    updateAccountStatus,
    updatePolicy,
} from '@/api/authority';
import Tooltip from '@mui/material/Tooltip';
import { BaseModal } from '@components/common/BaseModal';
import { Button } from '@components/common/Button';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { Badge } from '@components/common/Badge';
import { Snackbar } from '@components/common/Snackbar';
import { useSnackbar } from '@/hooks/common/useSnackbar';

// ── Styled ────────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.custom.spacing.lg,
}));

const TabBar = styled('div')(({ theme }) => ({
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    borderBottom: `2px solid ${theme.custom.colors.primary.outline}`,
}));

const TabButton = styled('button')<{ $active: boolean }>(({ theme, $active }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    border: 'none',
    borderBottom: $active ? `2px solid ${theme.custom.colors.primary._500}` : '2px solid transparent',
    marginBottom: -2,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: theme.custom.typography.body2.fontSize,
    fontWeight: $active ? 600 : 400,
    color: $active ? theme.custom.colors.primary._500 : theme.custom.colors.text.medium,
    transition: 'all 0.15s ease',
    '&:hover': { color: theme.custom.colors.primary._500 },
    '@media (max-width: 600px)': {
        padding: '8px 12px',
        fontSize: 12,
    },
}));

const SectionRow = styled('div')({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
});

const GroupCard = styled('div')(({ theme }) => ({
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: 8,
    overflow: 'hidden',
}));

const GroupHeader = styled('button')<{ $color: string }>(({ $color }) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: $color,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
}));

const GroupTitle = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontWeight: 600,
    fontSize: 14,
});

const AccountTable = styled('table')({
    width: 'max-content',
    minWidth: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
});

const Th = styled('th')(({ theme }) => ({
    padding: '10px 8px',
    background: theme.custom.colors.primary._050,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    textAlign: 'left',
    fontWeight: 600,
    color: theme.custom.colors.text.medium,
    whiteSpace: 'nowrap',
}));

const Td = styled('td')(({ theme }) => ({
    padding: '10px 8px',
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    color: theme.custom.colors.text.high,
    verticalAlign: 'middle',
}));

const PolicyGrid = styled('div')({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
});

const PolicyCard = styled('div')(({ theme }) => ({
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: 8,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
}));

const PolicyCardHeader = styled('div')({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
});

const MenuTagList = styled('div')({
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
});

const MenuTag = styled('span')(({ theme }) => ({
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    background: theme.custom.colors.primary._050,
    color: theme.custom.colors.primary._500,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const CheckRow = styled('label')({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 0',
});

const ModalGrid = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '20px 24px',
});

const TableWrapper = styled('div')({
    overflowX: 'auto',
    width: '100%',
});

const ModalTableWrapper = styled('div')({
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: 320,
    width: '100%',
    border: '1px solid #f0f0f0',
    borderRadius: 6,
});

const MenuGroupLabel = styled('div')(({ theme }) => ({
    fontSize: 12,
    fontWeight: 600,
    color: theme.custom.colors.text.medium,
    marginTop: 8,
    marginBottom: 2,
}));

const CheckGrid = styled('div')({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 4,
});

const ModalActions = styled('div')({
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
});

const PageSectionHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
    color: theme.custom.colors.text.medium,
    letterSpacing: '0.06em',
    marginTop: 12,
    marginBottom: 2,
    '&::before, &::after': {
        content: '""',
        flex: 1,
        height: '1px',
        background: theme.custom.colors.primary.outline,
    },
}));

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'account' | 'policy';
type DataScope = 'all' | 'team' | 'group' | 'member';

const SCOPE_META: Record<DataScope, { label: string; color: string; desc: string }> = {
    all:    { label: '전체 접근',      color: '#eff6ff', desc: '전체 데이터 조회 가능' },
    team:   { label: '팀 단위 접근',   color: '#f0fdf4', desc: '소속 팀 데이터 조회' },
    group:  { label: '그룹 단위 접근', color: '#fff7ed', desc: '소속 그룹 데이터 조회' },
    member: { label: '개인 접근',      color: '#fdf4ff', desc: '본인 데이터만 조회' },
};

const SCOPE_OPTIONS = [
    { value: 'all',   label: '전체 접근' },
    { value: 'team',  label: '팀 단위 접근' },
    { value: 'group', label: '그룹 단위 접근' },
];

const ADMIN_PAGE_GROUPS = ['권한관리', '교적관리', '수련회'];
const USER_PAGE_GROUPS = ['사용자'];

// ── Main Component ────────────────────────────────────────────────────────────

const pathToTab = (path: string): Tab =>
    path === '/permission/policies' ? 'policy' : 'account';

const PermissionManagementPage: React.FC = () => {
    const location = useLocation();
    const [tab, setTab] = useState<Tab>(pathToTab(location.pathname));
    const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

    useEffect(() => {
        setTab(pathToTab(location.pathname));
    }, [location.pathname]);

    // ── 계정 관리 state ──────────────────────────────────────────────────────
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [expandedScope, setExpandedScope] = useState<DataScope | null>('all');
    const [pwModal, setPwModal] = useState<{ open: boolean; id: number; pw: string }>({ open: false, id: 0, pw: '' });
    const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(new Set());
    // ── 일괄 계정 생성 modal ──────────────────────────────────────────────────
    const [createModal, setCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createPreview, setCreatePreview] = useState<LeaderPreviewItem[]>([]);
    const [createSelected, setCreateSelected] = useState<Set<number>>(new Set());
    const [createScope, setCreateScope] = useState('group');
    const [createPolicyId, setCreatePolicyId] = useState<number | ''>('');
    const [createSearch, setCreateSearch] = useState('');
    const [createLeaderFilter, setCreateLeaderFilter] = useState<Set<string>>(new Set());
    const [createResult, setCreateResult] = useState<BulkLeaderCreateResultItem[] | null>(null);
    // ── 일괄 계정 삭제 modal ──────────────────────────────────────────────────
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deletePreview, setDeletePreview] = useState<LeaderWithAccountItem[]>([]);
    const [deleteSelected, setDeleteSelected] = useState<Set<number>>(new Set());
    const [deleteSearch, setDeleteSearch] = useState('');
    // ── 일괄 활성/비활성 modal ────────────────────────────────────────────────
    const [syncModal, setSyncModal] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncPreview, setSyncPreview] = useState<LeaderWithAccountItem[]>([]);
    const [syncSelected, setSyncSelected] = useState<Set<number>>(new Set());
    const [syncSearch, setSyncSearch] = useState('');
    const [syncLeaderFilter, setSyncLeaderFilter] = useState<Set<string>>(new Set());

    // ── 정책 관리 state ──────────────────────────────────────────────────────
    const [policies, setPolicies] = useState<PolicyResponse[]>([]);
    const [menuKeys, setMenuKeys] = useState<MenuKeysResponse>({});
    const keyLabelMap = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        Object.values(menuKeys).forEach(items =>
            (items as MenuKeyItem[]).forEach(({ key, label }) => { map[key] = label; })
        );
        return map;
    }, [menuKeys]);

    const [policyModal, setPolicyModal] = useState<{
        open: boolean; editId: number | null;
        name: string; desc: string; menus: string[];
    }>({ open: false, editId: null, name: '', desc: '', menus: [] });

    // ── 데이터 로드 ──────────────────────────────────────────────────────────
    const loadAccounts = useCallback(async () => {
        try { setAccounts(await fetchAccounts()); } catch { /* silent */ }
    }, []);

    const loadPolicies = useCallback(async () => {
        try { setPolicies(await fetchPolicies()); } catch { /* silent */ }
    }, []);

    const loadMenuKeys = useCallback(async () => {
        try { setMenuKeys(await fetchMenuKeys()); } catch { /* silent */ }
    }, []);

    useEffect(() => { loadAccounts(); loadPolicies(); }, [loadAccounts, loadPolicies]);
    useEffect(() => {
        if (tab === 'policy') {
            loadPolicies();
            loadMenuKeys();
        }
    }, [tab]);

    // ── 계정 액션 ────────────────────────────────────────────────────────────
    const openCreateModal = async () => {
        setCreateLoading(true);
        setCreateModal(true);
        setCreateSearch('');
        setCreateLeaderFilter(new Set());
        setCreatePolicyId('');
        setCreateResult(null);
        try {
            const preview = await fetchAccountPreview();
            setCreatePreview(preview);
            setCreateSelected(new Set());
        } catch {
            showSnackbar('로드에 실패했습니다.', 'error');
            setCreateModal(false);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleCreateSave = async () => {
        const ids = Array.from(createSelected);
        if (ids.length === 0) { showSnackbar('선택된 인원이 없습니다.', 'success'); return; }
        try {
            const result = await bulkCreateAccounts({
                member_ids: ids,
                data_scope: createScope,
                policy_id: createPolicyId !== '' ? createPolicyId : null,
            });
            setCreateResult(result);
            await loadAccounts();
            const preview = await fetchAccountPreview();
            setCreatePreview(preview);
            setCreateSelected(new Set(preview.map(p => p.member_id)));
            showSnackbar(`${result.length}개 계정이 생성되었습니다.`, 'success');
        } catch (e: any) {
            showSnackbar(e.message || '계정 생성에 실패했습니다.', 'error');
        }
    };

    const openDeleteModal = async () => {
        setDeleteLoading(true);
        setDeleteModal(true);
        setDeleteSearch('');
        setDeleteSelected(new Set());
        try {
            const leaders = await fetchAllLeaders();
            setDeletePreview(leaders.filter(l => l.has_account));
        } catch {
            showSnackbar('로드에 실패했습니다.', 'error');
            setDeleteModal(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteSave = async () => {
        const accountIds = Array.from(deleteSelected)
            .map(mid => deletePreview.find(l => l.member_id === mid)?.account_id)
            .filter((id): id is number => id != null);
        if (accountIds.length === 0) { showSnackbar('선택된 인원이 없습니다.', 'success'); return; }
        try {
            await bulkDeleteAccounts(accountIds);
            await loadAccounts();
            const leaders = await fetchAllLeaders();
            setDeletePreview(leaders.filter(l => l.has_account));
            setDeleteSelected(new Set());
            showSnackbar(`${accountIds.length}개 계정이 삭제되었습니다.`, 'success');
        } catch (e: any) {
            showSnackbar(e.message || '계정 삭제에 실패했습니다.', 'error');
        }
    };

    const openSyncModal = async () => {
        setSyncLoading(true);
        setSyncModal(true);
        setSyncSearch('');
        setSyncLeaderFilter(new Set());
        try {
            const leaders = await fetchAllLeaders();
            const withAccounts = leaders.filter(l => l.has_account);
            setSyncPreview(withAccounts);
            setSyncSelected(new Set(withAccounts.filter(l => l.is_active).map(l => l.member_id)));
        } catch {
            showSnackbar('로드에 실패했습니다.', 'error');
            setSyncModal(false);
        } finally {
            setSyncLoading(false);
        }
    };

    const handleSyncSave = async () => {
        try {
            const result = await bulkSyncAccounts({
                all_leader_member_ids: syncPreview.map(p => p.member_id),
                active_member_ids: Array.from(syncSelected),
                data_scope: 'group',
                policy_id: null,
            });
            const updated = await fetchAllLeaders();
            const withAccounts = updated.filter(l => l.has_account);
            setSyncPreview(withAccounts);
            setSyncSelected(new Set(withAccounts.filter(l => l.is_active).map(l => l.member_id)));
            await loadAccounts();
            const msgs: string[] = [];
            if (result.created.length > 0) msgs.push(`${result.created.length}개 활성화`);
            if (result.deactivated_count > 0) msgs.push(`${result.deactivated_count}개 비활성화`);
            showSnackbar(msgs.length > 0 ? msgs.join(', ') + '되었습니다.' : '변경사항이 없습니다.', 'success');
        } catch (e: any) {
            showSnackbar(e.message || '저장에 실패했습니다.', 'error');
        }
    };

    const downloadCsv = (rows: BulkLeaderCreateResultItem[]) => {
        const header = '이름,전화번호(로그인ID),초기비밀번호';
        const body = rows.map(r => `${r.name},"=""${r.login_id}""",${r.password}`).join('\n');
        const blob = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '리더_계정_초기비밀번호.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDeleteAccount = async (acc: AccountResponse) => {
        try {
            await deleteAccount(acc.account_id);
            setAccounts(prev => prev.filter(a => a.account_id !== acc.account_id));
            showSnackbar('계정이 삭제되었습니다.', 'success');
        } catch (e: any) {
            showSnackbar(e.message || '삭제에 실패했습니다.', 'error');
        }
    };

    const handleResetPassword = async () => {
        if (!pwModal.pw) return;
        try {
            await updateAccountPassword(pwModal.id, pwModal.pw);
            setPwModal({ open: false, id: 0, pw: '' });
            showSnackbar('비밀번호가 초기화되었습니다.', 'success');
        } catch (e: any) {
            showSnackbar(e.message || '비밀번호 초기화에 실패했습니다.', 'error');
        }
    };

    const handleScopeChange = async (id: number, scope: string) => {
        try {
            await updateAccountScope(id, scope);
            setAccounts(prev => prev.map(a => a.account_id === id ? { ...a, data_scope: scope as DataScope } : a));
            showSnackbar('데이터 범위가 변경되었습니다.', 'success');
        } catch (e: any) {
            showSnackbar(e.message || '변경에 실패했습니다.', 'error');
        }
    };

    const handlePolicyChange = async (id: number, policyIdRaw: string | number) => {
        const policyId = policyIdRaw === '' ? null : Number(policyIdRaw);
        try {
            await updateAccountPolicy(id, policyId);
            const selectedPolicy = policyId ? policies.find(p => p.policy_id === policyId) ?? null : null;
            setAccounts(prev => prev.map(a => a.account_id === id
                ? { ...a, policy_id: policyId, policy_name: selectedPolicy?.policy_name ?? null }
                : a
            ));
            showSnackbar('정책이 변경되었습니다.', 'success');
        } catch (e: any) {
            showSnackbar(e.message || '변경에 실패했습니다.', 'error');
        }
    };

    const handleToggleStatus = async (acc: AccountResponse) => {
        try {
            await updateAccountStatus(acc.account_id, !acc.is_active);
            setAccounts(prev => prev.map(a => a.account_id === acc.account_id ? { ...a, is_active: !acc.is_active } : a));
            showSnackbar(`계정이 ${!acc.is_active ? '활성화' : '비활성화'}되었습니다.`, 'success');
        } catch (e: any) {
            showSnackbar(e.message || '상태 변경에 실패했습니다.', 'error');
        }
    };

    const handleBulkDeactivate = async () => {
        const ids = Array.from(selectedAccountIds);
        if (ids.length === 0) return;
        try {
            await bulkDeactivateAccounts(ids);
            setAccounts(prev => prev.map(a => ids.includes(a.account_id) ? { ...a, is_active: false } : a));
            setSelectedAccountIds(new Set());
            showSnackbar(`${ids.length}개 계정이 비활성화되었습니다.`, 'success');
        } catch (e: any) {
            showSnackbar(e.message || '비활성화에 실패했습니다.', 'error');
        }
    };

    const toggleSelectAccount = (id: number) =>
        setSelectedAccountIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    // ── 정책 액션 ────────────────────────────────────────────────────────────
    const openCreatePolicy = () =>
        setPolicyModal({ open: true, editId: null, name: '', desc: '', menus: [] });

    const openEditPolicy = (p: PolicyResponse) =>
        setPolicyModal({ open: true, editId: p.policy_id, name: p.policy_name, desc: p.description || '', menus: [...p.menus] });

    const handleSavePolicy = async () => {
        if (!policyModal.name.trim()) return;
        try {
            const body = { policy_name: policyModal.name, description: policyModal.desc || undefined, menus: policyModal.menus };
            if (policyModal.editId) {
                const updated = await updatePolicy(policyModal.editId, body);
                setPolicies(prev => prev.map(p => p.policy_id === policyModal.editId ? updated : p));
                showSnackbar('정책이 수정되었습니다.', 'success');
            } else {
                const created = await createPolicy(body);
                setPolicies(prev => [...prev, created]);
                showSnackbar('정책이 생성되었습니다.', 'success');
            }
            setPolicyModal(m => ({ ...m, open: false }));
        } catch (e: any) {
            showSnackbar(e.message || '저장에 실패했습니다.', 'error');
        }
    };

    const handleDeletePolicy = async (id: number) => {
        try {
            await deletePolicy(id);
            setPolicies(prev => prev.filter(p => p.policy_id !== id));
            showSnackbar('정책이 삭제되었습니다.', 'success');
        } catch (e: any) {
            showSnackbar(e.message || '삭제에 실패했습니다.', 'error');
        }
    };

    const togglePolicyMenu = (key: string) =>
        setPolicyModal(m => ({
            ...m,
            menus: m.menus.includes(key) ? m.menus.filter(k => k !== key) : [...m.menus, key],
        }));

    // ── 렌더 헬퍼 ────────────────────────────────────────────────────────────
    const accountsByScope = (scope: DataScope) => accounts.filter(a => a.data_scope === scope);

    const renderAccountTable = (scope: DataScope) => {
        const rows = accountsByScope(scope);
        if (rows.length === 0)
            return <div style={{ padding: '20px 24px', color: '#888', fontSize: 13 }}>등록된 계정이 없습니다.</div>;
        return (
            <TableWrapper>
                <AccountTable>
                    <thead>
                        <tr>
                            <Th style={{ width: 40 }}></Th>
                            <Th>이름</Th><Th>교구</Th><Th>팀</Th><Th>그룹</Th>
                            <Th>전화번호</Th><Th>활성</Th><Th>정책</Th><Th>데이터 범위</Th><Th>비밀번호</Th><Th>삭제</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(acc => (
                            <tr key={acc.account_id}>
                                <Td style={{ width: 40 }}>
                                    <input type="checkbox"
                                        checked={selectedAccountIds.has(acc.account_id)}
                                        onChange={() => toggleSelectAccount(acc.account_id)} />
                                </Td>
                                <Td>{acc.name ?? '—'}</Td>
                                <Td>{acc.gyogu ?? '—'}</Td>
                                <Td>{acc.team ?? '—'}</Td>
                                <Td>{acc.group_no ?? '—'}</Td>
                                <Td>{acc.login_id}</Td>
                                <Td>
                                    <Badge variant={acc.is_active ? 'active' : 'inactive'} size="small"
                                        onClick={() => handleToggleStatus(acc)}>
                                        {acc.is_active ? '활성' : '비활성'}
                                    </Badge>
                                </Td>
                                <Td>
                                    <Select
                                        value={acc.policy_id ?? ''}
                                        options={[
                                            { value: '', label: '없음' },
                                            ...policies.map(p => ({ value: p.policy_id, label: p.policy_name })),
                                        ]}
                                        onChange={v => handlePolicyChange(acc.account_id, v as string | number)}
                                        width="160px"
                                    />
                                </Td>
                                <Td>
                                    <Select
                                        value={acc.data_scope}
                                        options={SCOPE_OPTIONS}
                                        onChange={v => handleScopeChange(acc.account_id, String(v))}
                                        width="140px"
                                    />
                                </Td>
                                <Td>
                                    <Button variant="outlined" size="small"
                                        onClick={() => setPwModal({ open: true, id: acc.account_id, pw: '' })}>
                                        초기화
                                    </Button>
                                </Td>
                                <Td>
                                    <Button variant="outlined" size="small"
                                        style={{ color: '#f5222d', borderColor: '#f5222d' }}
                                        onClick={() => handleDeleteAccount(acc)}>
                                        삭제
                                    </Button>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </AccountTable>
            </TableWrapper>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const isAccountsPage = location.pathname === '/permission/accounts';

    return (
        <PageWrapper>
            {/* ── 정책 관리 페이지에서만 2개 탭 표시 ── */}
            {!isAccountsPage && (
                <TabBar>
                    <TabButton $active={tab === 'policy'} onClick={() => setTab('policy')}>
                        <Shield size={15} />정책 관리
                    </TabButton>
                </TabBar>
            )}

            {/* ── 계정 관리 ── */}
            {isAccountsPage && (
                <>
                    <SectionRow>
                        <div style={{ fontSize: 13, color: '#555' }}>
                            데이터 범위 그룹별 계정 목록 · 총 {accounts.length}명
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {selectedAccountIds.size > 0 && (
                                <Button variant="outlined" size="small"
                                    style={{ color: '#f5222d', borderColor: '#f5222d' }}
                                    onClick={handleBulkDeactivate}>
                                    선택 {selectedAccountIds.size}명 비활성화
                                </Button>
                            )}
                            <Button variant="outlined" size="small" onClick={openSyncModal}>
                                일괄 활성/비활성
                            </Button>
                            <Button variant="outlined" size="small"
                                style={{ color: '#f5222d', borderColor: '#f5222d' }}
                                onClick={openDeleteModal}>
                                일괄 계정 삭제
                            </Button>
                            <Button variant="filled" size="small" onClick={openCreateModal}>
                                일괄 계정 생성
                            </Button>
                        </div>
                    </SectionRow>

                    {(['all', 'team', 'group'] as DataScope[]).map(scope => {
                        const meta = SCOPE_META[scope];
                        const count = accountsByScope(scope).length;
                        const isOpen = expandedScope === scope;
                        return (
                            <GroupCard key={scope}>
                                <GroupHeader $color={meta.color} onClick={() => setExpandedScope(isOpen ? null : scope)}>
                                    <GroupTitle>
                                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        {meta.label}
                                        <span style={{ fontWeight: 400, fontSize: 12, color: '#666' }}>
                                            {meta.desc}
                                        </span>
                                    </GroupTitle>
                                    <span style={{ fontSize: 13, color: '#444' }}>{count}명</span>
                                </GroupHeader>
                                {isOpen && renderAccountTable(scope)}
                            </GroupCard>
                        );
                    })}
                </>
            )}

            {/* ── 정책 관리 ── */}
            {!isAccountsPage && tab === 'policy' && (
                <>
                    <SectionRow>
                        <div style={{ fontSize: 13, color: '#555' }}>총 {policies.length}개 정책</div>
                        <Button variant="filled" size="small" onClick={openCreatePolicy}>+ 정책 생성</Button>
                    </SectionRow>
                    <PolicyGrid>
                        {policies.map(p => (
                            <PolicyCard key={p.policy_id}>
                                <PolicyCardHeader>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.policy_name}</span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <Button variant="outlined" size="small" onClick={() => openEditPolicy(p)}>수정</Button>
                                        <Button variant="outlined" size="small" onClick={() => handleDeletePolicy(p.policy_id)}
                                            style={{ color: '#f5222d', borderColor: '#f5222d' }}>삭제</Button>
                                    </div>
                                </PolicyCardHeader>
                                {p.description && <div style={{ fontSize: 12, color: '#888' }}>{p.description}</div>}
                                <MenuTagList>
                                    {p.menus.length === 0
                                        ? <span style={{ fontSize: 12, color: '#aaa' }}>메뉴 없음</span>
                                        : p.menus.map(k => <MenuTag key={k}>{keyLabelMap[k] ?? k.split('.').pop()}</MenuTag>)
                                    }
                                </MenuTagList>
                            </PolicyCard>
                        ))}
                        {policies.length === 0 && (
                            <div style={{ color: '#888', fontSize: 13, padding: 8 }}>정책이 없습니다. 정책을 생성해주세요.</div>
                        )}
                    </PolicyGrid>
                </>
            )}

            {/* ── 비밀번호 초기화 모달 ── */}
            <BaseModal
                open={pwModal.open}
                title="비밀번호 초기화"
                onClose={() => setPwModal({ open: false, id: 0, pw: '' })}
                size="small"
                actions={
                    <ModalActions>
                        <Button variant="outlined" onClick={() => setPwModal({ open: false, id: 0, pw: '' })}>취소</Button>
                        <Button variant="filled" onClick={handleResetPassword}>초기화</Button>
                    </ModalActions>
                }
            >
                <ModalGrid>
                    <TextField
                        label="새 비밀번호"
                        type="password"
                        value={pwModal.pw}
                        onChange={e => setPwModal(m => ({ ...m, pw: e.target.value }))}
                        fullWidth
                    />
                </ModalGrid>
            </BaseModal>

            {/* ── 정책 생성/수정 모달 ── */}
            <BaseModal
                open={policyModal.open}
                title={policyModal.editId ? '정책 수정' : '정책 생성'}
                onClose={() => setPolicyModal(m => ({ ...m, open: false }))}
                size="medium"
                actions={
                    <ModalActions>
                        <Button variant="outlined" onClick={() => setPolicyModal(m => ({ ...m, open: false }))}>취소</Button>
                        <Button variant="filled" onClick={handleSavePolicy}>저장</Button>
                    </ModalActions>
                }
            >
                <ModalGrid>
                    <TextField
                        label="정책 이름"
                        placeholder="예: 팀장 정책"
                        value={policyModal.name}
                        onChange={e => setPolicyModal(m => ({ ...m, name: e.target.value }))}
                        fullWidth
                    />
                    <TextField
                        label="설명 (선택)"
                        placeholder="이 정책의 용도를 입력하세요"
                        value={policyModal.desc}
                        onChange={e => setPolicyModal(m => ({ ...m, desc: e.target.value }))}
                        fullWidth
                    />
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>접근 메뉴</div>
                        {([
                            { label: '관리자 페이지', groups: ADMIN_PAGE_GROUPS },
                            { label: '사용자 페이지', groups: USER_PAGE_GROUPS },
                        ] as const).map(({ label, groups }) => (
                            <div key={label}>
                                <PageSectionHeader>{label}</PageSectionHeader>
                                {groups.filter(g => menuKeys[g]).map(group => (
                                    <div key={group}>
                                        <MenuGroupLabel>{group}</MenuGroupLabel>
                                        <CheckGrid>
                                            {(menuKeys[group] as MenuKeyItem[]).map(({ key, label: itemLabel }) => (
                                                <CheckRow key={key}>
                                                    <input
                                                        type="checkbox"
                                                        checked={policyModal.menus.includes(key)}
                                                        onChange={() => togglePolicyMenu(key)}
                                                    />
                                                    <span>{itemLabel}</span>
                                                </CheckRow>
                                            ))}
                                        </CheckGrid>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </ModalGrid>
            </BaseModal>

            {/* ── 일괄 계정 생성 모달 ── */}
            {(() => {
                const leaderNames = Array.from(new Set(createPreview.flatMap(p => p.leader_names))).sort();
                const filtered = createPreview.filter(p => {
                    const matchName = createSearch === '' || p.name.includes(createSearch);
                    const matchLeader = createLeaderFilter.size === 0 || p.leader_names.some(n => createLeaderFilter.has(n));
                    return matchName && matchLeader;
                });
                const allFiltered = filtered.length > 0 && filtered.every(p => createSelected.has(p.member_id));
                const toggleLeaderFilter = (name: string) =>
                    setCreateLeaderFilter(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });
                return (
                    <BaseModal
                        open={createModal}
                        title="일괄 계정 생성"
                        onClose={() => setCreateModal(false)}
                        size="large"
                        loading={createLoading}
                        actions={
                            <ModalActions>
                                <Button variant="outlined" onClick={() => setCreateModal(false)}>닫기</Button>
                                <Button variant="outlined"
                                    onClick={() => createResult && createResult.length > 0 && downloadCsv(createResult)}
                                    disabled={!createResult || createResult.length === 0}>
                                    CSV 다운로드
                                </Button>
                                <Button variant="filled" onClick={handleCreateSave}
                                    disabled={createSelected.size === 0}>
                                    생성 ({createSelected.size}명)
                                </Button>
                            </ModalActions>
                        }
                    >
                        <ModalGrid>
                            <div style={{ fontSize: 12, color: '#555' }}>
                                계정이 없는 리더 {createPreview.length}명 · {createSelected.size}명 선택됨
                            </div>
                            <TextField label="이름 검색" placeholder="이름을 입력하세요"
                                value={createSearch} onChange={e => setCreateSearch(e.target.value)} fullWidth />
                            {leaderNames.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ fontSize: 12, color: '#595959', fontWeight: 600 }}>직분 필터</span>
                                        <Tooltip title="직분을 선택하면 해당 직분을 가진 멤버만 표시됩니다." arrow placement="right">
                                            <span style={{ display: 'flex', alignItems: 'center', cursor: 'help' }}><Info size={13} color="#aaa" /></span>
                                        </Tooltip>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {leaderNames.map(name => (
                                            <button key={name} onClick={() => toggleLeaderFilter(name)}
                                                style={{
                                                    padding: '3px 10px', fontSize: 12, borderRadius: 12, cursor: 'pointer',
                                                    border: `1px solid ${createLeaderFilter.has(name) ? '#4f86f7' : '#d9d9d9'}`,
                                                    background: createLeaderFilter.has(name) ? '#eff6ff' : '#fff',
                                                    color: createLeaderFilter.has(name) ? '#2563eb' : '#555',
                                                    fontWeight: createLeaderFilter.has(name) ? 600 : 400,
                                                }}>{name}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#595959' }}>정책</span>
                                    <Select value={createPolicyId}
                                        options={[{ value: '', label: '없음' }, ...policies.map(p => ({ value: p.policy_id, label: p.policy_name }))]}
                                        onChange={v => setCreatePolicyId(v === '' ? '' : Number(v))} width="160px" />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#595959' }}>데이터 범위</span>
                                    <Select value={createScope} options={SCOPE_OPTIONS} onChange={v => setCreateScope(String(v))} width="140px" />
                                </div>
                            </div>
                            {filtered.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>
                                    {createPreview.length === 0 ? '계정 생성 대상이 없습니다.' : '검색 결과가 없습니다.'}
                                </div>
                            ) : (
                                <ModalTableWrapper>
                                    <AccountTable>
                                        <thead><tr>
                                            <Th style={{ width: 40, position: 'sticky', top: 0, zIndex: 1 }}><input type="checkbox" checked={allFiltered}
                                                onChange={() => setCreateSelected(prev => {
                                                    const next = new Set(prev);
                                                    allFiltered ? filtered.forEach(p => next.delete(p.member_id)) : filtered.forEach(p => next.add(p.member_id));
                                                    return next;
                                                })} /></Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>이름</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>직분</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>전화번호</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>교구</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>팀</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>그룹</Th>
                                        </tr></thead>
                                        <tbody>
                                            {filtered.map(item => (
                                                <tr key={item.member_id}>
                                                    <Td style={{ width: 40 }}><input type="checkbox" checked={createSelected.has(item.member_id)}
                                                        onChange={() => setCreateSelected(prev => { const next = new Set(prev); next.has(item.member_id) ? next.delete(item.member_id) : next.add(item.member_id); return next; })} /></Td>
                                                    <Td>{item.name}</Td>
                                                    <Td>{item.leader_names.join(', ')}</Td>
                                                    <Td>{item.login_id}</Td>
                                                    <Td>{item.gyogu}</Td><Td>{item.team}</Td><Td>{item.group_no}</Td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </AccountTable>
                                </ModalTableWrapper>
                            )}
                        </ModalGrid>
                    </BaseModal>
                );
            })()}

            {/* ── 일괄 계정 삭제 모달 ── */}
            {(() => {
                const filtered = deletePreview.filter(p =>
                    deleteSearch === '' || p.name.includes(deleteSearch)
                );
                const allFiltered = filtered.length > 0 && filtered.every(p => deleteSelected.has(p.member_id));
                return (
                    <BaseModal
                        open={deleteModal}
                        title="일괄 계정 삭제"
                        onClose={() => setDeleteModal(false)}
                        size="large"
                        loading={deleteLoading}
                        actions={
                            <ModalActions>
                                <Button variant="outlined" onClick={() => setDeleteModal(false)}>닫기</Button>
                                <Button variant="filled"
                                    style={deleteSelected.size > 0 ? { background: '#f5222d', borderColor: '#f5222d' } : {}}
                                    onClick={handleDeleteSave}
                                    disabled={deleteSelected.size === 0}>
                                    삭제 ({deleteSelected.size}명)
                                </Button>
                            </ModalActions>
                        }
                    >
                        <ModalGrid>
                            <div style={{ fontSize: 12, color: '#f5222d', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, padding: '6px 12px' }}>
                                선택한 계정을 완전히 삭제합니다. 되돌릴 수 없습니다. (단, 교적 삭제는 아닙니다.)
                            </div>
                            <div style={{ fontSize: 12, color: '#555' }}>
                                계정 있는 리더 {deletePreview.length}명 · {deleteSelected.size}명 선택됨
                            </div>
                            <TextField label="이름 검색" placeholder="이름을 입력하세요"
                                value={deleteSearch} onChange={e => setDeleteSearch(e.target.value)} fullWidth />
                            {filtered.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>
                                    {deletePreview.length === 0 ? '계정이 있는 리더가 없습니다.' : '검색 결과가 없습니다.'}
                                </div>
                            ) : (
                                <ModalTableWrapper>
                                    <AccountTable>
                                        <thead><tr>
                                            <Th style={{ width: 40, position: 'sticky', top: 0, zIndex: 1 }}><input type="checkbox" checked={allFiltered}
                                                onChange={() => setDeleteSelected(prev => {
                                                    const next = new Set(prev);
                                                    allFiltered ? filtered.forEach(p => next.delete(p.member_id)) : filtered.forEach(p => next.add(p.member_id));
                                                    return next;
                                                })} /></Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>이름</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>계정 상태</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>전화번호</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>교구</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>팀</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>그룹</Th>
                                        </tr></thead>
                                        <tbody>
                                            {filtered.map(item => (
                                                <tr key={item.member_id}>
                                                    <Td style={{ width: 40 }}><input type="checkbox" checked={deleteSelected.has(item.member_id)}
                                                        onChange={() => setDeleteSelected(prev => { const next = new Set(prev); next.has(item.member_id) ? next.delete(item.member_id) : next.add(item.member_id); return next; })} /></Td>
                                                    <Td>{item.name}</Td>
                                                    <Td><Badge variant={item.is_active ? 'active' : 'inactive'} size="small">{item.is_active ? '활성' : '비활성'}</Badge></Td>
                                                    <Td>{item.login_id}</Td>
                                                    <Td>{item.gyogu}</Td><Td>{item.team}</Td><Td>{item.group_no}</Td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </AccountTable>
                                </ModalTableWrapper>
                            )}
                        </ModalGrid>
                    </BaseModal>
                );
            })()}

            {/* ── 일괄 활성/비활성 모달 ── */}
            {(() => {
                const allLeaderNames = Array.from(new Set(syncPreview.flatMap(p => p.leader_names))).sort();
                const filtered = syncPreview.filter(p => {
                    const matchName = syncSearch === '' || p.name.includes(syncSearch);
                    const matchLeader = syncLeaderFilter.size === 0 || p.leader_names.some(n => syncLeaderFilter.has(n));
                    return matchName && matchLeader;
                });
                const allFiltered = filtered.length > 0 && filtered.every(p => syncSelected.has(p.member_id));
                const toggleLeaderFilter = (name: string) =>
                    setSyncLeaderFilter(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });
                return (
                    <BaseModal
                        open={syncModal}
                        title="일괄 활성/비활성"
                        onClose={() => setSyncModal(false)}
                        size="large"
                        loading={syncLoading}
                        actions={
                            <ModalActions>
                                <Button variant="outlined" onClick={() => setSyncModal(false)}>닫기</Button>
                                <Button variant="filled" onClick={handleSyncSave}>저장</Button>
                            </ModalActions>
                        }
                    >
                        <ModalGrid>
                            <div style={{ fontSize: 12, color: '#555' }}>
                                체크 = 활성 · 체크 해제 = 비활성 · 계정 있는 리더 {syncPreview.length}명
                            </div>
                            <TextField label="이름 검색" placeholder="이름을 입력하세요"
                                value={syncSearch} onChange={e => setSyncSearch(e.target.value)} fullWidth />
                            {allLeaderNames.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ fontSize: 12, color: '#595959', fontWeight: 600 }}>직분 필터</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {allLeaderNames.map(name => (
                                            <button key={name} onClick={() => toggleLeaderFilter(name)}
                                                style={{
                                                    padding: '3px 10px', fontSize: 12, borderRadius: 12, cursor: 'pointer',
                                                    border: `1px solid ${syncLeaderFilter.has(name) ? '#4f86f7' : '#d9d9d9'}`,
                                                    background: syncLeaderFilter.has(name) ? '#eff6ff' : '#fff',
                                                    color: syncLeaderFilter.has(name) ? '#2563eb' : '#555',
                                                    fontWeight: syncLeaderFilter.has(name) ? 600 : 400,
                                                }}>{name}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ fontSize: 12, color: '#555' }}>
                                {filtered.length}명 표시 · 활성 {syncSelected.size}명 / 전체 {syncPreview.length}명
                            </div>
                            {filtered.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>
                                    {syncPreview.length === 0 ? '계정이 있는 리더가 없습니다.' : '검색 결과가 없습니다.'}
                                </div>
                            ) : (
                                <ModalTableWrapper>
                                    <AccountTable>
                                        <thead><tr>
                                            <Th style={{ width: 40, position: 'sticky', top: 0, zIndex: 1 }}><input type="checkbox" checked={allFiltered}
                                                onChange={() => setSyncSelected(prev => {
                                                    const next = new Set(prev);
                                                    allFiltered ? filtered.forEach(p => next.delete(p.member_id)) : filtered.forEach(p => next.add(p.member_id));
                                                    return next;
                                                })} /></Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>이름</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>현재 상태</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>직분</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>전화번호</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>교구</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>팀</Th>
                                            <Th style={{ position: 'sticky', top: 0, zIndex: 1 }}>그룹</Th>
                                        </tr></thead>
                                        <tbody>
                                            {filtered.map(item => (
                                                <tr key={item.member_id}>
                                                    <Td style={{ width: 40 }}><input type="checkbox" checked={syncSelected.has(item.member_id)}
                                                        onChange={() => setSyncSelected(prev => { const next = new Set(prev); next.has(item.member_id) ? next.delete(item.member_id) : next.add(item.member_id); return next; })} /></Td>
                                                    <Td>{item.name}</Td>
                                                    <Td><Badge variant={item.is_active ? 'active' : 'inactive'} size="small">{item.is_active ? '활성' : '비활성'}</Badge></Td>
                                                    <Td>{item.leader_names.join(', ')}</Td>
                                                    <Td>{item.login_id}</Td>
                                                    <Td>{item.gyogu}</Td><Td>{item.team}</Td><Td>{item.group_no}</Td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </AccountTable>
                                </ModalTableWrapper>
                            )}
                        </ModalGrid>
                    </BaseModal>
                );
            })()}

            <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
        </PageWrapper>
    );
};

export default PermissionManagementPage;
