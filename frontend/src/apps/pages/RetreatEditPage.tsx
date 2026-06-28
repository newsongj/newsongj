import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { IconButton, Skeleton } from '@mui/material';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { Snackbar } from '@components/common/Snackbar';
import { BaseModal } from '@components/common/BaseModal';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { getActiveRetreat, updateRetreat, createBus, deleteBus, completeRetreat } from '@/api/retreat';
import { BusResponse } from '@/models/retreat.types';

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface LocalBus {
  localId: string;
  bus_id?: number;       // 서버에서 불러온 기존 버스
  bus_name: string;
  departure_date: string;
  departure_time: string;
  seat_count: string;
  departure_place: string;
  arrival_place: string;
}

interface BasicForm {
  retreatName: string;
  startDate: string;
  endDate: string;
  busFare: string;
  lodgingFare: string;
  mealPrice: string;
  suspendedMealCount: string;
}

const DEFAULT_BUS: Omit<LocalBus, 'localId'> = {
  bus_name: '', departure_date: '', departure_time: '',
  seat_count: '', departure_place: '', arrival_place: '',
};

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

let _id = 0;
const nextId = () => `e${++_id}`;

const fmtCurrency = (v: string) => {
  const d = v.replace(/[^\d]/g, '');
  return d ? Number(d).toLocaleString('ko-KR') : '';
};
const parseCurrency = (v: string) => v.replace(/[^\d]/g, '');

const getDayLabel = (date: string, startDate: string) => {
  if (!startDate || !date) return date || '—';
  const diff = Math.round((new Date(date).getTime() - new Date(startDate).getTime()) / 86400000);
  return `${diff + 1}일차 (${date.slice(5).replace('-', '/')})`;
};

const BUS_STYLE: Record<string, { color: string; bg: string }> = {
  '후발': { color: '#2563eb', bg: '#eff6ff' },
  '픽업': { color: '#d97706', bg: '#fef3c7' },
  '귀경': { color: '#7c3aed', bg: '#f5f3ff' },
};

const getBusStyle = (name: string) => {
  for (const [p, s] of Object.entries(BUS_STYLE)) if (name.startsWith(p)) return s;
  return { color: '#595959', bg: '#f5f5f5' };
};

const serverBusToLocal = (b: BusResponse): LocalBus => ({
  localId: nextId(),
  bus_id: b.bus_id,
  bus_name: b.bus_name,
  departure_date: b.departure_date,
  departure_time: b.departure_time,
  seat_count: String(b.seat_count),
  departure_place: b.departure_place,
  arrival_place: b.arrival_place,
});

const sortBuses = (buses: LocalBus[]) =>
  [...buses].sort((a, b) =>
    a.departure_date !== b.departure_date
      ? a.departure_date.localeCompare(b.departure_date)
      : a.departure_time.localeCompare(b.departure_time)
  );

// ── Styled ────────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.lg,
}));

const FormSection = styled('section')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg,
  backgroundColor: theme.custom.colors.neutral._99,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
  '@media (max-width: 600px)': { padding: theme.custom.spacing.md },
}));

const SectionTitle = styled('h3')(({ theme }) => ({
  margin: 0,
  fontSize: theme.custom.typography.subtitle.fontSize,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
}));

const FormGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))',
  gap: theme.custom.spacing.md,
  '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
}));

const InputsCard = styled('div')(({ theme }) => ({
  padding: theme.custom.spacing.md,
  backgroundColor: theme.custom.colors.white,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
}));

const BusTableScroll = styled('div')({
  overflowX: 'auto', WebkitOverflowScrolling: 'touch',
});

const BusTable = styled('table')(({ theme }) => ({
  width: '100%', minWidth: 640, borderCollapse: 'collapse',
  fontSize: theme.custom.typography.body2.fontSize,
  '& th, & td': {
    padding: `${theme.custom.spacing.xs} ${theme.custom.spacing.sm}`,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    whiteSpace: 'nowrap', textAlign: 'left',
  },
  '& th': { color: theme.custom.colors.text.medium, fontWeight: 500, background: theme.custom.colors.neutral._99 },
  '& tbody tr:hover': { background: theme.custom.overlay.primary.hover },
}));

const BusTypeBadge = styled('span')<{ $color: string; $bg: string }>(({ $color, $bg }) => ({
  display: 'inline-block', padding: '1px 8px', borderRadius: 999,
  fontSize: 11, fontWeight: 600, color: $color, background: $bg,
}));

