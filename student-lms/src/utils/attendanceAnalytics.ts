export type AttendanceRecord = {
  id: number;
  date: string;
  status: string;
  remarks?: string | null;
};

export type HalfLeaveRecord = {
  date: string;
  leave_type?: string;
  arrival_time?: string;
  departure_time?: string;
};

export type AttendanceStats = {
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  percentage: number;
  halfLeaves: number;
};

export type StatusBarItem = {
  key: string;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type MonthBucket = {
  key: string;
  label: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  rate: number;
};

export type WeekDayBucket = {
  label: string;
  date: string;
  status: string | null;
};

export type AttendanceAnalytics = {
  stats: AttendanceStats;
  statusBars: StatusBarItem[];
  monthly: MonthBucket[];
  currentMonth: MonthBucket | null;
  last7Days: WeekDayBucket[];
  presentStreak: number;
  insights: {
    bestMonth: MonthBucket | null;
    needsAttention: string | null;
    daysMarkedThisMonth: number;
  };
};

const STATUS_COLORS: Record<string, string> = {
  present: 'var(--status-present)',
  absent: 'var(--status-absent)',
  late: 'var(--status-late)',
  leave: 'var(--status-leave)',
};

function calcRate(present: number, late: number, leave: number, total: number) {
  if (total === 0) return 0;
  return Math.round(((present + late + leave) / total) * 100);
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function emptyMonth(key: string): MonthBucket {
  return {
    key,
    label: monthLabel(key),
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
    rate: 0,
  };
}

function addToMonth(bucket: MonthBucket, status: string) {
  bucket.total++;
  if (status === 'present') bucket.present++;
  else if (status === 'absent') bucket.absent++;
  else if (status === 'late') bucket.late++;
  else if (status === 'leave') bucket.leave++;
  bucket.rate = calcRate(bucket.present, bucket.late, bucket.leave, bucket.total);
}

export function computeAttendanceAnalytics(
  records: AttendanceRecord[],
  halfLeaves: HalfLeaveRecord[]
): AttendanceAnalytics {
  const stats: AttendanceStats = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: records.length,
    percentage: 0,
    halfLeaves: halfLeaves.length,
  };

  const monthMap = new Map<string, MonthBucket>();

  records.forEach((r) => {
    const status = r.status.toLowerCase();
    if (status === 'present') stats.present++;
    else if (status === 'absent') stats.absent++;
    else if (status === 'late') stats.late++;
    else if (status === 'leave') stats.leave++;

    const monthKey = r.date.slice(0, 7);
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, emptyMonth(monthKey));
    addToMonth(monthMap.get(monthKey)!, status);
  });

  stats.percentage = calcRate(stats.present, stats.late, stats.leave, stats.total);

  const statusBars: StatusBarItem[] = [
    { key: 'present', label: 'Present', count: stats.present, percent: 0, color: STATUS_COLORS.present },
    { key: 'absent', label: 'Absent', count: stats.absent, percent: 0, color: STATUS_COLORS.absent },
    { key: 'late', label: 'Late', count: stats.late, percent: 0, color: STATUS_COLORS.late },
    { key: 'leave', label: 'Leave', count: stats.leave, percent: 0, color: STATUS_COLORS.leave },
  ].map((item) => ({
    ...item,
    percent: stats.total ? Math.round((item.count / stats.total) * 100) : 0,
  }));

  const monthly = Array.from(monthMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6);

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = monthMap.get(currentKey) ?? null;

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const recordByDate = new Map(records.map((r) => [r.date, r.status.toLowerCase()]));
  const last7Days: WeekDayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateStr(d);
    last7Days.push({
      label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      date: dateStr,
      status: recordByDate.get(dateStr) ?? null,
    });
  }

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  let presentStreak = 0;
  for (const r of sorted) {
    if (r.status.toLowerCase() === 'present') presentStreak++;
    else break;
  }

  const withData = monthly.filter((m) => m.total > 0);
  const bestMonth =
    withData.length > 0
      ? withData.reduce((best, m) => (m.rate > best.rate ? m : best), withData[0])
      : null;

  let needsAttention: string | null = null;
  if (stats.absent > stats.late && stats.absent > 0) {
    needsAttention = `${stats.absent} absent day${stats.absent === 1 ? '' : 's'} this session`;
  } else if (stats.late > 0) {
    needsAttention = `${stats.late} late arrival${stats.late === 1 ? '' : 's'} recorded`;
  }

  return {
    stats,
    statusBars,
    monthly,
    currentMonth,
    last7Days,
    presentStreak,
    insights: {
      bestMonth,
      needsAttention,
      daysMarkedThisMonth: currentMonth?.total ?? 0,
    },
  };
}
