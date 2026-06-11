import { buildMonthlySummary, calculateCategoryActualSummary } from '../src/domain/calculations';
import { validateCreateExpenseInput } from '../src/domain/validation';
import { deriveSettlementStatus, validatePartialSettlementAmount } from '../src/domain/settlement';
import { splitDirect, splitEqual } from '../src/domain/split';
import { Expense, ExpenseShare } from '../src/domain/types';
import { MockExpenseRepository } from '../src/repositories/mock/mockExpenseRepository';
import { toHomeRecentExpenseView } from '../src/services/expenseViewService';

const month = '2026-06';
const me = 'me';
const friendA = 'friend-a';
const friendB = 'friend-b';
const friendC = 'friend-c';

const expense = (overrides: Partial<Expense>): Expense => ({
  id: 'expense-1',
  title: '테스트 지출',
  amountKRW: 0,
  currency: 'KRW',
  categoryId: 'food',
  date: '2026-06-01',
  paidBy: me,
  type: 'PERSONAL',
  context: 'DAILY',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const share = (overrides: Partial<ExpenseShare>): ExpenseShare => ({
  id: 'share-1',
  expenseId: 'expense-1',
  userId: me,
  shareAmountKRW: 0,
  settlementStatus: 'PENDING',
  settledAmountKRW: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

describe('split functions', () => {
  it('splits 80,000 / 4 equally into 20,000 each', () => {
    expect(splitEqual(80000, [me, friendA, friendB, friendC])).toEqual([
      { userId: me, shareAmountKRW: 20000 },
      { userId: friendA, shareAmountKRW: 20000 },
      { userId: friendB, shareAmountKRW: 20000 },
      { userId: friendC, shareAmountKRW: 20000 },
    ]);
  });

  it('splits 10,001 / 3 by stable participant order', () => {
    expect(splitEqual(10001, [me, friendA, friendB])).toEqual([
      { userId: me, shareAmountKRW: 3334 },
      { userId: friendA, shareAmountKRW: 3334 },
      { userId: friendB, shareAmountKRW: 3333 },
    ]);
  });

  it('accepts direct split when total equals expense amount', () => {
    expect(splitDirect(15000, [
      { userId: me, shareAmountKRW: 5000 },
      { userId: friendA, shareAmountKRW: 10000 },
    ])).toHaveLength(2);
  });

  it('rejects direct split when total differs from expense amount', () => {
    expect(() => splitDirect(15000, [
      { userId: me, shareAmountKRW: 5000 },
      { userId: friendA, shareAmountKRW: 9000 },
    ])).toThrow(/must equal expense amount/);
  });

  it('rejects duplicate participants and direct shares outside participant set', () => {
    expect(() => validateCreateExpenseInput({
      title: '중복 참여자',
      amountKRW: 10000,
      categoryId: 'food',
      date: '2026-06-06',
      paidBy: me,
      type: 'SHARED',
      participantIds: [me, me],
      splitMethod: 'EQUAL',
    })).toThrow(/duplicate users/);

    expect(() => validateCreateExpenseInput({
      title: '불일치 직접분할',
      amountKRW: 10000,
      categoryId: 'food',
      date: '2026-06-06',
      paidBy: me,
      type: 'SHARED',
      participantIds: [me, friendA],
      splitMethod: 'DIRECT',
      directShares: [
        { userId: me, shareAmountKRW: 5000 },
        { userId: friendB, shareAmountKRW: 5000 },
      ],
    })).toThrow(/exactly match burden owners/);
  });

  it('allows SHARED expense with one burden owner when paidBy differs from participant', () => {
    expect(() => validateCreateExpenseInput({
      title: '대신 결제',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: friendA,
      type: 'SHARED',
      participantIds: [me],
      splitMethod: 'EQUAL',
    })).not.toThrow();
  });

  it('rejects SHARED expense without burden owners', () => {
    expect(() => validateCreateExpenseInput({
      title: '부담자 없는 공유 지출',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: friendA,
      type: 'SHARED',
      participantIds: [],
      splitMethod: 'EQUAL',
    })).toThrow(/at least one burden owner/);
  });

  it('rejects SHARED expense with only the payer as burden owner', () => {
    expect(() => validateCreateExpenseInput({
      title: '개인 지출이어야 하는 공유 지출',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: friendA,
      type: 'SHARED',
      participantIds: [friendA],
      splitMethod: 'EQUAL',
    })).toThrow(/should be PERSONAL/);
  });
});

describe('expense creation', () => {
  it('creates one current-user ExpenseShare for PERSONAL expense', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const result = await repository.createExpenseWithShares({
      title: '개인 커피',
      amountKRW: 5000,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'ignored-for-personal',
      type: 'PERSONAL',
      participantIds: ['ignored-for-personal'],
      splitMethod: 'EQUAL',
    });

    expect(result.expense.type).toBe('PERSONAL');
    expect(result.shares).toHaveLength(1);
    expect(result.shares[0]).toMatchObject({ userId: 'user-minji', shareAmountKRW: 5000 });
  });


  it('stores and reads created expense with shares through mock repository', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const created = await repository.createExpenseWithShares({
      title: '공유 간식',
      amountKRW: 10001,
      categoryId: 'food',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-minji', 'user-jisoo', 'user-hyun'],
      splitMethod: 'EQUAL',
    });

    const expenses = await repository.listExpensesByMonth('2026-06');
    const shares = await repository.listSharesByExpenseIds([created.expense.id]);

    expect(expenses).toHaveLength(1);
    expect(shares.map((item) => item.shareAmountKRW)).toEqual([3334, 3334, 3333]);
  });

  it('creates SHARED expense with one burden owner when payer differs', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const result = await repository.createExpenseWithShares({
      title: '대신 결제한 커피',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-jisoo'],
      splitMethod: 'EQUAL',
    });

    expect(result.expense).toMatchObject({ type: 'SHARED', paidBy: 'user-minji' });
    expect(result.shares).toHaveLength(1);
    expect(result.shares[0]).toMatchObject({
      userId: 'user-jisoo',
      shareAmountKRW: 5600,
      settlementStatus: 'PENDING',
      settledAmountKRW: 0,
    });
  });

});

describe('settlement updates', () => {
  it('derives settlement status from settled amount', () => {
    expect(deriveSettlementStatus(5600, 0)).toBe('PENDING');
    expect(deriveSettlementStatus(5600, 3000)).toBe('PARTIAL');
    expect(deriveSettlementStatus(5600, 5600)).toBe('DONE');
    expect(() => deriveSettlementStatus(5600, 5601)).toThrow(/cannot exceed/);
  });

  it('updates share settlement through mock repository and preserves paid and actual spent totals', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const created = await repository.createExpenseWithShares({
      title: '대신 결제한 커피',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-jisoo'],
      splitMethod: 'EQUAL',
    });
    const shareId = created.shares[0]?.id;
    expect(shareId).toBeDefined();

    await repository.updateShareSettlement(shareId ?? '', 3000);
    const partialExpenses = await repository.listExpensesByMonth(month);
    const partialShares = await repository.listSharesByExpenseIds([created.expense.id]);
    expect(partialShares[0]).toMatchObject({ settlementStatus: 'PARTIAL', settledAmountKRW: 3000 });
    expect(buildMonthlySummary(partialExpenses, partialShares, 'user-minji', month)).toMatchObject({
      totalPaidKRW: 5600,
      actualSpentKRW: 0,
      receivableKRW: 2600,
    });

    await repository.updateShareSettlement(shareId ?? '', 5600);
    const doneExpenses = await repository.listExpensesByMonth(month);
    const doneShares = await repository.listSharesByExpenseIds([created.expense.id]);
    expect(doneShares[0]).toMatchObject({ settlementStatus: 'DONE', settledAmountKRW: 5600 });
    expect(buildMonthlySummary(doneExpenses, doneShares, 'user-minji', month)).toMatchObject({
      totalPaidKRW: 5600,
      actualSpentKRW: 0,
      receivableKRW: 0,
    });
  });

  it('rejects invalid partial settlement amounts against remaining amount', () => {
    const pendingShare = share({ shareAmountKRW: 5600, settledAmountKRW: 3000, settlementStatus: 'PARTIAL' });

    expect(() => validatePartialSettlementAmount(pendingShare, 0)).toThrow(/0원보다 커야/);
    expect(() => validatePartialSettlementAmount(pendingShare, -1)).toThrow(/0원보다 커야/);
    expect(() => validatePartialSettlementAmount(pendingShare, 2601)).toThrow(/남은 정산금/);
    expect(() => validatePartialSettlementAmount(pendingShare, 2600)).not.toThrow();
  });

  it('rolls DONE settlement back to PENDING and restores receivable without changing paid or actual spent', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const created = await repository.createExpenseWithShares({
      title: '정산 되돌릴 커피',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-jisoo'],
      splitMethod: 'EQUAL',
    });
    const shareId = created.shares[0]?.id ?? '';

    await repository.updateShareSettlement(shareId, 5600);
    const doneExpenses = await repository.listExpensesByMonth(month);
    const doneShares = await repository.listSharesByExpenseIds([created.expense.id]);
    expect(buildMonthlySummary(doneExpenses, doneShares, 'user-minji', month)).toMatchObject({
      totalPaidKRW: 5600,
      actualSpentKRW: 0,
      receivableKRW: 0,
    });

    await repository.updateShareSettlement(shareId, 0);
    const rolledBackExpenses = await repository.listExpensesByMonth(month);
    const rolledBackShares = await repository.listSharesByExpenseIds([created.expense.id]);
    expect(rolledBackShares[0]).toMatchObject({ settlementStatus: 'PENDING', settledAmountKRW: 0 });
    expect(buildMonthlySummary(rolledBackExpenses, rolledBackShares, 'user-minji', month)).toMatchObject({
      totalPaidKRW: 5600,
      actualSpentKRW: 0,
      receivableKRW: 5600,
    });
  });
});

