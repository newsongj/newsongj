import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar } from '@mui/material';
import { Select } from '@components/common/Select';
import type { SelectOption } from '@components/common/Select';
import Button from '@components/common/Button/Button';
import type { AttendanceStatus, FeeType, RetreatInfo, ResearchMember, ResearchResponseBody } from '@models/research.types';

// ─── 목업 데이터 (백엔드 연동 전 임시) ────────────────────────────────────────

const MOCK_RETREAT: RetreatInfo = {
    retreat_custom_id: 1,
    retreat_name:      '2026 뉴송 여름 수련회',
    start_date:        '2026-08-12',
    end_date:          '2026-08-15',
    bus_types:         ['후발', '귀경', '픽업'],
    fee_with_bus:      20000,
    fee_without_bus:   15000,
    buses:             [],
};

const MOCK_MEMBERS: ResearchMember[] = [
    { member_id: 1, name: '김민준', generation: 23, gender: '남', gyogu: 1, team: 1, group_no: 0, response: null },
    { member_id: 2, name: '이서연', generation: 24, gender: '여', gyogu: 1, team: 1, group_no: 0, response: null },
    { member_id: 3, name: '박지훈', generation: 22, gender: '남', gyogu: 1, team: 1, group_no: 1, response: { day1_attendance: '정상', day2_attendance: '정상', day3_attendance: '정상', day4_attendance: '정상', fee_type: 'bus' } },
    { member_id: 4, name: '최수아', generation: 25, gender: '여', gyogu: 1, team: 1, group_no: 1, response: { day1_attendance: '참석', day2_attendance: '후발', day3_attendance: '불참', day4_attendance: null, fee_type: 'lodging' } },
    { member_id: 5, name: '정도현', generation: 23, gender: '남', gyogu: 1, team: 1, group_no: 2, response: null },
    { member_id: 6, name: '한지민', generation: 24, gender: '여', gyogu: 1, team: 1, group_no: 2, response: null },
    { member_id: 7, name: '오승현', generation: 22, gender: '남', gyogu: 1, team: 2, group_no: 3, response: { day1_attendance: '미정', day2_attendance: null, day3_attendance: null, day4_attendance: null, fee_type: null } },
    { member_id: 8, name: '윤채원', generation: 25, gender: '여', gyogu: 1, team: 2, group_no: 3, response: null },
    { member_id: 9, name: '강지수', generation: 26, gender: '여', gyogu: 1, team: 2, group_no: 4, response: null },
];

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
    },
}));

const FilterLabel = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body1.fontSize,
    fontWeight: 700,
    color: theme.custom.colors.text.high,
    whiteSpace: 'nowrap',
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
    ) + 1;
    return Math.min(Math.max(diff, 1), 4);
};

const formatWon = (n: number) => n.toLocaleString('ko-KR') + '원';

// ─── Component ───────────────────────────────────────────────────────────────

const ResearchPage: React.FC = () => {
    const user         = getStoredUser();
    // 유저 없으면(로그인 우회 중) 팀장 권한으로 처리
    const isTeamLeader = user === null || user?.role === 'team_leader' || user?.role === 'admin';

    // TODO: 백엔드 연동 시 useQuery로 교체
    const retreatInfo = MOCK_RETREAT;
    const allMembers  = MOCK_MEMBERS;

    const [groupNo, setGroupNo] = useState<number | ''>(() =>
        !isTeamLeader && user?.group_no != null ? user.group_no : ''
    );
    const [drafts,   setDrafts]   = useState<Map<number, ResearchResponseBody>>(new Map());
    const [isDirty,  setIsDirty]  = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    const days: DayKey[] = useMemo(() => {
        const count = getDayCount(retreatInfo);
        return (['day1', 'day2', 'day3', 'day4'] as DayKey[]).slice(0, count);
    }, [retreatInfo]);

    const groupNos = useMemo(() => {
        const set = new Set(allMembers.map((m) => m.group_no));
        return Array.from(set).sort((a, b) => a - b);
    }, [allMembers]);

    const members = useMemo(() =>
        groupNo === '' ? allMembers : allMembers.filter((m) => m.group_no === groupNo),
    [allMembers, groupNo]);

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
            // TODO: 백엔드 연동 시 실제 API 호출로 교체
            // await Promise.all(
            //   Array.from(drafts.keys()).map((memberId) => {
            //     const member = allMembers.find((m) => m.member_id === memberId)!;
            //     return saveResearchResponse(memberId, getRow(member));
            //   })
            // );
            await new Promise((r) => setTimeout(r, 400));
            setIsDirty(false);
            setSnackbar({ open: true, message: '저장되었습니다.', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
        } finally {
            setIsSaving(false);
        }
    }, []);

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
        { value: '',        label: '선택 안 함' },
        { value: 'bus',     label: `버스 탑승 회비 (${formatWon(retreatInfo.fee_with_bus)})` },
        { value: 'lodging', label: `버스 미탑승+숙박 (${formatWon(retreatInfo.fee_without_bus)})` },
    ], [retreatInfo]);

    const groupOptions: SelectOption[] = useMemo(() => [
        { value: '', label: '전체' },
        ...groupNos.map((g) => ({ value: g, label: `${g}그룹` })),
    ], [groupNos]);

    const surveyedCount = members.filter((m) => m.response !== null).length;

    return (
        <PageWrapper>
            {/* 필터 바 */}
            <FilterPanel>
                <FilterLabel>그룹 선택</FilterLabel>
                <Select
                    size="small"
                    value={groupNo}
                    options={groupOptions}
                    onChange={(v) => setGroupNo(v === '' ? '' : Number(v))}
                    disabled={!isTeamLeader}
                    width={140}
                />
                <div style={{ marginLeft: 'auto' }}>
                    <Button
                        variant="filled"
                        size="small"
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? '저장 중...' : '저장'}
                    </Button>
                </div>
            </FilterPanel>

            {/* 테이블 */}
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
                            ) : members.map((member) => {
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
            </TableWrapper>

            {/* 하단 집계 */}
            <Footer>
                <CountLabel>
                    총 {members.length}명&nbsp;|&nbsp;
                    <span style={{ color: '#1677ff', fontWeight: 600 }}>조사완료 {surveyedCount}명</span>&nbsp;|&nbsp;
                    <span style={{ color: '#ff4d4f', fontWeight: 600 }}>미조사 {members.length - surveyedCount}명</span>
                </CountLabel>
            </Footer>

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

