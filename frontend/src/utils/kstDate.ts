export const KST_TIME_ZONE = 'Asia/Seoul';

export interface CalendarDay {
  dateKey: string;
  day: number;
  weekday: number;
}

export const getKstDateParts = (date: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? '0'),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? '0'),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? '0'),
  };
};

export const toDateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
};

export const getWeekday = (dateKey: string): number => {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

export const addDaysToDateKey = (dateKey: string, days: number): string => {
  const { year, month, day } = parseDateKey(dateKey);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return toDateKey(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
};

export const getMostRecentSaturdayKey = (): string => {
  const { year, month, day } = getKstDateParts();
  const todayKey = toDateKey(year, month, day);
  const weekday = getWeekday(todayKey);
  const daysBack = weekday === 6 ? 0 : weekday + 1;
  return addDaysToDateKey(todayKey, -daysBack);
};

export const formatKstSaturdayLabel = (dateKey: string): string => {
  const { year, month, day } = parseDateKey(dateKey);
  return `${year}년 ${month}월 ${day}일 (토)`;
};

export const buildCalendarGrid = (year: number, month: number): (CalendarDay | null)[] => {
  const firstDayOfWeek = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const grid: (CalendarDay | null)[] = Array(firstDayOfWeek).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push({
      dateKey: toDateKey(year, month + 1, day),
      day,
      weekday: new Date(Date.UTC(year, month, day)).getUTCDay(),
    });
  }

  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
};