describe('expense updates and deletion', () => {
  it('updates a personal expense and refreshes summary totals', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const created = await repository.createExpenseWithShares({
      title: '개인 점심',
      amountKRW: 9000,
      categoryId: 'food',
      date: '2026-06-06',
      paidBy: 'ignored',
      type: 'PERSONAL',
      participantIds: ['ignored'],
      splitMethod: 'EQUAL',
    });

    await repository.updateExpenseWithShares({
      expenseId: created.expense.id,
      title: '개인 점심 수정',
      amountKRW: 12000,
      categoryId: 'food',
      date: '2026-06-06',
      paidBy: 'ignored',
      type: 'PERSONAL',
      participantIds: ['ignored'],
      splitMethod: 'EQUAL',
    });

    const expenses = await repository.listExpensesByMonth(month);
    const shares = await repository.listSharesByExpenseIds([created.expense.id]);
    expect(shares[0]).toMatchObject({ userId: 'user-minji', shareAmountKRW: 12000, settlementStatus: 'DONE' });
    expect(buildMonthlySummary(expenses, shares, 'user-minji', month)).toMatchObject({
      totalPaidKRW: 12000,
      actualSpentKRW: 12000,
      receivableKRW: 0,
      payableKRW: 0,
    });
  });

  it('recalculates shares when shared expense amount changes', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const created = await repository.createExpenseWithShares({
      title: '공유 간식',
      amountKRW: 10000,
      categoryId: 'food',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-minji', 'user-jisoo'],
      splitMethod: 'EQUAL',
    });

    await repository.updateShareSettlement(created.shares.find((item) => item.userId === 'user-jisoo')?.id ?? '', 5000);
    const updated = await repository.updateExpenseWithShares({
      expenseId: created.expense.id,
      title: '공유 간식',
      amountKRW: 12000,
      categoryId: 'food',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-minji', 'user-jisoo'],
      splitMethod: 'EQUAL',
    });

    expect(updated.shares.map((item) => item.shareAmountKRW)).toEqual([6000, 6000]);
    expect(updated.shares.find((item) => item.userId === 'user-jisoo')).toMatchObject({ settlementStatus: 'PENDING', settledAmountKRW: 0 });
  });

  it('rejects shared expense updates when direct shares do not match the total amount', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const created = await repository.createExpenseWithShares({
      title: '직접 분할 커피',
      amountKRW: 10000,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-minji', 'user-jisoo'],
      splitMethod: 'DIRECT',
      directShares: [
        { userId: 'user-minji', shareAmountKRW: 4000 },
        { userId: 'user-jisoo', shareAmountKRW: 6000 },
      ],
    });

    await expect(repository.updateExpenseWithShares({
      expenseId: created.expense.id,
      title: '직접 분할 커피 수정',
      amountKRW: 12000,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-minji', 'user-jisoo'],
      splitMethod: 'DIRECT',
      directShares: [
        { userId: 'user-minji', shareAmountKRW: 5000 },
        { userId: 'user-jisoo', shareAmountKRW: 6000 },
      ],
    })).rejects.toThrow(/must equal expense amount/);

    const expenses = await repository.listExpensesByMonth(month);
    const unchangedExpense = expenses.find((item) => item.id === created.expense.id);
    const shares = await repository.listSharesByExpenseIds([created.expense.id]);
    const shareAmountsByUserId = Object.fromEntries(shares.map((item) => [item.userId, item.shareAmountKRW]));

    expect(unchangedExpense).toMatchObject({ title: '직접 분할 커피', amountKRW: 10000 });
    expect(shareAmountsByUserId).toEqual({
      'user-jisoo': 6000,
      'user-minji': 4000,
    });
  });

  it('preserves settlement for metadata-only updates', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const created = await repository.createExpenseWithShares({
      title: '메타데이터 수정',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-jisoo'],
      splitMethod: 'EQUAL',
    });
    const shareId = created.shares[0]?.id ?? '';
    await repository.updateShareSettlement(shareId, 3000);

    const updated = await repository.updateExpenseWithShares({
      expenseId: created.expense.id,
      title: '메타데이터만 수정',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-07',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-jisoo'],
      splitMethod: 'EQUAL',
      memo: '메모만 변경',
    });

    expect(updated.expense).toMatchObject({ id: created.expense.id, title: '메타데이터만 수정', createdAt: created.expense.createdAt });
    expect(updated.shares[0]).toMatchObject({ id: shareId, settlementStatus: 'PARTIAL', settledAmountKRW: 3000 });
  });

  it('deletes an expense with shares and updates monthly summary', async () => {
    const repository = new MockExpenseRepository({ expenses: [], shares: [] });
    const created = await repository.createExpenseWithShares({
      title: '삭제할 커피',
      amountKRW: 5600,
      categoryId: 'cafe',
      date: '2026-06-06',
      paidBy: 'user-minji',
      type: 'SHARED',
      context: 'MEETING',
      participantIds: ['user-jisoo'],
      splitMethod: 'EQUAL',
    });

    await repository.deleteExpense(created.expense.id);
    const expenses = await repository.listExpensesByMonth(month);
    const shares = await repository.listSharesByExpenseIds([created.expense.id]);

    expect(expenses).toHaveLength(0);
    expect(shares).toHaveLength(0);
    expect(buildMonthlySummary(expenses, shares, 'user-minji', month)).toMatchObject({
      totalPaidKRW: 0,
      actualSpentKRW: 0,
      receivableKRW: 0,
      payableKRW: 0,
    });
  });
});

