import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, TablePagination } from '@mui/material';
import { Select } from '@components/common/Select';
import type { SelectOption } from '@components/common/Select';
import Button from '@components/common/Button/Button';
import type { AttendanceStatus, FeeType, RetreatInfo, ResearchMember, ResearchResponseBody } from '@models/research.types';
import { fetchRetreatInfo, fetchGyoguList, fetchResearchMembers, saveResearchResponse } from '@api/retreat';

// ─── 드롭박스 옵션 ─────────────────────────────────────────────────────────────

const ATTENDANCE_OPTIONS: SelectOption[] = [
    { value: '',    label: '선택' },
    { value: '미정', label: <span style={{ color: '#8c8c8c', fontWeight: 600 }}>미정</span> },
    { value: '정상', label: <span style={{ color: '#52c41a', fontWeight: 600 }}>정상</span> },
    { value: '참석', label: <span style={{ color: '#1677ff', fontWeight: 600 }}>참석</span> },
    { value: '후발', label: <span style={{ color: '#fa8c16', fontWeight: 600 }}>후발</span> },
    { value: '불참', label: <span style={{ color: '#ff4d4f', fontWeight: 600 }}>불참</span> },
];

const ATTENDANCE_BG: Record<string, string> = {
    '미정': 'rgba(140, 140, 140, 0.10)',
    '정상': 'rgba(82,  196,  26, 0.10)',
    '참석': 'rgba( 22, 119, 255, 0.08)',
    '후발': 'rgba(250, 140,  22, 0.10)',
    '불참': 'rgba(255,  77,  79, 0.10)',
};

// ─── Styled ──────────────────────────────────────────────────────────────────

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

const FilterActions = styled('div')({
    marginLeft: 'auto',
    '@media (max-width: 480px)': {
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: 2,
    },
});

const FilterLabel = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body1.fontSize,
    fontWeight: 700,
    color: theme.custom.colors.text.high,
    whiteSpace: 'nowrap',
    minWidth: 52,
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

const Tr = styled('tr')(({ theme }) => ({
    '&:last-child td': { borderBottom: 'none' },
    '&:hover td': { backgroundColor: theme.custom.overlay.primary.hover },
}));

const Footer = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.custom.spacing.xs,
    paddingTop: theme.custom.spacing.xs,
}));

const CountLabel = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium,
    '@media (max-width: 480px)': {
        fontSize: theme.custom.typography.caption.fontSize,
    },
}));

const ConfirmDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: theme.custom.borderRadius,
        boxShadow: '0 24px 48px rgba(15, 23, 42, 0.12)',
        margin: '12px',
        width: '100%',
        maxWidth: 400,
    },
}));

const ConfirmTitle = styled(DialogTitle)(({ theme }) => ({
    fontSize: theme.custom.typography.body1.fontSize,
    fontWeight: 700,
    color: theme.custom.colors.text.high,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    padding: theme.custom.spacing.md,
}));

const ConfirmContent = styled(DialogContent)(({ theme }) => ({
    padding: theme.custom.spacing.md,
    paddingTop: `${theme.custom.spacing.md} !important`,
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium,
    lineHeight: 1.6,
}));

const ConfirmActions = styled(DialogActions)(({ theme }) => ({
    padding: theme.custom.spacing.md,
    borderTop: `1px solid ${theme.custom.colors.primary.outline}`,
    gap: theme.custom.spacing.sm,
    justifyContent: 'flex-end',
}));

// ─── Types / Helpers ──────────────────────────────────────────────────────────

type DayKey = 'day1' | 'day2' | 'day3' | 'day4';

const getStoredUser = () => {
    try { return JSON.parse(localStorage.getItem('client_user') ?? 'null'); }
    catch { return null; }
};

const getDayCount = (info: RetreatInfo) => {
    const diff = Math.round(
        (new Date(info.end_date).getTime() - new Date(info.start_date).getTime()) / 86400000
    );
    return Math.min(Math.max(diff + 1, 1), 4);
};

