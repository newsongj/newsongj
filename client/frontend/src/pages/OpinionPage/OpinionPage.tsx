// 소견서 작성 (사용자 페이지)
//
// 레이아웃은 수련회 인원조사(`ResearchPage`)의 필터 패널·테이블 패턴을 따르고,
// 입력 항목은 관리자 소견서 상세 모달과 같은 구성을 쓴다.
//
// 흐름:  [담당 대상자 목록]  →  행 클릭  →  [작성 폼]  →  저장  →  목록으로
//
// **누가 보이는지는 서버가 판정한다.** 화면은 받은 목록을 그릴 뿐이다.
//   팀장   → 같은 팀 전원 (그룹장 등 리더 포함)
//   그룹장 → 같은 그룹의 직분 없는 팀원
//   임원단 → 매핑에 걸린 대상자
//   − 본인은 언제나 빠진다 (자기 소견서를 자기가 쓸 수 없다)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Alert, CircularProgress, Snackbar, TablePagination } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@components/common/Button/Button';
import { TextField } from '@components/common/TextField';
import { fetchMyReport, fetchMyTargets, saveMyReport } from '@api/opinion';
import {
    formatDday,
    INPUT_FIELD_LABELS,
    INPUT_FIELD_MAX_LENGTH,
    INPUT_FIELD_MULTILINE,
    INPUT_FIELD_ORDER,
    INPUT_FIELD_PARENT,
    MEMBER_FIELD_LABELS,
    OpinionConflictError,
} from '@models/opinion.types';
import type {
    InputFieldKey,
    MemberFieldKey,
    MemberValueMap,
    OpinionFields,
    OpinionMyTargetsResponse,
    OpinionTarget,
} from '@models/opinion.types';

const CURRENT_YEAR = new Date().getFullYear();

// ─── Styled ──────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
    display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.md,
    '@media (max-width: 600px)': { gap: theme.custom.spacing.sm },
}));

/** 상단 배너 — 주제(표어) + 마감 D-day */
const Banner = styled('section')(({ theme }) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: theme.custom.spacing.sm, flexWrap: 'wrap',
    backgroundColor: theme.custom.colors.neutral._99,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: theme.custom.borderRadius,
    padding: theme.custom.spacing.md,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
}));

const Theme = styled('p')(({ theme }) => ({
    margin: 0, fontSize: 18, fontWeight: 700, color: '#021730',
    wordBreak: 'keep-all',
    '@media (max-width: 600px)': { fontSize: theme.custom.typography.body1.fontSize },
}));

/** 마감 임박(3일 이하)이면 붉게, 지났으면 회색 */
const Dday = styled('span')<{ $tone: 'normal' | 'urgent' | 'closed' }>(({ $tone }) => ({
    display: 'inline-block', padding: '4px 14px', borderRadius: 999,
    fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
    color:      $tone === 'closed' ? '#8c8c8c' : $tone === 'urgent' ? '#ff4d4f' : '#1677ff',
    background: $tone === 'closed' ? '#f5f5f5' : $tone === 'urgent' ? '#fff1f0' : '#e6f4ff',
    border: `1px solid ${$tone === 'closed' ? '#d9d9d9' : $tone === 'urgent' ? '#ffccc7' : '#91caff'}`,
}));

const GuideText = styled('p')(({ theme }) => ({
    margin: 0,
    padding: theme.custom.spacing.sm,
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium,
    backgroundColor: '#f0f8ff',
    border: '1px solid #bae0ff',
    borderRadius: theme.custom.borderRadius,
    lineHeight: 1.7, wordBreak: 'keep-all', whiteSpace: 'pre-wrap',
}));

const CountRow = styled('div')({ marginTop: 4 });

const CountLabel = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium,
    '@media (max-width: 480px)': { fontSize: theme.custom.typography.caption.fontSize },
}));

const TableWrapper = styled('div')(({ theme }) => ({
    borderRadius: theme.custom.borderRadius,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    overflow: 'hidden', backgroundColor: theme.custom.colors.white,
}));

const TableScroll = styled('div')({ overflowX: 'auto', WebkitOverflowScrolling: 'touch' });

