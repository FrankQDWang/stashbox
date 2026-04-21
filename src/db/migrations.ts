import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION } from '@/db/database';
import { seedDefaultCategories } from '@/db/seed';
import { runWriteTransaction } from '@/db/transaction';

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await runWriteTransaction(db, async (txn) => {
      await txn.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category_id TEXT,
          brand TEXT,
          series TEXT,
          shade TEXT,
          status TEXT NOT NULL DEFAULT 'unopened',
          remaining_percent INTEGER DEFAULT 100,
          purchase_date TEXT,
          purchase_price REAL,
          purchase_channel TEXT,
          expiry_date TEXT,
          open_date TEXT,
          after_open_months INTEGER,
          computed_due_date TEXT,
          storage_location TEXT,
          repurchase_rating INTEGER,
          notes TEXT,
          is_archived INTEGER DEFAULT 0,
          favorite INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS item_images (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          local_uri TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
        CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
        CREATE INDEX IF NOT EXISTS idx_items_due_date ON items(computed_due_date);
        CREATE INDEX IF NOT EXISTS idx_items_archived ON items(is_archived);
        CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);

        PRAGMA user_version = ${DATABASE_VERSION};
      `);
    });
  }

  await seedDefaultCategories(db);
}
