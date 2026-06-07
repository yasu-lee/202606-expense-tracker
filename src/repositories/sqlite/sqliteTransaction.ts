import type { SQLiteDatabase } from 'expo-sqlite';

type SQLiteTransactionRunner = Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'>;
type TransactionCapableDatabase = SQLiteDatabase & {
  withExclusiveTransactionAsync(task: (txn: SQLiteTransactionRunner) => Promise<void>): Promise<void>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
};

export const runSQLiteTransactionForPlatform = async (
  db: TransactionCapableDatabase,
  platformOS: string,
  task: (txn: SQLiteTransactionRunner) => Promise<void>,
): Promise<void> => {
  if (platformOS !== 'web') {
    await db.withExclusiveTransactionAsync(task);
    return;
  }

  await db.withTransactionAsync(async () => {
    await task(db);
  });
};
