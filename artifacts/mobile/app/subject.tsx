import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActionConfig = {
  key: string;
  label: string;
  desc: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  color: string;
  route: string;
  extra?: Record<string, string>;
};

const ACTIONS: ActionConfig[] = [
  {
    key: 'chapters',
    label: 'Chapters & Topics',
    desc: 'Browse all chapters and explore topics',
    icon: 'list-outline',
    color: '#6366F1',
    route: '/chapters',
  },
  {
    key: 'explanation',
    label: 'Explanation',
    desc: 'Deep-dive study guide for any topic',
    icon: 'bulb-outline',
    color: '#10B981',
    route: '/chapters',
    extra: { mode: 'explanation' },
  },
  {
    key: 'test',
    label: 'Live Test',
    desc: 'AI-generated questions to test yourself',
    icon: 'trophy-outline',
    color: '#F59E0B',
    route: '/test-config',
  },
  {
    key: 'chat',
    label: 'AI Tutor',
    desc: 'Ask anything, get instant AI help',
    icon: 'chatbubbles-outline',
    color: '#8B5CF6',
    route: '/chat',
  },
];

export default function SubjectScreen() {
  const { subjectId, subjectName } = useLocalSearchParams<{
    subjectId: string;
    subjectName: string;
  }>();
  const { boardName, standardName, setLastStudied } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (subjectId && subjectName) {
      setLastStudied({
        subjectId,
        subjectName,
        timestamp: Date.now(),
      });
    }
  }, [subjectId]);

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
        <View style={[styles.subjectIconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="reader-outline" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.subjectName, { color: colors.text }]}>{subjectName}</Text>
        <Text style={[styles.breadcrumb, { color: colors.mutedForeground }]}>
          {boardName} • {standardName}
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
          Choose what to do
        </Text>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            style={[
              styles.actionRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: action.route as any,
                params: {
                  subjectId,
                  subjectName,
                  ...(action.extra ?? {}),
                },
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
  backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  subjectName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  breadcrumb: { fontSize: 13, fontFamily: 'Inter_400Regular' },
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
