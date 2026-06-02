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
  const { studentName, boardName, standardName } = useApp();
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
        const userAns = (answers[i] ?? '').trim().toLowerCase();
        const correctAns = (q.answer ?? '').trim().toLowerCase();
        if (userAns && correctAns && (userAns === correctAns || correctAns.includes(userAns) || userAns.includes(correctAns))) {
          correct++;
        }
      });
    }
    setScore(correct);

    try {
      await eduApi.submitTest({
        studentName: studentName ?? 'Student',
        board: boardName ?? '',
        standard: standardName ?? '',
        subject: subjectName,
        score: mode === 'mcq' ? correct : answers ? answeredCount : 0,
        totalQuestions: questions.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // silently handle submit errors
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={52} color={colors.destructive} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>No questions found</Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          Try generating the test again
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

  if (submitted) {
    const percentage = mode === 'mcq' ? Math.round((score / questions.length) * 100) : null;
    const isGood = percentage !== null && percentage >= 70;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isGood ? ['#065F46', '#10B981'] : ['#312E81', '#4F46E5']}
          style={[
            styles.resultHeader,
            { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 24 },
          ]}
        >
          <View style={styles.trophyWrap}>
            <Ionicons name={isGood ? 'trophy' : 'ribbon'} size={52} color="#FFFFFF" />
          </View>
          <Text style={styles.resultTitle}>Test Complete!</Text>
          {percentage !== null ? (
            <>
              <Text style={styles.resultScore}>
                {score}/{questions.length}
              </Text>
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
            <Text style={styles.resultSub}>
              {answeredCount}/{questions.length} questions answered
            </Text>
          )}
        </LinearGradient>

        <View style={[styles.resultActions, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 12 }]}>
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {questions.map((q, index) => (
          <View
            key={index}
            style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.questionHeader}>
              <View style={[styles.qNumBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.qNumText, { color: colors.primary }]}>Q{index + 1}</Text>
              </View>
              {answers[index] ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              ) : null}
            </View>

            <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>

            {q.options && q.options.length > 0 ? (
              <View style={styles.options}>
                {q.options.map((opt, oi) => {
                  const letter = OPTION_LABELS[oi] ?? String(oi + 1);
                  const isSelected = answers[index] === opt;
                  return (
                    <Pressable
                      key={oi}
                      style={[
                        styles.option,
                        {
                          backgroundColor: isSelected ? colors.primaryLight : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => setAnswer(index, opt)}
                    >
                      <View
                        style={[
                          styles.optionLetter,
                          { backgroundColor: isSelected ? colors.primary : colors.secondary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLetterText,
                            { color: isSelected ? '#FFFFFF' : colors.mutedForeground },
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>
                      <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
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
                    borderColor: colors.border,
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
              />
            )}
          </View>
        ))}

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
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  progressText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  content: { padding: 16, gap: 12 },
  questionCard: { borderRadius: 18, padding: 18, borderWidth: 1, gap: 14 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qNumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 },
  qNumText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
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
  errorTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  errorSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  actionBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  resultHeader: { alignItems: 'center', paddingBottom: 40, paddingHorizontal: 24 },
  trophyWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  resultScore: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  resultPercent: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  resultMsg: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  resultSub: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_400Regular',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
  },
  resultBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  resultBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
