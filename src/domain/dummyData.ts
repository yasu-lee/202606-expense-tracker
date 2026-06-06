import { Category, Expense, ExpenseShare, User } from './types';

export const mockCurrentUser: User = {
  id: 'user-minji',
  name: '민지',
  defaultCurrency: 'KRW',
};

export const dummyUsers: User[] = [
  mockCurrentUser,
  { id: 'user-jisoo', name: '지수', defaultCurrency: 'KRW' },
  { id: 'user-hyun', name: '현우', defaultCurrency: 'KRW' },
  { id: 'user-arin', name: '아린', defaultCurrency: 'KRW' },
];

export const dummyCategories: Category[] = [
  { id: 'food', name: '식비', color: '#ff7a59' },
  { id: 'cafe', name: '카페', color: '#8b5cf6' },
  { id: 'transport', name: '교통', color: '#3b82f6' },
  { id: 'shopping', name: '쇼핑', color: '#10b981' },
];

export const dummyExpenses: Expense[] = [
  {
    id: 'expense-personal-lunch',
    title: '점심 김밥',
    amountKRW: 12000,
    currency: 'KRW',
    categoryId: 'food',
    date: '2026-06-02',
    paidBy: 'user-minji',
    type: 'PERSONAL',
    context: 'DAILY',
    memo: '빠른 개인 지출',
    createdAt: '2026-06-02T03:00:00.000Z',
    updatedAt: '2026-06-02T03:00:00.000Z',
  },
  {
    id: 'expense-shared-dinner',
    title: '친구들과 저녁',
    amountKRW: 80000,
    currency: 'KRW',
    categoryId: 'food',
    date: '2026-06-03',
    paidBy: 'user-minji',
    type: 'SHARED',
    context: 'MEETING',
    memo: '4명 균등 분할',
    createdAt: '2026-06-03T11:00:00.000Z',
    updatedAt: '2026-06-03T11:00:00.000Z',
  },
  {
    id: 'expense-shared-taxi',
    title: '택시비',
    amountKRW: 18000,
    currency: 'KRW',
    categoryId: 'transport',
    date: '2026-06-04',
    paidBy: 'user-jisoo',
    type: 'SHARED',
    context: 'MEETING',
    memo: '3명 균등 분할',
    createdAt: '2026-06-04T12:00:00.000Z',
    updatedAt: '2026-06-04T12:00:00.000Z',
  },
  {
    id: 'expense-shared-coffee',
    title: '카페 모임',
    amountKRW: 15000,
    currency: 'KRW',
    categoryId: 'cafe',
    date: '2026-06-05',
    paidBy: 'user-hyun',
    type: 'SHARED',
    context: 'MEETING',
    memo: '직접 금액 분할',
    createdAt: '2026-06-05T05:00:00.000Z',
    updatedAt: '2026-06-05T05:00:00.000Z',
  },
];

export const dummyExpenseShares: ExpenseShare[] = [
  {
    id: 'share-personal-lunch-minji',
    expenseId: 'expense-personal-lunch',
    userId: 'user-minji',
    shareAmountKRW: 12000,
    settlementStatus: 'DONE',
    settledAmountKRW: 12000,
    createdAt: '2026-06-02T03:00:00.000Z',
  },
  ...['user-minji', 'user-jisoo', 'user-hyun', 'user-arin'].map<ExpenseShare>((userId) => ({
    id: `share-dinner-${userId}`,
    expenseId: 'expense-shared-dinner',
    userId,
    shareAmountKRW: 20000,
    settlementStatus: userId === 'user-minji' ? 'DONE' : 'PENDING',
    settledAmountKRW: userId === 'user-minji' ? 20000 : 0,
    createdAt: '2026-06-03T11:00:00.000Z',
  })),
  ...['user-minji', 'user-jisoo', 'user-hyun'].map<ExpenseShare>((userId) => ({
    id: `share-taxi-${userId}`,
    expenseId: 'expense-shared-taxi',
    userId,
    shareAmountKRW: 6000,
    settlementStatus: userId === 'user-jisoo' ? 'DONE' : 'PENDING',
    settledAmountKRW: userId === 'user-jisoo' ? 6000 : 0,
    createdAt: '2026-06-04T12:00:00.000Z',
  })),
  { id: 'share-coffee-minji', expenseId: 'expense-shared-coffee', userId: 'user-minji', shareAmountKRW: 5000, settlementStatus: 'PENDING', settledAmountKRW: 0, createdAt: '2026-06-05T05:00:00.000Z' },
  { id: 'share-coffee-jisoo', expenseId: 'expense-shared-coffee', userId: 'user-jisoo', shareAmountKRW: 4000, settlementStatus: 'PENDING', settledAmountKRW: 0, createdAt: '2026-06-05T05:00:00.000Z' },
  { id: 'share-coffee-hyun', expenseId: 'expense-shared-coffee', userId: 'user-hyun', shareAmountKRW: 6000, settlementStatus: 'DONE', settledAmountKRW: 6000, createdAt: '2026-06-05T05:00:00.000Z' },
];
