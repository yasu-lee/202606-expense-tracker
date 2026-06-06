import { splitDirect, splitEqual } from './split';
import { validateCreateExpenseInput } from './validation';
import { CreateExpenseInput, Expense, ExpenseShare, UserId } from './types';

type IdFactory = (prefix: string) => string;

export const normalizeCreateExpenseInput = (input: CreateExpenseInput, currentUserId: UserId): CreateExpenseInput => {
  if (input.type !== 'PERSONAL') {
    return input;
  }

  return {
    ...input,
    paidBy: currentUserId,
    participantIds: [currentUserId],
    splitMethod: 'EQUAL',
  };
};

export const buildExpenseWithShares = (
  rawInput: CreateExpenseInput,
  currentUserId: UserId,
  now: string,
  createId: IdFactory,
): { expense: Expense; shares: ExpenseShare[] } => {
  const input = normalizeCreateExpenseInput(rawInput, currentUserId);
  validateCreateExpenseInput(input);

  const expenseId = createId('expense');
  const memoPart = input.memo === undefined || input.memo.trim() === '' ? {} : { memo: input.memo };
  const expense: Expense = {
    id: expenseId,
    title: input.title.trim(),
    amountKRW: input.amountKRW,
    currency: 'KRW',
    categoryId: input.categoryId,
    date: input.date,
    paidBy: input.paidBy,
    type: input.type,
    context: input.context ?? (input.type === 'PERSONAL' ? 'DAILY' : 'MEETING'),
    ...memoPart,
    createdAt: now,
    updatedAt: now,
  };

  const splitRows = input.splitMethod === 'EQUAL' ? splitEqual(input.amountKRW, input.participantIds) : splitDirect(input.amountKRW, input.directShares ?? []);
  const shares: ExpenseShare[] = splitRows.map((share) => ({
    id: createId('share'),
    expenseId,
    userId: share.userId,
    shareAmountKRW: share.shareAmountKRW,
    settlementStatus: share.userId === input.paidBy ? 'DONE' : 'PENDING',
    settledAmountKRW: share.userId === input.paidBy ? share.shareAmountKRW : 0,
    createdAt: now,
  }));

  return { expense, shares };
};
