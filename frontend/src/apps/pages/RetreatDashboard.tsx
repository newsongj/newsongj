import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Users, Car, Home, ClipboardList } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchRetreatAccommodation,
  fetchRetreatHeadcount,
  fetchRetreatVehicle,
} from '@/api/retreat';
import {
  BusDashboardItem,
  RetreatDayHeadcount,
  RetreatHeadcountResponse,
  RetreatAccommodationResponse,
  VehicleDashboardData,
} from '@/models/retreat.types';
import StatCard from '@components/common/StatCard';
import ChartContainer from '@components/common/ChartContainer';
import { Select } from '@components/common/Select';

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
  '@media (max-width: 640px)': {
    gap: 8,
    borderBottom: 'none',
  },
}));

const TabButton = styled('button')<{ $active: boolean }>(({ theme, $active }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
  whiteSpace: 'nowrap',
  '&:hover': {
    color: theme.custom.colors.primary._500,
  },
  '@media (max-width: 640px)': {
    flex: '1 1 100%',
    marginBottom: 0,
    border: `1px solid ${$active ? theme.custom.colors.primary._500 : theme.custom.colors.primary.outline}`,
    borderRadius: 999,
  },
}));

const TabContent = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.lg,
}));

const StatsGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 20,
  '@media (max-width: 1024px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
});

const StatsGrid3 = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 20,
  '@media (max-width: 1024px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
});

const FilterRow = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.sm,
  flexWrap: 'wrap',
  '@media (max-width: 760px)': {
    alignItems: 'stretch',
    '& .MuiFormControl-root': {
      width: '100% !important',
    },
  },
}));

const FilterLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
}));

const DayTotalBadge = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginLeft: 'auto',
  backgroundColor: theme.custom.colors.primary._500,
  color: '#fff',
  borderRadius: 8,
  padding: '6px 14px',
  '@media (max-width: 760px)': {
    marginLeft: 0,
    width: '100%',
    justifyContent: 'center',
  },
}));

const DayTotalLabel = styled('span')({
  fontSize: 13,
  fontWeight: 400,
  opacity: 0.85,
});

const DayTotalValue = styled('span')({
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: '-0.5px',
});

// ── Select Options ────────────────────────────────────────────────────────────

const DAY_LABEL_LIST = ['첫째날', '둘째날', '셋째날', '넷째날'];

// ── 진행율 바 ─────────────────────────────────────────────────────────────────

const ProgressBarWrap = styled('div')({
  width: '100%',
  height: 6,
  borderRadius: 3,
  backgroundColor: '#e5e7eb',
  overflow: 'hidden',
});

const ProgressBarFill = styled('div')<{ $pct: number }>(({ $pct }) => ({
  height: '100%',
  width: `${$pct}%`,
  borderRadius: 3,
  backgroundColor: '#187EF4',
  transition: 'width 0.4s ease',
}));

// ── 차트 색상 ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  undecided: '#94a3b8',  // 미정 — 회색
  absent:    '#ef4444',  // 불참 — 빨강
  normal:    '#187EF4',  // 정상 — 파랑 (첫째날)
  attend:    '#10b981',  // 참석 — 초록 (둘째~셋째날)
  late:      '#f59e0b',  // 후발 — 노랑
};

const TooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 8,
};

// ── 인원조사 탭 ───────────────────────────────────────────────────────────────

const buildChartData = (day: RetreatDayHeadcount, isDay1: boolean) => {
  if (isDay1) {
    return [
      { name: '미정', value: day.undecided, key: 'undecided' },
      { name: '불참', value: day.absent,    key: 'absent' },
      { name: '정상', value: day.normal,    key: 'normal' },
      { name: '후발', value: day.late,      key: 'late' },
    ];
  }
  return [
    { name: '미정', value: day.undecided, key: 'undecided' },
    { name: '불참', value: day.absent,    key: 'absent' },
    { name: '참석', value: day.attend,    key: 'attend' },
    { name: '후발', value: day.late,      key: 'late' },
  ];
};

