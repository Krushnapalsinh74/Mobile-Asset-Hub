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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = 'email' | 'otp' | 'name';

const STATS = [
  { value: '2M+', label: 'Students', icon: 'people' },
  { value: '50K+', label: 'Questions', icon: 'help-circle' },
  { value: '3', label: 'Boards', icon: 'school' },
];

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
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
        if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) { setError('Please enter a valid email address.'); return; }
    setError(''); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await otpApi.sendOtp(trimmed);
      if (res.success === false) { setError(res.message ?? 'Could not send OTP.'); return; }
      setEmail(trimmed); setStep('otp'); startCooldown();
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (e: any) { setError(e?.message ?? 'Failed to send OTP. Check your connection.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length < 4) { setError('Please enter the OTP sent to your email.'); return; }
    setError(''); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await otpApi.verifyOtp(email, trimmedOtp);
      if (res.success === false) {
        setError(res.message ?? 'Invalid OTP. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (res.name) {
        await setStudent(res.name, email);
        router.replace('/onboarding');
      } else {
        setStep('name');
      }
    } catch (e: any) { setError(e?.message ?? 'Verification failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError('Please enter your name (at least 2 characters).'); return; }
    setError(''); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setStudent(trimmed, email);
      router.replace('/onboarding');
    } catch (e: any) { setError(e?.message ?? 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(''); setOtp(''); setLoading(true);
    try {
      await otpApi.sendOtp(email); startCooldown();
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
        {/* ── HERO ── */}
        <View style={[styles.hero, { paddingTop: topPad + 28 }]}>
          <View style={styles.heroBrand}>
            <View style={styles.heroLogoWrap}>
              <Ionicons name="school" size={26} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.heroAppName}>Knowledge Park</Text>
              <Text style={styles.heroTagline}>AI-Powered Learning</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Master Your{'\n'}Board Exams</Text>
          <Text style={styles.heroSub}>
            Personalised AI tests and instant explanations{'\n'}for CBSE · ICSE · GSEB
          </Text>

          <View style={styles.statsStrip}>
            {STATS.map((s, i) => (
              <View key={s.label} style={[styles.statItem, i > 0 && styles.statItemBorder]}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── FORM ── */}
        <View style={[styles.formArea, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

            {step === 'email' && (
              <>
                <View style={styles.cardHeader}>
                  <View style={[styles.stepIconWrap, { backgroundColor: colors.muted }]}>
                    <Ionicons name="mail-outline" size={20} color={colors.text} />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Sign in</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      We'll send a one-time code to your inbox
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
                <View style={[styles.inputWrap, {
                  backgroundColor: colors.input,
                  borderColor: error ? '#EF4444' : colors.border,
                }]}>
                  <Ionicons name="at-outline" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
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
                  {isValidEmail(email) && (
                    <Ionicons name="checkmark-circle" size={17} color="#10B981" />
                  )}
                </View>

                {!!error && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
                  </View>
                )}

                <Pressable
                  style={[styles.button, {
                    backgroundColor: colors.primary,
                    opacity: (!isValidEmail(email) || loading) ? 0.4 : 1,
                  }]}
                  onPress={handleSendOtp}
                  disabled={!isValidEmail(email) || loading}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Text style={styles.buttonText}>Send OTP</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </>
                  )}
                </Pressable>

                <View style={styles.trustRow}>
                  {['CBSE', 'ICSE', 'GSEB'].map((b) => (
                    <View key={b} style={[styles.trustBadge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.trustBadgeText, { color: colors.mutedForeground }]}>{b}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.trustNote, { color: colors.mutedForeground }]}>
                  Aligned with NCERT curriculum for all boards
                </Text>
              </>
            )}

            {(step === 'otp' || step === 'name') && (
              <>
                <Pressable
                  style={styles.backRow}
                  onPress={() => {
                    if (step === 'name') { setStep('otp'); return; }
                    setStep('email'); setOtp(''); setError('');
                    if (cooldownRef.current) clearInterval(cooldownRef.current);
                    setResendCooldown(0);
                  }}
                >
                  <View style={[styles.backCircle, { backgroundColor: colors.muted }]}>
                    <Ionicons name="arrow-back" size={14} color={colors.text} />
                  </View>
                  <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text>
                </Pressable>

                {step === 'otp' && (
                  <>
                    <View style={styles.cardHeader}>
                      <View style={[styles.stepIconWrap, { backgroundColor: colors.muted }]}>
                        <Ionicons name="mail-unread-outline" size={20} color={colors.text} />
                      </View>
                      <View style={styles.cardHeaderText}>
                        <Text style={[styles.cardHeading, { color: colors.text }]}>Check your inbox</Text>
                        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                          Code sent to <Text style={{ color: colors.accent, fontWeight: '700' }}>{email}</Text>
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.label, { color: colors.text }]}>One-time password</Text>
                    <TextInput
                      ref={otpInputRef}
                      style={[styles.otpInput, {
                        backgroundColor: colors.input,
                        borderColor: error ? '#EF4444' : colors.border,
                        color: colors.text,
                      }]}
                      placeholder="· · · · · ·"
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
                        <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                        <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
                      </View>
                    )}

                    <Pressable
                      style={[styles.button, {
                        backgroundColor: colors.primary,
                        opacity: (otp.length < 4 || loading) ? 0.4 : 1,
                      }]}
                      onPress={handleVerifyOtp}
                      disabled={otp.length < 4 || loading}
                    >
                      {loading ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <Ionicons name="shield-checkmark-outline" size={17} color="#FFF" />
                          <Text style={styles.buttonText}>
                            {otp.length >= 4 ? 'Verify & Continue' : `Enter ${Math.max(6 - otp.length, 2)} more digits`}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    <View style={styles.resendRow}>
                      {resendCooldown > 0 ? (
                        <View style={[styles.cooldownPill, { backgroundColor: colors.muted }]}>
                          <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                          <Text style={[styles.cooldownText, { color: colors.mutedForeground }]}>
                            Resend in <Text style={{ color: colors.text, fontWeight: '700' }}>{resendCooldown}s</Text>
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={handleResend}
                          disabled={loading}
                          style={[styles.resendBtn, { backgroundColor: colors.muted }]}
                        >
                          <Ionicons name="refresh-outline" size={13} color={colors.mutedForeground} />
                          <Text style={[styles.resendBtnText, { color: colors.mutedForeground }]}>Resend OTP</Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={[styles.demoHint, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.demoHintText, { color: colors.mutedForeground }]}>
                        Demo: enter any 6 digits to proceed
                      </Text>
                    </View>
                  </>
                )}

                {step === 'name' && (
                  <>
                    <View style={styles.cardHeader}>
                      <View style={[styles.stepIconWrap, { backgroundColor: colors.muted }]}>
                        <Ionicons name="person-outline" size={20} color={colors.text} />
                      </View>
                      <View style={styles.cardHeaderText}>
                        <Text style={[styles.cardHeading, { color: colors.text }]}>What's your name?</Text>
                        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                          So we can personalise your experience
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.label, { color: colors.text }]}>Full name</Text>
                    <View style={[styles.inputWrap, {
                      backgroundColor: colors.input,
                      borderColor: error ? '#EF4444' : colors.border,
                    }]}>
                      <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="e.g. Priya Sharma"
                        placeholderTextColor={colors.mutedForeground}
                        value={name}
                        onChangeText={(t) => { setName(t); setError(''); }}
                        autoFocus
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleSaveName}
                        editable={!loading}
                      />
                    </View>

                    {!!error && (
                      <View style={styles.errorRow}>
                        <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                        <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
                      </View>
                    )}

                    <Pressable
                      style={[styles.button, {
                        backgroundColor: colors.primary,
                        opacity: (name.trim().length < 2 || loading) ? 0.4 : 1,
                      }]}
                      onPress={handleSaveName}
                      disabled={name.trim().length < 2 || loading}
                    >
                      {loading ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <Ionicons name="checkmark" size={18} color="#FFF" />
                          <Text style={styles.buttonText}>Continue</Text>
                        </>
                      )}
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 18,
  },

  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroLogoWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroAppName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroTagline: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

  heroTitle: {
    fontSize: 30, fontWeight: '800', color: '#FFFFFF', lineHeight: 38,
  },
  heroSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 22,
  },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  statItemBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.2 },

  formArea: { paddingHorizontal: 16, paddingTop: 20 },
  card: {
    borderRadius: 24, padding: 22, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
    gap: 0,
  },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  stepIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardHeaderText: { flex: 1, justifyContent: 'center' },
  cardHeading: { fontSize: 18, fontWeight: '700', marginBottom: 3 },
  cardSub: { fontSize: 13, lineHeight: 18 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, alignSelf: 'flex-start' },
  backCircle: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 13, fontWeight: '500' },

  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },

  otpInput: {
    borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 18,
    fontSize: 30, letterSpacing: 10, textAlign: 'center', fontWeight: '800', marginBottom: 12,
  },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: -4 },
  errorText: { fontSize: 12, flex: 1 },

  button: {
    borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  trustBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  trustBadgeText: { fontSize: 12, fontWeight: '600' },
  trustNote: { textAlign: 'center', fontSize: 12, marginTop: 8 },

  resendRow: { alignItems: 'center', marginTop: 16 },
  cooldownPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  cooldownText: { fontSize: 12 },
  resendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
  },
  resendBtnText: { fontSize: 13, fontWeight: '600' },
  demoHint: {
    borderRadius: 12, padding: 12, marginTop: 16, alignItems: 'center',
  },
  demoHintText: { fontSize: 12 },
});