const EmptyHint = styled('div')(({ theme }) => ({
  padding: `${theme.custom.spacing.lg} 0`,
  textAlign: 'center',
  color: theme.custom.colors.text.disabled,
  fontSize: theme.custom.typography.body2.fontSize,
}));

const BusAddRow = styled('div')({
  display: 'flex', justifyContent: 'flex-end', marginTop: 8,
});

const DeleteIconButton = styled(IconButton)(({ theme }) => ({
  width: 32, height: 32,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: '100px', color: theme.custom.colors.primary._500,
  '& svg': { width: 16, height: 16 },
  '&:hover': { backgroundColor: 'rgba(24,126,244,0.08)' },
}));

const ModalBody = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg, width: '100%', maxWidth: 520, minWidth: 0,
  margin: '0 auto', boxSizing: 'border-box',
}));

const ModalGrid = styled('div')(({ theme }) => ({
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.custom.spacing.md,
  '@media (max-width: 560px)': { gridTemplateColumns: '1fr' },
}));

const ModalActions = styled('div')({
  display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
  '@media (max-width: 480px)': { '& > *': { width: '100%' } },
});

const SummaryCard = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.sm,
  padding: theme.custom.spacing.md,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius, backgroundColor: '#fff',
}));

const SummaryItem = styled('div')({
  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16,
  '@media (max-width: 480px)': { flexDirection: 'column', gap: 2 },
});

const SummaryLabel = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
  '@media (max-width: 480px)': { fontSize: theme.custom.typography.body2.fontSize },
}));

const SummaryValue = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.high, fontWeight: 600,
  textAlign: 'right', wordBreak: 'break-word',
  '@media (max-width: 480px)': { fontSize: theme.custom.typography.body2.fontSize, textAlign: 'left' },
}));

const FooterActions = styled('div')(({ theme }) => ({
  display: 'flex', justifyContent: 'flex-end', gap: theme.custom.spacing.sm,
}));

const EmptyStateWrapper = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: theme.custom.spacing.lg,
  padding: `${theme.custom.spacing.xl} ${theme.custom.spacing.lg}`,
  minHeight: 320,
  backgroundColor: theme.custom.colors.neutral._99,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
}));

const EmptyStateText = styled('p')(({ theme }) => ({
  margin: 0,
  fontSize: theme.custom.typography.subtitle.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.medium,
  textAlign: 'center',
}));

// ── Component ─────────────────────────────────────────────────────────────────

