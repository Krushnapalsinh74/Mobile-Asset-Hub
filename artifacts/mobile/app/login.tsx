import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { localApi } from '@/services/api';
import { firebaseAuth } from '@/services/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KNOWLEDGE_PARK_LOGO_IMAGE, APP_SUB_TAGLINE } from '@/constants/branding';

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
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;
  const isCompactMobile = !isDesktop && height <= 900;
  const headerEntrance = useRef(new Animated.Value(0)).current;
  const formEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.stagger(90, [
      Animated.timing(headerEntrance, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(formEntrance, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [formEntrance, headerEntrance]);

  const headerEntranceStyle = {
    opacity: headerEntrance,
    transform: [{ translateY: headerEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
  const formEntranceStyle = {
    opacity: formEntrance,
    transform: [{ translateY: formEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  const handleSignIn = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let authenticated = false;
    let displayName = 'Student';

    // 1. Authenticate with Firebase Authentication
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
      if (userCredential.user) {
        displayName = userCredential.user.displayName || 'Student';
        authenticated = true;
      }
    } catch (fbErr: any) {
      const fbCode = fbErr?.code;

      // 2. Fallback: Authenticate against backend /auth/login (for backend accounts / admin)
      try {
        const res = await fetch('https://kpark-edu.web.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.token) {
            displayName = data.user?.name?.trim() || 'Student';
            authenticated = true;
          }
        }
      } catch {}

      if (!authenticated) {
        if (
          fbCode === 'auth/invalid-credential' ||
          fbCode === 'auth/wrong-password' ||
          fbCode === 'auth/user-not-found'
        ) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (fbCode === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else if (fbCode === 'auth/too-many-requests') {
          setError('Too many failed attempts. Please try again later.');
        } else {
          setError(fbErr?.message || 'Login failed. Invalid email or password.');
        }
        setLoading(false);
        return;
      }
    }

    if (authenticated) {
      try {
        const profile = await localApi.getProfile(cleanEmail).catch(() => null);
        if (profile?.name && profile.name !== 'Student') {
          displayName = profile.name;
        }

        await setStudent(displayName, cleanEmail);

        if (profile?.activePlanId) {
          await setActivePlan(profile.activePlanId);
        }

        localApi.saveProfile({ email: cleanEmail, name: displayName }).catch(() => {});
        router.replace(
          profile?.boardId && profile?.standardId
            ? '/subjects'
            : (boardId && standardId ? '/subjects' : '/onboarding')
        );
      } catch (e: any) {
        setError(e.message || 'Login failed during session setup.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        const result = await signInWithPopup(firebaseAuth, provider);
        const googleEmail = result.user.email;
        if (!googleEmail) {
          throw new Error('Google did not return an email address.');
        }

        await setStudent(result.user.displayName || 'Student', googleEmail);
        const profile = await localApi.getProfile(googleEmail).catch(() => null);
        if (profile?.activePlanId) {
          await setActivePlan(profile.activePlanId);
        }
        router.replace(profile?.boardId && profile?.standardId ? '/subjects' : '/onboarding');
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
            }
            router.replace(profile?.boardId && profile?.standardId ? '/subjects' : '/onboarding');
          } else {
            setError('Could not get your Google email.');
          }
        }
      }
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? ` (${e.code})` : '';
      setError(`${e?.message || 'Google sign-in failed.'}${code}`);
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isDesktop}
        contentContainerStyle={[
          styles.scroll,
          isCompactMobile && styles.compactScroll,
          isDesktop && styles.desktopScroll,
        ]}
      >

        {/* HEADER AREA */}
        <Animated.View style={[styles.headerArea, isCompactMobile && styles.compactHeaderArea, isDesktop && styles.desktopHeaderArea, headerEntranceStyle]}>
          <LinearGradient
            colors={isDesktop || isCompactMobile ? ['#C85C3E', '#9E3F2B'] : ['#FFFDF9', '#F8EDE3']}
            style={[
              styles.headerGradient,
              isCompactMobile && styles.compactHeaderGradient,
              isDesktop && styles.desktopHeaderGradient,
              { paddingTop: topPad + (isCompactMobile ? 12 : 24) },
            ]}
          >
            <View style={styles.headerCurve} />
            {isDesktop && <View style={styles.desktopAccentCircle} />}

            <View style={[styles.headerContent, isDesktop && styles.desktopHeaderContent]}>
              {/* Logo Side */}
              <View style={[styles.logoWrap, isDesktop && styles.desktopLogoWrap]}>
                <View style={styles.brandLogoContainer}>
                  <Image
                    source={KNOWLEDGE_PARK_LOGO_IMAGE}
                    style={isDesktop ? styles.desktopBrandLogo : styles.mobileBrandLogo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.logoTagline, isCompactMobile && styles.compactLogoTagline, isDesktop && styles.desktopLogoTagline]}>{APP_SUB_TAGLINE}</Text>
                {isDesktop && (
                  <>
                    <Text style={styles.desktopPanelCopy}>
                      Your focused space to learn, practice, and make progress every day.
                    </Text>
                    <View style={styles.desktopHighlights}>
                      <View style={styles.desktopHighlight}>
                        <View style={styles.desktopHighlightIcon}>
                          <Ionicons name="sparkles-outline" size={16} color="#C85C3E" />
                        </View>
                        <Text style={styles.desktopHighlightText}>Personalized learning</Text>
                      </View>
                      <View style={styles.desktopHighlight}>
                        <View style={styles.desktopHighlightIcon}>
                          <Ionicons name="trophy-outline" size={16} color="#C85C3E" />
                        </View>
                        <Text style={styles.desktopHighlightText}>Practice with confidence</Text>
                      </View>
                      <View style={styles.desktopHighlight}>
                        <View style={styles.desktopHighlightIcon}>
                          <Ionicons name="analytics-outline" size={16} color="#C85C3E" />
                        </View>
                        <Text style={styles.desktopHighlightText}>See your progress</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Right Side Illustration & Text */}
              <View style={[styles.illustrationWrap, isDesktop && styles.desktopIllustrationWrap]}>
                <Text style={[styles.successText, isCompactMobile && styles.compactSuccessText, isDesktop && styles.desktopSuccessText]}>Your{'\n'}Success{'\n'}Our Mission</Text>
                <Ionicons name="library" size={isCompactMobile ? 60 : 80} color={isDesktop ? '#F6DFD2' : '#DDA07A'} style={styles.booksIcon} />
              </View>
            </View>
            {!isDesktop && (
              <View style={styles.mobileWelcomeHint}>
                <View style={styles.mobileWelcomeHintIcon}>
                  <Ionicons name="sparkles-outline" size={14} color="#C85C3E" />
                </View>
                <Text style={styles.mobileWelcomeHintText}>Your next learning win starts here</Text>
                <Ionicons name="arrow-forward" size={14} color="#C85C3E" />
              </View>
            )}
            {isDesktop && (
              <View style={styles.desktopSnapshot}>
                <View style={styles.snapshotHeader}>
                  <Text style={styles.snapshotLabel}>THIS WEEK</Text>
                  <Ionicons name="trending-up" size={16} color="#FFF8EF" />
                </View>
                <View style={styles.snapshotStats}>
                  <View>
                    <Text style={styles.snapshotValue}>12.5h</Text>
                    <Text style={styles.snapshotCaption}>Study time</Text>
                  </View>
                  <View>
                    <Text style={styles.snapshotValue}>86%</Text>
                    <Text style={styles.snapshotCaption}>Accuracy</Text>
                  </View>
                  <View>
                    <Text style={styles.snapshotValue}>07</Text>
                    <Text style={styles.snapshotCaption}>Topics done</Text>
                  </View>
                </View>
                <View style={styles.snapshotBars}>
                  {[38, 56, 44, 74, 62, 88, 68].map((height, index) => (
                    <View key={index} style={styles.snapshotBarTrack}>
                      <View style={[styles.snapshotBar, { height: `${height}%` }]} />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

          {/* FORM AREA */}
        <Animated.View style={[
          styles.formArea,
          !isDesktop && styles.mobileFormArea,
          isCompactMobile && styles.compactFormArea,
          isDesktop && styles.desktopFormArea,
          formEntranceStyle,
        ]}>
          {isDesktop && (
            <View style={styles.desktopFormBadge}>
              <Ionicons name="lock-closed-outline" size={14} color="#C85C3E" />
              <Text style={styles.desktopFormBadgeText}>SECURE STUDENT ACCESS</Text>
            </View>
          )}
          <Text style={[styles.welcomeTitle, isCompactMobile && styles.compactWelcomeTitle]}>Welcome Back 👋</Text>
          <Text style={[styles.welcomeSub, isCompactMobile && styles.compactWelcomeSub]}>Sign in to continue your learning journey{'\n'}with KnowledgePark.</Text>

          {/* Email Input */}
          <View style={[styles.inputContainer, isCompactMobile && styles.compactInputContainer]}>
            <Ionicons name="mail-outline" size={20} color="#76645B" />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#A49186"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={[styles.inputContainer, isCompactMobile && styles.compactInputContainer]}>
            <Ionicons name="lock-closed-outline" size={20} color="#76645B" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#A49186"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#76645B" />
            </Pressable>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={[styles.optionsRow, isCompactMobile && styles.compactOptionsRow]}>
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
          <Pressable style={[styles.signInButton, isCompactMobile && styles.compactButton]} onPress={handleSignIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={styles.signInButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={[styles.dividerWrap, isCompactMobile && styles.compactDividerWrap]}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <Pressable style={[styles.googleButton, isCompactMobile && styles.compactButton]} onPress={handleGoogleSignIn} disabled={googleLoading}>
            {googleLoading ? <ActivityIndicator color="#4285F4" /> : (
              <>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {/* Create Account */}
          <View style={[styles.createAccountRow, isCompactMobile && styles.compactCreateAccountRow]}>
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
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEE5' },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  compactScroll: { paddingBottom: 24 },
  desktopScroll: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 12,
  },

  headerArea: { margin: 16, overflow: 'hidden', backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#DFD1C3', borderRadius: 22, shadowColor: '#3D2D27', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  compactHeaderArea: { margin: 10, borderRadius: 18 },
  desktopHeaderArea: {
    flex: 1,
    width: 'auto',
    margin: 0,
    justifyContent: 'center',
    borderColor: '#C85C3E',
    backgroundColor: '#C85C3E',
  },
  headerGradient: { paddingBottom: 28, paddingHorizontal: 20, position: 'relative', backgroundColor: '#FFFDF9' },
  compactHeaderGradient: { paddingBottom: 12, paddingHorizontal: 16 },
  desktopHeaderGradient: {
    flex: 1,
    backgroundColor: '#C85C3E',
    paddingHorizontal: 42,
    paddingBottom: 42,
  },
  headerCurve: { position: 'absolute', top: -80, right: -80, width: 190, height: 190, backgroundColor: '#F6DFD2', borderRadius: 100 },
  desktopAccentCircle: {
    position: 'absolute',
    left: -90,
    bottom: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#B84F35',
    opacity: 0.5,
  },
  desktopSnapshot: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 248, 239, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 248, 239, 0.24)',
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snapshotLabel: {
    color: '#F6DFD2',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  snapshotStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  snapshotValue: {
    color: '#FFF8EF',
    fontSize: 19,
    fontWeight: '800',
  },
  snapshotCaption: {
    color: '#F6DFD2',
    fontSize: 10,
    marginTop: 3,
  },
  snapshotBars: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  snapshotBarTrack: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: 5,
    backgroundColor: 'rgba(255, 248, 239, 0.12)',
  },
  snapshotBar: {
    width: '100%',
    borderRadius: 5,
    backgroundColor: '#F6DFD2',
  },

  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  desktopHeaderContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  logoWrap: { flex: 1 },
  desktopLogoWrap: { flex: 0 },
  brandLogoContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  mobileBrandLogo: { width: 190, height: 48 },
  desktopBrandLogo: { width: 240, height: 58 },
  logoIconBg: { marginBottom: 12 },
  logoText: { color: '#3D2D27', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  compactLogoText: { color: '#FFF8EF', fontSize: 22 },
  logoAccent: { color: '#E4B08A' },
  desktopLogoText: { color: '#FFF8EF', fontSize: 30 },
  desktopLogoAccent: { color: '#F6DFD2' },
  logoTagline: { color: '#76645B', fontSize: 11, fontWeight: '600', marginTop: 8 },
  compactLogoTagline: { color: '#F6DFD2', fontSize: 9, marginTop: 4 },
  desktopLogoTagline: { color: '#F6DFD2' },
  desktopPanelCopy: {
    maxWidth: 260,
    color: '#FFF8EF',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 22,
  },
  desktopHighlights: {
    gap: 12,
    marginTop: 18,
  },
  desktopHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopHighlightIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8EF',
  },
  desktopHighlightText: {
    color: '#FFF8EF',
    fontSize: 13,
    fontWeight: '600',
  },

  illustrationWrap: { alignItems: 'flex-end', justifyContent: 'center' },
  desktopIllustrationWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 24,
  },
  successText: { color: '#C85C3E', fontSize: 13, fontWeight: '700', textAlign: 'right', fontStyle: 'italic', transform: [{ rotate: '-10deg' }], marginBottom: 10 },
  compactSuccessText: { color: '#FFF8EF', fontSize: 11, lineHeight: 15, marginBottom: 5 },
  desktopSuccessText: { color: '#FFF8EF', fontSize: 20, lineHeight: 27 },
  booksIcon: { opacity: 0.9 },

  formArea: { margin: 16, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#DFD1C3', borderRadius: 22 },
  mobileFormArea: {
    borderTopWidth: 3,
    borderTopColor: '#C85C3E',
  },
  compactFormArea: {
    margin: 10,
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderRadius: 18,
  },
  mobileWelcomeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#F0D8C9',
  },
  mobileWelcomeHintIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6DFD2',
  },
  mobileWelcomeHintText: {
    color: '#8E422E',
    fontSize: 11,
    fontWeight: '700',
  },
  desktopFormArea: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 520,
    width: '100%',
    maxWidth: 520,
    margin: 0,
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 32,
    paddingBottom: 28,
    borderRadius: 22,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  desktopFormBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F6DFD2',
    marginBottom: 18,
  },
  desktopFormBadgeText: {
    color: '#8E422E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  welcomeTitle: { fontSize: 28, fontWeight: '800', color: '#3D2D27', marginBottom: 8, fontFamily: 'serif' },
  compactWelcomeTitle: { fontSize: 24, marginBottom: 4 },
  welcomeSub: { fontSize: 14, color: '#76645B', lineHeight: 22, marginBottom: 32 },
  compactWelcomeSub: { fontSize: 12, lineHeight: 17, marginBottom: 16 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#DFD1C3', borderRadius: 12, paddingHorizontal: 16, height: 56, marginBottom: 16 },
  compactInputContainer: { height: 46, marginBottom: 10, paddingHorizontal: 13 },
  input: { flex: 1, marginLeft: 12, fontSize: 15, color: '#3D2D27' },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  compactOptionsRow: { marginBottom: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: '#DFD1C3', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF9' },
  checkboxActive: { backgroundColor: '#C85C3E', borderColor: '#C85C3E' },
  rememberText: { marginLeft: 8, fontSize: 14, color: '#334155', fontWeight: '500' },
  forgotText: { fontSize: 14, color: '#C85C3E', fontWeight: '600' },

  errorText: { color: '#EF4444', marginBottom: 16, textAlign: 'center' },

  signInButton: { backgroundColor: '#C85C3E', height: 56, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#C85C3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  signInButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  compactButton: { height: 48 },

  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  compactDividerWrap: { marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 16, color: '#A49186', fontSize: 12, fontWeight: '600' },

  googleButton: { backgroundColor: '#FFFDF9', height: 56, borderRadius: 14, borderWidth: 1, borderColor: '#DFD1C3', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  googleButtonText: { color: '#3D2D27', fontSize: 15, fontWeight: '600' },

  createAccountRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 32, marginBottom: 40 },
  compactCreateAccountRow: { marginTop: 18, marginBottom: 18 },
  noAccountText: { color: '#76645B', fontSize: 14 },
  createAccountText: { color: '#C85C3E', fontSize: 14, fontWeight: '700' },

  footerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  footerLine: { width: 24, height: 1, backgroundColor: '#A49186' },
  footerText: { marginHorizontal: 12, color: '#76645B', fontSize: 11, fontWeight: '600' },
});
