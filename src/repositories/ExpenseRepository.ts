import { Category, CreateExpenseInput, Expense, ExpenseId, ExpenseShare, UpdateExpenseInput, User } from '../domain/types';

export interface ExpenseRepository {
  getCurrentUser(): Promise<User>;
  listUsers(): Promise<User[]>;
  listCategories(): Promise<Category[]>;
  listExpensesByMonth(month: string): Promise<Expense[]>;
  listSharesByExpenseIds(expenseIds: string[]): Promise<ExpenseShare[]>;
  createExpenseWithShares(input: CreateExpenseInput): Promise<{ expense: Expense; shares: ExpenseShare[] }>;
  updateExpenseWithShares(input: UpdateExpenseInput): Promise<{ expense: Expense; shares: ExpenseShare[] }>;
  deleteExpense(expenseId: ExpenseId): Promise<void>;
  updateShareSettlement(shareId: string, settledAmountKRW: number): Promise<ExpenseShare>;
  resetDevelopmentData(): Promise<void>;
}
