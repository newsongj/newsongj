import React, { useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { TextField } from '@components/common/TextField';
import { Checkbox } from '@components/common/Checkbox';
import { Button } from '@components/common/Button';
import { Snackbar } from '@components/common/Snackbar';
import { useSnackbar } from '@/hooks/common/useSnackbar';

type VehicleTypeKey = 'late' | 'return' | 'pickup';

interface VehicleTypeConfig {
  enabled: boolean;
  times: string[];
}

interface RetreatCreateForm {
  startDate: string;
  endDate: string;
  busFare: string;
  lodgingFare: string;
  mealPrice: string;
  suspendedMealCount: string;
  vehicles: Record<VehicleTypeKey, VehicleTypeConfig>;
}

const VEHICLE_TYPE_LABELS: Record<VehicleTypeKey, string> = {
  late: '후발',
  return: '귀경',
  pickup: '픽업',
};

const DEFAULT_FORM: RetreatCreateForm = {
  startDate: '',
  endDate: '',
  busFare: '',
  lodgingFare: '',
  mealPrice: '',
  suspendedMealCount: '',
  vehicles: {
    late: { enabled: true, times: ['15:00', '18:00', '19:00', '20:00'] },
    return: { enabled: true, times: ['05:30', '22:30'] },
    pickup: { enabled: true, times: ['11:30', '15:00', '17:00', '18:30', '22:30'] },
  },
};

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.lg,
}));

const FormSection = styled('section')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg,
  backgroundColor: theme.custom.colors.neutral._99,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
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
  '@media (max-width: 900px)': {
    gridTemplateColumns: '1fr',
  },
}));


const VehicleCardList = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: theme.custom.spacing.md,
  '@media (max-width: 1100px)': {
    gridTemplateColumns: '1fr',
  },
}));

const VehicleCard = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.md,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  backgroundColor: '#ffffff',
}));

const VehicleHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
});

const VehicleTitle = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body1.fontSize,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
}));

const TimeList = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.sm,
}));

const TimeRow = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: theme.custom.spacing.sm,
  alignItems: 'center',
}));

const InputsCard = styled('div')(({ theme }) => ({
  padding: theme.custom.spacing.md,
  backgroundColor: theme.custom.colors.white,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
}));

const FooterActions = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.custom.spacing.sm,
}));

const SummaryCard = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.sm,
  padding: theme.custom.spacing.md,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  backgroundColor: '#ffffff',
}));

const SummaryItem = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
});

const SummaryLabel = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.medium,
}));

const SummaryValue = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.high,
  fontWeight: 600,
}));

const formatCurrency = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
};

const parseCurrency = (formatted: string) => formatted.replace(/[^\d]/g, '');

