import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { localApi, otpApi, smsOtpApi, type OtpUserProfile } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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

// Required for expo-auth-session redirect on web/Android
WebBrowser.maybeCompleteAuthSession();

// Google Web Client ID from google-services.json (type 3)
const GOOGLE_WEB_CLIENT_ID =
  '1027948040827-ouksn0up2tr78jg3df4norvnhvio4eg4.apps.googleusercontent.com';

type AuthMethod = 'email' | 'phone' | 'google';
type Step = 'input' | 'otp' | 'name';

const STATS = [
  { value: '2M+', label: 'Students', icon: 'people', color: '#10B981' },
  { value: '50K+', label: 'Questions', icon: 'help-circle', color: '#F59E0B' },
  { value: '3', label: 'Boards', icon: 'school', color: '#EC4899' },
];

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'India' },
  { code: '+1', flag: '🇺🇸', label: 'USA' },
  { code: '+44', flag: '🇬🇧', label: 'UK' },
  { code: '+971', flag: '🇦🇪', label: 'UAE' },
  { code: '+61', flag: '🇦🇺', label: 'Australia' },
];

export default function LoginScreen() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [step, setStep] = useState<Step>('input');

  // Email OTP state
  const [email, setEmail] = useState('');

  // Phone OTP state
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Shared OTP / name state
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { setStudent, setBoard, setStandard, boardId, standardId } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const otpInputRef = useRef<TextInput>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const isValidPhone = (p: string) => /^\d{7,15}$/.test(p.trim());
  const fullPhone = `${countryCode}${phone.trim()}`;

  const startCooldown = () => {
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const resetToInput = () => {
    setStep('input'); setOtp(''); setError('');
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(0);
  };

  const switchMethod = (m: AuthMethod) => {
    setAuthMethod(m); setStep('input');
    setEmail(''); setPhone(''); setOtp(''); setName(''); setError('');
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(0);
  };

  // ── After successful auth: resolve profile and route ─────────────────────
  const finishLogin = async (resolvedEmail: string, resolvedName: string | null, profile?: OtpUserProfile) => {
    if (resolvedName) {
      await setStudent(resolvedName, resolvedEmail);
      if (profile?.boardId && profile?.boardName && !boardId) await setBoard(profile.boardId, profile.boardName);
      if (profile?.standardId && profile?.standardName && !standardId) await setStandard(profile.standardId, profile.standardName);
      const hasBoardStd = (profile?.boardId && profile?.standardId) || (boardId && standardId);
      router.replace(hasBoardStd ? '/subjects' : '/onboarding');
    } else {
      setStep('name');
    }
  };

  // ── Email OTP ──────────────────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
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

  const handleVerifyEmailOtp = async () => {
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
      const [ourProfile, otpProfile] = await Promise.all([
        localApi.getProfile(email).catch(() => null),
        otpApi.getProfile(email).catch(() => null),
      ]);
      const merged: OtpUserProfile & { name?: string } = {
        name: ourProfile?.name ?? otpProfile?.name,
        boardId: ourProfile?.boardId ?? otpProfile?.boardId,
        boardName: ourProfile?.boardName ?? otpProfile?.boardName,
        standardId: ourProfile?.standardId ?? otpProfile?.standardId,
        standardName: ourProfile?.standardName ?? otpProfile?.standardName,
      };
      await finishLogin(email, merged.name || res.name || null, merged);
    } catch (e: any) { setError(e?.message ?? 'Verification failed. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── SMS / Phone OTP ────────────────────────────────────────────────────────
  const handleSendSmsOtp = async () => {
    if (!isValidPhone(phone)) { setError('Please enter a valid phone number.'); return; }
    setError(''); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await smsOtpApi.sendOtp(fullPhone);
      if (res.success === false) { setError(res.message ?? 'Could not send OTP.'); return; }
      setStep('otp'); startCooldown();
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (e: any) { setError(e?.message ?? 'Failed to send OTP. Check your connection.'); }
    finally { setLoading(false); }
  };

  const handleVerifySmsOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length < 4) { setError('Please enter the OTP sent to your phone.'); return; }
    setError(''); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await smsOtpApi.verifyOtp(fullPhone, trimmedOtp);
      if (res.success === false) {
        setError(res.message ?? 'Invalid OTP. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Phone login: use phone as identifier, check if name already exists
      await finishLogin(fullPhone, res.name ?? null, undefined);
    } catch (e: any) { setError(e?.message ?? 'Verification failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(''); setOtp(''); setLoading(true);
    try {
      if (authMethod === 'email') {
        await otpApi.sendOtp(email);
      } else {
        await smsOtpApi.sendOtp(fullPhone);
      }
      startCooldown();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { setError('Could not resend OTP. Try again.'); }
    finally { setLoading(false); }
  };

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Build Google OAuth URL manually (expo-auth-session approach)
      const redirectUri = `com.knowledgepark.app:/oauth2redirect/google`;
      const scope = encodeURIComponent('openid profile email');
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${GOOGLE_WEB_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${scope}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        // Extract access_token from fragment
        const fragment = result.url.split('#')[1] ?? '';
        const params = Object.fromEntries(new URLSearchParams(fragment));
        const accessToken = params['access_token'];

        if (accessToken) {
          // Fetch user info from Google
          const userRes = await fetch(
            `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
          );
          if (!userRes.ok) throw new Error('Failed to get Google profile.');
          const userInfo = await userRes.json();

          const googleEmail: string = userInfo.email ?? '';
          const googleName: string = userInfo.name ?? '';

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Save profile and route
          if (googleEmail) {
            // Check if we already have a profile
            const existing = await localApi.getProfile(googleEmail).catch(() => null);
            await setStudent(googleName || existing?.name || '', googleEmail);
            if (existing?.boardId && existing?.boardName && !boardId) await setBoard(existing.boardId, existing.boardName);
            if (existing?.standardId && existing?.standardName && !standardId) await setStandard(existing.standardId, existing.standardName);
            localApi.saveProfile({ email: googleEmail, name: googleName }).catch(() => { });
            const hasBoardStd = (existing?.boardId && existing?.standardId) || (boardId && standardId);
            if (googleName || existing?.name) {
              router.replace(hasBoardStd ? '/subjects' : '/onboarding');
            } else {
              setEmail(googleEmail);
              setStep('name');
            }
          } else {
            setError('Could not get your Google email. Please try another method.');
          }
        } else {
          setError('Google sign-in was cancelled.');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User cancelled — no error shown
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Save name (shared) ─────────────────────────────────────────────────────
  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError('Please enter your name (at least 2 characters).'); return; }
    setError(''); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const identifier = authMethod === 'phone' ? fullPhone : email;
      await setStudent(trimmed, identifier);
      localApi.saveProfile({ email: identifier, name: trimmed }).catch(() => { });
      router.replace(boardId && standardId ? '/subjects' : '/onboarding');
    } catch (e: any) { setError(e?.message ?? 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  // ── Render ─────────────────────────────────────────────────────────────────
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
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

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

          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Master Your{'\n'}Board Exams 🎯</Text>
            <Text style={styles.heroSub}>
              Personalised AI tests, instant explanations{'\n'}and smart revision for CBSE · ICSE · GSEB
            </Text>
          </View>

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

            {/* ── AUTH METHOD TABS (only on input step) ── */}
            {step === 'input' && (
              <View style={[styles.methodTabs, { backgroundColor: colors.muted }]}>
                {([
                  { key: 'email', icon: 'mail-outline', label: 'Email' },
                  { key: 'phone', icon: 'phone-portrait-outline', label: 'Phone' },
                  { key: 'google', icon: 'logo-google', label: 'Google' },
                ] as { key: AuthMethod; icon: string; label: string }[]).map((m) => (
                  <Pressable
                    key={m.key}
                    style={[
                      styles.methodTab,
                      authMethod === m.key && styles.methodTabActive,
                    ]}
                    onPress={() => switchMethod(m.key)}
                  >
                    <Ionicons
                      name={m.icon as any}
                      size={16}
                      color={authMethod === m.key ? '#4F46E5' : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.methodTabText,
                        { color: authMethod === m.key ? '#4F46E5' : colors.mutedForeground },
                        authMethod === m.key && { fontWeight: '700' },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* ════════════════════════════════════════════════════════════
                EMAIL OTP — input step
            ════════════════════════════════════════════════════════════ */}
            {authMethod === 'email' && step === 'input' && (
              <>
                <View style={[styles.cardHeader, { marginTop: 20 }]}>
                  <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={styles.stepIconWrap}>
                    <Ionicons name="mail-outline" size={22} color="#4F46E5" />
                  </LinearGradient>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Sign in with Email</Text>
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
                    onSubmitEditing={handleSendEmailOtp}
                    editable={!loading}
                  />
                  {isValidEmail(email) && (
                    <View style={styles.validDot}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    </View>
                  )}
                </View>

                {!!error && <ErrorRow message={error} />}

                <Pressable
                  style={[styles.button, { opacity: (!isValidEmail(email) || loading) ? 0.45 : 1 }]}
                  onPress={handleSendEmailOtp}
                  disabled={!isValidEmail(email) || loading}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
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

                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.mutedForeground, backgroundColor: colors.card }]}>OR</Text>
                </View>

                <Pressable
                  style={[styles.outlineButton, { borderColor: colors.border }]}
                  onPress={() => router.push('/pricing')}
                >
                  <Ionicons name="sparkles-outline" size={18} color="#4F46E5" />
                  <Text style={[styles.outlineButtonText, { color: colors.text }]}>New? View Premium Plans</Text>
                </Pressable>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════
                PHONE OTP — input step
            ════════════════════════════════════════════════════════════ */}
            {authMethod === 'phone' && step === 'input' && (
              <>
                <View style={[styles.cardHeader, { marginTop: 20 }]}>
                  <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={styles.stepIconWrap}>
                    <Ionicons name="phone-portrait-outline" size={22} color="#059669" />
                  </LinearGradient>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Sign in with Phone</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      We'll send a one-time SMS to your number
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Mobile number</Text>
                <View style={[styles.phoneRow]}>
                  {/* Country code picker */}
                  <Pressable
                    style={[styles.countryBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={() => setShowCountryPicker(!showCountryPicker)}
                  >
                    <Text style={styles.countryFlag}>
                      {COUNTRY_CODES.find(c => c.code === countryCode)?.flag ?? '🌍'}
                    </Text>
                    <Text style={[styles.countryCode, { color: colors.text }]}>{countryCode}</Text>
                    <Ionicons name={showCountryPicker ? 'chevron-up' : 'chevron-down'} size={13} color={colors.mutedForeground} />
                  </Pressable>

                  {/* Phone input */}
                  <View style={[styles.phoneInputWrap, { backgroundColor: colors.muted, borderColor: error ? '#EF4444' : colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="9876543210"
                      placeholderTextColor={colors.mutedForeground}
                      value={phone}
                      onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setError(''); }}
                      keyboardType="phone-pad"
                      maxLength={15}
                      returnKeyType="send"
                      onSubmitEditing={handleSendSmsOtp}
                      editable={!loading}
                      autoFocus
                    />
                    {isValidPhone(phone) && (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    )}
                  </View>
                </View>

                {/* Country picker dropdown */}
                {showCountryPicker && (
                  <View style={[styles.countryDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {COUNTRY_CODES.map((c) => (
                      <Pressable
                        key={c.code}
                        style={[styles.countryOption, { borderBottomColor: colors.border }]}
                        onPress={() => { setCountryCode(c.code); setShowCountryPicker(false); }}
                      >
                        <Text style={styles.countryFlag}>{c.flag}</Text>
                        <Text style={[styles.countryOptionLabel, { color: colors.text }]}>{c.label}</Text>
                        <Text style={[styles.countryOptionCode, { color: colors.mutedForeground }]}>{c.code}</Text>
                        {countryCode === c.code && <Ionicons name="checkmark" size={15} color="#4F46E5" />}
                      </Pressable>
                    ))}
                  </View>
                )}

                {!!error && <ErrorRow message={error} />}

                <Pressable
                  style={[styles.button, { opacity: (!isValidPhone(phone) || loading) ? 0.45 : 1, marginTop: showCountryPicker ? 8 : 4 }]}
                  onPress={handleSendSmsOtp}
                  disabled={!isValidPhone(phone) || loading}
                >
                  <LinearGradient
                    colors={['#059669', '#10B981']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.buttonGrad}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                      <>
                        <Ionicons name="chatbubble-ellipses-outline" size={17} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Send SMS OTP</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={[styles.smsNote, { backgroundColor: colors.muted }]}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
                  <Text style={[styles.smsNoteText, { color: colors.mutedForeground }]}>
                    Standard SMS charges may apply
                  </Text>
                </View>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════
                GOOGLE — input step
            ════════════════════════════════════════════════════════════ */}
            {authMethod === 'google' && step === 'input' && (
              <>
                <View style={[styles.cardHeader, { marginTop: 20 }]}>
                  <LinearGradient colors={['#FFF7ED', '#FFEDD5']} style={styles.stepIconWrap}>
                    <Ionicons name="logo-google" size={22} color="#EA4335" />
                  </LinearGradient>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>Continue with Google</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Sign in instantly using your Google account
                    </Text>
                  </View>
                </View>

                {!!error && <ErrorRow message={error} />}

                {/* Google Sign-In button */}
                <Pressable
                  style={[styles.googleBtn, { opacity: googleLoading ? 0.65 : 1 }]}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <View style={styles.googleBtnInner}>
                    {googleLoading ? (
                      <ActivityIndicator color="#4285F4" />
                    ) : (
                      <>
                        {/* Google "G" logo using colored letters */}
                        <View style={styles.googleLogo}>
                          <Text style={styles.googleG}>G</Text>
                        </View>
                        <Text style={styles.googleBtnText}>Sign in with Google</Text>
                      </>
                    )}
                  </View>
                </Pressable>

                <View style={[styles.divider, { marginTop: 18, marginBottom: 6 }]}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>What you get</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                {[
                  { icon: 'flash-outline', color: '#F59E0B', text: 'One-tap sign-in — no password needed' },
                  { icon: 'shield-checkmark-outline', color: '#10B981', text: 'Secured by Google — zero data shared' },
                  { icon: 'sync-outline', color: '#4F46E5', text: 'Your progress synced across devices' },
                ].map((f) => (
                  <View key={f.text} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: f.color + '20' }]}>
                      <Ionicons name={f.icon as any} size={14} color={f.color} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f.text}</Text>
                  </View>
                ))}
              </>
            )}

            {/* ════════════════════════════════════════════════════════════
                OTP VERIFICATION STEP (shared: email + phone)
            ════════════════════════════════════════════════════════════ */}
            {step === 'otp' && (
              <>
                {/* Back */}
                <Pressable style={styles.backRow} onPress={resetToInput}>
                  <View style={[styles.backCircle, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="arrow-back" size={14} color="#4F46E5" />
                  </View>
                  <Text style={[styles.backText, { color: '#4F46E5' }]}>
                    {authMethod === 'phone' ? 'Back to phone number' : 'Back to email'}
                  </Text>
                </Pressable>

                {/* OTP header */}
                <View style={styles.otpHeaderWrap}>
                  <LinearGradient
                    colors={authMethod === 'phone' ? ['#D1FAE5', '#A7F3D0'] : ['#EEF2FF', '#E0E7FF']}
                    style={styles.stepIconWrap}
                  >
                    <Ionicons
                      name={authMethod === 'phone' ? 'chatbubble-ellipses-outline' : 'mail-unread-outline'}
                      size={22}
                      color={authMethod === 'phone' ? '#059669' : '#4F46E5'}
                    />
                  </LinearGradient>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardHeading, { color: colors.text }]}>
                      {authMethod === 'phone' ? 'Check your SMS' : 'Check your inbox'}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      Code sent to{' '}
                      <Text style={{ color: '#4F46E5', fontWeight: '700' }}>
                        {authMethod === 'phone' ? fullPhone : email}
                      </Text>
                    </Text>
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>One-time password</Text>
                <TextInput
                  ref={otpInputRef}
                  style={[
                    styles.otpInput,
                    { backgroundColor: colors.muted, borderColor: error ? '#EF4444' : '#4F46E5' + '30', color: colors.text },
                  ]}
                  placeholder="· · · · · ·"
                  placeholderTextColor={colors.mutedForeground}
                  value={otp}
                  onChangeText={(t) => { setOtp(t.replace(/\D/g, '')); setError(''); }}
                  keyboardType="number-pad"
                  maxLength={8}
                  returnKeyType="done"
                  onSubmitEditing={authMethod === 'phone' ? handleVerifySmsOtp : handleVerifyEmailOtp}
                  editable={!loading}
                  autoFocus
                />

                {!!error && <ErrorRow message={error} />}

                <Pressable
                  style={[styles.button, { opacity: (otp.length < 4 || loading) ? 0.45 : 1 }]}
                  onPress={authMethod === 'phone' ? handleVerifySmsOtp : handleVerifyEmailOtp}
                  disabled={otp.length < 4 || loading}
                >
                  <LinearGradient
                    colors={authMethod === 'phone' ? ['#059669', '#10B981'] : ['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
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

            {/* ════════════════════════════════════════════════════════════
                NAME STEP (shared for all auth methods)
            ════════════════════════════════════════════════════════════ */}
            {step === 'name' && (
              <>
                <View style={[styles.cardHeader, { marginTop: 4 }]}>
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

                {!!error && <ErrorRow message={error} />}

                <Pressable
                  style={[styles.button, { opacity: (name.trim().length < 2 || loading) ? 0.45 : 1 }]}
                  onPress={handleSaveName}
                  disabled={name.trim().length < 2 || loading}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
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

// ── Shared error component ─────────────────────────────────────────────────
function ErrorRow({ message }: { message: string }) {
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
      <Text style={[styles.errorText, { color: '#EF4444' }]}>{message}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 24, paddingBottom: 40, gap: 20, overflow: 'hidden',
  },
  blob1: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -70 },
  blob2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -40, left: -50 },
  blob3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', top: 60, left: 40 },

  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroLogoWrap: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroAppName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' },
  heroTagline: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  heroTextBlock: { gap: 10 },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', lineHeight: 38 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },

  statsStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
  statItemBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)' },
  statIconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.2 },

  formArea: { paddingHorizontal: 20, paddingTop: 22, gap: 16 },
  card: { borderRadius: 28, padding: 24, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },

  // Auth method tabs
  methodTabs: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 2 },
  methodTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12 },
  methodTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  methodTabText: { fontSize: 12, fontWeight: '600' },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 22 },
  otpHeaderWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  stepIconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardHeaderText: { flex: 1 },
  cardHeading: { fontSize: 19, fontWeight: '700', marginBottom: 3 },
  cardSub: { fontSize: 13, lineHeight: 19 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 10, fontSize: 12, fontWeight: '600' },
  outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  outlineButtonText: { fontSize: 15, fontWeight: '600' },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, alignSelf: 'flex-start' },
  backCircle: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 13, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 },
  input: { flex: 1, fontSize: 16, padding: 0 },
  validDot: { marginLeft: 4 },

  // Phone input
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 13 },
  countryFlag: { fontSize: 18 },
  countryCode: { fontSize: 14, fontWeight: '700' },
  phoneInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13 },
  countryDropdown: { borderWidth: 1.5, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  countryOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  countryOptionLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  countryOptionCode: { fontSize: 13 },
  smsNote: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, padding: 10, marginTop: 12 },
  smsNoteText: { fontSize: 12, flex: 1 },

  // Google button
  googleBtn: {
    borderRadius: 18, borderWidth: 1.5, borderColor: '#DADCE0',
    backgroundColor: '#FFFFFF', marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  googleBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 12 },
  googleLogo: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center',
  },
  googleG: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: '#3C4043' },

  // Features list (Google tab)
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: '600' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  featureIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 13, flex: 1 },

  otpInput: { borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 18, fontSize: 32, letterSpacing: 12, textAlign: 'center', fontWeight: '800', marginBottom: 12 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: -4 },
  errorText: { fontSize: 12, flex: 1 },

  button: { borderRadius: 18, overflow: 'hidden', marginTop: 4 },
  buttonGrad: { padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  trustBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  trustBadgeText: { fontSize: 12, fontWeight: '700' },
  trustNote: { textAlign: 'center', fontSize: 12, marginTop: 8 },

  resendRow: { alignItems: 'center', marginTop: 16 },
  cooldownPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  cooldownText: { fontSize: 13 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  resendBtnText: { fontSize: 13, fontWeight: '600' },
  demoHint: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, alignSelf: 'stretch', marginTop: 14 },
  demoHintText: { fontSize: 12, flex: 1 },
});
