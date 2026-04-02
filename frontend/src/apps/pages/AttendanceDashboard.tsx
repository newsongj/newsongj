import React, { useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Users, TrendingUp, CalendarCheck } from 'lucide-react';
import StatCard from '@components/common/StatCard';
import ChartWithSelect from '@components/common/ChartWithSelect';
import ChartContainer from '@components/common/ChartContainer';
import { Select } from '@components/common/Select';

// ── Types ──────────────────────────────────────────────────────────────────

type PeriodUnit = 'weekly' | 'monthly' | 'yearly' | '3years' | 'custom';
type DimensionKey = 'gyogu' | 'team' | 'generation' | 'gender';

// ── Mock Data ──────────────────────────────────────────────────────────────

// 출석 추이 — 전체(교구별 3선) / 교구 선택 시 단일선
const TREND_WEEKLY = [
  { period: '12/21', gyogu1: 25, gyogu2: 22, gyogu3: 21, present: 68 },
  { period: '12/28', gyogu1: 22, gyogu2: 20, gyogu3: 20, present: 62 },
  { period: '1/4',   gyogu1: 27, gyogu2: 23, gyogu3: 21, present: 71 },
  { period: '1/11',  gyogu1: 25, gyogu2: 21, gyogu3: 21, present: 67 },
  { period: '1/18',  gyogu1: 28, gyogu2: 25, gyogu3: 21, present: 74 },
  { period: '1/25',  gyogu1: 27, gyogu2: 24, gyogu3: 21, present: 72 },
  { period: '2/1',   gyogu1: 26, gyogu2: 23, gyogu3: 21, present: 70 },
  { period: '2/8',   gyogu1: 29, gyogu2: 26, gyogu3: 22, present: 77 },
  { period: '2/15',  gyogu1: 28, gyogu2: 25, gyogu3: 22, present: 75 },
  { period: '2/22',  gyogu1: 30, gyogu2: 27, gyogu3: 22, present: 79 },
  { period: '3/1',   gyogu1: 29, gyogu2: 25, gyogu3: 22, present: 76 },
  { period: '3/8',   gyogu1: 28, gyogu2: 25, gyogu3: 22, present: 75 },
];

const TREND_MONTHLY = [
  { period: '1월', gyogu1: 26, gyogu2: 23, gyogu3: 21, present: 70 },
  { period: '2월', gyogu1: 28, gyogu2: 25, gyogu3: 21, present: 74 },
  { period: '3월', gyogu1: 28, gyogu2: 25, gyogu3: 22, present: 75 },
];


const TREND_YEARLY = [
  { period: '2022년', gyogu1: 21, gyogu2: 20, gyogu3: 17, present: 58 },
  { period: '2023년', gyogu1: 24, gyogu2: 21, gyogu3: 18, present: 63 },
  { period: '2024년', gyogu1: 26, gyogu2: 23, gyogu3: 20, present: 69 },
  { period: '2025년', gyogu1: 28, gyogu2: 25, gyogu3: 20, present: 73 },
  { period: '2026년', gyogu1: 28, gyogu2: 25, gyogu3: 22, present: 75 },
];

const GYOGU_LINE_CONFIG = [
  { key: 'gyogu1', label: '1교구', color: '#187EF4' },
  { key: 'gyogu2', label: '2교구', color: '#10b981' },
  { key: 'gyogu3', label: '3교구', color: '#f59e0b' },
] as const;