const HeadcountTab: React.FC = () => {
  const [data, setData] = useState<RetreatHeadcountResponse | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  useEffect(() => {
    fetchRetreatHeadcount()
      .then(setData)
      .catch(() => {});
  }, []);

  const dayOptions = useMemo(
    () => (data?.days ?? []).map((_, i) => ({ value: String(i), label: DAY_LABEL_LIST[i] ?? `${i + 1}일차` })),
    [data],
  );

  const surveyPct = data && data.enrolled > 0
    ? Math.round(data.surveyed / data.enrolled * 100)
    : 0;

  const dayData = data ? (data.days[selectedDayIdx] ?? null) : null;
  const isDay1 = selectedDayIdx === 0;
  const chartData = dayData ? buildChartData(dayData, isDay1) : [];

  return (
    <TabContent>
      {/* 상단 고정 KPI */}
      <StatsGrid>
        <StatCard
          label="인원조사 진행율"
          value={data ? `${surveyPct}%` : '-'}
          change={data ? `재적 ${data.enrolled}명 중 ${data.surveyed}명 조사 완료` : ''}
          isPositive={true}
          icon={<ClipboardList size={24} />}
          iconBgColor="#e0f2fe"
          changeTooltip={data ? `미조사 ${data.enrolled - data.surveyed}명` : undefined}
        />
        <StatCard
          label="수련회 총인원"
          value={data ? `${data.total}명` : '-'}
          change="전체 기간 참가 인원"
          isPositive={true}
          icon={<Users size={24} />}
          iconBgColor="#dcfce7"
        />
        <StatCard
          label="남자"
          value={data ? `${data.male}명` : '-'}
          change=""
          isPositive={true}
          icon={<Users size={24} />}
          iconBgColor="#dbeafe"
        />
        <StatCard
          label="여자"
          value={data ? `${data.female}명` : '-'}
          change=""
          isPositive={true}
          icon={<Users size={24} />}
          iconBgColor="#fce7f3"
        />
      </StatsGrid>

      {/* 진행율 바 */}
      {data && (
        <ProgressBarWrap>
          <ProgressBarFill $pct={surveyPct} />
        </ProgressBarWrap>
      )}

      {/* 날짜별 상세 */}
      <FilterRow>
        <FilterLabel>날짜</FilterLabel>
        <Select
          value={String(selectedDayIdx)}
          options={dayOptions}
          onChange={(v) => setSelectedDayIdx(Number(v))}
          width={110}
        />
        {dayData && (
          <DayTotalBadge>
            <DayTotalLabel>{DAY_LABEL_LIST[selectedDayIdx] ?? `${selectedDayIdx + 1}일차`} 총인원</DayTotalLabel>
            <DayTotalValue>{dayData.total}명</DayTotalValue>
          </DayTotalBadge>
        )}
      </FilterRow>

      <ChartContainer
        title={`${DAY_LABEL_LIST[selectedDayIdx] ?? `${selectedDayIdx + 1}일차`} 인원 현황`}
        description={isDay1 ? '미정 · 불참 · 정상 · 후발' : '미정 · 불참 · 참석 · 후발'}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13, fill: '#475569' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#475569' }}
              tickFormatter={(v) => `${v}명`}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={TooltipStyle}
              formatter={(v: number, _: string, entry: any) => [
                `${v}명`,
                entry.payload.name,
              ]}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: unknown) => `${v}명`}
                style={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </TabContent>
  );
};

// ── 차량조사 타입 & 목업 ─────────────────────────────────────────────────────


const getDayLabel = (date: string, startDate: string) => {
  if (!startDate || !date) return date;
  const diff = Math.round((new Date(date).getTime() - new Date(startDate).getTime()) / 86400000);
  return `${diff + 1}일차 (${date.slice(5).replace('-', '/')})`;
};

// ── 차량 유형별 패널 ──────────────────────────────────────────────────────────

const VehiclePanel = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.sm,
  padding: theme.custom.spacing.md,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  backgroundColor: theme.custom.colors.neutral._99,
}));

const VehiclePanelHeader = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  '@media (max-width: 760px)': {
    alignItems: 'stretch',
  },
}));

const VehiclePanelTitle = styled('span')(({ theme }) => ({
  fontSize: 15,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
  minWidth: 40,
}));


