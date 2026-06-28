import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Alert, Checkbox, CircularProgress, Snackbar, TablePagination, Tooltip } from '@mui/material';
import { Select } from '@components/common/Select';
import type { SelectOption } from '@components/common/Select';
import Button from '@components/common/Button/Button';
import type {
    ReviewStatus,
    SuspendedMealDraft,
    SuspendedMealMember,
} from '@models/suspendedMeal.types';
import { fetchRetreatInfo, fetchGyoguList, fetchSuspendedMealMembers, submitSuspendedMeal } from '@api/retreat';
import type { RetreatInfo } from '@models/research.types';

// ─── 상태 배지 ─────────────────────────────────────────────────────────────────

const getStatusConfig = (status: ReviewStatus | 'none') => {
    if (status === 'none')      return { label: '미신청',   color: '#8c8c8c', bg: '#f0f0f0' };
    if (status === 'PENDING')   return { label: '승인 대기', color: '#faad14', bg: '#FCF2E6' };
    if (status === 'APPROVED')  return { label: '승인',     color: '#52c41a', bg: '#E1FCEF' };
    return                             { label: '반려',     color: '#ff4d4f', bg: '#FAF0F3' };
};

const BadgeChip = styled('span')<{ $color: string; $bg: string }>(({ $color, $bg }) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: $color,
    backgroundColor: $bg,
    whiteSpace: 'nowrap',
    cursor: 'default',
}));

const StatusBadge: React.FC<{ status: ReviewStatus | 'none'; reviewComment: string | null }> = ({
    status, reviewComment,
}) => {
    const { label, color, bg } = getStatusConfig(status);
    const chip = <BadgeChip $color={color} $bg={bg}>{label}</BadgeChip>;

    if (status === 'REJECTED' && reviewComment) {
        return (
            <Tooltip title={reviewComment} arrow placement="top">
                <span>{chip}</span>
            </Tooltip>
        );
    }
    return chip;
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.custom.spacing.md,
    '@media (max-width: 600px)': {
        gap: theme.custom.spacing.sm,
    },
}));

const FilterPanel = styled('section')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.custom.spacing.sm,
    backgroundColor: theme.custom.colors.neutral._99,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: theme.custom.borderRadius,
    padding: theme.custom.spacing.md,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
    '@media (max-width: 480px)': {
        padding: theme.custom.spacing.sm,
        gap: theme.custom.spacing.xs,
        alignItems: 'stretch',
    },
}));

const FilterGroup = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    '@media (max-width: 480px)': {
        width: '100%',
        '& .MuiFormControl-root': { flex: 1 },
    },
});

const FilterLabel = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body1.fontSize,
    fontWeight: 700,
    color: theme.custom.colors.text.high,
    whiteSpace: 'nowrap',
    minWidth: 28,
}));

const Footer = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.custom.spacing.xs,
    paddingTop: theme.custom.spacing.xs,
}));

const TableWrapper = styled('div')(({ theme }) => ({
    borderRadius: theme.custom.borderRadius,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    overflow: 'hidden',
    backgroundColor: theme.custom.colors.white,
}));

const TableScroll = styled('div')({
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
});

const Table = styled('table')(({ theme }) => ({
    width: 'max-content',
    minWidth: '100%',
    borderCollapse: 'collapse',
    borderTop: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const Th = styled('th')(({ theme }) => ({
    backgroundColor: theme.custom.colors.neutral._99,
    fontWeight: theme.custom.typography.body1.fontWeight,
    fontSize: theme.custom.typography.body1.fontSize,
    color: theme.custom.colors.text.medium,
    padding: theme.custom.spacing.xs,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    whiteSpace: 'nowrap',
    textAlign: 'center',
    '@media (max-width: 600px)': {
        fontSize: theme.custom.typography.caption.fontSize,
    },
}));

const Td = styled('td')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.high,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    padding: theme.custom.spacing.xs,
    textAlign: 'center',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    '@media (max-width: 600px)': {
        fontSize: theme.custom.typography.caption.fontSize,
    },
}));

const Tr = styled('tr')<{ $bg?: string }>(({ theme, $bg }) => ({
    backgroundColor: $bg ?? 'transparent',
    '&:last-child td': { borderBottom: 'none' },
    '&:hover td': { backgroundColor: $bg ?? theme.custom.overlay.primary.hover },
}));

const CountLabel = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium,
    '@media (max-width: 480px)': {
        fontSize: theme.custom.typography.caption.fontSize,
    },
}));

