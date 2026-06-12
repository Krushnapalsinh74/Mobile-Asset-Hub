import { useApp } from '@/context/AppContext';
import type { SavedQuestion } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi } from '@/services/api';
import type { Question } from '@/services/api';
import { clearQuestions, loadQuestions } from '@/store/questionStore';
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

function makeQId(question: string): string {
  let h = 0;
  for (let i = 0; i < question.length; i++) {
    h = (Math.imul(31, h) + question.charCodeAt(i)) | 0;
  }
  return `q${Math.abs(h)}`;
}

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
  const { sessionId, questionsJson, subjectName, chapterName } = useLocalSearchParams<{
    sessionId?: string;
    questionsJson?: string;
    subjectId: string;
    subjectName: string;
    chapterId: string;
    chapterName: string;
  }>();
  const {
    studentName, boardId, boardName, standardId, standardName,
    addTestResult, saveQuestion, unsaveQuestion, savedQuestions,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const questions: Question[] = useMemo(() => {
    // Primary: load from in-memory store via sessionId (avoids URL length limits)
    if (sessionId) {
      const stored = loadQuestions(sessionId);
      if (stored && stored.length > 0) {
        clearQuestions(sessionId);
        return stored;
      }
    }
    // Fallback: legacy questionsJson URL param
    try {
      const parsed = JSON.parse(questionsJson ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [sessionId, questionsJson]);

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

  const savedIds = useMemo(
    () => new Set(savedQuestions.map(q => q.id)),
    [savedQuestions],
  );

  const handleSaveQ = useCallback((q: Question) => {
    const id = makeQId(q.question);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (savedIds.has(id)) {
      unsaveQuestion(id);
    } else {
      const correctIdx = getCorrectOptionIndex(q);
      const sq: SavedQuestion = {
        id,
        question: q.question,
        options: q.options,
        answer: q.answer,
        solution: q.solution,
        explanation: q.explanation,
        tip: q.tip,
        subjectName: subjectName ?? '',
        chapterName: chapterName,
        correctOptionIndex: correctIdx,
        savedAt: Date.now(),
      };
      saveQuestion(sq);
    }
  }, [savedIds, saveQuestion, unsaveQuestion, subjectName, chapterName]);

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
     RESULT SCREEN — Knowledge Park Official
  ════════════════════════════════════ */
  if (submitted) {
    const gradeInfo = getGrade(percentage);
    const wrong = Math.max(0, questions.length - score - (questions.length - answeredCount));
    const skipped = questions.length - answeredCount;
    const isPassing = percentage >= 40;

    const passGrad: [string, string, string] = ['#064E3B', '#047857', '#059669'];
    const warnGrad: [string, string, string] = ['#78350F', '#92400E', '#B45309'];
    const failGrad: [string, string, string] = ['#3730A3', '#4F46E5', '#6366F1'];
    const headerGrad = percentage >= 70 ? passGrad : percentage >= 40 ? warnGrad : failGrad;
    const accentColor = percentage >= 70 ? '#059669' : percentage >= 40 ? '#D97706' : '#4F46E5';

    return (
      <View style={[styles.container, { backgroundColor: '#EDEEFF' }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

          {/* ══════════════════════════════════════
              CERTIFICATE HEADER
          ══════════════════════════════════════ */}
          <LinearGradient
            colors={headerGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.certHeader, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16 }]}
          >
            {/* decorative blobs */}
            <View style={styles.certBlob1} />
            <View style={styles.certBlob2} />

            {/* top bar — back + branding */}
            <View style={styles.certTopBar}>
              <Pressable style={styles.certBackBtn} onPress={() => router.replace('/subjects' as any)}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
              </Pressable>
              <View style={styles.certBranding}>
                <View style={styles.certLogoBox}>
                  <Ionicons name="school" size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.certBrandName}>{APP_NAME}</Text>
                  <Text style={styles.certBrandSub}>AI Assessment System</Text>
                </View>
              </View>
              <View style={[styles.certStatusBadge, {
                backgroundColor: isPassing ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
                borderColor: isPassing ? '#6EE7B7' : '#FCA5A5',
              }]}>
                <Text style={[styles.certStatusText, { color: isPassing ? '#A7F3D0' : '#FEE2E2' }]}>
                  {isPassing ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            </View>

            {/* separator */}
            <View style={styles.certSep} />

            {/* big score + grade */}
            <View style={styles.certScoreRow}>
              {/* percentage ring */}
              <View style={styles.certRingWrap}>
                <View style={styles.certRingOuter}>
                  <View style={styles.certRingInner}>
                    <Text style={styles.certPct}>{percentage}</Text>
                    <Text style={styles.certPctSym}>%</Text>
                  </View>
                </View>
              </View>

              {/* right info */}
              <View style={styles.certScoreRight}>
                <Text style={styles.certScoreLabel}>
                  {score} / {questions.length} correct
                </Text>
                <View style={styles.certProgressBar}>
                  <View style={[styles.certProgressFill, { width: `${percentage}%` as any, backgroundColor: isPassing ? '#6EE7B7' : '#FCA5A5' }]} />
                </View>
                <Text style={styles.certScoreSub}>
                  {answeredCount} attempted · {skipped} skipped · {wrong} wrong
                </Text>

                {/* grade pill */}
                <View style={[styles.certGradePill, { backgroundColor: gradeInfo.bg }]}>
                  <Text style={[styles.certGradeVal, { color: gradeInfo.color }]}>{gradeInfo.grade}</Text>
                  <Text style={[styles.certGradeSub, { color: gradeInfo.color }]}>GPA {gradeInfo.gpa}/10</Text>
                </View>
              </View>
            </View>

            {/* student meta row */}
            <View style={styles.certMeta}>
              {[
                { icon: 'person-outline', val: studentName || 'Student' },
                { icon: 'book-outline', val: subjectName },
                { icon: 'time-outline', val: formatTime(elapsed) },
              ].map((m, i) => (
                <View key={i} style={styles.certMetaChip}>
                  <Ionicons name={m.icon as any} size={10} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.certMetaText} numberOfLines={1}>{m.val}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* ══════════════════════════════════════
              OFFICIAL MARKSHEET CARD
          ══════════════════════════════════════ */}
          <View style={styles.marksheetCard}>

            {/* card top accent bar */}
            <LinearGradient
              colors={headerGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.cardAccentBar}
            />

            {/* card header */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardHeaderTitle}>OFFICIAL RESULT CARD</Text>
                <Text style={styles.cardHeaderSub}>Knowledge Park · AI Assessment</Text>
              </View>
              <View style={[styles.cardSeal, { borderColor: accentColor }]}>
                <Ionicons name="shield-checkmark" size={18} color={accentColor} />
              </View>
            </View>

            {/* ── STUDENT DETAILS TABLE ── */}
            <View style={styles.tableSection}>
              <Text style={styles.tableSectionTitle}>STUDENT DETAILS</Text>
              {[
                { label: 'Name', value: studentName || 'Student' },
                { label: 'Board', value: boardName || boardId || '—' },
                { label: 'Standard', value: standardName || standardId || '—' },
                { label: 'Subject', value: subjectName || '—' },
                { label: 'Chapter', value: (chapterName || '—').split('|||')[0] || '—' },
                { label: 'Date', value: getDateString() },
                { label: 'Duration', value: formatTime(elapsed) },
                { label: 'Test Type', value: 'MCQ — Multiple Choice' },
              ].map((row, i) => (
                <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? '#FAFAFA' : '#FFFFFF' }]}>
                  <Text style={styles.tableRowLabel}>{row.label}</Text>
                  <View style={styles.tableRowDivider} />
                  <Text style={styles.tableRowValue} numberOfLines={1}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* ── MARKS TABLE ── */}
            <View style={styles.marksSection}>
              <Text style={styles.tableSectionTitle}>MARKS SUMMARY</Text>

              {/* column headers */}
              <View style={styles.marksTableHead}>
                <Text style={styles.marksHeadCell}>CATEGORY</Text>
                <Text style={[styles.marksHeadCell, { textAlign: 'center' }]}>MARKS</Text>
                <Text style={[styles.marksHeadCell, { textAlign: 'right' }]}>STATUS</Text>
              </View>

              {[
                { label: 'Total Questions', marks: questions.length, icon: 'help-circle-outline', color: '#4F46E5' },
                { label: 'Attempted', marks: answeredCount, icon: 'pencil-outline', color: '#0284C7' },
                { label: 'Correct Answers', marks: score, icon: 'checkmark-circle-outline', color: '#059669' },
                { label: 'Wrong Answers', marks: wrong, icon: 'close-circle-outline', color: '#DC2626' },
                { label: 'Skipped', marks: skipped, icon: 'remove-circle-outline', color: '#D97706' },
              ].map((r, i) => (
                <View key={i} style={[styles.marksRow, { backgroundColor: i % 2 === 0 ? '#F9FAFB' : '#FFFFFF' }]}>
                  <View style={styles.marksRowLeft}>
                    <View style={[styles.marksRowIcon, { backgroundColor: r.color + '18' }]}>
                      <Ionicons name={r.icon as any} size={13} color={r.color} />
                    </View>
                    <Text style={styles.marksRowLabel}>{r.label}</Text>
                  </View>
                  <Text style={[styles.marksRowVal, { color: r.color }]}>{r.marks}</Text>
                  <View style={styles.marksRowBar}>
                    <View style={[styles.marksRowBarFill, {
                      width: `${Math.round((r.marks / questions.length) * 100)}%` as any,
                      backgroundColor: r.color,
                      opacity: 0.55,
                    }]} />
                  </View>
                </View>
              ))}

              {/* score row */}
              <View style={[styles.marksScoreRow, { backgroundColor: gradeInfo.bg, borderColor: gradeInfo.color + '30' }]}>
                <Text style={[styles.marksScoreLabel, { color: gradeInfo.color }]}>TOTAL SCORE</Text>
                <Text style={[styles.marksScorePct, { color: gradeInfo.color }]}>{percentage}%</Text>
              </View>
            </View>

            {/* ── GRADE PANEL ── */}
            <View style={[styles.gradePanel, { backgroundColor: gradeInfo.bg, borderColor: gradeInfo.color + '25' }]}>
              <View style={styles.gradePanelLeft}>
                <Text style={[styles.gradePanelTitle, { color: gradeInfo.color }]}>OVERALL GRADE</Text>
                <Text style={[styles.gradePanelGpa, { color: gradeInfo.color + 'CC' }]}>GPA: {gradeInfo.gpa} / 10.0</Text>
                <Text style={[styles.gradePanelStatus, { color: isPassing ? '#059669' : '#DC2626' }]}>
                  {isPassing ? '✓ PASSED' : '✗ NOT PASSED'}
                </Text>
              </View>
              <View style={[styles.gradeSeal, { borderColor: gradeInfo.color }]}>
                <Text style={[styles.gradeSealLetter, { color: gradeInfo.color }]}>{gradeInfo.grade}</Text>
              </View>
            </View>

            {/* ── ACTION BUTTONS ── */}
            <View style={styles.resultActions}>
              <Pressable
                style={[styles.resultBtnOutline, { borderColor: '#4F46E5' }]}
                onPress={() => router.replace('/subjects' as any)}
              >
                <Ionicons name="home-outline" size={15} color="#4F46E5" />
                <Text style={[styles.resultBtnOutlineText, { color: '#4F46E5' }]}>Home</Text>
              </Pressable>
              <Pressable style={styles.resultBtnFill} onPress={() => router.back()}>
                <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.resultBtnGrad}>
                  <Ionicons name="refresh" size={15} color="#FFF" />
                  <Text style={styles.resultBtnFillText}>Try Again</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* ── OFFICIAL FOOTER ── */}
            <View style={styles.certFooter}>
              <View style={styles.certFooterLine} />
              <View style={styles.certFooterContent}>
                <View style={[styles.certFooterLogo, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="school" size={13} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.certFooterTitle}>{APP_NAME} · AI Assessment System</Text>
                  <Text style={styles.certFooterSub}>
                    This result is officially generated and certified by the {APP_NAME} platform.
                  </Text>
                </View>
              </View>
              <Text style={styles.certFooterDate}>{getDateString()}</Text>
            </View>
          </View>

          {/* ══════════════════════════════════════
              QUESTION-WISE REVIEW
          ══════════════════════════════════════ */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewSectionHeader}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.reviewHeaderIcon}>
                <Ionicons name="list" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.reviewSectionTitle}>Question-wise Review</Text>
              <View style={[styles.reviewCountBadge, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.reviewCountText, { color: '#4F46E5' }]}>{questions.length} Qs</Text>
              </View>
            </View>

            {questions.map((q, index) => {
              const userAns = answers[index];
              const correctIdx = getCorrectOptionIndex(q);
              const userCorrect = userAns ? isAnswerCorrect(q, userAns) : false;
              const isExpanded = expandedReview.has(index);
              const status = userAns ? (userCorrect ? 'correct' : 'wrong') : 'skipped';
              const statusColor = status === 'correct' ? '#059669' : status === 'wrong' ? '#DC2626' : '#D97706';
              const statusBg = status === 'correct' ? '#D1FAE5' : status === 'wrong' ? '#FEE2E2' : '#FEF3C7';
              const statusIcon = status === 'correct' ? 'checkmark-circle' : status === 'wrong' ? 'close-circle' : 'remove-circle-outline';

              return (
                <View
                  key={index}
                  style={[styles.reviewCard, { borderLeftColor: statusColor, borderColor: '#F3F4F6' }]}
                >
                  <View style={styles.reviewCardHeader}>
                    <Pressable
                      style={styles.reviewCardExpandZone}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setExpandedReview(prev => {
                          const next = new Set(prev);
                          if (next.has(index)) next.delete(index); else next.add(index);
                          return next;
                        });
                      }}
                    >
                      <View style={[styles.reviewQNum, { backgroundColor: statusBg }]}>
                        <Text style={[styles.reviewQNumText, { color: statusColor }]}>{index + 1}</Text>
                      </View>
                      <Text style={styles.reviewQuestion} numberOfLines={isExpanded ? undefined : 2}>
                        {q.question}
                      </Text>
                      <View style={styles.reviewCardIcons}>
                        <Ionicons name={statusIcon as any} size={20} color={statusColor} />
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color="#9CA3AF" />
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSaveQ(q)}
                      hitSlop={10}
                      style={styles.saveQBtn}
                    >
                      <Ionicons
                        name={savedIds.has(makeQId(q.question)) ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={savedIds.has(makeQId(q.question)) ? '#4F46E5' : '#9CA3AF'}
                      />
                    </Pressable>
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
                            {isCorrectOpt && <Ionicons name="checkmark-circle" size={14} color="#059669" />}
                            {isWrong && <Ionicons name="close-circle" size={14} color="#DC2626" />}
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
                </View>
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

  /* ══════════════════════════════════════
     RESULT SCREEN — Certificate Header
  ══════════════════════════════════════ */
  certHeader: {
    paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden',
  },
  certBlob1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -70,
  },
  certBlob2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -30,
  },
  certTopBar: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 18,
  },
  certBackBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  certBranding: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  certLogoBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  certBrandName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  certBrandSub: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  certStatusBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  certStatusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  certSep: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20,
  },

  /* score row */
  certScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 },
  certRingWrap: { alignItems: 'center', justifyContent: 'center' },
  certRingOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  certRingInner: {
    flexDirection: 'row', alignItems: 'flex-end',
  },
  certPct: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', lineHeight: 40 },
  certPctSym: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 5 },
  certScoreRight: { flex: 1 },
  certScoreLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  certProgressBar: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginBottom: 6,
  },
  certProgressFill: { height: 6, borderRadius: 3 },
  certScoreSub: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 10 },
  certGradePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start',
  },
  certGradeVal: { fontSize: 16, fontWeight: '900' },
  certGradeSub: { fontSize: 10, fontWeight: '600' },

  /* meta row */
  certMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  certMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  certMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  /* ══════════════════════════════════════
     MARKSHEET CARD
  ══════════════════════════════════════ */
  marksheetCard: {
    marginHorizontal: 14, marginTop: -20, marginBottom: 14,
    borderRadius: 24, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10, shadowRadius: 24, elevation: 8,
    overflow: 'hidden',
  },
  cardAccentBar: { height: 4 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  cardHeaderTitle: { fontSize: 12, fontWeight: '800', color: '#374151', letterSpacing: 1.2 },
  cardHeaderSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  cardSeal: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },

  /* detail table */
  tableSection: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableSectionTitle: {
    fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.5,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  tableRowLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', width: 90 },
  tableRowDivider: { width: 1, height: 14, backgroundColor: '#E5E7EB', marginHorizontal: 10 },
  tableRowValue: { fontSize: 13, color: '#111827', fontWeight: '600', flex: 1 },

  /* marks table */
  marksSection: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  marksTableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 7,
    backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  marksHeadCell: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, flex: 1 },
  marksRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 9,
  },
  marksRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  marksRowIcon: {
    width: 24, height: 24, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  marksRowLabel: { fontSize: 12, color: '#374151', fontWeight: '500' },
  marksRowVal: { fontSize: 16, fontWeight: '800', width: 32, textAlign: 'center' },
  marksRowBar: {
    width: 60, height: 6, borderRadius: 3,
    backgroundColor: '#F3F4F6', overflow: 'hidden', marginLeft: 10,
  },
  marksRowBarFill: { height: 6, borderRadius: 3 },
  marksScoreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  marksScoreLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  marksScorePct: { fontSize: 22, fontWeight: '900' },

  /* grade panel */
  gradePanel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 14, padding: 16, borderRadius: 18, borderWidth: 1.5,
  },
  gradePanelLeft: { flex: 1 },
  gradePanelTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  gradePanelGpa: { fontSize: 12, marginTop: 3 },
  gradePanelStatus: { fontSize: 12, fontWeight: '700', marginTop: 5 },
  gradeSeal: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  gradeSealLetter: { fontSize: 26, fontWeight: '900' },

  /* action buttons */
  resultActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  resultBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5,
  },
  resultBtnOutlineText: { fontSize: 14, fontWeight: '700' },
  resultBtnFill: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  resultBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13,
  },
  resultBtnFillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  /* official footer */
  certFooter: {
    paddingHorizontal: 18, paddingBottom: 18, paddingTop: 4,
  },
  certFooterLine: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 14 },
  certFooterContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  certFooterLogo: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  certFooterTitle: { fontSize: 11, fontWeight: '700', color: '#374151' },
  certFooterSub: { fontSize: 10, color: '#9CA3AF', lineHeight: 15, marginTop: 2 },
  certFooterDate: { fontSize: 10, color: '#9CA3AF', textAlign: 'right' },

  /* ══════════════════════════════════════
     REVIEW SECTION
  ══════════════════════════════════════ */
  reviewSection: { paddingHorizontal: 14, paddingBottom: 8 },
  reviewSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  reviewHeaderIcon: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewSectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', flex: 1 },
  reviewCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  reviewCountText: { fontSize: 11, fontWeight: '700' },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, borderWidth: 1,
    borderLeftWidth: 3, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  reviewCardExpandZone: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewQNum: {
    minWidth: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    paddingHorizontal: 5,
  },
  reviewQNumText: { fontSize: 11, fontWeight: '800' },
  reviewQuestion: { fontSize: 13, lineHeight: 19, flex: 1, color: '#111827' },
  reviewCardIcons: { alignItems: 'center', gap: 4 },
  saveQBtn: { padding: 4, marginTop: 2 },
  reviewExpanded: { marginTop: 12, gap: 7 },
  reviewOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12, borderWidth: 1,
  },
  reviewOptText: { fontSize: 13, lineHeight: 18 },
  solutionBox: {
    borderRadius: 12, padding: 12, gap: 5, backgroundColor: '#EEF2FF', marginTop: 4,
  },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  solutionLabel: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  solutionText: { fontSize: 13, lineHeight: 20, color: '#374151' },
  tipText: { fontSize: 12, lineHeight: 18, color: '#6B7280' },
});
