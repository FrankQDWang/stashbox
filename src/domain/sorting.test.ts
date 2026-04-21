import { groupHomeRiskItems, sortInventoryItems, sortItemsByDueDate } from '@/domain/sorting';
import type { ItemWithImages } from '@/types/item';

function item(id: string, dueDate: string | null, createdAt: string): ItemWithImages {
  return {
    id,
    name: id,
    categoryId: null,
    brand: null,
    series: null,
    shade: null,
    status: 'unopened',
    remainingPercent: 100,
    purchaseDate: null,
    purchasePrice: null,
    purchaseChannel: null,
    expiryDate: dueDate,
    openDate: null,
    afterOpenMonths: null,
    computedDueDate: dueDate,
    storageLocation: null,
    repurchaseRating: null,
    notes: null,
    isArchived: false,
    favorite: false,
    createdAt,
    updatedAt: createdAt,
    images: [],
    category: null,
  };
}

describe('sorting', () => {
  const items = [
    item('unknown', null, '2026-04-22T00:00:00.000Z'),
    item('soon', '2026-05-01', '2026-04-20T00:00:00.000Z'),
    item('expired', '2026-04-20', '2026-04-19T00:00:00.000Z'),
    item('urgent', '2026-04-24', '2026-04-21T00:00:00.000Z'),
  ];

  it('sorts due dates ascending and unknown last', () => {
    expect(sortItemsByDueDate(items).map((entry) => entry.id)).toEqual([
      'expired',
      'urgent',
      'soon',
      'unknown',
    ]);
  });

  it('sorts latest first', () => {
    expect(sortInventoryItems(items, 'latest').map((entry) => entry.id)).toEqual([
      'unknown',
      'urgent',
      'soon',
      'expired',
    ]);
  });

  it('groups home risk items by level', () => {
    const groups = groupHomeRiskItems(items, '2026-04-21');

    expect(groups.expired.map((entry) => entry.id)).toEqual(['expired']);
    expect(groups.urgent.map((entry) => entry.id)).toEqual(['urgent']);
    expect(groups.soon.map((entry) => entry.id)).toEqual(['soon']);
  });
});
