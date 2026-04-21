import { getExpiryLevel } from '@/domain/expiry';
import type { ExpiryLevel, ItemWithImages } from '@/types/item';

export type HomeRiskGroups = Record<'expired' | 'urgent' | 'soon', ItemWithImages[]>;

export type InventorySortMode = 'due_first' | 'latest';

export function sortItemsByDueDate(items: ItemWithImages[]): ItemWithImages[] {
  return [...items].sort((a, b) => {
    if (!a.computedDueDate && !b.computedDueDate) {
      return b.createdAt.localeCompare(a.createdAt);
    }

    if (!a.computedDueDate) return 1;
    if (!b.computedDueDate) return -1;

    const dueCompare = a.computedDueDate.localeCompare(b.computedDueDate);
    return dueCompare === 0 ? b.createdAt.localeCompare(a.createdAt) : dueCompare;
  });
}

export function sortItemsByLatest(items: ItemWithImages[]): ItemWithImages[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function sortInventoryItems(
  items: ItemWithImages[],
  sortMode: InventorySortMode,
): ItemWithImages[] {
  return sortMode === 'latest' ? sortItemsByLatest(items) : sortItemsByDueDate(items);
}

export function groupHomeRiskItems(
  items: ItemWithImages[],
  today: string,
): HomeRiskGroups {
  const groups: HomeRiskGroups = {
    expired: [],
    urgent: [],
    soon: [],
  };

  sortItemsByDueDate(items).forEach((item) => {
    const level = getExpiryLevel(item.computedDueDate, today);

    if (isHomeRiskLevel(level)) {
      groups[level].push(item);
    }
  });

  return groups;
}

function isHomeRiskLevel(level: ExpiryLevel): level is keyof HomeRiskGroups {
  return level === 'expired' || level === 'urgent' || level === 'soon';
}
