import { StatusBar } from 'react-native';
import { AppDataProvider } from './src/state/AppDataContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { appServices } from './src/services/appServices';

export default function App() {
  return (
    <AppDataProvider services={appServices}>
      <AppNavigator />
      <StatusBar barStyle="dark-content" />
    </AppDataProvider>
  );
}
