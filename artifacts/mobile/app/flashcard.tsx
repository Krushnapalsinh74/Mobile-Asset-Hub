import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { eduApi } from '@/services/api';
import type { Question } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function extractCorrectLetter(q: Question): string | null {
  if (q.answer) {
    const m = q.answer.trim().match(/^([A-Da-d])/);
    if (m) return m[1].toUpperCase();
  }
  if (q.solution) {
    const patterns = [
      /correct(?:\s+option)?(?:\s+answer)?(?:\s+is)?[:\s]+(?:option\s+)?([A-Da-d])[.)\s,]/i,
      /answer\s+is\s+(?:option\s+)?([A-Da-d])[.)\s,]/i,
      /option\s+([A-Da-d])\s+is\s+(?:the\s+)?correct/i,
      /\(([A-Da-d])\)\s+is\s+(?:the\s+)?correct/i,
      /therefore[^A-Da-d]*([A-Da-d])\s+is\s+(?:the\s+)?(?:correct|right)/i,
    ];
    for (const p of patterns) {
      const match = q.solution.match(p);
      if (match) return match[1].toUpperCase();
    }
  }
  return null;
}

function getCorrectOptionIndex(q: Question): number {
  const letter = extractCorrectLetter(q);
  if (!letter) return -1;
  return letter.charCodeAt(0) - 'A'.charCodeAt(0);
}

type CardStatus = 'unknown' | 'known' | 'practice';

