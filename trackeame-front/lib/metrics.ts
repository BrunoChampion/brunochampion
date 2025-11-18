import { TimeEntry } from './api';

export interface DurationBreakdown {
  seconds: number;
  hours: number;
  minutes: number;
}

export interface HabitMetricPoint {
  date: string;
  label: string;
  totalSeconds: number;
}

export interface HabitMetricSummary {
  weekTotal: DurationBreakdown;
  monthTotal: DurationBreakdown;
  quarterTotal: DurationBreakdown;
  weekSeries: HabitMetricPoint[];
  monthSeries: HabitMetricPoint[];
  quarterSeries: HabitMetricPoint[];
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const weekdayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const dayFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit' });
const monthDayFormatter = new Intl.DateTimeFormat('es-ES', { month: 'short', day: '2-digit' });

const normalizeDate = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (base: Date, days: number) => {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
};

const startOfWeek = (reference: Date) => {
  const date = new Date(reference);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfMonth = (reference: Date) => {
  const date = new Date(reference.getFullYear(), reference.getMonth(), 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfQuarterWindow = (reference: Date) => {
  const date = new Date(reference.getFullYear(), reference.getMonth() - 2, 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDuration = (seconds: number): DurationBreakdown => ({
  seconds,
  hours: Math.floor(seconds / 3600),
  minutes: Math.floor((seconds % 3600) / 60),
});

const resolveDurationSeconds = (entry: TimeEntry) => {
  if (typeof entry.duration === 'number') {
    return entry.duration;
  }

  if (entry.endTime) {
    const start = new Date(entry.startTime).getTime();
    const end = new Date(entry.endTime).getTime();
    return Math.max(0, Math.floor((end - start) / 1000));
  }

  return 0;
};

const filterEntriesInRange = (entries: TimeEntry[], from: Date, to: Date) => {
  const fromTime = from.getTime();
  const toTime = to.getTime();
  return entries.filter((entry) => {
    if (!entry.endTime) return false;
    const entryStart = new Date(entry.startTime).getTime();
    return entryStart >= fromTime && entryStart < toTime;
  });
};

const buildSeries = (
  startDate: Date,
  totalDays: number,
  entries: TimeEntry[],
  labelFormatter: (date: Date) => string,
): HabitMetricPoint[] => {
  const totalsByDay = new Map<number, number>();

  entries.forEach((entry) => {
    const key = normalizeDate(new Date(entry.startTime)).getTime();
    const prev = totalsByDay.get(key) || 0;
    totalsByDay.set(key, prev + resolveDurationSeconds(entry));
  });

  return Array.from({ length: totalDays }).map((_, index) => {
    const pointDate = normalizeDate(addDays(startDate, index));
    const key = pointDate.getTime();
    const totalSeconds = totalsByDay.get(key) || 0;

    return {
      date: pointDate.toISOString(),
      label: labelFormatter(pointDate),
      totalSeconds,
    } satisfies HabitMetricPoint;
  });
};

const daysBetween = (from: Date, to: Date) => Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_IN_MS));

export const buildHabitMetricSummary = (entries: TimeEntry[], referenceDate = new Date()): HabitMetricSummary => {
  const now = new Date(referenceDate);
  const completedEntries = entries.filter((entry) => Boolean(entry.endTime));

  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const monthStart = startOfMonth(now);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const quarterStart = startOfQuarterWindow(now);
  const quarterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const weekEntries = filterEntriesInRange(completedEntries, weekStart, weekEnd);
  const monthEntries = filterEntriesInRange(completedEntries, monthStart, monthEnd);
  const quarterEntries = filterEntriesInRange(completedEntries, quarterStart, quarterEnd);

  const weekTotalSeconds = weekEntries.reduce((sum, entry) => sum + resolveDurationSeconds(entry), 0);
  const monthTotalSeconds = monthEntries.reduce((sum, entry) => sum + resolveDurationSeconds(entry), 0);
  const quarterTotalSeconds = quarterEntries.reduce((sum, entry) => sum + resolveDurationSeconds(entry), 0);

  const weekSeries = buildSeries(weekStart, 7, weekEntries, (date) => weekdayFormatter.format(date));
  const monthSeries = buildSeries(monthStart, daysBetween(monthStart, monthEnd), monthEntries, (date) => dayFormatter.format(date));
  const quarterSeries = buildSeries(
    quarterStart,
    daysBetween(quarterStart, quarterEnd),
    quarterEntries,
    (date) => monthDayFormatter.format(date),
  );

  return {
    weekTotal: toDuration(weekTotalSeconds),
    monthTotal: toDuration(monthTotalSeconds),
    quarterTotal: toDuration(quarterTotalSeconds),
    weekSeries,
    monthSeries,
    quarterSeries,
  };
};
