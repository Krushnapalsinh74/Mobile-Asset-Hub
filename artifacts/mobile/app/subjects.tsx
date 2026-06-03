import { useApp } from '@/context/AppContext';
import type { SubjectProgress } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Subject } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUBJECT_THEMES: Array<{ color: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = [
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getGreetingEmoji() {
  const h = new Date().getHours();
  if (h < 12) return '☀️';
  if (h < 17) return '🌤️';
  return '🌙';
}

function getFirstName(name: string | null) {
  if (!name) return 'Student';
  const cleaned = name.replace(/[0-9_]/g, ' ').trim();
  const first = cleaned.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1, 14);
}

function getInitials(name: string | null): string {
  if (!name) return 'S';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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

const QUICK_ACTIONS = [
  { key: 'chapters', label: 'Chapters', icon: 'layers-outline' as const, color: '#6366F1' },
  { key: 'test', label: 'Test', icon: 'trophy-outline' as const, color: '#F59E0B' },
  { key: 'ai', label: 'AI Tutor', icon: 'chatbubbles-outline' as const, color: '#8B5CF6' },
  { key: 'explain', label: 'Explain', icon: 'bulb-outline' as const, color: '#10B981' },
];

export default function SubjectsScreen() {
  const {
    studentName, boardId, standardId, boardName, standardName,
    lastStudied, subjectProgress, testHistory, chatHistory,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const subjectsQuery = useQuery({
    queryKey: ['subjects', boardId, standardId],
    queryFn: () => eduApi.getSubjects(boardId!, standardId!),
    enabled: !!boardId && !!standardId,
  });

  const subjects = subjectsQuery.data ?? [];
  const firstName = getFirstName(studentName);
  const initials = getInitials(studentName);

  const totalExplored = Object.values(subjectProgress).reduce((s, p) => s + (p.explored ?? 0), 0);
  const totalTopics = Object.values(subjectProgress).reduce((s, p) => s + (p.total ?? 0), 0);
  const overallPct = totalTopics > 0 ? Math.min(100, Math.round((totalExplored / totalTopics) * 100)) : 0;

  const mcqTests = testHistory.filter(t => t.mode === 'mcq');
  const avgScore = mcqTests.length > 0
    ? Math.round(mcqTests.reduce((s, t) => s + (t.percentage ?? 0), 0) / mcqTests.length)
    : null;

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  function handleQuickAction(key: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sid = lastStudied?.subjectId ?? (subjects[0] ? getId(subjects[0]) : null);
    const sname = lastStudied?.subjectName ?? subjects[0]?.name ?? '';
    if (!sid) return;
    if (key === 'chapters' || key === 'explain') {
      router.push({ pathname: '/chapters' as any, params: { subjectId: sid, subjectName: sname } });
    } else if (key === 'test') {
      router.push({ pathname: '/test-config' as any, params: { subjectId: sid, subjectName: sname } });
    } else {
      router.push({ pathname: '/chat' as any, params: { subjectId: sid, subjectName: sname } });
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 40 }}
      >

        {/* ── TOP BAR ── */}
        <View style={[styles.topBar, { paddingTop: topPad + 14 }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {getGreeting()} {getGreetingEmoji()}
            </Text>
            <Text style={[styles.heroName, { color: colors.text }]}>{firstName}</Text>
          </View>
          <View style={styles.topRight}>
            <Pressable
              style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); router.push('/settings' as any); }}
            >
              <Ionicons name="settings-outline" size={18} color={colors.mutedForeground} />
            </Pressable>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
        </View>

        {/* ── BOARD + CLASS TAG ── */}
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="school-outline" size={11} color={colors.primary} />
            <Text style={[styles.tagText, { color: colors.primary }]}>{boardName}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="layers-outline" size={11} color={colors.primary} />
            <Text style={[styles.tagText, { color: colors.primary }]}>{standardName}</Text>
          </View>
        </View>

        {/* ── PROGRESS CARD ── */}
        <View style={styles.px}>
          <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
            <View style={styles.progressCardLeft}>
              <Text style={styles.progressCardLabel}>Overall Progress</Text>
              <Text style={styles.progressCardPct}>{overallPct}%</Text>
              <Text style={styles.progressCardSub}>
                {totalExplored} of {totalTopics || '–'} topics covered
              </Text>
            </View>
            <View style={styles.progressCardRight}>
              <View style={styles.pctCircle}>
                <Text style={styles.pctCircleNum}>{overallPct}</Text>
                <Text style={styles.pctCircleSymbol}>%</Text>
              </View>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[styles.progressBarFill, {
                backgroundColor: '#FFFFFF',
                width: `${overallPct}%` as any,
              }]} />
            </View>
          </View>
        </View>

        {/* ── STAT ROW ── */}
        <View style={[styles.statRow, styles.px]}>
          {[
            { icon: 'trophy-outline' as const, color: '#F59E0B', val: testHistory.length, label: 'Tests', sub: avgScore !== null ? `avg ${avgScore}%` : null },
            { icon: 'chatbubbles-outline' as const, color: '#8B5CF6', val: chatHistory.length, label: 'AI Chats', sub: null },
            { icon: 'book-outline' as const, color: '#10B981', val: totalExplored, label: 'Topics', sub: null },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon} size={16} color={s.color} />
              </View>
              <Text style={[styles.statVal, { color: colors.text }]}>{s.val}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              {s.sub && <Text style={[styles.statSub, { color: s.color }]}>{s.sub}</Text>}
            </View>
          ))}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={{ paddingTop: 24 }}>
          <View style={[styles.sectionHeader, styles.px]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Jump In</Text>
            {lastStudied && (
              <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                with {lastStudied.subjectName}
              </Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, gap: 10 }}
          >
            {QUICK_ACTIONS.map(a => (
              <Pressable
                key={a.key}
                style={[styles.actionPill, { backgroundColor: a.color + '12', borderColor: a.color + '35' }]}
                onPress={() => handleQuickAction(a.key)}
              >
                <View style={[styles.actionPillIcon, { backgroundColor: a.color + '20' }]}>
                  <Ionicons name={a.icon} size={20} color={a.color} />
                </View>
                <Text style={[styles.actionPillLabel, { color: a.color }]}>{a.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── CONTINUE LEARNING ── */}
        {lastStudied && (() => {
          const theme = getTheme(lastStudied.subjectName, 0);
          return (
            <View style={[styles.section, styles.px]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Learning</Text>
              <Pressable
                style={[styles.continueCard, { backgroundColor: theme.color + '0E', borderColor: theme.color + '35' }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (lastStudied.topicId) {
                    router.push({ pathname: '/topic-dashboard' as any, params: {
                      subjectId: lastStudied.subjectId, subjectName: lastStudied.subjectName,
                      chapterId: lastStudied.chapterId ?? '', chapterName: lastStudied.chapterName ?? '',
                      topicId: lastStudied.topicId, topicName: lastStudied.topicName,
                    }});
                  } else {
                    router.push({ pathname: '/subject' as any, params: { subjectId: lastStudied.subjectId, subjectName: lastStudied.subjectName } });
                  }
                }}
              >
                <View style={[styles.continueLeft, { borderRightColor: theme.color + '30' }]}>
                  <View style={[styles.continueIcon, { backgroundColor: theme.color + '20' }]}>
                    <Ionicons name={theme.icon} size={22} color={theme.color} />
                  </View>
                  <View style={styles.continueInfo}>
                    <Text style={[styles.continueSubject, { color: colors.text }]} numberOfLines={1}>
                      {lastStudied.subjectName}
                    </Text>
                    <Text style={[styles.continueTopic, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {lastStudied.topicName ?? lastStudied.chapterName ?? 'Open subject'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.resumeBtn, { backgroundColor: theme.color }]}>
                  <Ionicons name="play" size={13} color="#FFF" />
                  <Text style={styles.resumeText}>Resume</Text>
                </View>
              </Pressable>
            </View>
          );
        })()}

        {/* ── SUBJECTS LIST ── */}
        <View style={[styles.section, styles.px]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Subjects</Text>
            {subjects.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>{subjects.length}</Text>
              </View>
            )}
          </View>

          {subjectsQuery.isLoading && (
            <View style={styles.loadRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.loadText, { color: colors.mutedForeground }]}>Loading…</Text>
            </View>
          )}

          {subjects.length > 0 && (
            <View style={[styles.subjectsList, { borderColor: colors.border }]}>
              {subjects.map((item, index) => {
                const theme = getTheme(item.name, index);
                const sid = getId(item);
                const prog = subjectProgress[sid];
                const explored = prog?.explored ?? 0;
                const total = prog?.total ?? 0;
                const pct = total > 0 ? Math.min(100, Math.round((explored / total) * 100)) : 0;
                const isLast = index === subjects.length - 1;
                return (
                  <Pressable
                    key={sid}
                    style={[styles.subjectRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push({ pathname: '/subject' as any, params: { subjectId: sid, subjectName: item.name } });
                    }}
                  >
                    {/* Color accent */}
                    <View style={[styles.subjectAccent, { backgroundColor: theme.color }]} />

                    {/* Icon */}
                    <View style={[styles.subjectIcon, { backgroundColor: theme.color + '18' }]}>
                      <Ionicons name={theme.icon} size={18} color={theme.color} />
                    </View>

                    {/* Info */}
                    <View style={styles.subjectInfo}>
                      <View style={styles.subjectTopRow}>
                        <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.subjectPct, { color: pct > 0 ? theme.color : colors.mutedForeground }]}>
                          {pct > 0 ? `${pct}%` : 'New'}
                        </Text>
                      </View>
                      <View style={[styles.subjectBar, { backgroundColor: theme.color + '18' }]}>
                        <View style={[styles.subjectBarFill, {
                          backgroundColor: theme.color,
                          width: pct > 0 ? `${pct}%` as any : '2%',
                          opacity: pct > 0 ? 1 : 0.3,
                        }]} />
                      </View>
                      <Text style={[styles.subjectTopicText, { color: colors.mutedForeground }]}>
                        {explored > 0 ? `${explored} of ${total || '?'} topics` : 'Not started yet'}
                      </Text>
                    </View>

                    {/* Arrow */}
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ── RECENT TESTS ── */}
        {testHistory.length > 0 && (
          <View style={[styles.section, styles.px]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Tests</Text>
              <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{testHistory.length} total</Text>
            </View>
            <View style={styles.testList}>
              {testHistory.slice(0, 5).map((t, i) => {
                const theme = getTheme(t.subjectName, 0);
                const isPass = (t.percentage ?? 0) >= 40;
                return (
                  <View key={i} style={[styles.testItem, { borderBottomColor: colors.border, borderBottomWidth: i < Math.min(testHistory.length, 5) - 1 ? 1 : 0 }]}>
                    <View style={[styles.testDot, { backgroundColor: theme.color }]} />
                    <View style={styles.testBody}>
                      <Text style={[styles.testSubject, { color: colors.text }]}>{t.subjectName}</Text>
                      <Text style={[styles.testMeta, { color: colors.mutedForeground }]}>
                        {t.mode.toUpperCase()} · {timeAgo(t.timestamp)}
                      </Text>
                    </View>
                    {t.percentage !== null ? (
                      <View style={[styles.testBadge, {
                        backgroundColor: t.percentage >= 70 ? '#10B98115' : t.percentage >= 40 ? '#F59E0B15' : '#EF444415',
                      }]}>
                        <Text style={[styles.testBadgeText, {
                          color: t.percentage >= 70 ? '#10B981' : t.percentage >= 40 ? '#D97706' : '#EF4444',
                        }]}>{t.percentage}%</Text>
                      </View>
                    ) : (
                      <Text style={[styles.testScore, { color: colors.mutedForeground }]}>{t.score}/{t.total}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  px: { paddingHorizontal: 20 },

  /* ── Top bar ── */
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 10 },
  greeting: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 3 },
  heroName: { fontSize: 26, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  settingsBtn: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },

  /* ── Tags ── */
  tagRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 20 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 11, fontFamily: 'Inter_500Medium', fontWeight: '500' },

  /* ── Progress card ── */
  progressCard: {
    borderRadius: 24, padding: 22, overflow: 'hidden',
    position: 'relative',
  },
  progressCardLeft: { flex: 1 },
  progressCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginBottom: 6 },
  progressCardPct: { fontSize: 42, fontWeight: '900', fontFamily: 'Inter_700Bold', color: '#FFFFFF', lineHeight: 46 },
  progressCardSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular', marginTop: 6, marginBottom: 16 },
  progressCardRight: {
    position: 'absolute', right: 22, top: 22,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  pctCircle: { alignItems: 'center' },
  pctCircleNum: { fontSize: 26, fontWeight: '900', fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.9)' },
  pctCircleSymbol: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', marginTop: -4 },
  progressBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 0 },
  progressBarFill: { height: 6, borderRadius: 3 },

  /* ── Stat row ── */
  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statCard: {
    flex: 1, borderRadius: 18, borderWidth: 1,
    padding: 14, alignItems: 'flex-start', gap: 6,
  },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_700Bold', marginTop: 4 },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statSub: { fontSize: 10, fontFamily: 'Inter_600SemiBold', fontWeight: '600', marginTop: -2 },

  /* ── Section ── */
  section: { paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sectionHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  /* ── Quick actions ── */
  actionPill: {
    flexDirection: 'column', alignItems: 'center',
    gap: 8, paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 20, borderWidth: 1.5, minWidth: 90,
  },
  actionPillIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionPillLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  /* ── Continue learning ── */
  continueCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1.5, overflow: 'hidden',
    gap: 0,
  },
  continueLeft: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 14,
    borderRightWidth: 1,
  },
  continueIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  continueInfo: { flex: 1 },
  continueSubject: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  continueTopic: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  resumeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, alignSelf: 'stretch', justifyContent: 'center', minWidth: 90,
  },
  resumeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },

  /* ── Subjects list ── */
  loadRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10 },
  loadText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  subjectsList: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  subjectRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 14, paddingVertical: 14, gap: 12, overflow: 'hidden',
  },
  subjectAccent: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginLeft: 0 },
  subjectIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  subjectInfo: { flex: 1 },
  subjectTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subjectName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', flex: 1, marginRight: 8 },
  subjectPct: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  subjectBar: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  subjectBarFill: { height: 5, borderRadius: 3 },
  subjectTopicText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  /* ── Recent tests ── */
  testList: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', borderColor: 'transparent' },
  testItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 },
  testDot: { width: 10, height: 10, borderRadius: 5 },
  testBody: { flex: 1 },
  testSubject: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  testMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  testBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  testBadgeText: { fontSize: 12, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  testScore: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
});
