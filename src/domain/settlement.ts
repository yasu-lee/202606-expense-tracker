import { ExpenseShare, SettlementStatus } from './types';

export const deriveSettlementStatus = (shareAmountKRW: number, settledAmountKRW: number): SettlementStatus => {
  if (!Number.isInteger(settledAmountKRW) || settledAmountKRW < 0) {
    throw new Error('Settled amount must be a non-negative integer KRW value.');
  }
  if (settledAmountKRW > shareAmountKRW) {
    throw new Error('Settled amount cannot exceed share amount.');
  }
  if (settledAmountKRW === 0) {
    return 'PENDING';
  }
  if (settledAmountKRW === shareAmountKRW) {
    return 'DONE';
  }
  return 'PARTIAL';
};

export const applySettlementAmount = (share: ExpenseShare, settledAmountKRW: number): ExpenseShare => ({
  ...share,
  settledAmountKRW,
  settlementStatus: deriveSettlementStatus(share.shareAmountKRW, settledAmountKRW),
});
