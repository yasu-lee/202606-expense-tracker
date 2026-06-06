import { Category, CreateExpenseInput, Expense, ExpenseShare, User } from '../domain/types';

export interface ExpenseRepository {
  getCurrentUser(): Promise<User>;
  listUsers(): Promise<User[]>;
  listCategories(): Promise<Category[]>;
  listExpensesByMonth(month: string): Promise<Expense[]>;
  listSharesByExpenseIds(expenseIds: string[]): Promise<ExpenseShare[]>;
  createExpenseWithShares(input: CreateExpenseInput): Promise<{ expense: Expense; shares: ExpenseShare[] }>;
}
