import { useApp } from '@/context/AppContext';
import type { LastStudied, SubjectProgress } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Subject } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUBJECT_THEMES: Array<{
  color: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}> = [
  { color: '#6366F1', icon: 'calculator-outline' },
  { color: '#F59E0B', icon: 'flask-outline' },
  { color: '#10B981', icon: 'leaf-outline' },
  { color: '#EF4444', icon: 'reader-outline' },
  { color: '#06B6D4', icon: 'globe-outline' },
  { color: '#8B5CF6', icon: 'planet-outline' },
  { color: '#F97316', icon: 'people-outline' },
  { color: '#14B8A6', icon: 'code-outline' },
];

function getTheme(name: string, index: number) {
  const l = name.toLowerCase();
  if (l.includes('math')) return SUBJECT_THEMES[0];
  if (l.includes('physics')) return SUBJECT_THEMES[5];
  if (l.includes('chem')) return SUBJECT_THEMES[1];
  if (l.includes('bio') || l.includes('life')) return SUBJECT_THEMES[2];
  if (l.includes('english') || l.includes('lang')) return SUBJECT_THEMES[3];
  if (l.includes('geo') || l.includes('social') || l.includes('evs')) return SUBJECT_THEMES[4];
  if (l.includes('history') || l.includes('civics')) return SUBJECT_THEMES[6];
  if (l.includes('computer') || l.includes('it') || l.includes('tech')) return SUBJECT_THEMES[7];
  return SUBJECT_THEMES[index % SUBJECT_THEMES.length];
}

