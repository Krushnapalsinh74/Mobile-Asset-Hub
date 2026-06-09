import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActionItem = {
  key: string;
  label: string;
  desc: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  gradient: [string, string];
  route?: string;
  action?: 'back';
};

const TOPIC_ACTIONS: ActionItem[] = [
  {
    key: 'explanation',
    label: 'Study Guide',
    desc: 'Key concepts & detailed notes',
    icon: 'bulb',
    gradient: ['#059669', '#10B981'],
    route: '/explanation',
  },
  {
    key: 'chat',
    label: 'AI Tutor',
    desc: 'Ask anything, get instant help',
    icon: 'chatbubbles',
    gradient: ['#4F46E5', '#6366F1'],
    route: '/chat',
  },
  {
    key: 'test',
    label: 'Practice Test',
    desc: 'MCQ questions with solutions',
    icon: 'trophy',
    gradient: ['#D97706', '#F59E0B'],
    route: '/test-config',
  },
  {
    key: 'flashcard',
    label: 'Flashcards',
    desc: 'Flip-card rapid revision',
    icon: 'layers',
    gradient: ['#0891B2', '#06B6D4'],
    route: '/flashcard',
  },
];

export default function TopicDashboardScreen() {
  const { subjectId, subjectName, chapterId, chapterName, topicId, topicName } =
    useLocalSearchParams<{
      subjectId: string;
      subjectName: string;
      chapterId: string;
      chapterName: string;
      topicId: string;
      topicName: string;
    }>();
  const { boardName, standardName, setLastStudied, incrementExplored } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (subjectId && subjectName && topicId && topicName) {
      setLastStudied({
        subjectId,
        subjectName,
        chapterId,
        chapterName,
        topicId,
        topicName,
        timestamp: Date.now(),
      });
      incrementExplored(subjectId);
    }
  }, [topicId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── HERO HEADER ── */}
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16 }]}
      >
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <View style={styles.backCircle}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </View>
        </Pressable>

        <View style={styles.topicIconWrap}>
          <Ionicons name="document-text" size={28} color="#FFF" />
        </View>

        <View style={styles.breadcrumbPill}>
          <Ionicons name="navigate-outline" size={10} color="rgba(255,255,255,0.7)" />
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {subjectName}  ›  {chapterName}
          </Text>
        </View>

        <Text style={styles.topicName} numberOfLines={3}>
          {topicName}
        </Text>

        <View style={styles.heroBadges}>
          {boardName ? (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{boardName}</Text>
            </View>
          ) : null}
          {standardName ? (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{standardName}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          What would you like to do?
        </Text>

        {/* ── 2×2 ACTION GRID ── */}
        <View style={styles.grid}>
          {TOPIC_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              style={styles.gridCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (action.action === 'back') { router.back(); return; }
                router.push({
                  pathname: action.route as any,
                  params: { subjectId, subjectName, chapterId, chapterName, topicId, topicName },
                });
              }}
            >
              <LinearGradient
                colors={action.gradient}
                style={styles.gridCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.gridIconWrap}>
                  <Ionicons name={action.icon} size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.gridLabel}>{action.label}</Text>
                <Text style={styles.gridDesc}>{action.desc}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* ── BACK TO TOPICS ── */}
        <Pressable
          style={[styles.backToTopics, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
        >
          <View style={[styles.backToTopicsIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="list-outline" size={16} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.backToTopicsText, { color: colors.mutedForeground }]}>
            Back to all topics
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -60,
  },
  blob2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -40,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
  backCircle: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  topicIconWrap: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  breadcrumbPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 10, maxWidth: '90%',
  },
  breadcrumbText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)' },
  topicName: {
    fontSize: 21, fontWeight: '700', fontFamily: 'Inter_700Bold',
    color: '#FFFFFF', textAlign: 'center', lineHeight: 30,
    paddingHorizontal: 8, marginBottom: 14,
  },
  heroBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroBadgeText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_500Medium' },
  content: { padding: 16, gap: 14 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: '47.5%',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  gridCardGradient: {
    padding: 18,
    minHeight: 140,
    justifyContent: 'flex-end',
    gap: 4,
  },
  gridIconWrap: {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  gridDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', lineHeight: 15 },
  backToTopics: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  backToTopicsIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backToTopicsText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
