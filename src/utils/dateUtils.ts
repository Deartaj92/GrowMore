export type DateInput = Date | string | number | null | undefined;

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_PATTERN = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

const pad = (value: number) => value.toString().padStart(2, '0');

export const parseDateInput = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  const dateOnlyMatch = normalized.match(DATE_ONLY_PATTERN);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const displayMatch = normalized.match(DISPLAY_DATE_PATTERN);
  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatAppDate = (
  value: DateInput,
  fallback: string = '-'
): string => {
  const parsed = parseDateInput(value);
  if (!parsed) return fallback;

  return `${pad(parsed.getDate())}-${pad(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
};

export const formatAppDateTime = (
  value: DateInput,
  fallback: string = '-'
): string => {
  const parsed = parseDateInput(value);
  if (!parsed) return fallback;

  return `${formatAppDate(parsed, fallback)} ${formatAppTime(parsed, fallback)}`;
};

export const formatAppTime = (
  value: DateInput,
  fallback: string = '-'
): string => {
  const parsed = parseDateInput(value);
  if (!parsed) return fallback;

  let hours = parsed.getHours();
  const minutes = pad(parsed.getMinutes());
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${meridiem}`;
};

export const formatAppDateForFilename = (
  value: DateInput,
  fallback: string = 'date'
): string => {
  const formatted = formatAppDate(value, '');
  return formatted || fallback;
};
