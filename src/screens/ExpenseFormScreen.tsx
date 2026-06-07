import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { CreateExpenseInput, SplitMethod, ExpenseType } from '../domain/types';
import { useAppData } from '../state/AppDataContext';
import { toLocalDateKey } from '../utils/date';
import { styles } from './styles';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const TODAY = toLocalDateKey();

export const ExpenseFormScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { currentUser, users, categories, createExpense } = useAppData();
  const [type, setType] = useState<ExpenseType>('PERSONAL');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('EQUAL');
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'food');
  const [date, setDate] = useState(TODAY);
  const [paidBy, setPaidBy] = useState(currentUser?.id ?? 'user-minji');
  const [participantIds, setParticipantIds] = useState<string[]>(currentUser ? [currentUser.id] : ['user-minji']);
  const [memo, setMemo] = useState('');
  const [directAmounts, setDirectAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const amountKRW = useMemo(() => Number(amountText.replace(/[^0-9]/g, '')), [amountText]);

  const toggleType = (nextType: ExpenseType) => {
    setType(nextType);
    if (nextType === 'PERSONAL' && currentUser) {
      setPaidBy(currentUser.id);
      setParticipantIds([currentUser.id]);
      setSplitMethod('EQUAL');
    }
    if (nextType === 'SHARED' && currentUser) {
      setParticipantIds([currentUser.id, ...users.filter((user) => user.id !== currentUser.id).slice(0, 2).map((user) => user.id)]);
    }
  };

  const toggleParticipant = (userId: string) => {
    if (type === 'PERSONAL') {
      return;
    }
    setParticipantIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  };

  const submit = async () => {
    if (!currentUser) {
      setError('mock current user를 불러오는 중입니다.');
      return;
    }

    try {
      setError(null);
      const baseInput: CreateExpenseInput = {
        title,
        amountKRW,
        categoryId,
        date,
        paidBy: type === 'PERSONAL' ? currentUser.id : paidBy,
        type,
        context: type === 'PERSONAL' ? 'DAILY' : 'MEETING',
        memo,
        participantIds: type === 'PERSONAL' ? [currentUser.id] : participantIds,
        splitMethod: type === 'PERSONAL' ? 'EQUAL' : splitMethod,
      };

      const input: CreateExpenseInput =
        type === 'SHARED' && splitMethod === 'DIRECT'
          ? {
              ...baseInput,
              directShares: participantIds.map((userId) => ({
                userId,
                shareAmountKRW: Number((directAmounts[userId] ?? '').replace(/[^0-9]/g, '')),
              })),
            }
          : baseInput;

      await createExpense(input);
      navigation.goBack();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '저장에 실패했습니다.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>지출 추가</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, type === 'PERSONAL' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => toggleType('PERSONAL')}>
          <Text style={styles.secondaryButtonText}>개인</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, type === 'SHARED' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => toggleType('SHARED')}>
          <Text style={styles.secondaryButtonText}>공유</Text>
        </Pressable>
      </View>

      <TextInput style={styles.input} value={amountText} onChangeText={setAmountText} keyboardType="number-pad" placeholder="금액 (KRW 정수)" />
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="제목 또는 메모" />
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <TextInput style={styles.input} value={memo} onChangeText={setMemo} placeholder="메모 (선택)" />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>카테고리</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((category) => (
            <Pressable key={category.id} style={[styles.chip, categoryId === category.id ? styles.chipSelected : undefined]} onPress={() => setCategoryId(category.id)}>
              <Text style={styles.chipText}>{category.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {type === 'SHARED' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>결제자</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {users.map((user) => (
                <Pressable key={user.id} style={[styles.chip, paidBy === user.id ? styles.chipSelected : undefined]} onPress={() => setPaidBy(user.id)}>
                  <Text style={styles.chipText}>{user.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>부담자</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {users.map((user) => (
                <Pressable key={user.id} style={[styles.chip, participantIds.includes(user.id) ? styles.chipSelected : undefined]} onPress={() => toggleParticipant(user.id)}>
                  <Text style={styles.chipText}>{user.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>분할 방식</Text>
            <View style={styles.row}>
              <Pressable style={[styles.secondaryButton, splitMethod === 'EQUAL' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => setSplitMethod('EQUAL')}>
                <Text style={styles.secondaryButtonText}>균등 분할</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, splitMethod === 'DIRECT' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => setSplitMethod('DIRECT')}>
                <Text style={styles.secondaryButtonText}>직접 입력</Text>
              </Pressable>
            </View>
            {splitMethod === 'DIRECT'
              ? participantIds.map((userId) => {
                  const user = users.find((item) => item.id === userId);
                  return (
                    <TextInput
                      key={userId}
                      style={styles.input}
                      value={directAmounts[userId] ?? ''}
                      onChangeText={(value) => setDirectAmounts((current) => ({ ...current, [userId]: value }))}
                      keyboardType="number-pad"
                      placeholder={`${user?.name ?? '부담자'} 부담액`}
                    />
                  );
                })
              : <Text style={styles.label}>나머지는 선택한 부담자 순서대로 앞 사람부터 1원씩 배분합니다.</Text>}
          </View>
        </>
      ) : null}

      <Pressable style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>저장</Text>
      </Pressable>
    </ScrollView>
  );
};
