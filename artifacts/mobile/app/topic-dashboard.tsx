import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActionItem = {
  key: string;
  label: string;
  desc: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  colors: [string, string];
  route?: string;
  action?: 'back';
};

const TOPIC_ACTIONS: ActionItem[] = [
  {
    key: 'chat',
    label: 'AI Chat',
    desc: 'Discuss this topic with AI',
    icon: 'chatbubbles-outline',
    colors: ['#4F46E5', '#7C3AED'],
    route: '/chat',
  },
  {
    key: 'topics',
    label: 'Topics',
    desc: 'Back to topics list',
    icon: 'list-outline',
    colors: ['#F59E0B', '#D97706'],
    action: 'back',
  },
  {
    key: 'test',
    label: 'Live Test',
    desc: 'Generate a test for this chapter',
    icon: 'trophy-outline',
    colors: ['#EF4444', '#DC2626'],
    route: '/test-config',
  },
  {
    key: 'explanation',
    label: 'Explanation',
    desc: 'Detailed AI explanation',
    icon: 'bulb-outline',
    colors: ['#10B981', '#059669'],
    route: '/explanation',
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
  const { boardName, standardName } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#065F46', '#10B981']}
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 12 },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerIconWrap}>
          <Ionicons name="document-text-outline" size={34} color="rgba(255,255,255,0.92)" />
        </View>
        <Text style={styles.topicLabel}>TOPIC</Text>
        <Text style={styles.topicName} numberOfLines={3}>
          {topicName}
        </Text>
        <Text style={styles.breadcrumb}>
          {subjectName} • {chapterName}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          EXPLORE THIS TOPIC
        </Text>
        <View style={styles.grid}>
          {TOPIC_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              style={styles.actionCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (action.action === 'back') {
                  router.back();
                  return;
                }
                router.push({
                  pathname: action.route as any,
                  params: {
                    subjectId,
                    subjectName,
                    chapterId,
                    chapterName,
                    topicId,
                    topicName,
                  },
                });
              }}
            >
              <LinearGradient colors={action.colors} style={styles.actionGradient}>
                <View style={styles.actionIconWrap}>
                  <Ionicons name={action.icon} size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionDesc}>{action.desc}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 16, padding: 4 },
  headerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  topicLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.8,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  topicName: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
    lineHeight: 29,
  },
  breadcrumb: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Inter_400Regular',
  },
  content: { padding: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 16,
    fontFamily: 'Inter_700Bold',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  actionCard: { width: '47%' },
  actionGradient: { borderRadius: 22, padding: 18, minHeight: 155 },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },
  actionDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
});
