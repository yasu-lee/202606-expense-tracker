import { DirectShareInput, UserId } from './types';

const assertIntegerKRW = (amount: number, label: string) => {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative integer KRW amount.`);
  }
};

export const splitEqual = (amountKRW: number, participantIds: UserId[]): DirectShareInput[] => {
  assertIntegerKRW(amountKRW, 'amountKRW');
  if (participantIds.length === 0) {
    throw new Error('At least one participant is required.');
  }

  const base = Math.floor(amountKRW / participantIds.length);
  const remainder = amountKRW % participantIds.length;

  return participantIds.map((userId, index) => ({
    userId,
    shareAmountKRW: base + (index < remainder ? 1 : 0),
  }));
};

export const splitDirect = (amountKRW: number, directShares: DirectShareInput[]): DirectShareInput[] => {
  assertIntegerKRW(amountKRW, 'amountKRW');
  if (directShares.length === 0) {
    throw new Error('At least one direct share is required.');
  }

  const normalized = directShares.map((share) => {
    assertIntegerKRW(share.shareAmountKRW, `share for ${share.userId}`);
    return { userId: share.userId, shareAmountKRW: share.shareAmountKRW };
  });

  const total = normalized.reduce((sum, share) => sum + share.shareAmountKRW, 0);
  if (total !== amountKRW) {
    throw new Error(`Direct share total (${total}) must equal expense amount (${amountKRW}).`);
  }

  return normalized;
};
