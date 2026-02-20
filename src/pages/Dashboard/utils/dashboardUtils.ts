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

