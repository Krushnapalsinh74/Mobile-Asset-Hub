import { useApp } from '@/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setStudent } = useApp();

  const handleStart = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await setStudent(trimmed);
    router.replace('/onboarding');
  };

  return (
    <LinearGradient colors={['#312E81', '#4F46E5', '#6D28D9']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <View style={styles.content}>
            <View style={styles.logoWrap}>
              <Ionicons name="school" size={52} color="rgba(255,255,255,0.95)" />
            </View>
            <Text style={styles.appName}>EduLearn</Text>
            <Text style={styles.tagline}>Your personalized learning companion</Text>

            <View style={styles.card}>
              <Text style={styles.cardHeading}>Welcome! Let's get started.</Text>
              <Text style={styles.cardSub}>Enter your name to personalize your experience</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name..."
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleStart}
              />
              <Pressable
                style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
                onPress={handleStart}
                disabled={!name.trim() || loading}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    marginBottom: 44,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 44,
    elevation: 16,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1B4B',
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'Inter_400Regular',
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
