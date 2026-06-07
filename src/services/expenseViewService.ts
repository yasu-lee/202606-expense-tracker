import { Category, ExpenseWithShares, User } from '../domain/types';
import { remainingShareAmount } from '../domain/calculations';

export type ExpenseListItemView = {
  id: string;
  title: string;
  date: string;
  typeLabel: '개인' | '공유';
  amountKRW: number;
  categoryName: string;
  paidByName: string;
  myShareKRW: number;
  settlementHint: string;
};

export type HomeRecentExpenseBasis = 'paid' | 'actual';

export type HomeRecentExpenseView = {
  id: string;
  title: string;
  date: string;
  typeLabel: '개인' | '공유';
  representativeAmountKRW: number;
  representativeLabel: '결제' | '내 부담';
  paidAmountKRW: number;
  myShareKRW: number;
  settlementHint: string;
};

export const getMyShareAmount = (expense: ExpenseWithShares, currentUserId: string): number =>
  expense.shares.find((share) => share.userId === currentUserId)?.shareAmountKRW ?? 0;

export const getReceivableAmount = (expense: ExpenseWithShares, currentUserId: string): number =>
  expense.type === 'SHARED' && expense.paidBy === currentUserId
    ? expense.shares
        .filter((share) => share.userId !== currentUserId)
        .reduce((sum, share) => sum + remainingShareAmount(share), 0)
    : 0;

export const getPayableAmount = (expense: ExpenseWithShares, currentUserId: string): number => {
  const myShare = expense.shares.find((share) => share.userId === currentUserId);
  return expense.type === 'SHARED' && expense.paidBy !== currentUserId && myShare ? remainingShareAmount(myShare) : 0;
};

const formatInlineKRW = (value: number): string => `${value.toLocaleString('ko-KR')}원`;

export const toHomeRecentExpenseView = (
  expense: ExpenseWithShares,
  currentUserId: string,
  basis: HomeRecentExpenseBasis,
): HomeRecentExpenseView => {
  const myShareKRW = getMyShareAmount(expense, currentUserId);
  const paidAmountKRW = expense.paidBy === currentUserId ? expense.amountKRW : 0;
  const receivableKRW = getReceivableAmount(expense, currentUserId);
  const payableKRW = getPayableAmount(expense, currentUserId);
  const settlementParts: string[] = [];

  if (expense.type === 'SHARED') {
    settlementParts.push(`결제 ${formatInlineKRW(paidAmountKRW)}`);
    settlementParts.push(`내 부담 ${formatInlineKRW(myShareKRW)}`);
    if (receivableKRW > 0) {
      settlementParts.push(`받을 돈 ${formatInlineKRW(receivableKRW)}`);
    }
    if (payableKRW > 0) {
      settlementParts.push(`보낼 돈 ${formatInlineKRW(payableKRW)}`);
    }
  }

  return {
    id: expense.id,
    title: expense.title,
    date: expense.date,
    typeLabel: expense.type === 'PERSONAL' ? '개인' : '공유',
    representativeAmountKRW: basis === 'paid' ? paidAmountKRW : myShareKRW,
    representativeLabel: basis === 'paid' ? '결제' : '내 부담',
    paidAmountKRW,
    myShareKRW,
    settlementHint: settlementParts.join(' · '),
  };
};

export const toExpenseListItemView = (
  expense: ExpenseWithShares,
  currentUserId: string,
  users: User[],
  categories: Category[],
): ExpenseListItemView => {
  const userNameById = new Map(users.map((user) => [user.id, user.name]));
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const myShareKRW = getMyShareAmount(expense, currentUserId);
  let settlementHint = '정산 없음';

  if (expense.type === 'SHARED' && expense.paidBy === currentUserId) {
    const receivable = getReceivableAmount(expense, currentUserId);
    settlementHint = receivable > 0 ? `받을 돈 ${receivable.toLocaleString('ko-KR')}원` : '정산 완료';
  }

  if (expense.type === 'SHARED' && expense.paidBy !== currentUserId) {
    const payable = getPayableAmount(expense, currentUserId);
    settlementHint = payable > 0 ? `보낼 돈 ${payable.toLocaleString('ko-KR')}원` : '정산 완료';
  }

  return {
    id: expense.id,
    title: expense.title,
    date: expense.date,
    typeLabel: expense.type === 'PERSONAL' ? '개인' : '공유',
    amountKRW: expense.amountKRW,
    categoryName: categoryNameById.get(expense.categoryId) ?? expense.categoryId,
    paidByName: userNameById.get(expense.paidBy) ?? expense.paidBy,
    myShareKRW,
    settlementHint,
  };
};
