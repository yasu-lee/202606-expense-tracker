import { dummyCategories, dummyExpenseShares, dummyExpenses, dummyUsers, mockCurrentUser } from '../../domain/dummyData';
import { buildExpenseWithShares, buildUpdatedExpenseWithShares } from '../../domain/expenseFactory';
import { applySettlementAmount } from '../../domain/settlement';
import { CreateExpenseInput, Expense, ExpenseId, ExpenseShare, UpdateExpenseInput } from '../../domain/types';
import { ExpenseRepository } from '../ExpenseRepository';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const assertDevelopmentResetAllowed = (): void => {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    throw new Error('Development data reset is only available in development builds.');
  }
};

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

  async updateExpenseWithShares(input: UpdateExpenseInput) {
    const expenseIndex = this.expenses.findIndex((expense) => expense.id === input.expenseId);
    if (expenseIndex < 0) {
      throw new Error('Expense not found.');
    }

    const existingExpense = this.expenses[expenseIndex];
    if (!existingExpense) {
      throw new Error('Expense not found.');
    }

    const currentUser = await this.getCurrentUser();
    const existingShares = this.shares.filter((share) => share.expenseId === input.expenseId);
    const aggregate = buildUpdatedExpenseWithShares(input, existingExpense, existingShares, currentUser.id, new Date().toISOString(), createId);

    this.expenses = this.expenses.map((expense) => (expense.id === input.expenseId ? aggregate.expense : expense));
    if (aggregate.financialEdit) {
      this.shares = [...aggregate.shares, ...this.shares.filter((share) => share.expenseId !== input.expenseId)];
    }

    return clone({ expense: aggregate.expense, shares: aggregate.shares });
  }

  async deleteExpense(expenseId: ExpenseId) {
    const beforeCount = this.expenses.length;
    this.expenses = this.expenses.filter((expense) => expense.id !== expenseId);
    if (this.expenses.length === beforeCount) {
      throw new Error('Expense not found.');
    }
    this.shares = this.shares.filter((share) => share.expenseId !== expenseId);
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

  async resetDevelopmentData() {
    assertDevelopmentResetAllowed();
    this.expenses = clone(dummyExpenses);
    this.shares = clone(dummyExpenseShares);
  }
}