const Table = styled('table')(({ theme }) => ({
    width: 'max-content', minWidth: '100%', borderCollapse: 'collapse',
    borderTop: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const Th = styled('th')(({ theme }) => ({
    backgroundColor: theme.custom.colors.neutral._99,
    fontWeight: theme.custom.typography.body1.fontWeight,
    fontSize: theme.custom.typography.body1.fontSize,
    color: theme.custom.colors.text.medium,
    padding: theme.custom.spacing.xs,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    whiteSpace: 'nowrap', textAlign: 'center',
    '@media (max-width: 600px)': { fontSize: theme.custom.typography.caption.fontSize },
}));

const Td = styled('td')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.high,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    padding: theme.custom.spacing.xs,
    textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap',
    '@media (max-width: 600px)': { fontSize: theme.custom.typography.caption.fontSize },
}));

const Tr = styled('tr')(({ theme }) => ({
    cursor: 'pointer',
    '&:last-child td': { borderBottom: 'none' },
    '&:hover td': { backgroundColor: theme.custom.overlay.primary.hover },
}));

const StatusBadge = styled('span')<{ $written: boolean }>(({ $written }) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 999,
    fontSize: 12, fontWeight: 600,
    color:      $written ? '#059669' : '#b45309',
    background: $written ? '#d1fae5' : '#fef3c7',
}));

// ── 작성 폼 ───────────────────────────────────────────────────────────────────

const FormCard = styled('section')(({ theme }) => ({
    display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.md,
    backgroundColor: theme.custom.colors.white,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: theme.custom.borderRadius,
    padding: theme.custom.spacing.md,
}));

const FormHeader = styled('div')(({ theme }) => ({
    display: 'flex', alignItems: 'baseline', gap: theme.custom.spacing.sm, flexWrap: 'wrap',
    paddingBottom: theme.custom.spacing.sm,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

/** 대상자 소속 — 이름 옆에 작게 */
const TargetMeta = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium,
}));

/** 「목록으로」 줄 — 카드 **위**에 따로 둔다. 카드 안 이름 옆에 붙이면 제목처럼 보인다 */
const BackRow = styled('div')({ display: 'flex' });

const TargetName = styled('h2')(({ theme }) => ({
    margin: 0, fontSize: 18, fontWeight: 700, color: theme.custom.colors.text.high,
}));

