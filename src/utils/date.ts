import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import type { ISODateString } from '@/types/common';

dayjs.extend(customParseFormat);

export type DateInput = string | Date;

export function isDateOnlyString(value: string): boolean {
  return dayjs(value, 'YYYY-MM-DD', true).isValid();
}

export function toDateOnly(input: DateInput): ISODateString {
  if (typeof input === 'string' && isDateOnlyString(input)) {
    return input;
  }

  return dayjs(input).format('YYYY-MM-DD');
}

export function todayDateOnly(): ISODateString {
  return dayjs().format('YYYY-MM-DD');
}

export function addDays(input: DateInput, days: number): ISODateString {
  return dayjs(toDateOnly(input)).add(days, 'day').format('YYYY-MM-DD');
}

export function addYears(input: DateInput, years: number): ISODateString {
  return dayjs(toDateOnly(input)).add(years, 'year').format('YYYY-MM-DD');
}

export function diffInDays(from: DateInput, to: DateInput): number | null {
  const fromDate = dayjs(toDateOnly(from));
  const toDate = dayjs(toDateOnly(to));

  if (!fromDate.isValid() || !toDate.isValid()) {
    return null;
  }

  return toDate.startOf('day').diff(fromDate.startOf('day'), 'day');
}

export function addMonths(input: DateInput, months: number): ISODateString | null {
  const date = dayjs(toDateOnly(input));

  if (!date.isValid() || !Number.isFinite(months)) {
    return null;
  }

  return date.add(months, 'month').format('YYYY-MM-DD');
}

export function minDate(dates: DateInput[]): ISODateString | null {
  const normalized = dates
    .map((date) => toDateOnly(date))
    .filter((date) => dayjs(date, 'YYYY-MM-DD', true).isValid())
    .sort();

  return normalized[0] ?? null;
}
