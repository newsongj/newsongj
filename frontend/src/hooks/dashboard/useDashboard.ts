import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchTotalUsage,
  fetchSuccessRate,
  fetchActiveUsers,
  fetchActiveUsersTrend,
  fetchTokenUsage,
  fetchEstimatedCost,
  fetchUsageTrend,
  fetchTopUsers,
  fetchResponseStatus,
  fetchTokenCostTrend,
  fetchTopKeywords,
} from '@/api/dashboard';
import { getAccessToken } from '@/utils/auth';

export type PeriodKey = 'weekly' | 'monthly' | 'monthly-overview';

const WORD_CLOUD_FALLBACK: Record<PeriodKey, { text: string; value: number }[]> = {
  weekly: [
    { text: 'token', value: 32 },
    { text: 'usage', value: 28 },
    { text: 'cost', value: 26 },
    { text: 'department', value: 24 },
    { text: 'report', value: 22 },
    { text: 'budget', value: 20 },
    { text: 'query', value: 18 },
    { text: 'log', value: 16 },
  ],
  monthly: [
    { text: 'token', value: 40 },
    { text: 'usage', value: 36 },
    { text: 'cost', value: 34 },
    { text: 'department', value: 30 },
    { text: 'report', value: 28 },
    { text: 'budget', value: 24 },
    { text: 'permission', value: 22 },
    { text: 'query', value: 20 },
  ],
  'monthly-overview': [
    { text: 'token', value: 38 },
    { text: 'usage', value: 35 },
    { text: 'cost', value: 33 },
    { text: 'department', value: 29 },
    { text: 'report', value: 27 },
    { text: 'budget', value: 23 },
    { text: 'permission', value: 21 },
    { text: 'query', value: 19 },
  ],
};

interface RangeWithAggregation {
  startDate: string;
  endDate: string;
  aggregation: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

/** YYYY-MM-DD */
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** "YYYY-MM-DD"를 로컬 00:00 기준으로 안전 파싱 (타임존/브라우저 차이 방어) */
const parseLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

const isUnauthorizedError = (error: any) =>
  error?.response?.status === 401 || error?.message === 'Unauthorized';

const SUCCESS_STATUS_LABELS: Record<string, string> = {
  success: '성공',
  성공: '성공',
  fail: '실패',
  실패: '실패',
  error: '오류',
  오류: '오류',
  timeout: '타임아웃',
  타임아웃: '타임아웃',
  기타: '기타',
};

const SUCCESS_STATUS_COLORS: Record<string, string> = {
  성공: '#10b981',
  실패: '#ef4444',
  오류: '#f97316',
  타임아웃: '#f59e0b',
  기타: '#6b7280',
};

const SAFE_STAT_LABELS = ['총 요청 수', '응답 성공률', '활성 사용자', '토큰 사용량', '예상 비용'];

const extractSuccessRate = (raw: any) => {
  const data = raw?.data ?? {};
  const successCount =
    data.success ?? data.successCount ?? data.success_requests ?? data.successRequests ?? data.ok ?? 0;
  const totalCount = data.total ?? data.totalCount ?? data.total_requests ?? data.totalRequests ?? data.count ?? 0;
  const valueFromApi = data.value;

  if (valueFromApi !== undefined && valueFromApi !== null) {
    return { rate: normalizeSuccessRate(valueFromApi), successCount, totalCount };
  }

  const computedRate = totalCount > 0 ? normalizeSuccessRate((successCount / totalCount) * 100) : 0;
  return { rate: computedRate, successCount, totalCount };
};

const buildStatusPieData = (apiData: any[] | undefined) => {
  if (!apiData || apiData.length === 0) {
    return [];
  }

  const withCounts = apiData.map((item) => {
    const label = SUCCESS_STATUS_LABELS[item.name] ?? item.name ?? '기타';
    const count =
      item.count ?? item.total ?? item.totalCount ?? item.value ?? item.requests ?? item.requestCount ?? 0;
    const fill = item.fill ?? SUCCESS_STATUS_COLORS[label] ?? '#6b7280';
    return { name: label, count: Number(count) || 0, rawValue: item.value, fill };
  });

  const totalCount = withCounts.reduce((sum, cur) => sum + (cur.count || 0), 0);

  return withCounts.map((item) => {
    const value =
      totalCount > 0
        ? Number(((item.count / totalCount) * 100).toFixed(1))
        : normalizeSuccessRate(item.rawValue);
    return { name: item.name, value, count: item.count, fill: item.fill };
  });
};

const normalizeSuccessRate = (value: number | undefined | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  const normalized = value <= 1 ? value * 100 : value;
  const clamped = Math.min(100, Math.max(0, normalized));
  return Number(clamped.toFixed(1));
};

const parseMetricValue = (raw: any) => {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const numeric = raw.replace(/[^\d.-]/g, '');
    const parsed = Number(numeric);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof raw === 'object' && raw !== null) {
    const candidate = raw.value ?? raw.formatted ?? raw.amount;
    return parseMetricValue(candidate);
  }
  return 0;
};

