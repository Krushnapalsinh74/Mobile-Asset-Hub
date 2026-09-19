import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { useApp } from '@/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const { testHistory } = useApp();
  const insets = useSafeAreaInsets();

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

  return (
    <View style={styles.root}>
      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#1E1B4B', '#3B27ED', '#5B4AF0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.backCircle}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Test History</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 24,
          flexGrow: 1,
        }}
      >
        {/* ── EMPTY STATE ── */}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="document-text-outline" size={40} color="#5B4AF0" />
            </View>
            
            <Text style={styles.emptyTitle}>No tests yet</Text>
            
            <Text style={styles.emptySub}>
              Complete a test to see your full history{'\n'}here
            </Text>
            
            <Pressable onPress={() => router.replace('/subjects' as any)} style={styles.startBtn}>
              <Text style={styles.startBtnText}>Start a Test</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Global Bottom Tab Bar */}
      <BottomTabBar activeTab="history" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },

  /* HEADER */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backCircle: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },

  /* EMPTY STATE */
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 24,
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B4AF0',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#5B4AF0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
