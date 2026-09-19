import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { studentName, studentEmail, boardName, standardName, clearAll } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings,
    isLoading: settingsLoading,
    isError: settingsError,
    razorpayKey,
    aiApiKey,
    premiumPrice,
    premiumCurrency,
    paymentGateway,
    appName,
    refetch: refetchSettings,
  } = useAppSettings();
  const { profile, isLoading: profileLoading, isError: profileError } = useUserProfile(studentEmail);

  const displayName = profile?.name ?? studentName ?? 'Student';
  const displayEmail = profile?.email ?? studentEmail ?? '';

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleClearData = () => {
    const doSignOut = async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await clearAll();
      router.replace('/login' as any);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('This will sign you out and clear all saved data. Continue?')) doSignOut();
    } else {
      Alert.alert(
        'Clear All Data',
        'This will sign you out and clear all saved data. You will need to log in again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear & Sign Out', style: 'destructive', onPress: doSignOut },
        ],
      );
    }
  };

  const handleChangeBoard = () => {
    const doChange = async () => {
      await clearAll();
      router.replace('/login' as any);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('This will clear your board and class selection. Continue?')) doChange();
    } else {
      Alert.alert(
        'Change Board / Class',
        'This will clear your current board and class so you can pick a new one.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change', onPress: doChange },
        ],
      );
    }
  };

  const handlePayment = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!razorpayKey) {
      Alert.alert('Payment unavailable', 'Payment configuration is not loaded yet. Please try again.');
      return;
    }

    const amount = premiumPrice ?? 999;
    const currency = premiumCurrency ?? 'INR';
    const name = appName ?? 'Knowledge Park Premium';

    const html = `<!DOCTYPE html><html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8f7ff;">
  <p style="font-family:sans-serif;color:#5B4AF0">Opening payment...</p>
  <script>
    var options = {
      key: "${razorpayKey}",
      amount: ${amount * 100},
      currency: "${currency}",
      name: "${name}",
      description: "Premium Subscription",
      prefill: {
        email: "${studentEmail ?? ''}",
        name: "${studentName ?? ''}"
      },
      theme: { color: "#5B4AF0" },
      handler: function(response) {
        window.location.href = "eduapp://payment-success?payment_id=" + response.razorpay_payment_id;
      },
      modal: {
        ondismiss: function() {
          window.location.href = "eduapp://payment-cancel";
        }
      }
    };
    var rzp = new Razorpay(options);
    rzp.open();
  </script>
</body>
</html>`;

    const blob = encodeURIComponent(html);
    const dataUrl = `data:text/html;charset=utf-8,${blob}`;

    await WebBrowser.openBrowserAsync(dataUrl, {
      toolbarColor: '#5B4AF0',
      controlsColor: '#FFFFFF',
    });
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

  return (
    <View style={styles.root}>
      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#1E1B4B', '#3B27ED', '#5B4AF0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <Pressable onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)'); } }} style={styles.backCircle}>
          <Ionicons name="arrow-back" size={18} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: tabBarHeight + 24,
          gap: 24,
        }}
      >
        {/* ── PROFILE SECTION ── */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            {/* Header info */}
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                {displayEmail ? (
                  <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
                ) : null}
              </View>
              <Pressable style={styles.editBtn}>
                <Ionicons name="create-outline" size={16} color="#64748B" />
              </Pressable>
            </View>

            {/* Pills */}
            <View style={styles.pillsRow}>
              <View style={styles.infoPill}>
                <Ionicons name="book-outline" size={12} color="#64748B" />
                <Text style={styles.infoPillText} numberOfLines={1}>{profile?.standardName ?? standardName ?? 'Class 11'}</Text>
              </View>
              <View style={styles.infoPill}>
                <Ionicons name="school-outline" size={12} color="#64748B" />
                <Text style={styles.infoPillText} numberOfLines={1}>{profile?.boardName ?? boardName ?? 'Central Board of Secondary Education'}</Text>
              </View>
            </View>
          </View>

          {/* Quote Banner */}
          <View style={styles.quoteBanner}>
            <View style={{ flex: 1, paddingRight: 60 }}>
              <Text style={styles.quoteText}>
                "Consistent learning today leads to brighter tomorrows."
              </Text>
            </View>
            <View style={styles.quoteIconWrap}>
              <Ionicons name="leaf" size={40} color="#10B981" style={{ position: 'absolute', top: 5, right: 15 }} />
              <Ionicons name="library" size={50} color="#3B82F6" style={{ position: 'absolute', bottom: -5, right: -5 }} />
            </View>
          </View>
        </View>


        {/* ── QUICK ACTIONS ── */}
        <View>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid2x2}>
            {/* Go Premium */}
            <Pressable style={[styles.actionCard, { backgroundColor: '#FFF7ED' }]} onPress={handlePayment}>
              <View style={styles.actionTop}>
                <View style={[styles.actionIconBg, { backgroundColor: '#FFEDD5' }]}>
                  <Ionicons name="star" size={18} color="#F59E0B" />
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
              <Text style={styles.actionCardTitle}>Go Premium</Text>
              <Text style={styles.actionCardSub}>Unlock all features</Text>
            </Pressable>

            {/* View Progress */}
            <Pressable style={[styles.actionCard, { backgroundColor: '#EFF6FF' }]} onPress={() => router.push('/history' as any)}>
              <View style={styles.actionTop}>
                <View style={[styles.actionIconBg, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="bar-chart" size={18} color="#3B82F6" />
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
              <Text style={styles.actionCardTitle}>View Progress</Text>
              <Text style={styles.actionCardSub}>See your stats</Text>
            </Pressable>

            {/* Download Data */}
            <Pressable style={[styles.actionCard, { backgroundColor: '#F0FDF4' }]}>
              <View style={styles.actionTop}>
                <View style={[styles.actionIconBg, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="cloud-download" size={18} color="#10B981" />
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
              <Text style={styles.actionCardTitle}>Download Data</Text>
              <Text style={styles.actionCardSub}>Keep a backup</Text>
            </Pressable>

            {/* Edit Profile */}
            <Pressable style={[styles.actionCard, { backgroundColor: '#F5F3FF' }]}>
              <View style={styles.actionTop}>
                <View style={[styles.actionIconBg, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="person" size={18} color="#8B5CF6" />
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
              <Text style={styles.actionCardTitle}>Edit Profile</Text>
              <Text style={styles.actionCardSub}>Update details</Text>
            </Pressable>
          </View>
        </View>

        {/* ── APP CONFIGURATION ── */}
        <View>
          <Text style={styles.sectionTitle}>App Configuration</Text>
          <View style={styles.listCard}>
            {/* AI Engine */}
            <View style={styles.listItem}>
              <View style={[styles.listIconBg, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="git-network-outline" size={18} color="#F97316" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>AI Engine</Text>
                <Text style={styles.listSub}>{aiApiKey ? 'Configured' : 'Not configured'}</Text>
              </View>
              {!aiApiKey && <Ionicons name="remove-circle" size={16} color="#EF4444" style={{ marginRight: 8 }} />}
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </View>
            <View style={styles.divider} />
            {/* Payment Gateway */}
            <View style={styles.listItem}>
              <View style={[styles.listIconBg, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="card-outline" size={18} color="#F97316" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>Payment Gateway</Text>
                <Text style={styles.listSub}>{razorpayKey ? 'Configured' : 'Not configured'}</Text>
              </View>
              {!razorpayKey && <Ionicons name="remove-circle" size={16} color="#EF4444" style={{ marginRight: 8 }} />}
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </View>
            <View style={styles.divider} />
            {/* App Name */}
            <View style={styles.listItem}>
              <View style={[styles.listIconBg, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="settings-outline" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>App Name</Text>
                <Text style={styles.listSub}>{appName || 'Knowledge Park'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </View>
          </View>
        </View>

        {/* ── EDUCATION ── */}
        <View>
          <Text style={styles.sectionTitle}>Education</Text>
          <View style={styles.listCard}>
            <Pressable style={styles.listItem} onPress={handleChangeBoard}>
              <View style={[styles.listIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="school" size={18} color="#3B82F6" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>Board</Text>
                <Text style={styles.listSub}>{boardName ?? 'Central Board of Secondary Education'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.listItem} onPress={handleChangeBoard}>
              <View style={[styles.listIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="layers" size={18} color="#3B82F6" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>Class</Text>
                <Text style={styles.listSub}>{standardName ?? 'Class 11'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </Pressable>
          </View>
        </View>

        {/* ── ACCOUNT ACTIONS ── */}
        <View>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.listCard}>
            <Pressable style={styles.listItem} onPress={handleClearData}>
              <View style={[styles.listIconBg, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              </View>
              <View style={styles.listInfo}>
                <Text style={[styles.listTitle, { color: '#EF4444' }]}>Sign Out</Text>
                <Text style={styles.listSub}>Log out of your account</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </Pressable>
          </View>
        </View>

      </ScrollView>
      <BottomTabBar activeTab="settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },

  /* HEADER */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backCircle: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 12, marginLeft: 4 },

  /* PROFILE SECTION */
  profileSection: { backgroundColor: '#FFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  profileCard: { marginBottom: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#5B4AF0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1, paddingTop: 4 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: '#64748B' },
  editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  infoPillText: { fontSize: 11, color: '#475569', fontWeight: '600' },

  quoteBanner: { flexDirection: 'row', backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, alignItems: 'center', overflow: 'hidden' },
  quoteText: { fontSize: 13, fontStyle: 'italic', fontWeight: '700', color: '#3730A3', lineHeight: 20 },
  quoteIconWrap: { position: 'absolute', right: 0, bottom: 0, width: 60, height: 60 },

  /* QUICK ACTIONS */
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  actionCard: {
    width: '50%', maxWidth: '50%', padding: 16, borderRadius: 20, marginHorizontal: 6, marginBottom: 12,
    flexShrink: 1,
    flexBasis: '46%'
  },
  actionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  actionIconBg: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionCardTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  actionCardSub: { fontSize: 11, color: '#64748B' },

  /* LIST ITEMS */
  listCard: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  listIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  listSub: { fontSize: 11, color: '#64748B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 70 },
});
