import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryWithCount } from '@/types/category';

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
  created_at: string;
}

interface CategoryWithCountRow extends CategoryRow {
  active_count: number;
}

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC',
  );

  return rows.map(mapCategoryRow);
}

export async function getCategoryById(
  db: SQLiteDatabase,
  id: string,
): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>(
    'SELECT * FROM categories WHERE id = ? LIMIT 1',
    id,
  );

  return row ? mapCategoryRow(row) : null;
}

export async function listCategoriesWithActiveCount(
  db: SQLiteDatabase,
): Promise<CategoryWithCount[]> {
  const rows = await db.getAllAsync<CategoryWithCountRow>(`
    SELECT
      c.*,
      COUNT(i.id) AS active_count
    FROM categories c
    LEFT JOIN items i
      ON i.category_id = c.id
      AND i.is_archived = 0
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.created_at ASC
  `);

  return rows.map((row) => ({
    ...mapCategoryRow(row),
    activeCount: row.active_count,
  }));
}

export async function countCategories(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');
  return row?.count ?? 0;
}

function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}
