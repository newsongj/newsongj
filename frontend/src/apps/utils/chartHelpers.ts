import type { PeriodKey } from '@/hooks/dashboard';

export type { PeriodKey };

export const periodLabels: Record<PeriodKey, string> = {
  weekly: '주간',
  'monthly-overview': '월간',
  monthly: '연간',
};

export const formatPeriodLabel = (period: PeriodKey, label: any) => {
  if (period === 'weekly') return String(label);
  if (period === 'monthly-overview') return `${label}일`;
  return `${label}월`;
};

export const getStrokeByPeriod = (period: PeriodKey) =>
  period === 'weekly' ? '#10b981' : period === 'monthly-overview' ? '#f59e0b' : '#2563eb';

export const buildAxis = (data: any[], key: 'value' | 'costValue') => {
  if (!data.length) {
    return { domain: [0, 100] as [number, number], ticks: [0, 100] };
  }

  const getNiceStep = (range: number, targetTicks: number = 6) => {
    if (range <= 0) return 1;
    const rough = range / targetTicks;
    const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    const candidates = [1, 2, 5, 10].map((c) => c * pow10);
    const step = candidates.find((c) => rough <= c) ?? candidates[candidates.length - 1];
    const minStep = 10;
    return Math.max(step || 1, minStep);
  };

  const values = data.map((d) => d[key] ?? 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;
  const step = getNiceStep(range);
  const minBase = Math.max(0, Math.floor(minVal / step) * step);
  let maxBase = Math.ceil(maxVal / step) * step;
  if (maxBase === minBase) maxBase = minBase + step;
  const ticks: number[] = [];
  for (let v = minBase; v <= maxBase + 1e-9; v += step) {
    ticks.push(Math.round(v));
  }
  return { domain: [minBase, maxBase] as [number, number], ticks };
};
