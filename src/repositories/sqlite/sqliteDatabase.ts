import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { dummyCategories, dummyExpenseShares, dummyExpenses, dummyUsers } from '../../domain/dummyData';
import { runSQLiteTransactionForPlatform } from './sqliteTransaction';

export const DATABASE_NAME = 'expense-tracker-mobile-mvp.db';

export const openExpenseDatabase = async (databaseName: string = DATABASE_NAME, platformOS: string = 'native'): Promise<SQLiteDatabase> => {
  const db = await openDatabaseAsync(databaseName);
  await migrateExpenseDatabase(db);
  await seedInitialData(db, platformOS);
  return db;
};

export const migrateExpenseDatabase = async (db: SQLiteDatabase): Promise<void> => {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      default_currency TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      amount_krw INTEGER NOT NULL,
      currency TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      date TEXT NOT NULL,
      paid_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      type TEXT NOT NULL,
      context TEXT NOT NULL,
      memo TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_shares (
      id TEXT PRIMARY KEY NOT NULL,
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      share_amount_krw INTEGER NOT NULL,
      settlement_status TEXT NOT NULL,
      settled_amount_krw INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expense_shares_expense_id ON expense_shares(expense_id);
  `);
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'schema_version', '1');
};

const seedInitialData = async (db: SQLiteDatabase, platformOS: string): Promise<void> => {
  await runSQLiteTransactionForPlatform(db, platformOS, async (txn) => {
    for (const user of dummyUsers) {
      await txn.runAsync(
        'INSERT OR IGNORE INTO users (id, name, default_currency) VALUES (?, ?, ?)',
        user.id,
        user.name,
        user.defaultCurrency,
      );
    }

    for (const category of dummyCategories) {
      await txn.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, color) VALUES (?, ?, ?)',
        category.id,
        category.name,
        category.color ?? null,
      );
    }

    const expenseCount = await txn.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM expenses');
    if ((expenseCount?.count ?? 0) > 0) {
      return;
    }

    for (const expense of dummyExpenses) {
      await txn.runAsync(
        `INSERT INTO expenses (
          id, title, amount_krw, currency, category_id, date, paid_by, type, context, memo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        expense.id,
        expense.title,
        expense.amountKRW,
        expense.currency,
        expense.categoryId,
        expense.date,
        expense.paidBy,
        expense.type,
        expense.context,
        expense.memo ?? null,
        expense.createdAt,
        expense.updatedAt,
      );
    }

    for (const share of dummyExpenseShares) {
      await txn.runAsync(
        `INSERT INTO expense_shares (
          id, expense_id, user_id, share_amount_krw, settlement_status, settled_amount_krw, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        share.id,
        share.expenseId,
        share.userId,
        share.shareAmountKRW,
        share.settlementStatus,
        share.settledAmountKRW,
        share.createdAt,
      );
    }
  });
};
