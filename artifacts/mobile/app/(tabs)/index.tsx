import { useApp } from '@/context/AppContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { isLoaded, studentEmail, boardId, standardId } = useApp();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4EEE5' }}>
        <ActivityIndicator size="large" color="#C85C3E" />
      </View>
    );
  }

  if (!studentEmail) return <Redirect href="/welcome" />;
  if (!boardId || !standardId) return <Redirect href="/onboarding" />;
  return <Redirect href="/subjects" />;
}