/** 섹션 제목 — 관리자 소견서 상세 모달의 `ModalSectionTitle` 과 같은 규격 */
const SectionTitle = styled('h4')(({ theme }) => ({
    margin: 0, fontSize: theme.custom.typography.body1.fontSize, fontWeight: 700,
    color: theme.custom.colors.text.high,
    paddingBottom: 6,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const NoticeText = styled('p')(({ theme }) => ({
    margin: '8px 0',
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium,
}));

/** 교적 자동 기입 — 라벨 고정폭 + 밑줄. 관리자 `ReadonlyGrid` 와 동일 */
const ReadonlyGrid = styled('div')({
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '2px 16px',
});

const ReadonlyItem = styled('div')(({ theme }) => ({
    display: 'flex', gap: 8, padding: '6px 0',
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    fontSize: theme.custom.typography.body2.fontSize,
}));

const ReadonlyLabel = styled('span')(({ theme }) => ({
    flex: '0 0 84px', color: theme.custom.colors.text.medium,
}));

const ReadonlyValue = styled('span')(({ theme }) => ({
    flex: 1, color: theme.custom.colors.text.high, fontWeight: 500, wordBreak: 'break-word',
}));

/** 단답 항목 2열 — 관리자 `EditGrid` 와 동일 */
const EditGrid = styled('div')(({ theme }) => ({
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.custom.spacing.md,
    '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
}));

const Section = styled('div')({ display: 'flex', flexDirection: 'column' });

const FormActions = styled('div')(({ theme }) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: theme.custom.spacing.sm,
    paddingTop: theme.custom.spacing.sm,
    borderTop: `1px solid ${theme.custom.colors.primary.outline}`,
    '@media (max-width: 480px)': { '& > *': { flex: 1, justifyContent: 'center' } },
}));

const Centered = styled('div')({
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '60vh', color: '#8c8c8c', fontSize: 16,
});

// ─── Component ───────────────────────────────────────────────────────────────

const OpinionPage: React.FC = () => {
    const [info, setInfo] = useState<OpinionMyTargetsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [closed, setClosed] = useState(false);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // 작성 폼
    const [editing, setEditing] = useState<OpinionTarget | null>(null);
    const [fields, setFields] = useState<OpinionFields>({});
    const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(null);
    const [memberInfo, setMemberInfo] = useState<MemberValueMap>({});
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>(
        { open: false, message: '', severity: 'success' },
    );

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            setInfo(await fetchMyTargets(CURRENT_YEAR));
        } catch (e: any) {
            // 회차가 닫혀 있으면 서버가 403 — 「소견서 기간이 아닙니다」만 보여준다
            if (e?.response?.status === 403) setClosed(true);
            else setLoadError('소견서 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    // 작성 중 이탈 방지 — 인원조사와 같은 방식
    const blocker = useBlocker(({ currentLocation, nextLocation }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    useEffect(() => {
        if (blocker.state === 'blocked') {
            if (window.confirm('작성 중인 내용이 저장되지 않았습니다. 이동하시겠습니까?')) blocker.proceed();
            else blocker.reset();
        }
    }, [blocker]);

    /** 설정에서 켜진 항목만, 정해진 순서대로. 기타설명란은 부모가 켜져 있어야 뜬다 */
    const visibleFields = useMemo<InputFieldKey[]>(() => {
        const on = new Set(info?.input_fields ?? []);
        return INPUT_FIELD_ORDER.filter((k) => {
            if (!on.has(k)) return false;
            const parent = INPUT_FIELD_PARENT[k];
            return parent ? on.has(parent) : true;
        });
    }, [info]);

    /** 단답은 2열 그리드, 전체소견·특별소견은 아래에 전체 폭으로 */
    const shortFields = useMemo(
        () => visibleFields.filter((k) => !INPUT_FIELD_MULTILINE.includes(k)),
        [visibleFields],
    );
    const longFields = useMemo(
        () => visibleFields.filter((k) => INPUT_FIELD_MULTILINE.includes(k)),
        [visibleFields],
    );

    const targets = info?.targets ?? [];
    const writtenCount = targets.filter((t) => t.is_written).length;

    const paginated = useMemo(
        () => targets.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
        [targets, page, rowsPerPage],
    );

    const dday = formatDday(info?.end_date ?? null);
    const ddayTone: 'normal' | 'urgent' | 'closed' =
        dday === '마감' ? 'closed'
            : dday === 'D-DAY' || (dday && Number(dday.slice(2)) <= 3) ? 'urgent'
                : 'normal';

    const openForm = useCallback(async (target: OpinionTarget) => {
        setEditing(target);
        setFormLoading(true);
        try {
            const r = await fetchMyReport(target.member_id, CURRENT_YEAR);
            const { member_id: _m, report_year: _y, updated_at, member, ...rest } = r;
            setFields(rest as OpinionFields);
            setBaseUpdatedAt(updated_at);
            setMemberInfo(member);
            setIsDirty(false);
        } catch {
            setSnackbar({ open: true, message: '소견서를 불러오지 못했습니다.', severity: 'error' });
            setEditing(null);
        } finally {
            setFormLoading(false);
        }
    }, []);

    const closeForm = useCallback(() => {
        if (isDirty && !window.confirm('작성 중인 내용이 저장되지 않았습니다. 목록으로 돌아가시겠습니까?')) return;
        setEditing(null);
        setIsDirty(false);
    }, [isDirty]);

    const handleChange = (key: InputFieldKey, value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
        setIsDirty(true);
    };

    const handleSave = useCallback(async () => {
        if (!editing) return;
        setIsSaving(true);
        try {
            // 빈 문자열은 null 로 — 「지웠다」를 명시적으로 보낸다
            const payload = Object.fromEntries(
                visibleFields.map((k) => [k, (fields[k] ?? '').toString().trim() || null]),
            );
            await saveMyReport(editing.member_id, CURRENT_YEAR, {
                base_updated_at: baseUpdatedAt,
                ...payload,
            });
            setIsDirty(false);
            setEditing(null);
            setSnackbar({ open: true, message: '저장되었습니다.', severity: 'success' });
            await load();
        } catch (e) {
            if (e instanceof OpinionConflictError) {
                // 폼을 닫지 않는다 — 닫으면 방금 쓴 내용을 전부 잃는다
                setSnackbar({ open: true, message: e.message, severity: 'warning' });
                const latest = await fetchMyReport(editing.member_id, CURRENT_YEAR);
                const { member_id: _m, report_year: _y, updated_at, member: _mem, ...rest } = latest;
                setFields(rest as OpinionFields);
                setBaseUpdatedAt(updated_at);
            } else {
                setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
            }
        } finally {
            setIsSaving(false);
        }
    }, [editing, fields, visibleFields, baseUpdatedAt, load]);

    // ── 렌더 ──────────────────────────────────────────────────────────────────

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><CircularProgress size={32} /></div>;
    }

    // exists / is_active / is_open 중 하나라도 false 면 서버가 403 을 준다
    if (closed) return <Centered>소견서 기간이 아닙니다.</Centered>;

    if (loadError || !info) return <Alert severity="error" sx={{ mt: 2 }}>{loadError ?? '데이터를 불러오지 못했습니다.'}</Alert>;

    return (
        <PageWrapper>
            <Banner>
                <Theme>{info.theme ?? `${info.report_year}년 소견서`}</Theme>
                {dday && <Dday $tone={ddayTone}>{dday === '마감' ? '마감' : `마감 ${dday}`}</Dday>}
            </Banner>

            {info.guide_text && <GuideText>{info.guide_text}</GuideText>}

            {editing ? (
                <>
                <BackRow>
                    <Button
                        variant="outlined"
                        onClick={closeForm}
                        showIcon
                        icon={<ArrowBackIcon />}
                    >
                        목록으로
                    </Button>
                </BackRow>

                <FormCard>
                    <FormHeader>
                        <TargetName>{editing.name}</TargetName>
                        <TargetMeta>
                            {[
                                editing.gyogu != null ? `${editing.gyogu}교구` : null,
                                editing.team != null ? `${editing.team}팀` : null,
                                editing.group_no != null ? `${editing.group_no}그룹` : null,
                            ].filter(Boolean).join(' ')}
                        </TargetMeta>
                    </FormHeader>

                    {formLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                            <CircularProgress size={28} />
                        </div>
                    ) : (
                        <>
                            {/* 교적 자동 기입 — 설정에서 켜진 항목만, 수정 불가 */}
                            <Section>
                                <SectionTitle>교적 정보</SectionTitle>
                                <NoticeText>
                                    교적에서 자동으로 채워지는 항목입니다. 이 화면에서는 수정할 수 없습니다.
                                </NoticeText>
                                <ReadonlyGrid>
                                    {info.member_fields.map((key: MemberFieldKey) => (
                                        <ReadonlyItem key={key}>
                                            <ReadonlyLabel>{MEMBER_FIELD_LABELS[key]}</ReadonlyLabel>
                                            <ReadonlyValue>{formatMemberValue(key, memberInfo[key])}</ReadonlyValue>
                                        </ReadonlyItem>
                                    ))}
                                </ReadonlyGrid>
                            </Section>

                            {/* 작성자 직접 입력 — 단답은 2열, 긴 소견은 아래에 전체 폭 */}
                            <Section>
                                <SectionTitle>소견 내용</SectionTitle>
                                <NoticeText>
                                    {editing.is_written && editing.updated_at
                                        ? `최종 수정 ${editing.updated_at.slice(0, 10)}`
                                        : '미작성'}
                                </NoticeText>

                                <EditGrid style={{ marginTop: 12 }}>
                                    {shortFields.map((key) => {
                                        const value = (fields[key] ?? '') as string;
                                        const max = INPUT_FIELD_MAX_LENGTH[key];
                                        return (
                                            <TextField
                                                key={key}
                                                label={INPUT_FIELD_LABELS[key]}
                                                value={value}
                                                onChange={(e) => handleChange(key, e.target.value)}
                                                maxLength={max}
                                                error={value.length >= max}
                                                helperText={value.length >= max
                                                    ? `최대 ${max}자까지 입력 가능합니다.` : undefined}
                                                fullWidth
                                            />
                                        );
                                    })}
                                </EditGrid>

                                {longFields.map((key) => {
                                    const value = (fields[key] ?? '') as string;
                                    const max = INPUT_FIELD_MAX_LENGTH[key];
                                    return (
                                        <div key={key} style={{ marginTop: 16 }}>
                                            <TextField
                                                label={INPUT_FIELD_LABELS[key]}
                                                value={value}
                                                onChange={(e) => handleChange(key, e.target.value)}
                                                maxLength={max}
                                                error={value.length >= max}
                                                helperText={value.length >= max * 0.8
                                                    ? `${value.length}/${max}자` : undefined}
                                                multiline
                                                rows={5}
                                                fullWidth
                                            />
                                        </div>
                                    );
                                })}
                            </Section>

                            {/* 폼이 길어 끝까지 내려온 뒤에도 돌아갈 수 있어야 한다.
                                두 버튼 모두 공용 `Button` 이라 크기가 어긋나지 않는다 */}
                            <FormActions>
                                <Button
                                    variant="outlined"
                                    onClick={closeForm}
                                    disabled={isSaving}
                                    showIcon
                                    icon={<ArrowBackIcon />}
                                >
                                    목록으로
                                </Button>
                                <Button variant="filled" onClick={handleSave} disabled={isSaving || !isDirty}>
                                    {isSaving ? '저장 중...' : '저장'}
                                </Button>
                            </FormActions>
                        </>
                    )}
                </FormCard>
                </>
            ) : (
                <>
                    <CountRow>
                        <CountLabel>
                            담당 {targets.length}명&nbsp;|&nbsp;
                            <span style={{ color: '#059669', fontWeight: 600 }}>작성 완료 {writtenCount}명</span>&nbsp;|&nbsp;
                            <span style={{ color: '#ff4d4f', fontWeight: 600 }}>미작성 {targets.length - writtenCount}명</span>
                        </CountLabel>
                    </CountRow>

                    <TableWrapper>
                        <TableScroll>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>교구</Th><Th>팀</Th><Th>그룹</Th>
                                        <Th>기수</Th><Th>성별</Th><Th>이름</Th>
                                        <Th>구분</Th><Th>작성 여부</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {targets.length === 0 ? (
                                        <tr>
                                            <Td colSpan={8} style={{ padding: 40, color: '#8c8c8c' }}>
                                                담당 대상자가 없습니다.
                                            </Td>
                                        </tr>
                                    ) : paginated.map((t) => (
                                        <Tr key={t.member_id} onClick={() => void openForm(t)}>
                                            <Td>{t.gyogu != null ? `${t.gyogu}교구` : '—'}</Td>
                                            <Td>{t.team != null ? `${t.team}팀` : '—'}</Td>
                                            <Td>{t.group_no != null ? `${t.group_no}그룹` : '—'}</Td>
                                            <Td>{t.generation != null ? `${t.generation}기` : '—'}</Td>
                                            <Td>{t.gender ?? '—'}</Td>
                                            <Td style={{ fontWeight: 600 }}>{t.name}</Td>
                                            <Td>{t.member_type ?? '—'}</Td>
                                            <Td>
                                                <StatusBadge $written={t.is_written}>
                                                    {t.is_written ? '작성 완료' : '미작성'}
                                                </StatusBadge>
                                            </Td>
                                        </Tr>
                                    ))}
                                </tbody>
                            </Table>
                        </TableScroll>
                    </TableWrapper>

                    {targets.length > rowsPerPage && (
                        <TablePagination
                            component="div"
                            count={targets.length}
                            page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                            rowsPerPageOptions={[10, 20, 50]}
                            labelRowsPerPage="행 수"
                        />
                    )}
                </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </PageWrapper>
    );
};

/**
 * 교적 항목 표시값 — 단위를 붙이고 배열을 펼친다.
 *
 * `leader_names` 는 배열이라 그냥 String() 하면 `그룹장,팀장` 처럼 붙어 나온다.
 * `attendance_rate` 는 숫자(%)다.
 */
function formatMemberValue(
    key: MemberFieldKey,
    value: string | number | string[] | null | undefined,
): string {
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
    if (value == null || value === '') return '—';
    switch (key) {
        case 'gyogu':           return `${value}교구`;
        case 'team':            return `${value}팀`;
        case 'group_no':        return `${value}그룹`;
        case 'generation':      return `${value}기`;
        case 'attendance_rate': return `${value}%`;
        default:                return String(value);
    }
}

export default OpinionPage;
