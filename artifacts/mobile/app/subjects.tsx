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
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const SUBJECT_THEMES: Array<{
  colors: [string, string];
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}> = [
  { colors: ['#6366F1', '#818CF8'], icon: 'calculator-outline' },
  { colors: ['#F59E0B', '#FBBF24'], icon: 'flask-outline' },
  { colors: ['#10B981', '#34D399'], icon: 'leaf-outline' },
  { colors: ['#EF4444', '#F87171'], icon: 'reader-outline' },
  { colors: ['#06B6D4', '#22D3EE'], icon: 'globe-outline' },
  { colors: ['#8B5CF6', '#A78BFA'], icon: 'planet-outline' },
  { colors: ['#F97316', '#FB923C'], icon: 'people-outline' },
  { colors: ['#14B8A6', '#2DD4BF'], icon: 'code-outline' },
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
  { key: 'chapters', label: 'Chapters', icon: 'layers-outline' as const, colors: ['#6366F1', '#8B5CF6'] as [string,string] },
  { key: 'test', label: 'Quick Test', icon: 'trophy-outline' as const, colors: ['#F59E0B', '#EF4444'] as [string,string] },
  { key: 'ai', label: 'AI Tutor', icon: 'chatbubbles-outline' as const, colors: ['#8B5CF6', '#EC4899'] as [string,string] },
  { key: 'explain', label: 'Explain', icon: 'bulb-outline' as const, colors: ['#10B981', '#06B6D4'] as [string,string] },
];

const MOTIVATIONAL = [
  'Every expert was once a beginner. Keep going! 🚀',
  'Small progress is still progress. ✨',
  'You are capable of amazing things. 💪',
  'Study hard today, shine bright tomorrow. 🌟',
  'Believe in yourself and your abilities. 🎯',
];

