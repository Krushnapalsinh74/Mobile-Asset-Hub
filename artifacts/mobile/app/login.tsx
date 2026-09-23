import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { localApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
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

WebBrowser.maybeCompleteAuthSession();
const GOOGLE_WEB_CLIENT_ID = '1027948040827-ouksn0up2tr78jg3df4norvnhvio4eg4.apps.googleusercontent.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const { setStudent, boardId, standardId, activePlanId, setActivePlan } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate API delay for UI completeness
    setTimeout(async () => {
      try {
        await setStudent('Student', email);
        
        // Restore subscription plan from backend profile
        const profile = await localApi.getProfile(email);
        if (profile?.activePlanId) {
          await setActivePlan(profile.activePlanId);
        }
        
        localApi.saveProfile({ email, name: 'Student' }).catch(() => { });
        router.replace(boardId && standardId ? '/subjects' : '/onboarding');
      } catch (e: any) {
        setError(e.message || 'Login failed.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // In local web development, mock the Google sign in to prevent redirect_uri_mismatch
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        setTimeout(async () => {
          await setStudent('Google Student', 'google_test@example.com');
          const profile = await localApi.getProfile('google_test@example.com').catch(() => null);
          
          if (profile?.activePlanId) {
            await setActivePlan(profile.activePlanId);
            router.replace(boardId && standardId ? '/subjects' : '/onboarding');
          } else {
            // New user, no active plan -> redirect to pricing
            router.replace('/pricing');
          }
          setGoogleLoading(false);
        }, 800);
        return;
      }

      const redirectUri = typeof window !== 'undefined'
        ? window.location.origin
        : `com.knowledgepark.app:/oauth2redirect/google`;

      const scope = encodeURIComponent('openid profile email');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_WEB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const fragment = result.url.split('#')[1] ?? '';
        const params = Object.fromEntries(new URLSearchParams(fragment));
        const accessToken = params['access_token'];

        if (accessToken) {
          const userRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
          const userInfo = await userRes.json();
          const googleEmail = userInfo.email ?? '';

          if (googleEmail) {
            await setStudent('Student', googleEmail);
            const profile = await localApi.getProfile(googleEmail).catch(() => null);
            
            if (profile?.activePlanId) {
              await setActivePlan(profile.activePlanId);
              router.replace(boardId && standardId ? '/subjects' : '/onboarding');
            } else {
              // New user -> redirect to pricing
              router.replace('/pricing');
            }
          } else {
            setError('Could not get your Google email.');
          }
        }
      }
    } catch (e: any) {
      setError('Google sign-in failed.');
    } finally {
      if (Platform.OS !== 'web' || typeof window === 'undefined' || window.location.hostname !== 'localhost') {
        setGoogleLoading(false);
      }
    }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* HEADER AREA */}
        <View style={styles.headerArea}>
          <LinearGradient
            colors={['#0F2E66', '#1E40AF', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: topPad + 40 }]}
          >
            {/* The curvy bottom of the header */}
            <View style={styles.headerCurve} />

            <View style={styles.headerContent}>
              {/* Logo Side */}
              <View style={styles.logoWrap}>
                <View style={styles.logoIconBg}>
                  <Ionicons name="school" size={40} color="#FFF" />
                </View>
                <Text style={styles.logoText}>Knowledge<Text style={{ color: '#93C5FD' }}>Park</Text></Text>
                <Text style={styles.logoSubText}>Edu</Text>
                <Text style={styles.logoTagline}>Learn   •   Practice   •   Grow</Text>
              </View>

              {/* Right Side Illustration & Text */}
              <View style={styles.illustrationWrap}>
                <Text style={styles.successText}>Your{'\n'}Success{'\n'}Our Mission</Text>
                <Ionicons name="library" size={80} color="#93C5FD" style={styles.booksIcon} />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* FORM AREA */}
        <View style={styles.formArea}>
          <Text style={styles.welcomeTitle}>Welcome Back 👋</Text>
          <Text style={styles.welcomeSub}>Sign in to continue your learning journey{'\n'}with KnowledgePark.</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <Pressable style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </Pressable>
            <Pressable>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* Sign In Button */}
          <Pressable style={styles.signInButton} onPress={handleSignIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={styles.signInButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <Pressable style={styles.googleButton} onPress={handleGoogleSignIn} disabled={googleLoading}>
            {googleLoading ? <ActivityIndicator color="#4285F4" /> : (
              <>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {/* Create Account */}
          <View style={styles.createAccountRow}>
            <Text style={styles.noAccountText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={styles.createAccountText}>Create Account</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footerWrap}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>Better Learning   •   Brighter Future</Text>
            <View style={styles.footerLine} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  headerArea: { position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 60, borderBottomRightRadius: 60, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  headerGradient: { paddingBottom: 60, paddingHorizontal: 24, position: 'relative' },
  headerCurve: { position: 'absolute', bottom: -50, left: -50, right: -50, height: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 100, transform: [{ rotate: '-5deg' }] },

  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoWrap: { flex: 1 },
  logoIconBg: { marginBottom: 12 },
  logoText: { color: '#FFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  logoSubText: { color: '#93C5FD', fontSize: 26, fontWeight: '800', marginTop: -6 },
  logoTagline: { color: '#FFF', fontSize: 11, fontWeight: '600', marginTop: 8, opacity: 0.9 },

  illustrationWrap: { alignItems: 'flex-end', justifyContent: 'center' },
  successText: { color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'right', fontStyle: 'italic', transform: [{ rotate: '-10deg' }], marginBottom: 10, opacity: 0.9 },
  booksIcon: { opacity: 0.9 },

  formArea: { paddingHorizontal: 24, paddingTop: 32 },
  welcomeTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 32 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, height: 56, marginBottom: 16 },
  input: { flex: 1, marginLeft: 12, fontSize: 15, color: '#0F172A' },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  checkboxActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  rememberText: { marginLeft: 8, fontSize: 14, color: '#334155', fontWeight: '500' },
  forgotText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },

  errorText: { color: '#EF4444', marginBottom: 16, textAlign: 'center' },

  signInButton: { backgroundColor: '#2563EB', height: 56, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  signInButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 16, color: '#94A3B8', fontSize: 12, fontWeight: '600' },

  googleButton: { backgroundColor: '#FFF', height: 56, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  googleButtonText: { color: '#0F172A', fontSize: 15, fontWeight: '600' },

  createAccountRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 32, marginBottom: 40 },
  noAccountText: { color: '#64748B', fontSize: 14 },
  createAccountText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },

  footerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  footerLine: { width: 24, height: 1, backgroundColor: '#94A3B8' },
  footerText: { marginHorizontal: 12, color: '#64748B', fontSize: 11, fontWeight: '600' },
});
