import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi } from '@/services/api';
import type { Question } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

export default function TestQuizScreen() {
  const {
    questionsJson,
    subjectName,
    chapterName,
    mode,
  } = useLocalSearchParams<{
    questionsJson: string;
    subjectId: string;
    subjectName: string;
    chapterId: string;
    chapterName: string;
    mode: string;
  }>();
  const { studentName, boardId, boardName, standardId, standardName, addTestResult } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

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

  const answeredCount = Object.keys(answers).length;

  const setAnswer = (index: number, answer: string) => {
    if (submitted) return;
    Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [index]: answer }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);

    let correct = 0;
    if (mode === 'mcq') {
      questions.forEach((q, i) => {
        const userAns = answers[i];
        if (userAns && isAnswerCorrect(q, userAns)) correct++;
      });
    }
    setScore(correct);

    const pct = mode === 'mcq' ? Math.round((correct / questions.length) * 100) : null;

    try {
      await eduApi.submitTest({
        studentName: studentName ?? 'Student',
        board: boardId ?? boardName ?? '',
        standard: standardId ?? standardName ?? '',
        subject: subjectName,
        score: mode === 'mcq' ? correct : answeredCount,
        totalQuestions: questions.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // silently handle submit errors
    }

    addTestResult({
      subjectName,
      chapterName,
      mode,
      score: mode === 'mcq' ? correct : answeredCount,
      total: questions.length,
      percentage: pct,
      timestamp: Date.now(),
    }).catch(() => {});

    setSubmitted(true);
    setSubmitting(false);
  };

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={52} color={colors.destructive} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>No questions found</Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          Try selecting a different chapter or question type
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.actionBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const percentage = mode === 'mcq' ? Math.round((score / questions.length) * 100) : null;
  const isGood = percentage !== null && percentage >= 70;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {submitted ? (
        <LinearGradient
          colors={isGood ? ['#065F46', '#10B981'] : ['#312E81', '#4F46E5']}
          style={[
            styles.resultHeader,
            { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 24 },
          ]}
        >
          <View style={styles.trophyWrap}>
            <Ionicons name={isGood ? 'trophy' : 'ribbon'} size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.resultTitle}>Test Complete!</Text>
          {percentage !== null ? (
            <>
              <Text style={styles.resultScore}>{score}/{questions.length}</Text>
              <Text style={styles.resultPercent}>{percentage}% Correct</Text>
              <Text style={styles.resultMsg}>
                {percentage >= 90
                  ? 'Outstanding performance!'
                  : percentage >= 70
                  ? 'Great job! Keep it up.'
                  : percentage >= 50
                  ? 'Good effort, keep practicing!'
                  : 'Keep studying, you can do it!'}
              </Text>
            </>
          ) : (
            <Text style={styles.resultSub}>{answeredCount}/{questions.length} answered</Text>
          )}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 12,
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {chapterName || subjectName}
            </Text>
            <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
              {answeredCount}/{questions.length} answered
            </Text>
          </View>
          <View style={[styles.progressPill, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.progressText, { color: colors.primary }]}>
              {Math.round((answeredCount / questions.length) * 100)}%
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20 },
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
              style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.questionHeader}>
                <View style={[styles.qNumBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.qNumText, { color: colors.primary }]}>Q{index + 1}</Text>
                </View>
                {submitted && userAns ? (
                  <Ionicons
                    name={userCorrect ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={userCorrect ? colors.success : colors.destructive}
                  />
                ) : !submitted && userAns ? (
                  <View style={[styles.answeredDot, { backgroundColor: colors.primary }]} />
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
                        style={[
                          styles.option,
                          { backgroundColor: bgColor, borderColor, borderWidth },
                        ]}
                        onPress={() => setAnswer(index, opt)}
                        disabled={submitted}
                      >
                        <View style={[styles.optionLetter, { backgroundColor: letterBg }]}>
                          <Text style={[styles.optionLetterText, { color: letterColor }]}>
                            {letter}
                          </Text>
                        </View>
                        <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                        {submitted && isCorrectOpt && (
                          <Ionicons name="checkmark" size={16} color="#10B981" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={[
                    styles.answerInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: submitted ? (userCorrect ? '#10B981' : colors.border) : colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Type your answer here..."
                  placeholderTextColor={colors.mutedForeground}
                  value={answers[index] ?? ''}
                  onChangeText={(t) => setAnswer(index, t)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!submitted}
                />
              )}

              {submitted && (q.solution || q.tip) && (
                <View style={[styles.solutionBox, { backgroundColor: colors.primaryLight }]}>
                  {q.solution ? (
                    <>
                      <Text style={[styles.solutionLabel, { color: colors.primary }]}>
                        Explanation
                      </Text>
                      <Text style={[styles.solutionText, { color: colors.text }]}>
                        {q.solution}
                      </Text>
                    </>
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
          <View style={[styles.resultActions]}>
            <Pressable
              style={[
                styles.resultBtn,
                { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => {
                router.back();
                router.back();
              }}
            >
              <Text style={[styles.resultBtnText, { color: colors.text }]}>Back to Subject</Text>
            </Pressable>
            <Pressable
              style={[styles.resultBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.resultBtnText, { color: '#FFFFFF' }]}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary, opacity: submitting ? 0.65 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Submit Test</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  closeBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerCount: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  progressPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  progressText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  resultHeader: { alignItems: 'center', paddingBottom: 32, paddingHorizontal: 24 },
  trophyWrap: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  resultScore: { fontSize: 48, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  resultPercent: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
  },
  resultMsg: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  resultSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular' },
  content: { padding: 16, gap: 12 },
  questionCard: { borderRadius: 18, padding: 18, borderWidth: 1, gap: 14 },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qNumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 },
  qNumText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  answeredDot: { width: 10, height: 10, borderRadius: 5 },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    lineHeight: 24,
  },
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    padding: 12,
    gap: 10,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  optionText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  answerInput: {
    borderRadius: 13,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    fontFamily: 'Inter_400Regular',
  },
  solutionBox: { borderRadius: 12, padding: 14, gap: 6 },
  solutionLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  solutionText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  tipText: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic', lineHeight: 18 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    padding: 18,
    gap: 10,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  resultActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resultBtn: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  resultBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  errorTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  errorSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  actionBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