const RetreatCreatePage: React.FC = () => {
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();
  const [form, setForm] = useState<RetreatCreateForm>(DEFAULT_FORM);

  const updateField = (field: keyof Omit<RetreatCreateForm, 'vehicles'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateCurrencyField = (
    field: 'busFare' | 'lodgingFare' | 'mealPrice',
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: formatCurrency(value) }));
  };

  const toggleVehicle = (type: VehicleTypeKey, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      vehicles: {
        ...prev.vehicles,
        [type]: {
          ...prev.vehicles[type],
          enabled: checked,
        },
      },
    }));
  };

  const updateVehicleTime = (type: VehicleTypeKey, index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      vehicles: {
        ...prev.vehicles,
        [type]: {
          ...prev.vehicles[type],
          times: prev.vehicles[type].times.map((time, idx) => (idx === index ? value : time)),
        },
      },
    }));
  };

  const addVehicleTime = (type: VehicleTypeKey) => {
    setForm((prev) => ({
      ...prev,
      vehicles: {
        ...prev.vehicles,
        [type]: {
          ...prev.vehicles[type],
          times: [...prev.vehicles[type].times, ''],
        },
      },
    }));
  };

  const removeVehicleTime = (type: VehicleTypeKey, index: number) => {
    setForm((prev) => ({
      ...prev,
      vehicles: {
        ...prev.vehicles,
        [type]: {
          ...prev.vehicles[type],
          times: prev.vehicles[type].times.filter((_, idx) => idx !== index),
        },
      },
    }));
  };

  const summary = useMemo(() => {
    const enabledVehicles = Object.entries(form.vehicles)
      .filter(([, config]) => config.enabled)
      .map(([type, config]) => `${VEHICLE_TYPE_LABELS[type as VehicleTypeKey]} ${config.times.length}개`);

    return {
      period:
        form.startDate && form.endDate ? `${form.startDate} ~ ${form.endDate}` : '-',
      busFare: form.busFare ? `${form.busFare}원` : '-',
      lodgingFare: form.lodgingFare ? `${form.lodgingFare}원` : '-',
      mealPrice: form.mealPrice ? `${form.mealPrice}원` : '-',
      suspendedMealCount: form.suspendedMealCount ? `${form.suspendedMealCount}끼` : '-',
      vehicles: enabledVehicles.length > 0 ? enabledVehicles.join(', ') : '-',
    };
  }, [form]);

  const handleReset = () => {
    setForm(DEFAULT_FORM);
  };

  const handleSave = () => {
    const payload = {
      start_date: form.startDate,
      end_date: form.endDate,
      bus_fare: Number(parseCurrency(form.busFare) || 0),
      lodging_fare: Number(parseCurrency(form.lodgingFare) || 0),
      meal_price: Number(parseCurrency(form.mealPrice) || 0),
      suspended_meal_count: Number(form.suspendedMealCount || 0),
      vehicle_types: Object.entries(form.vehicles)
        .filter(([, config]) => config.enabled)
        .map(([type, config]) => ({
          type,
          times: config.times.filter(Boolean),
        })),
    };

    console.log('retreat-create payload', payload);
    showSnackbar('수련회 생성 설정값을 저장할 준비가 되었습니다.', 'success');
  };

  return (
    <PageWrapper>
      <FormSection>
        <SectionTitle>기본 정보 입력</SectionTitle>
        <InputsCard>
          <FormGrid>
            <TextField
              id="retreat-start-date"
              label="수련회 시작일"
              type="date"
              value={form.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
              disableAnimation
              fullWidth
            />

            <TextField
              id="retreat-end-date"
              label="수련회 종료일"
              type="date"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => updateField('endDate', e.target.value)}
              disableAnimation
              fullWidth
            />

            <TextField
              label="수련회 버스 탑승 회비 가격"
              value={form.busFare}
              onChange={(e) => updateCurrencyField('busFare', e.target.value)}
              placeholder="예: 35,000"
              fullWidth
            />

            <TextField
              label="버스 미탑승 + 숙박 가격"
              value={form.lodgingFare}
              onChange={(e) => updateCurrencyField('lodgingFare', e.target.value)}
              placeholder="예: 20,000"
              fullWidth
            />

            <TextField
              label="한 끼 가격"
              value={form.mealPrice}
              onChange={(e) => updateCurrencyField('mealPrice', e.target.value)}
              placeholder="예: 7,000"
              fullWidth
            />

            <TextField
              label="총 끼니 수"
              type="number"
              min="0"
              value={form.suspendedMealCount}
              onChange={(e) => updateField('suspendedMealCount', e.target.value.replace(/[^\d]/g, ''))}
              placeholder="예: 5"
              fullWidth
            />
          </FormGrid>
        </InputsCard>
      </FormSection>

      <FormSection>
        <SectionTitle>버스 종류 및 시간대 커스터마이징</SectionTitle>
        <VehicleCardList>
          {(['late', 'return', 'pickup'] as VehicleTypeKey[]).map((type) => {
            const config = form.vehicles[type];
            return (
              <VehicleCard key={type}>
                <VehicleHeader>
                  <VehicleTitle>{VEHICLE_TYPE_LABELS[type]}</VehicleTitle>
                  <Checkbox
                    checked={config.enabled}
                    onChange={(e) => toggleVehicle(type, e.target.checked)}
                    label="사용"
                  />
                </VehicleHeader>

                <TimeList>
                  {config.times.map((time, index) => (
                    <TimeRow key={`${type}-${index}`}>
                      <TextField
                        type="time"
                        value={time}
                        onChange={(e) => updateVehicleTime(type, index, e.target.value)}
                        disabled={!config.enabled}
                        fullWidth
                      />
                      <Button
                        variant="outlined"
                        onClick={() => removeVehicleTime(type, index)}
                        disabled={!config.enabled || config.times.length === 1}
                        showIcon
                        icon={<DeleteIcon />}
                      >
                        삭제
                      </Button>
                    </TimeRow>
                  ))}
                </TimeList>

                <Button
                  variant="elevated"
                  onClick={() => addVehicleTime(type)}
                  disabled={!config.enabled}
                  showIcon
                  icon={<AddIcon />}
                >
                  시간대 추가
                </Button>
              </VehicleCard>
            );
          })}
        </VehicleCardList>
      </FormSection>

      <FormSection>
        <SectionTitle>설정 미리보기</SectionTitle>
        <SummaryCard>
          <SummaryItem>
            <SummaryLabel>기간</SummaryLabel>
            <SummaryValue>{summary.period}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>버스 탑승 회비</SummaryLabel>
            <SummaryValue>{summary.busFare}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>버스 미탑승 + 숙박 가격</SummaryLabel>
            <SummaryValue>{summary.lodgingFare}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>한 끼 가격</SummaryLabel>
            <SummaryValue>{summary.mealPrice}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>서스펜디드밀 총 끼니 수</SummaryLabel>
            <SummaryValue>{summary.suspendedMealCount}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>활성 버스 종류</SummaryLabel>
            <SummaryValue>{summary.vehicles}</SummaryValue>
          </SummaryItem>
        </SummaryCard>
      </FormSection>

      <FooterActions>
        <Button variant="outlined" onClick={handleReset}>
          초기화
        </Button>
        <Button variant="filled" onClick={handleSave}>
          수련회 생성 설정 저장
        </Button>
      </FooterActions>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </PageWrapper>
  );
};

export default RetreatCreatePage;
