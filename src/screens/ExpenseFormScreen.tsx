import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { isFinancialExpenseEdit } from '../domain/expenseFactory';
import { CreateExpenseInput, SplitMethod, ExpenseType, UpdateExpenseInput } from '../domain/types';
import { useAppData } from '../state/AppDataContext';
import { toLocalDateKey } from '../utils/date';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AddExpense'>;

const TODAY = toLocalDateKey();

export const ExpenseFormScreen = ({ navigation, route }: Props) => {
  const { currentUser, users, categories, expenses, createExpense, updateExpense } = useAppData();
  const editingExpense = expenses.find((expense) => expense.id === route.params?.expenseId);
  const isEditMode = Boolean(route.params?.expenseId);
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
  const [resetWarningAcknowledged, setResetWarningAcknowledged] = useState(false);

  const amountKRW = useMemo(() => Number(amountText.replace(/[^0-9]/g, '')), [amountText]);

  useEffect(() => {
    if (!editingExpense) {
      if (currentUser) {
        setPaidBy(currentUser.id);
        setParticipantIds([currentUser.id]);
      }
      if (categories[0]) {
        setCategoryId(categories[0].id);
      }
      return;
    }

    setType(editingExpense.type);
    setSplitMethod('DIRECT');
    setTitle(editingExpense.title);
    setAmountText(String(editingExpense.amountKRW));
    setCategoryId(editingExpense.categoryId);
    setDate(editingExpense.date);
    setPaidBy(editingExpense.paidBy);
    setParticipantIds(editingExpense.shares.map((share) => share.userId));
    setMemo(editingExpense.memo ?? '');
    setDirectAmounts(Object.fromEntries(editingExpense.shares.map((share) => [share.userId, String(share.shareAmountKRW)])));
  }, [categories, currentUser, editingExpense]);

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
    setResetWarningAcknowledged(false);
  };

  const buildInput = (): CreateExpenseInput => {
    if (!currentUser) {
      throw new Error('현재 사용자를 불러오는 중입니다.');
    }

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

    return type === 'SHARED' && splitMethod === 'DIRECT'
      ? {
          ...baseInput,
          directShares: participantIds.map((userId) => ({
            userId,
            shareAmountKRW: Number((directAmounts[userId] ?? '').replace(/[^0-9]/g, '')),
          })),
        }
      : baseInput;
  };

  const submit = async () => {
    if (!currentUser) {
      setError('현재 사용자를 불러오는 중입니다.');
      return;
    }

    try {
      setError(null);
      const input = buildInput();
      if (editingExpense) {
        const updateInput: UpdateExpenseInput = { ...input, expenseId: editingExpense.id };
        const resetsSettlement = isFinancialExpenseEdit(editingExpense, editingExpense.shares, updateInput, currentUser.id);
        const hasSettlement = editingExpense.shares.some((share) => share.settledAmountKRW > 0 && share.userId !== editingExpense.paidBy);
        if (resetsSettlement && hasSettlement && !resetWarningAcknowledged) {
          setResetWarningAcknowledged(true);
          setError('금액/결제자/부담자 변경은 기존 정산 상태를 초기화합니다. 계속하려면 저장을 한 번 더 눌러 주세요.');
          return;
        }
        await updateExpense(updateInput);
      } else {
        await createExpense(input);
      }
      navigation.goBack();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '저장에 실패했습니다.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isEditMode ? '지출 수정' : '지출 추가'}</Text>

      {isEditMode && !editingExpense ? <Text style={styles.error}>수정할 지출을 찾을 수 없습니다.</Text> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, type === 'PERSONAL' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => toggleType('PERSONAL')}>
          <Text style={styles.secondaryButtonText}>개인</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, type === 'SHARED' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => toggleType('SHARED')}>
          <Text style={styles.secondaryButtonText}>공유</Text>
        </Pressable>
      </View>

      <TextInput style={styles.input} value={amountText} onChangeText={(value) => { setAmountText(value); setResetWarningAcknowledged(false); }} keyboardType="number-pad" placeholder="금액 (KRW 정수)" />
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
                <Pressable key={user.id} style={[styles.chip, paidBy === user.id ? styles.chipSelected : undefined]} onPress={() => { setPaidBy(user.id); setResetWarningAcknowledged(false); }}>
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
              <Pressable style={[styles.secondaryButton, splitMethod === 'EQUAL' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => { setSplitMethod('EQUAL'); setResetWarningAcknowledged(false); }}>
                <Text style={styles.secondaryButtonText}>균등 분할</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, splitMethod === 'DIRECT' ? styles.selectedButton : undefined, { flex: 1 }]} onPress={() => { setSplitMethod('DIRECT'); setResetWarningAcknowledged(false); }}>
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
                      onChangeText={(value) => {
                        setDirectAmounts((current) => ({ ...current, [userId]: value }));
                        setResetWarningAcknowledged(false);
                      }}
                      keyboardType="number-pad"
                      placeholder={`${user?.name ?? '부담자'} 부담액`}
                    />
                  );
                })
              : <Text style={styles.label}>나머지는 선택한 부담자 순서대로 앞 사람부터 1원씩 배분합니다.</Text>}
          </View>
        </>
      ) : null}

      <Pressable style={[styles.button, isEditMode && !editingExpense ? styles.disabledButton : undefined]} onPress={submit} disabled={isEditMode && !editingExpense}>
        <Text style={styles.buttonText}>{isEditMode ? '수정 저장' : '저장'}</Text>
      </Pressable>
    </ScrollView>
  );
};
