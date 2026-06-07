import { CreateExpenseInput, DirectShareInput } from './types';

export const validateSplitTotal = (amountKRW: number, shares: DirectShareInput[]): void => {
  const total = shares.reduce((sum, share) => sum + share.shareAmountKRW, 0);
  if (total !== amountKRW) {
    throw new Error(`Split total (${total}) must equal expense amount (${amountKRW}).`);
  }
};

const assertUniqueUserIds = (userIds: string[], label: string): void => {
  const uniqueIds = new Set(userIds);
  if (uniqueIds.size !== userIds.length) {
    throw new Error(`${label} must not contain duplicate users.`);
  }
};

const assertSameUserSet = (left: string[], right: string[], label: string): void => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const sameSize = leftSet.size === rightSet.size;
  const sameMembers = left.every((userId) => rightSet.has(userId));
  if (!sameSize || !sameMembers) {
    throw new Error(`${label} must exactly match burden owners.`);
  }
};

export const validateCreateExpenseInput = (input: CreateExpenseInput): void => {
  if (!input.title.trim()) {
    throw new Error('Title is required.');
  }
  if (!Number.isInteger(input.amountKRW) || input.amountKRW <= 0) {
    throw new Error('Amount must be a positive integer KRW value.');
  }
  if (!input.categoryId) {
    throw new Error('Category is required.');
  }
  if (!input.date) {
    throw new Error('Date is required.');
  }
  if (!input.paidBy) {
    throw new Error('Paid by user is required.');
  }
  assertUniqueUserIds(input.participantIds, 'participantIds');
  if (input.type === 'PERSONAL' && input.participantIds.length !== 1) {
    throw new Error('PERSONAL expense must have exactly one participant.');
  }
  if (input.type === 'SHARED' && input.participantIds.length < 1) {
    throw new Error('SHARED expense must have at least one burden owner.');
  }
  if (input.type === 'SHARED' && input.participantIds.length === 1 && input.participantIds[0] === input.paidBy) {
    throw new Error('SHARED expense with only the payer as burden owner should be PERSONAL.');
  }
  if (input.splitMethod === 'DIRECT') {
    if (!input.directShares || input.directShares.length === 0) {
      throw new Error('DIRECT split requires directShares.');
    }
    const directShareUserIds = input.directShares.map((share) => share.userId);
    assertUniqueUserIds(directShareUserIds, 'directShares');
    assertSameUserSet(input.participantIds, directShareUserIds, 'directShares');
    validateSplitTotal(input.amountKRW, input.directShares);
  }
};