function getDailyMotivation() {
  const day = new Date().getDate();
  return MOTIVATIONAL[day % MOTIVATIONAL.length];
}

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

  const totalExplored = Object.values(subjectProgress ?? {}).reduce((s, p) => s + (p.explored ?? 0), 0);
  const totalTopics = Object.values(subjectProgress ?? {}).reduce((s, p) => s + (p.total ?? 0), 0);
  const overallPct = totalTopics > 0 ? Math.min(100, Math.round((totalExplored / totalTopics) * 100)) : 0;

  const mcqTests = testHistory.filter(t => t.mode === 'mcq' && t.percentage !== null);
  const avgScore = mcqTests.length > 0
    ? Math.round(mcqTests.reduce((s, t) => s + (t.percentage ?? 0), 0) / mcqTests.length)
    : null;

  const latestPct = mcqTests[0]?.percentage ?? null;
  const prevPct = mcqTests[1]?.percentage ?? null;
  const improvement = latestPct !== null && prevPct !== null ? latestPct - prevPct : null;
  const bestScore = mcqTests.length > 0 ? Math.max(...mcqTests.map(t => t.percentage ?? 0)) : null;

  let improvingStreak = 0;
  for (let i = 0; i < mcqTests.length - 1; i++) {
    if ((mcqTests[i].percentage ?? 0) >= (mcqTests[i + 1].percentage ?? 0)) improvingStreak++;
    else break;
  }

  const recentBars = mcqTests.slice(0, 6).reverse();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filteredSubjects = subjects.filter(s => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()));

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

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
          paddingBottom: tabBarHeight + (selectMode && selected.size > 0 ? 88 : 24),
        }}
      >

        {/* ── HERO HEADER ── */}
        <View style={[styles.hero, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroGreeting, { color: colors.mutedForeground }]}>{getGreeting()}</Text>
              <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {firstName} 👋
              </Text>
              <View style={styles.heroPillRow}>
                {boardName ? (
                  <View style={[styles.heroPill, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="school-outline" size={10} color="#4F46E5" />
                    <Text style={[styles.heroPillText, { color: '#4F46E5' }]}>{boardName}</Text>
                  </View>
                ) : null}
                {standardName ? (
                  <View style={[styles.heroPill, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="ribbon-outline" size={10} color="#4F46E5" />
                    <Text style={[styles.heroPillText, { color: '#4F46E5' }]}>{standardName}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.topRight}>
              <Pressable
                style={[styles.settingsBtn, { backgroundColor: '#F5F5F7' }]}
                onPress={() => { Haptics.selectionAsync(); router.push('/settings' as any); }}
              >
                <Ionicons name="settings-outline" size={18} color={colors.mutedForeground} />
              </Pressable>
              <View style={[styles.avatarCircle, { backgroundColor: '#4F46E5' }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
          </View>

          {/* Streak banner */}
          {improvingStreak >= 2 && (
            <View style={[styles.streakBadge, { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }]}>
              <Ionicons name="flame" size={15} color="#F59E0B" />
              <Text style={[styles.streakBadgeText, { color: '#92400E' }]}>{improvingStreak} test streak — keep going! 🔥</Text>
            </View>
          )}
        </View>

        {/* ── PROGRESS + STATS ROW ── */}
        <View style={styles.statsArea}>
          {/* Left: progress ring card */}
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <View style={[styles.progressRing, { backgroundColor: '#EEF2FF' }]}>
              <Text style={[styles.progressRingNum, { color: '#4F46E5' }]}>{overallPct}</Text>
              <Text style={[styles.progressRingPct, { color: '#4F46E5' }]}>%</Text>
            </View>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>Overall{'\n'}Progress</Text>
            <View style={[styles.progressBarWrap, { backgroundColor: '#E5E7EB' }]}>
              <View style={[styles.progressBarFill, { width: `${overallPct}%` as any, backgroundColor: '#4F46E5' }]} />
            </View>
            <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>{totalExplored}/{totalTopics || '–'} topics</Text>
          </View>

          {/* Right: 4 stat chips */}
          <View style={styles.statsCol}>
            {([
              { icon: 'trophy-outline', val: String(testHistory.length), label: 'Tests' },
              { icon: 'chatbubbles-outline', val: String(chatHistory.length), label: 'AI Chats' },
              { icon: 'book-outline', val: String(totalExplored), label: 'Topics' },
              { icon: 'analytics-outline', val: avgScore !== null ? `${avgScore}%` : '–', label: 'Avg Score' },
            ] as const).map((chip, i) => (
              <View key={i} style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statChipIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name={chip.icon as any} size={13} color="#4F46E5" />
                </View>
                <View style={styles.statChipText}>
                  <Text style={[styles.statChipVal, { color: colors.text }]}>{chip.val}</Text>
                  <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>{chip.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Jump In</Text>
            {lastStudied && (
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                Last: {lastStudied.subjectName}
              </Text>
            )}
          </View>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(a => (
              <Pressable
                key={a.key}
                style={styles.actionCard}
                onPress={() => handleQuickAction(a.key)}
              >
                <View style={[styles.actionGradient, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                  <View style={[styles.actionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name={a.icon} size={22} color="#4F46E5" />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── CONTINUE LEARNING ── */}
        {lastStudied && (() => {
          const theme = getTheme(lastStudied.subjectName, 0);
          return (
            <View style={[styles.section, styles.px]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Learning</Text>
              <Pressable
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
                style={{ marginTop: 12 }}
              >
                <View style={[styles.continueCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                  <View style={[styles.continueIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name={theme.icon} size={22} color="#4F46E5" />
                  </View>
                  <View style={styles.continueInfo}>
                    <Text style={[styles.continueSubject, { color: colors.text }]} numberOfLines={1}>{lastStudied.subjectName}</Text>
                    <Text style={[styles.continueTopic, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {lastStudied.topicName ?? lastStudied.chapterName ?? 'Open subject'}
                    </Text>
                  </View>
                  <View style={[styles.resumeBtn, { backgroundColor: '#EEF2FF', width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="play" size={16} color="#4F46E5" />
                  </View>
                </View>
              </Pressable>
            </View>
          );
        })()}

        {/* ── PERFORMANCE SNAPSHOT ── */}
        {mcqTests.length > 0 && (
          <View style={[styles.section, styles.px]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
              {improvement !== null && (
                <View style={[styles.trendPill, {
                  backgroundColor: improvement > 0 ? '#D1FAE5' : improvement < 0 ? '#FEE2E2' : '#EEF2FF',
                }]}>
                  <Ionicons
                    name={improvement > 0 ? 'trending-up' : improvement < 0 ? 'trending-down' : 'remove'}
                    size={13}
                    color={improvement > 0 ? '#10B981' : improvement < 0 ? '#EF4444' : '#6366F1'}
                  />
                  <Text style={[styles.trendText, {
                    color: improvement > 0 ? '#10B981' : improvement < 0 ? '#EF4444' : '#6366F1',
                  }]}>
                    {improvement > 0 ? '+' : ''}{improvement}% vs last
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {recentBars.length > 0 && (
                <View style={styles.barsSection}>
                  <Text style={[styles.barsHint, { color: colors.mutedForeground }]}>Last {recentBars.length} tests</Text>
                  <View style={styles.barsRow}>
                    {recentBars.map((t, i) => {
                      const pct = t.percentage ?? 0;
                      const isLatest = i === recentBars.length - 1;
                      const barColor = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
                      return (
                        <View key={i} style={styles.barCol}>
                          <View style={styles.barTrack}>
                            <View
                              style={[styles.barFill, { height: `${Math.max(8, pct)}%` as any, backgroundColor: isLatest ? barColor : barColor + '55' }]}
                            />
                          </View>
                          <Text style={[styles.barLabel, {
                            color: isLatest ? colors.text : colors.mutedForeground,
                            fontWeight: isLatest ? '700' : '400',
                          }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={[styles.perfStatsRow, { borderTopColor: colors.border }]}>
                {[
                  { label: 'Latest', val: latestPct !== null ? `${latestPct}%` : '–', color: '#6366F1' },
                  { label: 'Average', val: avgScore !== null ? `${avgScore}%` : '–', color: '#F59E0B' },
                  { label: 'Best 🏆', val: bestScore !== null ? `${bestScore}%` : '–', color: '#10B981' },
                  { label: 'Tests', val: String(mcqTests.length), color: '#8B5CF6' },
                ].map((s, i) => (
                  <View key={i} style={styles.perfStat}>
                    <Text style={[styles.perfStatVal, { color: s.color }]}>{s.val}</Text>
                    <Text style={[styles.perfStatLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── SUBJECTS GRID ── */}
        <View style={[styles.section, styles.px]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectMode && selected.size > 0 ? `${selected.size} selected` : 'Your Subjects'}
              </Text>
              {subjects.length > 0 && !selectMode && (
                <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primary }]}>{subjects.length}</Text>
                </View>
              )}
            </View>
            {subjects.length > 1 && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {selectMode && (
                  <Pressable
                    style={[styles.selBtn, { backgroundColor: selected.size === subjects.length ? colors.primaryLight : colors.secondary }]}
                    onPress={selectAllSubjects}
                  >
                    <Text style={[styles.selBtnText, { color: selected.size === subjects.length ? colors.primary : colors.mutedForeground }]}>All</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.selBtn, { backgroundColor: selectMode ? colors.primaryLight : colors.secondary }]}
                  onPress={toggleSelectMode}
                >
                  <Text style={[styles.selBtnText, { color: selectMode ? colors.primary : colors.mutedForeground }]}>
                    {selectMode ? 'Cancel' : 'Select'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Search */}
          {subjects.length > 0 && !selectMode && (
            <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search subjects…"
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={15} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          )}

          {subjectsQuery.isLoading && (
            <View style={styles.loadRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.loadText, { color: colors.mutedForeground }]}>Loading subjects…</Text>
            </View>
          )}

          {subjectsQuery.isError && !subjectsQuery.isLoading && (
            <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.errorIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="cloud-offline-outline" size={28} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn't load subjects</Text>
                <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>Check your connection and try again.</Text>
              </View>
              <Pressable
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={() => { Haptics.selectionAsync(); subjectsQuery.refetch(); }}
              >
                <Ionicons name="refresh" size={15} color="#FFF" />
              </Pressable>
            </View>
          )}

          {!subjectsQuery.isLoading && !subjectsQuery.isError && subjects.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="book-outline" size={26} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No subjects found. Try a different board or standard in Settings.
              </Text>
            </View>
          )}

          {subjects.length > 0 && search.trim() && filteredSubjects.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No subjects match "{search}"</Text>
            </View>
          )}

          {/* Subject grid cards */}
          {filteredSubjects.length > 0 && (
            <View style={styles.subjectsGrid}>
              {filteredSubjects.map((item, index) => {
                const theme = getTheme(item.name, index);
                const sid = getId(item);
                const prog = subjectProgress[sid];
                const explored = prog?.explored ?? 0;
                const total = prog?.total ?? 0;
                const pct = total > 0 ? Math.min(100, Math.round((explored / total) * 100)) : 0;
                const isSelected = selected.has(sid);
                return (
                  <Pressable
                    key={sid}
                    style={[styles.subjectCard, isSelected && { opacity: 0.85 }]}
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
                    <View style={[styles.subjectCardGradient, {
                      backgroundColor: isSelected ? '#EEF2FF' : colors.card,
                      borderWidth: 1,
                      borderColor: isSelected ? '#4F46E5' : colors.border,
                    }]}>
                      {/* Selection check */}
                      {selectMode && (
                        <View style={[styles.selectCheckmark, { backgroundColor: isSelected ? '#4F46E5' : '#F5F5F7' }]}>
                          {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                      )}

                      {/* Icon */}
                      <View style={[styles.subjectCardIcon, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons name={theme.icon} size={20} color="#4F46E5" />
                      </View>

                      {/* Name */}
                      <Text style={[styles.subjectCardName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>

                      {/* Progress */}
                      {!selectMode && (
                        <>
                          <View style={[styles.subjectCardBar, { backgroundColor: '#E5E7EB' }]}>
                            <View style={[styles.subjectCardBarFill, { width: `${Math.max(pct, 2)}%` as any, backgroundColor: '#4F46E5' }]} />
                          </View>
                          <Text style={[styles.subjectCardMeta, { color: colors.mutedForeground }]}>
                            {pct > 0 ? `${pct}% done` : 'Not started'}
                          </Text>
                        </>
                      )}
                      {selectMode && (
                        <Text style={[styles.subjectCardMeta, { color: isSelected ? '#4F46E5' : colors.mutedForeground }]}>
                          {isSelected ? 'Selected ✓' : 'Tap to select'}
                        </Text>
                      )}
                    </View>
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
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{testHistory.length} total</Text>
            </View>
            <View style={{ gap: 10 }}>
              {testHistory.slice(0, 5).map((t, i) => {
                const theme = getTheme(t.subjectName, i);
                const pct = t.percentage ?? null;
                const barColor = pct !== null ? (pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444') : theme.colors[0];
                const emoji = pct !== null ? (pct >= 90 ? '🏆' : pct >= 70 ? '✅' : pct >= 40 ? '📈' : '📚') : null;
                return (
                  <View key={i} style={[styles.testCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.testCardAccent, { backgroundColor: '#4F46E5' }]} />
                    <View style={[styles.testCardIcon, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name={theme.icon} size={18} color="#4F46E5" />
                    </View>
                    <View style={styles.testCardBody}>
                      <View style={styles.testCardTop}>
                        <Text style={[styles.testCardSubject, { color: colors.text }]} numberOfLines={1}>
                          {t.subjectName}
                        </Text>
                        {pct !== null ? (
                          <View style={[styles.scorePill, { backgroundColor: barColor + '18' }]}>
                            <Text style={[styles.scorePillText, { color: barColor }]}>{emoji} {pct}%</Text>
                          </View>
                        ) : (
                          <Text style={[styles.scoreRaw, { color: colors.mutedForeground }]}>{t.score}/{t.total}</Text>
                        )}
                      </View>
                      <Text style={[styles.testCardMeta, { color: colors.mutedForeground }]}>
                        {t.chapterName ? `${t.chapterName} · ` : ''}{t.mode.toUpperCase()} · {timeAgo(t.timestamp)}
                      </Text>
                      {pct !== null && (
                        <View style={[styles.testCardBar, { backgroundColor: barColor + '20' }]}>
                          <View style={[styles.testCardBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
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

      {/* ── MULTI-SELECT ACTION BAR ── */}
      {selectMode && selected.size > 0 && (
        <View style={[styles.multiBar, {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          bottom: tabBarHeight,
        }]}>
          <View style={styles.multiBarLeft}>
            <View style={[styles.countBubble, { backgroundColor: '#4F46E5' }]}>
              <Text style={styles.countBubbleText}>{selected.size}</Text>
            </View>
            <Text style={[styles.multiBarLabel, { color: colors.text }]}>
              {selected.size === 1 ? 'subject selected' : 'subjects selected'}
            </Text>
          </View>
          <Pressable onPress={handleViewChapters}>
            <View style={[styles.viewChaptersBtn, { backgroundColor: '#4F46E5' }]}>
              <Text style={styles.viewChaptersBtnText}>View Chapters</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </View>
          </Pressable>
        </View>
      )}

      <BottomTabBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  px: { paddingHorizontal: 16 },

  /* ── Hero ── */
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    marginBottom: 0,
  },
  blobTopRight: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  blobBottomLeft: {
    position: 'absolute', bottom: -30, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3, marginBottom: 2 },
  heroName: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 2, letterSpacing: -0.5 },
  heroWave: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  heroPillRow: { flexDirection: 'row', gap: 6 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroPillText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  quoteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12,
  },
  quoteText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 17 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(252,211,77,0.15)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9,
  },
  streakBadgeText: { fontSize: 13, fontWeight: '700', color: '#FCD34D' },

  /* ── Stats area ── */
  statsArea: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4,
  },
  progressCard: {
    width: 136, borderRadius: 22, padding: 14, marginRight: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  progressRing: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 70, height: 70, borderRadius: 35,
    alignSelf: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  progressRingNum: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  progressRingPct: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 3 },
  progressLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', marginBottom: 10, lineHeight: 15,
  },
  progressBarWrap: {
    height: 5, borderRadius: 3, width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginBottom: 6,
  },
  progressBarFill: { height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  progressSub: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  statsCol: { flex: 1 },
  statChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 9,
    height: 46, marginBottom: 7,
  },
  statChipIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  statChipText: { flex: 1 },
  statChipVal: { fontSize: 15, fontWeight: '800', lineHeight: 18 },
  statChipLabel: { fontSize: 10, fontWeight: '500', lineHeight: 13 },

  /* ── Section ── */
  section: { paddingTop: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12 },
  countBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  countBadgeText: { fontSize: 12, fontWeight: '700' },

  /* ── Quick actions grid ── */
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16,
  },
  actionCard: { width: (SCREEN_WIDTH - 48) / 2, borderRadius: 20, overflow: 'hidden' },
  actionGradient: { padding: 18, borderRadius: 20, gap: 4 },
  actionIconWrap: {
    width: 48, height: 48, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  /* ── Continue learning ── */
  continueCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, padding: 18, gap: 14,
  },
  continueIconWrap: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  continueInfo: { flex: 1 },
  continueSubject: { fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  continueTopic: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  resumeBtn: { padding: 4 },

  /* ── Performance ── */
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  trendText: { fontSize: 12, fontWeight: '600' },
  perfCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  barsSection: { padding: 16, paddingBottom: 12 },
  barsHint: { fontSize: 11, marginBottom: 10 },
  barsRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 80 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10 },
  perfStatsRow: {
    flexDirection: 'row', borderTopWidth: 1,
    paddingVertical: 14,
  },
  perfStat: { flex: 1, alignItems: 'center' },
  perfStatVal: { fontSize: 18, fontWeight: '800' },
  perfStatLabel: { fontSize: 10, marginTop: 3 },

  /* ── Subject grid ── */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  loadRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 16, justifyContent: 'center' },
  loadText: { fontSize: 14 },
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 18, borderWidth: 1,
  },
  errorIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 14, fontWeight: '600' },
  errorSub: { fontSize: 12, marginTop: 2 },
  retryBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18, borderRadius: 18, borderWidth: 1,
  },
  emptyText: { flex: 1, fontSize: 13, lineHeight: 19 },

  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectCard: {
    width: CARD_WIDTH, borderRadius: 16, overflow: 'hidden',
  },
  subjectCardGradient: {
    padding: 12, minHeight: 108,
    borderRadius: 16, justifyContent: 'flex-end',
  },
  selectCheckmark: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  subjectCardIcon: {
    position: 'absolute', top: 10, left: 10,
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  subjectCardName: {
    fontSize: 13, fontWeight: '700', color: '#FFF',
    marginBottom: 6, lineHeight: 17,
  },
  subjectCardBar: {
    height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden', marginBottom: 4,
  },
  subjectCardBarFill: { height: 3, borderRadius: 2, backgroundColor: '#FFF' },
  subjectCardMeta: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  selBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  selBtnText: { fontSize: 12, fontWeight: '600' },

  /* ── Recent tests ── */
  testCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 1, overflow: 'hidden', gap: 12,
    paddingRight: 14,
  },
  testCardAccent: { width: 4, alignSelf: 'stretch' },
  testCardIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginLeft: 2, marginVertical: 12,
  },
  testCardBody: { flex: 1, paddingVertical: 12 },
  testCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  testCardSubject: { flex: 1, fontSize: 14, fontWeight: '600' },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  scorePillText: { fontSize: 12, fontWeight: '700' },
  scoreRaw: { fontSize: 13, fontWeight: '600' },
  testCardMeta: { fontSize: 11, marginBottom: 6 },
  testCardBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  testCardBarFill: { height: 4, borderRadius: 2 },

  /* ── Multi-select bar ── */
  multiBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1,
  },
  multiBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBubble: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countBubbleText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  multiBarLabel: { fontSize: 14, fontWeight: '600' },
  viewChaptersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14,
  },
  viewChaptersBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
