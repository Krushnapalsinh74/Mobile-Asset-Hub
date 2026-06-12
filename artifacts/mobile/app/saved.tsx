import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

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
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SavedScreen() {
  const { savedQuestions, unsaveQuestion } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

  function toggleExpand(id: string) {
    Haptics.selectionAsync();
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleUnsave(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove question?',
      'This question will be removed from your saved list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => unsaveQuestion(id),
        },
      ],
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4338CA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Saved Questions</Text>
            <Text style={styles.headerSub}>
              {savedQuestions.length === 0
                ? 'Nothing saved yet'
                : `${savedQuestions.length} question${savedQuestions.length !== 1 ? 's' : ''} bookmarked`}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="bookmark" size={22} color="#FFF" />
          </View>
        </View>

        {savedQuestions.length > 0 && (
          <View style={styles.statsStrip}>
            {[
              { label: 'Saved',    val: String(savedQuestions.length),         icon: 'bookmark-outline'  as const },
              { label: 'Subjects', val: String(new Set(savedQuestions.map(q => q.subjectName)).size), icon: 'library-outline'  as const },
              { label: 'Latest',   val: timeAgo(savedQuestions[0]?.savedAt ?? Date.now()), icon: 'time-outline' as const },
            ].map((s, i) => (
              <View key={i} style={[styles.statItem, i > 0 && styles.statBorder]}>
                <Ionicons name={s.icon} size={12} color="rgba(255,255,255,0.75)" />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
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
        {savedQuestions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={styles.emptyIconWrap}>
              <Ionicons name="bookmark-outline" size={32} color="#4F46E5" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved questions</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              While reviewing test results, tap the bookmark icon next to any question to save it here.
            </Text>
            <Pressable onPress={() => router.replace('/subjects' as any)} style={styles.emptyBtn}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.emptyBtnGrad}>
                <Text style={styles.emptyBtnText}>Take a Test</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFF" />
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          savedQuestions.map((q) => {
            const isOpen = expanded.has(q.id);
            return (
              <View
                key={q.id}
                style={[styles.qCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                {/* top accent */}
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.qAccentBar} />

                <View style={styles.qBody}>
                  {/* header row */}
                  <View style={styles.qHeaderRow}>
                    <View style={styles.qMeta}>
                      <View style={[styles.subjectPill, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons name="book-outline" size={10} color="#4F46E5" />
                        <Text style={styles.subjectPillText} numberOfLines={1}>{q.subjectName}</Text>
                      </View>
                      {q.chapterName && (
                        <Text style={[styles.chapterText, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {q.chapterName.split('|||')[0]}
                        </Text>
                      )}
                    </View>
                    <View style={styles.qActions}>
                      <Text style={[styles.savedTime, { color: colors.mutedForeground }]}>
                        {timeAgo(q.savedAt)}
                      </Text>
                      <Pressable
                        onPress={() => handleUnsave(q.id)}
                        hitSlop={8}
                        style={[styles.unsaveBtn, { backgroundColor: '#FEE2E2' }]}
                      >
                        <Ionicons name="trash-outline" size={13} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>

                  {/* question text + expand toggle */}
                  <Pressable onPress={() => toggleExpand(q.id)} style={styles.questionRow}>
                    <View style={[styles.qNumBadge, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="help-circle" size={14} color="#4F46E5" />
                    </View>
                    <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={isOpen ? undefined : 3}>
                      {q.question}
                    </Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.mutedForeground}
                    />
                  </Pressable>

                  {/* expanded: options + solution */}
                  {isOpen && (
                    <View style={styles.expandedBody}>
                      {/* options */}
                      {q.options && q.options.length > 0 && (
                        <View style={styles.optionsWrap}>
                          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Options</Text>
                          {q.options.map((opt, oi) => {
                            const isCorrect = oi === q.correctOptionIndex;
                            return (
                              <View key={oi} style={[styles.optionRow, {
                                backgroundColor: isCorrect ? '#D1FAE5' : colors.muted,
                                borderColor: isCorrect ? '#059669' : colors.border,
                              }]}>
                                <View style={[styles.optLabel, {
                                  backgroundColor: isCorrect ? '#059669' : colors.border,
                                }]}>
                                  <Text style={[styles.optLabelText, { color: isCorrect ? '#FFF' : colors.mutedForeground }]}>
                                    {OPTION_LABELS[oi]}
                                  </Text>
                                </View>
                                <Text style={[styles.optText, { color: isCorrect ? '#065F46' : colors.text, flex: 1 }]}>
                                  {opt}
                                </Text>
                                {isCorrect && (
                                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* solution / explanation */}
                      {(q.solution || q.explanation || q.tip || q.answer) && (
                        <View style={[styles.solutionBox, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                          <View style={styles.solutionHeader}>
                            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.solutionIcon}>
                              <Ionicons name="bulb" size={12} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.solutionTitle}>Explanation</Text>
                          </View>
                          {q.explanation && (
                            <Text style={styles.solutionText}>{q.explanation}</Text>
                          )}
                          {q.solution && !q.explanation && (
                            <Text style={styles.solutionText}>{q.solution}</Text>
                          )}
                          {!q.explanation && !q.solution && q.answer && (
                            <Text style={styles.solutionText}>{q.answer}</Text>
                          )}
                          {q.tip && (
                            <View style={[styles.tipBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                              <Text style={styles.tipText}>💡 {q.tip}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomTabBar activeTab="saved" />
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
    width: 100, height: 100, borderRadius: 50,
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

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.16)' },
  statVal: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)' },

  emptyCard: {
    borderRadius: 24, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 12, marginTop: 20,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  emptyBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  qCard: {
    borderRadius: 20, borderWidth: 1, flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  qAccentBar: { width: 5, alignSelf: 'stretch' },
  qBody: { flex: 1, padding: 14, gap: 10 },

  qHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  qMeta: { flex: 1, gap: 4 },
  subjectPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  subjectPillText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  chapterText: { fontSize: 11 },
  qActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedTime: { fontSize: 10 },
  unsaveBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  questionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  qNumBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 21 },

  expandedBody: { gap: 12 },

  optionsWrap: { gap: 7 },
  sectionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  optLabel: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  optLabelText: { fontSize: 11, fontWeight: '800' },
  optText: { fontSize: 13, lineHeight: 19 },

  solutionBox: {
    borderRadius: 16, borderWidth: 1, padding: 14, gap: 10,
  },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  solutionIcon: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  solutionTitle: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  solutionText: { fontSize: 13, color: '#1E1B4B', lineHeight: 20 },
  tipBox: {
    borderRadius: 10, borderWidth: 1, padding: 10,
  },
  tipText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});
