import { useApp } from '@/context/AppContext';
import type { SubjectProgress } from '@/context/AppContext';
import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Subject } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
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

  const mcqTests = testHistory.filter(t => t.mode === 'mcq' && t.percentage !== null);
  const avgScore = mcqTests.length > 0
    ? Math.round(mcqTests.reduce((s, t) => s + (t.percentage ?? 0), 0) / mcqTests.length)
    : null;

  const latestPct = mcqTests[0]?.percentage ?? null;
  const prevPct = mcqTests[1]?.percentage ?? null;
  const improvement = latestPct !== null && prevPct !== null ? latestPct - prevPct : null;
  const bestScore = mcqTests.length > 0 ? Math.max(...mcqTests.map(t => t.percentage ?? 0)) : null;

  // Streak: how many consecutive tests where score improved or stayed same
  let improvingStreak = 0;
  for (let i = 0; i < mcqTests.length - 1; i++) {
    if ((mcqTests[i].percentage ?? 0) >= (mcqTests[i + 1].percentage ?? 0)) improvingStreak++;
    else break;
  }

  const recentBars = mcqTests.slice(0, 6).reverse(); // oldest→newest for bar chart

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelectMode() {
    Haptics.selectionAsync();
    if (selectMode) { setSelected(new Set()); setSelectMode(false); }
    else setSelectMode(true);
  }

  function toggleItem(id: string) {
    Haptics.selectionAsync();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllSubjects() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selected.size === subjects.length) setSelected(new Set());
    else setSelected(new Set(subjects.map(s => getId(s))));
  }

  function handleViewChapters() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sel = subjects.filter(s => selected.has(getId(s)));
    if (sel.length === 0) return;
    router.push({
      pathname: '/chapters' as any,
      params: {
        subjectId: sel.map(s => getId(s)).join(','),
        subjectName: sel.map(s => s.name).join('|||'),
        multiSelect: 'true',
      },
    });
  }

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
        contentContainerStyle={{
          paddingBottom: tabBarHeight + (selectMode && selected.size > 0 ? 88 : 20),
        }}
      >

        {/* ── TOP BAR ── */}
        <View style={[styles.topBar, { paddingTop: topPad + 4 }]}>
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

        {/* ── IMPROVEMENT CARD ── */}
        {mcqTests.length > 0 && (
          <View style={[styles.section, styles.px]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Improvement</Text>
              {improvement !== null && (
                <View style={[styles.trendPill, {
                  backgroundColor: improvement > 0 ? '#10B98115' : improvement < 0 ? '#EF444415' : '#6366F115',
                }]}>
                  <Ionicons
                    name={improvement > 0 ? 'trending-up' : improvement < 0 ? 'trending-down' : 'remove'}
                    size={13}
                    color={improvement > 0 ? '#10B981' : improvement < 0 ? '#EF4444' : '#6366F1'}
                  />
                  <Text style={[styles.trendPillText, {
                    color: improvement > 0 ? '#10B981' : improvement < 0 ? '#EF4444' : '#6366F1',
                  }]}>
                    {improvement > 0 ? '+' : ''}{improvement}% vs last
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.improvementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Score bars row */}
              {recentBars.length > 0 && (
                <View style={styles.barsSection}>
                  <Text style={[styles.barsLabel, { color: colors.mutedForeground }]}>
                    Last {recentBars.length} test{recentBars.length > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.barsRow}>
                    {recentBars.map((t, i) => {
                      const pct = t.percentage ?? 0;
                      const isLatest = i === recentBars.length - 1;
                      const barColor = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
                      return (
                        <View key={i} style={styles.barCol}>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, {
                              height: `${Math.max(8, pct)}%` as any,
                              backgroundColor: isLatest ? barColor : barColor + '70',
                            }]} />
                          </View>
                          <Text style={[styles.barPct, {
                            color: isLatest ? colors.text : colors.mutedForeground,
                            fontFamily: isLatest ? 'Inter_700Bold' : 'Inter_400Regular',
                          }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Stats row */}
              <View style={[styles.impStatsRow, { borderTopColor: colors.border }]}>
                <View style={styles.impStat}>
                  <Text style={[styles.impStatVal, { color: colors.text }]}>
                    {latestPct !== null ? `${latestPct}%` : '–'}
                  </Text>
                  <Text style={[styles.impStatLabel, { color: colors.mutedForeground }]}>Latest</Text>
                </View>
                <View style={[styles.impStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.impStat}>
                  <Text style={[styles.impStatVal, { color: colors.text }]}>
                    {avgScore !== null ? `${avgScore}%` : '–'}
                  </Text>
                  <Text style={[styles.impStatLabel, { color: colors.mutedForeground }]}>Average</Text>
                </View>
                <View style={[styles.impStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.impStat}>
                  <Text style={[styles.impStatVal, { color: '#F59E0B' }]}>
                    {bestScore !== null ? `${bestScore}%` : '–'}
                  </Text>
                  <Text style={[styles.impStatLabel, { color: colors.mutedForeground }]}>Best</Text>
                </View>
                <View style={[styles.impStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.impStat}>
                  <Text style={[styles.impStatVal, { color: '#8B5CF6' }]}>{mcqTests.length}</Text>
                  <Text style={[styles.impStatLabel, { color: colors.mutedForeground }]}>Tests</Text>
                </View>
              </View>

              {/* Streak message */}
              {improvingStreak >= 2 && (
                <View style={[styles.streakBanner, { backgroundColor: '#10B98110' }]}>
                  <Ionicons name="flame" size={14} color="#10B981" />
                  <Text style={[styles.streakText, { color: '#10B981' }]}>
                    {improvingStreak} test streak — keep it up!
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectMode && selected.size > 0 ? `${selected.size} selected` : 'Your Subjects'}
              </Text>
              {subjects.length > 0 && !selectMode && (
                <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{subjects.length}</Text>
                </View>
              )}
            </View>
            {subjects.length > 1 && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {selectMode && (
                  <Pressable
                    style={[styles.selAllBtn, { backgroundColor: selected.size === subjects.length ? colors.primaryLight : colors.secondary }]}
                    onPress={selectAllSubjects}
                  >
                    <Ionicons name={selected.size === subjects.length ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={selected.size === subjects.length ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.selAllText, { color: selected.size === subjects.length ? colors.primary : colors.mutedForeground }]}>All</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.selToggle, { backgroundColor: selectMode ? colors.primary + '18' : colors.secondary, borderColor: selectMode ? colors.primary : colors.border }]}
                  onPress={toggleSelectMode}
                >
                  <Ionicons name={selectMode ? 'close' : 'checkmark-done-outline'} size={13} color={selectMode ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.selToggleText, { color: selectMode ? colors.primary : colors.mutedForeground }]}>
                    {selectMode ? 'Cancel' : 'Select'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {subjectsQuery.isLoading && (
            <View style={styles.loadRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.loadText, { color: colors.mutedForeground }]}>Loading…</Text>
            </View>
          )}

          {subjectsQuery.isError && !subjectsQuery.isLoading && (
            <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.errorIcon, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="cloud-offline-outline" size={28} color="#EF4444" />
              </View>
              <View style={styles.errorBody}>
                <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn't load subjects</Text>
                <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
                  Check your internet connection and try again.
                </Text>
              </View>
              <Pressable
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={() => { Haptics.selectionAsync(); subjectsQuery.refetch(); }}
              >
                <Ionicons name="refresh-outline" size={15} color="#FFF" />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {!subjectsQuery.isLoading && !subjectsQuery.isError && subjects.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="book-outline" size={26} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No subjects found for your class. Try a different board or standard in Settings.
              </Text>
            </View>
          )}

          {subjects.length > 0 && (
            <View style={[styles.subjectsList, { borderColor: selectMode ? colors.primary + '30' : colors.border, borderWidth: selectMode ? 1.5 : 1 }]}>
              {subjects.map((item, index) => {
                const theme = getTheme(item.name, index);
                const sid = getId(item);
                const prog = subjectProgress[sid];
                const explored = prog?.explored ?? 0;
                const total = prog?.total ?? 0;
                const pct = total > 0 ? Math.min(100, Math.round((explored / total) * 100)) : 0;
                const isLast = index === subjects.length - 1;
                const isSelected = selected.has(sid);
                return (
                  <Pressable
                    key={sid}
                    style={[
                      styles.subjectRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => {
                      if (selectMode) { toggleItem(sid); return; }
                      Haptics.selectionAsync();
                      router.push({ pathname: '/subject' as any, params: { subjectId: sid, subjectName: item.name } });
                    }}
                    onLongPress={() => {
                      if (!selectMode) {
                        setSelectMode(true);
                        setSelected(new Set([sid]));
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                    }}
                  >
                    {/* Left: checkbox in select mode, accent bar otherwise */}
                    {selectMode ? (
                      <View style={[styles.subjectCheckbox, { backgroundColor: isSelected ? colors.primary : 'transparent', borderColor: isSelected ? colors.primary : colors.border }]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                      </View>
                    ) : (
                      <View style={[styles.subjectAccent, { backgroundColor: theme.color }]} />
                    )}

                    {/* Icon */}
                    <View style={[styles.subjectIcon, { backgroundColor: isSelected ? colors.primary + '25' : theme.color + '18' }]}>
                      <Ionicons name={theme.icon} size={18} color={isSelected ? colors.primary : theme.color} />
                    </View>

                    {/* Info */}
                    <View style={styles.subjectInfo}>
                      <View style={styles.subjectTopRow}>
                        <Text style={[styles.subjectName, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.subjectPct, { color: pct > 0 ? (isSelected ? colors.primary : theme.color) : colors.mutedForeground }]}>
                          {pct > 0 ? `${pct}%` : selectMode ? '' : 'New'}
                        </Text>
                      </View>
                      {!selectMode && (
                        <>
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
                        </>
                      )}
                      {selectMode && (
                        <Text style={[styles.subjectTopicText, { color: isSelected ? colors.primary : colors.mutedForeground }]}>
                          {isSelected ? 'Selected — chapters will be included' : 'Tap to select'}
                        </Text>
                      )}
                    </View>

                    {/* Right indicator */}
                    {selectMode ? null : (
                      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                    )}
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
            <View style={[styles.testList, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              {testHistory.slice(0, 6).map((t, i) => {
                const theme = getTheme(t.subjectName, 0);
                const pct = t.percentage ?? null;
                const barColor = pct !== null ? (pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444') : theme.color;
                const scoreLabel = pct !== null
                  ? (pct >= 90 ? '🏆' : pct >= 70 ? '✅' : pct >= 40 ? '📈' : '📚')
                  : null;
                return (
                  <View key={i} style={[
                    styles.testItem,
                    { borderBottomColor: colors.border, borderBottomWidth: i < Math.min(testHistory.length, 6) - 1 ? 1 : 0 },
                  ]}>
                    <View style={[styles.testIconWrap, { backgroundColor: theme.color + '15' }]}>
                      <Ionicons name={theme.icon} size={16} color={theme.color} />
                    </View>
                    <View style={styles.testBody}>
                      <View style={styles.testTopRow}>
                        <Text style={[styles.testSubject, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                          {t.subjectName}
                        </Text>
                        {pct !== null ? (
                          <View style={[styles.testBadge, { backgroundColor: barColor + '18' }]}>
                            <Text style={[styles.testBadgeText, { color: barColor }]}>
                              {scoreLabel} {pct}%
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.testScore, { color: colors.mutedForeground }]}>{t.score}/{t.total}</Text>
                        )}
                      </View>
                      <Text style={[styles.testMeta, { color: colors.mutedForeground }]}>
                        {t.chapterName ? `${t.chapterName} · ` : ''}{t.mode.toUpperCase()} · {timeAgo(t.timestamp)}
                      </Text>
                      {pct !== null && (
                        <View style={[styles.testScoreBar, { backgroundColor: barColor + '20' }]}>
                          <View style={[styles.testScoreBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── BOTTOM ACTION BAR (multi-select, floats above tab bar) ── */}
      {selectMode && selected.size > 0 && (
        <View style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: 8,
            position: 'absolute',
            bottom: tabBarHeight,
            left: 0,
            right: 0,
          },
        ]}>
          <View style={styles.bottomBarLeft}>
            <View style={[styles.countBubble, { backgroundColor: colors.primary }]}>
              <Text style={styles.countBubbleText}>{selected.size}</Text>
            </View>
            <Text style={[styles.bottomBarLabel, { color: colors.text }]}>
              {selected.size === subjects.length ? 'All subjects' : selected.size === 1 ? 'subject selected' : 'subjects selected'}
            </Text>
          </View>
          <Pressable style={[styles.viewChaptersBtn, { backgroundColor: colors.primary }]} onPress={handleViewChapters}>
            <Text style={styles.viewChaptersBtnText}>View Chapters</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </Pressable>
        </View>
      )}

      {/* ── BOTTOM TAB NAV ── */}
      <BottomTabBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  px: { paddingHorizontal: 20 },

  /* ── Top bar ── */
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 4 },
  greeting: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 3 },
  heroName: { fontSize: 26, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  settingsBtn: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },

  /* ── Tags ── */
  tagRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
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
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 18, borderWidth: 1, flexWrap: 'wrap',
  },
  errorIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  errorBody: { flex: 1 },
  errorTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  errorSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  retryText: { color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderRadius: 18, borderWidth: 1,
  },
  emptyText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
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
  subjectCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },

  /* ── Multi-select controls ── */
  selAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  selAllText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  selToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  selToggleText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },

  /* ── Bottom action bar ── */
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 12,
  },
  bottomBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countBubbleText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },
  bottomBarLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  viewChaptersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14,
  },
  viewChaptersBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },

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
  testScoreBar: { height: 4, borderRadius: 2, marginTop: 5, overflow: 'hidden' },
  testScoreBarFill: { height: 4, borderRadius: 2 },
  testIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  testTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

  /* ── Improvement card ── */
  trendPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  trendPillText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  improvementCard: {
    borderRadius: 22, borderWidth: 1, overflow: 'hidden',
  },
  barsSection: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4 },
  barsLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 10 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 80 },
  barCol: { flex: 1, alignItems: 'center', gap: 5 },
  barTrack: {
    flex: 1, width: '100%', borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: { borderRadius: 6, width: '100%' },
  barPct: { fontSize: 10, textAlign: 'center' },
  impStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, paddingVertical: 14, paddingHorizontal: 18,
  },
  impStat: { flex: 1, alignItems: 'center', gap: 3 },
  impStatVal: { fontSize: 18, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  impStatLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  impStatDivider: { width: 1, height: 32, marginHorizontal: 2 },
  streakBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  streakText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
});
