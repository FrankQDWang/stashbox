import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

export async function runWriteTransaction(
  db: SQLiteDatabase,
  task: (txn: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  if (Platform.OS === 'web') {
    await db.withTransactionAsync(async () => {
      await task(db);
    });
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    await task(txn as SQLiteDatabase);
  });
}
