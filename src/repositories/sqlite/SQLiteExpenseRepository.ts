import type { SQLiteDatabase } from 'expo-sqlite';
import { buildExpenseWithShares } from '../../domain/expenseFactory';
import { applySettlementAmount } from '../../domain/settlement';
import { Category, CreateExpenseInput, Expense, ExpenseShare, User } from '../../domain/types';
import { ExpenseRepository } from '../ExpenseRepository';
import { runSQLiteTransactionForPlatform } from './sqliteTransaction';

type UserRow = { id: string; name: string; default_currency: User['defaultCurrency'] };
type CategoryRow = { id: string; name: string; color: string | null };
type ExpenseRow = {
  id: string;
  title: string;
  amount_krw: number;
  currency: Expense['currency'];
  category_id: string;
  date: string;
  paid_by: string;
  type: Expense['type'];
  context: Expense['context'];
  memo: string | null;
  created_at: string;
  updated_at: string;
};
type ExpenseShareRow = {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount_krw: number;
  settlement_status: ExpenseShare['settlementStatus'];
  settled_amount_krw: number;
  created_at: string;
};

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  defaultCurrency: row.default_currency,
});

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  ...(row.color ? { color: row.color } : {}),
});

const toExpense = (row: ExpenseRow): Expense => ({
  id: row.id,
  title: row.title,
  amountKRW: row.amount_krw,
  currency: row.currency,
  categoryId: row.category_id,
  date: row.date,
  paidBy: row.paid_by,
  type: row.type,
  context: row.context,
  ...(row.memo ? { memo: row.memo } : {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toExpenseShare = (row: ExpenseShareRow): ExpenseShare => ({
  id: row.id,
  expenseId: row.expense_id,
  userId: row.user_id,
  shareAmountKRW: row.share_amount_krw,
  settlementStatus: row.settlement_status,
  settledAmountKRW: row.settled_amount_krw,
  createdAt: row.created_at,
});

export class SQLiteExpenseRepository implements ExpenseRepository {
  constructor(private readonly db: SQLiteDatabase, private readonly platformOS: string = 'native') {}

  async getCurrentUser() {
    const row = await this.db.getFirstAsync<UserRow>('SELECT id, name, default_currency FROM users ORDER BY rowid LIMIT 1');
    if (!row) {
      throw new Error('Current user seed data is missing.');
    }
    return toUser(row);
  }

  async listUsers() {
    const rows = await this.db.getAllAsync<UserRow>('SELECT id, name, default_currency FROM users ORDER BY rowid');
    return rows.map(toUser);
  }

  async listCategories() {
    const rows = await this.db.getAllAsync<CategoryRow>('SELECT id, name, color FROM categories ORDER BY rowid');
    return rows.map(toCategory);
  }

  async listExpensesByMonth(month: string) {
    const rows = await this.db.getAllAsync<ExpenseRow>(
      `SELECT id, title, amount_krw, currency, category_id, date, paid_by, type, context, memo, created_at, updated_at
       FROM expenses
       WHERE date LIKE ?
       ORDER BY date DESC, created_at DESC`,
      `${month}%`,
    );
    return rows.map(toExpense);
  }

  async listSharesByExpenseIds(expenseIds: string[]) {
    if (expenseIds.length === 0) {
      return [];
    }
    const placeholders = expenseIds.map(() => '?').join(', ');
    const rows = await this.db.getAllAsync<ExpenseShareRow>(
      `SELECT id, expense_id, user_id, share_amount_krw, settlement_status, settled_amount_krw, created_at
       FROM expense_shares
       WHERE expense_id IN (${placeholders})
       ORDER BY rowid`,
      ...expenseIds,
    );
    return rows.map(toExpenseShare);
  }

  async createExpenseWithShares(input: CreateExpenseInput) {
    const currentUser = await this.getCurrentUser();
    const aggregate = buildExpenseWithShares(input, currentUser.id, new Date().toISOString(), createId);

    await runSQLiteTransactionForPlatform(this.db, this.platformOS, async (txn) => {
      await txn.runAsync(
        `INSERT INTO expenses (
          id, title, amount_krw, currency, category_id, date, paid_by, type, context, memo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        aggregate.expense.id,
        aggregate.expense.title,
        aggregate.expense.amountKRW,
        aggregate.expense.currency,
        aggregate.expense.categoryId,
        aggregate.expense.date,
        aggregate.expense.paidBy,
        aggregate.expense.type,
        aggregate.expense.context,
        aggregate.expense.memo ?? null,
        aggregate.expense.createdAt,
        aggregate.expense.updatedAt,
      );

      for (const share of aggregate.shares) {
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

    return aggregate;
  }

  async updateShareSettlement(shareId: string, settledAmountKRW: number) {
    const row = await this.db.getFirstAsync<ExpenseShareRow>(
      `SELECT id, expense_id, user_id, share_amount_krw, settlement_status, settled_amount_krw, created_at
       FROM expense_shares
       WHERE id = ?`,
      shareId,
    );
    if (!row) {
      throw new Error('Expense share not found.');
    }

    const updatedShare = applySettlementAmount(toExpenseShare(row), settledAmountKRW);
    await this.db.runAsync(
      'UPDATE expense_shares SET settlement_status = ?, settled_amount_krw = ? WHERE id = ?',
      updatedShare.settlementStatus,
      updatedShare.settledAmountKRW,
      updatedShare.id,
    );
    return updatedShare;
  }
}
