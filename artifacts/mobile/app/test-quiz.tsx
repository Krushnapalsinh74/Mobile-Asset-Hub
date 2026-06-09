import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi } from '@/services/api';
import type { Question } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];
const APP_NAME = 'Knowledge Park';

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
  const mins = Math.floor(Math.abs(s) / 60);
  const secs = Math.abs(s) % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getGrade(pct: number): { grade: string; gpa: string; color: string; bg: string } {
  if (pct >= 90) return { grade: 'A+', gpa: '10.0', color: '#065F46', bg: '#D1FAE5' };
  if (pct >= 80) return { grade: 'A',  gpa: '9.0',  color: '#059669', bg: '#ECFDF5' };
  if (pct >= 70) return { grade: 'B+', gpa: '8.0',  color: '#2563EB', bg: '#EFF6FF' };
  if (pct >= 60) return { grade: 'B',  gpa: '7.0',  color: '#3B82F6', bg: '#EFF6FF' };
  if (pct >= 50) return { grade: 'C',  gpa: '6.0',  color: '#D97706', bg: '#FEF3C7' };
  if (pct >= 40) return { grade: 'D',  gpa: '5.0',  color: '#EA580C', bg: '#FFF7ED' };
  return              { grade: 'F',  gpa: '0.0',  color: '#DC2626', bg: '#FEE2E2' };
}

