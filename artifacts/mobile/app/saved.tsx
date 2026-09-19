import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import MathText from '@/components/MathText';
import { useApp } from '@/context/AppContext';
import type { SavedQuestion } from '@/context/AppContext';
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
const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Maths', 'Bio'];

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
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('All');

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);
  const tabBarHeight = BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);

  function toggleExpand(id: string) {
    Haptics.selectionAsync();
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function launchQuiz(questions: SavedQuestion[]) {
    if (questions.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const converted: Question[] = questions.map(savedToQuestion);
    const sessionId = saveQuestions(converted);

    const subjects = [...new Set(questions.map(q => q.subjectName))];
    const chapters = [...new Set(questions.map(q => q.chapterName).filter(Boolean))];
    const subjectName = subjects.length === 1 ? subjects[0]! : 'Mixed';
    const chapterName = chapters.length > 0 ? chapters.join('|||') : 'Saved Questions';

    router.push({
      pathname: '/test-quiz' as any,
      params: { sessionId, subjectName, chapterName, mode: 'mcq', fromSaved: '1' },
    });
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

  const filteredQuestions = savedQuestions.filter(q => 
    activeTab === 'All' ? true : q.subjectName?.toLowerCase().includes(activeTab.toLowerCase())
  );

  return (
    <View style={styles.root}>
      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#1E1B4B', '#3B27ED', '#5B4AF0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Saved Questions</Text>
            <Text style={styles.headerSub}>Your bookmarked questions</Text>
          </View>
          <View style={styles.searchBtn}>
            <Ionicons name="search" size={18} color="#FFF" />
          </View>
        </View>
      </LinearGradient>

      {/* FILTER CHIPS */}
      <View style={styles.filterStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {SUBJECTS.map((sub) => {
            const isActive = activeTab === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(sub);
                }}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{sub}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: tabBarHeight + 24,
          gap: 16,
        }}
      >
        {savedQuestions.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIllustration}>
              <View style={styles.docCircle}>
                <Ionicons name="document-text" size={80} color="#E0E7FF" style={{ opacity: 0.8 }} />
                <View style={styles.emptyBookmarkBadge}>
                  <Ionicons name="bookmark" size={24} color="#5B4AF0" />
                </View>
              </View>
            </View>
            <Text style={styles.emptyTitle}>No saved questions yet</Text>
            <Text style={styles.emptySub}>
              Tap the bookmark icon on any question{'\n'}to save it here for quick access later.
            </Text>

            <View style={styles.featuresList}>
              {[
                { title: 'Save important questions', sub: 'Keep track of tricky questions', icon: 'bookmark' },
                { title: 'Revise anytime', sub: 'Access your saved questions anytime, anywhere', icon: 'time' },
                { title: 'Improve faster', sub: 'Focus on your weak topics', icon: 'briefcase' },
              ].map((f, i) => (
                <View key={i} style={styles.featureItem}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon as any} size={20} color="#5B4AF0" />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.sub}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable onPress={() => router.replace('/subjects' as any)} style={styles.exploreBtn}>
              <Text style={styles.exploreBtnText}>Explore Questions</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        ) : filteredQuestions.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#64748B' }}>No saved questions in {activeTab}.</Text>
          </View>
        ) : (
          filteredQuestions.map((q) => {
            const isOpen = expanded.has(q.id);
            return (
              <Pressable
                key={q.id}
                onPress={() => toggleExpand(q.id)}
                style={styles.qCard}
              >
                <LinearGradient colors={['#5B4AF0', '#7C3AED']} style={styles.qAccentBar} />
                <View style={styles.qBody}>
                  <View style={styles.qHeaderRow}>
                    <View style={styles.qMeta}>
                      <View style={styles.subjectPill}>
                        <Ionicons name="book-outline" size={10} color="#5B4AF0" />
                        <Text style={styles.subjectPillText} numberOfLines={1}>{q.subjectName}</Text>
                      </View>
                      {q.chapterName && (
                        <Text style={styles.chapterText} numberOfLines={1}>
                          {q.chapterName.split('|||')[0]}
                        </Text>
                      )}
                    </View>
                    <View style={styles.qActions}>
                      <Text style={styles.savedTime}>{timeAgo(q.savedAt)}</Text>
                      <Pressable onPress={() => handleUnsave(q.id)} hitSlop={8} style={styles.unsaveBtn}>
                        <Ionicons name="trash-outline" size={13} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.questionRow}>
                    <View style={styles.qNumBadge}>
                      <Ionicons name="help-circle" size={14} color="#5B4AF0" />
                    </View>
                    <MathText style={styles.questionText} numberOfLines={isOpen ? undefined : 3} text={q.question} />
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#94A3B8" />
                  </View>

                  {isOpen && (
                    <View style={styles.expandedBody}>
                      {q.options && q.options.length > 0 && (
                        <View style={styles.optionsWrap}>
                          <Text style={styles.sectionLabel}>Options</Text>
                          {q.options.map((opt, oi) => {
                            const isCorrect = oi === q.correctOptionIndex;
                            return (
                              <View key={oi} style={[styles.optionRow, isCorrect && styles.optionRowCorrect]}>
                                <View style={[styles.optLabel, isCorrect && styles.optLabelCorrect]}>
                                  <Text style={[styles.optLabelText, isCorrect && styles.optLabelTextCorrect]}>
                                    {OPTION_LABELS[oi]}
                                  </Text>
                                </View>
                                <MathText style={[styles.optText, isCorrect && styles.optTextCorrect]} text={opt} />
                                {isCorrect && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {(q.explanation || q.solution || q.tip) && (
                        <View style={styles.solutionBox}>
                          <View style={styles.solutionHeader}>
                            <LinearGradient colors={['#5B4AF0', '#7C3AED']} style={styles.solutionIcon}>
                              <Ionicons name="bulb" size={12} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.solutionTitle}>Why this answer is correct</Text>
                          </View>
                          {(q.explanation || q.solution) && (
                            <MathText style={styles.solutionText} text={q.explanation || q.solution || ''} />
                          )}
                          {q.tip && (
                            <View style={styles.tipBox}>
                              <MathText style={styles.tipText} text={`💡 ${q.tip}`} />
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

      <BottomTabBar activeTab="saved" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* HEADER */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  searchBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },

  /* FILTER CHIPS */
  filterStrip: { marginTop: 16 },
  filterScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#5B4AF0', borderColor: '#5B4AF0' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFF' },

  /* EMPTY STATE */
  emptyStateContainer: { alignItems: 'center', paddingTop: 20 },
  emptyIllustration: { position: 'relative', marginBottom: 24 },
  docCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
    position: 'relative'
  },
  emptyBookmarkBadge: {
    position: 'absolute', top: 30, right: 30,
    backgroundColor: '#FFF', padding: 8, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20, color: '#64748B', marginBottom: 32 },

  featuresList: { alignSelf: 'stretch', gap: 16, marginBottom: 32 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 20 },
  featureIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  featureDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },

  exploreBtn: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#5B4AF0', paddingVertical: 16, borderRadius: 16,
    shadowColor: '#5B4AF0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  exploreBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  /* QUESTION CARD */
  qCard: {
    borderRadius: 20, flexDirection: 'row', overflow: 'hidden',
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  qAccentBar: { width: 5, alignSelf: 'stretch' },
  qBody: { flex: 1, padding: 16, gap: 12 },
  
  qHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  qMeta: { flex: 1, gap: 4 },
  subjectPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, backgroundColor: '#EEF2FF',
  },
  subjectPillText: { fontSize: 11, fontWeight: '700', color: '#5B4AF0' },
  chapterText: { fontSize: 11, color: '#64748B' },
  qActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedTime: { fontSize: 10, color: '#94A3B8' },
  unsaveBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },

  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  qNumBadge: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 21, color: '#0F172A' },

  expandedBody: { gap: 12 },
  optionsWrap: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  optionRowCorrect: { backgroundColor: '#F0FDF4', borderColor: '#22C55E' },
  optLabel: {
    width: 24, height: 24, borderRadius: 8, backgroundColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optLabelCorrect: { backgroundColor: '#22C55E' },
  optLabelText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  optLabelTextCorrect: { color: '#FFF' },
  optText: { fontSize: 14, color: '#334155', flex: 1, lineHeight: 20 },
  optTextCorrect: { color: '#166534', fontWeight: '500' },

  solutionBox: { borderRadius: 16, borderWidth: 1, borderColor: '#E0E7FF', backgroundColor: '#EEF2FF', padding: 16, gap: 12 },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  solutionIcon: {
    width: 24, height: 24, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  solutionTitle: { fontSize: 14, fontWeight: '800', color: '#5B4AF0' },
  solutionText: { fontSize: 13, color: '#1E293B', lineHeight: 20 },
  tipBox: { borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FEF3C7', padding: 12 },
  tipText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
});
