import { dummyCategories, dummyExpenseShares, dummyExpenses, dummyUsers, mockCurrentUser } from '../../domain/dummyData';
import { buildExpenseWithShares } from '../../domain/expenseFactory';
import { applySettlementAmount } from '../../domain/settlement';
import { CreateExpenseInput, Expense, ExpenseShare } from '../../domain/types';
import { ExpenseRepository } from '../ExpenseRepository';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class MockExpenseRepository implements ExpenseRepository {
  private expenses: Expense[];
  private shares: ExpenseShare[];

  constructor(seed?: { expenses?: Expense[]; shares?: ExpenseShare[] }) {
    this.expenses = clone(seed?.expenses ?? dummyExpenses);
    this.shares = clone(seed?.shares ?? dummyExpenseShares);
  }

  async getCurrentUser() {
    return clone(mockCurrentUser);
  }

  async listUsers() {
    return clone(dummyUsers);
  }

  async listCategories() {
    return clone(dummyCategories);
  }

  async listExpensesByMonth(month: string) {
    return clone(this.expenses.filter((expense) => expense.date.startsWith(month)));
  }

  async listSharesByExpenseIds(expenseIds: string[]) {
    const ids = new Set(expenseIds);
    return clone(this.shares.filter((share) => ids.has(share.expenseId)));
  }

  async createExpenseWithShares(input: CreateExpenseInput) {
    const currentUser = await this.getCurrentUser();
    const aggregate = buildExpenseWithShares(input, currentUser.id, new Date().toISOString(), createId);

    this.expenses = [aggregate.expense, ...this.expenses];
    this.shares = [...aggregate.shares, ...this.shares];

    return clone(aggregate);
  }

  async updateShareSettlement(shareId: string, settledAmountKRW: number) {
    const shareIndex = this.shares.findIndex((share) => share.id === shareId);
    if (shareIndex < 0) {
      throw new Error('Expense share not found.');
    }

    const currentShare = this.shares[shareIndex];
    if (!currentShare) {
      throw new Error('Expense share not found.');
    }
    const updatedShare = applySettlementAmount(currentShare, settledAmountKRW);
    this.shares = this.shares.map((share) => (share.id === shareId ? updatedShare : share));
    return clone(updatedShare);
  }
}
