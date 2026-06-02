import { useApp } from '@/context/AppContext';
import { otpApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Step = 'email' | 'otp';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { setStudent } = useApp();
  const otpInputRef = useRef<TextInput>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const startCooldown = () => {
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await otpApi.sendOtp(trimmed);
      if (res.success === false) {
        setError(res.message ?? 'Could not send OTP. Please try again.');
        return;
      }
      setEmail(trimmed);
      setStep('otp');
      startCooldown();
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send OTP. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length < 4) {
      setError('Please enter the OTP sent to your email.');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await otpApi.verifyOtp(email, trimmedOtp);
      if (res.success === false) {
        setError(res.message ?? 'Invalid OTP. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const name = res.name ?? email.split('@')[0];
      await setStudent(name, email);
      router.replace('/onboarding');
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setOtp('');
    setLoading(true);
    try {
      await otpApi.sendOtp(email);
      startCooldown();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setError('Could not resend OTP. Try again.');
    } finally {
      setLoading(false);
    }
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
              {step === 'email' ? (
                <>
                  <View style={styles.cardHeader}>
                    <View style={[styles.stepIcon, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="mail-outline" size={22} color="#4F46E5" />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardHeading}>Sign in with Email</Text>
                      <Text style={styles.cardSub}>
                        We'll send a one-time password to your inbox
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    style={[styles.input, !!error && styles.inputError]}
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    autoFocus
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSendOtp}
                    editable={!loading}
                  />

                  {!!error && (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <Pressable
                    style={[
                      styles.button,
                      (!isValidEmail(email) || loading) && styles.buttonDisabled,
                    ]}
                    onPress={handleSendOtp}
                    disabled={!isValidEmail(email) || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Send OTP</Text>
                        <Ionicons name="send-outline" size={17} color="#FFFFFF" />
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.cardHeader}>
                    <View style={[styles.stepIcon, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="key-outline" size={22} color="#10B981" />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardHeading}>Enter OTP</Text>
                      <Text style={styles.cardSub}>
                        Sent to{' '}
                        <Text style={styles.emailHighlight}>{email}</Text>
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.changeEmail}
                    onPress={() => {
                      setStep('email');
                      setOtp('');
                      setError('');
                      if (cooldownRef.current) clearInterval(cooldownRef.current);
                      setResendCooldown(0);
                    }}
                  >
                    <Ionicons name="arrow-back" size={13} color="#4F46E5" />
                    <Text style={styles.changeEmailText}>Change email</Text>
                  </Pressable>

                  <Text style={styles.label}>One-time password</Text>
                  <TextInput
                    ref={otpInputRef}
                    style={[styles.input, styles.otpInput, !!error && styles.inputError]}
                    placeholder="••••••"
                    placeholderTextColor="#9CA3AF"
                    value={otp}
                    onChangeText={(t) => { setOtp(t.replace(/\D/g, '')); setError(''); }}
                    keyboardType="number-pad"
                    maxLength={8}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOtp}
                    editable={!loading}
                    autoFocus
                  />

                  {!!error && (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <Pressable
                    style={[styles.button, (otp.length < 4 || loading) && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={otp.length < 4 || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Verify OTP</Text>
                        <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.resendRow}
                    onPress={handleResend}
                    disabled={resendCooldown > 0 || loading}
                  >
                    <Text
                      style={[
                        styles.resendText,
                        resendCooldown > 0 && styles.resendTextMuted,
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Resend OTP in ${resendCooldown}s`
                        : "Didn't receive it? Resend OTP"}
                    </Text>
                  </Pressable>
                </>
              )}
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 24,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardHeaderText: { flex: 1 },
  cardHeading: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E1B4B',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  emailHighlight: {
    color: '#4F46E5',
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  changeEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  changeEmailText: {
    fontSize: 13,
    color: '#4F46E5',
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
    backgroundColor: '#F9FAFB',
  },
  otpInput: {
    fontSize: 26,
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: -4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 13,
    color: '#4F46E5',
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
  },
  resendTextMuted: {
    color: '#9CA3AF',
  },
});
