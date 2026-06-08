import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi } from '@/services/api';
import type { Question } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

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

function isAnswerCorrect(q: Question, selectedOpt: string): boolean {
  const idx = getCorrectOptionIndex(q);
  if (idx < 0 || !q.options) return false;
  return selectedOpt === q.options[idx];
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function TestQuizScreen() {
  const { questionsJson, subjectName, chapterName } = useLocalSearchParams<{
    questionsJson: string;
    subjectId: string;
    subjectName: string;
    chapterId: string;
    chapterName: string;
  }>();
  const { studentName, boardId, boardName, standardId, standardName, addTestResult } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const questions: Question[] = useMemo(() => {
    try {
      const parsed = JSON.parse(questionsJson ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [questionsJson]);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [submitted]);

  const answeredCount = Object.keys(answers).length;
  const answerPct = questions.length > 0 ? answeredCount / questions.length : 0;

  const setAnswer = (index: number, answer: string) => {
    if (submitted) return;
    Haptics.selectionAsync();
    setAnswers(prev => ({ ...prev, [index]: answer }));
  };

  const doSubmit = async () => {
    if (submitting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);

    let correct = 0;
    questions.forEach((q, i) => {
      const userAns = answers[i];
      if (userAns && isAnswerCorrect(q, userAns)) correct++;
    });
    setScore(correct);

    const pct = Math.round((correct / questions.length) * 100);

    try {
      await eduApi.submitTest({
        studentName: studentName ?? 'Student',
        board: boardId ?? boardName ?? '',
        standard: standardId ?? standardName ?? '',
        subject: subjectName,
        score: correct,
        totalQuestions: questions.length,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    addTestResult({
      subjectName,
      chapterName,
      mode: 'mcq',
      score: correct,
      total: questions.length,
      percentage: pct,
      timestamp: Date.now(),
    }).catch(() => {});

    setSubmitted(true);
    setSubmitting(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSubmit = () => {
    const unanswered = questions.length - answeredCount;
    if (unanswered > 0) {
      if (Platform.OS === 'web') {
        if (window.confirm(`${unanswered} question${unanswered > 1 ? 's' : ''} unanswered. Submit anyway?`)) doSubmit();
      } else {
        Alert.alert(
          'Unanswered Questions',
          `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`,
          [
            { text: 'Review', style: 'cancel' },
            { text: 'Submit', style: 'destructive', onPress: doSubmit },
          ],
        );
      }
    } else {
      doSubmit();
    }
  };

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>No questions found</Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          Try selecting a different chapter or question type
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.actionBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const percentage = Math.round((score / questions.length) * 100);
  const isGood = percentage >= 70;
  const BOTTOM_NAV_HEIGHT = insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 72;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── HEADER ── */}
      {submitted ? (
        <LinearGradient
          colors={isGood ? ['#065F46', '#10B981'] : percentage >= 50 ? ['#92400E', '#F59E0B'] : ['#312E81', '#4F46E5']}
          style={[styles.resultHeader, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 24 }]}
        >
          <View style={styles.trophyWrap}>
            <Ionicons
              name={isGood ? 'trophy' : percentage >= 50 ? 'ribbon' : 'school'}
              size={48}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.resultTitle}>Test Complete!</Text>
          <>
            <Text style={styles.resultScore}>{score}/{questions.length}</Text>
            <Text style={styles.resultPercent}>{percentage}% Correct</Text>
            <View style={styles.resultMeta}>
              <View style={styles.resultMetaItem}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.resultMetaText}>{formatTime(elapsed)}</Text>
              </View>
              <View style={styles.resultMetaDot} />
              <View style={styles.resultMetaItem}>
                <Ionicons name="checkmark-circle-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.resultMetaText}>{score} correct</Text>
              </View>
              <View style={styles.resultMetaDot} />
              <View style={styles.resultMetaItem}>
                <Ionicons name="close-circle-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.resultMetaText}>{questions.length - score} wrong</Text>
              </View>
            </View>
            <Text style={styles.resultMsg}>
              {percentage >= 90 ? '🎉 Outstanding performance!'
                : percentage >= 70 ? '🌟 Great job! Keep it up.'
                : percentage >= 50 ? '💪 Good effort, keep practicing!'
                : '📚 Keep studying, you can do it!'}
            </Text>
          </>
        </LinearGradient>
      ) : (
        <View style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <View style={[styles.closeCircle, { backgroundColor: colors.secondary }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </View>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {chapterName || subjectName}
            </Text>
            <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
              {answeredCount}/{questions.length} answered
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.timerPill, { backgroundColor: elapsed > 1800 ? '#FEF3C7' : colors.secondary }]}>
              <Ionicons name="time-outline" size={12} color={elapsed > 1800 ? '#F59E0B' : colors.mutedForeground} />
              <Text style={[styles.timerText, { color: elapsed > 1800 ? '#F59E0B' : colors.mutedForeground }]}>
                {formatTime(elapsed)}
              </Text>
            </View>
            <View style={[styles.progressPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.progressText, { color: colors.primary }]}>
                {Math.round(answerPct * 100)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── PROGRESS BAR ── */}
      {!submitted && (
        <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, {
            backgroundColor: answerPct === 1 ? colors.success : colors.primary,
            width: `${Math.max(2, answerPct * 100)}%` as any,
          }]} />
        </View>
      )}

      {/* ── QUESTION NAVIGATOR (not submitted) ── */}
      {!submitted && (
        <View style={[styles.navigatorWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navigatorRow}>
            {questions.map((_, i) => {
              const answered = answers[i] !== undefined;
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.navBubble,
                    {
                      backgroundColor: answered ? colors.primary : colors.secondary,
                      borderColor: answered ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    scrollRef.current?.scrollTo({ y: i * 180, animated: true });
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={[styles.navBubbleText, { color: answered ? '#FFF' : colors.mutedForeground }]}>
                    {i + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: submitted ? insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 : BOTTOM_NAV_HEIGHT },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {questions.map((q, index) => {
          const userAns = answers[index];
          const correctIdx = getCorrectOptionIndex(q);
          const userCorrect = userAns ? isAnswerCorrect(q, userAns) : false;

          return (
            <View
              key={index}
              style={[
                styles.questionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: submitted
                    ? userAns
                      ? userCorrect ? '#10B981' : '#EF4444'
                      : colors.border
                    : userAns ? colors.primary : colors.border,
                  borderWidth: submitted && userAns ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.questionHeader}>
                <View style={[styles.qNumBadge, {
                  backgroundColor: submitted
                    ? userAns ? (userCorrect ? '#D1FAE5' : '#FEE2E2') : colors.primaryLight
                    : userAns ? colors.primaryLight : colors.secondary,
                }]}>
                  <Text style={[styles.qNumText, {
                    color: submitted
                      ? userAns ? (userCorrect ? '#065F46' : '#991B1B') : colors.primary
                      : userAns ? colors.primary : colors.mutedForeground,
                  }]}>
                    Q{index + 1}
                  </Text>
                </View>
                {submitted && userAns ? (
                  <View style={styles.resultBadge}>
                    <Ionicons
                      name={userCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={userCorrect ? colors.success : colors.destructive}
                    />
                    <Text style={[styles.resultBadgeText, { color: userCorrect ? colors.success : colors.destructive }]}>
                      {userCorrect ? 'Correct' : 'Wrong'}
                    </Text>
                  </View>
                ) : !submitted && userAns ? (
                  <View style={[styles.answeredTag, { backgroundColor: colors.primaryLight }]}>
                    <View style={[styles.answeredDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.answeredTagText, { color: colors.primary }]}>Answered</Text>
                  </View>
                ) : submitted && !userAns ? (
                  <View style={[styles.answeredTag, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="remove-circle-outline" size={12} color="#F59E0B" />
                    <Text style={[styles.answeredTagText, { color: '#F59E0B' }]}>Skipped</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>

              {q.options && q.options.length > 0 ? (
                <View style={styles.options}>
                  {q.options.map((opt, oi) => {
                    const letter = OPTION_LABELS[oi] ?? String(oi + 1);
                    const isSelected = userAns === opt;
                    const isCorrectOpt = submitted && oi === correctIdx;
                    const isWrongSelection = submitted && isSelected && !userCorrect;

                    let bgColor = colors.background;
                    let borderColor = colors.border;
                    let borderWidth = 1;
                    let letterBg = colors.secondary;
                    let letterColor = colors.mutedForeground;
                    let textColor = colors.text;

                    if (!submitted && isSelected) {
                      bgColor = colors.primaryLight;
                      borderColor = colors.primary;
                      borderWidth = 2;
                      letterBg = colors.primary;
                      letterColor = '#FFFFFF';
                    } else if (submitted && isCorrectOpt) {
                      bgColor = '#D1FAE5';
                      borderColor = '#10B981';
                      borderWidth = 2;
                      letterBg = '#10B981';
                      letterColor = '#FFFFFF';
                      textColor = '#065F46';
                    } else if (isWrongSelection) {
                      bgColor = '#FEE2E2';
                      borderColor = '#EF4444';
                      borderWidth = 2;
                      letterBg = '#EF4444';
                      letterColor = '#FFFFFF';
                      textColor = '#991B1B';
                    }

                    return (
                      <Pressable
                        key={oi}
                        style={[styles.option, { backgroundColor: bgColor, borderColor, borderWidth }]}
                        onPress={() => setAnswer(index, opt)}
                        disabled={submitted}
                      >
                        <View style={[styles.optionLetter, { backgroundColor: letterBg }]}>
                          <Text style={[styles.optionLetterText, { color: letterColor }]}>{letter}</Text>
                        </View>
                        <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                        {submitted && isCorrectOpt && (
                          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        )}
                        {isWrongSelection && (
                          <Ionicons name="close-circle" size={18} color="#EF4444" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.noOptionsBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.noOptionsText, { color: colors.mutedForeground }]}>
                    No options available for this question.
                  </Text>
                </View>
              )}

              {submitted && (q.solution || q.tip) && (
                <View style={[styles.solutionBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30', borderWidth: 1 }]}>
                  <View style={styles.solutionHeader}>
                    <Ionicons name="bulb" size={14} color={colors.primary} />
                    <Text style={[styles.solutionLabel, { color: colors.primary }]}>Explanation</Text>
                  </View>
                  {q.solution ? (
                    <Text style={[styles.solutionText, { color: colors.text }]}>{q.solution}</Text>
                  ) : null}
                  {q.tip ? (
                    <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                      💡 {q.tip}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}

        {submitted ? (
          <View style={styles.resultActions}>
            <Pressable
              style={[styles.resultBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => { router.back(); router.back(); }}
            >
              <Ionicons name="home-outline" size={16} color={colors.text} />
              <Text style={[styles.resultBtnText, { color: colors.text }]}>Home</Text>
            </Pressable>
            <Pressable
              style={[styles.resultBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={[styles.resultBtnText, { color: '#FFFFFF' }]}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* ── FIXED SUBMIT BUTTON ── */}
      {!submitted && (
        <View style={[
          styles.submitWrap,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
          },
        ]}>
          <View style={styles.submitMeta}>
            <Text style={[styles.submitMetaText, { color: colors.mutedForeground }]}>
              {answeredCount === questions.length
                ? '✅ All answered — ready to submit!'
                : `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} remaining`}
            </Text>
          </View>
          <Pressable
            style={[
              styles.submitBtn,
              {
                backgroundColor: answeredCount === questions.length ? colors.success : colors.primary,
                opacity: submitting ? 0.65 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              {submitting ? 'Submitting…' : 'Submit Test'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  closeBtn: {},
  closeCircle: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerCount: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  timerText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  progressPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  progressText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  progressBarTrack: { height: 3, width: '100%' },
  progressBarFill: { height: 3 },
  navigatorWrap: { borderBottomWidth: 1, paddingVertical: 6 },
  navigatorRow: { paddingHorizontal: 12, gap: 5 },
  navBubble: {
    width: 30, height: 30, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  navBubbleText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  resultHeader: { alignItems: 'center', paddingBottom: 32, paddingHorizontal: 24 },
  trophyWrap: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  resultTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold', marginBottom: 8 },
  resultScore: { fontSize: 52, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold', lineHeight: 60 },
  resultPercent: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_500Medium', marginBottom: 12 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  resultMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resultMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  resultMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  resultMsg: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_500Medium', textAlign: 'center' },
  resultSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular' },
  content: { padding: 14, gap: 12 },
  questionCard: { borderRadius: 18, padding: 18, borderWidth: 1, gap: 14 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qNumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 },
  qNumText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultBadgeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  answeredTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  answeredDot: { width: 6, height: 6, borderRadius: 3 },
  answeredTagText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  questionText: { fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium', lineHeight: 24 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', borderRadius: 13, padding: 12, gap: 10 },
  optionLetter: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  optionText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  noOptionsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  noOptionsText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  solutionBox: { borderRadius: 12, padding: 14, gap: 6 },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  solutionLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  solutionText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  tipText: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic', lineHeight: 18 },
  submitWrap: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  submitMeta: { alignItems: 'center' },
  submitMetaText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 16, gap: 8,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  resultActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resultBtn: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  resultBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  errorTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  errorSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  actionBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