export default function FlashcardScreen() {
  const { subjectId, subjectName, chapterId, chapterName, topicId, topicName } =
    useLocalSearchParams<{
      subjectId: string;
      subjectName: string;
      chapterId: string;
      chapterName: string;
      topicId: string;
      topicName: string;
    }>();

  const { boardId, boardName, standardId, standardName } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, CardStatus>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    eduApi.generateQuestions({
      board: boardId ?? boardName ?? '',
      standard: standardId ?? standardName ?? '',
      subject: subjectName,
      chapter: chapterName,
      options: { mode: 'mcq', count: 10, seed: Date.now() },
    }).then(res => {
      if (cancelled) return;
      const r = res as any;
      const qs: Question[] = (
        r?.questions ?? r?.data?.questions ?? r?.result?.questions ?? (Array.isArray(r) ? r : [])
      );
      setQuestions(qs);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setError(true); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [topicId]);

  const current = questions[currentIndex];
  const correctIdx = current ? getCorrectOptionIndex(current) : -1;
  const knownCount = Object.values(statuses).filter(s => s === 'known').length;
  const practiceCount = Object.values(statuses).filter(s => s === 'practice').length;

  function handleFlip() {
    Haptics.selectionAsync();
    setFlipped(f => !f);
  }

  function handleKnow() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatuses(prev => ({ ...prev, [currentIndex]: 'known' }));
    advance();
  }

  function handlePractice() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatuses(prev => ({ ...prev, [currentIndex]: 'practice' }));
    advance();
  }

  function advance() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setFlipped(false);
    } else {
      setDone(true);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setFlipped(false);
    setStatuses({});
    setDone(false);
  }

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.loadWrap, { backgroundColor: colors.primaryLight }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={[styles.loadTitle, { color: colors.text }]}>Preparing flashcards…</Text>
        <Text style={[styles.loadSub, { color: colors.mutedForeground }]}>Generating questions for {topicName}</Text>
      </View>
    );
  }

  if (error || questions.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.loadWrap, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
        </View>
        <Text style={[styles.loadTitle, { color: colors.text }]}>Couldn't load flashcards</Text>
        <Text style={[styles.loadSub, { color: colors.mutedForeground }]}>Check your connection and try again</Text>
        <Pressable onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.actionBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ── DONE SCREEN ──
  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={knownCount >= questions.length * 0.7 ? ['#065F46', '#10B981'] : ['#312E81', '#4F46E5']}
          style={[styles.doneHeader, { paddingTop: topPad + 24 }]}
        >
          <View style={styles.doneIconWrap}>
            <Ionicons name={knownCount >= questions.length * 0.7 ? 'trophy' : 'school'} size={44} color="#FFF" />
          </View>
          <Text style={styles.doneTitle}>Session Complete!</Text>
          <Text style={styles.doneSub}>{topicName}</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={[styles.doneContent, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.doneStatsRow}>
            <View style={[styles.doneStat, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
              <Text style={[styles.doneStatNum, { color: '#065F46' }]}>{knownCount}</Text>
              <Text style={[styles.doneStatLabel, { color: '#059669' }]}>Know It</Text>
            </View>
            <View style={[styles.doneStat, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="refresh-circle" size={28} color="#F59E0B" />
              <Text style={[styles.doneStatNum, { color: '#92400E' }]}>{practiceCount}</Text>
              <Text style={[styles.doneStatLabel, { color: '#D97706' }]}>Need Practice</Text>
            </View>
            <View style={[styles.doneStat, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="layers" size={28} color={colors.primary} />
              <Text style={[styles.doneStatNum, { color: colors.primary }]}>{questions.length}</Text>
              <Text style={[styles.doneStatLabel, { color: colors.primary }]}>Total Cards</Text>
            </View>
          </View>

          <Text style={[styles.doneMessage, { color: colors.text }]}>
            {knownCount === questions.length
              ? '🎉 Perfect! You know all the cards!'
              : knownCount >= questions.length * 0.7
              ? '🌟 Great work! Keep reviewing the rest.'
              : '💪 Keep practicing — you\'ll get there!'}
          </Text>

          <View style={styles.doneActions}>
            <Pressable
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={handleRestart}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.doneBtnText}>Restart Flashcards</Text>
            </Pressable>
            <Pressable
              style={[styles.doneBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={[styles.doneBtnText, { color: colors.text }]}>Back to Topic</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── MAIN FLASHCARD ──
  const cardStatus = statuses[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: topPad + 12,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
      }]}>
        <Pressable onPress={() => router.back()}>
          <View style={[styles.backCircle, { backgroundColor: colors.secondary }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </View>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{topicName}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Flashcards</Text>
        </View>
        <View style={[styles.cardCountPill, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.cardCountText, { color: colors.primary }]}>
            {currentIndex + 1}/{questions.length}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, {
          backgroundColor: colors.primary,
          width: `${((currentIndex) / questions.length) * 100}%` as any,
        }]} />
      </View>

      {/* Status pills row */}
      <View style={[styles.statusRow, { backgroundColor: colors.card }]}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{knownCount} know it</Text>
        </View>
        <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{practiceCount} need practice</Text>
        </View>
        <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: colors.border }]} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            {questions.length - knownCount - practiceCount} left
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <Pressable onPress={handleFlip} style={styles.cardContainer}>
          {!flipped ? (
            /* FRONT */
            <View style={[styles.card, styles.cardFront, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardFrontBadge}>
                  <Ionicons name="help-circle" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.cardFrontBadgeText}>QUESTION</Text>
                </View>
                <View style={styles.qNumBubble}>
                  <Text style={styles.qNumBubbleText}>Q{currentIndex + 1}</Text>
                </View>
              </View>
              <Text style={styles.cardFrontText}>{current?.question}</Text>
              <View style={styles.flipHint}>
                <Ionicons name="sync" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.flipHintText}>Tap to reveal answer</Text>
              </View>
            </View>
          ) : (
            /* BACK */
            <View style={[styles.card, styles.cardBack, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTopRow}>
                <View style={[styles.cardBackBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={[styles.cardBackBadgeText, { color: '#10B981' }]}>ANSWER</Text>
                </View>
                <View style={[styles.qNumBubble, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.qNumBubbleText, { color: colors.primary }]}>Q{currentIndex + 1}</Text>
                </View>
              </View>

              {/* Show options with correct one highlighted */}
              {current?.options && current.options.length > 0 ? (
                <View style={styles.answerOptions}>
                  {current.options.map((opt, oi) => {
                    const isCorrect = oi === correctIdx;
                    return (
                      <View
                        key={oi}
                        style={[
                          styles.answerOption,
                          {
                            backgroundColor: isCorrect ? '#D1FAE5' : colors.secondary,
                            borderColor: isCorrect ? '#10B981' : colors.border,
                            borderWidth: isCorrect ? 2 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.optLetter, { backgroundColor: isCorrect ? '#10B981' : colors.border }]}>
                          <Text style={[styles.optLetterText, { color: isCorrect ? '#FFF' : colors.mutedForeground }]}>
                            {OPTION_LABELS[oi]}
                          </Text>
                        </View>
                        <Text style={[styles.optText, { color: isCorrect ? '#065F46' : colors.mutedForeground, fontWeight: isCorrect ? '600' : '400' }]}>
                          {opt}
                        </Text>
                        {isCorrect && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {current?.solution ? (
                <View style={[styles.solutionBox, { backgroundColor: colors.primaryLight }]}>
                  <View style={styles.solutionHeader}>
                    <Ionicons name="bulb" size={13} color={colors.primary} />
                    <Text style={[styles.solutionLabel, { color: colors.primary }]}>Explanation</Text>
                  </View>
                  <Text style={[styles.solutionText, { color: colors.text }]} numberOfLines={6}>
                    {current.solution}
                  </Text>
                </View>
              ) : null}

              <View style={styles.flipHintBack}>
                <Ionicons name="sync" size={12} color={colors.mutedForeground} />
                <Text style={[styles.flipHintText, { color: colors.mutedForeground }]}>Tap to see question</Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* Action buttons */}
        {flipped ? (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtnLg, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1.5 }]}
              onPress={handlePractice}
            >
              <Ionicons name="refresh-circle" size={22} color="#D97706" />
              <Text style={[styles.actionBtnLgText, { color: '#92400E' }]}>Need Practice</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtnLg, { backgroundColor: '#D1FAE5', borderColor: '#10B981', borderWidth: 1.5 }]}
              onPress={handleKnow}
            >
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={[styles.actionBtnLgText, { color: '#065F46' }]}>Know It!</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.flipBtn, { backgroundColor: colors.primary }]}
              onPress={handleFlip}
            >
              <Ionicons name="sync" size={18} color="#FFF" />
              <Text style={styles.flipBtnText}>Flip Card</Text>
            </Pressable>
          </View>
        )}

        {/* Skip link */}
        {!flipped && currentIndex < questions.length - 1 && (
          <Pressable style={styles.skipBtn} onPress={advance}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip this card</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.mutedForeground} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  loadWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  loadTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  loadSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  actionBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10,
  },
  backCircle: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  cardCountPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  cardCountText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  progressTrack: { height: 3 },
  progressFill: { height: 3 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 0,
  },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statusDivider: { width: 1, height: 14 },
  content: { padding: 16, gap: 14 },
  cardContainer: {},
  card: { borderRadius: 24, minHeight: 260, padding: 22, gap: 14 },
  cardFront: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
    justifyContent: 'space-between',
  },
  cardBack: { borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardFrontBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardFrontBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  cardBackBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  cardBackBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  qNumBubble: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  qNumBubbleText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },
  cardFrontText: {
    fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF', lineHeight: 28, flex: 1,
  },
  flipHint: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center' },
  flipHintBack: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginTop: 4 },
  flipHintText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)' },
  answerOptions: { gap: 7, marginTop: 4 },
  answerOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, gap: 8 },
  optLetter: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optLetterText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  optText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  solutionBox: { borderRadius: 12, padding: 12, gap: 5 },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  solutionLabel: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  solutionText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtnLg: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderRadius: 16, paddingVertical: 16,
  },
  actionBtnLgText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  flipBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 16,
  },
  flipBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  skipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  skipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  doneHeader: { alignItems: 'center', paddingBottom: 32, paddingHorizontal: 24 },
  doneIconWrap: {
    width: 86, height: 86, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  doneTitle: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF', marginBottom: 6 },
  doneSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  doneContent: { padding: 20, gap: 20 },
  doneStatsRow: { flexDirection: 'row', gap: 10 },
  doneStat: { flex: 1, borderRadius: 18, padding: 16, alignItems: 'center', gap: 6 },
  doneStatNum: { fontSize: 28, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  doneStatLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  doneMessage: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 22 },
  doneActions: { gap: 10 },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 16,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },
});
