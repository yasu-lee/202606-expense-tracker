import { useEffect, useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { AppDataProvider } from './src/state/AppDataContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppServices, createPersistentAppServices } from './src/services/appServices';

export default function App() {
  const [services, setServices] = useState<AppServices | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void createPersistentAppServices()
      .then((nextServices) => {
        if (mounted) {
          setServices(nextServices);
        }
      })
      .catch((nextError) => {
        if (mounted) {
          setError(nextError instanceof Error ? nextError.message : '로컬 저장소를 준비하지 못했습니다.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' }}>
        <Text style={{ color: '#dc2626', fontWeight: '800', fontSize: 16 }}>앱을 시작하지 못했습니다.</Text>
        <Text style={{ color: '#64748b', marginTop: 8 }}>{error}</Text>
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  if (!services) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 16 }}>로컬 지출 데이터를 불러오는 중입니다.</Text>
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  return (
    <AppDataProvider services={services}>
      <AppNavigator />
      <StatusBar barStyle="dark-content" />
    </AppDataProvider>
  );
}
