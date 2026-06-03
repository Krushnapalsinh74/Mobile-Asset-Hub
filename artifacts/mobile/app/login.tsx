import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { otpApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  const colors = useColors();
  const otpInputRef = useRef<TextInput>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

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
    if (!isValidEmail(trimmed)) { setError('Please enter a valid email address.'); return; }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await otpApi.sendOtp(trimmed);
      if (res.success === false) { setError(res.message ?? 'Could not send OTP. Please try again.'); return; }
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
    if (trimmedOtp.length < 4) { setError('Please enter the OTP sent to your email.'); return; }
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
    } catch { setError('Could not resend OTP. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.content}>
          {/* Brand top */}
          <View style={styles.brand}>
            <View style={[styles.logoWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="school" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>EduLearn</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Your personalized learning companion
            </Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {step === 'email' ? (
              <>
                <View style={styles.cardHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="mail-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Sign in</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      We'll send a one-time password to your inbox
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.secondary, borderColor: error ? colors.destructive : colors.border, color: colors.text },
                  ]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
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
                    <Ionicons name="alert-circle-outline" size={13} color={colors.destructive} />
                    <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                  </View>
                )}

                <Pressable
                  style={[styles.button, { backgroundColor: colors.primary, opacity: (!isValidEmail(email) || loading) ? 0.45 : 1 }]}
                  onPress={handleSendOtp}
                  disabled={!isValidEmail(email) || loading}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Text style={styles.buttonText}>Send OTP</Text>
                      <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.cardHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="key-outline" size={20} color={colors.success} />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Enter OTP</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Sent to{' '}
                      <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                        {email}
                      </Text>
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.changeEmail}
                  onPress={() => {
                    setStep('email'); setOtp(''); setError('');
                    if (cooldownRef.current) clearInterval(cooldownRef.current);
                    setResendCooldown(0);
                  }}
                >
                  <Ionicons name="arrow-back" size={13} color={colors.primary} />
                  <Text style={[styles.changeEmailText, { color: colors.primary }]}>Change email</Text>
                </Pressable>

                <Text style={[styles.label, { color: colors.text }]}>One-time password</Text>
                <TextInput
                  ref={otpInputRef}
                  style={[
                    styles.input,
                    styles.otpInput,
                    { backgroundColor: colors.secondary, borderColor: error ? colors.destructive : colors.border, color: colors.text },
                  ]}
                  placeholder="······"
                  placeholderTextColor={colors.mutedForeground}
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
                    <Ionicons name="alert-circle-outline" size={13} color={colors.destructive} />
                    <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                  </View>
                )}

                <Pressable
                  style={[styles.button, { backgroundColor: colors.primary, opacity: (otp.length < 4 || loading) ? 0.45 : 1 }]}
                  onPress={handleVerifyOtp}
                  disabled={otp.length < 4 || loading}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Text style={styles.buttonText}>Verify OTP</Text>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>

                <Pressable style={styles.resendRow} onPress={handleResend} disabled={resendCooldown > 0 || loading}>
                  <Text style={[styles.resendText, { color: resendCooldown > 0 ? colors.mutedForeground : colors.primary }]}>
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Didn't receive it? Resend OTP"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 28,
  },
  brand: { alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: { fontSize: 30, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  tagline: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  card: {
    width: '100%',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 22,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardHeaderText: { flex: 1 },
  cardHeading: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  cardSub: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  changeEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  changeEmailText: { fontSize: 13, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    paddingVertical: 15,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: -4,
  },
  errorText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  button: {
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  resendRow: { alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  resendText: { fontSize: 13, fontFamily: 'Inter_500Medium', fontWeight: '500' },
});
