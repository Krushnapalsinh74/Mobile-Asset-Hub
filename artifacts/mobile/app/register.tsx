import { useApp } from '@/context/AppContext';
import { subscriptionApi } from '@/services/api';
import { firebaseAuth } from '@/services/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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

export default function RegisterScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [selectedPlanId, setSelectedPlanId] = useState<string | number | undefined>(planId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;
  const isCompactMobile = !isDesktop && height <= 900;
  const headerEntrance = useRef(new Animated.Value(0)).current;
  const formEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!planId) {
      subscriptionApi
        .getPlans()
        .then((plans) => {
          if (plans && plans.length > 0) {
            setSelectedPlanId(plans[0].id);
          }
        })
        .catch(() => {});
    }
  }, [planId]);

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

  const { setStudent } = useApp();

  const handleRegister = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setError('All fields are required.');
      return;
    }
    if (cleanPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const effectivePlanId = planId || selectedPlanId || '1';

    setLoading(true);
    setError('');

    try {
      // 1. Create user in Firebase Auth
      let fbUserCreated = false;
      try {
        const userCred = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
        if (userCred.user) {
          await updateProfile(userCred.user, { displayName: cleanName });
          fbUserCreated = true;
        }
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          setError('An account with this email already exists. Please log in.');
          setLoading(false);
          return;
        } else if (fbErr.code === 'auth/weak-password') {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        } else if (fbErr.code === 'auth/invalid-email') {
          setError('Please provide a valid email address.');
          setLoading(false);
          return;
        } else {
          console.warn('Firebase registration notice:', fbErr.message);
        }
      }

      // 2. Establish student session in app context
      await setStudent(cleanName, cleanEmail);

      // 3. Register user with subscription/backend API
      const res = await subscriptionApi.register({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        planId: effectivePlanId,
      }).catch((err) => {
        if (!fbUserCreated) throw err;
        return null;
      });

      if (res?.order?.id) {
        router.push({
          pathname: '/checkout',
          params: {
            orderId: res.order.id,
            amount: res.order.amount.toString(),
            currency: res.order.currency,
            token: res.token,
            email: cleanEmail,
            name: cleanName,
          },
        });
      } else {
        router.replace('/onboarding');
      }
    } catch (e: any) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

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
        <Animated.View style={[styles.brandPanel, isCompactMobile && styles.compactBrandPanel, isDesktop && styles.desktopBrandPanel, headerEntranceStyle]}>
          <LinearGradient
            colors={['#C85C3E', '#9E3F2B']}
            style={[
              styles.header,
              isCompactMobile && styles.compactHeader,
              isDesktop && styles.desktopHeader,
              { paddingTop: topPad + (isCompactMobile ? 12 : 24) },
            ]}
          >
            <View style={styles.headerCurve} />
            <View style={[styles.headerContent, isDesktop && styles.desktopHeaderContent]}>
              {isDesktop ? (
                <>
                  <View style={styles.desktopLogoWrap}>
                    <View style={styles.desktopLogoIcon}>
                      <Ionicons name="school" size={40} color="#F6DFD2" />
                    </View>
                    <Text style={styles.desktopBrandName} numberOfLines={1}>
                      Knowledge<Text style={styles.brandAccent}>Park</Text>
                    </Text>
                    <Text style={styles.brandTagline}>Learn   •   Practice   •   Grow</Text>
                    <Text style={styles.desktopPanelCopy}>
                      Your focused space to learn, practice, and make progress every day.
                    </Text>
                    <View style={styles.benefits}>
                      <View style={styles.benefitRow}>
                        <View style={styles.benefitIcon}><Ionicons name="sparkles-outline" size={16} color="#C85C3E" /></View>
                        <Text style={styles.benefitText}>Personalized learning</Text>
                      </View>
                      <View style={styles.benefitRow}>
                        <View style={styles.benefitIcon}><Ionicons name="trophy-outline" size={16} color="#C85C3E" /></View>
                        <Text style={styles.benefitText}>Practice with confidence</Text>
                      </View>
                      <View style={styles.benefitRow}>
                        <View style={styles.benefitIcon}><Ionicons name="analytics-outline" size={16} color="#C85C3E" /></View>
                        <Text style={styles.benefitText}>See your progress</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.desktopIllustrationWrap}>
                    <Text style={styles.missionText}>Your{'\n'}Success{'\n'}Our Mission</Text>
                    <Ionicons name="library" size={80} color="#F6DFD2" />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.backLogoRow}>
                    <Pressable onPress={handleBack} style={styles.backButton} accessibilityLabel="Go back">
                      <Ionicons name="arrow-back" size={22} color="#FFF8EF" />
                    </Pressable>
                    <View style={styles.brandLogoBox}>
                      <Image
                        source={KNOWLEDGE_PARK_LOGO_IMAGE}
                        style={styles.registerBrandLogo}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                  <Text style={styles.brandTagline}>{APP_SUB_TAGLINE}</Text>
                  <Text style={[styles.panelCopy, isCompactMobile && styles.compactPanelCopy]}>
                    Create your account and make progress with a learning experience built around you.
                  </Text>
                  {!isCompactMobile && (
                    <View style={styles.benefits}>
                      <View style={styles.benefitRow}>
                        <View style={styles.benefitIcon}><Ionicons name="sparkles-outline" size={16} color="#C85C3E" /></View>
                        <Text style={styles.benefitText}>Personalized learning</Text>
                      </View>
                      <View style={styles.benefitRow}>
                        <View style={styles.benefitIcon}><Ionicons name="trophy-outline" size={16} color="#C85C3E" /></View>
                        <Text style={styles.benefitText}>Practice with confidence</Text>
                      </View>
                      <View style={styles.benefitRow}>
                        <View style={styles.benefitIcon}><Ionicons name="analytics-outline" size={16} color="#C85C3E" /></View>
                        <Text style={styles.benefitText}>See your progress</Text>
                      </View>
                    </View>
                  )}
                  {isCompactMobile && (
                    <View style={styles.mobileHint}>
                      <Ionicons name="sparkles-outline" size={16} color="#C85C3E" />
                      <Text style={styles.mobileHintText}>Your next learning win starts here</Text>
                    </View>
                  )}
                </>
              )}
            </View>
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
                  {[38, 56, 44, 74, 62, 88, 68].map((barHeight, index) => (
                    <View key={index} style={styles.snapshotBarTrack}>
                      <View style={[styles.snapshotBar, { height: `${barHeight}%` }]} />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[
          styles.formArea,
          isCompactMobile && styles.compactFormArea,
          isDesktop && styles.desktopFormArea,
          formEntranceStyle,
        ]}>
          <View style={styles.formIntro}>
            <View style={styles.accessBadge}>
              <Ionicons name="person-add-outline" size={14} color="#C85C3E" />
              <Text style={styles.accessBadgeText}>YOUR STUDENT ACCOUNT</Text>
            </View>
            <Text style={[styles.title, isCompactMobile && styles.compactTitle]}>Create Account</Text>
            <Text style={[styles.subtitle, isCompactMobile && styles.compactSubtitle]}>
              Join KnowledgePark and start learning today.
            </Text>
          </View>

          <View style={[styles.formFields, isDesktop && styles.desktopFormFields]}>
            <View style={[styles.fieldGroup, isDesktop && styles.desktopFieldGroup]}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputWrap, isCompactMobile && styles.compactInputWrap, isDesktop && styles.desktopInputWrap]}>
                <Ionicons name="person-outline" size={18} color="#76645B" />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#A49186"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={[styles.fieldGroup, isDesktop && styles.desktopFieldGroup]}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrap, isCompactMobile && styles.compactInputWrap, isDesktop && styles.desktopInputWrap]}>
                <Ionicons name="mail-outline" size={18} color="#76645B" />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#A49186"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={[styles.fieldGroup, isDesktop && styles.desktopFieldGroup]}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, isCompactMobile && styles.compactInputWrap, isDesktop && styles.desktopInputWrap]}>
                <Ionicons name="lock-closed-outline" size={18} color="#76645B" />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor="#A49186"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            </View>
          </View>

          <View style={[styles.formActions, isDesktop && styles.desktopFormActions]}>
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {!planId && (
              <View style={styles.planNotice}>
                <Ionicons name="information-circle-outline" size={18} color="#8E422E" />
                <Text style={styles.planNoticeText}>
                  Plan selection is temporarily unavailable. You can sign in while payment setup is being moved to the admin website.
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.button, isCompactMobile && styles.compactButton, isDesktop && styles.desktopButton, { opacity: loading || !planId ? 0.7 : 1 }]}
              onPress={handleRegister}
              disabled={loading || !planId}
            >
              <LinearGradient colors={['#C85C3E', '#B84F35']} style={styles.buttonGrad}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                  <>
                    <Text style={styles.buttonText}>{planId ? 'Continue to Payment' : 'Plan selection unavailable'}</Text>
                    {planId && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={[styles.loginLink, isCompactMobile && styles.compactLoginLink, isDesktop && styles.desktopLoginLink]}>
              <Text style={styles.loginPrompt}>Already have an account? </Text>
              <Pressable onPress={() => router.replace('/login')}>
                <Text style={styles.loginAction}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEE5' },
  scroll: { flexGrow: 1, paddingBottom: 24 },
  compactScroll: { paddingBottom: 24 },
  desktopScroll: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandPanel: {
    margin: 12,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#C85C3E',
  },
  compactBrandPanel: { margin: 10, borderRadius: 18 },
  desktopBrandPanel: {
    flex: 1,
    margin: 0,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#C85C3E',
  },
  header: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  compactHeader: { paddingHorizontal: 16, paddingBottom: 12 },
  desktopHeader: { flex: 1, paddingHorizontal: 42, paddingBottom: 42 },
  headerCurve: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 190,
    height: 190,
    borderRadius: 100,
    backgroundColor: '#F6DFD2',
  },
  headerContent: { flex: 1 },
  desktopHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  brandMark: { marginRight: 2 },
  brandName: { color: '#FFF8EF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  compactBrandName: { fontSize: 22 },
  brandLogoBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  registerBrandLogo: { width: 170, height: 42 },
  brandAccent: { color: '#F6DFD2' },
  brandTagline: { color: '#F6DFD2', fontSize: 11, fontWeight: '600', marginTop: 5 },
  desktopLogoWrap: { width: '55%', maxWidth: 340, flexShrink: 0 },
  desktopLogoIcon: { marginBottom: 12 },
  desktopBrandName: { color: '#FFF8EF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  desktopPanelCopy: {
    maxWidth: 260,
    color: '#FFF8EF',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 22,
  },
  panelCopy: { maxWidth: 340, color: '#FFF8EF', fontSize: 16, lineHeight: 24, marginTop: 20 },
  compactPanelCopy: { fontSize: 12, lineHeight: 17, marginTop: 10, maxWidth: 280 },
  benefits: { gap: 12, marginTop: 18 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8EF',
  },
  benefitText: { color: '#FFF8EF', fontSize: 13, fontWeight: '600' },
  desktopIllustrationWrap: {
    width: '30%',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 24,
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
  snapshotValue: { color: '#FFF8EF', fontSize: 19, fontWeight: '800' },
  snapshotCaption: { color: '#F6DFD2', fontSize: 10, marginTop: 3 },
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
  snapshotBar: { width: '100%', borderRadius: 5, backgroundColor: '#F6DFD2' },
  mobileHint: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFF8EF',
  },
  mobileHintText: { color: '#8E422E', fontSize: 11, fontWeight: '700' },
  mission: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 248, 239, 0.14)',
  },
  missionText: { color: '#FFF8EF', fontSize: 18, lineHeight: 24, fontWeight: '700', fontStyle: 'italic', textAlign: 'center', marginBottom: 8 },
  formArea: {
    margin: 12,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    borderRadius: 20,
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
  desktopFormArea: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 520,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'stretch',
    justifyContent: 'center',
    margin: 0,
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
  formIntro: {},
  formFields: {},
  desktopFormFields: {},
  formActions: {},
  desktopFormActions: {},
  accessBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F6DFD2',
    marginBottom: 14,
  },
  accessBadgeText: { color: '#8E422E', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#3D2D27',
    marginBottom: 6,
    fontFamily: 'serif',
  },
  compactTitle: { fontSize: 23, marginBottom: 4 },
  subtitle: { color: '#76645B', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  compactSubtitle: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  fieldGroup: { marginTop: 10 },
  desktopFieldGroup: { marginTop: 16 },
  label: { color: '#3D2D27', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  compactInputWrap: { height: 46 },
  desktopInputWrap: { height: 56 },
  input: { flex: 1, color: '#3D2D27', fontSize: 15, padding: 0 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },
  planNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#F0D8C9',
  },
  planNoticeText: { flex: 1, color: '#8E422E', fontSize: 12, lineHeight: 17 },
  button: {
    marginTop: 18,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#C85C3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  compactButton: { marginTop: 14 },
  desktopButton: { marginTop: 24 },
  buttonGrad: {
    flexDirection: 'row',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  loginLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  compactLoginLink: { marginTop: 14 },
  desktopLoginLink: { marginTop: 32 },
  loginPrompt: { color: '#76645B', fontSize: 13 },
  loginAction: { color: '#C85C3E', fontSize: 13, fontWeight: '700' },
});
