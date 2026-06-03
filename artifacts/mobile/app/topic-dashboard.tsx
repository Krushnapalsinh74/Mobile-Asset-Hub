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
  color: string;
  route?: string;
  action?: 'back';
};

const TOPIC_ACTIONS: ActionItem[] = [
  {
    key: 'explanation',
    label: 'Study Guide',
    desc: 'Detailed explanation with key concepts',
    icon: 'bulb-outline',
    color: '#10B981',
    route: '/explanation',
  },
  {
    key: 'chat',
    label: 'AI Tutor',
    desc: 'Discuss this topic with AI instantly',
    icon: 'chatbubbles-outline',
    color: '#6366F1',
    route: '/chat',
  },
  {
    key: 'test',
    label: 'Practice Test',
    desc: 'Generate questions for this chapter',
    icon: 'trophy-outline',
    color: '#F59E0B',
    route: '/test-config',
  },
  {
    key: 'topics',
    label: 'Back to Topics',
    desc: 'See all topics in this chapter',
    icon: 'list-outline',
    color: '#94A3B8',
    action: 'back',
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
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <View style={[styles.backCircle, { backgroundColor: colors.secondary }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </View>
        </Pressable>

        <View style={[styles.topicIconWrap, { backgroundColor: colors.successLight }]}>
          <Ionicons name="document-text-outline" size={26} color={colors.success} />
        </View>

        <View style={[styles.breadcrumbPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.breadcrumbText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {subjectName} › {chapterName}
          </Text>
        </View>

        <Text style={[styles.topicName, { color: colors.text }]} numberOfLines={3}>
          {topicName}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Explore this topic
        </Text>
        {TOPIC_ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            style={[
              styles.actionRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (action.action === 'back') {
                router.back();
                return;
              }
              router.push({
                pathname: action.route as any,
                params: { subjectId, subjectName, chapterId, chapterName, topicId, topicName },
              });
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                {action.desc}
              </Text>
            </View>
            <View style={[styles.actionChevron, { backgroundColor: colors.secondary }]}>
              <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 18 },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  breadcrumbPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    maxWidth: '90%',
  },
  breadcrumbText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  topicName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 12,
  },
  content: { padding: 20, gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  actionDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  actionChevron: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
