import {
  Category,
  CategorySummaryItem,
  Expense,
  ExpenseId,
  ExpenseShare,
  MonthlySummary,
  UserId,
} from './types';

export const getExpensesForMonth = <T extends Expense>(expenses: T[], month: string): T[] =>
  expenses.filter((expense) => expense.date.startsWith(month));

export const calculateTotalPaid = (expenses: Expense[], userId: UserId): number =>
  expenses.filter((expense) => expense.paidBy === userId).reduce((sum, expense) => sum + expense.amountKRW, 0);

export const calculateActualSpent = (shares: ExpenseShare[], userId: UserId): number =>
  shares.filter((share) => share.userId === userId).reduce((sum, share) => sum + share.shareAmountKRW, 0);

export const remainingShareAmount = (share: ExpenseShare): number => {
  if (share.settlementStatus === 'DONE') {
    return 0;
  }
  return Math.max(share.shareAmountKRW - share.settledAmountKRW, 0);
};

const expenseById = (expenses: Expense[]): Map<ExpenseId, Expense> =>
  new Map(expenses.map((expense) => [expense.id, expense]));

export const calculateReceivable = (expenses: Expense[], shares: ExpenseShare[], userId: UserId): number => {
  const expensesById = expenseById(expenses);
  return shares.reduce((sum, share) => {
    const expense = expensesById.get(share.expenseId);
    if (!expense || expense.type !== 'SHARED') {
      return sum;
    }
    if (expense.paidBy === userId && share.userId !== userId) {
      return sum + remainingShareAmount(share);
    }
    return sum;
  }, 0);
};

export const calculatePayable = (expenses: Expense[], shares: ExpenseShare[], userId: UserId): number => {
  const expensesById = expenseById(expenses);
  return shares.reduce((sum, share) => {
    const expense = expensesById.get(share.expenseId);
    if (!expense || expense.type !== 'SHARED') {
      return sum;
    }
    if (expense.paidBy !== userId && share.userId === userId) {
      return sum + remainingShareAmount(share);
    }
    return sum;
  }, 0);
};

export const calculateCategoryActualSummary = (
  expenses: Expense[],
  shares: ExpenseShare[],
  userId: UserId,
): CategorySummaryItem[] => {
  const expensesById = expenseById(expenses);
  const totals = new Map<string, number>();

  shares
    .filter((share) => share.userId === userId)
    .forEach((share) => {
      const expense = expensesById.get(share.expenseId);
      if (!expense) {
        return;
      }
      totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + share.shareAmountKRW);
    });

  return Array.from(totals.entries())
    .map(([categoryId, amountKRW]) => ({ categoryId, amountKRW }))
    .sort((a, b) => b.amountKRW - a.amountKRW);
};

export const buildMonthlySummary = (
  expenses: Expense[],
  shares: ExpenseShare[],
  userId: UserId,
  month: string,
): MonthlySummary => {
  const monthlyExpenses = getExpensesForMonth(expenses, month);
  const monthlyExpenseIds = new Set(monthlyExpenses.map((expense) => expense.id));
  const monthlyShares = shares.filter((share) => monthlyExpenseIds.has(share.expenseId));
  const recentExpenseIds = [...monthlyExpenses]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((expense) => expense.id);

  return {
    month,
    totalPaidKRW: calculateTotalPaid(monthlyExpenses, userId),
    actualSpentKRW: calculateActualSpent(monthlyShares, userId),
    receivableKRW: calculateReceivable(monthlyExpenses, monthlyShares, userId),
    payableKRW: calculatePayable(monthlyExpenses, monthlyShares, userId),
    categorySummary: calculateCategoryActualSummary(monthlyExpenses, monthlyShares, userId),
    recentExpenseIds,
  };
};

export const decorateCategorySummary = (summary: CategorySummaryItem[], categories: Category[]) => {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  return summary.map((item) => ({
    ...item,
    categoryName: categoriesById.get(item.categoryId)?.name ?? item.categoryId,
  }));
};
