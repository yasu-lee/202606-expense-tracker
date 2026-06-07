import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { toExpenseListItemView } from '../services/expenseViewService';
import { useAppData } from '../state/AppDataContext';
import { formatKRW } from '../utils/format';
import { styles } from './styles';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export const ExpenseListScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { month, currentUser, users, categories, expenses, error, refresh, resetDevelopmentData } = useAppData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const rows = currentUser ? expenses.map((expense) => toExpenseListItemView(expense, currentUser.id, users, categories)) : [];

  const resetDatabase = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setResetError('개발용 DB를 초기화하고 seed 데이터를 다시 넣습니다. 계속하려면 한 번 더 눌러 주세요.');
      return;
    }

    try {
      setResetError(null);
      await resetDevelopmentData();
      setConfirmReset(false);
    } catch (nextError) {
      setResetError(nextError instanceof Error ? nextError.message : 'DB 초기화에 실패했습니다.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.row}>
        <View>
          <Text style={styles.subtitle}>{month}</Text>
          <Text style={styles.title}>지출 기록</Text>
        </View>
        <Pressable style={styles.button} onPress={() => navigation.navigate('AddExpense')}>
          <Text style={styles.buttonText}>추가</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.card}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={refresh}>
            <Text style={styles.secondaryButtonText}>다시 불러오기</Text>
          </Pressable>
        </View>
      ) : null}

      {__DEV__ ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>개발 도구</Text>
          {resetError ? <Text style={styles.inlineError}>{resetError}</Text> : null}
          <Pressable style={styles.destructiveButton} onPress={resetDatabase}>
            <Text style={styles.destructiveButtonText}>{confirmReset ? '정말 DB 초기화' : '개발용 DB 초기화'}</Text>
          </Pressable>
        </View>
      ) : null}

      {rows.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.sectionTitle}>아직 지출 기록이 없습니다.</Text>
          <Text style={styles.label}>추가 버튼으로 개인 지출이나 공유 지출을 등록해 보세요.</Text>
        </View>
      ) : null}

      {rows.map((row) => (
        <Pressable key={row.id} style={styles.card} onPress={() => navigation.navigate('ExpenseDetail', { expenseId: row.id })}>
          <View style={styles.row}>
            <View style={[styles.badge, row.typeLabel === '공유' ? styles.badgeShared : undefined]}>
              <Text style={styles.badgeText}>{row.typeLabel}</Text>
            </View>
            <Text style={styles.label}>{row.date}</Text>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{row.title}</Text>
              <Text style={styles.label}>{row.categoryName} · 결제자 {row.paidByName}</Text>
              <Text style={styles.label}>내 실제 부담 {formatKRW(row.myShareKRW)} · {row.settlementHint}</Text>
            </View>
            <Text style={styles.smallAmount}>{formatKRW(row.amountKRW)}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
};
