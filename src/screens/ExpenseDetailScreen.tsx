import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { remainingShareAmount } from '../domain/calculations';
import { validatePartialSettlementAmount } from '../domain/settlement';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAppData } from '../state/AppDataContext';
import { formatKRW } from '../utils/format';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ExpenseDetail'>;

const settlementLabel = {
  PENDING: '미정산',
  PARTIAL: '부분 정산',
  DONE: '정산 완료',
};

const UNKNOWN_USER_LABEL = '알 수 없는 사용자';

export const ExpenseDetailScreen = ({ navigation, route }: Props) => {
  const { currentUser, users, categories, expenses, updateShareSettlement, deleteExpense } = useAppData();
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
  const [shareErrors, setShareErrors] = useState<Record<string, string>>({});
  const [activePartialShareId, setActivePartialShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const expense = expenses.find((item) => item.id === route.params.expenseId);

  const userNameById = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  if (!expense || !currentUser) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <Text style={styles.error}>지출 정보를 찾을 수 없습니다.</Text>
      </ScrollView>
    );
  }

  const myShare = expense.shares.find((share) => share.userId === currentUser.id);
  const myShareKRW = myShare?.shareAmountKRW ?? 0;
  const receivableKRW =
    expense.paidBy === currentUser.id
      ? expense.shares.filter((share) => share.userId !== currentUser.id).reduce((sum, share) => sum + remainingShareAmount(share), 0)
      : 0;
  const payableKRW = expense.paidBy !== currentUser.id && myShare ? remainingShareAmount(myShare) : 0;
  const settlementDirectionLabel = expense.paidBy === currentUser.id ? '받을 돈' : '보낼 돈';
  const settlementDirectionAmount = expense.paidBy === currentUser.id ? receivableKRW : payableKRW;

  const saveSettlement = async (shareId: string, settledAmountKRW: number) => {
    try {
      setError(null);
      setShareErrors((current) => ({ ...current, [shareId]: '' }));
      await updateShareSettlement(shareId, settledAmountKRW);
      setPartialAmounts((current) => ({ ...current, [shareId]: '' }));
      setActivePartialShareId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '정산 상태를 저장하지 못했습니다.');
    }
  };

  const savePartialSettlement = async (shareId: string, partialText: string) => {
    const share = expense?.shares.find((item) => item.id === shareId);
    if (!share) {
      return;
    }
    if (!/^[0-9]+$/.test(partialText.trim())) {
      setShareErrors((current) => ({ ...current, [shareId]: '부분 정산액은 숫자로 입력해 주세요.' }));
      return;
    }

    const partialAmountKRW = Number(partialText);
    try {
      validatePartialSettlementAmount(share, partialAmountKRW);
      await saveSettlement(share.id, share.settledAmountKRW + partialAmountKRW);
    } catch (nextError) {
      setShareErrors((current) => ({
        ...current,
        [shareId]: nextError instanceof Error ? nextError.message : '부분 정산액을 확인해 주세요.',
      }));
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expense) {
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      setError('삭제하면 지출과 부담자 정산 정보가 함께 삭제됩니다. 계속하려면 삭제를 한 번 더 눌러 주세요.');
      return;
    }

    try {
      setError(null);
      await deleteExpense(expense.id);
      navigation.goBack();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '지출을 삭제하지 못했습니다.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View>
        <Text style={styles.subtitle}>{expense.type === 'PERSONAL' ? '개인 지출' : '공유 지출'}</Text>
        <Text style={styles.title}>{expense.title}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => navigation.navigate('AddExpense', { expenseId: expense.id })}>
          <Text style={styles.secondaryButtonText}>수정</Text>
        </Pressable>
        <Pressable style={[styles.destructiveButton, { flex: 1 }]} onPress={confirmDeleteExpense}>
          <Text style={styles.destructiveButtonText}>{confirmDelete ? '정말 삭제' : '삭제'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>지출 상세</Text>
        <View style={styles.detailGrid}>
          <View>
            <Text style={styles.label}>날짜</Text>
            <Text style={styles.smallAmount}>{expense.date}</Text>
          </View>
          <View>
            <Text style={styles.label}>카테고리</Text>
            <Text style={styles.smallAmount}>{categoryNameById.get(expense.categoryId) ?? expense.categoryId}</Text>
          </View>
          <View>
            <Text style={styles.label}>총 결제액</Text>
            <Text style={styles.smallAmount}>{formatKRW(expense.amountKRW)}</Text>
          </View>
          <View>
            <Text style={styles.label}>결제자</Text>
            <Text style={styles.smallAmount}>{userNameById.get(expense.paidBy) ?? UNKNOWN_USER_LABEL}</Text>
          </View>
        </View>
        <View style={styles.detailGrid}>
          <View>
            <Text style={styles.label}>내 실제 부담</Text>
            <Text style={styles.amount}>{formatKRW(myShareKRW)}</Text>
          </View>
          <View>
            <Text style={styles.label}>{settlementDirectionLabel}</Text>
            <Text style={styles.amount}>{formatKRW(settlementDirectionAmount)}</Text>
          </View>
        </View>
        {expense.memo ? (
          <View>
            <Text style={styles.label}>메모</Text>
            <Text style={styles.metaText}>{expense.memo}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>부담자별 정산</Text>
        {expense.shares.map((share) => {
          const remainingKRW = remainingShareAmount(share);
          const canSettleReceivable = expense.type === 'SHARED' && expense.paidBy === currentUser.id && share.userId !== currentUser.id;
          const canSettlePayable = expense.type === 'SHARED' && expense.paidBy !== currentUser.id && share.userId === currentUser.id;
          const canUpdate = canSettleReceivable || canSettlePayable;
          const partialText = partialAmounts[share.id] ?? '';
          const shareError = shareErrors[share.id];

          return (
            <View key={share.id} style={styles.shareBlock}>
              <View style={styles.settlementRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smallAmount}>{userNameById.get(share.userId) ?? UNKNOWN_USER_LABEL}</Text>
                  <Text style={styles.label}>
                    부담 {formatKRW(share.shareAmountKRW)} · 정산 {formatKRW(share.settledAmountKRW)} · 남은 {formatKRW(remainingKRW)}
                  </Text>
                </View>
                <View style={styles.settlementActions}>
                  <View style={[styles.badge, share.settlementStatus === 'DONE' ? styles.badgeDone : undefined]}>
                    <Text style={styles.badgeText}>{settlementLabel[share.settlementStatus]}</Text>
                  </View>
                  {canUpdate && share.settlementStatus !== 'DONE' ? (
                    <View style={styles.actionChipRow}>
                      <Pressable style={styles.actionChip} onPress={() => setActivePartialShareId(activePartialShareId === share.id ? null : share.id)}>
                        <Text style={styles.actionChipText}>부분</Text>
                      </Pressable>
                      <Pressable style={styles.actionChip} onPress={() => saveSettlement(share.id, share.shareAmountKRW)}>
                        <Text style={styles.actionChipText}>완료</Text>
                      </Pressable>
                      {share.settlementStatus === 'PARTIAL' ? (
                        <Pressable style={[styles.actionChip, styles.destructiveChip]} onPress={() => saveSettlement(share.id, 0)}>
                          <Text style={[styles.actionChipText, styles.destructiveChipText]}>되돌리기</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {canUpdate && share.settlementStatus === 'DONE' ? (
                    <Pressable style={[styles.actionChip, styles.destructiveChip]} onPress={() => saveSettlement(share.id, 0)}>
                      <Text style={[styles.actionChipText, styles.destructiveChipText]}>되돌리기</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {canUpdate && activePartialShareId === share.id ? (
                <View style={styles.compactSettlementInput}>
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={partialText}
                      onChangeText={(value) => setPartialAmounts((current) => ({ ...current, [share.id]: value }))}
                      keyboardType="number-pad"
                      placeholder={expense.paidBy === currentUser.id ? '이번에 받은 금액' : '이번에 보낸 금액'}
                    />
                    <Pressable
                      style={styles.actionChip}
                      onPress={() => savePartialSettlement(share.id, partialAmounts[share.id] ?? '')}
                    >
                      <Text style={styles.actionChipText}>저장</Text>
                    </Pressable>
                  </View>
                  {shareError ? <Text style={styles.inlineError}>{shareError}</Text> : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};
