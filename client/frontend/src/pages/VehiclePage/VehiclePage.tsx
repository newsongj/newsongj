import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar } from '@mui/material';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import type { SelectOption } from '@components/common/Select';
import type {
    BusSlot, BusType, DayKey, VehicleRetreatInfo, VehicleSelections,
    BusSingleSelection, BusMultiSelections,
} from '@models/vehicle.types';
import type { BusInfo } from '@models/research.types';
import { fetchRetreatInfo, fetchVehicleMy, submitVehicle } from '@api/retreat';
import type { VehicleMyResponse } from '@api/retreat';

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const BUS_TYPE_ORDER: BusType[] = ['후발', '픽업', '귀경'];

const MULTI_SELECT_TYPES = new Set<BusType>(['후발', '픽업', '귀경']);

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

const formatTime12h = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const period = h < 12 ? '오전' : '오후';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${period} ${hour12}:${m.toString().padStart(2, '0')}`;
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
        Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000),
        4,
    );

const getDayIndexFromDate = (startDate: string, targetDate: string): number =>
    Math.round((new Date(targetDate).getTime() - new Date(startDate).getTime()) / 86400000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getBusType = (busName: string): BusType | null => {
    if (busName.startsWith('후발')) return '후발';
    if (busName.startsWith('픽업')) return '픽업';
    if (busName.startsWith('귀경')) return '귀경';
    return null;
};

const buildVehicleRetreatInfo = (
    retreat: { retreat_id: number; retreat_name: string; start_date: string; end_date: string },
    buses: BusInfo[],
): VehicleRetreatInfo => {
    const vehicles: VehicleRetreatInfo['vehicles'] = {};
    for (const bus of buses) {
        const busType = getBusType(bus.bus_name);
        if (!busType) continue;
        const dayIdx = getDayIndexFromDate(retreat.start_date, bus.departure_date);
        const dayKey = `day${dayIdx + 1}` as DayKey;
        if (!vehicles[busType]) vehicles[busType] = {};
        if (!vehicles[busType]![dayKey]) vehicles[busType]![dayKey] = { buses: [] };
        vehicles[busType]![dayKey]!.buses.push({
            bus_id: bus.bus_id,
            bus_name: bus.bus_name,
            departure_time: bus.departure_time,
            departure_date: bus.departure_date,
        });
    }
    return {
        retreat_custom_id: retreat.retreat_id,
        retreat_name: retreat.retreat_name,
        start_date: retreat.start_date,
        end_date: retreat.end_date,
        vehicles,
    };
};

const buildSelectionsFromIds = (
    vehicleData: VehicleMyResponse,
    buses: BusInfo[],
): VehicleSelections => {
    const busById = new Map(buses.map((b) => [b.bus_id, b]));
    const selections: VehicleSelections = {};
    const allIds = [
        ...vehicleData.day1_bus,
        ...vehicleData.day2_bus,
        ...vehicleData.day3_bus,
        ...vehicleData.day4_bus,
    ];
    for (const busId of allIds) {
        const bus = busById.get(busId);
        if (!bus) continue;
        const busType = getBusType(bus.bus_name);
        if (!busType) continue;
        const slot: BusSlot = {
            bus_id: bus.bus_id,
            bus_name: bus.bus_name,
            departure_time: bus.departure_time,
            departure_date: bus.departure_date,
        };
        selections[busType] = [...((selections[busType] as BusMultiSelections) ?? []), slot];
    }
    return selections;
};

const buildSubmitBody = (
    selections: VehicleSelections,
    startDate: string,
) => {
    const dayBusIds: number[][] = [[], [], [], []];
    for (const [type, sel] of Object.entries(selections)) {
        if (!MULTI_SELECT_TYPES.has(type as BusType)) {
            const bus = sel as unknown as BusSingleSelection;
            if (bus) {
                const idx = getDayIndexFromDate(startDate, bus.departure_date);
                if (idx >= 0 && idx < 4) dayBusIds[idx].push(bus.bus_id);
            }
        } else {
            for (const bus of (sel as BusMultiSelections) ?? []) {
                const idx = getDayIndexFromDate(startDate, bus.departure_date);
                if (idx >= 0 && idx < 4) dayBusIds[idx].push(bus.bus_id);
            }
        }
    }
    return {
        day1_bus: dayBusIds[0],
        day2_bus: dayBusIds[1],
        day3_bus: dayBusIds[2],
        day4_bus: dayBusIds[3],
    };
};

const formatSubmittedAt = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
    });

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserForm { gyogu: string | number; team: string | number; name: string; phone: string; }

interface SubmissionRecord {
    submittedAt: string;
    selections: VehicleSelections;
}

// ─── Helpers (선택 내역 요약) ─────────────────────────────────────────────────

const formatBusDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}(${DAYS_KR[d.getDay()]})`;
};