describe('monthly calculations', () => {
  it('separates paid amount, actual spent, and receivable when I paid 80,000 for 4 people', () => {
    const expenses = [expense({ id: 'dinner', amountKRW: 80000, paidBy: me, type: 'SHARED', context: 'MEETING' })];
    const shares = [me, friendA, friendB, friendC].map((userId) => share({
      id: `share-${userId}`,
      expenseId: 'dinner',
      userId,
      shareAmountKRW: 20000,
      settlementStatus: userId === me ? 'DONE' : 'PENDING',
      settledAmountKRW: userId === me ? 20000 : 0,
    }));

    expect(buildMonthlySummary(expenses, shares, me, month)).toMatchObject({
      totalPaidKRW: 80000,
      actualSpentKRW: 20000,
      receivableKRW: 60000,
      payableKRW: 0,
    });
  });

  it('separates paid amount, actual spent, and payable when someone else paid 80,000', () => {
    const expenses = [expense({ id: 'dinner', amountKRW: 80000, paidBy: friendA, type: 'SHARED', context: 'MEETING' })];
    const shares = [me, friendA, friendB, friendC].map((userId) => share({
      id: `share-${userId}`,
      expenseId: 'dinner',
      userId,
      shareAmountKRW: 20000,
      settlementStatus: userId === friendA ? 'DONE' : 'PENDING',
      settledAmountKRW: userId === friendA ? 20000 : 0,
    }));

    expect(buildMonthlySummary(expenses, shares, me, month)).toMatchObject({
      totalPaidKRW: 0,
      actualSpentKRW: 20000,
      receivableKRW: 0,
      payableKRW: 20000,
    });
  });

  it('summarizes categories by actual burden, not paid amount', () => {
    const expenses = [
      expense({ id: 'food-paid-by-me', amountKRW: 80000, paidBy: me, categoryId: 'food', type: 'SHARED', context: 'MEETING' }),
      expense({ id: 'transport-paid-by-friend', amountKRW: 18000, paidBy: friendA, categoryId: 'transport', type: 'SHARED', context: 'MEETING' }),
    ];
    const shares = [
      share({ id: 'food-me', expenseId: 'food-paid-by-me', userId: me, shareAmountKRW: 20000 }),
      share({ id: 'food-a', expenseId: 'food-paid-by-me', userId: friendA, shareAmountKRW: 60000 }),
      share({ id: 'transport-me', expenseId: 'transport-paid-by-friend', userId: me, shareAmountKRW: 6000 }),
      share({ id: 'transport-a', expenseId: 'transport-paid-by-friend', userId: friendA, shareAmountKRW: 12000 }),
    ];

    expect(calculateCategoryActualSummary(expenses, shares, me)).toEqual([
      { categoryId: 'food', amountKRW: 20000 },
      { categoryId: 'transport', amountKRW: 6000 },
    ]);
  });

  it('counts receivable when current user paid for another single burden owner', () => {
    const expenses = [expense({
      id: 'coffee-for-minji',
      title: '민지 커피',
      amountKRW: 5600,
      paidBy: me,
      type: 'SHARED',
      context: 'MEETING',
    })];
    const shares = [share({
      id: 'coffee-minji-share',
      expenseId: 'coffee-for-minji',
      userId: friendA,
      shareAmountKRW: 5600,
    })];

    expect(buildMonthlySummary(expenses, shares, me, month)).toMatchObject({
      totalPaidKRW: 5600,
      actualSpentKRW: 0,
      receivableKRW: 5600,
      payableKRW: 0,
    });
  });

  it('counts payable when another user paid for current user as single burden owner', () => {
    const expenses = [expense({
      id: 'coffee-for-me',
      title: '내 커피',
      amountKRW: 5600,
      paidBy: friendA,
      type: 'SHARED',
      context: 'MEETING',
    })];
    const shares = [share({
      id: 'coffee-me-share',
      expenseId: 'coffee-for-me',
      userId: me,
      shareAmountKRW: 5600,
    })];

    expect(buildMonthlySummary(expenses, shares, me, month)).toMatchObject({
      totalPaidKRW: 0,
      actualSpentKRW: 5600,
      receivableKRW: 0,
      payableKRW: 5600,
    });
  });
});

