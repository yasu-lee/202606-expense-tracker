import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { MockExpenseRepository } from '../repositories/mock/mockExpenseRepository';
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

export const appServices = createAppServices();