const formatSelectionSummary = (type: BusType, sel: BusSingleSelection | BusMultiSelections | null | undefined): string => {
    if (!sel) return '신청 안 함';
    if (!MULTI_SELECT_TYPES.has(type)) {
        const s = sel as BusSingleSelection;
        if (!s) return '신청 안 함';
        return `${formatBusDate(s.departure_date)} ${s.bus_name} ${formatTime12h(s.departure_time)}`;
    }
    const arr = sel as BusMultiSelections;
    if (!arr || arr.length === 0) return '신청 안 함';
    return arr.map((b) => `${formatBusDate(b.departure_date)} ${b.bus_name} ${formatTime12h(b.departure_time)}`).join('\n');
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
    display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.lg,
    '@media (max-width: 600px)': { gap: theme.custom.spacing.md },
}));

const RetreatLabel = styled('p')(({ theme }) => ({
    margin: 0, fontSize: 18, fontWeight: 700,
    textAlign: 'center', color: theme.custom.colors.primary._900,
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
    display: 'flex', alignItems: 'flex-start', gap: theme.custom.spacing.sm,
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
    whiteSpace: 'pre-line', lineHeight: 1.8,
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

const FieldValue = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body1.fontSize,
    color: theme.custom.colors.text.high,
    padding: '6px 0',
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
    '@media (max-width: 480px)': {
        flexDirection: 'column', gap: theme.custom.spacing.xs,
    },
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
        width: '100%',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderRadius: theme.custom.borderRadius,
        fontSize: theme.custom.typography.body2.fontSize,
    },
    '&:hover': {
        borderColor: $none ? theme.custom.colors.neutral._70 : ($selected ? theme.custom.colors.primary._500 : theme.custom.colors.neutral._40),
        backgroundColor: $none ? theme.custom.colors.neutral._90 : ($selected ? theme.custom.colors.primary._500 : theme.custom.overlay.primary.hover),
    },
}));

