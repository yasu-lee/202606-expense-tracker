import { buildMonthlySummary } from '../src/domain/calculations';
import { SQLiteExpenseRepository } from '../src/repositories/sqlite/SQLiteExpenseRepository';
import { runSQLiteTransactionForPlatform } from '../src/repositories/sqlite/sqliteTransaction';

type UserRow = { id: string; name: string; default_currency: 'KRW' };
type CategoryRow = { id: string; name: string; color: string | null };
type ExpenseRow = {
  id: string;
  title: string;
  amount_krw: number;
  currency: 'KRW';
  category_id: string;
  date: string;
  paid_by: string;
  type: 'PERSONAL' | 'SHARED';
  context: 'DAILY' | 'MEETING';
  memo: string | null;
  created_at: string;
  updated_at: string;
};
type ShareRow = {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount_krw: number;
  settlement_status: 'PENDING' | 'PARTIAL' | 'DONE';
  settled_amount_krw: number;
  created_at: string;
};

class FakeSQLiteDatabase {
  users: UserRow[] = [
    { id: 'user-minji', name: '민지', default_currency: 'KRW' },
    { id: 'user-jisoo', name: '지수', default_currency: 'KRW' },
  ];
  categories: CategoryRow[] = [{ id: 'cafe', name: '카페', color: null }];
  expenses: ExpenseRow[] = [];
  shares: ShareRow[] = [];

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    if (source.includes('FROM users')) {
      return (this.users[0] ?? null) as T | null;
    }
    if (source.includes('FROM expense_shares') && source.includes('WHERE id = ?')) {
      return (this.shares.find((share) => share.id === params[0]) ?? null) as T | null;
    }
    return null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    if (source.includes('FROM users')) {
      return this.users as T[];
    }
    if (source.includes('FROM categories')) {
      return this.categories as T[];
    }
    if (source.includes('FROM expenses')) {
      const month = String(params[0] ?? '').replace('%', '');
      return this.expenses.filter((expense) => expense.date.startsWith(month)) as T[];
    }
    if (source.includes('FROM expense_shares')) {
      const expenseIds = new Set(params.map(String));
      return this.shares.filter((share) => expenseIds.has(share.expense_id)) as T[];
    }
    return [];
  }

  async runAsync(source: string, ...params: unknown[]) {
    if (source.includes('INSERT INTO expenses')) {
      this.expenses.unshift({
        id: String(params[0]),
        title: String(params[1]),
        amount_krw: Number(params[2]),
        currency: 'KRW',
        category_id: String(params[4]),
        date: String(params[5]),
        paid_by: String(params[6]),
        type: params[7] as 'PERSONAL' | 'SHARED',
        context: params[8] as 'DAILY' | 'MEETING',
        memo: params[9] === null ? null : String(params[9]),
        created_at: String(params[10]),
        updated_at: String(params[11]),
      });
    }
    if (source.includes('INSERT INTO expense_shares')) {
      this.shares.unshift({
        id: String(params[0]),
        expense_id: String(params[1]),
        user_id: String(params[2]),
        share_amount_krw: Number(params[3]),
        settlement_status: params[4] as 'PENDING' | 'PARTIAL' | 'DONE',
        settled_amount_krw: Number(params[5]),
        created_at: String(params[6]),
      });
    }
    if (source.includes('UPDATE expense_shares')) {
      const shareId = String(params[2]);
      this.shares = this.shares.map((share) =>
        share.id === shareId
          ? { ...share, settlement_status: params[0] as ShareRow['settlement_status'], settled_amount_krw: Number(params[1]) }
          : share,
      );
    }
    return { changes: 1, lastInsertRowId: 0 };
  }

  async withExclusiveTransactionAsync(task: (txn: FakeSQLiteDatabase) => Promise<void>) {
    await task(this);
  }

  async withTransactionAsync(task: () => Promise<void>) {
    await task();
  }
}

describe('SQLiteExpenseRepository contract', () => {
  it('creates, reopens, reads, and settles an expense through the SQLite adapter shape', async () => {
    const db = new FakeSQLiteDatabase();
    const firstRepository = new SQLiteExpenseRepository(db as never);
    const created = await firstRepository.createExpenseWithShares({
      title: '재실행 후 남는 커피',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-jisoo'],
      splitMethod: 'EQUAL',
    });

    const reopenedRepository = new SQLiteExpenseRepository(db as never);
    const expenses = await reopenedRepository.listExpensesByMonth('2026-06');
    const shares = await reopenedRepository.listSharesByExpenseIds([created.expense.id]);

    expect(expenses).toHaveLength(1);
    expect(shares).toHaveLength(1);
    expect(buildMonthlySummary(expenses, shares, 'user-minji', '2026-06')).toMatchObject({
      totalPaidKRW: 5600,
      actualSpentKRW: 0,
      receivableKRW: 5600,
    });

    const shareId = shares[0]?.id ?? '';
    await reopenedRepository.updateShareSettlement(shareId, 3000);
    const partialShares = await reopenedRepository.listSharesByExpenseIds([created.expense.id]);
    expect(partialShares[0]).toMatchObject({ settlementStatus: 'PARTIAL', settledAmountKRW: 3000 });
    expect(buildMonthlySummary(expenses, partialShares, 'user-minji', '2026-06')).toMatchObject({
      totalPaidKRW: 5600,
      actualSpentKRW: 0,
      receivableKRW: 2600,
    });
  });

  it('uses web-safe transactions without withExclusiveTransactionAsync on web', async () => {
    const db = new FakeSQLiteDatabase();
    const calls: string[] = [];
    db.withExclusiveTransactionAsync = async () => {
      calls.push('exclusive');
      throw new Error('exclusive transaction should not run on web');
    };
    db.withTransactionAsync = async (task) => {
      calls.push('web');
      await task();
    };

    await runSQLiteTransactionForPlatform(db as never, 'web', async (txn) => {
      await txn.runAsync('INSERT INTO noop VALUES (?)', 'noop');
    });

    expect(calls).toEqual(['web']);
  });
});
