import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, Clock, CheckCircle, Users, DollarSign } from 'lucide-react';
import ChartWithSelect from '@/components/common/ChartWithSelect';
import StatCard from '@/components/common/StatCard';
import WordCloudChart from '@/components/dashboard/WordCloudChart';
import { DataTable } from '@/components/common/DataTable';
import { Column } from '@/components/common/DataTable/DataTable.types';
import { LoadingFallback } from '@/components/common/LoadingFallback';
import { PeriodKey } from '@/hooks/dashboard';
import type { DashboardViewProps } from './DashboardView.types';
import * as S from './DashboardView.styles';

  import {
    buildAxis,
    periodLabels,
    formatPeriodLabel,
    getStrokeByPeriod,
  } from '@/apps/utils/chartHelpers';

interface TopUser {
  name: string;
  dept: string;
  count: number;
}


const ChartLoader: React.FC = () => (
  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <LoadingFallback />
  </div>
);

const PageContainer = S.PageContainer;
const StatsGrid = S.StatsGrid;
const ChartsGrid = S.ChartsGrid;
const StatCardWrapper = S.StatCardWrapper;
const MonthBadge = S.MonthBadge;

const formatAbbrev = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value).toLocaleString()}`;
};

const formatCostValue = (value: number) => `$${formatAbbrev(value)}`;

const DashboardView: React.FC<DashboardViewProps> = ({
  loading,
  chartLoading,
  dashboardData,
  handlePeriodChange,
  handlePieChartPeriodChange,
  handleBarChartPeriodChange,
  handleActiveUsersPeriodChange,
  handleWordCloudPeriodChange,
  handleTopUsersPeriodChange,
  handleTopUsersMonthChange,
  chartPeriod,
  pieChartPeriod,
  barChartPeriod,
  activeUsersPeriod,
  wordCloudPeriod,
  topUsersPeriod,
  topUsersMonth,
}) => {

  const currentMonthLabel = useMemo(() => String(new Date().getMonth() + 1), []);
  const currentYearLabel = useMemo(() => String(new Date().getFullYear()), []);

  const lineChartData = dashboardData.lineChart[chartPeriod] || [];
  const barDataCurrent = dashboardData.barChart[barChartPeriod] || [];
  const activeUsersData = dashboardData.activeUsersChart?.[activeUsersPeriod] || [];
  const pieDataCurrent = dashboardData.pieChart[pieChartPeriod] || [];

  const weeklyRangeLabel = useMemo(() => {
    const weeklyData = dashboardData.lineChart.weekly || [];
    const raws = weeklyData.map((d: any) => d.raw).filter(Boolean);
    if (!raws.length) return '';
    const dates = raws.map((r: string) => new Date(r));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    return `${fmt(minDate)}~${fmt(maxDate)}`;
  }, [dashboardData.lineChart.weekly]);

  const buildDescription = (base: string, period: PeriodKey) => {
    if (period === 'weekly') return `주간 ${base} (${weeklyRangeLabel || '이번 주'})`;
    if (period === 'monthly-overview') return `월간 일별 ${base} (${currentMonthLabel}월)`;
    return `연간 ${base} (${currentYearLabel}년)`;
  };

  const lineYAxis = useMemo(() => buildAxis(lineChartData, 'value'), [lineChartData]);
  const costYAxis = useMemo(() => buildAxis(barDataCurrent, 'costValue'), [barDataCurrent]);
  const activeYAxis = useMemo(() => buildAxis(activeUsersData, 'value'), [activeUsersData]);
  const lineXTicks = useMemo(() => {
    if (chartPeriod !== 'monthly-overview') return undefined;
    const periods = (dashboardData.lineChart[chartPeriod] || []).map((d: any) => d.period);
    if (!periods.length) return undefined;
    return periods.filter((_, idx) => idx % 2 === 0);
  }, [chartPeriod, dashboardData.lineChart]);
  const activeXTicks = useMemo(() => {
    if (activeUsersPeriod !== 'monthly-overview') return undefined;
    const periods = (activeUsersData || []).map((d: any) => d.period);
    if (!periods.length) return undefined;
    return periods.filter((_, idx) => idx % 2 === 0);
  }, [activeUsersData, activeUsersPeriod]);
  const costXTicks = useMemo(() => {
    if (barChartPeriod !== 'monthly-overview') return undefined;
    const periods = (dashboardData.barChart[barChartPeriod] || []).map((d: any) => d.period);
    if (!periods.length) return undefined;
    return periods.filter((_, idx) => idx % 2 === 0);
  }, [barChartPeriod, dashboardData.barChart]);

  const userColumns: Column<TopUser>[] = useMemo(() => {
    return [
      {
        id: 'rank',
        label: '순위',
        minWidth: 60,
        align: 'center',
        render: (_value, row: TopUser) => {
          const users =
            topUsersPeriod === 'monthly'
              ? dashboardData.topUsersMonthly[topUsersMonth] || []
              : dashboardData.topUsers[topUsersPeriod] || [];
          const index = users.findIndex((u) => u.name === row.name);
          return index + 1;
        },
      },
      {
        id: 'name',
        label: '사용자명',
        minWidth: 120,
      },
      {
        id: 'dept',
        label: '부서',
        minWidth: 100,
        align: 'center',
      },
      {
        id: 'count',
        label: '사용 건수',
        minWidth: 100,
        align: 'right',
        render: (value: number) => `${Number(value || 0).toLocaleString()}건`,
      },
    ];
  }, [dashboardData.topUsers, dashboardData.topUsersMonthly, topUsersPeriod, topUsersMonth]);

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <PageContainer>
      <StatsGrid>
        {dashboardData.statCards.map((stat, index) => {
          const getIcon = (iconType: string) => {
            switch (iconType) {
              case 'trending':
                return <TrendingUp size={24} />;
              case 'clock':
                return <Clock size={24} />;
              case 'check':
                return <CheckCircle size={24} />;
              case 'users':
                return <Users size={24} />;
              case 'dollar':
                return <DollarSign size={24} />;
              default:
                return <TrendingUp size={24} />;
            }
          };

          return (
            <StatCardWrapper key={index}>
              <StatCard
                label={stat.label}
                value={stat.value}
                change={stat.change}
                isPositive={stat.isPositive}
                changeTooltip={stat.changeTooltip}
                icon={getIcon(stat.iconType)}
                iconBgColor={stat.iconBgColor}
              />
              <MonthBadge>{`${currentMonthLabel}월`}</MonthBadge>
            </StatCardWrapper>
          );
        })}
      </StatsGrid>

      <ChartsGrid>
        <ChartWithSelect
          key="line-chart"
          title="요청 건수 추이"
          description={
            chartPeriod === 'weekly'
              ? buildDescription('요일별 요청 건수 추이', chartPeriod)
              : buildDescription('요청 건수 추이', chartPeriod)
          }
          selectValue={chartPeriod}
          selectOptions={[
            { value: 'weekly', label: periodLabels.weekly },
            { value: 'monthly-overview', label: periodLabels['monthly-overview'] },
            { value: 'monthly', label: periodLabels.monthly },
          ]}
          onSelectChange={(value) => handlePeriodChange(value as any)}
        >
          {chartLoading.line ? (
            <ChartLoader />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dashboardData.lineChart[chartPeriod]}
                margin={{ top: 8, right: 18, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis
                  dataKey="period"
                  stroke="#e5e7eb"
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tick={{ fontSize: 12, fill: '#475569' }}
                  interval={0}
                  padding={{ left: 6, right: 18 }}
                  ticks={lineXTicks}
                  tickFormatter={(value) => formatPeriodLabel(chartPeriod, value)}
                />
                <YAxis
                  stroke="#999"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${Math.round(value)}`}
                  domain={lineYAxis.domain}
                  ticks={lineYAxis.ticks}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                  }}
                  labelFormatter={() => ''}
                  formatter={(value: number, _name: string, props: any) => {
                    const rawLabel = props?.payload?.period ?? props?.label ?? '';
                    const labelText = formatPeriodLabel(chartPeriod, rawLabel);
                    const displayValue = `${Math.round(value).toLocaleString()}건`;
                    return [displayValue, `${labelText}`];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getStrokeByPeriod(chartPeriod)}
                  strokeWidth={Math.max(1, Math.min(4, 40 / (dashboardData.lineChart[chartPeriod]?.length || 1)))}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={
                    (dashboardData.lineChart[chartPeriod] || []).length <= 12
                      ? {
                          fill: getStrokeByPeriod(chartPeriod),
                          r: Math.max(2, Math.min(6, 50 / (dashboardData.lineChart[chartPeriod]?.length || 1))),
                        }
                      : false
                  }
                  strokeDasharray={(dashboardData.lineChart[chartPeriod] || []).length > 20 ? '3 3' : '0'}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartWithSelect>

        <ChartWithSelect
          key="pie-chart"
          title="응답 성공률"
          description={
            pieChartPeriod === 'weekly'
              ? buildDescription('요일별 응답 성공률', pieChartPeriod)
              : buildDescription('응답 성공률', pieChartPeriod)
          }
          selectValue={pieChartPeriod}
          selectOptions={[
            { value: 'weekly', label: periodLabels.weekly },
            { value: 'monthly-overview', label: periodLabels['monthly-overview'] },
            { value: 'monthly', label: periodLabels.monthly },
          ]}
          onSelectChange={(value) => handlePieChartPeriodChange(value as any)}
        >
          {chartLoading.pie ? (
            <ChartLoader />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', height: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieDataCurrent}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieDataCurrent.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e8e8e8',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      const payloadCount = props?.payload?.count;
                      const totalCount = pieDataCurrent.reduce(
                        (sum: number, item: any) => sum + (Number(item.count) || 0),
                        0
                      );
                      const inferredCount =
                        typeof payloadCount === 'number' && !Number.isNaN(payloadCount)
                          ? payloadCount
                          : totalCount > 0
                          ? Math.round((Number(value) / 100) * totalCount)
                          : undefined;
                      const countText =
                        inferredCount !== undefined ? ` (${Number(inferredCount).toLocaleString()}건)` : '';
                      return [`${value}%${countText}`, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartWithSelect>

        <ChartWithSelect
          key="active-users-chart"
          title="활성 사용자 추이"
          description={
            activeUsersPeriod === 'weekly'
              ? buildDescription('요일별 활성 사용자 추이', activeUsersPeriod)
              : buildDescription('활성 사용자 추이', activeUsersPeriod)
          }
          selectValue={activeUsersPeriod}
          selectOptions={[
            { value: 'weekly', label: periodLabels.weekly },
            { value: 'monthly-overview', label: periodLabels['monthly-overview'] },
            { value: 'monthly', label: periodLabels.monthly },
          ]}
          onSelectChange={(value) => handleActiveUsersPeriodChange(value as any)}
        >
          {chartLoading.active ? (
            <ChartLoader />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activeUsersData} margin={{ top: 8, right: 18, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis
                  dataKey="period"
                  stroke="#e5e7eb"
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tick={{ fontSize: 12, fill: '#475569' }}
                  interval={0}
                  padding={{ left: 6, right: 18 }}
                  ticks={activeXTicks}
                  tickFormatter={(value) => formatPeriodLabel(activeUsersPeriod, value)}
                />
                <YAxis
                  stroke="#999"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${Math.round(value)}`}
                  domain={activeYAxis.domain}
                  ticks={activeYAxis.ticks}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                  }}
                  labelFormatter={() => ''}
                  formatter={(value: number, _name: string, props: any) => {
                    const rawLabel = props?.payload?.period ?? props?.label ?? '';
                    const labelText = formatPeriodLabel(activeUsersPeriod, rawLabel);
                    return [`${Math.round(value).toLocaleString()}명`, `${labelText}`];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getStrokeByPeriod(activeUsersPeriod)}
                  strokeWidth={Math.max(1, Math.min(4, 40 / (activeUsersData?.length || 1)))}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={
                    (activeUsersData || []).length <= 20
                      ? {
                          fill: getStrokeByPeriod(activeUsersPeriod),
                          r: Math.max(2, Math.min(6, 50 / (activeUsersData?.length || 1))),
                        }
                      : false
                  }
                  strokeDasharray={(activeUsersData || []).length > 20 ? '3 3' : '0'}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartWithSelect>

        <ChartWithSelect
          key="bar-chart"
          title="토큰 비용 추이"
          description={
            barChartPeriod === 'weekly'
              ? buildDescription('요일별 토큰 비용', barChartPeriod)
              : buildDescription('토큰 비용', barChartPeriod)
          }
          selectValue={barChartPeriod}
          selectOptions={[
            { value: 'weekly', label: periodLabels.weekly },
            { value: 'monthly-overview', label: periodLabels['monthly-overview'] },
            { value: 'monthly', label: periodLabels.monthly },
          ]}
          onSelectChange={(value) => handleBarChartPeriodChange(value as any)}
        >
          {chartLoading.bar ? (
            <ChartLoader />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dashboardData.barChart[barChartPeriod]}
                margin={{ top: 8, right: 18, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis
                  dataKey="period"
                  stroke="#e5e7eb"
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tick={{ fontSize: 12, fill: '#475569' }}
                  interval={0}
                  padding={{ left: 6, right: 18 }}
                  ticks={costXTicks}
                  tickFormatter={(value) => formatPeriodLabel(barChartPeriod, value)}
                />
                <YAxis
                  stroke="#999"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCostValue(value)}
                  domain={costYAxis.domain}
                  ticks={costYAxis.ticks}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px' }}
                  labelFormatter={() => ''}
                  formatter={(value: number, _name: string, props: any) => {
                    const rawLabel = props?.payload?.period ?? props?.label ?? '';
                    const labelText = formatPeriodLabel(barChartPeriod, rawLabel);
                    const displayValue = formatCostValue(value);
                    return [displayValue, `${labelText}`];
                  }}
                />
                <Bar
                  dataKey="costValue"
                  name="비용"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={Math.max(
                    30,
                    Math.min(60, 600 / Math.max(1, dashboardData.barChart[barChartPeriod]?.length || 1))
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWithSelect>

        <ChartWithSelect
          key="wordcloud-chart"
          title="주요 질문 키워드 워드클라우드"
          description={
            wordCloudPeriod === 'weekly'
              ? buildDescription('주요 질문 키워드', wordCloudPeriod)
              : buildDescription('주요 질문 키워드 워드클라우드', wordCloudPeriod)
          }
          selectValue={wordCloudPeriod}
          selectOptions={[
            { value: 'weekly', label: periodLabels.weekly },
            { value: 'monthly-overview', label: periodLabels['monthly-overview'] },
            { value: 'monthly', label: periodLabels.monthly },
          ]}
          onSelectChange={(value) => handleWordCloudPeriodChange(value as any)}
        >
          {chartLoading.wordCloud ? (
            <ChartLoader />
          ) : (
            (() => {
            const words = dashboardData.wordCloud[wordCloudPeriod] || [];
            if (!words.length) {
              return (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  데이터가 없습니다.
                </div>
              );
            }

            const topWords = [...words]
              .sort((a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0))
              .slice(0, 10);

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr',
                  gap: 16,
                  alignItems: 'stretch',
                }}
              >
                <div style={{ height: 300 }}>
                  <WordCloudChart key={`wordcloud-${wordCloudPeriod}`} words={words} />
                </div>
                <div
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 12,
                    background: 'linear-gradient(180deg, #f8fafc 0%, #f5f3ff 100%)',
                    maxHeight: 320,
                    overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                  }}
                >
                  {topWords.map((item: any, idx: number) => {
                    const rank = idx + 1;
                    const isTop = rank === 1;
                    const isMedal = rank <= 3;
                    const badgeBg = isTop ? '#2563eb' : '#eef2ff';
                    const badgeColor = isTop ? '#fff' : '#4f46e5';
                    const rowBg = isMedal
                      ? 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.05) 100%)'
                      : '#fff';
                    return (
                      <div
                        key={`${item.text ?? item.keyword ?? item.name}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: rowBg,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          marginBottom: 8,
                          transition: 'transform 120ms ease, box-shadow 120ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: badgeBg,
                              color: badgeColor,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            {rank}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#0f172a',
                              fontSize: 13,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.text ?? item.keyword ?? item.name ?? '-'}
                          </span>
                        </div>
                        <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>
                          {Number(item.value || 0).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
            })()
          )}
        </ChartWithSelect>

        <ChartWithSelect
          key="topusers-chart"
          title="상위 사용 부서/사용자"
          description={
            topUsersPeriod === 'weekly'
              ? buildDescription('상위 사용 부서/사용자', topUsersPeriod)
              : buildDescription('상위 사용 부서/사용자', topUsersPeriod)
          }
          selectValue={topUsersPeriod}
          selectOptions={[
            { value: 'weekly', label: periodLabels.weekly },
            { value: 'monthly-overview', label: periodLabels['monthly-overview'] },
            { value: 'monthly', label: periodLabels.monthly },
          ]}
          onSelectChange={(value) => handleTopUsersPeriodChange(value as any)}
        >
          {topUsersPeriod === 'monthly' && (
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                <button
                  key={month}
                  onClick={() => handleTopUsersMonthChange(month)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: month === topUsersMonth ? '1px solid #2563eb' : '1px solid #e5e7eb',
                    backgroundColor: month === topUsersMonth ? '#eff6ff' : '#fff',
                    color: month === topUsersMonth ? '#2563eb' : '#111827',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {month}월
                </button>
              ))}
            </div>
          )}
          {chartLoading.topUsers ? (
            <ChartLoader />
          ) : (
            (() => {
              const data =
                topUsersPeriod === 'monthly'
                  ? dashboardData.topUsersMonthly[topUsersMonth] || []
                  : dashboardData.topUsers[topUsersPeriod] || [];

              if (!data.length) {
                return (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    데이터가 없습니다.
                  </div>
                );
              }

              return (
                <DataTable
                  key={`datatable-${topUsersPeriod}-${topUsersMonth}`}
                  columns={userColumns}
                  data={data}
                  useSearchToolbar={false}
                  getRowId={(row) => row.name}
                />
              );
            })()
          )}
        </ChartWithSelect>
      </ChartsGrid>
    </PageContainer>
  );
};

export default DashboardView;

