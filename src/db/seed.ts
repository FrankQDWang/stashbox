import type { SQLiteDatabase } from 'expo-sqlite';

import { runWriteTransaction } from '@/db/transaction';

const DEFAULT_CATEGORIES = [
  { id: 'cat_skincare', name: '护肤', icon: '🧴', sortOrder: 0 },
  { id: 'cat_makeup', name: '彩妆', icon: '💄', sortOrder: 1 },
  { id: 'cat_perfume', name: '香水', icon: '🌸', sortOrder: 2 },
  { id: 'cat_haircare', name: '美发', icon: '💇‍♀️', sortOrder: 3 },
  { id: 'cat_bodycare', name: '身体护理', icon: '🛁', sortOrder: 4 },
  { id: 'cat_jewelry', name: '首饰', icon: '💍', sortOrder: 5 },
  { id: 'cat_accessory', name: '饰品', icon: '🎀', sortOrder: 6 },
  { id: 'cat_bag_accessory', name: '包包配件', icon: '👜', sortOrder: 7 },
  { id: 'cat_clothing_small', name: '服饰小件', icon: '👗', sortOrder: 8 },
  { id: 'cat_supplies', name: '囤货耗材', icon: '📦', sortOrder: 9 },
  { id: 'cat_other', name: '其他', icon: '✨', sortOrder: 10 },
] as const;

export async function seedDefaultCategories(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  await runWriteTransaction(db, async (txn) => {
    for (const category of DEFAULT_CATEGORIES) {
      await txn.runAsync(
        `
        INSERT OR IGNORE INTO categories (id, name, icon, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        category.id,
        category.name,
        category.icon,
        category.sortOrder,
        now,
      );
    }
  });
}
