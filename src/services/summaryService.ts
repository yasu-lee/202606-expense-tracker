import { buildMonthlySummary, decorateCategorySummary } from '../domain/calculations';
import { MonthlySummaryView } from '../domain/types';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export class SummaryService {
  constructor(private readonly repository: ExpenseRepository) {}

  async getMonthlySummary(month: string, userId?: string): Promise<MonthlySummaryView> {
    const [currentUser, categories, expenses] = await Promise.all([
      this.repository.getCurrentUser(),
      this.repository.listCategories(),
      this.repository.listExpensesByMonth(month),
    ]);
    const targetUserId = userId ?? currentUser.id;
    const shares = await this.repository.listSharesByExpenseIds(expenses.map((expense) => expense.id));
    const summary = buildMonthlySummary(expenses, shares, targetUserId, month);
    const recentExpenseIdSet = new Set(summary.recentExpenseIds);

    return {
      ...summary,
      categoryActualSummary: decorateCategorySummary(summary.categorySummary, categories),
      recentExpenses: expenses
        .filter((expense) => recentExpenseIdSet.has(expense.id))
        .map((expense) => ({
          ...expense,
          shares: shares.filter((share) => share.expenseId === expense.id),
        }))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    };
  }
}