const SlotList = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.custom.spacing.sm,
  marginTop: 4,
}));

const SlotChip = styled('div')<{ $selected: boolean }>(({ theme, $selected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 20,
  border: `1px solid ${$selected ? theme.custom.colors.primary._500 : theme.custom.colors.primary.outline}`,
  backgroundColor: $selected ? theme.custom.colors.primary._500 : '#fff',
  color: $selected ? '#fff' : theme.custom.colors.text.high,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: $selected ? 600 : 400,
  transition: 'all 0.15s ease',
  userSelect: 'none',
  '&:hover': {
    borderColor: theme.custom.colors.primary._500,
  },
}));

const SlotCount = styled('span')<{ $selected: boolean }>(({ $selected }) => ({
  fontWeight: 700,
  fontSize: 14,
  opacity: $selected ? 1 : 0.75,
}));


const DaySectionLabel = styled('div')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.medium,
  marginTop: theme.custom.spacing.xs,
  paddingBottom: 4,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const VEHICLE_TYPES: ('후발' | '픽업' | '귀경')[] = ['후발', '픽업', '귀경'];

const VehicleTypePanel: React.FC<{
  type: '후발' | '픽업' | '귀경';
  buses: BusDashboardItem[];
  startDate: string;
}> = ({ type, buses, startDate }) => {
  // departure_date 기준 그룹핑 (시간 순 정렬)
  const dayMap = useMemo(() => {
    const map = new Map<string, BusDashboardItem[]>();
    [...buses]
      .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
      .forEach(b => {
        if (!map.has(b.departure_date)) map.set(b.departure_date, []);
        map.get(b.departure_date)!.push(b);
      });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [buses]);

  const totalPassengers = buses.reduce((s, b) => s + b.passenger_count, 0);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const multiDay = dayMap.length > 1;

  return (
    <VehiclePanel>
      <VehiclePanelHeader>
        <VehiclePanelTitle>{type}</VehiclePanelTitle>
        <DayTotalBadge style={{ marginLeft: 'auto' }}>
          <DayTotalLabel>총인원</DayTotalLabel>
          <DayTotalValue>{totalPassengers}명</DayTotalValue>
        </DayTotalBadge>
      </VehiclePanelHeader>

      {dayMap.map(([date, dayBuses]) => (
        <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {multiDay && (
            <DaySectionLabel>{getDayLabel(date, startDate)}</DaySectionLabel>
          )}
          <SlotList>
            {dayBuses.map(bus => (
              <SlotChip
                key={bus.bus_id}
                $selected={selectedBusId === bus.bus_id}
                onClick={() => setSelectedBusId(prev => prev === bus.bus_id ? null : bus.bus_id)}
              >
                {bus.bus_name}
                <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 12 }}>{bus.departure_time}</span>
                <SlotCount $selected={selectedBusId === bus.bus_id}>{bus.passenger_count}명</SlotCount>
              </SlotChip>
            ))}
          </SlotList>
        </div>
      ))}
    </VehiclePanel>
  );
};

// ── 차량조사 탭 ───────────────────────────────────────────────────────────────