function getDateString() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const questions: Question[] = useMemo(() => {
    try {
      const parsed = JSON.parse(questionsJson ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [questionsJson]);

  const totalTime = questions.length * 90;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [elapsed, setElapsed] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [expandedReview, setExpandedReview] = useState<Set<number>>(new Set());

  // Store answers in a ref so doSubmit doesn't need it as a dep
  // (prevents timer from restarting on every answer selection)
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const doSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    setShowSubmitModal(false);

    const currentAnswers = answersRef.current;
    let correct = 0;
    questions.forEach((q, i) => {
      const userAns = currentAnswers[i];
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
    // answersRef intentionally not in deps — use ref to avoid timer restart on every answer
  }, [submitting, submitted, questions, studentName, boardId, boardName, standardId, standardName, subjectName, chapterName, addTestResult]);

  // Countdown timer — stable dep on doSubmit (no longer changes per answer)
  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(id); doSubmit(); return 0; }
        return prev - 1;
      });
      setElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [submitted, doSubmit]);

  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft < 120;

  const setAnswer = (answer: string) => {
    if (submitted) return;
    Haptics.selectionAsync();
    setAnswers(prev => ({ ...prev, [currentIndex]: answer }));
  };

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  if (questions.length === 0) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>No questions found</Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          Try selecting a different chapter or question type
        </Text>
        <Pressable onPress={() => router.back()} style={styles.actionBtn}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.actionBtnGrad}>
            <Text style={styles.actionBtnText}>Go Back</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  const percentage = submitted ? Math.round((score / questions.length) * 100) : 0;

  /* ════════════════════════════════════
     RESULT SCREEN — Knowledge Park card
  ════════════════════════════════════ */
  if (submitted) {
    const gradeInfo = getGrade(percentage);
    const wrong = questions.length - score - (questions.length - answeredCount);
    const skipped = questions.length - answeredCount;
    const isPassing = percentage >= 40;
    const headerGrad: [string, string, string] = percentage >= 70
      ? ['#064E3B', '#065F46', '#059669']
      : percentage >= 40
      ? ['#451A03', '#92400E', '#D97706']
      : ['#1E1B4B', '#312E81', '#4F46E5'];

    return (
      <View style={[styles.container, { backgroundColor: '#F0F4FF' }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

          {/* ── KP Official Header ── */}
          <LinearGradient
            colors={headerGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.resultHeader, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 20 }]}
          >
            <View style={styles.resultHBlob1} />
            <View style={styles.resultHBlob2} />

            {/* KP Branding */}
            <View style={styles.kpBrand}>
              <View style={styles.kpLogoWrap}>
                <Ionicons name="school" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.kpName}>{APP_NAME}</Text>
                <Text style={styles.kpTagline}>Official Test Result</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.kpDivider} />

            {/* Score circle */}
            <View style={styles.scoreCircleWrap}>
              <View style={styles.scoreCircleOuter}>
                <View style={styles.scoreCircleInner}>
                  <Text style={styles.scoreCirclePct}>{percentage}%</Text>
                  <Text style={styles.scoreCircleLabel}>Score</Text>
                </View>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.bg }]}>
                <Text style={[styles.gradeText, { color: gradeInfo.color }]}>{gradeInfo.grade}</Text>
              </View>
            </View>

            <Text style={styles.resultStatusText}>
              {isPassing ? '✅ PASSED' : '❌ NOT PASSED'}
            </Text>

            {/* Meta strip */}
            <View style={styles.kpMetaStrip}>
              <View style={styles.kpMetaItem}>
                <Ionicons name="person-outline" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.kpMetaText}>{studentName || 'Student'}</Text>
              </View>
              <View style={styles.kpMetaDot} />
              <View style={styles.kpMetaItem}>
                <Ionicons name="book-outline" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.kpMetaText}>{subjectName}</Text>
              </View>
              <View style={styles.kpMetaDot} />
              <View style={styles.kpMetaItem}>
                <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.kpMetaText}>{getDateString()}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── Official Marksheet ── */}
          <View style={styles.marksheet}>

            {/* Header row */}
            <View style={[styles.marksheetHeader, { borderBottomColor: '#E5E7EB' }]}>
              <Text style={styles.marksheetTitle}>PERFORMANCE REPORT</Text>
              <View style={[styles.marksheetBadge, { backgroundColor: isPassing ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.marksheetBadgeText, { color: isPassing ? '#065F46' : '#991B1B' }]}>
                  {isPassing ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            </View>

            {/* Info rows */}
            {[
              { label: 'Student Name', value: studentName || 'Student' },
              { label: 'Board', value: boardName || boardId || '—' },
              { label: 'Standard', value: standardName || standardId || '—' },
              { label: 'Subject', value: subjectName || '—' },
              { label: 'Chapter', value: (chapterName || '—').split('|||')[0] || '—' },
              { label: 'Test Type', value: 'MCQ' },
              { label: 'Test Date', value: getDateString() },
              { label: 'Time Taken', value: formatTime(elapsed) },
            ].map((row, i) => (
              <View key={i} style={[styles.marksheetRow, { backgroundColor: i % 2 === 0 ? '#FAFAFA' : '#FFFFFF', borderBottomColor: '#F3F4F6' }]}>
                <Text style={styles.marksheetRowLabel}>{row.label}</Text>
                <Text style={styles.marksheetRowValue} numberOfLines={1}>{row.value}</Text>
              </View>
            ))}

            {/* Score table */}
            <View style={styles.scoreTable}>
              <Text style={styles.scoreTableTitle}>MARKS SUMMARY</Text>
              <View style={styles.scoreTableGrid}>
                {[
                  { label: 'Total Qs', val: String(questions.length), color: '#4F46E5', bg: '#EEF2FF' },
                  { label: 'Attempted', val: String(answeredCount), color: '#0284C7', bg: '#E0F2FE' },
                  { label: 'Correct', val: String(score), color: '#059669', bg: '#D1FAE5' },
                  { label: 'Wrong', val: String(Math.max(0, wrong)), color: '#DC2626', bg: '#FEE2E2' },
                  { label: 'Skipped', val: String(skipped), color: '#D97706', bg: '#FEF3C7' },
                  { label: 'Score %', val: `${percentage}%`, color: gradeInfo.color, bg: gradeInfo.bg },
                ].map((s, i) => (
                  <View key={i} style={[styles.scoreCell, { backgroundColor: s.bg }]}>
                    <Text style={[styles.scoreCellVal, { color: s.color }]}>{s.val}</Text>
                    <Text style={[styles.scoreCellLabel, { color: s.color + 'BB' }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Grade row */}
            <View style={[styles.gradeRow, { backgroundColor: gradeInfo.bg, borderColor: gradeInfo.color + '30' }]}>
              <View>
                <Text style={[styles.gradeRowLabel, { color: gradeInfo.color }]}>Overall Grade</Text>
                <Text style={[styles.gradeRowSub, { color: gradeInfo.color + 'AA' }]}>GPA: {gradeInfo.gpa} / 10.0</Text>
              </View>
              <View style={[styles.gradeCircle, { borderColor: gradeInfo.color }]}>
                <Text style={[styles.gradeCircleText, { color: gradeInfo.color }]}>{gradeInfo.grade}</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.resultActions}>
              <Pressable
                style={[styles.resultBtnOutline, { borderColor: '#4F46E5' }]}
                onPress={() => { router.back(); router.back(); }}
              >
                <Ionicons name="home-outline" size={16} color="#4F46E5" />
                <Text style={[styles.resultBtnOutlineText, { color: '#4F46E5' }]}>Home</Text>
              </Pressable>
              <Pressable style={styles.resultBtnFill} onPress={() => router.back()}>
                <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.resultBtnGrad}>
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.resultBtnFillText}>Try Again</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* KP Footer */}
            <View style={styles.kpFooter}>
              <View style={[styles.kpFooterLogoWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="school" size={14} color="#4F46E5" />
              </View>
              <Text style={styles.kpFooterText}>
                This result is generated by <Text style={{ color: '#4F46E5', fontWeight: '700' }}>{APP_NAME}</Text>
              </Text>
            </View>
          </View>

          {/* ── Question Review ── */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewSectionHeader}>
              <Ionicons name="list-circle-outline" size={18} color="#4F46E5" />
              <Text style={styles.reviewSectionTitle}>Question-wise Review</Text>
            </View>

            {questions.map((q, index) => {
              const userAns = answers[index];
              const correctIdx = getCorrectOptionIndex(q);
              const userCorrect = userAns ? isAnswerCorrect(q, userAns) : false;
              const isExpanded = expandedReview.has(index);
              const status = userAns ? (userCorrect ? 'correct' : 'wrong') : 'skipped';
              const statusColor = status === 'correct' ? '#059669' : status === 'wrong' ? '#DC2626' : '#D97706';
              const statusBg = status === 'correct' ? '#D1FAE5' : status === 'wrong' ? '#FEE2E2' : '#FEF3C7';

              return (
                <Pressable
                  key={index}
                  style={[styles.reviewCard, { backgroundColor: '#FFFFFF', borderColor: statusColor + '30' }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExpandedReview(prev => {
                      const next = new Set(prev);
                      if (next.has(index)) next.delete(index); else next.add(index);
                      return next;
                    });
                  }}
                >
                  <View style={styles.reviewCardHeader}>
                    <View style={[styles.reviewQBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.reviewQBadgeNum, { color: statusColor }]}>Q{index + 1}</Text>
                    </View>
                    <Text style={[styles.reviewQuestion, { color: '#111827' }]} numberOfLines={isExpanded ? undefined : 2}>
                      {q.question}
                    </Text>
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Ionicons
                        name={status === 'correct' ? 'checkmark-circle' : status === 'wrong' ? 'close-circle' : 'remove-circle-outline'}
                        size={22}
                        color={statusColor}
                      />
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color="#9CA3AF" />
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.reviewExpanded}>
                      {q.options?.map((opt, oi) => {
                        const isCorrectOpt = oi === correctIdx;
                        const isUserChoice = userAns === opt;
                        const isWrong = isUserChoice && !userCorrect;
                        return (
                          <View key={oi} style={[styles.reviewOption, {
                            backgroundColor: isCorrectOpt ? '#D1FAE5' : isWrong ? '#FEE2E2' : '#F9FAFB',
                            borderColor: isCorrectOpt ? '#059669' : isWrong ? '#DC2626' : '#E5E7EB',
                          }]}>
                            <View style={[styles.optionLetter, {
                              backgroundColor: isCorrectOpt ? '#059669' : isWrong ? '#DC2626' : '#E5E7EB',
                            }]}>
                              <Text style={[styles.optionLetterText, { color: (isCorrectOpt || isWrong) ? '#FFFFFF' : '#6B7280' }]}>
                                {OPTION_LABELS[oi]}
                              </Text>
                            </View>
                            <Text style={[styles.reviewOptText, { color: isCorrectOpt ? '#065F46' : isWrong ? '#991B1B' : '#374151', flex: 1 }]}>
                              {opt}
                            </Text>
                            {isCorrectOpt && <Ionicons name="checkmark-circle" size={15} color="#059669" />}
                            {isWrong && <Ionicons name="close-circle" size={15} color="#DC2626" />}
                          </View>
                        );
                      })}
                      {(q.solution || q.tip) && (
                        <View style={styles.solutionBox}>
                          <View style={styles.solutionHeader}>
                            <Ionicons name="bulb" size={13} color="#4F46E5" />
                            <Text style={styles.solutionLabel}>Explanation</Text>
                          </View>
                          {q.solution && <Text style={styles.solutionText}>{q.solution}</Text>}
                          {q.tip && <Text style={styles.tipText}>💡 {q.tip}</Text>}
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ════════════════════════════════════
     QUIZ SCREEN — One question at a time
  ════════════════════════════════════ */
  const q = questions[currentIndex]!;
  const userAns = answers[currentIndex];
  const isLastQ = currentIndex === questions.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.quizHeader, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 10 }]}
      >
        <View style={styles.quizHeaderBlob1} />
        <View style={styles.quizHeaderBlob2} />

        <View style={styles.quizHeaderRow}>
          <Pressable
            style={styles.qCloseBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={styles.qHeaderCenter}>
            <Text style={styles.qHeaderTitle} numberOfLines={1}>
              {APP_NAME}
            </Text>
            <Text style={styles.qHeaderSub}>
              Question {currentIndex + 1} of {questions.length}
            </Text>
          </View>

          <View style={[styles.qTimerPill, { backgroundColor: isLowTime ? '#DC2626' : 'rgba(255,255,255,0.2)' }]}>
            {isLowTime && <Ionicons name="alert-circle" size={11} color="#FFFFFF" />}
            <Text style={styles.qTimerText}>{formatTime(timeLeft)}</Text>
          </View>
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {questions.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                {
                  backgroundColor: i < currentIndex
                    ? 'rgba(255,255,255,0.9)'
                    : i === currentIndex
                    ? '#FFFFFF'
                    : 'rgba(255,255,255,0.3)',
                  width: i === currentIndex ? 22 : 7,
                },
              ]}
            />
          ))}
        </View>

        {/* Progress bar */}
        <View style={styles.quizProgressTrack}>
          <View style={[styles.quizProgressFill, {
            width: `${Math.max(2, ((currentIndex + (userAns ? 1 : 0)) / questions.length) * 100)}%` as any,
          }]} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.quizScroll, { paddingBottom: 200 }]}
      >
        {/* Question card */}
        <View style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.questionCardTop}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.qNumBadge}>
              <Text style={styles.qNumBadgeText}>Q {currentIndex + 1}</Text>
            </LinearGradient>
            <View style={[styles.mcqPill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.mcqPillText, { color: colors.mutedForeground }]}>MCQ</Text>
            </View>
          </View>
          <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>
          {chapterName && (
            <Text style={[styles.questionMeta, { color: colors.mutedForeground }]}>
              {chapterName.split('|||')[0] || chapterName}
            </Text>
          )}
        </View>

        {/* Options */}
        <View style={styles.optionsWrap}>
          {(q.options ?? []).map((opt, oi) => {
            const label = OPTION_LABELS[oi] ?? String(oi + 1);
            const isSelected = userAns === opt;

            return (
              <Pressable
                key={oi}
                style={[
                  styles.option,
                  {
                    backgroundColor: isSelected ? '#EEF2FF' : colors.card,
                    borderColor: isSelected ? '#4F46E5' : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => setAnswer(opt)}
              >
                {isSelected ? (
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.optionLetter}>
                    <Text style={[styles.optionLetterText, { color: '#FFFFFF' }]}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.optionLetter, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.optionLetterText, { color: colors.mutedForeground }]}>{label}</Text>
                  </View>
                )}
                <Text style={[styles.optionText, { color: colors.text, fontWeight: isSelected ? '700' : '400' }]}>
                  {opt}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4F46E5" />}
              </Pressable>
            );
          })}
        </View>

        {/* Skip hint */}
        {!userAns && (
          <Pressable style={styles.skipHint} onPress={goNext}>
            <Text style={[styles.skipHintText, { color: colors.mutedForeground }]}>
              Skip this question →
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── FIXED BOTTOM — Next / Submit ── */}
      <View style={[styles.bottomNav, {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
      }]}>
        {/* Answered indicator */}
        <View style={styles.bottomInfo}>
          <Text style={[styles.bottomInfoText, { color: colors.mutedForeground }]}>
            {answeredCount} of {questions.length} answered
          </Text>
          <Text style={[styles.bottomInfoPct, { color: '#4F46E5' }]}>
            {Math.round((answeredCount / questions.length) * 100)}%
          </Text>
        </View>

        {isLastQ ? (
          <Pressable
            style={[styles.nextBtn, { opacity: submitting ? 0.6 : 1 }]}
            onPress={() => setShowSubmitModal(true)}
            disabled={submitting}
          >
            <LinearGradient
              colors={['#059669', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGrad}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.nextBtnText}>Submit & View Results</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextBtn, { opacity: userAns ? 1 : 0.55 }]}
            onPress={userAns ? goNext : undefined}
          >
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGrad}
            >
              <Text style={styles.nextBtnText}>
                {userAns ? 'Next Question' : 'Select an option'}
              </Text>
              {userAns && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* ── SUBMIT MODAL ── */}
      <Modal
        visible={showSubmitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSubmitModal(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />

            {/* KP branding in modal */}
            <View style={styles.modalBrand}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.modalBrandIcon}>
                <Ionicons name="school" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.modalBrandText, { color: colors.text }]}>{APP_NAME}</Text>
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit Test?</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              {answeredCount} of {questions.length} questions answered
              {questions.length - answeredCount > 0 && (
                <Text style={{ color: '#EF4444', fontWeight: '700' }}>
                  {' · '}{questions.length - answeredCount} unanswered
                </Text>
              )}
            </Text>

            <View style={styles.modalStats}>
              {[
                { label: 'Answered', val: answeredCount, color: '#059669', bg: '#D1FAE5' },
                { label: 'Unanswered', val: questions.length - answeredCount, color: '#DC2626', bg: '#FEE2E2' },
              ].map(({ label, val, color, bg }) => (
                <View key={label} style={[styles.modalStatBox, { backgroundColor: bg }]}>
                  <Text style={[styles.modalStatVal, { color }]}>{val}</Text>
                  <Text style={[styles.modalStatLabel, { color }]}>{label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[styles.modalSubmitBtn, { opacity: submitting ? 0.65 : 1 }]}
              onPress={doSubmit}
              disabled={submitting}
            >
              <LinearGradient
                colors={['#059669', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalSubmitBtnGrad}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.modalSubmitBtnText}>
                  {submitting ? 'Submitting…' : 'Yes, Submit & See Results'}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowSubmitModal(false)}
            >
              <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Continue Answering</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  errorSub: { fontSize: 14, textAlign: 'center' },
  actionBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  actionBtnGrad: { paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  /* ── Quiz header ── */
  quizHeader: {
    paddingHorizontal: 16, paddingBottom: 14,
    overflow: 'hidden', gap: 10,
  },
  quizHeaderBlob1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -40,
  },
  quizHeaderBlob2: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -20,
  },
  quizHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qCloseBtn: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  qHeaderCenter: { flex: 1 },
  qHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  qHeaderSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  qTimerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  qTimerText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  progressDots: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap',
  },
  progressDot: { height: 7, borderRadius: 4 },
  quizProgressTrack: {
    height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden',
  },
  quizProgressFill: {
    height: 3, borderRadius: 2, backgroundColor: '#FFFFFF',
  },

  /* ── Quiz scroll ── */
  quizScroll: { padding: 16, gap: 12 },

  /* ── Question card ── */
  questionCard: {
    borderRadius: 22, borderWidth: 1, padding: 18,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  questionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  qNumBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  qNumBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  mcqPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  mcqPillText: { fontSize: 11, fontWeight: '600' },
  questionText: { fontSize: 16, lineHeight: 26, fontWeight: '500' },
  questionMeta: { fontSize: 11, marginTop: 10 },

  /* ── Options ── */
  optionsWrap: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 18, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  optionLetter: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optionLetterText: { fontSize: 14, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 15, lineHeight: 21 },
  skipHint: { alignItems: 'center', paddingVertical: 8 },
  skipHintText: { fontSize: 13 },

  /* ── Bottom nav ── */
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 8,
  },
  bottomInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomInfoText: { fontSize: 12 },
  bottomInfoPct: { fontSize: 13, fontWeight: '700' },
  nextBtn: { borderRadius: 18, overflow: 'hidden' },
  nextBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 17,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36, gap: 0,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 20,
  },
  modalBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 16 },
  modalBrandIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modalBrandText: { fontSize: 18, fontWeight: '800' },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  modalSub: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modalStatBox: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  modalStatVal: { fontSize: 24, fontWeight: '800' },
  modalStatLabel: { fontSize: 11 },
  modalSubmitBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  modalSubmitBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16,
  },
  modalSubmitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' },
  modalCancelBtnText: { fontSize: 15, fontWeight: '600' },

  /* ══════════════════════════════
     RESULT SCREEN
  ══════════════════════════════ */
  resultHeader: {
    paddingHorizontal: 24, paddingBottom: 32,
    alignItems: 'center', gap: 10,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  resultHBlob1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60,
  },
  resultHBlob2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -40,
  },

  /* KP brand in result header */
  kpBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'flex-start', marginBottom: 4 },
  kpLogoWrap: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  kpName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  kpTagline: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  kpDivider: {
    alignSelf: 'stretch', height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4,
  },

  /* Score circle */
  scoreCircleWrap: { alignItems: 'center', position: 'relative', marginTop: 8 },
  scoreCircleOuter: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  scoreCircleInner: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  scoreCirclePct: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', lineHeight: 42 },
  scoreCircleLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  gradeBadge: {
    position: 'absolute', bottom: -8, right: -16,
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  gradeText: { fontSize: 16, fontWeight: '900' },
  resultStatusText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  kpMetaStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  kpMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  kpMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },

  /* ── Marksheet ── */
  marksheet: {
    margin: 16, borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 6,
    overflow: 'hidden',
  },
  marksheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  marksheetTitle: { fontSize: 12, fontWeight: '800', color: '#374151', letterSpacing: 1 },
  marksheetBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  marksheetBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  marksheetRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1,
  },
  marksheetRowLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  marksheetRowValue: { fontSize: 13, color: '#111827', fontWeight: '700', flex: 1, textAlign: 'right' },

  /* Score table */
  scoreTable: { padding: 16, gap: 12 },
  scoreTableTitle: { fontSize: 11, fontWeight: '800', color: '#374151', letterSpacing: 1 },
  scoreTableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scoreCell: {
    width: '30%', flex: 1, minWidth: 80, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 3,
  },
  scoreCellVal: { fontSize: 22, fontWeight: '900' },
  scoreCellLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  /* Grade row */
  gradeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 16, padding: 16, borderRadius: 18, borderWidth: 1.5,
  },
  gradeRowLabel: { fontSize: 15, fontWeight: '800' },
  gradeRowSub: { fontSize: 12, marginTop: 2 },
  gradeCircle: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  gradeCircleText: { fontSize: 20, fontWeight: '900' },

  /* Buttons */
  resultActions: { flexDirection: 'row', gap: 12, padding: 16, paddingTop: 4 },
  resultBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5,
  },
  resultBtnOutlineText: { fontSize: 14, fontWeight: '700' },
  resultBtnFill: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  resultBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 14,
  },
  resultBtnFillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  /* KP footer */
  kpFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  kpFooterLogoWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  kpFooterText: { fontSize: 12, color: '#6B7280' },

  /* ── Review section ── */
  reviewSection: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  reviewSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  reviewSectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  reviewCard: {
    borderRadius: 18, padding: 14, borderWidth: 1.5, marginBottom: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewQBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  reviewQBadgeNum: { fontSize: 12, fontWeight: '800' },
  reviewQuestion: { fontSize: 13, lineHeight: 19, flex: 1 },
  reviewExpanded: { marginTop: 14, gap: 8 },
  reviewOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12, borderWidth: 1,
  },
  reviewOptText: { fontSize: 13, lineHeight: 18 },
  solutionBox: {
    borderRadius: 14, padding: 12, gap: 6, backgroundColor: '#EEF2FF',
  },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  solutionLabel: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  solutionText: { fontSize: 13, lineHeight: 20, color: '#374151' },
  tipText: { fontSize: 12, lineHeight: 18, color: '#6B7280' },
});
