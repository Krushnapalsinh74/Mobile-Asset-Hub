import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { useApp } from '@/context/AppContext';
import type { SavedQuestion } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import type { Question } from '@/services/api';
import { saveQuestions } from '@/store/questionStore';
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

function savedToQuestion(sq: SavedQuestion): Question {
  return {
    question:    sq.question,
    options:     sq.options,
    answer:      sq.answer,
    solution:    sq.solution,
    explanation: sq.explanation,
    tip:         sq.tip,
  };
}

export default function SavedScreen() {
  const { savedQuestions, unsaveQuestion } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [selectionMode, setSelection] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const topPad      = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

  function toggleExpand(id: string) {
    if (selectionMode) { toggleSelect(id); return; }
    Haptics.selectionAsync();
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    Haptics.selectionAsync();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedIds.size === savedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(savedQuestions.map(q => q.id)));
    }
  }

  function enterSelectionMode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelection(true);
    setSelectedIds(new Set(savedQuestions.map(q => q.id)));
  }

  function exitSelectionMode() {
    setSelection(false);
    setSelectedIds(new Set());
  }

  function launchQuiz(questions: SavedQuestion[]) {
    if (questions.length === 0) {
      Alert.alert('No questions selected', 'Select at least one question to start.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const converted: Question[] = questions.map(savedToQuestion);
    const sessionId = saveQuestions(converted);

    // Determine subject / chapter labels
    const subjects  = [...new Set(questions.map(q => q.subjectName))];
    const chapters  = [...new Set(questions.map(q => q.chapterName).filter(Boolean))];
    const subjectName = subjects.length === 1 ? subjects[0]! : 'Mixed';
    const chapterName = chapters.length > 0 ? chapters.join('|||') : 'Saved Questions';

    router.push({
      pathname: '/test-quiz' as any,
      params: {
        sessionId,
        subjectName,
        chapterName,
        mode: 'mcq',
        fromSaved: '1',
      },
    });
  }

  function handleStartAll() {
    launchQuiz(savedQuestions);
  }

  function handleStartSelected() {
    const picked = savedQuestions.filter(q => selectedIds.has(q.id));
    launchQuiz(picked);
  }

  function handleUnsave(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove question?',
      'This question will be removed from your saved list.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => unsaveQuestion(id) },
      ],
    );
  }

  const allSelected = selectedIds.size === savedQuestions.length && savedQuestions.length > 0;

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
            <Text style={styles.headerTitle}>
              {selectionMode ? `${selectedIds.size} selected` : 'Saved Questions'}
            </Text>
            <Text style={styles.headerSub}>
              {savedQuestions.length === 0
                ? 'Nothing saved yet'
                : `${savedQuestions.length} question${savedQuestions.length !== 1 ? 's' : ''} bookmarked`}
            </Text>
          </View>

          {/* right-side action */}
          {savedQuestions.length > 0 && (
            selectionMode ? (
              <Pressable onPress={exitSelectionMode} style={styles.headerActionBtn}>
                <Ionicons name="close" size={18} color="#FFF" />
                <Text style={styles.headerActionText}>Cancel</Text>
              </Pressable>
            ) : (
              <View style={styles.headerActions}>
                {/* Practice All */}
                <Pressable onPress={handleStartAll} style={styles.practiceAllBtn}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.12)']}
                    style={styles.practiceAllGrad}
                  >
                    <Ionicons name="play-circle" size={16} color="#FFF" />
                    <Text style={styles.practiceAllText}>Practice All</Text>
                  </LinearGradient>
                </Pressable>
                {/* Select some */}
                <Pressable onPress={enterSelectionMode} style={styles.headerIconBtn}>
                  <Ionicons name="checkmark-done-circle-outline" size={22} color="rgba(255,255,255,0.85)" />
                </Pressable>
              </View>
            )
          )}
        </View>

        {/* Select-all bar (selection mode) */}
        {selectionMode && savedQuestions.length > 0 && (
          <Pressable onPress={toggleAll} style={styles.selectAllBar}>
            <View style={[styles.selectAllCheck, allSelected && styles.selectAllCheckActive]}>
              {allSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
            </View>
            <Text style={styles.selectAllText}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </Text>
          </Pressable>
        )}

        {!selectionMode && savedQuestions.length > 0 && (
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
          paddingBottom: selectionMode
            ? tabBarHeight + 100
            : tabBarHeight + 24,
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
            const isOpen   = expanded.has(q.id);
            const isSelected = selectedIds.has(q.id);

            return (
              <Pressable
                key={q.id}
                onPress={() => toggleExpand(q.id)}
                style={[
                  styles.qCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: selectionMode && isSelected ? '#4F46E5' : colors.border,
                    borderWidth: selectionMode && isSelected ? 2 : 1,
                  },
                ]}
              >
                {/* top accent */}
                <LinearGradient
                  colors={isSelected && selectionMode ? ['#4F46E5', '#7C3AED'] : ['#4F46E5', '#7C3AED']}
                  style={styles.qAccentBar}
                />

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
                      {selectionMode ? (
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        </View>
                      ) : (
                        <>
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
                        </>
                      )}
                    </View>
                  </View>

                  {/* question text */}
                  <View style={styles.questionRow}>
                    <View style={[styles.qNumBadge, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="help-circle" size={14} color="#4F46E5" />
                    </View>
                    <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={isOpen ? undefined : 3}>
                      {q.question}
                    </Text>
                    {!selectionMode && (
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.mutedForeground}
                      />
                    )}
                  </View>

                  {/* expanded: options + solution */}
                  {isOpen && !selectionMode && (
                    <View style={styles.expandedBody}>
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
                                {isCorrect && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {(q.explanation || q.solution || q.tip) && (
                        <View style={[styles.solutionBox, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                          <View style={styles.solutionHeader}>
                            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.solutionIcon}>
                              <Ionicons name="bulb" size={12} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.solutionTitle}>Why this answer is correct</Text>
                          </View>
                          {(q.explanation || q.solution) && (
                            <Text style={styles.solutionText}>{q.explanation || q.solution}</Text>
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
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* ── FLOATING START QUIZ BAR (selection mode) ── */}
      {selectionMode && (
        <View style={[styles.startBar, {
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 8 : 0) + 16,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        }]}>
          <View style={styles.startBarInfo}>
            <Text style={[styles.startBarCount, { color: colors.text }]}>
              {selectedIds.size} question{selectedIds.size !== 1 ? 's' : ''} selected
            </Text>
            <Text style={[styles.startBarSub, { color: colors.mutedForeground }]}>
              tap cards to select / deselect
            </Text>
          </View>
          <Pressable
            onPress={handleStartSelected}
            disabled={selectedIds.size === 0}
            style={{ borderRadius: 14, overflow: 'hidden', opacity: selectedIds.size === 0 ? 0.4 : 1 }}
          >
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.startQuizBtn}>
              <Ionicons name="play-circle" size={18} color="#FFF" />
              <Text style={styles.startQuizText}>Start Quiz</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {!selectionMode && <BottomTabBar activeTab="saved" />}
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
    gap: 14,
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
  headerRow:   { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn:  { padding: 6 },
  headerActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  headerActionText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  practiceAllBtn: { borderRadius: 20, overflow: 'hidden' },
  practiceAllGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  practiceAllText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  selectAllBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  selectAllCheck: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectAllCheckActive: {
    backgroundColor: '#4F46E5', borderColor: '#4F46E5',
  },
  selectAllText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  statItem:  { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.16)' },
  statVal:   { fontSize: 15, fontWeight: '800', color: '#FFF' },
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
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn:   { marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  emptyBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  qCard: {
    borderRadius: 20, flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  qAccentBar: { width: 5, alignSelf: 'stretch' },
  qBody:      { flex: 1, padding: 14, gap: 10 },

  qHeaderRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  qMeta:         { flex: 1, gap: 4 },
  subjectPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  subjectPillText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  chapterText:   { fontSize: 11 },
  qActions:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedTime:     { fontSize: 10 },
  unsaveBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  checkbox: {
    width: 24, height: 24, borderRadius: 7,
    borderWidth: 2, borderColor: '#C7D2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4F46E5', borderColor: '#4F46E5',
  },

  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  qNumBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 21 },

  expandedBody: { gap: 12 },
  optionsWrap:  { gap: 7 },
  sectionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  optLabel: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optLabelText: { fontSize: 11, fontWeight: '800' },
  optText:      { fontSize: 13, lineHeight: 19 },

  solutionBox:    { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  solutionIcon: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  solutionTitle: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  solutionText:  { fontSize: 13, color: '#1E1B4B', lineHeight: 20 },
  tipBox:        { borderRadius: 10, borderWidth: 1, padding: 10 },
  tipText:       { fontSize: 12, color: '#92400E', lineHeight: 18 },

  /* ── floating start bar ── */
  startBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 16,
  },
  startBarInfo:  { flex: 1 },
  startBarCount: { fontSize: 15, fontWeight: '700' },
  startBarSub:   { fontSize: 11, marginTop: 2 },
  startQuizBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 13,
  },
  startQuizText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