// 차원별 — Y축: 인원 수
const DIM_GYOGU      = [
  { name: '1교구', present: 36, absent: 10 },
  { name: '2교구', present: 28, absent: 11 },
  { name: '3교구', present: 18, absent:  6 },
  { name: '임원단', present: 12, absent:  2 },
];
const DIM_TEAM = Array.from({ length: 12 }, (_, i) => ({
  name: `${i + 1}팀`,
  present: 8 + Math.round(Math.abs(Math.sin(i * 1.3)) * 6),
  absent:  1 + Math.round(Math.abs(Math.cos(i * 1.1)) * 3),
}));
const DIM_GEN = [
  { name: '37기', present: 22, absent: 5 },
  { name: '38기', present: 20, absent: 6 },
  { name: '39기', present: 17, absent: 7 },
  { name: '40기', present: 19, absent: 6 },
  { name: '41기', present: 15, absent: 7 },
  { name: '42기', present: 13, absent: 8 },
];
const DIM_GENDER = [
  { name: '남', present: 38, absent: 14 },
  { name: '여', present: 44, absent: 13 },
];
// 결석사유 분포
const ABSENT_REASON_DATA = [
  { name: '학교/학원', value: 28, fill: '#3b82f6' },
  { name: '알바',     value: 22, fill: '#10b981' },
  { name: '회사',     value: 15, fill: '#f59e0b' },
  { name: '개인일정',  value: 18, fill: '#8b5cf6' },
  { name: '가족모임',  value: 10, fill: '#ef4444' },
  { name: '아픔',     value:  5, fill: '#06b6d4' },
  { name: '기타',     value:  2, fill: '#6b7280' },
];

// ── Select Options ─────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'weekly',  label: '주간' },
  { value: 'monthly', label: '월간' },
  { value: 'yearly',  label: '연간' },
  { value: '3years',  label: '3개년' },
  { value: 'custom',  label: '직접 입력' },
];

const DIMENSION_OPTIONS = [
  { value: 'gyogu',      label: '교구별' },
  { value: 'team',       label: '팀별' },
  { value: 'generation', label: '기수별' },
  { value: 'gender',     label: '성별' },
];

const GYOGU_OPTIONS = [
  { value: '',      label: '전체 교구' },
  { value: '1',     label: '1교구' },
  { value: '2',     label: '2교구' },
  { value: '3',     label: '3교구' },
  { value: '임원단', label: '임원단' },
];

