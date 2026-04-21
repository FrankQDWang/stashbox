import { addMonths, diffInDays, minDate } from '@/utils/date';
import type { ISODateString } from '@/types/common';
import type { ExpiryLevel } from '@/types/item';

export interface ComputeDueDateInput {
  expiryDate?: ISODateString | null;
  openDate?: ISODateString | null;
  afterOpenMonths?: number | null;
}

export function computeDueDate(input: ComputeDueDateInput): ISODateString | null {
  const candidates: ISODateString[] = [];

  if (input.expiryDate) {
    candidates.push(input.expiryDate);
  }

  if (input.openDate && input.afterOpenMonths) {
    const openedDueDate = addMonths(input.openDate, input.afterOpenMonths);

    if (openedDueDate) {
      candidates.push(openedDueDate);
    }
  }

  return candidates.length > 0 ? minDate(candidates) : null;
}

export function getExpiryLevel(
  dueDate?: ISODateString | null,
  today: ISODateString | Date = new Date(),
): ExpiryLevel {
  if (!dueDate) {
    return 'unknown';
  }

  const days = diffInDays(today, dueDate);

  if (days === null) {
    return 'unknown';
  }

  if (days < 0) return 'expired';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'soon';
  return 'safe';
}

export function getExpiryText(
  dueDate?: ISODateString | null,
  today: ISODateString | Date = new Date(),
): string {
  if (!dueDate) {
    return '无到期';
  }

  const days = diffInDays(today, dueDate);

  if (days === null) return '无到期';
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `${days} 天后到期`;
}

export function isRiskExpiryLevel(level: ExpiryLevel): boolean {
  return level === 'expired' || level === 'urgent' || level === 'soon';
}

export function getExpiryLabel(level: ExpiryLevel): string {
  switch (level) {
    case 'expired':
      return '已过期';
    case 'urgent':
      return '7天内';
    case 'soon':
      return '30天内';
    case 'safe':
      return '安全';
    case 'unknown':
      return '无到期';
  }
}

export function getExpiryColor(level: ExpiryLevel): string {
  switch (level) {
    case 'expired':
      return '#ef5350';
    case 'urgent':
      return '#ffa726';
    case 'soon':
      return '#f9a825';
    case 'safe':
      return '#ce93d8';
    case 'unknown':
      return '#bdbdbd';
  }
}
