export type Currency = 'KRW';
export type UserId = string;
export type ExpenseId = string;
export type CategoryId = string;

export type ExpenseType = 'PERSONAL' | 'SHARED';
export type ExpenseContext = 'DAILY' | 'MEETING';
export type SplitMethod = 'EQUAL' | 'DIRECT';
export type SettlementStatus = 'PENDING' | 'PARTIAL' | 'DONE';

export type User = {
  id: UserId;
  name: string;
  defaultCurrency: Currency;
};

export type Category = {
  id: CategoryId;
  name: string;
  color?: string;
};

export type Expense = {
  id: ExpenseId;
  title: string;
  amountKRW: number;
  currency: Currency;
  categoryId: CategoryId;
  date: string;
  paidBy: UserId;
  type: ExpenseType;
  context: ExpenseContext;
  memo?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseShare = {
  id: string;
  expenseId: ExpenseId;
  userId: UserId;
  shareAmountKRW: number;
  settlementStatus: SettlementStatus;
  settledAmountKRW: number;
  createdAt: string;
};

export type SharedGroup = {
  id: string;
  name: string;
  type: 'ONE_TIME';
  context: 'MEETING';
  members: UserId[];
  createdBy: UserId;
  createdAt: string;
};

export type DirectShareInput = {
  userId: UserId;
  shareAmountKRW: number;
};

export type CreateExpenseInput = {
  title: string;
  amountKRW: number;
  categoryId: CategoryId;
  date: string;
  paidBy: UserId;
  type: ExpenseType;
  context?: ExpenseContext;
  memo?: string;
  participantIds: UserId[];
  splitMethod: SplitMethod;
  directShares?: DirectShareInput[];
};

export type ExpenseWithShares = Expense & {
  shares: ExpenseShare[];
};

export type CategorySummaryItem = {
  categoryId: CategoryId;
  amountKRW: number;
};

export type CategoryActualSummaryItem = CategorySummaryItem & {
  categoryName: string;
};

export type MonthlySummary = {
  month: string;
  totalPaidKRW: number;
  actualSpentKRW: number;
  receivableKRW: number;
  payableKRW: number;
  categorySummary: CategorySummaryItem[];
  recentExpenseIds: ExpenseId[];
};

export type MonthlySummaryView = MonthlySummary & {
  categoryActualSummary: CategoryActualSummaryItem[];
  recentExpenses: ExpenseWithShares[];
};