const formatWon = (n: number) => n.toLocaleString('ko-KR') + '원';

// ─── Component ───────────────────────────────────────────────────────────────

const ResearchPage: React.FC = () => {
    const user       = getStoredUser();
    const dataScope  = user?.data_scope ?? 'all';
    const isAllScope  = dataScope === 'all';
    const isTeamLeader = dataScope === 'all' || dataScope === 'team' || user === null;

    const [retreatInfo, setRetreatInfo] = useState<RetreatInfo | null>(null);
    const [allMembers,  setAllMembers]  = useState<ResearchMember[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [loadError,   setLoadError]   = useState<string | null>(null);
    const [noRetreat,   setNoRetreat]   = useState(false);

    const [gyogu,      setGyogu]      = useState<number | ''>('');
    const [teamFilter, setTeamFilter] = useState<number | ''>('');
    const [gyoguNos,   setGyoguNos]   = useState<number[]>([]);
    const [groupNo, setGroupNo] = useState<number | ''>(() =>
        !isTeamLeader && user?.group_no != null ? user.group_no : ''
    );
    const [drafts,      setDrafts]      = useState<Map<number, ResearchResponseBody>>(new Map());
    const [isDirty,     setIsDirty]     = useState(false);
    const [isSaving,    setIsSaving]    = useState(false);
    const [page,        setPage]        = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    const loadMembers = useCallback(async (g?: number, t?: number) => {
        setLoading(true);
        setLoadError(null);
        try {
            const members = await fetchResearchMembers({ gyogu: g, team: t });
            setAllMembers(members);
        } catch (err: any) {
            setLoadError(err?.response?.status === 403 ? '접근 권한이 없습니다.' : '데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const [retreat, gyoguList] = await Promise.all([
                    fetchRetreatInfo(),
                    isAllScope ? fetchGyoguList() : Promise.resolve([] as number[]),
                ]);
                setRetreatInfo(retreat);
                document.title = `${retreat.retreat_name} 인원조사`;
                if (isAllScope) {
                    setGyoguNos(gyoguList);
                } else {
                    const members = await fetchResearchMembers();
                    setAllMembers(members);
                }
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
        load();
    }, [isAllScope]);

    const handleGyoguChange = useCallback((val: number | '') => {
        setGyogu(val);
        setTeamFilter('');
        setGroupNo('');
        setDrafts(new Map());
        setIsDirty(false);
        if (val !== '') loadMembers(val as number, undefined);
        else setAllMembers([]);
    }, [loadMembers]);

    const handleTeamFilterChange = useCallback((val: number | '') => {
        setTeamFilter(val);
        setGroupNo('');
        setDrafts(new Map());
        setIsDirty(false);
        if (gyogu !== '') loadMembers(gyogu as number, val === '' ? undefined : val as number);
    }, [gyogu, loadMembers]);

    const days: DayKey[] = useMemo(() => {
        if (!retreatInfo) return [];
        const count = getDayCount(retreatInfo);
        return (['day1', 'day2', 'day3', 'day4'] as DayKey[]).slice(0, count);
    }, [retreatInfo]);

    const teamNos = useMemo(() => {
        if (!isAllScope) return [];
        const set = new Set(allMembers.map((m) => m.team));
        return Array.from(set).sort((a, b) => a - b);
    }, [allMembers, isAllScope]);

    const groupNos = useMemo(() => {
        const set = new Set(allMembers.map((m) => m.group_no));
        return Array.from(set).sort((a, b) => a - b);
    }, [allMembers]);

    const members = useMemo(() =>
        groupNo === '' ? allMembers : allMembers.filter((m) => m.group_no === groupNo),
    [allMembers, groupNo]);

    useEffect(() => { setPage(0); }, [gyogu, teamFilter, groupNo]);

    const paginated = useMemo(
        () => members.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
        [members, page, rowsPerPage],
    );

    const getRow = useCallback((member: ResearchMember): ResearchResponseBody => ({
        ...(member.response ?? {}),
        ...(drafts.get(member.member_id) ?? {}),
    }), [drafts]);

    const updateDraft = useCallback((memberId: number, patch: ResearchResponseBody) => {
        setDrafts((prev) => {
            const next = new Map(prev);
            next.set(memberId, { ...(prev.get(memberId) ?? {}), ...patch });
            return next;
        });
        setIsDirty(true);
    }, []);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            await Promise.all(
                Array.from(drafts.keys()).map((memberId) => {
                    const member = allMembers.find((m) => m.member_id === memberId)!;
                    return saveResearchResponse(memberId, getRow(member));
                })
            );
            const updated = await fetchResearchMembers(
                isAllScope ? { gyogu: gyogu as number, team: teamFilter === '' ? undefined : teamFilter as number } : {}
            );
            setAllMembers(updated);
            setDrafts(new Map());
            setIsDirty(false);
            setSnackbar({ open: true, message: '저장되었습니다.', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
        } finally {
            setIsSaving(false);
        }
    }, [allMembers, drafts, getRow]);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const feeOptions: SelectOption[] = useMemo(() => [
        { value: '',           label: '선택 안 함' },
        { value: 'bus',        label: `버스 탑승 회비 (${formatWon(retreatInfo?.fee_with_bus ?? 0)})` },
        { value: 'lodging_only', label: `버스 미탑승+숙박 (${formatWon(retreatInfo?.fee_without_bus ?? 0)})` },
    ], [retreatInfo]);

    const gyoguOptions: SelectOption[] = useMemo(() => [
        { value: '', label: '교구 선택' },
        ...gyoguNos.map((g) => ({ value: g, label: `${g}교구` })),
    ], [gyoguNos]);

    const teamOptions: SelectOption[] = useMemo(() => [
        { value: '', label: '전체 팀' },
        ...teamNos.map((t) => ({ value: t, label: `${t}팀` })),
    ], [teamNos]);

    const groupOptions: SelectOption[] = useMemo(() => [
        { value: '', label: '전체' },
        ...groupNos.map((g) => ({ value: g, label: `${g}그룹` })),
    ], [groupNos]);

    const surveyedCount = members.filter((m) => m.response !== null).length;

    if (loading && (!isAllScope || !retreatInfo)) {
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

    if (loadError || !retreatInfo) {
        const isAccessDenied = loadError === '접근 권한이 없습니다.';
        return (
            <Alert severity={isAccessDenied ? 'warning' : 'error'} sx={{ mt: 2 }}>
                {loadError ?? '데이터를 불러오지 못했습니다.'}
            </Alert>
        );
    }

    return (
        <PageWrapper>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, textAlign: 'center', color: '#021730' }}>
                {retreatInfo.retreat_name}
            </p>
            {/* data_scope=all 교구 미선택 안내 */}
            {isAllScope && gyogu === '' && !noRetreat && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#8c8c8c', fontSize: 15 }}>
                    교구를 선택하면 인원조사 명단이 표시됩니다.
                </div>
            )}
            {/* 필터 바 */}
            <FilterPanel>
                {isAllScope && (
                    <>
                        <FilterGroup>
                            <FilterLabel>교구</FilterLabel>
                            <Select
                                size="small"
                                value={gyogu}
                                options={gyoguOptions}
                                onChange={(v) => handleGyoguChange(v === '' ? '' : Number(v))}
                                width={120}
                            />
                        </FilterGroup>
                        <FilterGroup>
                            <FilterLabel>팀</FilterLabel>
                            <Select
                                size="small"
                                value={teamFilter}
                                options={teamOptions}
                                onChange={(v) => handleTeamFilterChange(v === '' ? '' : Number(v))}
                                disabled={gyogu === '' || teamNos.length === 0}
                                width={110}
                            />
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
                        width={140}
                    />
                </FilterGroup>
                <FilterActions>
                    <Button
                        variant="filled"
                        size="small"
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? '저장 중...' : '저장'}
                    </Button>
                </FilterActions>
            </FilterPanel>

            {loading && isAllScope && gyogu !== '' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <CircularProgress size={32} />
                </div>
            )}

            {/* 테이블 */}
            {(!isAllScope || gyogu !== '') && !loading && <TableWrapper>
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
                                {days.map((d, i) => (
                                    <Th key={d}>{i + 1}일차</Th>
                                ))}
                                <Th>회비납부</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 ? (
                                <tr>
                                    <Td colSpan={6 + days.length + 1} style={{ padding: 40, color: '#8c8c8c' }}>
                                        조회된 인원이 없습니다.
                                    </Td>
                                </tr>
                            ) : paginated.map((member) => {
                                const row = getRow(member);
                                return (
                                    <Tr key={member.member_id}>
                                        <Td>{member.gyogu}교구</Td>
                                        <Td>{member.team}팀</Td>
                                        <Td>{member.group_no}그룹</Td>
                                        <Td>{member.generation}기</Td>
                                        <Td>{member.gender}</Td>
                                        <Td style={{ fontWeight: 600 }}>{member.name}</Td>
                                        {days.map((day) => {
                                            const attKey = `${day}_attendance` as keyof ResearchResponseBody;
                                            const val = (row[attKey] as AttendanceStatus | null | undefined) ?? null;
                                            const bg = val ? (ATTENDANCE_BG[val] ?? 'transparent') : 'transparent';
                                            return (
                                                <Td key={day}>
                                                    <Select
                                                        size="small"
                                                        value={val ?? ''}
                                                        options={ATTENDANCE_OPTIONS}
                                                        onChange={(v) => updateDraft(member.member_id, {
                                                            [attKey]: (v === '' ? null : v) as AttendanceStatus | null,
                                                        })}
                                                        width={90}
                                                        sx={{ backgroundColor: bg, '&:hover': { backgroundColor: bg } }}
                                                    />
                                                </Td>
                                            );
                                        })}
                                        <Td>
                                            <Select
                                                size="small"
                                                value={row.fee_type ?? ''}
                                                options={feeOptions}
                                                onChange={(v) => updateDraft(member.member_id, {
                                                    fee_type: (v === '' ? null : v) as FeeType,
                                                })}
                                                width={220}
                                            />
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </TableScroll>
            </TableWrapper>}

            {(!isAllScope || gyogu !== '') && !loading && (
            <Footer>
                <CountLabel>
                    총 {members.length}명&nbsp;|&nbsp;
                    <span style={{ color: '#1677ff', fontWeight: 600 }}>조사완료 {surveyedCount}명</span>&nbsp;|&nbsp;
                    <span style={{ color: '#ff4d4f', fontWeight: 600 }}>미조사 {members.length - surveyedCount}명</span>
                </CountLabel>
                <TablePagination
                    component="div"
                    count={members.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[20, 50, 100]}
                    labelRowsPerPage="페이지당:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                    sx={{ marginLeft: 'auto', '& .MuiTablePagination-toolbar': { minHeight: 36, flexWrap: 'wrap' } }}
                />
            </Footer>)}

            {/* 이탈 확인 다이얼로그 */}
            <ConfirmDialog open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()}>
                <ConfirmTitle>저장하지 않은 변경 사항</ConfirmTitle>
                <ConfirmContent>
                    변경 사항을 저장하지 않고 이동하시겠습니까?<br />
                    저장하지 않으면 변경 내용이 사라집니다.
                </ConfirmContent>
                <ConfirmActions>
                    <Button variant="outlined" size="small" onClick={() => blocker.reset?.()}>
                        취소
                    </Button>
                    <Button variant="filled" size="small" onClick={() => blocker.proceed?.()}>
                        나가기
                    </Button>
                </ConfirmActions>
            </ConfirmDialog>

            {/* 저장 완료 스낵바 */}
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

export default ResearchPage;
