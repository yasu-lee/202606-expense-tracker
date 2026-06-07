import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { toHomeRecentExpenseView } from '../services/expenseViewService';
import { useAppData } from '../state/AppDataContext';
import { formatKRW } from '../utils/format';
import { styles } from './styles';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { month, currentUser, summary, error } = useAppData();
  const [basis, setBasis] = useState<'paid' | 'actual'>('actual');

  const heroAmount = basis === 'paid' ? summary?.totalPaidKRW ?? 0 : summary?.actualSpentKRW ?? 0;
  const recentExpenseRows =
    currentUser && summary ? summary.recentExpenses.map((expense) => toHomeRecentExpenseView(expense, currentUser.id, basis)) : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View>
        <Text style={styles.subtitle}>{currentUser?.name ?? 'mock user'}님의 {month} 요약</Text>
        <Text style={styles.title}>이번 달 소비</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, basis === 'paid' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => setBasis('paid')}>
          <Text style={styles.secondaryButtonText}>결제 기준</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, basis === 'actual' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => setBasis('actual')}>
          <Text style={styles.secondaryButtonText}>실제 부담 기준</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{basis === 'paid' ? '내가 결제한 금액' : 'ExpenseShare 기준 실제 부담액'}</Text>
        <Text style={styles.amount}>{formatKRW(heroAmount)}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>이번 달 결제액</Text>
            <Text style={styles.smallAmount}>{formatKRW(summary?.totalPaidKRW ?? 0)}</Text>
          </View>
          <View>
            <Text style={styles.label}>실제 부담액</Text>
            <Text style={styles.smallAmount}>{formatKRW(summary?.actualSpentKRW ?? 0)}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>받을 돈</Text>
            <Text style={styles.smallAmount}>{formatKRW(summary?.receivableKRW ?? 0)}</Text>
          </View>
          <View>
            <Text style={styles.label}>보낼 돈</Text>
            <Text style={styles.smallAmount}>{formatKRW(summary?.payableKRW ?? 0)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>카테고리별 실제 부담</Text>
        {summary?.categoryActualSummary.map((item) => (
          <View key={item.categoryId} style={styles.row}>
            <Text style={styles.label}>{item.categoryName}</Text>
            <Text style={styles.smallAmount}>{formatKRW(item.amountKRW)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>최근 지출</Text>
        {recentExpenseRows.length === 0 ? <Text style={styles.label}>최근 지출이 없습니다.</Text> : null}
        {recentExpenseRows.map((expense) => (
          <Pressable key={expense.id} style={styles.listRow} onPress={() => navigation.navigate('ExpenseDetail', { expenseId: expense.id })}>
            <View>
              <Text style={styles.smallAmount}>{expense.title}</Text>
              <Text style={styles.label}>{expense.date} · {expense.typeLabel}</Text>
              {expense.settlementHint ? <Text style={styles.metaText}>{expense.settlementHint}</Text> : null}
            </View>
            <View style={styles.amountColumn}>
              <Text style={styles.label}>{expense.representativeLabel}</Text>
              <Text style={styles.smallAmount}>{formatKRW(expense.representativeAmountKRW)}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.button} onPress={() => navigation.navigate('AddExpense')}>
        <Text style={styles.buttonText}>+ 지출 추가</Text>
      </Pressable>
    </ScrollView>
  );
};