describe('home recent expense view', () => {
  it('uses current user ExpenseShare for actual-burden representative amount', () => {
    const row = toHomeRecentExpenseView(
      {
        ...expense({
          id: 'shared-coffee',
          amountKRW: 5600,
          paidBy: me,
          type: 'SHARED',
          context: 'MEETING',
        }),
        shares: [share({ id: 'friend-share', expenseId: 'shared-coffee', userId: friendA, shareAmountKRW: 5600 })],
      },
      me,
      'actual',
    );
    expect(row.representativeAmountKRW).toBe(0);
  });

  it('uses paidBy for paid-basis representative amount', () => {
    const sharedExpense = {
      ...expense({
        id: 'paid-by-me',
        amountKRW: 5600,
        paidBy: me,
        type: 'SHARED',
        context: 'MEETING',
      }),
      shares: [share({ id: 'friend-share', expenseId: 'paid-by-me', userId: friendA, shareAmountKRW: 5600 })],
    };

    expect(toHomeRecentExpenseView(sharedExpense, me, 'paid')).toMatchObject({
      representativeAmountKRW: 5600,
      representativeLabel: '결제',
    });
  });

  it('shows zero actual burden when current user paid for someone else', () => {
    const sharedExpense = {
      ...expense({
        id: 'coffee-for-friend',
        amountKRW: 5600,
        paidBy: me,
        type: 'SHARED',
        context: 'MEETING',
      }),
      shares: [share({ id: 'friend-share', expenseId: 'coffee-for-friend', userId: friendA, shareAmountKRW: 5600 })],
    };

    expect(toHomeRecentExpenseView(sharedExpense, me, 'actual')).toMatchObject({
      representativeAmountKRW: 0,
      representativeLabel: '내 부담',
      myShareKRW: 0,
    });
  });

  it('shows zero paid basis and share amount actual basis when someone else paid for current user', () => {
    const sharedExpense = {
      ...expense({
        id: 'coffee-for-me',
        amountKRW: 5600,
        paidBy: friendA,
        type: 'SHARED',
        context: 'MEETING',
      }),
      shares: [share({ id: 'me-share', expenseId: 'coffee-for-me', userId: me, shareAmountKRW: 5600 })],
    };

    expect(toHomeRecentExpenseView(sharedExpense, me, 'paid')).toMatchObject({ representativeAmountKRW: 0 });
    expect(toHomeRecentExpenseView(sharedExpense, me, 'actual')).toMatchObject({ representativeAmountKRW: 5600 });
  });
});
