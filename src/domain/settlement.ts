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

export const validatePartialSettlementAmount = (share: ExpenseShare, partialAmountKRW: number): void => {
  if (!Number.isInteger(partialAmountKRW)) {
    throw new Error('부분 정산액은 숫자로 입력해 주세요.');
  }
  if (partialAmountKRW <= 0) {
    throw new Error('부분 정산액은 0원보다 커야 합니다.');
  }
  if (partialAmountKRW > Math.max(share.shareAmountKRW - share.settledAmountKRW, 0)) {
    throw new Error('부분 정산액은 남은 정산금보다 클 수 없습니다.');
  }
};
