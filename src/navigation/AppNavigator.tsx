import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { ExpenseListScreen } from '../screens/ExpenseListScreen';
import { ExpenseFormScreen } from '../screens/ExpenseFormScreen';
import { ExpenseDetailScreen } from '../screens/ExpenseDetailScreen';

export type RootStackParamList = {
  Tabs: undefined;
  AddExpense: { expenseId?: string } | undefined;
  ExpenseDetail: { expenseId: string };
};

export type TabParamList = {
  Home: undefined;
  List: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const Tabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#2563eb',
      tabBarLabelStyle: { fontWeight: '700' },
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
    <Tab.Screen name="List" component={ExpenseListScreen} options={{ title: '기록' }} />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddExpense"
        component={ExpenseFormScreen}
        options={({ route }) => ({ title: route.params?.expenseId ? '지출 수정' : '지출 추가', presentation: 'modal' })}
      />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} options={{ title: '정산 상세', presentation: 'modal' }} />
    </Stack.Navigator>
  </NavigationContainer>
);
