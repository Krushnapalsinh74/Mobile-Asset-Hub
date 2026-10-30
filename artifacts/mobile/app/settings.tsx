import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { DesktopHeaderNav } from '@/components/DesktopHeaderNav';
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
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { studentName, studentEmail, boardName, standardName, clearAll } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;
  const { razorpayKey, aiApiKey, premiumPrice, premiumCurrency, appName } = useAppSettings();
  const { profile } = useUserProfile(studentEmail);

  const displayName = profile?.name ?? studentName ?? 'Student';
  const displayEmail = profile?.email ?? studentEmail ?? '';
  const initials = displayName.trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const handleClearData = () => {
    const doSignOut = async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await clearAll();
      router.replace('/login' as any);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('This will sign you out and clear all saved data. Continue?')) doSignOut();
    } else {
      Alert.alert('Clear All Data', 'This will sign you out and clear all saved data.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear & Sign Out', style: 'destructive', onPress: doSignOut },
      ]);
    }
  };

  const handleChangeBoard = () => {
    const doChange = async () => { await clearAll(); router.replace('/login' as any); };
    if (Platform.OS === 'web') {
      if (window.confirm('This will clear your board and class selection. Continue?')) doChange();
    } else {
      Alert.alert('Change Board / Class', 'This will clear your current board and class.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change', onPress: doChange },
      ]);
    }
  };

  const handlePayment = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!razorpayKey) { Alert.alert('Payment unavailable', 'Not configured yet.'); return; }
    const amount = premiumPrice ?? 999; const currency = premiumCurrency ?? 'INR';
    const html = `<!DOCTYPE html><html><head><script src="https://checkout.razorpay.com/v1/checkout.js"></script></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;"><script>var o={key:'${razorpayKey}',amount:${amount*100},currency:'${currency}',name:'${appName||'Knowledge Park'}',description:'Premium',prefill:{name:'${displayName}',email:'${displayEmail}'},theme:{color:'#C85C3E'}};new Razorpay(o).open();</script></body></html>`;
    await WebBrowser.openBrowserAsync(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { toolbarColor: '#C85C3E', controlsColor: '#FFFFFF' });
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 20 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 12 : 0);

  const ACTIONS = [
    { bg: '#FFF7ED', border: '#FED7AA', iconBg: '#FFEDD5', icon: 'star', color: '#F59E0B', title: 'Go Premium', sub: 'Unlock all features', onPress: handlePayment },
    { bg: '#EFF6FF', border: '#BFDBFE', iconBg: '#DBEAFE', icon: 'bar-chart', color: '#3B82F6', title: 'View Progress', sub: 'Test analytics & report', onPress: () => router.push('/history' as any) },
    { bg: '#FAF5FF', border: '#E9D5FF', iconBg: '#F3E8FF', icon: 'document-text', color: '#8B5CF6', title: 'Report Card', sub: 'Official transcript', onPress: () => router.push('/report-card' as any) },
    { bg: '#F0FDF4', border: '#BBF7D0', iconBg: '#DCFCE7', icon: 'bookmark', color: '#10B981', title: 'Bookmarks', sub: 'Review saved Qs', onPress: () => router.push('/saved' as any) },
  ] as const;

  /* ─── DESKTOP ─── */
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FBF8F4' }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.desktopScroll}>
          <DesktopHeaderNav activeTab="settings" />
          <View style={styles.desktopTitleRow}>
            <Ionicons name="person-circle-outline" size={26} color="#C85C3E" />
            <Text style={styles.desktopPageTitle}>Settings & Profile</Text>
          </View>
          <View style={styles.desktopBento}>
            {/* LEFT */}
            <View style={styles.desktopCol}>
              <View style={styles.bentoCard}>
                <View style={styles.profileRow}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{initials}</Text></View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{displayName}</Text>
                    {displayEmail ? <Text style={styles.profileEmail}>{displayEmail}</Text> : null}
                  </View>
                </View>
                <View style={styles.pillsRow}>
                  <View style={styles.infoPill}><Ionicons name="book-outline" size={13} color="#C85C3E" /><Text style={styles.infoPillText}>{profile?.standardName ?? standardName ?? 'Class 11'}</Text></View>
                  <View style={styles.infoPill}><Ionicons name="school-outline" size={13} color="#C85C3E" /><Text style={styles.infoPillText} numberOfLines={2}>{profile?.boardName ?? boardName ?? 'Gujarat Board'}</Text></View>
                </View>
                <View style={[styles.quoteBanner, { marginTop: 14 }]}>
                  <View style={{ flex: 1, paddingRight: 32 }}><Text style={styles.quoteText}>&ldquo;Consistent learning today leads to brighter tomorrows.&rdquo;</Text></View>
                  <View style={styles.quoteIconWrap}><Ionicons name="leaf" size={24} color="#4F936C" /></View>
                </View>
              </View>
              <View style={styles.bentoCard}>
                <View style={styles.cardHeaderRow}><Ionicons name="shield-checkmark-outline" size={18} color="#C85C3E" /><Text style={styles.cardTitle}>Account</Text></View>
                <Pressable style={styles.listItem} onPress={handleClearData}>
                  <View style={[styles.listIconBg, { backgroundColor: '#FEE2E2' }]}><Ionicons name="log-out-outline" size={18} color="#EF4444" /></View>
                  <View style={styles.listInfo}><Text style={[styles.listTitle, { color: '#EF4444' }]}>Sign Out</Text><Text style={styles.listSub}>Log out and switch account</Text></View>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </Pressable>
              </View>
            </View>
            {/* RIGHT */}
            <View style={styles.desktopCol}>
              <View style={styles.bentoCard}>
                <View style={styles.cardHeaderRow}><Ionicons name="flash-outline" size={18} color="#C85C3E" /><Text style={styles.cardTitle}>Quick Actions</Text></View>
                <View style={styles.desktopActionsGrid}>
                  {ACTIONS.map((item) => (
                    <Pressable key={item.title} style={[styles.actionCard, { backgroundColor: item.bg, borderColor: item.border }]} onPress={item.onPress}>
                      <View style={styles.actionTop}><View style={[styles.actionIconBg, { backgroundColor: item.iconBg }]}><Ionicons name={item.icon as any} size={18} color={item.color} /></View><Ionicons name="chevron-forward" size={16} color="#A49186" /></View>
                      <Text style={styles.actionCardTitle}>{item.title}</Text><Text style={styles.actionCardSub}>{item.sub}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.bentoCard}>
                <View style={styles.cardHeaderRow}><Ionicons name="settings-outline" size={18} color="#C85C3E" /><Text style={styles.cardTitle}>App Configuration</Text></View>
                <View style={styles.listCard}>
                  <View style={styles.listItem}><View style={[styles.listIconBg,{backgroundColor:'#FFEDD5'}]}><Ionicons name="git-network-outline" size={18} color="#F97316"/></View><View style={styles.listInfo}><Text style={styles.listTitle}>AI Engine</Text><Text style={styles.listSub}>{aiApiKey?'Configured & Active':'Default Service'}</Text></View><Ionicons name="checkmark-circle" size={16} color="#10B981"/></View>
                  <View style={styles.divider}/>
                  <View style={styles.listItem}><View style={[styles.listIconBg,{backgroundColor:'#FFEDD5'}]}><Ionicons name="card-outline" size={18} color="#F97316"/></View><View style={styles.listInfo}><Text style={styles.listTitle}>Payment Gateway</Text><Text style={styles.listSub}>{razorpayKey?'Razorpay Enabled':'Simulated Gateway'}</Text></View><Ionicons name="checkmark-circle" size={16} color="#10B981"/></View>
                  <View style={styles.divider}/>
                  <View style={styles.listItem}><View style={[styles.listIconBg,{backgroundColor:'#EDE9FE'}]}><Ionicons name="settings-outline" size={18} color="#8B5CF6"/></View><View style={styles.listInfo}><Text style={styles.listTitle}>App Platform</Text><Text style={styles.listSub}>{appName||'Knowledge Park'}</Text></View><Ionicons name="chevron-forward" size={16} color="#CBD5E1"/></View>
                </View>
              </View>
              <View style={styles.bentoCard}>
                <View style={styles.cardHeaderRow}><Ionicons name="school-outline" size={18} color="#C85C3E"/><Text style={styles.cardTitle}>Academic Board & Standard</Text></View>
                <View style={styles.listCard}>
                  <Pressable style={styles.listItem} onPress={handleChangeBoard}><View style={[styles.listIconBg,{backgroundColor:'#EFF6FF'}]}><Ionicons name="school" size={18} color="#C85C3E"/></View><View style={styles.listInfo}><Text style={styles.listTitle}>Educational Board</Text><Text style={styles.listSub}>{boardName??'Central Board of Secondary Education'}</Text></View><Ionicons name="chevron-forward" size={16} color="#CBD5E1"/></Pressable>
                  <View style={styles.divider}/>
                  <Pressable style={styles.listItem} onPress={handleChangeBoard}><View style={[styles.listIconBg,{backgroundColor:'#EFF6FF'}]}><Ionicons name="layers" size={18} color="#C85C3E"/></View><View style={styles.listInfo}><Text style={styles.listTitle}>Class / Grade</Text><Text style={styles.listSub}>{standardName??'Class 11'}</Text></View><Ionicons name="chevron-forward" size={16} color="#CBD5E1"/></Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ─── MOBILE ─── */
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#7E3B29', '#A24831', '#C85C3E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerInner}>
          <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/subjects' as any); }} style={styles.backCircle} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={18} color="#FFF" /></Pressable>
          <Text style={styles.headerTitle}>Settings & Profile</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 24, flexGrow: 1 }}>
        <View style={styles.container}>
          <View style={[styles.profileSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatarCircle}><Text style={styles.avatarText}>{initials}</Text></View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
                  {displayEmail ? <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{displayEmail}</Text> : null}
                </View>
              </View>
              <View style={styles.pillsRow}>
                <View style={[styles.infoPill, { backgroundColor: colors.background, borderColor: colors.border }]}><Ionicons name="book-outline" size={13} color="#C85C3E" /><Text style={[styles.infoPillText, { color: colors.text }]} numberOfLines={1}>{profile?.standardName ?? standardName ?? 'Class 11'}</Text></View>
                <View style={[styles.infoPill, { backgroundColor: colors.background, borderColor: colors.border }]}><Ionicons name="school-outline" size={13} color="#C85C3E" /><Text style={[styles.infoPillText, { color: colors.text }]} numberOfLines={1}>{profile?.boardName ?? boardName ?? 'CBSE / Gujarat Board'}</Text></View>
              </View>
            </View>
            <View style={styles.quoteBanner}><View style={{ flex: 1, paddingRight: 40 }}><Text style={styles.quoteText}>&ldquo;Consistent learning today leads to brighter tomorrows.&rdquo;</Text></View><View style={styles.quoteIconWrap}><Ionicons name="leaf" size={28} color="#4F936C" /></View></View>
          </View>
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={styles.gridRow}>
              {ACTIONS.map((item) => (
                <Pressable key={item.title} style={[styles.actionCard, { backgroundColor: item.bg, borderColor: item.border, flexBasis: '48%' }]} onPress={item.onPress}>
                  <View style={styles.actionTop}><View style={[styles.actionIconBg, { backgroundColor: item.iconBg }]}><Ionicons name={item.icon as any} size={18} color={item.color} /></View><Ionicons name="chevron-forward" size={16} color="#A49186" /></View>
                  <Text style={styles.actionCardTitle}>{item.title}</Text><Text style={styles.actionCardSub}>{item.sub}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>App Configuration</Text>
            <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.listItem}><View style={[styles.listIconBg,{backgroundColor:'#FFEDD5'}]}><Ionicons name="git-network-outline" size={18} color="#F97316"/></View><View style={styles.listInfo}><Text style={[styles.listTitle,{color:colors.text}]}>AI Engine</Text><Text style={[styles.listSub,{color:colors.mutedForeground}]}>{aiApiKey?'Configured & Active':'Default Service'}</Text></View><Ionicons name="checkmark-circle" size={16} color="#10B981"/></View>
              <View style={[styles.divider,{backgroundColor:colors.border}]}/>
              <View style={styles.listItem}><View style={[styles.listIconBg,{backgroundColor:'#FFEDD5'}]}><Ionicons name="card-outline" size={18} color="#F97316"/></View><View style={styles.listInfo}><Text style={[styles.listTitle,{color:colors.text}]}>Payment Gateway</Text><Text style={[styles.listSub,{color:colors.mutedForeground}]}>{razorpayKey?'Razorpay Enabled':'Simulated Gateway'}</Text></View><Ionicons name="checkmark-circle" size={16} color="#10B981"/></View>
              <View style={[styles.divider,{backgroundColor:colors.border}]}/>
              <View style={styles.listItem}><View style={[styles.listIconBg,{backgroundColor:'#EDE9FE'}]}><Ionicons name="settings-outline" size={18} color="#8B5CF6"/></View><View style={styles.listInfo}><Text style={[styles.listTitle,{color:colors.text}]}>App Platform</Text><Text style={[styles.listSub,{color:colors.mutedForeground}]}>{appName||'Knowledge Park'}</Text></View><Ionicons name="chevron-forward" size={16} color="#CBD5E1"/></View>
            </View>
          </View>
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Board & Standard</Text>
            <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable style={styles.listItem} onPress={handleChangeBoard}><View style={[styles.listIconBg,{backgroundColor:'#EFF6FF'}]}><Ionicons name="school" size={18} color="#C85C3E"/></View><View style={styles.listInfo}><Text style={[styles.listTitle,{color:colors.text}]}>Educational Board</Text><Text style={[styles.listSub,{color:colors.mutedForeground}]}>{boardName??'Central Board of Secondary Education'}</Text></View><Ionicons name="chevron-forward" size={16} color="#CBD5E1"/></Pressable>
              <View style={[styles.divider,{backgroundColor:colors.border}]}/>
              <Pressable style={styles.listItem} onPress={handleChangeBoard}><View style={[styles.listIconBg,{backgroundColor:'#EFF6FF'}]}><Ionicons name="layers" size={18} color="#C85C3E"/></View><View style={styles.listInfo}><Text style={[styles.listTitle,{color:colors.text}]}>Class / Grade</Text><Text style={[styles.listSub,{color:colors.mutedForeground}]}>{standardName??'Class 11'}</Text></View><Ionicons name="chevron-forward" size={16} color="#CBD5E1"/></Pressable>
            </View>
          </View>
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
            <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable style={styles.listItem} onPress={handleClearData}><View style={[styles.listIconBg,{backgroundColor:'#FEE2E2'}]}><Ionicons name="log-out-outline" size={18} color="#EF4444"/></View><View style={styles.listInfo}><Text style={[styles.listTitle,{color:'#EF4444'}]}>Sign Out</Text><Text style={[styles.listSub,{color:colors.mutedForeground}]}>Log out and switch account</Text></View><Ionicons name="chevron-forward" size={16} color="#CBD5E1"/></Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomTabBar activeTab="settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  desktopScroll: { padding: 32, paddingBottom: 48, minHeight: '100%' as any },
  desktopTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  desktopPageTitle: { fontSize: 22, fontWeight: '800', color: '#3D2D27' },
  desktopBento: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  desktopCol: { flex: 1, gap: 16 },
  bentoCard: { borderRadius: 20, borderWidth: 1, padding: 20, backgroundColor: '#FFFDF9', borderColor: '#E8DFD5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#3D2D27' },
  desktopActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  header: { paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backCircle: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}) },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  container: { width: '100%', paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  sectionWrap: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginLeft: 4 },
  profileSection: { borderRadius: 22, padding: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  profileCard: { marginBottom: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#C85C3E', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', marginBottom: 2, color: '#3D2D27' },
  profileEmail: { fontSize: 12, color: '#76645B' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9, borderWidth: 1, backgroundColor: '#F5EEE5', borderColor: '#E4D5C8' },
  infoPillText: { fontSize: 11, fontWeight: '600', color: '#3D2D27' },
  quoteBanner: { flexDirection: 'row', backgroundColor: '#FDF3EE', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FBE0D3' },
  quoteText: { fontSize: 12, fontStyle: 'italic', fontWeight: '700', color: '#6B382C', lineHeight: 18 },
  quoteIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { flexGrow: 1, padding: 14, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}) },
  actionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  actionIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionCardTitle: { fontSize: 13, fontWeight: '800', color: '#3D2D27', marginBottom: 2 },
  actionCardSub: { fontSize: 11, color: '#76645B' },
  listCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', borderColor: '#E8DFD5', backgroundColor: '#FFFDF9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  listIconBg: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2, color: '#3D2D27' },
  listSub: { fontSize: 11, color: '#76645B' },
  divider: { height: 1, marginLeft: 68, backgroundColor: '#E8DFD5' },
});
