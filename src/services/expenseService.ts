import { CreateExpenseInput, ExpenseWithShares } from '../domain/types';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export class ExpenseService {
  constructor(private readonly repository: ExpenseRepository) {}

  async getCurrentUser() {
    return this.repository.getCurrentUser();
  }

  async listUsers() {
    return this.repository.listUsers();
  }

  async listCategories() {
    return this.repository.listCategories();
  }

  async listExpensesWithSharesByMonth(month: string): Promise<ExpenseWithShares[]> {
    const expenses = await this.repository.listExpensesByMonth(month);
    const shares = await this.repository.listSharesByExpenseIds(expenses.map((expense) => expense.id));
    return expenses
      .map((expense) => ({
        ...expense,
        shares: shares.filter((share) => share.expenseId === expense.id),
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  async createExpenseWithShares(input: CreateExpenseInput) {
    return this.repository.createExpenseWithShares(input);
  }

  async updateShareSettlement(shareId: string, settledAmountKRW: number) {
    return this.repository.updateShareSettlement(shareId, settledAmountKRW);
  }
}
