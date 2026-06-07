import { Platform } from 'react-native';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { MockExpenseRepository } from '../repositories/mock/mockExpenseRepository';
import { openExpenseDatabase } from '../repositories/sqlite/sqliteDatabase';
import { SQLiteExpenseRepository } from '../repositories/sqlite/SQLiteExpenseRepository';
import { ExpenseService } from './expenseService';
import { SummaryService } from './summaryService';

export type AppServices = {
  expenseService: ExpenseService;
  summaryService: SummaryService;
};

export const createAppServices = (repository: ExpenseRepository = new MockExpenseRepository()): AppServices => ({
  expenseService: new ExpenseService(repository),
  summaryService: new SummaryService(repository),
});

export const createPersistentAppServices = async (): Promise<AppServices> => {
  const db = await openExpenseDatabase(undefined, Platform.OS);
  return createAppServices(new SQLiteExpenseRepository(db, Platform.OS));
};
