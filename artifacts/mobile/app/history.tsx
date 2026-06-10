import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getGrade(pct: number) {
  if (pct >= 90) return { grade: 'A+', color: '#065F46', bg: '#D1FAE5' };
  if (pct >= 80) return { grade: 'A',  color: '#059669', bg: '#ECFDF5' };
  if (pct >= 70) return { grade: 'B+', color: '#2563EB', bg: '#EFF6FF' };
  if (pct >= 60) return { grade: 'B',  color: '#3B82F6', bg: '#EFF6FF' };
  if (pct >= 50) return { grade: 'C',  color: '#D97706', bg: '#FEF3C7' };
  if (pct >= 40) return { grade: 'D',  color: '#EA580C', bg: '#FFF7ED' };
  return             { grade: 'F',  color: '#DC2626', bg: '#FEE2E2' };
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const MODE_META: Record<string, { label: string; colors: [string, string]; icon: string }> = {
  mcq:         { label: 'MCQ',        colors: ['#4F46E5', '#7C3AED'], icon: 'help-circle-outline' },
  'true-false':{ label: 'True/False', colors: ['#059669', '#10B981'], icon: 'git-compare-outline' },
  fill:        { label: 'Fill-in',    colors: ['#D97706', '#F59E0B'], icon: 'create-outline' },
};

export default function HistoryScreen() {
  const { testHistory } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

  const mcqTests = testHistory.filter(t => t.percentage !== null);
  const avg = mcqTests.length > 0
    ? Math.round(mcqTests.reduce((s, t) => s + (t.percentage ?? 0), 0) / mcqTests.length)
    : null;
  const best = mcqTests.length > 0 ? Math.max(...mcqTests.map(t => t.percentage ?? 0)) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#1E1B4B', '#3730A3', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Test History</Text>
            <Text style={styles.headerSub}>
              {testHistory.length === 0
                ? 'No tests yet'
                : `${testHistory.length} test${testHistory.length !== 1 ? 's' : ''} completed`}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="time" size={22} color="#FFF" />
          </View>
        </View>

        {testHistory.length > 0 && (
          <View style={styles.summaryStrip}>
            {[
              { label: 'Total Tests', val: String(testHistory.length), icon: 'list-outline' as const },
              { label: 'Avg Score',   val: avg  !== null ? `${avg}%`  : '–', icon: 'analytics-outline' as const },
              { label: 'Best Score',  val: best !== null ? `${best}%` : '–', icon: 'trophy-outline'    as const },
            ].map((s, i) => (
              <View key={i} style={[styles.summaryItem, i > 0 && styles.summaryBorder]}>
                <Ionicons name={s.icon} size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.summaryVal}>{s.val}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* ── LIST ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: tabBarHeight + 24,
          gap: 12,
        }}
      >
        {testHistory.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={styles.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={32} color="#4F46E5" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No tests yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Complete a test to see your full history here
            </Text>
            <Pressable onPress={() => router.replace('/subjects' as any)} style={styles.emptyBtn}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.emptyBtnGrad}>
                <Text style={styles.emptyBtnText}>Start a Test</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          testHistory.map((t) => {
            const pct       = t.percentage ?? null;
            const grade     = pct !== null ? getGrade(pct) : null;
            const modeMeta  = MODE_META[t.mode] ?? MODE_META.mcq;
            const isPassing = pct !== null && pct >= 40;
            const isOpen    = expanded.has(t.timestamp);
            const barColor  = pct !== null ? (pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444') : '#9CA3AF';

            return (
              <Pressable
                key={t.timestamp}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setExpanded(prev => {
                    const next = new Set(prev);
                    if (next.has(t.timestamp)) next.delete(t.timestamp); else next.add(t.timestamp);
                    return next;
                  });
                }}
              >
                {/* left accent bar */}
                <LinearGradient colors={modeMeta.colors} style={styles.accentBar} />

                <View style={styles.cardBody}>
                  {/* top row */}
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardSubject, { color: colors.text }]} numberOfLines={1}>
                        {t.subjectName}
                      </Text>
                      {t.chapterName && (
                        <Text style={[styles.cardChapter, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {t.chapterName.split('|||')[0]}
                        </Text>
                      )}
                    </View>
                    <View style={styles.cardTopRight}>
                      {grade && (
                        <View style={[styles.gradeBadge, { backgroundColor: grade.bg }]}>
                          <Text style={[styles.gradeText, { color: grade.color }]}>{grade.grade}</Text>
                        </View>
                      )}
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.mutedForeground}
                      />
                    </View>
                  </View>

                  {/* chips row */}
                  <View style={styles.chipsRow}>
                    <View style={styles.chipsLeft}>
                      <View style={[styles.modePill, { backgroundColor: modeMeta.colors[0] + '18' }]}>
                        <Ionicons name={modeMeta.icon as any} size={10} color={modeMeta.colors[0]} />
                        <Text style={[styles.modePillText, { color: modeMeta.colors[0] }]}>{modeMeta.label}</Text>
                      </View>
                      <View style={[styles.scorePill, { backgroundColor: barColor + '18' }]}>
                        <Text style={[styles.scorePillText, { color: barColor }]}>
                          {t.score}/{t.total}{pct !== null ? `  ·  ${pct}%` : ''}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                      {timeAgo(t.timestamp)}
                    </Text>
                  </View>

                  {/* progress bar */}
                  {pct !== null && (
                    <View style={[styles.progressTrack, { backgroundColor: barColor + '22' }]}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                    </View>
                  )}

                  {/* expanded details */}
                  {isOpen && (
                    <View style={[styles.expandPanel, { borderTopColor: colors.border }]}>
                      <View style={styles.detailGrid}>
                        {[
                          {
                            label: 'Score',
                            val: `${t.score} / ${t.total}`,
                            icon: 'checkmark-circle-outline' as const,
                            color: '#059669',
                          },
                          {
                            label: 'Percentage',
                            val: pct !== null ? `${pct}%` : '—',
                            icon: 'analytics-outline' as const,
                            color: '#4F46E5',
                          },
                          {
                            label: 'Result',
                            val: isPassing ? 'PASSED ✓' : pct !== null ? 'FAILED ✗' : '—',
                            icon: (isPassing ? 'trophy-outline' : 'close-circle-outline') as any,
                            color: isPassing ? '#059669' : '#DC2626',
                          },
                          {
                            label: 'Date & Time',
                            val: formatDate(t.timestamp),
                            icon: 'calendar-outline' as const,
                            color: '#D97706',
                          },
                        ].map((d, di) => (
                          <View key={di} style={[styles.detailItem, { backgroundColor: d.color + '0D', borderColor: d.color + '22' }]}>
                            <View style={[styles.detailIcon, { backgroundColor: d.color + '1A' }]}>
                              <Ionicons name={d.icon} size={13} color={d.color} />
                            </View>
                            <Text style={[styles.detailVal, { color: d.color }]} numberOfLines={2}>{d.val}</Text>
                            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{d.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <BottomTabBar activeTab="history" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    gap: 18,
  },
  headerDecor1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  headerDecor2: {
    position: 'absolute', bottom: -30, left: -20,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  summaryItem: {
    flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3,
  },
  summaryBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.16)' },
  summaryVal: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)' },

  emptyCard: {
    borderRadius: 24, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 12, marginTop: 20,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  emptyBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  card: {
    borderRadius: 20, borderWidth: 1, flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  accentBar: { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, gap: 8 },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardSubject: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardChapter: { fontSize: 12 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  gradeBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  gradeText: { fontSize: 12, fontWeight: '800' },

  chipsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  modePillText: { fontSize: 11, fontWeight: '700' },
  scorePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  scorePillText: { fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 11, marginLeft: 8 },

  progressTrack: {
    height: 5, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: 5, borderRadius: 3 },

  expandPanel: {
    marginTop: 4, paddingTop: 14, borderTopWidth: 1,
  },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: {
    flex: 1, minWidth: '45%', borderRadius: 14, borderWidth: 1,
    padding: 12, gap: 4,
  },
  detailIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  detailVal: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  detailLabel: { fontSize: 10 },
});
