import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { remainingShareAmount } from '../domain/calculations';
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

export const ExpenseDetailScreen = ({ route }: Props) => {
  const { currentUser, users, categories, expenses, updateShareSettlement } = useAppData();
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
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

  const saveSettlement = async (shareId: string, settledAmountKRW: number) => {
    try {
      setError(null);
      await updateShareSettlement(shareId, settledAmountKRW);
      setPartialAmounts((current) => ({ ...current, [shareId]: String(settledAmountKRW) }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '정산 상태를 저장하지 못했습니다.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View>
        <Text style={styles.subtitle}>{expense.date} · {categoryNameById.get(expense.categoryId) ?? expense.categoryId}</Text>
        <Text style={styles.title}>{expense.title}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.label}>총 결제액</Text>
        <Text style={styles.amount}>{formatKRW(expense.amountKRW)}</Text>
        <Text style={styles.label}>결제자 {userNameById.get(expense.paidBy) ?? UNKNOWN_USER_LABEL}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>부담자별 정산</Text>
        {expense.shares.map((share) => {
          const remainingKRW = remainingShareAmount(share);
          const canSettleReceivable = expense.type === 'SHARED' && expense.paidBy === currentUser.id && share.userId !== currentUser.id;
          const canSettlePayable = expense.type === 'SHARED' && expense.paidBy !== currentUser.id && share.userId === currentUser.id;
          const canUpdate = canSettleReceivable || canSettlePayable;
          const partialText = partialAmounts[share.id] ?? String(share.settledAmountKRW);

          return (
            <View key={share.id} style={styles.shareBlock}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smallAmount}>{userNameById.get(share.userId) ?? UNKNOWN_USER_LABEL}</Text>
                  <Text style={styles.label}>부담 {formatKRW(share.shareAmountKRW)} · 남은 금액 {formatKRW(remainingKRW)}</Text>
                </View>
                <View style={[styles.badge, share.settlementStatus === 'DONE' ? styles.badgeDone : undefined]}>
                  <Text style={styles.badgeText}>{settlementLabel[share.settlementStatus]}</Text>
                </View>
              </View>

              {canUpdate ? (
                <View style={styles.settlementControls}>
                  <Pressable style={styles.secondaryButton} onPress={() => saveSettlement(share.id, share.shareAmountKRW)}>
                    <Text style={styles.secondaryButtonText}>정산 완료</Text>
                  </Pressable>
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={partialText}
                      onChangeText={(value) => setPartialAmounts((current) => ({ ...current, [share.id]: value.replace(/[^0-9]/g, '') }))}
                      keyboardType="number-pad"
                      placeholder="부분 정산액"
                    />
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => saveSettlement(share.id, Number((partialAmounts[share.id] ?? String(share.settledAmountKRW)).replace(/[^0-9]/g, '')))}
                    >
                      <Text style={styles.secondaryButtonText}>저장</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};
