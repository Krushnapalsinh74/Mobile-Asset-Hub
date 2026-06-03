import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActionConfig = {
  key: string;
  label: string;
  desc: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  colors: [string, string];
  route: string;
  extra?: Record<string, string>;
};

const ACTIONS: ActionConfig[] = [
  {
    key: 'chat',
    label: 'AI Chat',
    desc: 'Ask questions, get instant help from AI',
    icon: 'chatbubbles-outline',
    colors: ['#4F46E5', '#7C3AED'],
    route: '/chat',
  },
  {
    key: 'chapters',
    label: 'Chapters',
    desc: 'Browse all chapters and topics',
    icon: 'list-outline',
    colors: ['#F59E0B', '#D97706'],
    route: '/chapters',
  },
  {
    key: 'test',
    label: 'Live Test',
    desc: 'Test your knowledge with AI-generated questions',
    icon: 'trophy-outline',
    colors: ['#EF4444', '#DC2626'],
    route: '/test-config',
  },
  {
    key: 'explanation',
    label: 'Explanation',
    desc: 'Deep-dive into any topic',
    icon: 'bulb-outline',
    colors: ['#10B981', '#059669'],
    route: '/chapters',
    extra: { mode: 'explanation' },
  },
];

export default function SubjectScreen() {
  const { subjectId, subjectName } = useLocalSearchParams<{
    subjectId: string;
    subjectName: string;
  }>();
  const { boardName, standardName } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#312E81', '#4F46E5']}
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 12 },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerIconWrap}>
          <Ionicons name="reader-outline" size={38} color="rgba(255,255,255,0.92)" />
        </View>
        <Text style={styles.subjectName}>{subjectName}</Text>
        <Text style={styles.breadcrumb}>
          {boardName} • {standardName}
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
          WHAT WOULD YOU LIKE TO DO?
        </Text>
        <View style={styles.grid}>
          {ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              style={styles.actionCard}
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
              <LinearGradient colors={action.colors} style={styles.actionGradient}>
                <View style={styles.actionIconWrap}>
                  <Ionicons name={action.icon} size={30} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionDesc}>{action.desc}</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.65)" />
                </View>
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
  header: { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 18, padding: 4 },
  headerIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  subjectName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  breadcrumb: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
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
  actionGradient: { borderRadius: 22, padding: 20, minHeight: 168 },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  actionLabel: {
    fontSize: 16,
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
  actionArrow: { position: 'absolute', top: 16, right: 16 },
});
