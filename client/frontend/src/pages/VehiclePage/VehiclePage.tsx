import React, { useCallback, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar } from '@mui/material';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import type { SelectOption } from '@components/common/Select';
import type {
    BusSlot, BusType, DayKey, VehicleRetreatInfo, VehicleSelections,
    BusSingleSelection, BusMultiSelections,
} from '@models/vehicle.types';

// ─── 목업 데이터 (bus_custom 기반) ────────────────────────────────────────────

const MOCK_RETREAT: VehicleRetreatInfo = {
    retreat_custom_id: 1,
    retreat_name:      '2026 뉴송 여름 수련회',
    start_date:        '2026-08-12',
    end_date:          '2026-08-15',
    vehicles: {
        후발: {
            day1: { buses: [
                { bus_id: 1, bus_name: '후발버스1', departure_time: '15:00', departure_date: '2026-08-12' },
                { bus_id: 2, bus_name: '후발버스2', departure_time: '18:00', departure_date: '2026-08-12' },
            ]},
        },
        픽업: {
            day2: { buses: [
                { bus_id: 5, bus_name: '픽업버스1', departure_time: '11:30', departure_date: '2026-08-13' },
            ]},
        },
        귀경: {
            day4: { buses: [
                { bus_id: 3, bus_name: '귀경버스1', departure_time: '05:30', departure_date: '2026-08-15' },
                { bus_id: 4, bus_name: '귀경버스2', departure_time: '22:00', departure_date: '2026-08-15' },
            ]},
        },
    },
};

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const BUS_TYPE_ORDER: BusType[] = ['후발', '픽업', '귀경'];

const MULTI_SELECT_TYPES = new Set<BusType>(['픽업', '귀경']);

const BUS_TYPE_META: Record<BusType, { label: string; desc: string }> = {
    후발: { label: '후발',  desc: '정상 출발 이후 후발 탑승하는 차량' },
    픽업: { label: '픽업',  desc: '수련회 기간 중 지정 장소에서 픽업하는 차량' },
    귀경: { label: '귀경',  desc: '수련회 기간 중 귀가하는 차량' },
};

const DAY_LABELS: Record<DayKey, string> = {
    day1: '첫째날',
    day2: '둘째날',
    day3: '셋째날',
    day4: '넷째날',
};

const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