const TEAM_OPTIONS = [
  { value: '', label: '전체 팀' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}팀` })),
];

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const y = 2026 - i;
  return { value: String(y), label: `${y}년` };
});

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

// 주간 이동: 해당 주 토요일 날짜 계산
const getMostRecentSaturday = (): Date => {
  const today = new Date();
  const diff = today.getDay() === 6 ? 0 : today.getDay() + 1;
  const sat = new Date(today);
  sat.setDate(today.getDate() - diff);
  sat.setHours(0, 0, 0, 0);
  return sat;
};

const formatWeekLabel = (sat: Date): string => {
  const y = sat.getFullYear();
  const m = sat.getMonth() + 1;
  const d = sat.getDate();
  return `${y}년 ${m}월 ${d}일 주`;
};

// ── Styled Components ──────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.lg,
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
}));

const FilterDivider = styled('div')(({ theme }) => ({
  width: 1,
  height: 28,
  backgroundColor: theme.custom.colors.primary.outline,
  margin: `0 ${theme.custom.spacing.xs}`,
  alignSelf: 'center',
}));

const FilterLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
}));

const WeekNavWrap = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.xs,
}));

const WeekNavBtn = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: '50%',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 14,
  color: theme.custom.colors.text.high,
  '&:disabled': { opacity: 0.38, cursor: 'not-allowed' },
}));

const WeekText = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.primary._500,
  minWidth: 150,
  textAlign: 'center',
}));

const DateInput = styled('input')(({ theme }) => ({
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  padding: '6px 10px',
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.high,
  backgroundColor: theme.custom.colors.neutral._99,
  outline: 'none',
  cursor: 'pointer',
  '&:focus': {
    borderColor: theme.custom.colors.primary._500,
  },
}));

const KpiGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 20,
  '@media (max-width: 1024px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
});

const ChartsGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 24,
  '@media (max-width: 1024px)': { gridTemplateColumns: '1fr' },
});

const TooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 8,
};

// ── Component ──────────────────────────────────────────────────────────────

const AttendanceDashboard: React.FC = () => {
  // ── 날짜 필터 상태 ────────────────────────────────────────────────────
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('weekly');

  // 주간
  const [weekSaturday, setWeekSaturday] = useState<Date>(() => getMostRecentSaturday());
  const mostRecentSat = useMemo(() => getMostRecentSaturday(), []);
  const isNextWeekDisabled = weekSaturday.getTime() >= mostRecentSat.getTime();

  const handlePrevWeek = () => setWeekSaturday(prev => {
    const d = new Date(prev); d.setDate(d.getDate() - 7); return d;
  });
  const handleNextWeek = () => setWeekSaturday(prev => {
    const d = new Date(prev); d.setDate(d.getDate() + 7); return d;
  });

  // 월간
  const [selectedYear, setSelectedYear]   = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));

  // 연간
  const [selectedYearOnly, setSelectedYearOnly] = useState(String(new Date().getFullYear()));

  // 직접 입력
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');

  // ── 세부 필터 상태 ────────────────────────────────────────────────────
  const [gyogu, setGyogu] = useState('');
  const [team,  setTeam]  = useState('');

  // ── 차트 차원 선택 ────────────────────────────────────────────────────
  const [dimension, setDimension] = useState<DimensionKey>('gyogu');

  const handleGyoguChange = (val: string | number | (string | number)[]) => {
    setGyogu(String(val)); setTeam('');
  };

  // ── 추이 데이터 ───────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (periodUnit === 'monthly') return TREND_MONTHLY;
    if (periodUnit === 'yearly' || periodUnit === 'custom') return TREND_YEARLY;
    return TREND_WEEKLY;
  }, [periodUnit]);

  // ── 3개년 비교 데이터: 4개 주 × 교구별 막대 + 3개년 라인 ──────────────
  const yearLineConfig = useMemo(() => {
    const end = Number(selectedYearOnly);
    return [
      { year: end - 2, color: '#94a3b8' },
      { year: end - 1, color: '#64748b' },
      { year: end,     color: '#1e293b' },
    ];
  }, [selectedYearOnly]);

  const threeYearsData = useMemo(() => {
    const [y0, y1, y2] = yearLineConfig.map(c => c.year);
    // 가장 최근 토요일 기준으로 4주 레이블 계산 (오래된 순)
    const weekLabels = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(mostRecentSat);
      d.setDate(d.getDate() - (3 - i) * 7);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const mock = [
      { gyogu1: 26, gyogu2: 23, gyogu3: 20, l0: 58, l1: 65, l2: 72 },
      { gyogu1: 25, gyogu2: 21, gyogu3: 19, l0: 56, l1: 62, l2: 69 },
      { gyogu1: 28, gyogu2: 25, gyogu3: 21, l0: 62, l1: 68, l2: 75 },
      { gyogu1: 27, gyogu2: 24, gyogu3: 20, l0: 60, l1: 66, l2: 71 },
    ];
    return mock.map((m, i) => ({
      week: weekLabels[i],
      gyogu1: m.gyogu1,
      gyogu2: m.gyogu2,
      gyogu3: m.gyogu3,
      [`${y0}년`]: m.l0,
      [`${y1}년`]: m.l1,
      [`${y2}년`]: m.l2,
    }));
  }, [yearLineConfig, mostRecentSat]);

  // ── 차원별 데이터 ─────────────────────────────────────────────────────
  const dimensionData = useMemo(() => {
    switch (dimension) {
      case 'team':       return DIM_TEAM;
      case 'generation': return DIM_GEN;
      case 'gender':     return DIM_GENDER;
      default:           return DIM_GYOGU;
    }
  }, [dimension]);

  // ── KPI ───────────────────────────────────────────────────────────────
  const kpiAvgPresent   = 75;   // 기간 평균 출석 인원
  const kpiTotal        = 109;  // 전체 인원
  const kpiGen45Present = 22;   // 45기 출석 인원
  const kpiGen45Total   = 26;   // 45기 전체 인원
  const kpiGen46Present = 18;   // 46기 출석 인원
  const kpiGen46Total   = 23;   // 46기 전체 인원
  const kpiTopAbsentReason = ABSENT_REASON_DATA.reduce((a, b) => a.value >= b.value ? a : b);

  // ── 기간 설명 텍스트 ──────────────────────────────────────────────────
  const periodDesc = useMemo(() => {
    if (periodUnit === 'weekly')  return `${formatWeekLabel(weekSaturday)} 출석 인원 추이`;
    if (periodUnit === 'monthly') return `${selectedYear}년 ${selectedMonth}월 주차별 출석 인원 추이`;
    if (periodUnit === 'yearly')  return `${selectedYearOnly}년 월별 출석 인원 추이`;
    if (periodUnit === '3years')  return `${Number(selectedYearOnly) - 2}년 ~ ${selectedYearOnly}년 3개년 출석 인원 추이`;
    if (customStart && customEnd) return `${customStart} ~ ${customEnd} 출석 인원 추이`;
    return '기간을 설정해주세요';
  }, [periodUnit, weekSaturday, selectedYear, selectedMonth, selectedYearOnly, customStart, customEnd]);

  return (
    <PageWrapper>
      {/* ── 날짜 + 세부 필터 패널 ── */}
      <FilterPanel>
        {/* 기간 단위 */}
        <FilterLabel>기간</FilterLabel>
        <Select
          value={periodUnit}
          options={PERIOD_OPTIONS}
          onChange={(v) => setPeriodUnit(v as PeriodUnit)}
          width={110}
        />

        {/* 기간 단위별 날짜 컨트롤 */}
        {periodUnit === 'weekly' && (
          <WeekNavWrap>
            <WeekNavBtn onClick={handlePrevWeek}>‹</WeekNavBtn>
            <WeekText>{formatWeekLabel(weekSaturday)}</WeekText>
            <WeekNavBtn onClick={handleNextWeek} disabled={isNextWeekDisabled}>›</WeekNavBtn>
          </WeekNavWrap>
        )}

        {periodUnit === 'monthly' && (
          <>
            <Select
              value={selectedYear}
              options={YEAR_OPTIONS}
              onChange={(v) => setSelectedYear(String(v))}
              width={90}
            />
            <Select
              value={selectedMonth}
              options={MONTH_OPTIONS}
              onChange={(v) => setSelectedMonth(String(v))}
              width={80}
            />
          </>
        )}

        {periodUnit === 'yearly' && (
          <Select
            value={selectedYearOnly}
            options={YEAR_OPTIONS}
            onChange={(v) => setSelectedYearOnly(String(v))}
            width={90}
          />
        )}

        {periodUnit === '3years' && (
          <>
            <Select
              value={selectedYearOnly}
              options={YEAR_OPTIONS}
              onChange={(v) => setSelectedYearOnly(String(v))}
              width={90}
            />
            <FilterLabel>기준 (최근 3개년)</FilterLabel>
          </>
        )}

        {periodUnit === 'custom' && (
          <WeekNavWrap>
            <DateInput
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <FilterLabel>~</FilterLabel>
            <DateInput
              type="date"
              value={customEnd}
              min={customStart || undefined}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </WeekNavWrap>
        )}

        <FilterDivider />

        {/* 교구 / 팀 / 그룹 */}
        <FilterLabel>교구</FilterLabel>
        <Select value={gyogu} options={GYOGU_OPTIONS} onChange={handleGyoguChange} width={110} />
        <FilterLabel>팀</FilterLabel>
        <Select
          value={team}
          options={TEAM_OPTIONS}
          onChange={(v) => setTeam(String(v))}
          disabled={!gyogu || gyogu === '임원단'}
          width={100}
        />
      </FilterPanel>

      {/* ── KPI 카드 ── */}
      <KpiGrid>
        <StatCard
          label="기간 평균 출석 인원"
          value={`${kpiAvgPresent}명`}
          change={`전체 ${kpiTotal}명 기준`}
          isPositive={true}
          icon={<CalendarCheck size={24} />}
          iconBgColor="#e0f2fe"
        />
        <StatCard
          label="45기 출석 인원"
          value={`${kpiGen45Present}명`}
          change={`전체 ${kpiGen45Total}명 중`}
          isPositive={true}
          icon={<Users size={24} />}
          iconBgColor="#dcfce7"
        />
        <StatCard
          label="46기 출석 인원"
          value={`${kpiGen46Present}명`}
          change={`전체 ${kpiGen46Total}명 중`}
          isPositive={true}
          icon={<Users size={24} />}
          iconBgColor="#f3e8ff"
        />
        <StatCard
          label="최다 결석 사유"
          value={kpiTopAbsentReason.name}
          change={`${kpiTopAbsentReason.value}명`}
          isPositive={false}
          icon={<TrendingUp size={24} />}
          iconBgColor="#fef9c3"
        />
      </KpiGrid>

      {/* ── 차트 그리드 ── */}
      <ChartsGrid>
        {/* ① 출석 인원 추이 — Y축: 인원 수(명) */}
        <ChartContainer title="출석 인원 추이" description={periodDesc}>
          <ResponsiveContainer width="100%" height={300}>
            {periodUnit === '3years' ? (
              // 3개년: 교구별 그룹 막대(4개 주) + 각 연도 라인 3개
              <ComposedChart data={threeYearsData} margin={{ top: 8, right: 18, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: '#475569' }}
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
                  formatter={(v: number, name: string) => [`${v}명`, name]}
                />
                {GYOGU_LINE_CONFIG.map(({ key, label, color }) => (
                  <Bar key={key} dataKey={key} name={label} fill={color} maxBarSize={24} />
                ))}
                {yearLineConfig.map(({ year, color }) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`${year}년`}
                    name={`${year}년`}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, r: 4 }}
                  />
                ))}
                <Legend />
              </ComposedChart>
            ) : (
              // 주간/월간/연간/직접입력: 기존 라인차트
              <LineChart data={trendData} margin={{ top: 8, right: 18, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: '#475569' }}
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
                  formatter={(v: number, name: string) => [`${v}명`, name]}
                />
                {gyogu === '' ? (
                  GYOGU_LINE_CONFIG.map(({ key, label, color }) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={label}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ fill: color, r: 4 }}
                    />
                  ))
                ) : (
                  <Line type="monotone" dataKey="present" name="출석 인원" stroke="#187EF4" strokeWidth={2} dot={{ fill: '#187EF4', r: 4 }} />
                )}
                <Legend />
              </LineChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>

        {/* ② 차원별 출석 인원 — Y축: 인원 수(명) */}
        <ChartWithSelect
          title="차원별 출석 인원"
          description={`${DIMENSION_OPTIONS.find(d => d.value === dimension)?.label} 기준 출석/결석 인원 비교`}
          selectValue={dimension}
          selectOptions={DIMENSION_OPTIONS}
          onSelectChange={(v) => setDimension(v as DimensionKey)}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dimensionData} margin={{ top: 8, right: 18, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#475569' }}
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
                formatter={(v: number) => [`${v}명`, '출석 인원']}
              />
              <Bar dataKey="present" name="출석 인원" fill="#187EF4" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWithSelect>

        {/* ③ 결석사유 분포 */}
        <ChartContainer title="결석사유 분포" description="결석 인원 중 사유별 비중">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', height: 300 }}>
            <ResponsiveContainer width="55%" height={300}>
              <PieChart>
                <Pie
                  data={ABSENT_REASON_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {ABSENT_REASON_DATA.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TooltipStyle}
                  formatter={(v: number, name: string) => [`${v}명`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {ABSENT_REASON_DATA.map((entry) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.fill, flexShrink: 0 }} />
                  <span style={{ color: '#374151', flex: 1 }}>{entry.name}</span>
                  <span style={{ color: '#6b7280', fontWeight: 600 }}>{entry.value}명</span>
                </div>
              ))}
            </div>
          </div>
        </ChartContainer>

        {/* ④ 교구별 출석/결석 현황 (Stacked Bar) */}
        <ChartContainer title="교구별 출석 현황" description="교구별 출석 / 결석 인원 현황">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={DIM_GYOGU}
              margin={{ top: 8, right: 18, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#475569' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#475569' }}
                tickFormatter={(v) => `${v}명`}
              />
              <Tooltip
                contentStyle={TooltipStyle}
                formatter={(v: number, name: string) => [
                  `${v}명`,
                  name === 'present' ? '출석' : '결석',
                ]}
              />
              <Legend formatter={(v) => v === 'present' ? '출석' : '결석'} />
              <Bar dataKey="present" name="present" stackId="a" fill="#187EF4" maxBarSize={60} />
              <Bar dataKey="absent"  name="absent"  stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </ChartsGrid>
    </PageWrapper>
  );
};

export default AttendanceDashboard;
