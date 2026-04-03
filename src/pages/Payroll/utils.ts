import type { KeyboardEvent, WheelEvent } from 'react';

export const roundPayrollAmount = (
  amount: number | undefined | null,
  roundUpAmounts: boolean = false
): number => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 0;
  }

  return roundUpAmounts ? Math.ceil(amount) : amount;
};

export const formatPayrollCurrency = (
  amount: number | undefined | null,
  roundUpAmounts: boolean = false
): string => {
  const normalizedAmount = roundPayrollAmount(amount, roundUpAmounts);

  if (roundUpAmounts) {
    return `Rs. ${normalizedAmount.toLocaleString('en-IN')}`;
  }

  return `Rs. ${normalizedAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatPayrollDate = (dateValue?: string | null): string => {
  if (!dateValue) return '-';

  const normalized = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
  const parts = normalized.split('-');
  if (parts.length !== 3) return dateValue;

  const [year, month, day] = parts;
  if (!year || !month || !day) return dateValue;

  return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
};

export const isoToDisplayDate = (dateValue?: string | null): string => {
  if (!dateValue) return '';
  return formatPayrollDate(dateValue);
};

export const displayToIsoDate = (displayValue: string): string => {
  const cleaned = displayValue.trim();
  if (!cleaned) return '';

  const match = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return cleaned;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const isValidDisplayDate = (displayValue: string): boolean => {
  if (!displayValue.trim()) return false;

  const match = displayValue.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return false;

  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export const payrollAmountInputSx = {
  '& input[type=number]': {
    MozAppearance: 'textfield',
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
};

export const blockNumberArrowKey = (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
  }
};

export const blockNumberWheelChange = (event: WheelEvent<HTMLInputElement>) => {
  const target = event.target as HTMLInputElement | null;
  if (target && typeof target.blur === 'function') {
    target.blur();
  }

  const activeElement = document.activeElement as HTMLElement | null;
  if (activeElement && typeof activeElement.blur === 'function') {
    activeElement.blur();
  }

  event.preventDefault();
};
