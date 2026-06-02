import { useApp } from '@/context/AppContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isLoaded, studentName, boardId, standardId } = useApp();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FF' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!studentName) return <Redirect href="/login" />;
  if (!boardId || !standardId) return <Redirect href="/onboarding" />;
  return <Redirect href="/subjects" />;
}