const getPartialMonthRange = (offset: number = 0) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + offset; // Date 생성자가 year/month overflow 자동 처리
  const todayDate = today.getDate();

  const start = new Date(year, month, 1);
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  const endDateDay = Math.min(todayDate, lastDayOfTargetMonth);
  const end = new Date(year, month, endDateDay);

  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const getSpecificMonthRange = (month: number) => {
  const year = new Date().getFullYear();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

export const useDashboard = () => {
  const currentMonth = new Date().getMonth() + 1;
  const emptyPeriodSeries = useMemo<Record<PeriodKey, any[]>>(
    () => ({
      weekly: [],
      monthly: [],
      'monthly-overview': [],
    }),
    []
  );
  const defaultIconTypes = ['trending', 'check', 'users', 'clock', 'dollar'];
  const defaultIconColors = ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#0ea5e9'];

  // baseStatCards는 렌더마다 새로 만들어지면 콜백 deps 꼬이기 쉬워서 useMemo로 고정
  const baseStatCards = useMemo(() => {
    return SAFE_STAT_LABELS.map((label, idx) => {
      return {
        label,
        value: '0',
        change: '0%',
        changeTooltip: undefined as string | undefined,
        isPositive: true,
        iconType: defaultIconTypes[idx] ?? 'trending',
        iconBgColor: defaultIconColors[idx] ?? '#2563eb',
      };
    });
  }, []);

  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState({
    line: false,
    pie: false,
    bar: false,
    active: false,
    topUsers: false,
    wordCloud: false,
  });

  const [dashboardData, setDashboardData] = useState<{
    lineChart: Record<PeriodKey, any[]>;
    barChart: Record<PeriodKey, any[]>;
    pieChart: Record<PeriodKey, any[]>;
    activeUsersChart: Record<PeriodKey, any[]>;
    topUsers: Record<PeriodKey, any[]>;
    topUsersMonthly: Record<number, any[]>;
    wordCloud: Record<PeriodKey, any[]>;
    statCards: typeof baseStatCards;
  }>({
    lineChart: emptyPeriodSeries,
    barChart: emptyPeriodSeries,
    pieChart: emptyPeriodSeries,
    activeUsersChart: emptyPeriodSeries,
    topUsers: emptyPeriodSeries,
    topUsersMonthly: {} as Record<number, any[]>,
    wordCloud: emptyPeriodSeries,
    statCards: baseStatCards,
  });

  const [fetchedLinePeriods, setFetchedLinePeriods] = useState<Record<PeriodKey, boolean>>({
    weekly: false,
    monthly: false,
    'monthly-overview': false,
  });
  const [fetchedPiePeriods, setFetchedPiePeriods] = useState<Record<PeriodKey, boolean>>({
    weekly: false,
    monthly: false,
    'monthly-overview': false,
  });
  const [fetchedBarPeriods, setFetchedBarPeriods] = useState<Record<PeriodKey, boolean>>({
    weekly: false,
    monthly: false,
    'monthly-overview': false,
  });
  const [fetchedActivePeriods, setFetchedActivePeriods] = useState<Record<PeriodKey, boolean>>({
    weekly: false,
    monthly: false,
    'monthly-overview': false,
  });
  const [fetchedTopUserPeriods, setFetchedTopUserPeriods] = useState<Record<PeriodKey, boolean>>({
    weekly: false,
    monthly: false,
    'monthly-overview': false,
  });
  const [fetchedTopUsersMonthly, setFetchedTopUsersMonthly] = useState<Record<number, boolean>>({});
  const [fetchedWordPeriods, setFetchedWordPeriods] = useState<Record<PeriodKey, boolean>>({
    weekly: false,
    monthly: false,
    'monthly-overview': false,
  });
  const wordCloudFallbackRef = useRef<Record<PeriodKey, any[]>>({
    weekly: [],
    monthly: [],
    'monthly-overview': [],
  });

  const [chartPeriod, setChartPeriod] = useState<PeriodKey>('monthly');
  const [pieChartPeriod, setPieChartPeriod] = useState<PeriodKey>('monthly');
  const [barChartPeriod, setBarChartPeriod] = useState<PeriodKey>('monthly');
  const [activeUsersPeriod, setActiveUsersPeriod] = useState<PeriodKey>('monthly');
  const [wordCloudPeriod, setWordCloudPeriod] = useState<PeriodKey>('monthly');
  const [topUsersPeriod, setTopUsersPeriod] = useState<PeriodKey>('monthly');
  const [topUsersMonth, setTopUsersMonth] = useState<number>(currentMonth); // 1~12

  /** ✅ 여기 템플릿 문자열 깨짐이 기존 “에러 원인” */
  const computeChange = useCallback((currentValue: number, previousValue: number) => {
    const diff = currentValue - previousValue;

    // 이전값이 0이면 % 변화 정의가 애매하니 0으로 처리(원하면 정책 변경 가능)
    const changePercent = previousValue === 0 ? 0 : (diff / previousValue) * 100;
    const isPositive = changePercent >= 0;

    // "전월 대비" 문구 포함 (원래 깨져있던 문자열 복구)
    const changeText = `${isPositive ? '+' : ''}${changePercent.toFixed(1)}% 전월 대비`;
    return { changeText, isPositive, changePercent, previousValue };
  }, []);

  const getRangeForPeriod = useCallback((period: PeriodKey): RangeWithAggregation => {
    const today = new Date();

    if (period === 'weekly') {
      const start = new Date(today);
      const day = today.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = (day + 6) % 7; // 월요일 기준
      start.setDate(today.getDate() - diffToMonday);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return { startDate: formatDate(start), endDate: formatDate(end), aggregation: 'daily' };
    }

    if (period === 'monthly-overview') {
      // 이번 달 1일 ~ 말일(그래프는 일 단위)
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: formatDate(start), endDate: formatDate(end), aggregation: 'daily' };
    }

    // yearly view: 올해 1~12월(월 단위)
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31);
    return { startDate: formatDate(start), endDate: formatDate(end), aggregation: 'monthly' };
  }, []);

  const buildWeeklyUsageSeries = useCallback((range: RangeWithAggregation, resData: any) => {
    const start = parseLocalDate(range.startDate);
    const map = new Map<string, number>();

    resData?.data?.forEach((item: any) => {
      const key = item.date || item.month || '';
      if (key) map.set(key, parseMetricValue(item.value ?? item.count ?? item.usage ?? item.total));
    });

    const weekly: { period: string; value: number; raw: string }[] = [];
    const labels = ['월', '화', '수', '목', '금', '토', '일'];

    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const key = formatDate(d);
      weekly.push({
        period: `${labels[i]}(${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')})`,
        value: map.get(key) ?? 0,
        raw: key,
      });
    }
    return weekly;
  }, []);

  const buildMonthlyOverviewUsageSeries = useCallback((range: RangeWithAggregation, resData: any) => {
    const start = parseLocalDate(range.startDate);
    const end = parseLocalDate(range.endDate);

    const map = new Map<string, number>();
    resData?.data?.forEach((item: any) => {
      const key = item.date || item.month || '';
      if (key) map.set(key, parseMetricValue(item.value ?? item.count ?? item.usage ?? item.total));
    });

    const days: { period: number; value: number; raw: string }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = formatDate(d);
      days.push({ period: d.getDate(), value: map.get(key) ?? 0, raw: key });
    }
    return days;
  }, []);

  const buildYearlyMonthlyUsageSeries = useCallback((resData: any) => {
    const map = new Map<number, number>();
    resData?.data?.forEach((item: any) => {
      // item.month: "YYYY-MM" 또는 1~12 형태 모두 대응
      const key =
        typeof item.month === 'string'
          ? Number(item.month.split('-')[1])
          : typeof item.month === 'number'
          ? item.month
          : null;

      if (key && key >= 1 && key <= 12) map.set(key, parseMetricValue(item.value ?? item.count ?? item.total));
    });

    const months: { period: number; value: number }[] = [];
    for (let m = 1; m <= 12; m += 1) {
      months.push({ period: m, value: map.get(m) ?? 0 });
    }
    return months;
  }, []);

  const loadActiveUsersChart = useCallback(
    async (period: PeriodKey, options?: { force?: boolean }) => {
      if (!options?.force && fetchedActivePeriods[period]) return;
      setChartLoading((prev) => ({ ...prev, active: true }));

      try {
        const range = getRangeForPeriod(period);

        const res = await fetchActiveUsersTrend(range.startDate, range.endDate, range.aggregation);

        const series =
          period === 'weekly'
            ? buildWeeklyUsageSeries(range, res.data)
            : period === 'monthly-overview'
            ? buildMonthlyOverviewUsageSeries(range, res.data)
            : buildYearlyMonthlyUsageSeries(res.data);

        setDashboardData((prev) => ({
          ...prev,
          activeUsersChart: { ...prev.activeUsersChart, [period]: series },
        }));
        setFetchedActivePeriods((prev) => ({ ...prev, [period]: true }));
      } catch (error) {
        console.error('Failed to load active users trend', error);
      } finally {
        setChartLoading((prev) => ({ ...prev, active: false }));
      }
    },
    [fetchedActivePeriods, getRangeForPeriod, buildWeeklyUsageSeries, buildMonthlyOverviewUsageSeries, buildYearlyMonthlyUsageSeries]
  );

  const updateStatCardsWithMetrics = useCallback(async () => {
    const nextCards = [...baseStatCards];

    try {
      const currentRange = getPartialMonthRange(0);
      const previousRange = getPartialMonthRange(-1);

      const [
        totalCurrentRes,
        totalPreviousRes,
        successCurrentRes,
        successPreviousRes,
        activeCurrentRes,
        activePreviousRes,
        tokenCurrentRes,
        tokenPreviousRes,
        costCurrentRes,
        costPreviousRes,
      ] = await Promise.all([
        fetchTotalUsage(currentRange.startDate, currentRange.endDate),
        fetchTotalUsage(previousRange.startDate, previousRange.endDate),
        fetchSuccessRate(currentRange.startDate, currentRange.endDate),
        fetchSuccessRate(previousRange.startDate, previousRange.endDate),
        fetchActiveUsers(currentRange.startDate, currentRange.endDate),
        fetchActiveUsers(previousRange.startDate, previousRange.endDate),
        fetchTokenUsage(currentRange.startDate, currentRange.endDate),
        fetchTokenUsage(previousRange.startDate, previousRange.endDate),
        fetchEstimatedCost(currentRange.startDate, currentRange.endDate),
        fetchEstimatedCost(previousRange.startDate, previousRange.endDate),
      ]);

      // 총 요청 수
      const totalCurrent = totalCurrentRes.data?.value ?? 0;
      const totalPrevious = totalPreviousRes.data?.value ?? 0;
      const totalChange = computeChange(totalCurrent, totalPrevious);
      nextCards[0] = {
        ...nextCards[0],
        value: totalCurrent.toLocaleString(),
        change: totalChange.changeText,
        isPositive: totalChange.isPositive,
        changeTooltip: `전월 ${totalPrevious.toLocaleString()}건`,
      };

      // 응답 성공률
      const { rate: successCurrent } = extractSuccessRate(successCurrentRes);
      const { rate: successPrevious } = extractSuccessRate(successPreviousRes);
      const successChange = computeChange(successCurrent, successPrevious);
      nextCards[1] = {
        ...nextCards[1],
        value: `${successCurrent.toFixed(1)}%`,
        change: successChange.changeText,
        isPositive: successChange.isPositive,
        changeTooltip: `전월 ${successPrevious.toFixed(1)}%`,
      };

      // 활성 사용자
      const activeCurrent = activeCurrentRes.data?.value ?? 0;
      const activePrevious = activePreviousRes.data?.value ?? 0;
      const activeChange = computeChange(activeCurrent, activePrevious);
      nextCards[2] = {
        ...nextCards[2],
        value: activeCurrent.toLocaleString(),
        change: activeChange.changeText,
        isPositive: activeChange.isPositive,
        changeTooltip: `전월 ${activePrevious.toLocaleString()}명`,
      };

      // 토큰 사용량
      const tokenCurrent = tokenCurrentRes.data?.value ?? 0;
      const tokenPrevious = tokenPreviousRes.data?.value ?? 0;
      const tokenChange = computeChange(tokenCurrent, tokenPrevious);
      nextCards[3] = {
        ...nextCards[3],
        value: tokenCurrentRes.data?.formatted ?? tokenCurrent.toLocaleString(),
        change: tokenChange.changeText,
        isPositive: tokenChange.isPositive,
        changeTooltip: `전월 ${tokenPreviousRes.data?.formatted ?? tokenPrevious.toLocaleString()}`,
      };

      // 예상 비용
      const costCurrent = costCurrentRes.data?.value ?? 0;
      const costPrevious = costPreviousRes.data?.value ?? 0;
      const costChange = computeChange(costCurrent, costPrevious);
      nextCards[4] = {
        ...nextCards[4],
        value: costCurrentRes.data?.formatted ?? costCurrent.toLocaleString(),
        change: costChange.changeText,
        isPositive: costChange.isPositive,
        changeTooltip: `전월 ${costPreviousRes.data?.formatted ?? costPrevious.toLocaleString()}`,
      };
    } catch (error) {
      console.error('Failed to load dashboard metrics', error);
    }

    return nextCards;
  }, [baseStatCards, computeChange]);

  const loadLineChart = useCallback(
    async (period: PeriodKey, options?: { force?: boolean }) => {
      if (!options?.force && fetchedLinePeriods[period]) return;
      setChartLoading((prev) => ({ ...prev, line: true }));

      const range = getRangeForPeriod(period);
      try {
        const res = await fetchUsageTrend(range.startDate, range.endDate, range.aggregation);
        const lineData =
          period === 'weekly'
            ? buildWeeklyUsageSeries(range, res.data)
            : period === 'monthly-overview'
            ? buildMonthlyOverviewUsageSeries(range, res.data)
            : buildYearlyMonthlyUsageSeries(res.data);

        setDashboardData((prev) => ({
          ...prev,
          lineChart: { ...prev.lineChart, [period]: lineData },
        }));
        setFetchedLinePeriods((prev) => ({ ...prev, [period]: true }));
      } catch (error) {
        console.error('Failed to load line chart', error);
        setDashboardData((prev) => ({
          ...prev,
          lineChart: { ...prev.lineChart, [period]: [] },
        }));
      } finally {
        setChartLoading((prev) => ({ ...prev, line: false }));
      }
    },
    [
      fetchedLinePeriods,
      getRangeForPeriod,
      buildWeeklyUsageSeries,
      buildMonthlyOverviewUsageSeries,
      buildYearlyMonthlyUsageSeries,
    ]
  );

  const loadPieChart = useCallback(
    async (period: PeriodKey, options?: { force?: boolean }) => {
      if (!options?.force && fetchedPiePeriods[period]) return;
      setChartLoading((prev) => ({ ...prev, pie: true }));

      const range = getRangeForPeriod(period);
      try {
        const res = await fetchResponseStatus(range.startDate, range.endDate);
        const pieData = buildStatusPieData(res.data?.data);

        setDashboardData((prev) => ({
          ...prev,
          pieChart: { ...prev.pieChart, [period]: pieData },
        }));
        setFetchedPiePeriods((prev) => ({ ...prev, [period]: true }));
      } catch (error) {
        console.error('Failed to load pie chart', error);
        setDashboardData((prev) => ({
          ...prev,
          pieChart: { ...prev.pieChart, [period]: [] },
        }));
      } finally {
        setChartLoading((prev) => ({ ...prev, pie: false }));
      }
    },
    [fetchedPiePeriods, getRangeForPeriod]
  );

  const loadBarChart = useCallback(
    async (period: PeriodKey, options?: { force?: boolean }) => {
      if (!options?.force && fetchedBarPeriods[period]) return;
      setChartLoading((prev) => ({ ...prev, bar: true }));

      const range = getRangeForPeriod(period);
      try {
        const res = await fetchTokenCostTrend(range.startDate, range.endDate, range.aggregation);
        const baseSeries =
          period === 'weekly'
            ? buildWeeklyUsageSeries(range, res.data)
            : period === 'monthly-overview'
            ? buildMonthlyOverviewUsageSeries(range, res.data)
            : buildYearlyMonthlyUsageSeries(res.data);

        const barData = baseSeries.map((item: any) => ({
          ...item,
          costValue: item.value ?? 0,
          tokenValue: item.value ?? 0,
        }));

        setDashboardData((prev) => ({
          ...prev,
          barChart: { ...prev.barChart, [period]: barData },
        }));
        setFetchedBarPeriods((prev) => ({ ...prev, [period]: true }));
      } catch (error) {
        console.error('Failed to load bar chart', error);
        setDashboardData((prev) => ({
          ...prev,
          barChart: { ...prev.barChart, [period]: [] },
        }));
      } finally {
        setChartLoading((prev) => ({ ...prev, bar: false }));
      }
    },
    [
      fetchedBarPeriods,
      getRangeForPeriod,
      buildWeeklyUsageSeries,
      buildMonthlyOverviewUsageSeries,
      buildYearlyMonthlyUsageSeries,
    ]
  );

  const loadTopUsers = useCallback(
    async (period: PeriodKey, options?: { force?: boolean; month?: number }) => {
      if (period === 'monthly') {
        const targetMonth = options?.month ?? topUsersMonth;
        if (!options?.force && fetchedTopUsersMonthly[targetMonth]) return;

        setChartLoading((prev) => ({ ...prev, topUsers: true }));
        const range = getSpecificMonthRange(targetMonth);

        try {
          const res = await fetchTopUsers(range.startDate, range.endDate, 5);
          const data = res.data?.data ?? [];
          setDashboardData((prev) => ({
            ...prev,
            topUsersMonthly: { ...prev.topUsersMonthly, [targetMonth]: data },
          }));
          setFetchedTopUsersMonthly((prev) => ({ ...prev, [targetMonth]: true }));
        } catch (error) {
          console.error('Failed to load top users (monthly)', error);
          setDashboardData((prev) => ({
            ...prev,
            topUsersMonthly: { ...prev.topUsersMonthly, [targetMonth]: [] },
          }));
        } finally {
          setChartLoading((prev) => ({ ...prev, topUsers: false }));
        }
        return;
      }

      if (!options?.force && fetchedTopUserPeriods[period]) return;
      setChartLoading((prev) => ({ ...prev, topUsers: true }));

      const range = getRangeForPeriod(period);
      try {
        const res = await fetchTopUsers(range.startDate, range.endDate, 5);
        const data = res.data?.data ?? [];
        setDashboardData((prev) => ({
          ...prev,
          topUsers: { ...prev.topUsers, [period]: data },
        }));
        setFetchedTopUserPeriods((prev) => ({ ...prev, [period]: true }));
      } catch (error) {
        console.error('Failed to load top users', error);
        setDashboardData((prev) => ({
          ...prev,
          topUsers: { ...prev.topUsers, [period]: [] },
        }));
      } finally {
        setChartLoading((prev) => ({ ...prev, topUsers: false }));
      }
    },
    [fetchedTopUserPeriods, fetchedTopUsersMonthly, getRangeForPeriod, topUsersMonth]
  );

  const loadWordCloud = useCallback(
    async (period: PeriodKey, options?: { force?: boolean }) => {
      if (!options?.force && fetchedWordPeriods[period]) return;
      setChartLoading((prev) => ({ ...prev, wordCloud: true }));

      const range = getRangeForPeriod(period);
      const startCompact = range.startDate.replace(/-/g, '');
      const endCompact = range.endDate.replace(/-/g, '');
      const resolveFallbackWords = (prevWords?: any[]) => {
        const cached = wordCloudFallbackRef.current[period] ?? [];
        if (cached.length > 0) return cached;
        if (prevWords && prevWords.length > 0) return prevWords;
        return WORD_CLOUD_FALLBACK[period];
      };
      const mapKeywords = (items: any[] | undefined) => {
        const mapped =
          items?.map((item: any) => {
            const text = item.text ?? item.keyword ?? item.word ?? item.name;
            const rawValue = item.value ?? item.count ?? item.total ?? item.weight;
            const value = Number.isFinite(Number(rawValue)) ? Number(rawValue) : 0;
            return text ? { text, value } : null;
          }).filter(Boolean) ?? [];
        return mapped;
      };

      if (!getAccessToken()) {
        setDashboardData((prev) => ({
          ...prev,
          wordCloud: { ...prev.wordCloud, [period]: resolveFallbackWords(prev.wordCloud[period]) },
        }));
        setFetchedWordPeriods((prev) => ({ ...prev, [period]: true }));
        setChartLoading((prev) => ({ ...prev, wordCloud: false }));
        return;
      }

      try {
        const res = await fetchTopKeywords(startCompact, endCompact);
        const words = mapKeywords(res.data?.data);
        if (words.length > 0) {
          wordCloudFallbackRef.current = { ...wordCloudFallbackRef.current, [period]: words };
        }
        setDashboardData((prev) => ({
          ...prev,
          wordCloud: { ...prev.wordCloud, [period]: words },
        }));
        setFetchedWordPeriods((prev) => ({ ...prev, [period]: true }));
      } catch (error) {
        if (!isUnauthorizedError(error)) {
          console.error('Failed to load word cloud', error);
        }
        setDashboardData((prev) => {
          const fallbackByPeriod = wordCloudFallbackRef.current[period] ?? [];
          const fallbackFromState = prev.wordCloud[period] ?? [];
          const fallbackFromAny = Object.values(wordCloudFallbackRef.current).find((items) => items.length) ?? [];
          const fallbackWords =
            fallbackByPeriod.length > 0
              ? fallbackByPeriod
              : fallbackFromState.length > 0
              ? fallbackFromState
              : fallbackFromAny.length > 0
              ? fallbackFromAny
              : WORD_CLOUD_FALLBACK[period];
          return {
            ...prev,
            wordCloud: { ...prev.wordCloud, [period]: fallbackWords },
          };
        });
      } finally {
        setChartLoading((prev) => ({ ...prev, wordCloud: false }));
      }
    },
    [fetchTopKeywords, fetchedWordPeriods, getRangeForPeriod]
  );

  const handlePeriodChange = useCallback(
    (period: PeriodKey) => {
      setChartPeriod(period);
      loadLineChart(period);
    },
    [loadLineChart]
  );

  const handlePieChartPeriodChange = useCallback(
    (period: PeriodKey) => {
      setPieChartPeriod(period);
      loadPieChart(period);
    },
    [loadPieChart]
  );

  const handleBarChartPeriodChange = useCallback(
    (period: PeriodKey) => {
      setBarChartPeriod(period);
      loadBarChart(period);
    },
    [loadBarChart]
  );

  const handleActiveUsersPeriodChange = useCallback(
    (period: PeriodKey) => {
      setActiveUsersPeriod(period);
      loadActiveUsersChart(period);
    },
    [loadActiveUsersChart]
  );

  const handleWordCloudPeriodChange = useCallback((period: PeriodKey) => {
    setWordCloudPeriod(period);
    loadWordCloud(period);
  }, [loadWordCloud]);

  const handleTopUsersPeriodChange = useCallback(
    (period: PeriodKey) => {
      setTopUsersPeriod(period);
      if (period === 'monthly') loadTopUsers(period, { month: topUsersMonth });
      else loadTopUsers(period);
    },
    [loadTopUsers, topUsersMonth]
  );

  const handleTopUsersMonthChange = useCallback(
    (month: number) => {
      setTopUsersMonth(month);
      loadTopUsers('monthly', { month });
    },
    [loadTopUsers]
  );

  const loadDashboardData = useCallback(
    async (periods?: {
      chart: PeriodKey;
      pie: PeriodKey;
      bar: PeriodKey;
      active: PeriodKey;
      wordCloud: PeriodKey;
      topUsers: PeriodKey;
    }) => {
      const targetPeriods =
        periods ?? {
          chart: chartPeriod,
          pie: pieChartPeriod,
          bar: barChartPeriod,
          active: activeUsersPeriod,
          wordCloud: wordCloudPeriod,
          topUsers: topUsersPeriod,
        };

      setLoading(true);
      try {
        const updatedStatCards = await updateStatCardsWithMetrics();

        await Promise.all([
          loadLineChart(targetPeriods.chart, { force: !!periods }),
          loadPieChart(targetPeriods.pie, { force: !!periods }),
          loadBarChart(targetPeriods.bar, { force: !!periods }),
          loadActiveUsersChart(targetPeriods.active, { force: !!periods }),
          loadWordCloud(targetPeriods.wordCloud, { force: !!periods }),
          targetPeriods.topUsers === 'monthly'
            ? loadTopUsers(targetPeriods.topUsers, { force: !!periods, month: topUsersMonth })
            : loadTopUsers(targetPeriods.topUsers, { force: !!periods }),
        ]);

        setDashboardData((prev) => ({
          ...prev,
          statCards: updatedStatCards,
        }));
      } catch (error) {
        console.error('Dashboard data load failed:', error);
        const fallbackStatCards = await updateStatCardsWithMetrics();
        setDashboardData((prev) => ({
          ...prev,
          statCards: fallbackStatCards,
        }));
      } finally {
        setLoading(false);
      }
    },
    [
      barChartPeriod,
      chartPeriod,
      pieChartPeriod,
      activeUsersPeriod,
      topUsersPeriod,
      topUsersMonth,
      loadBarChart,
      loadLineChart,
      loadPieChart,
      loadActiveUsersChart,
      loadWordCloud,
      loadTopUsers,
      updateStatCardsWithMetrics,
    ]
  );

  useEffect(() => {
    // 최초 1회 로드
      loadDashboardData({
        chart: chartPeriod,
        pie: pieChartPeriod,
        bar: barChartPeriod,
        active: activeUsersPeriod,
        wordCloud: wordCloudPeriod,
        topUsers: topUsersPeriod,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = useCallback(async () => {
    await loadDashboardData();
  }, [loadDashboardData]);

  return {
    loading,
    chartLoading,
    dashboardData,
    loadDashboardData,
    refreshData,
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
  };
};