const VehicleTab: React.FC = () => {
  const [data, setData] = useState<VehicleDashboardData | null>(null);

  useEffect(() => {
    fetchRetreatVehicle()
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <TabContent>
      <StatsGrid3>
        <StatCard
          label="정상 출발 인원"
          value={data ? `${data.normal_depart}명` : '-'}
          change="수련회 당일 정상 출발"
          isPositive={true}
          icon={<Car size={24} />}
          iconBgColor="#dcfce7"
        />
      </StatsGrid3>

      {VEHICLE_TYPES.map(type => {
        const typeBuses = data?.buses.filter(b => b.bus_name.startsWith(type)) ?? [];
        if (typeBuses.length === 0) return null;
        return (
          <VehicleTypePanel
            key={type}
            type={type}
            buses={typeBuses}
            startDate={data?.retreat_start_date ?? ''}
          />
        );
      })}
    </TabContent>
  );
};

// ── 숙소/야식 인원 탭 ────────────────────────────────────────────────────────

const GYOGU_OPTIONS = [
  { value: '',        label: '전체 교구' },
  { value: '1',       label: '1교구' },
  { value: '2',       label: '2교구' },
  { value: '3',       label: '3교구' },
  { value: '임원단',  label: '임원단' },
  { value: '준비위원', label: '준비위원' },
];

const TEAM_OPTIONS = [
  { value: '', label: '전체 팀' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}팀`,
  })),
];

const FilterDivider = styled('div')(({ theme }) => ({
  width: 1,
  height: 28,
  backgroundColor: theme.custom.colors.primary.outline,
  alignSelf: 'center',
  '@media (max-width: 760px)': {
    display: 'none',
  },
}));

const AccommodationTab: React.FC = () => {
  const [data, setData] = useState<RetreatAccommodationResponse | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [gyogu, setGyogu] = useState('');
  const [team, setTeam] = useState('');

  useEffect(() => {
    const isSpecialGroup = gyogu === '임원단' || gyogu === '준비위원';
    const gyogu_no = gyogu && !isSpecialGroup ? Number(gyogu) : undefined;
    const is_imwondan = gyogu === '임원단' ? true : undefined;
    const team_no = team ? Number(team) : undefined;

    fetchRetreatAccommodation({ gyogu_no, team_no, is_imwondan })
      .then(setData)
      .catch(() => {});
  }, [gyogu, team]);

  const dayOptions = useMemo(
    () => (data?.days ?? []).map((_, i) => ({ value: String(i), label: DAY_LABEL_LIST[i] ?? `${i + 1}일차` })),
    [data],
  );

  const dayData = data ? (data.days[selectedDayIdx] ?? null) : null;

  const handleGyoguChange = (v: string | number | (string | number)[]) => {
    setGyogu(String(v));
    setTeam('');
  };

  return (
    <TabContent>
      <FilterRow>
        <FilterLabel>날짜</FilterLabel>
        <Select
          value={String(selectedDayIdx)}
          options={dayOptions}
          onChange={(v) => setSelectedDayIdx(Number(v))}
          width={110}
        />

        <FilterDivider />

        <FilterLabel>교구</FilterLabel>
        <Select
          value={gyogu}
          options={GYOGU_OPTIONS}
          onChange={handleGyoguChange}
          width={110}
        />
        <FilterLabel>팀</FilterLabel>
        <Select
          value={team}
          options={TEAM_OPTIONS}
          onChange={(v) => setTeam(String(v))}
          disabled={!gyogu || gyogu === '임원단' || gyogu === '준비위원'}
          width={100}
        />
      </FilterRow>

      <StatsGrid3>
        <StatCard
          label="총 인원"
          value={dayData ? `${dayData.total}명` : '-'}
          change={DAY_LABEL_LIST[selectedDayIdx] ?? `${selectedDayIdx + 1}일차`}
          isPositive={true}
          icon={<Home size={24} />}
          iconBgColor="#e0f2fe"
        />
        <StatCard
          label="남자"
          value={dayData ? `${dayData.male}명` : '-'}
          change=""
          isPositive={true}
          icon={<Home size={24} />}
          iconBgColor="#dbeafe"
        />
        <StatCard
          label="여자"
          value={dayData ? `${dayData.female}명` : '-'}
          change=""
          isPositive={true}
          icon={<Home size={24} />}
          iconBgColor="#fce7f3"
        />
      </StatsGrid3>
    </TabContent>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

type TabKey = 'headcount' | 'vehicle' | 'accommodation';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'headcount',     label: '인원조사',      icon: <Users size={16} /> },
  { key: 'vehicle',       label: '차량조사',      icon: <Car size={16} /> },
  { key: 'accommodation', label: '숙소/야식 인원', icon: <Home size={16} /> },
];

const RetreatDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('headcount');

  return (
    <PageWrapper>
      <TabBar>
        {TABS.map(tab => (
          <TabButton
            key={tab.key}
            $active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </TabButton>
        ))}
      </TabBar>

      {activeTab === 'headcount'     && <HeadcountTab />}
      {activeTab === 'vehicle'       && <VehicleTab />}
      {activeTab === 'accommodation' && <AccommodationTab />}
    </PageWrapper>
  );
};

export default RetreatDashboard;
