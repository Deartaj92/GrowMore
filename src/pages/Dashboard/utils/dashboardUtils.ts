import { StatusType } from '../types';

export function isNoSessionError(error: any): boolean {
  return (
    error &&
    (
      error.code === 'PGRST116' ||
      error.message?.includes('multiple (or no) rows returned') ||
      error.details?.includes('contains 0 rows')
    )
  );
}

/** True when `dob` (YYYY-MM-DD or ISO) falls on today's calendar month/day (local). */
export function isDobAnniversaryToday(dob: string | null | undefined): boolean {
  if (!dob || typeof dob !== 'string') return false;
  const datePart = dob.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length < 3) return false;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!month || !day || Number.isNaN(month) || Number.isNaN(day)) return false;
  const now = new Date();
  return now.getMonth() + 1 === month && now.getDate() === day;
}

/** Completed years on the given reference date (local calendar). */
export function ageCompletedYearsOnDate(dobIso: string, ref: Date = new Date()): number {
  const datePart = dobIso.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length < 3) return 0;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!y || !m || !d) return 0;
  const birth = new Date(y, m - 1, d);
  let age = ref.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    ref.getMonth() < birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return Math.max(0, age);
}

export const compareClassNames = (a: string, b: string): number => {
  // Extract numbers from class names (e.g., "Class 1", "1st", "10th", etc.)
  const getClassNumber = (className: string): number => {
    const match = className.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const numA = getClassNumber(a);
  const numB = getClassNumber(b);

  // If both have numbers, compare numerically
  if (numA !== 0 && numB !== 0) {
    return numA - numB;
  }

  // If only one has a number, prioritize it
  if (numA !== 0) return -1;
  if (numB !== 0) return 1;

  // If neither has numbers, compare alphabetically
  return a.localeCompare(b);
};

export const formatCurrency = (value: number): string => {
  return `Rs. ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

export const getStatus = (percent: number, isPositive: boolean = false): StatusType => {
  if (isPositive) {
    if (percent >= 80) return 'good';
    if (percent >= 50) return 'warning';
    return 'bad';
  } else {
    if (percent <= 10) return 'good';
    if (percent <= 30) return 'warning';
    return 'bad';
  }
};

export const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: lastDay.toISOString().slice(0, 10)
  };
};