const formatTime12h = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const period = h < 12 ? '오전' : '오후';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${period} ${hour12}:${m.toString().padStart(2, '0')}`;
};

const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const addDays = (dateStr: string, n: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d;
};

const formatShortDate = (dateStr: string, dayIdx: number) => {
    const d = addDays(dateStr, dayIdx);
    return `${d.getMonth() + 1}/${d.getDate()} (${DAYS_KR[d.getDay()]})`;
};

const getDayCount = (start: string, end: string) =>
    Math.min(
        Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1,
        4,
    );

const GYOGU_OPTIONS: SelectOption[] = [
    { value: '', label: '선택' },
    ...[1, 2, 3].map((n) => ({ value: n, label: `${n}교구` })),
];

const TEAM_OPTIONS: SelectOption[] = [
    { value: '', label: '선택' },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({ value: n, label: `${n}팀` })),
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserForm { gyogu: string | number; team: string | number; name: string; phone: string; }

interface SubmissionRecord {
    submittedAt: string;
    form: UserForm;
    selections: VehicleSelections;
}

const MOCK_HISTORY: SubmissionRecord | null = {
    submittedAt: '2026. 8. 1. 오후 2:23',
    form: { gyogu: 1, team: 3, name: '홍길동', phone: '010-1234-5678' },
    selections: {
        후발: { bus_id: 1, bus_name: '후발버스1', departure_time: '15:00', departure_date: '2026-08-12' },
        귀경: [{ bus_id: 4, bus_name: '귀경버스2', departure_time: '22:00', departure_date: '2026-08-15' }],
    },
};

// ─── Helpers (선택 내역 요약) ─────────────────────────────────────────────────

const formatSelectionSummary = (type: BusType, sel: BusSingleSelection | BusMultiSelections | null | undefined): string => {
    if (!sel) return '신청 안 함';
    if (!MULTI_SELECT_TYPES.has(type)) {
        const s = sel as BusSingleSelection;
        if (!s) return '신청 안 함';
        return `${s.bus_name}  ${formatTime12h(s.departure_time)}`;
    }
    const arr = sel as BusMultiSelections;
    if (!arr || arr.length === 0) return '신청 안 함';
    return arr.map((b) => `${b.bus_name} ${formatTime12h(b.departure_time)}`).join(' / ');
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
    display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.lg,
    '@media (max-width: 600px)': { gap: theme.custom.spacing.md },
}));

const RetreatLabel = styled('p')(({ theme }) => ({
    margin: 0, fontSize: theme.custom.typography.body2.fontSize,
    fontWeight: 600, color: theme.custom.colors.text.medium,
}));

const HistorySection = styled('section')(({ theme }) => ({
    display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.sm,
    padding: theme.custom.spacing.lg,
    backgroundColor: theme.custom.colors.neutral._99,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: theme.custom.borderRadius,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
    '@media (max-width: 600px)': { padding: theme.custom.spacing.md },
}));

const HistoryHeaderRow = styled('div')({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
});

const HistoryTitle = styled('h3')(({ theme }) => ({
    margin: 0, fontSize: theme.custom.typography.subtitle.fontSize,
    fontWeight: 700, color: theme.custom.colors.text.high,
}));

const HistoryTimestamp = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize, color: theme.custom.colors.text.medium,
}));

const HistoryVehicleList = styled('div')(({ theme }) => ({
    display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.xs,
}));

const HistoryVehicleItem = styled('div')(({ theme }) => ({
    display: 'flex', alignItems: 'center', gap: theme.custom.spacing.sm,
}));

const VehicleTypeBadge = styled('span')(({ theme }) => ({
    display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
    borderRadius: 100,
    backgroundColor: theme.custom.colors.primary._050,
    border: `1px solid ${theme.custom.colors.primary._100}`,
    color: theme.custom.colors.primary._700,
    fontSize: theme.custom.typography.body2.fontSize, fontWeight: 600, whiteSpace: 'nowrap',
}));

const HistoryVehicleText = styled('span')(({ theme }) => ({
    color: theme.custom.colors.text.high, fontSize: theme.custom.typography.body2.fontSize,
}));

const TypeSelectorPanel = styled('section')(({ theme }) => ({
    display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.sm,
    padding: theme.custom.spacing.lg,
    backgroundColor: theme.custom.colors.primary._050,
    border: `1px solid ${theme.custom.colors.primary._100}`,
    borderRadius: theme.custom.borderRadius,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
    '@media (max-width: 600px)': { padding: theme.custom.spacing.md },
}));

const TypeSelectorTitle = styled('p')(({ theme }) => ({
    margin: 0, fontSize: theme.custom.typography.subtitle.fontSize,
    fontWeight: 700, color: theme.custom.colors.primary._700,
}));

const TypeSelectorHint = styled('p')(({ theme }) => ({
    margin: 0, fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.primary._600, lineHeight: '1.6',
}));

const FormSection = styled('section')(({ theme }) => ({
    display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.md,
    padding: theme.custom.spacing.lg,
    backgroundColor: theme.custom.colors.neutral._99,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: theme.custom.borderRadius,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
    '@media (max-width: 600px)': { padding: theme.custom.spacing.md },
}));

const SectionTitleRow = styled('div')({
    display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 10,
});

const SectionTitle = styled('h3')(({ theme }) => ({
    margin: 0, fontSize: theme.custom.typography.subtitle.fontSize,
    fontWeight: 700, color: theme.custom.colors.text.high, whiteSpace: 'nowrap',
}));

const SectionDesc = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize, color: theme.custom.colors.text.medium,
}));

const FormGrid = styled('div')(({ theme }) => ({
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(200px, 1fr))',
    gap: theme.custom.spacing.md,
    '@media (max-width: 600px)': { gridTemplateColumns: '1fr' },
}));

const FormRow = styled('div')({ display: 'flex', flexDirection: 'column', gap: 6 });

const FieldLabel = styled('label')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    fontWeight: 600, color: theme.custom.colors.text.high,
}));

const BusSectionWrapper = styled('section')(({ theme }) => ({
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    borderRadius: theme.custom.borderRadius, overflow: 'hidden',
    backgroundColor: theme.custom.colors.white,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
}));

const BusSectionHeader = styled('div')(({ theme }) => ({
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: theme.custom.spacing.sm,
    padding: `${theme.custom.spacing.sm} ${theme.custom.spacing.md}`,
    backgroundColor: theme.custom.colors.neutral._99,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    '@media (max-width: 480px)': {
        padding: `${theme.custom.spacing.xs} ${theme.custom.spacing.sm}`,
        gap: theme.custom.spacing.xs,
    },
}));

const BusSectionTitle = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.subtitle.fontSize,
    fontWeight: 700, color: theme.custom.colors.text.high, whiteSpace: 'nowrap',
}));

const BusSectionDesc = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize, color: theme.custom.colors.text.medium,
}));

const DaySelectorWrap = styled('div')({
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
    '& > *:last-child': { minWidth: 180 },
    '@media (max-width: 600px)': {
        marginLeft: 0, width: '100%',
        '& > *:last-child': { flex: 1, minWidth: 0, width: 'auto !important' },
    },
});

const DayLabel = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
}));

const BusSectionBody = styled('div')(({ theme }) => ({
    padding: theme.custom.spacing.md, display: 'flex', flexDirection: 'column',
    gap: theme.custom.spacing.sm,
    '@media (max-width: 600px)': { padding: theme.custom.spacing.sm },
}));

const SlotGrid = styled('div')(({ theme }) => ({
    display: 'flex', flexWrap: 'wrap', gap: theme.custom.spacing.sm,
    '@media (max-width: 480px)': { gap: theme.custom.spacing.xs },
}));

const SlotChip = styled('button')<{ $selected: boolean; $none?: boolean }>(({ theme, $selected, $none }) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 20px', borderRadius: 100,
    border: `2px solid ${
        $none
            ? ($selected ? theme.custom.colors.neutral._70 : theme.custom.colors.neutral._80)
            : ($selected ? theme.custom.colors.primary._500 : theme.custom.colors.primary.outline)
    }`,
    backgroundColor: $none
        ? ($selected ? theme.custom.colors.neutral._90 : theme.custom.colors.neutral._99)
        : ($selected ? theme.custom.colors.primary._500 : theme.custom.colors.white),
    color: $none
        ? theme.custom.colors.text.medium
        : ($selected ? theme.custom.colors.white : theme.custom.colors.text.high),
    fontSize: theme.custom.typography.body1.fontSize, fontWeight: $selected ? 600 : 400,
    cursor: 'pointer', transition: theme.custom.transitions.fast, whiteSpace: 'nowrap',
    '@media (max-width: 480px)': {
        padding: '6px 14px', fontSize: theme.custom.typography.body2.fontSize,
    },
    '&:hover': {
        borderColor: $none ? theme.custom.colors.neutral._70 : ($selected ? theme.custom.colors.primary._500 : theme.custom.colors.neutral._40),
        backgroundColor: $none ? theme.custom.colors.neutral._90 : ($selected ? theme.custom.colors.primary._500 : theme.custom.overlay.primary.hover),
    },
}));

const SlotTime = styled('span')<{ $selected: boolean }>(({ $selected }) => ({
    fontSize: 12, opacity: $selected ? 0.85 : 0.55, marginLeft: 6,
}));

const EmptyNote = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize, color: theme.custom.colors.text.medium,
}));

const SubmitRow = styled('div')({
    display: 'flex', justifyContent: 'flex-end',
    '@media (max-width: 600px)': { '& > *': { width: '100%' } },
});

// ─── Component ────────────────────────────────────────────────────────────────

const VehiclePage: React.FC = () => {
    const retreatInfo = MOCK_RETREAT;

    const dayCount = useMemo(
        () => getDayCount(retreatInfo.start_date, retreatInfo.end_date),
        [retreatInfo],
    );

    const dayKeys = useMemo(
        () => (['day1', 'day2', 'day3', 'day4'] as DayKey[]).slice(0, dayCount),
        [dayCount],
    );

    const dayOptions: SelectOption[] = useMemo(
        () => dayKeys.map((dk, i) => ({
            value: dk,
            label: `${DAY_LABELS[dk]}  ${formatShortDate(retreatInfo.start_date, i)}`,
        })),
        [dayKeys, retreatInfo.start_date],
    );

    const availableBusTypes = useMemo(
        () => BUS_TYPE_ORDER.filter((t) => retreatInfo.vehicles[t]),
        [retreatInfo],
    );

    const typeFilterOptions: SelectOption[] = useMemo(() => [
        { value: 'all', label: '전체 보기' },
        ...availableBusTypes.map((t) => ({ value: t, label: BUS_TYPE_META[t].label })),
    ], [availableBusTypes]);

    const [form,        setForm]        = useState<UserForm>(MOCK_HISTORY?.form ?? { gyogu: '', team: '', name: '', phone: '' });
    const [phoneError,  setPhoneError]  = useState(false);
    const [selections,  setSelections]  = useState<VehicleSelections>(MOCK_HISTORY?.selections ?? {});
    const [activeDays,  setActiveDays]  = useState<Record<BusType, DayKey>>({} as Record<BusType, DayKey>);
    const [submitting,  setSubmitting]  = useState(false);
    const [history,     setHistory]     = useState<SubmissionRecord | null>(MOCK_HISTORY);
    const [typeFilter,  setTypeFilter]  = useState<BusType | 'all'>('all');
    const [snackbar,    setSnackbar]    = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    interface ConfirmDialog {
        variant: 'replace' | 'warn-multi';
        pendingType: BusType;
        pendingBus:  BusSlot;
    }
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

    const getActiveDay = useCallback((type: BusType): DayKey =>
        activeDays[type] ?? (dayKeys[0] ?? 'day1'),
    [activeDays, dayKeys]);

    const isFormValid = useMemo(() => (
        form.gyogu !== '' && form.team !== '' &&
        form.name.trim() !== '' && PHONE_REGEX.test(form.phone)
    ), [form]);

    const handleFormChange = useCallback((key: keyof UserForm, value: string | number) => {
        const finalValue = key === 'phone' ? formatPhone(String(value)) : value;
        setForm((prev) => ({ ...prev, [key]: finalValue }));
        if (key === 'phone') setPhoneError(false);
    }, []);

    const handlePhoneBlur = useCallback(() => {
        setPhoneError(form.phone !== '' && !PHONE_REGEX.test(String(form.phone)));
    }, [form.phone]);

    const handleDayChange = useCallback((type: BusType, day: DayKey) => {
        setActiveDays((prev) => ({ ...prev, [type]: day }));
    }, []);

    const handleSlotSelect = useCallback((type: BusType, bus: BusSlot | null) => {
        if (!MULTI_SELECT_TYPES.has(type)) {
            // 후발: 단일 선택
            if (bus === null) {
                setSelections((prev) => ({ ...prev, [type]: null }));
                return;
            }
            const cur = selections[type] as BusSingleSelection | undefined;
            if (cur && cur.bus_id !== bus.bus_id) {
                setConfirmDialog({ variant: 'replace', pendingType: type, pendingBus: bus });
                return;
            }
            const next = cur?.bus_id === bus.bus_id ? null : bus;
            setSelections((prev) => ({ ...prev, [type]: next }));
            return;
        }

        // 픽업/귀경: 다중 선택
        if (bus === null) {
            setSelections((prev) => ({ ...prev, [type]: [] }));
            return;
        }
        const arr = (selections[type] as BusMultiSelections | undefined) ?? [];
        if (arr.some((b) => b.bus_id === bus.bus_id)) {
            setSelections((prev) => ({
                ...prev,
                [type]: (prev[type] as BusMultiSelections ?? []).filter((b) => b.bus_id !== bus.bus_id),
            }));
            return;
        }
        // 같은 날짜에 이미 선택한 버스가 있으면 경고
        const sameDaySelected = arr.some((b) => b.departure_date === bus.departure_date);
        if (sameDaySelected) {
            setConfirmDialog({ variant: 'warn-multi', pendingType: type, pendingBus: bus });
            return;
        }
        setSelections((prev) => ({ ...prev, [type]: [...(prev[type] as BusMultiSelections ?? []), bus] }));
    }, [selections]);

    const handleConfirm = useCallback(() => {
        if (!confirmDialog) return;
        const { variant, pendingType, pendingBus } = confirmDialog;
        setSelections((prev) => {
            if (variant === 'replace') {
                return { ...prev, [pendingType]: pendingBus };
            }
            return { ...prev, [pendingType]: [...(prev[pendingType] as BusMultiSelections ?? []), pendingBus] };
        });
        setConfirmDialog(null);
    }, [confirmDialog]);

    const handleSubmit = useCallback(async () => {
        if (!isFormValid) return;
        setSubmitting(true);
        try {
            // TODO: POST /api/vehicle (bus_id 배열 전송)
            await new Promise((r) => setTimeout(r, 800));
            const submittedAt = new Date().toLocaleString('ko-KR', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true,
            });
            setHistory({ submittedAt, form, selections });
            setSnackbar({ open: true, message: '차량 신청이 완료되었습니다.', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: '제출에 실패했습니다. 다시 시도해 주세요.', severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    }, [isFormValid, form, selections]);

    const closeSnackbar = useCallback(() => setSnackbar((prev) => ({ ...prev, open: false })), []);

    const isSlotSelected = useCallback((type: BusType, bus: BusSlot | null): boolean => {
        const sel = selections[type];
        if (bus === null) {
            if (MULTI_SELECT_TYPES.has(type)) {
                const arr = sel as BusMultiSelections | undefined;
                return !arr || arr.length === 0;
            }
            return sel === null || sel === undefined;
        }
        if (MULTI_SELECT_TYPES.has(type)) {
            return !!(sel as BusMultiSelections | undefined)?.some((b) => b.bus_id === bus.bus_id);
        }
        return (sel as BusSingleSelection | undefined)?.bus_id === bus.bus_id;
    }, [selections]);

    const displayedTypes = useMemo(
        () => typeFilter === 'all' ? availableBusTypes : availableBusTypes.filter((t) => t === typeFilter),
        [availableBusTypes, typeFilter],
    );

    return (
        <PageWrapper>
            <RetreatLabel>{retreatInfo.retreat_name}</RetreatLabel>

            {/* 이전 신청 내역 */}
            {history && (
                <HistorySection>
                    <HistoryHeaderRow>
                        <HistoryTitle>이전 신청 내역</HistoryTitle>
                        <HistoryTimestamp>{history.submittedAt} 신청</HistoryTimestamp>
                    </HistoryHeaderRow>
                    <HistoryVehicleList>
                        {availableBusTypes.map((type) => (
                            <HistoryVehicleItem key={type}>
                                <VehicleTypeBadge>{type}</VehicleTypeBadge>
                                <HistoryVehicleText>
                                    {formatSelectionSummary(type, history.selections[type])}
                                </HistoryVehicleText>
                            </HistoryVehicleItem>
                        ))}
                    </HistoryVehicleList>
                </HistorySection>
            )}

            {/* 차량 유형 선택 */}
            <TypeSelectorPanel>
                <TypeSelectorTitle>어떤 차량을 신청하시나요?</TypeSelectorTitle>
                <TypeSelectorHint>
                    탑승할 차량 유형을 선택하면 해당 버스와 시간대를 확인하고 신청할 수 있습니다.{'\n'}
                    여러 유형을 모두 확인하려면 <strong>전체 보기</strong>를 선택하세요.
                </TypeSelectorHint>
                <Select
                    size="small"
                    value={typeFilter}
                    options={typeFilterOptions}
                    onChange={(v) => {
                        const val = Array.isArray(v) ? v[0] : v;
                        setTypeFilter(val as BusType | 'all');
                    }}
                    fullWidth
                />
            </TypeSelectorPanel>

            {/* 내 정보 */}
            <FormSection>
                <SectionTitleRow>
                    <SectionTitle>내 정보</SectionTitle>
                    <SectionDesc>교구·팀·이름·전화번호를 정확히 입력해 주세요.</SectionDesc>
                </SectionTitleRow>
                <FormGrid>
                    <FormRow>
                        <FieldLabel>교구</FieldLabel>
                        <Select size="small" value={form.gyogu} options={GYOGU_OPTIONS} fullWidth
                            onChange={(v) => handleFormChange('gyogu', Array.isArray(v) ? v[0] : v)} />
                    </FormRow>
                    <FormRow>
                        <FieldLabel>팀</FieldLabel>
                        <Select size="small" value={form.team} options={TEAM_OPTIONS} fullWidth
                            onChange={(v) => handleFormChange('team', Array.isArray(v) ? v[0] : v)} />
                    </FormRow>
                    <FormRow>
                        <FieldLabel>이름</FieldLabel>
                        <TextField size="small" placeholder="이름을 입력해 주세요" value={form.name} fullWidth
                            onChange={(e) => handleFormChange('name', e.target.value)} />
                    </FormRow>
                    <FormRow>
                        <FieldLabel>전화번호</FieldLabel>
                        <TextField
                            size="small" placeholder="010-0000-0000" value={form.phone} fullWidth
                            error={phoneError}
                            helperText={phoneError ? '010-0000-0000 형식으로 입력해 주세요' : undefined}
                            onChange={(e) => handleFormChange('phone', e.target.value)}
                            onBlur={handlePhoneBlur}
                        />
                    </FormRow>
                </FormGrid>
            </FormSection>

            {/* 버스 타입별 섹션 */}
            {displayedTypes.map((type) => {
                const meta      = BUS_TYPE_META[type];
                const activeDay = getActiveDay(type);
                const buses     = retreatInfo.vehicles[type]?.[activeDay]?.buses ?? [];

                // 해당 유형에 버스가 있는 날짜만 드롭다운에 표시
                const typeVehicle = retreatInfo.vehicles[type] ?? {};
                const availDayOptions = dayKeys
                    .filter((dk) => (typeVehicle[dk]?.buses?.length ?? 0) > 0)
                    .map((dk, idx) => dayOptions.find((o) => o.value === dk) ?? { value: dk, label: `${idx + 1}일차` });

                return (
                    <BusSectionWrapper key={type}>
                        <BusSectionHeader>
                            <BusSectionTitle>{meta.label}</BusSectionTitle>
                            <BusSectionDesc>{meta.desc}</BusSectionDesc>
                            <DaySelectorWrap>
                                <DayLabel>날짜</DayLabel>
                                <Select
                                    size="small"
                                    value={activeDay}
                                    options={availDayOptions.length > 0 ? availDayOptions : dayOptions}
                                    onChange={(v) => handleDayChange(type, v as DayKey)}
                                />
                            </DaySelectorWrap>
                        </BusSectionHeader>
                        <BusSectionBody>
                            <SlotGrid>
                                <SlotChip
                                    $selected={isSlotSelected(type, null)}
                                    $none
                                    onClick={() => handleSlotSelect(type, null)}
                                >
                                    신청 안 함
                                </SlotChip>
                                {buses.length > 0 ? buses.map((bus) => (
                                    <SlotChip
                                        key={bus.bus_id}
                                        $selected={isSlotSelected(type, bus)}
                                        onClick={() => handleSlotSelect(type, bus)}
                                    >
                                        {bus.bus_name}
                                        <SlotTime $selected={isSlotSelected(type, bus)}>
                                            {formatTime12h(bus.departure_time)}
                                        </SlotTime>
                                    </SlotChip>
                                )) : (
                                    <EmptyNote>해당 날짜에 운행하는 차량이 없습니다.</EmptyNote>
                                )}
                            </SlotGrid>
                        </BusSectionBody>
                    </BusSectionWrapper>
                );
            })}

            {/* 제출 버튼 */}
            <SubmitRow>
                <Button variant="filled" onClick={handleSubmit} disabled={!isFormValid || submitting}>
                    {submitting ? '제출 중...' : '제출하기'}
                </Button>
            </SubmitRow>

            {/* 확인 다이얼로그 */}
            <Dialog
                open={confirmDialog !== null}
                onClose={() => setConfirmDialog(null)}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 300, maxWidth: 440 } }}
            >
                <DialogTitle sx={{ fontSize: '18px', fontWeight: 700, pb: 1 }}>
                    {confirmDialog?.variant === 'replace' ? '차량 변경 확인' : '다중 차량 선택 안내'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.87)', lineHeight: '1.6' }}>
                        {confirmDialog?.variant === 'replace'
                            ? `이미 선택한 후발 차량이 있습니다.\n${confirmDialog.pendingBus.bus_name}으로 변경하면 기존 차량은 취소됩니다.`
                            : '같은 날 여러 차량을 신청하면 다른 사람이 탑승하지 못할 수 있습니다.\n실제로 탑승하는 경우에만 다중 선택해 주세요.'}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setConfirmDialog(null)}>취소</Button>
                    <Button variant="filled" onClick={handleConfirm}>
                        {confirmDialog?.variant === 'replace' ? '변경' : '선택 계속'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 스낵바 */}
            <Snackbar
                open={snackbar.open} autoHideDuration={3000} onClose={closeSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </PageWrapper>
    );
};

export default VehiclePage;