const ReasonInput = styled('input')(({ theme }) => ({
    width: 160,
    height: 32,
    padding: '0 8px',
    fontSize: theme.custom.typography.body2.fontSize,
    fontFamily: 'inherit',
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: 4,
    outline: 'none',
    backgroundColor: 'transparent',
    color: theme.custom.colors.text.high,
    boxSizing: 'border-box',
    textOverflow: 'ellipsis',
    verticalAlign: 'middle',
    '&::placeholder': {
        color: theme.custom.colors.text.medium,
    },
    '&:focus': {
        border: `2px solid ${theme.custom.colors.primary._500}`,
    },
    '&:disabled': {
        opacity: 0.38,
        cursor: 'not-allowed',
    },
    '@media (max-width: 600px)': {
        width: 120,
        fontSize: theme.custom.typography.caption.fontSize,
    },
}));

// ─── Component ───────────────────────────────────────────────────────────────

const SuspendedMealPage: React.FC = () => {
    const user         = (() => { try { return JSON.parse(localStorage.getItem('client_user') ?? 'null'); } catch { return null; } })();
    const dataScope    = user?.data_scope ?? 'all';
    const isAllScope   = dataScope === 'all';
    const isTeamLeader = dataScope === 'all' || dataScope === 'team' || user === null;

    const [retreatInfo, setRetreatInfo] = useState<RetreatInfo | null>(null);
    const [allMembers,  setAllMembers]  = useState<SuspendedMealMember[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [loadError,   setLoadError]   = useState<string | null>(null);
    const [noRetreat,   setNoRetreat]   = useState(false);
    const [gyogu,       setGyogu]       = useState<number | ''>('');
    const [teamFilter,  setTeamFilter]  = useState<number | ''>('');
    const [gyoguNos,    setGyoguNos]    = useState<number[]>([]);
    const [groupNo,     setGroupNo]     = useState<number | ''>(() =>
        !isTeamLeader && user?.group_no != null ? user.group_no : ''
    );
    const [drafts,      setDrafts]      = useState<Map<number, SuspendedMealDraft>>(new Map());
    const [page,        setPage]        = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [snackbar,    setSnackbar]    = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    const loadMembers = useCallback(async (g?: number, t?: number) => {
        setLoading(true);
        try {
            const data = await fetchSuspendedMealMembers(g !== undefined ? { gyogu: g, team: t } : undefined);
            setAllMembers(data);
        } catch (err: any) {
            if (err?.response?.status === 403) {
                setLoadError('접근 권한이 없습니다.');
            } else if (err?.response?.data?.detail === '활성 수련회가 없습니다.') {
                setNoRetreat(true);
            } else {
                setLoadError('데이터를 불러오지 못했습니다.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                // 수련회 존재 여부 + 교구 목록 병렬 조회
                const [retreat, gyoguList] = await Promise.all([
                    fetchRetreatInfo(),
                    isAllScope ? fetchGyoguList() : Promise.resolve([]),
                ]);
                setRetreatInfo(retreat);
                document.title = `${retreat.retreat_name} 서스펜디드밀`;
                setGyoguNos(gyoguList);
                if (!isAllScope) await loadMembers();
            } catch (err: any) {
                if (err?.response?.status === 403) {
                    setLoadError('접근 권한이 없습니다.');
                } else if (err?.response?.data?.detail === '활성 수련회가 없습니다.') {
                    setNoRetreat(true);
                } else {
                    setLoadError('데이터를 불러오지 못했습니다.');
                }
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [isAllScope]); // eslint-disable-line react-hooks/exhaustive-deps

    const teamNos = useMemo(() => {
        const set = new Set(allMembers.map((m) => m.team));
        return Array.from(set).sort((a, b) => a - b);
    }, [allMembers]);

    const groupNos = useMemo(() => {
        const set = new Set(allMembers.map((m) => m.group_no));
        return Array.from(set).sort((a, b) => a - b);
    }, [allMembers]);

    const members = useMemo(() =>
        groupNo === '' ? allMembers : allMembers.filter((m) => m.group_no === groupNo),
    [allMembers, groupNo]);

    const gyoguOptions = useMemo(() => [
        { value: '', label: '교구 선택' },
        ...gyoguNos.map((g) => ({ value: g, label: `${g}교구` })),
    ], [gyoguNos]);

    const teamOptions = useMemo(() => [
        { value: '', label: '전체 팀' },
        ...teamNos.map((t) => ({ value: t, label: `${t}팀` })),
    ], [teamNos]);

    const groupOptions = useMemo(() => [
        { value: '', label: '전체' },
        ...groupNos.map((g) => ({ value: g, label: `${g}그룹` })),
    ], [groupNos]);

    const handleGyoguChange = useCallback((val: number | '') => {
        setGyogu(val);
        setTeamFilter('');
        setGroupNo('');
        setDrafts(new Map());
        if (val !== '') loadMembers(val as number, undefined);
        else setAllMembers([]);
    }, [loadMembers]);

    const handleTeamFilterChange = useCallback((val: number | '') => {
        setTeamFilter(val);
        setGroupNo('');
        setDrafts(new Map());
        if (gyogu !== '') loadMembers(gyogu as number, val === '' ? undefined : val as number);
    }, [gyogu, loadMembers]);

    const getDraft = useCallback((member: SuspendedMealMember): SuspendedMealDraft => {
        const override = drafts.get(member.member_id);
        if (override) return override;
        return {
            meal_count:       member.application?.meal_count       ?? 0,
            fee_support:      member.application?.fee_support       ?? false,
            applicant_reason: member.application?.applicant_reason ?? '',
        };
    }, [drafts]);

    const updateDraft = useCallback((memberId: number, patch: Partial<SuspendedMealDraft>) => {
        setDrafts((prev) => {
            const next = new Map(prev);
            const member = allMembers.find((m) => m.member_id === memberId);
            const cur = next.get(memberId) ?? {
                meal_count:       member?.application?.meal_count       ?? 0,
                fee_support:      member?.application?.fee_support       ?? false,
                applicant_reason: member?.application?.applicant_reason ?? '',
            };
            next.set(memberId, { ...cur, ...patch });
            return next;
        });
    }, [members]);

    const canSubmit = useCallback((member: SuspendedMealMember): boolean => {
        const { meal_count, fee_support, applicant_reason } = getDraft(member);
        if (!member.application) {
            return meal_count !== 0 || fee_support;
        }
        const app = member.application;
        return (
            meal_count !== app.meal_count ||
            fee_support !== app.fee_support ||
            applicant_reason !== (app.applicant_reason ?? '')
        );
    }, [getDraft]);

    const isReviewed = (member: SuspendedMealMember) =>
        member.application?.review_status === 'APPROVED' ||
        member.application?.review_status === 'REJECTED';

    const handleSubmit = useCallback(async (memberId: number, isUpdate: boolean) => {
        const draft = getDraft(allMembers.find((m) => m.member_id === memberId)!);
        try {
            await submitSuspendedMeal(memberId, {
                meal_count:       draft.meal_count,
                fee_support:      draft.fee_support,
                applicant_reason: draft.applicant_reason || null,
            });
            setDrafts((prev) => { const next = new Map(prev); next.delete(memberId); return next; });
            await loadMembers(gyogu === '' ? undefined : gyogu as number, teamFilter === '' ? undefined : teamFilter as number);
            setSnackbar({ open: true, message: isUpdate ? '수정이 완료되었습니다.' : '신청이 완료되었습니다.', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: '처리 중 오류가 발생했습니다.', severity: 'error' });
        }
    }, [getDraft, loadMembers, members]);

    useEffect(() => { setPage(0); }, [gyogu, teamFilter, groupNo]);

    const paginated = useMemo(
        () => members.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
        [members, page, rowsPerPage],
    );

    const mealOptions: SelectOption[] = useMemo(() => {
        const max = retreatInfo?.suspended_meal_count ?? 5;
        return Array.from({ length: max + 1 }, (_, n) => ({ value: n, label: `${n}끼` }));
    }, [retreatInfo]);

    const totalCount   = members.length;
    const appliedCount = members.filter((m) => m.application !== null).length;

    if (loading && (gyogu === '' || !isAllScope)) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <CircularProgress size={32} />
            </div>
        );
    }

    if (noRetreat) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <span style={{ fontSize: 16, color: '#8c8c8c' }}>수련회 기간이 아닙니다.</span>
            </div>
        );
    }

    if (loadError) {
        const isAccessDenied = loadError === '접근 권한이 없습니다.';
        return <Alert severity={isAccessDenied ? 'warning' : 'error'} sx={{ mt: 2 }}>{loadError}</Alert>;
    }

    return (
        <PageWrapper>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, textAlign: 'center', color: '#021730' }}>
                {retreatInfo!.retreat_name}
            </p>
            {/* 필터 바 */}
            <FilterPanel>
                {isAllScope && (
                    <>
                        <FilterGroup>
                            <FilterLabel>교구</FilterLabel>
                            <Select size="small" value={gyogu} options={gyoguOptions}
                                onChange={(v) => handleGyoguChange(v === '' ? '' : Number(v))} width={120} />
                        </FilterGroup>
                        <FilterGroup>
                            <FilterLabel>팀</FilterLabel>
                            <Select size="small" value={teamFilter} options={teamOptions}
                                onChange={(v) => handleTeamFilterChange(v === '' ? '' : Number(v))}
                                disabled={gyogu === '' || teamNos.length === 0} width={110} />
                        </FilterGroup>
                    </>
                )}
                <FilterGroup>
                    <FilterLabel>그룹</FilterLabel>
                    <Select
                        size="small"
                        value={groupNo}
                        options={groupOptions}
                        onChange={(v) => setGroupNo(v === '' ? '' : Number(v))}
                        disabled={!isTeamLeader || (isAllScope && gyogu === '')}
                        width={120}
                    />
                </FilterGroup>
            </FilterPanel>

            {isAllScope && gyogu === '' && !noRetreat && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#8c8c8c', fontSize: 15 }}>
                    교구를 선택하면 명단이 표시됩니다.
                </div>
            )}
            {loading && isAllScope && gyogu !== '' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <CircularProgress size={32} />
                </div>
            )}

            {/* 테이블 */}
            {(!isAllScope || gyogu !== '') && !loading && <>
            <TableWrapper>
                <TableScroll>
                    <Table>
                        <thead>
                            <tr>
                                <Th>교구</Th>
                                <Th>팀</Th>
                                <Th>그룹</Th>
                                <Th>기수</Th>
                                <Th>성별</Th>
                                <Th>이름</Th>
                                <Th>식사수</Th>
                                <Th>회비지원</Th>
                                <Th>신청사유</Th>
                                <Th>상태</Th>
                                <Th>작업</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 ? (
                                <tr>
                                    <Td colSpan={11} style={{ padding: 40, color: '#8c8c8c' }}>
                                        조회된 인원이 없습니다.
                                    </Td>
                                </tr>
                            ) : paginated.map((member) => {
                                const draft    = getDraft(member);
                                const reviewed = isReviewed(member);
                                const hasApp   = member.application !== null;
                                const status   = member.application?.review_status;

                                const rowBg = status === 'APPROVED'
                                    ? 'rgba(82,196,26,0.05)'
                                    : status === 'REJECTED'
                                    ? 'rgba(255,77,79,0.05)'
                                    : undefined;

                                return (
                                    <Tr key={member.member_id} $bg={rowBg}>
                                        <Td>{member.gyogu}교구</Td>
                                        <Td>{member.team}팀</Td>
                                        <Td>{member.group_no}그룹</Td>
                                        <Td>{member.generation}기</Td>
                                        <Td>{member.gender}</Td>
                                        <Td style={{ fontWeight: 600 }}>{member.name}</Td>

                                        {/* 식사수 */}
                                        <Td>
                                            <Select
                                                size="small"
                                                value={draft.meal_count}
                                                options={mealOptions}
                                                onChange={(v) => updateDraft(member.member_id, { meal_count: Number(v) })}
                                                disabled={reviewed}
                                                width={80}
                                            />
                                        </Td>

                                        {/* 회비지원 */}
                                        <Td>
                                            <Checkbox
                                                size="small"
                                                checked={draft.fee_support}
                                                disabled={reviewed}
                                                onChange={(e) => updateDraft(member.member_id, {
                                                    fee_support: e.target.checked,
                                                })}
                                                sx={{ padding: '2px', color: 'rgba(2,23,48,0.3)', '&.Mui-checked': { color: '#021730' } }}
                                            />
                                        </Td>

                                        {/* 신청사유 */}
                                        <Td>
                                            <ReasonInput
                                                placeholder="사유 입력"
                                                value={draft.applicant_reason}
                                                disabled={reviewed}
                                                onChange={(e) => updateDraft(member.member_id, { applicant_reason: e.target.value })}
                                            />
                                        </Td>

                                        {/* 상태 */}
                                        <Td>
                                            <StatusBadge
                                                status={hasApp ? status! : 'none'}
                                                reviewComment={member.application?.review_comment ?? null}
                                            />
                                        </Td>

                                        {/* 작업 */}
                                        <Td>
                                            {!reviewed && (
                                                <Button
                                                    variant={hasApp ? 'outlined' : 'filled'}
                                                    size="small"
                                                    disabled={!canSubmit(member)}
                                                    onClick={() => handleSubmit(member.member_id, hasApp)}
                                                >
                                                    {hasApp ? '수정' : '신청하기'}
                                                </Button>
                                            )}
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </TableScroll>
            </TableWrapper>
            <Footer>
                <CountLabel>
                    총 {totalCount}명&nbsp;|&nbsp;
                    <span style={{ color: '#1677ff', fontWeight: 600 }}>신청완료 {appliedCount}명</span>
                </CountLabel>
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[20, 50, 100]}
                    labelRowsPerPage="페이지당:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                    sx={{ marginLeft: 'auto', '& .MuiTablePagination-toolbar': { minHeight: 36, flexWrap: 'wrap' } }}
                />
            </Footer>
            </>}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </PageWrapper>
    );
};

export default SuspendedMealPage;
