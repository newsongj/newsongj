import React, { useCallback, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Alert, Checkbox, Snackbar, Tooltip } from '@mui/material';
import { Select } from '@components/common/Select';
import type { SelectOption } from '@components/common/Select';
import Button from '@components/common/Button/Button';
import type {
    ReviewStatus,
    SuspendedMealDraft,
    SuspendedMealMember,
} from '@models/suspendedMeal.types';

// ─── 목업 데이터 (백엔드 연동 전 임시) ────────────────────────────────────────

const MOCK_MEMBERS: SuspendedMealMember[] = [
    { member_id: 1, name: '김민준', generation: 23, gender: '남', gyogu: 1, team: 1, group_no: 0, application: null },
    { member_id: 2, name: '이서연', generation: 24, gender: '여', gyogu: 1, team: 1, group_no: 0, application: null },
    {
        member_id: 3, name: '박지훈', generation: 22, gender: '남', gyogu: 1, team: 1, group_no: 1,
        application: {
            application_id: 1, meal_count: 3, fee_support: true,
            applicant_reason: '지방 일정으로 첫날 저녁부터 참석 가능합니다.',
            applied_at: '2026-06-10T10:00:00', review_status: 'PENDING', review_comment: null, reviewed_at: null,
        },
    },
    {
        member_id: 4, name: '최수아', generation: 25, gender: '여', gyogu: 1, team: 1, group_no: 1,
        application: {
            application_id: 2, meal_count: 2, fee_support: true,
            applicant_reason: '직장 일정으로 늦게 참석 예정입니다.',
            applied_at: '2026-06-10T11:00:00', review_status: 'APPROVED',
            review_comment: '확인했습니다.', reviewed_at: '2026-06-11T09:00:00',
        },
    },
    {
        member_id: 5, name: '정도현', generation: 23, gender: '남', gyogu: 1, team: 1, group_no: 2,
        application: {
            application_id: 3, meal_count: 1, fee_support: false,
            applicant_reason: null, applied_at: '2026-06-10T12:00:00',
            review_status: 'REJECTED', review_comment: '내용이 불충분합니다. 재신청 바랍니다.',
            reviewed_at: '2026-06-11T10:00:00',
        },
    },
    { member_id: 6, name: '한지민', generation: 24, gender: '여', gyogu: 1, team: 1, group_no: 2, application: null },
    { member_id: 7, name: '오승현', generation: 22, gender: '남', gyogu: 1, team: 2, group_no: 3, application: null },
    { member_id: 8, name: '윤채원', generation: 25, gender: '여', gyogu: 1, team: 2, group_no: 4, application: null },
];

// ─── Select 옵션 ───────────────────────────────────────────────────────────────

const MEAL_OPTIONS: SelectOption[] = [0, 1, 2, 3, 4, 5].map((n) => ({
    value: n,
    label: `${n}끼`,
}));

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

const InfoBar = styled('section')(({ theme }) => ({
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

const InfoTitle = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body1.fontSize,
    fontWeight: 700,
    color: theme.custom.colors.text.high,
    whiteSpace: 'nowrap',
}));

const InfoDivider = styled('span')(({ theme }) => ({
    width: 1,
    height: 14,
    backgroundColor: theme.custom.colors.primary.outline,
    flexShrink: 0,
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
    // TODO: 백엔드 연동 시 useQuery로 교체
    const members = MOCK_MEMBERS;

    const [drafts, setDrafts] = useState<Map<number, SuspendedMealDraft>>(() => {
        const map = new Map<number, SuspendedMealDraft>();
        members.forEach((m) => {
            map.set(m.member_id, {
                meal_count:       m.application?.meal_count       ?? 0,
                fee_support:      m.application?.fee_support       ?? false,
                applicant_reason: m.application?.applicant_reason ?? '',
            });
        });
        return map;
    });

    const getDraft = useCallback((member: SuspendedMealMember): SuspendedMealDraft => (
        drafts.get(member.member_id) ?? { meal_count: 0, fee_support: false, applicant_reason: '' }
    ), [drafts]);

    const updateDraft = useCallback((memberId: number, patch: Partial<SuspendedMealDraft>) => {
        setDrafts((prev) => {
            const next = new Map(prev);
            const cur = next.get(memberId) ?? { meal_count: 0, fee_support: false, applicant_reason: '' };
            next.set(memberId, { ...cur, ...patch });
            return next;
        });
    }, []);

    const canSubmit = useCallback((member: SuspendedMealMember): boolean => {
        const { meal_count, fee_support, applicant_reason } = getDraft(member);
        if (!member.application) {
            // 신규: 식사수 변경 또는 회비지원 신청 여부가 기본값과 다를 때 활성화
            return meal_count !== 0 || fee_support;
        }
        // 수정: 저장된 값과 하나라도 다를 때 활성화
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

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    const handleSubmit = useCallback(async (_memberId: number, isUpdate: boolean) => {
        try {
            // TODO: 백엔드 연동 시 실제 API 호출로 교체
            // const draft = drafts.get(memberId)!;
            // await submitSuspendedMeal(memberId, {
            //     meal_count: draft.meal_count,
            //     fee_support: draft.fee_support,
            //     applicant_reason: draft.fee_support ? draft.applicant_reason || null : null,
            // });
            await new Promise((r) => setTimeout(r, 300));
            setSnackbar({ open: true, message: isUpdate ? '수정이 완료되었습니다.' : '신청이 완료되었습니다.', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: '처리 중 오류가 발생했습니다.', severity: 'error' });
        }
    }, []);

    const totalCount   = members.length;
    const appliedCount = members.filter((m) => m.application !== null).length;

    return (
        <PageWrapper>
            {/* 상단 정보 바 */}
            <InfoBar>
                <InfoTitle>서스펜디드밀 신청</InfoTitle>
                <InfoDivider />
                <CountLabel>
                    총 {totalCount}명&nbsp;|&nbsp;
                    <span style={{ color: '#1677ff', fontWeight: 600 }}>신청완료 {appliedCount}명</span>
                </CountLabel>
            </InfoBar>

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
                            ) : members.map((member) => {
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
                                                options={MEAL_OPTIONS}
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
                                                    fee_support:      e.target.checked,
                                                    applicant_reason: e.target.checked ? draft.applicant_reason : '',
                                                })}
                                                sx={{ padding: '2px', color: 'rgba(2,23,48,0.3)', '&.Mui-checked': { color: '#021730' } }}
                                            />
                                        </Td>

                                        {/* 신청사유 */}
                                        <Td>
                                            <ReasonInput
                                                placeholder="사유 입력"
                                                value={draft.applicant_reason}
                                                disabled={reviewed || !draft.fee_support}
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
