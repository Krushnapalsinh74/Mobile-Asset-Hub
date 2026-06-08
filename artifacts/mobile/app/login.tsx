import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = 'email' | 'otp';

const STATS = [
  { value: '2M+', label: 'Students' },
  { value: '50K+', label: 'Questions' },
  { value: '3', label: 'Boards' },
];

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { setStudent } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
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

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ── GRADIENT HERO ── */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPad + 20 }]}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBrand}>
              <View style={styles.heroLogoWrap}>
                <Ionicons name="school" size={32} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.heroAppName}>EduLearn</Text>
                <Text style={styles.heroTagline}>Smart learning for Indian students</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>
              Master your{'\n'}board exams 🎯
            </Text>
            <Text style={styles.heroSub}>
              AI-powered tests, instant feedback, and personalized learning paths
            </Text>

            {/* Stats strip */}
            <View style={styles.statsStrip}>
              {STATS.map((s, i) => (
                <View key={s.label} style={[styles.statItem, i > 0 && styles.statItemBorder]}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* ── FORM CARD ── */}
        <View style={styles.formArea}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>

            {step === 'email' ? (
              <>
                <View style={styles.cardHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="mail-outline" size={22} color="#4F46E5" />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Sign in</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      We'll send a one-time code to your inbox
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, borderColor: error ? colors.destructive : 'transparent', color: colors.text }]}
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
                  style={[styles.button, { backgroundColor: '#4F46E5', opacity: (!isValidEmail(email) || loading) ? 0.45 : 1 }]}
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
                <Pressable
                  style={styles.backRow}
                  onPress={() => {
                    setStep('email'); setOtp(''); setError('');
                    if (cooldownRef.current) clearInterval(cooldownRef.current);
                    setResendCooldown(0);
                  }}
                >
                  <Ionicons name="arrow-back" size={15} color="#4F46E5" />
                  <Text style={[styles.backText, { color: '#4F46E5' }]}>Back</Text>
                </Pressable>

                <View style={styles.otpHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={{ fontSize: 22 }}>📧</Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Verify your email</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      6-digit code sent to{' '}
                      <Text style={{ color: '#4F46E5', fontFamily: 'Inter_600SemiBold' }}>{email}</Text>
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>One-time password</Text>
                <TextInput
                  ref={otpInputRef}
                  style={[styles.input, styles.otpInput, { backgroundColor: colors.muted, borderColor: error ? colors.destructive : 'transparent', color: colors.text }]}
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
                  style={[styles.button, { backgroundColor: '#4F46E5', opacity: (otp.length < 4 || loading) ? 0.45 : 1 }]}
                  onPress={handleVerifyOtp}
                  disabled={otp.length < 4 || loading}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.buttonText}>
                        {otp.length >= 4 ? 'Verify & Continue' : `Enter ${6 - otp.length} more digits`}
                      </Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.resendRow}>
                  {resendCooldown > 0 ? (
                    <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
                      Resend in <Text style={{ color: '#4F46E5', fontFamily: 'Inter_600SemiBold' }}>{resendCooldown}s</Text>
                    </Text>
                  ) : (
                    <Pressable onPress={handleResend} disabled={loading}>
                      <View style={styles.resendBtn}>
                        <Ionicons name="refresh-outline" size={13} color="#4F46E5" />
                        <Text style={[styles.resendBtnText, { color: '#4F46E5' }]}>Resend OTP</Text>
                      </View>
                    </Pressable>
                  )}
                </View>

                <View style={[styles.demoHint, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.demoHintText, { color: colors.mutedForeground }]}>
                    💡 Demo: enter any 6 digits to proceed
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Trust badges */}
          <View style={styles.trustRow}>
            {['CBSE', 'ICSE', 'GSEB'].map((b) => (
              <View key={b} style={[styles.trustBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.trustBadgeText, { color: '#4F46E5' }]}>{b}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.trustNote, { color: colors.mutedForeground }]}>
            Aligned with NCERT curriculum for all boards
          </Text>

          <View style={{ height: insets.bottom + 20 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  heroContent: { gap: 16 },
  heroBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  heroLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAppName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  heroTagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    lineHeight: 36,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statItemBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginTop: 2 },
  formArea: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  card: {
    borderRadius: 28,
    padding: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    gap: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 22,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardHeaderText: { flex: 1 },
  cardHeading: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  cardSub: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 13, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  input: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
  },
  otpInput: {
    fontSize: 28,
    letterSpacing: 10,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    paddingVertical: 16,
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  resendRow: { alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  resendText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resendBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', fontWeight: '600' },
  demoHint: {
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  demoHintText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  trustBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  trustBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  trustNote: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular' },
});
