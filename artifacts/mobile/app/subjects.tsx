import { useApp } from '@/context/AppContext';
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

const SUBJECT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  math: 'calculator-outline',
  physics: 'planet-outline',
  chem: 'flask-outline',
  bio: 'leaf-outline',
  life: 'leaf-outline',
  english: 'reader-outline',
  lang: 'reader-outline',
  geo: 'globe-outline',
  social: 'globe-outline',
  evs: 'globe-outline',
  history: 'people-outline',
  civics: 'people-outline',
  computer: 'code-outline',
  it: 'code-outline',
  tech: 'code-outline',
};

const FALLBACK_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'book-outline',
  'document-text-outline',
  'library-outline',
  'school-outline',
  'clipboard-outline',
  'layers-outline',
  'bulb-outline',
  'telescope-outline',
];

function getSubjectIcon(name: string, index: number): keyof typeof Ionicons.glyphMap {
  const l = name.toLowerCase();
  for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
    if (l.includes(key)) return icon;
  }
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length]!;
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
  { key: 'chapters', label: 'Chapters', sub: 'Browse topics', icon: 'layers-outline' as const },
  { key: 'test', label: 'Quick Test', sub: 'Start a quiz', icon: 'trophy-outline' as const },
  { key: 'ai', label: 'AI Tutor', sub: 'Ask anything', icon: 'chatbubbles-outline' as const },
  { key: 'explain', label: 'Explain', sub: 'Get concepts', icon: 'bulb-outline' as const },
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
        <View style={[styles.hero, { paddingTop: topPad + 20 }]}>
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{getGreeting()}</Text>
              <Text style={styles.heroName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {firstName}
              </Text>
              <View style={styles.heroPillRow}>
                {boardName ? (
                  <View style={styles.heroPill}>
                    <Text style={styles.heroPillText}>{boardName}</Text>
                  </View>
                ) : null}
                {standardName ? (
                  <View style={styles.heroPill}>
                    <Text style={styles.heroPillText}>{standardName}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.topRight}>
              <Pressable
                style={styles.settingsBtn}
                onPress={() => { Haptics.selectionAsync(); router.push('/settings' as any); }}
              >
                <Ionicons name="settings-outline" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
          </View>

          {improvingStreak >= 2 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.streakBadgeText}>{improvingStreak} test streak</Text>
            </View>
          )}
        </View>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          {[
            { icon: 'trophy-outline' as const, val: String(testHistory.length), label: 'Tests' },
            { icon: 'book-outline' as const, val: String(totalExplored), label: 'Topics' },
            { icon: 'chatbubbles-outline' as const, val: String(chatHistory.length), label: 'Chats' },
            { icon: 'analytics-outline' as const, val: avgScore !== null ? `${avgScore}%` : '–', label: 'Avg Score' },
          ].map((chip, i) => (
            <View key={i} style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={chip.icon} size={16} color={colors.accent} />
              <Text style={[styles.statChipVal, { color: colors.text }]}>{chip.val}</Text>
              <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>{chip.label}</Text>
            </View>
          ))}
        </View>

        {/* ── PROGRESS BAR ── */}
        {totalTopics > 0 && (
          <View style={[styles.progressSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.text }]}>Overall Progress</Text>
              <Text style={[styles.progressPct, { color: colors.accent }]}>{overallPct}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, { width: `${overallPct}%` as any, backgroundColor: colors.accent }]} />
            </View>
            <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
              {totalExplored} of {totalTopics} topics explored
            </Text>
          </View>
        )}

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Jump In</Text>
            {lastStudied && (
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                {lastStudied.subjectName}
              </Text>
            )}
          </View>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(a => (
              <Pressable
                key={a.key}
                style={[styles.actionCard, { backgroundColor: colors.primary }]}
                onPress={() => handleQuickAction(a.key)}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name={a.icon} size={22} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
                <Text style={styles.actionSub}>{a.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── CONTINUE LEARNING ── */}
        {lastStudied && (
          <View style={[styles.section, styles.px]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue</Text>
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
              <View style={[styles.continueCard, { backgroundColor: colors.primary }]}>
                <View style={styles.continueIconWrap}>
                  <Ionicons name="play-circle-outline" size={28} color="rgba(255,255,255,0.9)" />
                </View>
                <View style={styles.continueInfo}>
                  <Text style={styles.continueSubject} numberOfLines={1}>{lastStudied.subjectName}</Text>
                  <Text style={styles.continueTopic} numberOfLines={1}>
                    {lastStudied.topicName ?? lastStudied.chapterName ?? 'Open subject'}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
              </View>
            </Pressable>
          </View>
        )}

        {/* ── PERFORMANCE ── */}
        {mcqTests.length > 0 && (
          <View style={[styles.section, styles.px]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
              {improvement !== null && (
                <View style={[styles.trendPill, {
                  backgroundColor: improvement > 0 ? '#F0FDF4' : improvement < 0 ? '#FEF2F2' : colors.muted,
                }]}>
                  <Ionicons
                    name={improvement > 0 ? 'trending-up' : improvement < 0 ? 'trending-down' : 'remove'}
                    size={13}
                    color={improvement > 0 ? '#10B981' : improvement < 0 ? '#EF4444' : colors.mutedForeground}
                  />
                  <Text style={[styles.trendText, {
                    color: improvement > 0 ? '#10B981' : improvement < 0 ? '#EF4444' : colors.mutedForeground,
                  }]}>
                    {improvement > 0 ? '+' : ''}{improvement}%
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
                      return (
                        <View key={i} style={styles.barCol}>
                          <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                            <View
                              style={[styles.barFill, {
                                height: `${Math.max(8, pct)}%` as any,
                                backgroundColor: isLatest ? colors.accent : colors.accent + '55',
                              }]}
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
                  { label: 'Latest', val: latestPct !== null ? `${latestPct}%` : '–' },
                  { label: 'Average', val: avgScore !== null ? `${avgScore}%` : '–' },
                  { label: 'Best', val: bestScore !== null ? `${bestScore}%` : '–' },
                  { label: 'Tests', val: String(mcqTests.length) },
                ].map((s, i) => (
                  <View key={i} style={styles.perfStat}>
                    <Text style={[styles.perfStatVal, { color: colors.text }]}>{s.val}</Text>
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
                {selectMode && selected.size > 0 ? `${selected.size} selected` : 'Subjects'}
              </Text>
              {subjects.length > 0 && !selectMode && (
                <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.countBadgeText, { color: colors.mutedForeground }]}>{subjects.length}</Text>
                </View>
              )}
            </View>
            {subjects.length > 1 && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {selectMode && (
                  <Pressable
                    style={[styles.selBtn, { backgroundColor: selected.size === subjects.length ? colors.accentLight : colors.muted }]}
                    onPress={selectAllSubjects}
                  >
                    <Text style={[styles.selBtnText, { color: selected.size === subjects.length ? colors.accent : colors.mutedForeground }]}>All</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.selBtn, { backgroundColor: selectMode ? colors.accentLight : colors.muted }]}
                  onPress={toggleSelectMode}
                >
                  <Text style={[styles.selBtnText, { color: selectMode ? colors.accent : colors.mutedForeground }]}>
                    {selectMode ? 'Cancel' : 'Select'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {subjects.length > 0 && !selectMode && (
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.loadText, { color: colors.mutedForeground }]}>Loading subjects…</Text>
            </View>
          )}

          {subjectsQuery.isError && !subjectsQuery.isLoading && (
            <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="cloud-offline-outline" size={24} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stateTitle, { color: colors.text }]}>Couldn't load subjects</Text>
                <Text style={[styles.stateSub, { color: colors.mutedForeground }]}>Check your connection and try again.</Text>
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
            <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="book-outline" size={22} color={colors.mutedForeground} />
              <Text style={[styles.stateSub, { flex: 1, color: colors.mutedForeground }]}>
                No subjects found. Try a different board or standard in Settings.
              </Text>
            </View>
          )}

          {subjects.length > 0 && search.trim() && filteredSubjects.length === 0 && (
            <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={22} color={colors.mutedForeground} />
              <Text style={[styles.stateSub, { flex: 1, color: colors.mutedForeground }]}>No subjects match "{search}"</Text>
            </View>
          )}

          {filteredSubjects.length > 0 && (
            <View style={styles.subjectsGrid}>
              {filteredSubjects.map((item, index) => {
                const icon = getSubjectIcon(item.name, index);
                const sid = getId(item);
                const prog = subjectProgress[sid];
                const explored = prog?.explored ?? 0;
                const total = prog?.total ?? 0;
                const pct = total > 0 ? Math.min(100, Math.round((explored / total) * 100)) : 0;
                const isSelected = selected.has(sid);
                return (
                  <Pressable
                    key={sid}
                    style={[
                      styles.subjectCard,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
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
                    {selectMode && (
                      <View style={[styles.selectCheckmark, {
                        backgroundColor: isSelected ? colors.accent : colors.muted,
                      }]}>
                        {isSelected && <Ionicons name="checkmark" size={11} color="#FFF" />}
                      </View>
                    )}

                    <View style={[styles.subjectCardIcon, {
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : colors.muted,
                    }]}>
                      <Ionicons name={icon} size={18} color={isSelected ? '#FFF' : colors.text} />
                    </View>

                    <Text style={[styles.subjectCardName, {
                      color: isSelected ? '#FFF' : colors.text,
                    }]} numberOfLines={2}>{item.name}</Text>

                    {!selectMode && (
                      <>
                        <View style={[styles.subjectCardBar, {
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.muted,
                        }]}>
                          <View style={[styles.subjectCardBarFill, {
                            width: `${Math.max(pct, 2)}%` as any,
                            backgroundColor: isSelected ? '#FFF' : colors.accent,
                          }]} />
                        </View>
                        <Text style={[styles.subjectCardMeta, {
                          color: isSelected ? 'rgba(255,255,255,0.7)' : colors.mutedForeground,
                        }]}>
                          {pct > 0 ? `${pct}%` : 'Not started'}
                        </Text>
                      </>
                    )}
                    {selectMode && (
                      <Text style={[styles.subjectCardMeta, { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.mutedForeground }]}>
                        {isSelected ? 'Selected' : 'Tap to select'}
                      </Text>
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
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{testHistory.length} total</Text>
            </View>
            <View style={{ gap: 8 }}>
              {testHistory.slice(0, 5).map((t, i) => {
                const pct = t.percentage ?? null;
                const scoreColor = pct !== null ? (pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444') : colors.mutedForeground;
                return (
                  <View key={i} style={[styles.testCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.testCardAccent, { backgroundColor: colors.primary }]} />
                    <View style={styles.testCardBody}>
                      <View style={styles.testCardTop}>
                        <Text style={[styles.testCardSubject, { color: colors.text }]} numberOfLines={1}>
                          {t.subjectName}
                        </Text>
                        {pct !== null ? (
                          <View style={[styles.scorePill, { backgroundColor: colors.muted }]}>
                            <Text style={[styles.scorePillText, { color: scoreColor }]}>{pct}%</Text>
                          </View>
                        ) : (
                          <Text style={[styles.scoreRaw, { color: colors.mutedForeground }]}>{t.score}/{t.total}</Text>
                        )}
                      </View>
                      <Text style={[styles.testCardMeta, { color: colors.mutedForeground }]}>
                        {t.chapterName ? `${t.chapterName} · ` : ''}{t.mode.toUpperCase()} · {timeAgo(t.timestamp)}
                      </Text>
                      {pct !== null && (
                        <View style={[styles.testCardBar, { backgroundColor: colors.muted }]}>
                          <View style={[styles.testCardBarFill, { width: `${pct}%` as any, backgroundColor: scoreColor }]} />
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
            <View style={[styles.countBubble, { backgroundColor: colors.primary }]}>
              <Text style={styles.countBubbleText}>{selected.size}</Text>
            </View>
            <Text style={[styles.multiBarLabel, { color: colors.text }]}>
              {selected.size === 1 ? 'subject selected' : 'subjects selected'}
            </Text>
          </View>
          <Pressable
            style={[styles.viewChaptersBtn, { backgroundColor: colors.primary }]}
            onPress={handleViewChapters}
          >
            <Text style={styles.viewChaptersBtnText}>View Chapters</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
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
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 0,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  heroGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4, fontWeight: '500' },
  heroName: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 10, letterSpacing: -0.5 },
  heroPillRow: { flexDirection: 'row', gap: 6 },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroPillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  streakBadgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  /* ── Stats row ── */
  statsRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  statChip: {
    flex: 1, alignItems: 'center', borderRadius: 14, borderWidth: 1,
    paddingVertical: 10, gap: 2,
  },
  statChipVal: { fontSize: 15, fontWeight: '800' },
  statChipLabel: { fontSize: 9, fontWeight: '500' },

  /* ── Progress ── */
  progressSection: {
    marginHorizontal: 16, marginTop: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '600' },
  progressPct: { fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  progressSub: { fontSize: 11 },

  /* ── Section ── */
  section: { paddingTop: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  countBadgeText: { fontSize: 11, fontWeight: '700' },

  /* ── Quick actions ── */
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  actionCard: {
    width: (SCREEN_WIDTH - 48) / 2, borderRadius: 18,
    padding: 16, gap: 3,
  },
  actionIconWrap: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  actionSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  /* ── Continue ── */
  continueCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, padding: 16, gap: 14, marginTop: 12,
  },
  continueIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  continueInfo: { flex: 1 },
  continueSubject: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 3 },
  continueTopic: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },

  /* ── Performance ── */
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  trendText: { fontSize: 12, fontWeight: '600' },
  perfCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  barsSection: { padding: 14, paddingBottom: 10 },
  barsHint: { fontSize: 11, marginBottom: 10 },
  barsRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 72 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 5 },
  barLabel: { fontSize: 10 },
  perfStatsRow: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 14 },
  perfStat: { flex: 1, alignItems: 'center' },
  perfStatVal: { fontSize: 17, fontWeight: '800' },
  perfStatLabel: { fontSize: 10, marginTop: 3 },

  /* ── Subjects grid ── */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  loadRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 16, justifyContent: 'center' },
  loadText: { fontSize: 14 },
  stateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1,
  },
  stateTitle: { fontSize: 14, fontWeight: '600' },
  stateSub: { fontSize: 12, marginTop: 2, lineHeight: 18 },
  retryBtn: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectCard: {
    width: CARD_WIDTH, borderRadius: 16, borderWidth: 1,
    padding: 12, minHeight: 108,
  },
  selectCheckmark: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  subjectCardIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  subjectCardName: {
    fontSize: 13, fontWeight: '700',
    marginBottom: 'auto' as any, lineHeight: 17, flex: 1,
  },
  subjectCardBar: {
    height: 3, borderRadius: 2,
    overflow: 'hidden', marginBottom: 4, marginTop: 8,
  },
  subjectCardBarFill: { height: 3, borderRadius: 2 },
  subjectCardMeta: { fontSize: 10, fontWeight: '500' },
  selBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  selBtnText: { fontSize: 12, fontWeight: '600' },

  /* ── Recent tests ── */
  testCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    paddingRight: 14,
  },
  testCardAccent: { width: 3, alignSelf: 'stretch' },
  testCardBody: { flex: 1, paddingVertical: 12, paddingLeft: 12 },
  testCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  testCardSubject: { flex: 1, fontSize: 14, fontWeight: '600' },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  scorePillText: { fontSize: 12, fontWeight: '700' },
  scoreRaw: { fontSize: 13, fontWeight: '600' },
  testCardMeta: { fontSize: 11, marginBottom: 6 },
  testCardBar: { height: 3, borderRadius: 2, overflow: 'hidden' },
  testCardBarFill: { height: 3, borderRadius: 2 },

  /* ── Multi-select bar ── */
  multiBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1,
  },
  multiBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBubble: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  countBubbleText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  multiBarLabel: { fontSize: 14, fontWeight: '600' },
  viewChaptersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  viewChaptersBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
