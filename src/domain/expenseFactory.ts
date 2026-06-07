import { splitDirect, splitEqual } from './split';
import { validateCreateExpenseInput } from './validation';
import { CreateExpenseInput, Expense, ExpenseShare, UpdateExpenseInput, UserId } from './types';

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

const toMemoPart = (memo: string | undefined): Pick<Expense, 'memo'> | Record<string, never> =>
  memo === undefined || memo.trim() === '' ? {} : { memo };

const splitRowsForInput = (input: CreateExpenseInput) =>
  input.splitMethod === 'EQUAL' ? splitEqual(input.amountKRW, input.participantIds) : splitDirect(input.amountKRW, input.directShares ?? []);

const hasSameShareAmounts = (existingShares: ExpenseShare[], input: CreateExpenseInput): boolean => {
  const nextRows = splitRowsForInput(input);
  if (existingShares.length !== nextRows.length) {
    return false;
  }

  const existing = new Map(existingShares.map((share) => [share.userId, share.shareAmountKRW]));
  return nextRows.every((row) => existing.get(row.userId) === row.shareAmountKRW);
};

export const isFinancialExpenseEdit = (
  existingExpense: Expense,
  existingShares: ExpenseShare[],
  rawInput: UpdateExpenseInput,
  currentUserId: UserId,
): boolean => {
  const input = normalizeCreateExpenseInput(rawInput, currentUserId);
  validateCreateExpenseInput(input);

  return (
    existingExpense.amountKRW !== input.amountKRW ||
    existingExpense.paidBy !== input.paidBy ||
    existingExpense.type !== input.type ||
    !hasSameShareAmounts(existingShares, input)
  );
};

export const buildUpdatedExpenseWithShares = (
  rawInput: UpdateExpenseInput,
  existingExpense: Expense,
  existingShares: ExpenseShare[],
  currentUserId: UserId,
  now: string,
  createId: IdFactory,
): { expense: Expense; shares: ExpenseShare[]; financialEdit: boolean } => {
  const input = normalizeCreateExpenseInput(rawInput, currentUserId);
  validateCreateExpenseInput(input);

  const financialEdit = isFinancialExpenseEdit(existingExpense, existingShares, rawInput, currentUserId);
  const expense: Expense = {
    id: existingExpense.id,
    title: input.title.trim(),
    amountKRW: input.amountKRW,
    currency: 'KRW',
    categoryId: input.categoryId,
    date: input.date,
    paidBy: input.paidBy,
    type: input.type,
    context: input.context ?? (input.type === 'PERSONAL' ? 'DAILY' : 'MEETING'),
    ...toMemoPart(input.memo),
    createdAt: existingExpense.createdAt,
    updatedAt: now,
  };

  if (!financialEdit) {
    return { expense, shares: existingShares, financialEdit };
  }

  const shares: ExpenseShare[] = splitRowsForInput(input).map((share) => ({
    id: createId('share'),
    expenseId: existingExpense.id,
    userId: share.userId,
    shareAmountKRW: share.shareAmountKRW,
    settlementStatus: share.userId === input.paidBy ? 'DONE' : 'PENDING',
    settledAmountKRW: share.userId === input.paidBy ? share.shareAmountKRW : 0,
    createdAt: now,
  }));

  return { expense, shares, financialEdit };
};
