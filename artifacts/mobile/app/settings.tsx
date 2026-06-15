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
  <p style="font-family:sans-serif;color:#4F46E5">Opening payment...</p>
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
      theme: { color: "#4F46E5" },
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
      toolbarColor: '#4F46E5',
      controlsColor: '#FFFFFF',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={styles.backCircle}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 32 },
        ]}
      >
        {/* ── PROFILE CARD ── */}
        {profileLoading ? (
          <View style={[styles.profileLoadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.profileLoadingText, { color: colors.mutedForeground }]}>Loading profile…</Text>
          </View>
        ) : (
          <View style={styles.profileCardWrapper}>
            <LinearGradient
              colors={['#3730A3', '#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileCard}
            >
              {/* decorative blob */}
              <View style={styles.profileBlob} />

              {/* Avatar + name row */}
              <View style={styles.profileTopRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.profileInfo}>
                  <View style={styles.profileNameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                  </View>
                  {displayEmail ? (
                    <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
                  ) : null}
                </View>
              </View>

              {/* Details row — standard + boards */}
              {(profile?.standardName || profile?.boardName || standardName || boardName) && (
                <View style={styles.profileDetails}>
                  {(profile?.standardName || standardName) ? (
                    <View style={styles.profileDetailChip}>
                      <Ionicons name="layers-outline" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.profileDetailText}>{profile?.standardName ?? standardName}</Text>
                    </View>
                  ) : null}
                  {(profile?.boardName || boardName) ? (
                    <View style={styles.profileDetailChip}>
                      <Ionicons name="school-outline" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.profileDetailText}>{profile?.boardName ?? boardName}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {profileError && !profile && (
                <Text style={styles.profileErrorNote}>Could not load profile details</Text>
              )}
            </LinearGradient>

            {/* Upgrade button for free users — rendered below the card */}
            {razorpayKey ? (
              <Pressable
                style={styles.upgradeBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handlePayment(); }}
              >
                <LinearGradient
                  colors={['#F59E0B', '#F97316']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.upgradeBtnGrad}
                >
                  <Text style={styles.upgradeBtnIcon}>⚡</Text>
                  <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </LinearGradient>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* ── APP SETTINGS FROM /settings API ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>App Configuration</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {settingsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Loading configuration…
              </Text>
            </View>
          ) : settingsError ? (
            <View style={styles.errorRow}>
              <Ionicons name="cloud-offline-outline" size={20} color="#EF4444" />
              <Text style={[styles.errorText, { color: '#EF4444' }]}>
                Could not load settings
              </Text>
              <Pressable onPress={() => refetchSettings()} style={styles.retryLink}>
                <Text style={[styles.retryLinkText, { color: colors.primary }]}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* AI API Key */}
              <View style={styles.configRow}>
                <View style={[styles.configIcon, { backgroundColor: aiApiKey ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Ionicons
                    name={aiApiKey ? 'sparkles' : 'sparkles-outline'}
                    size={16}
                    color={aiApiKey ? '#10B981' : '#EF4444'}
                  />
                </View>
                <View style={styles.configInfo}>
                  <Text style={[styles.configLabel, { color: colors.text }]}>AI Engine</Text>
                  <Text style={[styles.configValue, { color: colors.mutedForeground }]}>
                    {aiApiKey ? `Configured (${aiApiKey.slice(0, 8)}…)` : 'Not configured'}
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: aiApiKey ? '#10B981' : '#EF4444' }]} />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Payment Gateway */}
              <View style={styles.configRow}>
                <View style={[styles.configIcon, { backgroundColor: razorpayKey ? '#EDE9FE' : '#FEE2E2' }]}>
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={razorpayKey ? '#8B5CF6' : '#EF4444'}
                  />
                </View>
                <View style={styles.configInfo}>
                  <Text style={[styles.configLabel, { color: colors.text }]}>Payment Gateway</Text>
                  <Text style={[styles.configValue, { color: colors.mutedForeground }]}>
                    {razorpayKey
                      ? `${paymentGateway ?? 'Razorpay'} · ${razorpayKey.slice(0, 12)}…`
                      : 'Not configured'}
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: razorpayKey ? '#8B5CF6' : '#EF4444' }]} />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* App Name */}
              <View style={styles.configRow}>
                <View style={[styles.configIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="information-circle-outline" size={16} color="#4F46E5" />
                </View>
                <View style={styles.configInfo}>
                  <Text style={[styles.configLabel, { color: colors.text }]}>App Name</Text>
                  <Text style={[styles.configValue, { color: colors.mutedForeground }]}>
                    {appName || 'Knowledge Park'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── PREMIUM / RAZORPAY ── */}
        {razorpayKey ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Subscription</Text>
            <Pressable onPress={handlePayment} style={{ marginBottom: 20 }}>
              <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.premiumCard}>
                <View style={styles.premiumLeft}>
                  <View style={styles.premiumIconWrap}>
                    <Ionicons name="star" size={22} color="#FFF" />
                  </View>
                  <View>
                    <Text style={styles.premiumTitle}>Go Premium ✨</Text>
                    <Text style={styles.premiumSub}>
                      Unlimited tests, AI Tutor & more
                    </Text>
                    {premiumPrice && (
                      <Text style={styles.premiumPrice}>
                        {premiumCurrency ?? '₹'} {premiumPrice}/month
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.premiumChevron}>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                </View>
              </LinearGradient>
            </Pressable>
          </>
        ) : null}

        {/* ── EDUCATION INFO ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Education</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="school-outline" size={16} color="#4F46E5" />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Board</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{boardName ?? '—'}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="layers-outline" size={16} color="#4F46E5" />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Class</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{standardName ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* ── ACCOUNT ACTIONS ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            style={styles.actionRow}
            onPress={() => { Haptics.selectionAsync(); handleChangeBoard(); }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="swap-horizontal-outline" size={18} color="#6366F1" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Change Board / Class</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Switch to a different board or standard
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            style={styles.actionRow}
            onPress={() => { Haptics.selectionAsync(); handleClearData(); }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Sign Out & Clear Data</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Remove all saved data from this device
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          {appName || 'Knowledge Park'} · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backBtn: {},
  backCircle: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  content: { padding: 16, gap: 0 },

  // ── Profile card ──────────────────────────────────────────────────────
  profileCardWrapper: { marginBottom: 24 },

  profileLoadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 22, borderWidth: 1, padding: 20, marginBottom: 24,
  },
  profileLoadingText: { fontSize: 13 },

  profileCard: {
    borderRadius: 22, padding: 20, overflow: 'hidden', gap: 14,
  },
  profileBlob: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -40,
  },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  profileName: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  profileEmail: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 4 },

  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FCD34D',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumBadgeIcon: { fontSize: 11 },
  premiumBadgeText: { fontSize: 10, fontWeight: '800', color: '#78350F', letterSpacing: 0.4 },

  profileDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileDetailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  profileDetailText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
  profileErrorNote: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  upgradeBtn: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  upgradeBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 16,
  },
  upgradeBtnIcon: { fontSize: 15 },
  upgradeBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 8, marginTop: 4,
  },

  card: {
    borderRadius: 20, borderWidth: 1,
    marginBottom: 20, overflow: 'hidden',
  },

  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16,
  },
  loadingText: { fontSize: 13 },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16,
  },
  errorText: { flex: 1, fontSize: 13 },
  retryLink: {},
  retryLinkText: { fontSize: 13, fontWeight: '600' },

  configRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  configIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  configInfo: { flex: 1 },
  configLabel: { fontSize: 14, fontWeight: '600' },
  configValue: { fontSize: 11, marginTop: 2, fontFamily: 'monospace' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  premiumCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, padding: 18, gap: 14,
  },
  premiumLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  premiumIconWrap: {
    width: 48, height: 48, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  premiumTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  premiumSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  premiumPrice: { fontSize: 13, fontWeight: '700', color: '#FFF', marginTop: 4 },
  premiumChevron: {},

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  divider: { height: 1, marginLeft: 62 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  actionIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  actionDesc: { fontSize: 12, marginTop: 1 },

  version: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
