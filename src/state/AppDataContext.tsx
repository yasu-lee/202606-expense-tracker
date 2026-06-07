import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CreateExpenseInput, ExpenseId, ExpenseWithShares, MonthlySummaryView, User, Category, UpdateExpenseInput } from '../domain/types';
import { AppServices } from '../services/appServices';
import { toLocalMonthKey } from '../utils/date';

const DEFAULT_MONTH = toLocalMonthKey();

type AppDataContextValue = {
  month: string;
  currentUser: User | null;
  users: User[];
  categories: Category[];
  expenses: ExpenseWithShares[];
  summary: MonthlySummaryView | null;
  error: string | null;
  refresh: () => Promise<void>;
  createExpense: (input: CreateExpenseInput) => Promise<void>;
  updateExpense: (input: UpdateExpenseInput) => Promise<void>;
  deleteExpense: (expenseId: ExpenseId) => Promise<void>;
  updateShareSettlement: (shareId: string, settledAmountKRW: number) => Promise<void>;
  resetDevelopmentData: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

type AppDataProviderProps = PropsWithChildren<{
  services: AppServices;
}>;

export const AppDataProvider = ({ children, services }: AppDataProviderProps) => {
  const [month] = useState(DEFAULT_MONTH);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithShares[]>([]);
  const [summary, setSummary] = useState<MonthlySummaryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [nextUser, nextUsers, nextCategories, nextExpenses, nextSummary] = await Promise.all([
        services.expenseService.getCurrentUser(),
        services.expenseService.listUsers(),
        services.expenseService.listCategories(),
        services.expenseService.listExpensesWithSharesByMonth(month),
        services.summaryService.getMonthlySummary(month),
      ]);
      setCurrentUser(nextUser);
      setUsers(nextUsers);
      setCategories(nextCategories);
      setExpenses(nextExpenses);
      setSummary(nextSummary);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '데이터를 불러오지 못했습니다.');
    }
  }, [month, services]);

  const createExpense = useCallback(
    async (input: CreateExpenseInput) => {
      await services.expenseService.createExpenseWithShares(input);
      await refresh();
    },
    [refresh, services],
  );

  const updateExpense = useCallback(
    async (input: UpdateExpenseInput) => {
      await services.expenseService.updateExpenseWithShares(input);
      await refresh();
    },
    [refresh, services],
  );

  const deleteExpense = useCallback(
    async (expenseId: ExpenseId) => {
      await services.expenseService.deleteExpense(expenseId);
      await refresh();
    },
    [refresh, services],
  );

  const updateShareSettlement = useCallback(
    async (shareId: string, settledAmountKRW: number) => {
      await services.expenseService.updateShareSettlement(shareId, settledAmountKRW);
      await refresh();
    },
    [refresh, services],
  );

  const resetDevelopmentData = useCallback(async () => {
    await services.expenseService.resetDevelopmentData();
    await refresh();
  }, [refresh, services]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      month,
      currentUser,
      users,
      categories,
      expenses,
      summary,
      error,
      refresh,
      createExpense,
      updateExpense,
      deleteExpense,
      updateShareSettlement,
      resetDevelopmentData,
    }),
    [
      month,
      currentUser,
      users,
      categories,
      expenses,
      summary,
      error,
      refresh,
      createExpense,
      updateExpense,
      deleteExpense,
      updateShareSettlement,
      resetDevelopmentData,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider.');
  }
  return context;
};
