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

type Step = 'email' | 'otp' | 'name';

const STATS = [
  { value: '2M+', label: 'Students', icon: 'people', color: '#10B981' },
  { value: '50K+', label: 'Questions', icon: 'help-circle', color: '#F59E0B' },
  { value: '3', label: 'Boards', icon: 'school', color: '#EC4899' },
];

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { setStudent, boardId, standardId } = useApp();
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
        router.replace(boardId && standardId ? '/subjects' : '/onboarding');
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
      router.replace(boardId && standardId ? '/subjects' : '/onboarding');
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
        {/* ── GRADIENT HERO ── */}
        <LinearGradient
          colors={['#3730A3', '#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPad + 24 }]}
        >
          {/* Decorative blobs */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          {/* Brand row */}
          <View style={styles.heroBrand}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
              style={styles.heroLogoWrap}
            >
              <Ionicons name="school" size={30} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={styles.heroAppName}>Knowledge Park</Text>
              <View style={styles.heroTagRow}>
                <View style={styles.heroDot} />
                <Text style={styles.heroTagline}>AI-Powered Learning</Text>
              </View>
            </View>
          </View>

          {/* Hero text */}
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Master Your{'\n'}Board Exams 🎯</Text>
            <Text style={styles.heroSub}>
              Personalised AI tests, instant explanations{'\n'}and smart revision for CBSE · ICSE · GSEB
            </Text>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            {STATS.map((s, i) => (
              <View key={s.label} style={[styles.statItem, i > 0 && styles.statItemBorder]}>
                <View style={[styles.statIconWrap, { backgroundColor: s.color + '30' }]}>
                  <Ionicons name={s.icon as any} size={14} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── FORM CARD ── */}
        <View style={styles.formArea}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>

            {step === 'email' ? (
              <>
                <View style={styles.cardHeader}>
                  <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={styles.stepIconWrap}>
                    <Ionicons name="mail-outline" size={22} color="#4F46E5" />
                  </LinearGradient>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Sign in</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      We'll send a one-time code to your inbox
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: error ? '#EF4444' : colors.border }]}>
                  <Ionicons name="at-outline" size={17} color={colors.mutedForeground} />
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
                    <View style={styles.validDot}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    </View>
                  )}
                </View>

                {!!error && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
                  </View>
                )}

                <Pressable
                  style={[styles.button, { opacity: (!isValidEmail(email) || loading) ? 0.45 : 1 }]}
                  onPress={handleSendOtp}
                  disabled={!isValidEmail(email) || loading}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGrad}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                      <>
                        <Text style={styles.buttonText}>Send OTP</Text>
                        <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Trust row */}
                <View style={styles.trustRow}>
                  {['CBSE', 'ICSE', 'GSEB'].map((b) => (
                    <View key={b} style={[styles.trustBadge, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.trustBadgeText, { color: '#4F46E5' }]}>{b}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.trustNote, { color: colors.mutedForeground }]}>
                  Aligned with NCERT curriculum for all boards
                </Text>
              </>
            ) : (
              <>
                {/* Back */}
                <Pressable
                  style={styles.backRow}
                  onPress={() => {
                    setStep('email'); setOtp(''); setError('');
                    if (cooldownRef.current) clearInterval(cooldownRef.current);
                    setResendCooldown(0);
                  }}
                >
                  <View style={[styles.backCircle, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="arrow-back" size={14} color="#4F46E5" />
                  </View>
                  <Text style={[styles.backText, { color: '#4F46E5' }]}>Back to email</Text>
                </Pressable>

                {/* OTP header */}
                <View style={styles.otpHeaderWrap}>
                  <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={styles.stepIconWrap}>
                    <Ionicons name="mail-unread-outline" size={22} color="#059669" />
                  </LinearGradient>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Check your inbox</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Code sent to{' '}
                      <Text style={{ color: '#4F46E5', fontWeight: '700' }}>{email}</Text>
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>One-time password</Text>
                <TextInput
                  ref={otpInputRef}
                  style={[
                    styles.otpInput,
                    {
                      backgroundColor: colors.muted,
                      borderColor: error ? '#EF4444' : '#4F46E5' + '30',
                      color: colors.text,
                    },
                  ]}
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
                  style={[styles.button, { opacity: (otp.length < 4 || loading) ? 0.45 : 1 }]}
                  onPress={handleVerifyOtp}
                  disabled={otp.length < 4 || loading}
                >
                  <LinearGradient
                    colors={['#059669', '#10B981']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGrad}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                      <>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.buttonText}>
                          {otp.length >= 4 ? 'Verify & Continue' : `Enter ${Math.max(6 - otp.length, 2)} more digits`}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Resend */}
                <View style={styles.resendRow}>
                  {resendCooldown > 0 ? (
                    <View style={[styles.cooldownPill, { backgroundColor: colors.muted }]}>
                      <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.cooldownText, { color: colors.mutedForeground }]}>
                        Resend in <Text style={{ color: '#4F46E5', fontWeight: '700' }}>{resendCooldown}s</Text>
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleResend}
                      disabled={loading}
                      style={[styles.resendBtn, { backgroundColor: '#EEF2FF' }]}
                    >
                      <Ionicons name="refresh-outline" size={13} color="#4F46E5" />
                      <Text style={[styles.resendBtnText, { color: '#4F46E5' }]}>Resend OTP</Text>
                    </Pressable>
                  )}
                </View>

                <View style={[styles.demoHint, { backgroundColor: colors.muted }]}>
                  <Text style={{ fontSize: 16 }}>💡</Text>
                  <Text style={[styles.demoHintText, { color: colors.mutedForeground }]}>
                    Demo: enter any 6 digits to proceed
                  </Text>
                </View>
              </>
            )}

            {step === 'name' && (
              <>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.stepIconWrap}>
                    <Ionicons name="person-outline" size={22} color="#D97706" />
                  </LinearGradient>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>What's your name?</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      So we can personalise your experience
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Full name</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: error ? '#EF4444' : colors.border }]}>
                  <Ionicons name="person-outline" size={17} color={colors.mutedForeground} />
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
                  style={[styles.button, { opacity: (name.trim().length < 2 || loading) ? 0.45 : 1 }]}
                  onPress={handleSaveName}
                  disabled={name.trim().length < 2 || loading}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGrad}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Continue</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
    overflow: 'hidden',
  },

  /* Blobs */
  blob1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -70,
  },
  blob2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: -40, left: -50,
  },
  blob3: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)', top: 60, left: 40,
  },

  /* Brand */
  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroLogoWrap: {
    width: 60, height: 60, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  heroAppName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' },
  heroTagline: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  /* Hero text */
  heroTextBlock: { gap: 10 },
  heroTitle: {
    fontSize: 30, fontWeight: '800', color: '#FFFFFF', lineHeight: 38,
  },
  heroSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 22,
  },

  /* Stats */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
  statItemBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)' },
  statIconWrap: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  statValue: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.2 },

  /* Form */
  formArea: { paddingHorizontal: 20, paddingTop: 22, gap: 16 },
  card: {
    borderRadius: 28, padding: 24, gap: 0,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 22 },
  otpHeaderWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  stepIconWrap: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardHeaderText: { flex: 1 },
  cardHeading: { fontSize: 19, fontWeight: '700', marginBottom: 3 },
  cardSub: { fontSize: 13, lineHeight: 19 },

  /* Back row */
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, alignSelf: 'flex-start' },
  backCircle: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 13, fontWeight: '600' },

  /* Input */
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
  validDot: { marginLeft: 4 },

  otpInput: {
    borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 18,
    fontSize: 32, letterSpacing: 12, textAlign: 'center', fontWeight: '800', marginBottom: 12,
  },

  /* Error */
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: -4 },
  errorText: { fontSize: 12, flex: 1 },

  /* Button */
  button: { borderRadius: 18, overflow: 'hidden', marginTop: 4 },
  buttonGrad: {
    padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  /* Trust */
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  trustBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  trustBadgeText: { fontSize: 12, fontWeight: '700' },
  trustNote: { textAlign: 'center', fontSize: 12, marginTop: 8 },

  /* Resend */
  resendRow: { alignItems: 'center', marginTop: 16 },
  cooldownPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  cooldownText: { fontSize: 13 },
  resendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  resendBtnText: { fontSize: 13, fontWeight: '600' },
  demoHint: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, alignSelf: 'stretch', marginTop: 14 },
  demoHintText: { fontSize: 12, flex: 1 },
});