function getThemeByName(name: string) {
  return getTheme(name, 0);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(name: string | null) {
  if (!name) return 'Student';
  const cleaned = name.replace(/[0-9_]/g, ' ').trim();
  const first = cleaned.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1, 14);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ContinueLearning({ last, colors }: { last: LastStudied; colors: ReturnType<typeof useColors> }) {
  const theme = getThemeByName(last.subjectName);
  return (
    <View style={[styles.continueWrap, { backgroundColor: theme.color + '12', borderColor: theme.color + '30' }]}>
      <View style={styles.continueLeft}>
        <View style={[styles.continueIconWrap, { backgroundColor: theme.color + '22' }]}>
          <Ionicons name={theme.icon} size={22} color={theme.color} />
        </View>
        <View style={styles.continueText}>
          <Text style={[styles.continueLabel, { color: colors.mutedForeground }]}>
            Continue learning
          </Text>
          <Text style={[styles.continueSubject, { color: colors.text }]} numberOfLines={1}>
            {last.subjectName}
          </Text>
          {(last.topicName || last.chapterName) && (
            <Text style={[styles.continueTopic, { color: colors.mutedForeground }]} numberOfLines={1}>
              {last.topicName ?? last.chapterName}
            </Text>
          )}
        </View>
      </View>
      <Pressable
        style={[styles.resumeBtn, { backgroundColor: theme.color }]}
        onPress={() => {
          Haptics.selectionAsync();
          if (last.topicId && last.topicName) {
            router.push({
              pathname: '/topic-dashboard' as any,
              params: {
                subjectId: last.subjectId,
                subjectName: last.subjectName,
                chapterId: last.chapterId ?? '',
                chapterName: last.chapterName ?? '',
                topicId: last.topicId,
                topicName: last.topicName,
              },
            });
          } else {
            router.push({
              pathname: '/subject' as any,
              params: { subjectId: last.subjectId, subjectName: last.subjectName },
            });
          }
        }}
      >
        <Text style={styles.resumeBtnText}>Resume</Text>
        <Ionicons name="play" size={12} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function MiniProgressBar({ progress, color }: { progress: SubjectProgress | undefined; color: string }) {
  const explored = progress?.explored ?? 0;
  const total = progress?.total ?? 0;
  const pct = total > 0 ? Math.min(1, explored / total) : 0;
  const label = total > 0
    ? `${Math.round(pct * 100)}%`
    : explored > 0 ? `${explored} topics` : null;

  if (!label) return null;

  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: color + '20' }]}>
        <View style={[styles.progressFill, { backgroundColor: color, width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
      <Text style={[styles.progressLabel, { color }]}>{label}</Text>
    </View>
  );
}

function SubjectCard({ subject, index, colors, progress }: { subject: Subject; index: number; colors: ReturnType<typeof useColors>; progress?: SubjectProgress }) {
  const theme = getTheme(subject.name, index);
  return (
    <Pressable
      style={styles.cardWrap}
      onPress={() => {
        Haptics.selectionAsync();
        router.push({
          pathname: '/subject' as any,
          params: { subjectId: getId(subject), subjectName: subject.name },
        });
      }}
    >
      <View style={[styles.card, { backgroundColor: theme.color + '14', borderColor: theme.color + '30' }]}>
        <View style={[styles.cardCircle, { backgroundColor: theme.color + '10' }]} />
        <View style={[styles.iconWrap, { backgroundColor: theme.color + '28' }]}>
          <Ionicons name={theme.icon} size={28} color={theme.color} />
        </View>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
          {subject.name}
        </Text>
        <MiniProgressBar progress={progress} color={theme.color} />
        <View style={[styles.goChip, { backgroundColor: theme.color }]}>
          <Text style={styles.goChipText}>Open</Text>
          <Ionicons name="arrow-forward" size={11} color="#FFF" />
        </View>
      </View>
    </Pressable>
  );
}

export default function SubjectsScreen() {
  const { studentName, boardId, standardId, boardName, standardName, lastStudied, subjectProgress } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const subjectsQuery = useQuery({
    queryKey: ['subjects', boardId, standardId],
    queryFn: () => eduApi.getSubjects(boardId!, standardId!),
    enabled: !!boardId && !!standardId,
  });

  const firstName = getFirstName(studentName);
  const total = subjectsQuery.data?.length ?? 0;

  const totalExplored = Object.values(subjectProgress).reduce((s, p) => s + (p.explored ?? 0), 0);
  const totalTopics = Object.values(subjectProgress).reduce((s, p) => s + (p.total ?? 0), 0);
  const overallPct = totalTopics > 0 ? Math.min(100, Math.round((totalExplored / totalTopics) * 100)) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 }}
        refreshControl={undefined}
      >
        {/* ── Header ── */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 18,
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                {getGreeting()} 👋
              </Text>
              <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                {firstName}
              </Text>
            </View>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/settings' as any); }}
              style={[styles.settingsBtn, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="settings-outline" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Board + class pills */}
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="school-outline" size={12} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>{boardName}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="layers-outline" size={12} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>{standardName}</Text>
            </View>
            {total > 0 && (
              <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
                <Ionicons name="book-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {total} subjects
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Continue Learning ── */}
        {lastStudied && (
          <View style={styles.section}>
            <ContinueLearning last={lastStudied} colors={colors} />
          </View>
        )}

        {/* ── Subjects ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Subjects</Text>
            {total > 0 && (
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
                {total} available
              </Text>
            )}
          </View>

          {subjectsQuery.isLoading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                Loading subjects...
              </Text>
            </View>
          )}

          {subjectsQuery.error && (
            <View style={styles.center}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="cloud-offline-outline" size={32} color={colors.destructive} />
              </View>
              <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn't load subjects</Text>
              <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
                Check your internet connection
              </Text>
              <Pressable
                onPress={() => subjectsQuery.refetch()}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {subjectsQuery.data && subjectsQuery.data.length === 0 && (
            <View style={styles.center}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="book-outline" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                No subjects found for this class
              </Text>
            </View>
          )}

          {subjectsQuery.data && subjectsQuery.data.length > 0 && (
            <>
              {totalExplored > 0 && (
                <View style={[styles.overallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.overallRow}>
                    <View style={[styles.overallIcon, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="stats-chart" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.overallText}>
                      <Text style={[styles.overallLabel, { color: colors.mutedForeground }]}>
                        Overall progress
                      </Text>
                      <Text style={[styles.overallValue, { color: colors.text }]}>
                        {totalExplored} topics explored
                        {totalTopics > 0 ? ` · ${overallPct}%` : ''}
                      </Text>
                    </View>
                    {totalTopics > 0 && (
                      <Text style={[styles.overallPct, { color: colors.primary }]}>
                        {overallPct}%
                      </Text>
                    )}
                  </View>
                  {totalTopics > 0 && (
                    <View style={[styles.overallTrack, { backgroundColor: colors.primaryLight }]}>
                      <View style={[styles.overallFill, { backgroundColor: colors.primary, width: `${overallPct}%` as any }]} />
                    </View>
                  )}
                </View>
              )}
              <View style={styles.grid}>
                {subjectsQuery.data.map((item, index) => (
                  <SubjectCard
                    key={getId(item)}
                    subject={item}
                    index={index}
                    colors={colors}
                    progress={subjectProgress[getId(item)]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── Quick actions strip ── */}
        <View style={[styles.section, styles.tipsRow]}>
          {[
            { icon: 'chatbubbles-outline' as const, label: 'Need help?', sub: 'Ask AI Tutor', color: '#6366F1' },
            { icon: 'trophy-outline' as const, label: 'Test yourself', sub: 'Live Quiz', color: '#F59E0B' },
          ].map((tip) => (
            <View key={tip.label} style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.tipIcon, { backgroundColor: tip.color + '18' }]}>
                <Ionicons name={tip.icon} size={18} color={tip.color} />
              </View>
              <View>
                <Text style={[styles.tipLabel, { color: colors.text }]}>{tip.label}</Text>
                <Text style={[styles.tipSub, { color: colors.mutedForeground }]}>{tip.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  studentName: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  metaText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sectionCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  /* Continue Learning */
  continueWrap: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  continueLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  continueIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: { flex: 1 },
  continueLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  continueSubject: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  continueTopic: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  resumeBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  /* Subject grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardWrap: { width: '47.5%' },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    minHeight: 168,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  cardCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -24,
    right: -24,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 21,
    flex: 1,
  },
  goChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  goChipText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  /* Quick tips strip */
  tipsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
  },
  tipCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  tipSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },

  /* Overall progress card */
  overallCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  overallIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overallText: { flex: 1 },
  overallLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  overallValue: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  overallPct: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  overallTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  overallFill: { height: 6, borderRadius: 3 },

  /* Mini progress bar on cards */
  progressWrap: { gap: 4, marginBottom: 2 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  /* States */
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  hintText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  errorTitle: { fontSize: 17, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  errorSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
