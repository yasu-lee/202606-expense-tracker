import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { toExpenseListItemView } from '../services/expenseViewService';
import { useAppData } from '../state/AppDataContext';
import { formatKRW } from '../utils/format';
import { styles } from './styles';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export const ExpenseListScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { month, currentUser, users, categories, expenses } = useAppData();
  const rows = currentUser ? expenses.map((expense) => toExpenseListItemView(expense, currentUser.id, users, categories)) : [];

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
