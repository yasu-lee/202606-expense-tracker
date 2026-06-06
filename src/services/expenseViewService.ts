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

export const toExpenseListItemView = (
  expense: ExpenseWithShares,
  currentUserId: string,
  users: User[],
  categories: Category[],
): ExpenseListItemView => {
  const userNameById = new Map(users.map((user) => [user.id, user.name]));
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const myShare = expense.shares.find((share) => share.userId === currentUserId);
  const myShareKRW = myShare?.shareAmountKRW ?? 0;
  let settlementHint = '정산 없음';

  if (expense.type === 'SHARED' && expense.paidBy === currentUserId) {
    const receivable = expense.shares
      .filter((share) => share.userId !== currentUserId)
      .reduce((sum, share) => sum + remainingShareAmount(share), 0);
    settlementHint = receivable > 0 ? `받을 돈 ${receivable.toLocaleString('ko-KR')}원` : '정산 완료';
  }

  if (expense.type === 'SHARED' && expense.paidBy !== currentUserId) {
    const payable = myShare ? remainingShareAmount(myShare) : 0;
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
