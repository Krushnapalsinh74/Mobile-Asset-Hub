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
  const navScrollRef = useRef<ScrollView>(null);

  const questions: Question[] = useMemo(() => {
    try {
      const parsed = JSON.parse(questionsJson ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [questionsJson]);

  const totalTime = questions.length * 90;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [elapsed, setElapsed] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [expandedReview, setExpandedReview] = useState<Set<number>>(new Set());

  const doSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    setShowSubmitModal(false);

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
  }, [submitting, submitted, questions, answers, studentName, boardId, boardName, standardId, standardName, subjectName, chapterName, addTestResult]);

  // Countdown timer
  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          doSubmit();
          return 0;
        }
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

  const toggleFlag = () => {
    Haptics.selectionAsync();
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const goTo = (i: number) => {
    Haptics.selectionAsync();
    setCurrentIndex(i);
    navScrollRef.current?.scrollTo({ x: i * 40, animated: true });
  };

  const goNext = () => { if (currentIndex < questions.length - 1) goTo(currentIndex + 1); };
  const goPrev = () => { if (currentIndex > 0) goTo(currentIndex - 1); };

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
        <Pressable onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.actionBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const percentage = submitted ? Math.round((score / questions.length) * 100) : 0;
  const isGood = percentage >= 70;

  // ── RESULT SCREEN ──
  if (submitted) {
    const resultEmoji = percentage >= 90 ? '🏆' : percentage >= 70 ? '🌟' : percentage >= 50 ? '💪' : '📚';
    const resultMsg = percentage >= 90 ? 'Outstanding performance!'
      : percentage >= 70 ? 'Great job! Keep it up.'
      : percentage >= 50 ? 'Good effort, keep practicing!'
      : 'Keep studying, you can do it!';

    const gradColors: [string, string] = isGood
      ? ['#065F46', '#10B981']
      : percentage >= 50
      ? ['#92400E', '#F59E0B']
      : ['#312E81', '#4F46E5'];

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* Result header */}
          <LinearGradient
            colors={gradColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.resultHeader, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 24 }]}
          >
            <View style={styles.resultEmojiWrap}>
              <Text style={styles.resultEmoji}>{resultEmoji}</Text>
            </View>
            <Text style={styles.resultTitle}>Test Complete!</Text>
            <Text style={styles.resultScore}>{score}/{questions.length}</Text>
            <Text style={styles.resultPercent}>{percentage}% Correct</Text>
            <Text style={styles.resultMsg}>{resultMsg}</Text>
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
          </LinearGradient>

          {/* Stats grid */}
          <View style={[styles.statsGrid, { paddingHorizontal: 20 }]}>
            {[
              { label: 'Correct', val: score, color: '#10B981', bg: '#D1FAE5' },
              { label: 'Wrong', val: questions.length - score - (answeredCount - score < 0 ? 0 : 0), color: '#EF4444', bg: '#FEE2E2' },
              { label: 'Skipped', val: questions.length - answeredCount, color: '#F59E0B', bg: '#FEF3C7' },
              { label: 'Score', val: `${percentage}%`, color: colors.primary, bg: colors.primaryLight },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <Text style={[styles.statCardVal, { color: s.color }]}>{s.val}</Text>
                <Text style={[styles.statCardLabel, { color: s.color }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={[styles.resultActions, { paddingHorizontal: 20 }]}>
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

          {/* Question review */}
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>Question Review</Text>
            {questions.map((q, index) => {
              const userAns = answers[index];
              const correctIdx = getCorrectOptionIndex(q);
              const userCorrect = userAns ? isAnswerCorrect(q, userAns) : false;
              const isExpanded = expandedReview.has(index);

              return (
                <Pressable
                  key={index}
                  style={[styles.reviewCard, {
                    backgroundColor: colors.card,
                    borderColor: userAns
                      ? (userCorrect ? '#10B981' : '#EF4444')
                      : colors.border,
                    borderWidth: userAns ? 1.5 : 1,
                  }]}
                  onPress={() => {
                    setExpandedReview(prev => {
                      const next = new Set(prev);
                      if (next.has(index)) next.delete(index); else next.add(index);
                      return next;
                    });
                  }}
                >
                  <View style={styles.reviewCardHeader}>
                    <View style={[styles.qNumBadge, {
                      backgroundColor: userAns ? (userCorrect ? '#D1FAE5' : '#FEE2E2') : colors.secondary,
                    }]}>
                      <Text style={[styles.qNumText, {
                        color: userAns ? (userCorrect ? '#065F46' : '#991B1B') : colors.mutedForeground,
                      }]}>Q{index + 1}</Text>
                    </View>
                    <Text style={[styles.reviewQuestion, { color: colors.text, flex: 1 }]} numberOfLines={isExpanded ? undefined : 2}>
                      {q.question}
                    </Text>
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      {userAns ? (
                        <Ionicons
                          name={userCorrect ? 'checkmark-circle' : 'close-circle'}
                          size={22}
                          color={userCorrect ? '#10B981' : '#EF4444'}
                        />
                      ) : (
                        <Ionicons name="remove-circle-outline" size={22} color="#F59E0B" />
                      )}
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.mutedForeground}
                      />
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.reviewExpanded}>
                      {q.options?.map((opt, oi) => {
                        const isCorrectOpt = oi === correctIdx;
                        const isUserChoice = userAns === opt;
                        const isWrong = isUserChoice && !userCorrect;

                        return (
                          <View
                            key={oi}
                            style={[styles.reviewOption, {
                              backgroundColor: isCorrectOpt ? '#D1FAE5' : isWrong ? '#FEE2E2' : colors.background,
                              borderColor: isCorrectOpt ? '#10B981' : isWrong ? '#EF4444' : colors.border,
                              borderWidth: (isCorrectOpt || isWrong) ? 1.5 : 1,
                            }]}
                          >
                            <View style={[styles.optionLetter, {
                              backgroundColor: isCorrectOpt ? '#10B981' : isWrong ? '#EF4444' : colors.secondary,
                            }]}>
                              <Text style={[styles.optionLetterText, {
                                color: (isCorrectOpt || isWrong) ? '#FFFFFF' : colors.mutedForeground,
                              }]}>{OPTION_LABELS[oi]}</Text>
                            </View>
                            <Text style={[styles.reviewOptText, {
                              color: isCorrectOpt ? '#065F46' : isWrong ? '#991B1B' : colors.text,
                              flex: 1,
                            }]}>{opt}</Text>
                            {isCorrectOpt && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                            {isWrong && <Ionicons name="close-circle" size={16} color="#EF4444" />}
                          </View>
                        );
                      })}
                      {(q.solution || q.tip) && (
                        <View style={[styles.solutionBox, { backgroundColor: colors.primaryLight }]}>
                          <View style={styles.solutionHeader}>
                            <Ionicons name="bulb" size={13} color={colors.primary} />
                            <Text style={[styles.solutionLabel, { color: colors.primary }]}>Explanation</Text>
                          </View>
                          {q.solution && <Text style={[styles.solutionText, { color: colors.text }]}>{q.solution}</Text>}
                          {q.tip && <Text style={[styles.tipText, { color: colors.mutedForeground }]}>💡 {q.tip}</Text>}
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

  // ── QUIZ SCREEN ──
  const q = questions[currentIndex]!;
  const userAns = answers[currentIndex];
  const isFlagged = flagged.has(currentIndex);
  const isLastQ = currentIndex === questions.length - 1;
  const answerPct = questions.length > 0 ? answeredCount / questions.length : 0;

  const statusFor = (i: number) => {
    if (i === currentIndex) return 'current';
    if (flagged.has(i)) return 'flagged';
    if (answers[i] !== undefined) return 'answered';
    return 'unanswered';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── STICKY HEADER ── */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 8,
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={[styles.closeCircle, { backgroundColor: colors.secondary }]}>
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {chapterName || subjectName}
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Q {currentIndex + 1} of {questions.length}
            </Text>
          </View>
          <View style={[
            styles.timerPill,
            {
              backgroundColor: isLowTime ? '#FEE2E2' : colors.primaryLight,
              borderColor: isLowTime ? '#EF4444' : 'transparent',
            },
          ]}>
            {isLowTime && <Ionicons name="alert-circle" size={12} color="#EF4444" />}
            <Text style={[styles.timerText, { color: isLowTime ? '#EF4444' : colors.primary }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarTrack, { backgroundColor: colors.border, marginTop: 8 }]}>
          <View style={[styles.progressBarFill, {
            backgroundColor: answerPct === 1 ? '#10B981' : colors.primary,
            width: `${Math.max(2, answerPct * 100)}%` as any,
          }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabelText, { color: colors.mutedForeground }]}>
            {answeredCount}/{questions.length} answered
          </Text>
          <Text style={[styles.progressLabelText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {Math.round(answerPct * 100)}%
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160, paddingTop: 16, paddingHorizontal: 16 }}
      >
        {/* Question card */}
        <View style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.questionCardTop}>
            <View style={[styles.qNumBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.qNumText, { color: colors.primary }]}>Q{currentIndex + 1}</Text>
            </View>
            <Pressable onPress={toggleFlag} style={[styles.flagBtn, { backgroundColor: isFlagged ? '#FEF3C7' : colors.secondary }]}>
              <Ionicons
                name={isFlagged ? 'flag' : 'flag-outline'}
                size={15}
                color={isFlagged ? '#F59E0B' : colors.mutedForeground}
              />
            </Pressable>
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
                    backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => setAnswer(opt)}
              >
                <View style={[styles.optionLetter, {
                  backgroundColor: isSelected ? colors.primary : colors.secondary,
                }]}>
                  <Text style={[styles.optionLetterText, { color: isSelected ? '#FFFFFF' : colors.mutedForeground }]}>
                    {label}
                  </Text>
                </View>
                <Text style={[styles.optionText, {
                  color: colors.text,
                  fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                }]}>{opt}</Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Question navigator */}
        <View style={[styles.navigatorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.navigatorTitle, { color: colors.mutedForeground }]}>Question Navigator</Text>
          <ScrollView
            ref={navScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navigatorRow}
          >
            {questions.map((_, i) => {
              const s = statusFor(i);
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.navBubble,
                    {
                      backgroundColor:
                        s === 'current' ? colors.primary
                        : s === 'answered' ? '#10B981'
                        : s === 'flagged' ? '#F59E0B'
                        : colors.secondary,
                      transform: s === 'current' ? [{ scale: 1.15 }] : [],
                      shadowColor: s === 'current' ? colors.primary : 'transparent',
                      shadowOpacity: s === 'current' ? 0.35 : 0,
                      shadowRadius: 8,
                      elevation: s === 'current' ? 4 : 0,
                    },
                  ]}
                  onPress={() => goTo(i)}
                >
                  <Text style={[styles.navBubbleText, {
                    color: s === 'unanswered' ? colors.mutedForeground : '#FFFFFF',
                  }]}>{i + 1}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.navLegend}>
            {[
              { color: colors.primary, label: 'Current' },
              { color: '#10B981', label: 'Answered' },
              { color: '#F59E0B', label: 'Flagged' },
              { color: colors.secondary, label: 'Not visited' },
            ].map(({ color, label }) => (
              <View key={label} style={styles.navLegendItem}>
                <View style={[styles.navLegendDot, { backgroundColor: color }]} />
                <Text style={[styles.navLegendText, { color: colors.mutedForeground }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── FIXED BOTTOM NAVIGATION ── */}
      <View style={[
        styles.bottomNav,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
        },
      ]}>
        <View style={styles.navBtns}>
          <Pressable
            style={[styles.navBtn, {
              borderColor: colors.border,
              opacity: currentIndex === 0 ? 0.4 : 1,
              backgroundColor: colors.card,
            }]}
            onPress={goPrev}
            disabled={currentIndex === 0}
          >
            <Ionicons name="arrow-back" size={16} color={colors.text} />
            <Text style={[styles.navBtnText, { color: colors.text }]}>Previous</Text>
          </Pressable>

          {isLastQ ? (
            <Pressable
              style={[styles.navBtn, styles.navBtnPrimary, { backgroundColor: colors.primary }]}
              onPress={() => setShowSubmitModal(true)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={[styles.navBtnText, { color: '#FFFFFF' }]}>Submit</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.navBtn, {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary + '40',
              }]}
              onPress={goNext}
            >
              <Text style={[styles.navBtnText, { color: colors.primary }]}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {isLastQ && (
          <Pressable
            style={[styles.submitAllBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowSubmitModal(true)}
          >
            <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
            <Text style={styles.submitAllBtnText}>Submit All Answers</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit Test?</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              {answeredCount} of {questions.length} questions answered
              {questions.length - answeredCount > 0 && (
                <>
                  {' · '}
                  <Text style={{ color: '#EF4444', fontFamily: 'Inter_600SemiBold' }}>
                    {questions.length - answeredCount} unanswered
                  </Text>
                </>
              )}
            </Text>

            <View style={styles.modalStats}>
              {[
                { label: 'Answered', val: answeredCount, color: '#10B981', bg: '#D1FAE5' },
                { label: 'Unanswered', val: questions.length - answeredCount, color: '#EF4444', bg: '#FEE2E2' },
                { label: 'Flagged', val: flagged.size, color: '#F59E0B', bg: '#FEF3C7' },
              ].map(({ label, val, color, bg }) => (
                <View key={label} style={[styles.modalStatBox, { backgroundColor: bg }]}>
                  <Text style={[styles.modalStatVal, { color }]}>{val}</Text>
                  <Text style={[styles.modalStatLabel, { color }]}>{label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.65 : 1 }]}
              onPress={doSubmit}
              disabled={submitting}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.modalSubmitBtnText}>
                {submitting ? 'Submitting…' : 'Yes, Submit Test'}
              </Text>
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
  errorTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  errorSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  actionBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 15 },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  closeCircle: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  timerText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  progressBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: 4, borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressLabelText: { fontSize: 10, fontFamily: 'Inter_400Regular' },

  // Question card
  questionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  questionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  qNumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  qNumText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  flagBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  questionText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 24, color: '#111827' },
  questionMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 8 },

  // Options
  optionsWrap: { gap: 10, marginBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionLetterText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },

  // Navigator
  navigatorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  navigatorTitle: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  navigatorRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  navBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBubbleText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  navLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  navLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  navLegendDot: { width: 10, height: 10, borderRadius: 3 },
  navLegendText: { fontSize: 10, fontFamily: 'Inter_400Regular' },

  // Bottom navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  navBtns: { flexDirection: 'row', gap: 10 },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  navBtnPrimary: { borderWidth: 0 },
  navBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  submitAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitAllBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  // Submit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    gap: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 8 },
  modalSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modalStatBox: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  modalStatVal: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  modalStatLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  modalSubmitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  modalCancelBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalCancelBtnText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Result screen
  resultHeader: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: -20,
  },
  resultEmojiWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultEmoji: { fontSize: 44 },
  resultTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold', marginBottom: 8 },
  resultScore: { fontSize: 48, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Inter_700Bold', lineHeight: 54 },
  resultPercent: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_600SemiBold', fontWeight: '600', marginTop: 4 },
  resultMsg: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center' },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resultMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular' },
  resultMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.4)' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 30,
    paddingBottom: 8,
  },
  statCard: { flex: 1, minWidth: '44%', borderRadius: 18, padding: 16, alignItems: 'center', gap: 4 },
  statCardVal: { fontSize: 26, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  statCardLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  resultActions: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  resultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 18,
  },
  resultBtnText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  reviewTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 12, marginTop: 8 },
  reviewCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewQuestion: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  reviewExpanded: { marginTop: 14, gap: 8 },
  reviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewOptText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },

  // Explanation
  solutionBox: {
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  solutionLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  solutionText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  tipText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