const RetreatEditPage: React.FC = () => {
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [retreatId, setRetreatId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [noActiveRetreat, setNoActiveRetreat] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [form, setForm] = useState<BasicForm>({
    retreatName: '', startDate: '', endDate: '',
    busFare: '', lodgingFare: '', mealPrice: '', suspendedMealCount: '',
  });
  const [buses, setBuses] = useState<LocalBus[]>([]);
  const [deletedBusIds, setDeletedBusIds] = useState<number[]>([]);
  const [original, setOriginal] = useState<{ form: BasicForm; buses: LocalBus[] } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [busModal, setBusModal] = useState<Omit<LocalBus, 'localId'>>(DEFAULT_BUS);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await getActiveRetreat();
        const loadedForm: BasicForm = {
          retreatName: r.retreat_name,
          startDate: r.start_date,
          endDate: r.end_date,
          busFare: r.fee_with_bus.toLocaleString('ko-KR'),
          lodgingFare: r.fee_without_bus.toLocaleString('ko-KR'),
          mealPrice: r.meal_price.toLocaleString('ko-KR'),
          suspendedMealCount: String(r.suspended_meal_count),
        };
        const loadedBuses = sortBuses(r.buses.map(serverBusToLocal));
        setRetreatId(r.retreat_id);
        setForm(loadedForm);
        setBuses(loadedBuses);
        setOriginal({ form: loadedForm, buses: loadedBuses });
      } catch (e: any) {
        if (e?.status === 404) {
          setNoActiveRetreat(true);
        } else {
          showSnackbar(e?.message || '수련회 정보를 불러오지 못했습니다.', 'error');
        }
      } finally {
        setPageLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (field: keyof BasicForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const updateCurrency = (field: 'busFare' | 'lodgingFare' | 'mealPrice', value: string) =>
    setForm((p) => ({ ...p, [field]: fmtCurrency(value) }));

  const dayOptions = useMemo(() => {
    if (!form.startDate || !form.endDate) return null;
    const opts = [];
    const cur = new Date(form.startDate);
    const end = new Date(form.endDate);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      opts.push({ value: dateStr, label: getDayLabel(dateStr, form.startDate) });
      cur.setDate(cur.getDate() + 1);
    }
    return opts;
  }, [form.startDate, form.endDate]);

  const openModal = () => {
    setBusModal({ ...DEFAULT_BUS, departure_date: form.startDate || '' });
    setModalError('');
    setModalOpen(true);
  };

  const handleAddBus = () => {
    const { bus_name, departure_date, departure_time, seat_count, departure_place, arrival_place } = busModal;
    if (!bus_name.trim() || !departure_date || !departure_time || !seat_count || !departure_place.trim() || !arrival_place.trim()) {
      setModalError('모든 항목을 입력해주세요.');
      return;
    }
    setBuses((p) => sortBuses([...p, { ...busModal, bus_name: bus_name.trim(), localId: nextId() }]));
    setModalOpen(false);
  };

  const removeBus = (bus: LocalBus) => {
    setBuses((p) => p.filter((b) => b.localId !== bus.localId));
    if (bus.bus_id !== undefined) {
      setDeletedBusIds((p) => [...p, bus.bus_id!]);
    }
  };

  const handleReset = () => {
    if (original) {
      setForm(original.form);
      setBuses(original.buses);
      setDeletedBusIds([]);
    }
  };

  const summary = useMemo(() => {
    const byType: Record<string, number> = {};
    buses.forEach((b) => {
      const type = ['후발', '픽업', '귀경'].find((t) => b.bus_name.startsWith(t)) ?? '기타';
      byType[type] = (byType[type] ?? 0) + 1;
    });
    const breakdown = Object.entries(byType).map(([t, n]) => `${t} ${n}대`).join(', ');
    return {
      retreatName: form.retreatName || '—',
      period: form.startDate && form.endDate ? `${form.startDate} ~ ${form.endDate}` : '—',
      busFare: form.busFare ? `${form.busFare}원` : '—',
      lodgingFare: form.lodgingFare ? `${form.lodgingFare}원` : '—',
      mealPrice: form.mealPrice ? `${form.mealPrice}원` : '—',
      suspendedMealCount: form.suspendedMealCount ? `${form.suspendedMealCount}끼` : '—',
      buses: buses.length > 0 ? `${buses.length}대 (${breakdown})` : '—',
      deletedCount: deletedBusIds.length,
    };
  }, [form, buses, deletedBusIds]);

  const handleComplete = async () => {
    if (!retreatId) return;
    setConfirmCompleteOpen(false);
    setIsSaving(true);
    try {
      await completeRetreat(retreatId);
      setNoActiveRetreat(true);
      showSnackbar('수련회가 완료 처리되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e?.message || '완료 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!retreatId) return;
    setIsSaving(true);
    try {
      await updateRetreat(retreatId, {
        retreat_name: form.retreatName,
        start_date: form.startDate,
        end_date: form.endDate,
        fee_with_bus: Number(parseCurrency(form.busFare) || 0),
        fee_without_bus: Number(parseCurrency(form.lodgingFare) || 0),
        meal_price: Number(parseCurrency(form.mealPrice) || 0),
        suspended_meal_count: Number(form.suspendedMealCount || 0),
      });
      await Promise.all(deletedBusIds.map((id) => deleteBus(id)));
      await Promise.all(
        buses
          .filter((b) => b.bus_id === undefined)
          .map((b) =>
            createBus({
              bus_name: b.bus_name,
              seat_count: Number(b.seat_count),
              departure_date: b.departure_date,
              departure_time: b.departure_time,
              departure_place: b.departure_place,
              arrival_place: b.arrival_place,
            })
          )
      );
      // 저장 후 최신 데이터로 갱신
      const r = await getActiveRetreat();
      const refreshedForm: BasicForm = {
        retreatName: r.retreat_name,
        startDate: r.start_date,
        endDate: r.end_date,
        busFare: r.fee_with_bus.toLocaleString('ko-KR'),
        lodgingFare: r.fee_without_bus.toLocaleString('ko-KR'),
        mealPrice: r.meal_price.toLocaleString('ko-KR'),
        suspendedMealCount: String(r.suspended_meal_count),
      };
      const refreshedBuses = sortBuses(r.buses.map(serverBusToLocal));
      setForm(refreshedForm);
      setBuses(refreshedBuses);
      setDeletedBusIds([]);
      setOriginal({ form: refreshedForm, buses: refreshedBuses });
      showSnackbar('수련회 설정이 수정되었습니다.', 'success');
    } catch (e: any) {
      showSnackbar(e?.message || '저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <PageWrapper>
        <FormSection>
          <Skeleton variant="text" width={160} height={28} />
          <FormGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={56} />
            ))}
          </FormGrid>
        </FormSection>
        <FormSection>
          <Skeleton variant="text" width={120} height={28} />
          <Skeleton variant="rounded" height={120} />
        </FormSection>
      </PageWrapper>
    );
  }

  if (noActiveRetreat) {
    return (
      <PageWrapper>
        <EmptyStateWrapper>
          <EmptyStateText>진행 중인 수련회가 없습니다.</EmptyStateText>
          <Button variant="filled" onClick={() => navigate('/retreat/create')}>
            수련회 생성 바로가기
          </Button>
        </EmptyStateWrapper>
        <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* 기본 정보 */}
      <FormSection>
        <SectionTitle>기본 정보 수정</SectionTitle>
        <InputsCard>
          <FormGrid>
            <div style={{ gridColumn: '1 / -1' }}>
              <TextField label="수련회 주제명" value={form.retreatName}
                onChange={(e) => updateField('retreatName', e.target.value)} fullWidth />
            </div>
            <TextField id="retreat-edit-start-date" label="수련회 시작일" type="date"
              value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)}
              disableAnimation fullWidth />
            <TextField id="retreat-edit-end-date" label="수련회 종료일" type="date"
              value={form.endDate} min={form.startDate || undefined}
              onChange={(e) => updateField('endDate', e.target.value)} disableAnimation fullWidth />
            <TextField label="버스 탑승 회비" value={form.busFare}
              onChange={(e) => updateCurrency('busFare', e.target.value)}
              placeholder="예: 35,000" fullWidth />
            <TextField label="버스 미탑승 + 숙박 가격" value={form.lodgingFare}
              onChange={(e) => updateCurrency('lodgingFare', e.target.value)}
              placeholder="예: 20,000" fullWidth />
            <TextField label="한 끼 가격" value={form.mealPrice}
              onChange={(e) => updateCurrency('mealPrice', e.target.value)}
              placeholder="예: 7,000" fullWidth />
            <TextField label="총 끼니 수" type="number" min="0"
              value={form.suspendedMealCount}
              onChange={(e) => updateField('suspendedMealCount', e.target.value.replace(/[^\d]/g, ''))}
              placeholder="예: 5" fullWidth />
          </FormGrid>
        </InputsCard>
      </FormSection>

      {/* 버스 설정 */}
      <FormSection>
        <SectionTitle>버스 설정</SectionTitle>
        <BusTableScroll>
          <BusTable>
            <thead>
              <tr>
                <th>버스 이름</th>
                <th>일자</th>
                <th>출발 시간</th>
                <th>좌석 수</th>
                <th>출발지 → 도착지</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {buses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <EmptyHint>등록된 버스가 없습니다. 아래 버튼으로 추가하세요.</EmptyHint>
                  </td>
                </tr>
              ) : (
                buses.map((bus) => {
                  const { color, bg } = getBusStyle(bus.bus_name);
                  const isNew = bus.bus_id === undefined;
                  return (
                    <tr key={bus.localId}>
                      <td>
                        <BusTypeBadge $color={color} $bg={bg}>{bus.bus_name}</BusTypeBadge>
                        {isNew && (
                          <span style={{ marginLeft: 4, fontSize: 10, color: '#d97706', fontWeight: 600 }}>NEW</span>
                        )}
                      </td>
                      <td>{getDayLabel(bus.departure_date, form.startDate)}</td>
                      <td>{bus.departure_time}</td>
                      <td>{bus.seat_count}석</td>
                      <td>{bus.departure_place} → {bus.arrival_place}</td>
                      <td>
                        <DeleteIconButton onClick={() => removeBus(bus)}>
                          <DeleteIcon />
                        </DeleteIconButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </BusTable>
        </BusTableScroll>
        <BusAddRow>
          <Button variant="elevated" onClick={openModal} showIcon icon={<AddIcon />}>
            버스 추가
          </Button>
        </BusAddRow>
      </FormSection>

      {/* 요약 */}
      <FormSection>
        <SectionTitle>변경 내용 미리보기</SectionTitle>
        <SummaryCard>
          <SummaryItem><SummaryLabel>수련회 주제명</SummaryLabel><SummaryValue>{summary.retreatName}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>기간</SummaryLabel><SummaryValue>{summary.period}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>버스 탑승 회비</SummaryLabel><SummaryValue>{summary.busFare}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>버스 미탑승 + 숙박</SummaryLabel><SummaryValue>{summary.lodgingFare}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>한 끼 가격</SummaryLabel><SummaryValue>{summary.mealPrice}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>서스펜디드밀 총 끼니 수</SummaryLabel><SummaryValue>{summary.suspendedMealCount}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>등록 버스</SummaryLabel><SummaryValue>{summary.buses}</SummaryValue></SummaryItem>
          {summary.deletedCount > 0 && (
            <SummaryItem>
              <SummaryLabel>삭제 예정 버스</SummaryLabel>
              <SummaryValue style={{ color: '#ff4d4f' }}>{summary.deletedCount}대 (저장 시 삭제)</SummaryValue>
            </SummaryItem>
          )}
        </SummaryCard>
      </FormSection>

      <FooterActions>
        <Button variant="outlined" onClick={() => setConfirmCompleteOpen(true)} disabled={isSaving}>
          수련회 완료
        </Button>
        <Button variant="outlined" onClick={handleReset}>되돌리기</Button>
        <Button variant="filled" onClick={handleSave} disabled={isSaving}>{isSaving ? '저장 중...' : '수련회 설정 수정 저장'}</Button>
      </FooterActions>

      {/* 버스 추가 모달 */}
      <BaseModal
        open={modalOpen}
        title="버스 추가"
        onClose={() => setModalOpen(false)}
        size="medium"
        actions={
          <ModalActions>
            <Button variant="outlined" onClick={() => setModalOpen(false)}>취소</Button>
            <Button variant="filled" onClick={handleAddBus}>추가</Button>
          </ModalActions>
        }
      >
        <ModalBody>
          {modalError && (
            <span style={{ color: '#ff4d4f', fontSize: 13 }}>{modalError}</span>
          )}
          <TextField
            label="버스 이름"
            placeholder="예: 후발버스1, 픽업버스2, 귀경버스1"
            value={busModal.bus_name}
            onChange={(e) => setBusModal((p) => ({ ...p, bus_name: e.target.value }))}
            fullWidth
          />
          <ModalGrid>
            {/* 출발 일자 — 전체 너비 */}
            <div style={{ gridColumn: '1 / -1' }}>
              {dayOptions ? (
                <div>
                  <div style={{ fontSize: 12, marginBottom: 4, color: '#595959' }}>출발 일자</div>
                  <Select
                    value={busModal.departure_date}
                    options={dayOptions}
                    onChange={(v) => setBusModal((p) => ({ ...p, departure_date: String(v) }))}
                    width="100%"
                  />
                </div>
              ) : (
                <TextField
                  label="출발 일자"
                  type="date"
                  value={busModal.departure_date}
                  onChange={(e) => setBusModal((p) => ({ ...p, departure_date: e.target.value }))}
                  disableAnimation
                  fullWidth
                />
              )}
            </div>
            {/* 출발 시간 | 좌석 수 */}
            <TextField
              label="출발 시간"
              type="time"
              value={busModal.departure_time}
              onChange={(e) => setBusModal((p) => ({ ...p, departure_time: e.target.value }))}
              disableAnimation
              fullWidth
            />
            <TextField
              label="좌석 수"
              type="number"
              min="1"
              value={busModal.seat_count}
              onChange={(e) => setBusModal((p) => ({ ...p, seat_count: e.target.value.replace(/[^\d]/g, '') }))}
              placeholder="예: 45"
              fullWidth
            />
            {/* 출발지 | 도착지 */}
            <TextField
              label="출발지"
              value={busModal.departure_place}
              onChange={(e) => setBusModal((p) => ({ ...p, departure_place: e.target.value }))}
              placeholder="예: 강남역"
              fullWidth
            />
            <TextField
              label="도착지"
              value={busModal.arrival_place}
              onChange={(e) => setBusModal((p) => ({ ...p, arrival_place: e.target.value }))}
              placeholder="예: 수련회장"
              fullWidth
            />
          </ModalGrid>
        </ModalBody>
      </BaseModal>

      {/* 수련회 완료 확인 모달 */}
      <BaseModal
        open={confirmCompleteOpen}
        title="수련회 완료 처리"
        onClose={() => setConfirmCompleteOpen(false)}
        size="small"
        actions={
          <ModalActions>
            <Button variant="outlined" onClick={() => setConfirmCompleteOpen(false)}>취소</Button>
            <Button variant="filled" onClick={handleComplete}>완료 처리</Button>
          </ModalActions>
        }
      >
        <ModalBody>
          <p style={{ margin: 0, color: '#595959', lineHeight: 1.7 }}>
            수련회를 완료 처리하면 인원조사, 차량조사, 서스펜디드밀 화면이 비활성화되고
            사용자 페이지가 닫힙니다.<br />
            계속하시겠습니까?
          </p>
        </ModalBody>
      </BaseModal>

      <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
    </PageWrapper>
  );
};

export default RetreatEditPage;