const SlotTime = styled('span')<{ $selected: boolean }>(({ $selected }) => ({
    fontSize: 12, opacity: $selected ? 0.85 : 0.55, marginLeft: 6,
    '@media (max-width: 480px)': { marginLeft: 0, fontSize: 13 },
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
    const [retreatInfo, setRetreatInfo] = useState<VehicleRetreatInfo | null>(null);
    const [form,        setForm]        = useState<UserForm>({ gyogu: '', team: '', name: '', phone: '' });
    const [loading,     setLoading]     = useState(true);
    const [loadError,   setLoadError]   = useState<string | null>(null);
    const [noRetreat,   setNoRetreat]   = useState(false);
    const [selections,  setSelections]  = useState<VehicleSelections>({});
    const [activeDays,  setActiveDays]  = useState<Record<BusType, DayKey>>({} as Record<BusType, DayKey>);
    const [submitting,  setSubmitting]  = useState(false);
    const [history,     setHistory]     = useState<SubmissionRecord | null>(null);
    const [typeFilter,  setTypeFilter]  = useState<BusType | 'all'>('all');
    const [snackbar,    setSnackbar]    = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    interface ConfirmDialog {
        variant:     string;
        pendingType: BusType;
        pendingBus:  BusSlot;
    }
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [retreat, vehicleMy] = await Promise.all([
                    fetchRetreatInfo(),
                    fetchVehicleMy(),
                ]);

                const builtInfo = buildVehicleRetreatInfo(retreat, retreat.buses);
                setRetreatInfo(builtInfo);
                document.title = `${retreat.retreat_name} 차량조사`;

                setForm({
                    gyogu: vehicleMy.gyogu ?? '',
                    team:  vehicleMy.team ?? '',
                    name:  vehicleMy.name,
                    phone: vehicleMy.phone ?? '',
                });

                const sel = buildSelectionsFromIds(vehicleMy, retreat.buses);
                setSelections(sel);

                const hasSelections = (
                    vehicleMy.day1_bus.length + vehicleMy.day2_bus.length +
                    vehicleMy.day3_bus.length + vehicleMy.day4_bus.length
                ) > 0;

                if (vehicleMy.submitted_at && hasSelections) {
                    setHistory({
                        submittedAt: formatSubmittedAt(vehicleMy.submitted_at),
                        selections: sel,
                    });
                }
            } catch (err: any) {
                if (err?.response?.data?.detail === '활성 수련회가 없습니다.') {
                    setNoRetreat(true);
                } else {
                    setLoadError('데이터를 불러오지 못했습니다.');
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const dayCount = useMemo(() => {
        if (!retreatInfo) return 0;
        const fromDates = getDayCount(retreatInfo.start_date, retreatInfo.end_date);
        // 실제 버스 데이터에서 최대 일차 계산 (날짜 범위보다 더 넓을 수 있음)
        let fromBuses = 0;
        for (const typeVehicles of Object.values(retreatInfo.vehicles)) {
            for (const dk of Object.keys(typeVehicles ?? {})) {
                const dayNum = parseInt(dk.replace('day', ''), 10);
                if (!isNaN(dayNum)) fromBuses = Math.max(fromBuses, dayNum);
            }
        }
        return Math.min(Math.max(fromDates, fromBuses), 4);
    }, [retreatInfo]);

    const dayKeys = useMemo(
        () => (['day1', 'day2', 'day3', 'day4'] as DayKey[]).slice(0, dayCount),
        [dayCount],
    );

    const dayOptions: SelectOption[] = useMemo(
        () => dayKeys.map((dk, i) => ({
            value: dk,
            label: `${DAY_LABELS[dk]}  ${retreatInfo ? formatShortDate(retreatInfo.start_date, i) : ''}`,
        })),
        [dayKeys, retreatInfo],
    );

    const availableBusTypes = useMemo(
        () => retreatInfo ? BUS_TYPE_ORDER.filter((t) => retreatInfo.vehicles[t]) : [],
        [retreatInfo],
    );

    const typeFilterOptions: SelectOption[] = useMemo(() => [
        { value: 'all', label: '전체 보기' },
        ...availableBusTypes.map((t) => ({ value: t, label: BUS_TYPE_META[t].label })),
    ], [availableBusTypes]);

    const getActiveDay = useCallback((type: BusType): DayKey =>
        activeDays[type] ?? (dayKeys[0] ?? 'day1'),
    [activeDays, dayKeys]);

    const handleDayChange = useCallback((type: BusType, day: DayKey) => {
        setActiveDays((prev) => ({ ...prev, [type]: day }));
    }, []);

    const handleSlotSelect = useCallback((type: BusType, bus: BusSlot | null) => {
        if (bus === null) {
            setSelections((prev) => ({ ...prev, [type]: [] }));
            return;
        }

        const arr = (selections[type] as BusMultiSelections | undefined) ?? [];

        // 이미 선택된 버스 → 토글 해제
        if (arr.some((b) => b.bus_id === bus.bus_id)) {
            setSelections((prev) => ({
                ...prev,
                [type]: (prev[type] as BusMultiSelections ?? []).filter((b) => b.bus_id !== bus.bus_id),
            }));
            return;
        }

        const sameDayIdx = arr.findIndex((b) => b.departure_date === bus.departure_date);

        if (type === '후발') {
            // 후발: 같은 날 이미 선택 → 팝업 없이 자동 교체
            if (sameDayIdx !== -1) {
                setSelections((prev) => ({
                    ...prev,
                    [type]: (prev[type] as BusMultiSelections ?? []).map((b, i) => i === sameDayIdx ? bus : b),
                }));
            } else {
                setSelections((prev) => ({ ...prev, [type]: [...arr, bus] }));
            }
            return;
        }

        // 픽업/귀경: 같은 날 이미 선택 → 경고 팝업
        if (sameDayIdx !== -1) {
            setConfirmDialog({ variant: 'warn-multi', pendingType: type, pendingBus: bus });
            return;
        }
        setSelections((prev) => ({ ...prev, [type]: [...arr, bus] }));
    }, [selections]);

    const handleConfirm = useCallback(() => {
        if (!confirmDialog) return;
        const { pendingType, pendingBus } = confirmDialog;
        setSelections((prev) => ({
            ...prev,
            [pendingType]: [...(prev[pendingType] as BusMultiSelections ?? []), pendingBus],
        }));
        setConfirmDialog(null);
    }, [confirmDialog]);

    const handleSubmit = useCallback(async () => {
        if (!retreatInfo) return;
        setSubmitting(true);
        try {
            const body = buildSubmitBody(selections, retreatInfo.start_date);
            await submitVehicle(body);
            const submittedAt = new Date().toLocaleString('ko-KR', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true,
            });
            setHistory({ submittedAt, selections });
            setSnackbar({ open: true, message: '차량 신청이 완료되었습니다.', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: '제출에 실패했습니다. 다시 시도해 주세요.', severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    }, [retreatInfo, selections]);

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

    if (loading) {
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
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {loadError ?? '데이터를 불러오지 못했습니다.'}
            </Alert>
        );
    }

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
                    <SectionDesc>계정에 연결된 정보입니다.</SectionDesc>
                </SectionTitleRow>
                <FormGrid>
                    <FormRow>
                        <FieldLabel>교구</FieldLabel>
                        <FieldValue>{form.gyogu ? `${form.gyogu}교구` : '-'}</FieldValue>
                    </FormRow>
                    <FormRow>
                        <FieldLabel>팀</FieldLabel>
                        <FieldValue>{form.team ? `${form.team}팀` : '-'}</FieldValue>
                    </FormRow>
                    <FormRow>
                        <FieldLabel>이름</FieldLabel>
                        <FieldValue>{form.name || '-'}</FieldValue>
                    </FormRow>
                    <FormRow>
                        <FieldLabel>전화번호</FieldLabel>
                        <FieldValue>{form.phone || '-'}</FieldValue>
                    </FormRow>
                </FormGrid>
            </FormSection>

            {/* 버스 타입별 섹션 */}
            {displayedTypes.map((type) => {
                const meta      = BUS_TYPE_META[type];
                const activeDay = getActiveDay(type);
                const buses     = retreatInfo.vehicles[type]?.[activeDay]?.buses ?? [];

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
                <Button variant="filled" onClick={handleSubmit} disabled={submitting}>
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
                    다중 차량 선택 안내
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.87)', lineHeight: '1.6' }}>
                        같은 날 여러 차량을 신청하면 다른 사람이 탑승하지 못할 수 있습니다.<br />
                        실제로 탑승하는 경우에만 다중 선택해 주세요.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button variant="outlined" onClick={() => setConfirmDialog(null)}>취소</Button>
                    <Button variant="filled" onClick={handleConfirm}>선택 계속</Button>
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
