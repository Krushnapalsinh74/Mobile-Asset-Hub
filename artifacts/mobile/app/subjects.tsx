import { useApp } from '@/context/AppContext';
import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { eduApi } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SubjectsScreen() {
  const { studentName, boardId, standardId } = useApp();
  const insets = useSafeAreaInsets();

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects', boardId, standardId],
    queryFn: () => eduApi.getSubjects(boardId!, standardId!),
    enabled: !!boardId && !!standardId,
  });

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 16);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: tabBarHeight + 24,
        }}
      >
        {/* TOP APP BAR */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <View style={styles.logoContainer}>
              <Ionicons name="school" size={28} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.logoText}>Knowledge<Text style={{color: '#2563EB'}}>Park</Text></Text>
              <Text style={styles.logoSubtitle}>Edu</Text>
              <Text style={styles.logoTagline}>Learn  •  Practice  •  Grow</Text>
            </View>
          </View>
          <View style={styles.appBarRight}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/saved')}>
              <Ionicons name="bookmark-outline" size={24} color="#1E293B" />
              <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
            </Pressable>
            <Pressable style={styles.avatarButton} onPress={() => router.push('/settings')}>
              <Ionicons name="person" size={20} color="#2563EB" />
            </Pressable>
          </View>
        </View>

        {/* GREETING SECTION */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingHello}>Hello, 👋</Text>
            <Text style={styles.greetingWelcome}>Welcome back!</Text>
            <Text style={styles.greetingSub}>Keep going, your dreams are closer than you think!</Text>
          </View>
          <View style={styles.greetingIllustration}>
            <Ionicons name="library" size={64} color="#93C5FD" style={{ opacity: 0.5 }} />
          </View>
        </View>

        {/* AI ASSISTANT BANNER */}
        <View style={styles.px}>
          <LinearGradient
            colors={['#09347a', '#1050b3', '#257ce3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiBanner}
          >
            {/* Wavy shape approximation */}
            <View style={styles.bannerWave1} />
            <View style={styles.bannerWave2} />

            <View style={styles.aiBannerContent}>
              <View style={styles.aiTag}>
                <Ionicons name="sparkles" size={12} color="#FBBF24" />
                <Text style={styles.aiTagText}>AI Assistant</Text>
              </View>
              <Text style={styles.aiTitle}>Ask Anything</Text>
              <Text style={styles.aiDesc}>Get instant help in any language{'\n'}with our AI assistant.</Text>
              <Pressable style={styles.aiButton} onPress={() => router.push('/chat')}>
                <Text style={styles.aiButtonText}>Chat Now</Text>
                <Ionicons name="arrow-forward" size={14} color="#0d47a1" />
              </Pressable>
            </View>
            <View style={styles.aiIllustrationWrap}>
              <View style={[styles.langBubble, { top: -25, left: -45, transform: [{ scale: 0.95 }] }]}>
                <Text style={styles.langText}>A 文</Text>
                <View style={[styles.bubbleTail, { bottom: -4, right: 10 }]} />
              </View>
              <View style={[styles.langBubble, { top: -20, right: -15, transform: [{ scale: 0.85 }] }]}>
                <Text style={styles.langText}>अ</Text>
                <View style={[styles.bubbleTail, { bottom: -4, left: 10 }]} />
              </View>
              <View style={[styles.langBubble, { bottom: -10, right: -30, transform: [{ scale: 0.9 }] }]}>
                <Text style={styles.langText}>あ</Text>
                <View style={[styles.bubbleTail, { top: -4, left: 10 }]} />
              </View>
              
              <View style={styles.robotMock}>
                <Image 
                  source={{ uri: 'https://img.icons8.com/3d-fluency/94/robot.png' }} 
                  style={{ width: 90, height: 90 }}
                  resizeMode="contain"
                />
              </View>
              
              {/* Stars */}
              <Ionicons name="star" size={10} color="#bae6fd" style={{ position: 'absolute', top: 10, left: -60, opacity: 0.8 }} />
              <Ionicons name="star" size={14} color="#bae6fd" style={{ position: 'absolute', bottom: -10, left: -20, opacity: 0.6 }} />
              <Ionicons name="star" size={8} color="#FFF" style={{ position: 'absolute', top: -30, right: 20, opacity: 0.9 }} />
            </View>
          </LinearGradient>
        </View>

        {/* GRID MENU (Exact Static Cards) */}
        <View style={[styles.px, { marginTop: 24 }]}>
          <View style={styles.grid}>
            
            {/* Generate Paper */}
            <Pressable style={styles.menuCard} onPress={() => router.push('/history')}>
              <View style={styles.menuCardTop}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="document-text" size={24} color="#4F46E5" />
                </View>
                <View style={[styles.chevronWrap, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
                </View>
              </View>
              <Text style={styles.menuCardTitle}>Test History</Text>
              <Text style={styles.menuCardSub}>View past performance</Text>
            </Pressable>

            {/* Practice Questions */}
            <Pressable style={styles.menuCard} onPress={() => router.push('/saved')}>
              <View style={styles.menuCardTop}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="help-circle" size={24} color="#8B5CF6" />
                </View>
                <View style={[styles.chevronWrap, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
                </View>
              </View>
              <Text style={styles.menuCardTitle}>Saved Questions</Text>
              <Text style={styles.menuCardSub}>Review bookmarked items</Text>
            </Pressable>

            {/* Premium */}
            <Pressable style={styles.menuCard} onPress={() => router.push('/pricing')}>
              <View style={styles.menuCardTop}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="star" size={24} color="#F43F5E" />
                </View>
                <View style={[styles.chevronWrap, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="chevron-forward" size={14} color="#F43F5E" />
                </View>
              </View>
              <Text style={styles.menuCardTitle}>Premium</Text>
              <Text style={styles.menuCardSub}>Unlock more features</Text>
            </Pressable>

            {/* Profile */}
            <Pressable style={styles.menuCard} onPress={() => router.push('/settings')}>
              <View style={styles.menuCardTop}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#F0FDFA' }]}>
                  <Ionicons name="person" size={24} color="#14B8A6" />
                </View>
                <View style={[styles.chevronWrap, { backgroundColor: '#F0FDFA' }]}>
                  <Ionicons name="chevron-forward" size={14} color="#14B8A6" />
                </View>
              </View>
              <Text style={styles.menuCardTitle}>Profile</Text>
              <Text style={styles.menuCardSub}>View your settings</Text>
            </Pressable>

          </View>
        </View>

        {/* MY SUBJECTS */}
        <View style={{ marginTop: 28 }}>
          <View style={[styles.px, styles.sectionHeader]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Ionicons name="book" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>My Subjects</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
            {isLoading ? (
              <Text style={{ color: '#64748B' }}>Loading subjects...</Text>
            ) : subjects?.map(sub => (
              <Pressable
                key={sub.id}
                style={styles.subjectCard}
                onPress={() => router.push({ pathname: '/subject', params: { subjectId: sub.id, subjectName: sub.name } })}
              >
                <View style={styles.subjectIconWrap}>
                  <Ionicons name="library" size={24} color="#4F46E5" />
                </View>
                <Text style={styles.subjectCardTitle}>{sub.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* QUICK ACCESS */}
        <View style={{ marginTop: 28 }}>
          <View style={[styles.px, styles.sectionHeader]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Ionicons name="flash" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Quick Access</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
            <Pressable onPress={() => router.push('/history')} style={styles.quickPill}><Ionicons name="time" size={16} color="#3B82F6" /><Text style={styles.quickPillText}>Recent History</Text></Pressable>
            <Pressable onPress={() => router.push('/saved')} style={styles.quickPill}><Ionicons name="bookmark" size={16} color="#2563EB" /><Text style={styles.quickPillText}>Saved Qs</Text></Pressable>
            <Pressable onPress={() => router.push('/chat')} style={styles.quickPill}><Ionicons name="sparkles" size={16} color="#3B82F6" /><Text style={styles.quickPillText}>AI Assistant</Text></Pressable>
          </ScrollView>
        </View>

        {/* LEARNING PROGRESS */}
        <View style={[styles.px, { marginTop: 24 }]}>
          <View style={styles.progressCard}>
            <View style={styles.progressCardHeader}>
              <View style={styles.progressIconWrap}>
                <Ionicons name="locate" size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.progressCardTitle}>Your Learning Progress</Text>
                <Text style={styles.progressCardSub}>Keep going! You're doing great!</Text>
              </View>
              <Text style={styles.progressCardValue}>6 / 10 <Ionicons name="chevron-forward" size={12} color="#64748B"/></Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '60%' }]} />
            </View>
          </View>
        </View>
        
        {/* LATEST UPDATES */}
        <View style={{ marginTop: 28 }}>
          <View style={[styles.px, styles.sectionHeader]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Ionicons name="megaphone" size={20} color="#1E293B" />
              <Text style={styles.sectionTitle}>Latest Updates</Text>
            </View>
            <Pressable><Text style={styles.viewAll}>View All →</Text></Pressable>
          </View>
          <View style={[styles.px, { paddingBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
               <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                 <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>NEW</Text>
               </View>
               <Ionicons name="book" size={20} color="#2563EB" />
               <View style={{ flex: 1 }}>
                 <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>New Chapter Added</Text>
                 <Text style={{ fontSize: 11, color: '#64748B' }}>Class 12 • Physics • Chapter 5 - Current Electricity</Text>
               </View>
               <Text style={{ fontSize: 11, color: '#94A3B8' }}>12 Sep 2025</Text>
               <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </View>
          </View>
        </View>

      </ScrollView>

      <BottomTabBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  px: { paddingHorizontal: 20 },
  
  /* APP BAR */
  appBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { width: 44, height: 44, backgroundColor: '#E0E7FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5, lineHeight: 20 },
  logoSubtitle: { fontSize: 18, fontWeight: '800', color: '#2563EB', lineHeight: 20 },
  logoTagline: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2 },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  avatarButton: { width: 36, height: 36, backgroundColor: '#DBEAFE', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  /* GREETING */
  greetingSection: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  greetingTextContainer: { flex: 1, paddingRight: 16 },
  greetingHello: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  greetingWelcome: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  greetingSub: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  greetingIllustration: { width: 80, height: 80, alignItems: 'flex-end', justifyContent: 'center' },

  /* AI BANNER */
  aiBanner: { borderRadius: 20, padding: 24, flexDirection: 'row', overflow: 'hidden', shadowColor: '#1050b3', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8, position: 'relative' },
  bannerWave1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -150, left: -100 },
  bannerWave2: { position: 'absolute', width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.04)', top: -200, right: -150 },
  aiBannerContent: { flex: 1, zIndex: 2 },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 12 },
  aiTagText: { color: '#E0F2FE', fontSize: 11, fontWeight: '700' },
  aiTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 6, letterSpacing: -0.5 },
  aiDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18, marginBottom: 20, paddingRight: 40 },
  aiButton: { backgroundColor: '#FFF', alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  aiButtonText: { color: '#0d47a1', fontSize: 13, fontWeight: '800' },
  
  aiIllustrationWrap: { position: 'absolute', right: 40, bottom: 0, zIndex: 1, width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  robotMock: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  langBubble: { position: 'absolute', backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 2 },
  langText: { fontSize: 14, fontWeight: '800', color: '#0369A1' },
  bubbleTail: { position: 'absolute', width: 8, height: 8, backgroundColor: '#F0F9FF', transform: [{ rotate: '45deg' }], zIndex: 1 },

  /* GRID */
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuCard: { width: '48%', marginBottom: 16, backgroundColor: '#FFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  menuCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chevronWrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: 0.8 },
  menuCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  menuCardSub: { fontSize: 11, color: '#64748B', lineHeight: 16 },

  /* QUICK ACCESS & PROGRESS */
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  viewAll: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  quickPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  quickPillText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  progressCard: { backgroundColor: '#F0F9FF', borderRadius: 20, padding: 16 },
  progressCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressIconWrap: { width: 40, height: 40, backgroundColor: '#DBEAFE', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  progressCardSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  progressCardValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  progressBarBg: { height: 8, backgroundColor: '#DBEAFE', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 4 },
  
  subjectCard: { width: 120, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  subjectIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  subjectCardTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
});
