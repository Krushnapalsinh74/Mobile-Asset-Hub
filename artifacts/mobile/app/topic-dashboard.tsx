import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActionItem = {
  key: string;
  label: string;
  desc: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  route?: string;
  action?: 'back';
};

const TOPIC_ACTIONS: ActionItem[] = [
  {
    key: 'explanation',
    label: 'Study Guide',
    desc: 'Key concepts & detailed notes',
    icon: 'bulb-outline',
    route: '/explanation',
  },
  {
    key: 'chat',
    label: 'AI Tutor',
    desc: 'Ask anything, get instant help',
    icon: 'chatbubbles-outline',
    route: '/chat',
  },
  {
    key: 'test',
    label: 'Practice Test',
    desc: 'MCQ questions with solutions',
    icon: 'trophy-outline',
    route: '/test-config',
  },
  {
    key: 'flashcard',
    label: 'Flashcards',
    desc: 'Flip-card rapid revision',
    icon: 'layers-outline',
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
      {/* ── HERO ── */}
      <View style={[styles.hero, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <View style={styles.backCircle}>
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.9)" />
          </View>
        </Pressable>

        <View style={styles.topicIconWrap}>
          <Ionicons name="document-text-outline" size={26} color="rgba(255,255,255,0.9)" />
        </View>

        <View style={styles.breadcrumbPill}>
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
      </View>

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
              style={[styles.gridCard, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (action.action === 'back') { router.back(); return; }
                router.push({
                  pathname: action.route as any,
                  params: { subjectId, subjectName, chapterId, chapterName, topicId, topicName },
                });
              }}
            >
              <View style={styles.gridIconWrap}>
                <Ionicons name={action.icon} size={24} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.gridLabel}>{action.label}</Text>
              <Text style={styles.gridDesc}>{action.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── BACK TO TOPICS ── */}
        <Pressable
          style={[styles.backToTopics, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
        >
          <View style={[styles.backToTopicsIcon, { backgroundColor: colors.muted }]}>
            <Ionicons name="list-outline" size={15} color={colors.mutedForeground} />
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
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 18 },
  backCircle: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  topicIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  breadcrumbPill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 10, maxWidth: '90%',
  },
  breadcrumbText: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  topicName: {
    fontSize: 20, fontWeight: '700',
    color: '#FFFFFF', textAlign: 'center', lineHeight: 28,
    paddingHorizontal: 8, marginBottom: 14,
  },
  heroBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBadgeText: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },

  content: { padding: 16, gap: 12 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    width: '47.5%',
    borderRadius: 18,
    padding: 16,
    minHeight: 130,
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  gridIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  gridLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  gridDesc: { fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 15 },
  backToTopics: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  backToTopicsIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  backToTopicsText: { flex: 1, fontSize: 14 },
});
