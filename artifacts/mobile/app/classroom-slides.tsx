import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MathText from '@/components/MathText';
import { loadQuestions } from '@/store/questionStore';
import type { Question } from '@/services/api';

type ThemeMode = 'dark' | 'light';

export default function ClassroomSlidesScreen() {
  const { sessionId = '', title = 'Classroom Slide Deck', subject = 'Subject' } =
    useLocalSearchParams<{ sessionId: string; title: string; subject: string }>();

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 800;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0); // -2, 0, +4, +8
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [showSlidePicker, setShowSlidePicker] = useState(false);

  useEffect(() => {
    if (sessionId) {
      const loaded = loadQuestions(sessionId);
      if (loaded && loaded.length > 0) {
        setQuestions(loaded);
        return;
      }
    }
  }, [sessionId]);

  // Reset slide reveals when question index changes
  useEffect(() => {
    setShowAnswer(false);
    setShowExplanation(false);
    setTimerActive(false);
    setTimerSeconds(null);
  }, [currentIndex]);

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  // Keyboard navigation for desktop / projector laptops
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(prev + 1, Math.max(0, questions.length - 1)));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAnswer((prev) => !prev);
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowExplanation((prev) => !prev);
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setShowOptions((prev) => !prev);
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questions.length]);

  const currentQ = questions[currentIndex];
  const isDark = theme === 'dark';

  const cleanOption = (text: string) => {
    return text.replace(/^(?:\(?[A-Ea-e]\)?[.:\-]\s*|\(?[A-Ea-e]\)\s*)/, '').trim();
  };

  const getCorrectLetter = (q?: Question): string | null => {
    if (!q || !q.answer) return null;
    const trimmed = q.answer.trim();
    const match = trimmed.match(/^([A-E])(?:[).:]|$)/i);
    if (match?.[1]) return match[1].toUpperCase();
    if (q.options?.length) {
      const idx = q.options.findIndex(
        (o) => cleanOption(o).toLowerCase() === cleanOption(trimmed).toLowerCase()
      );
      if (idx >= 0) return String.fromCharCode(65 + idx);
    }
    return null;
  };

  const correctLetter = getCorrectLetter(currentQ);

  const startTimer = (secs: number) => {
    setTimerSeconds(secs);
    setTimerActive(true);
  };

  if (!questions.length) {
    return (
      <View style={[styles.root, isDark ? styles.rootDark : styles.rootLight, { paddingTop: insets.top + 40 }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="tv-outline" size={64} color={isDark ? '#8E82A0' : '#A8988C'} />
          <Text style={[styles.emptyTitle, isDark ? styles.textDark : styles.textLight]}>
            No Questions in Slide Deck
          </Text>
          <Text style={[styles.emptySub, isDark ? styles.subDark : styles.subLight]}>
            Return to the Question Paper Builder and tap &ldquo;Slides&rdquo; to launch this presentation mode.
          </Text>
          <Pressable
            style={styles.backActionBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#FFF" />
            <Text style={styles.backActionBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const promptSize = 20 + fontSizeOffset + (isWide ? 4 : 0);
  const optionSize = 16 + fontSizeOffset + (isWide ? 2 : 0);

  return (
    <View style={[styles.root, isDark ? styles.rootDark : styles.rootLight, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* ── TOP CONTROL BAR ── */}
      <View style={[styles.topBar, isDark ? styles.topBarDark : styles.topBarLight]}>
        <View style={styles.topBarLeft}>
          <Pressable
            style={[styles.iconButton, isDark ? styles.iconButtonDark : styles.iconButtonLight]}
            onPress={() => router.back()}
            accessibilityLabel="Exit slides"
          >
            <Ionicons name="close" size={20} color={isDark ? '#E5DCDF' : '#3D2D27'} />
          </Pressable>
          <View style={styles.titleInfo}>
            <Text style={[styles.deckTitle, isDark ? styles.textDark : styles.textLight]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.deckSub, isDark ? styles.subDark : styles.subLight]} numberOfLines={1}>
              {subject} · Slide {currentIndex + 1} of {questions.length}
            </Text>
          </View>
        </View>

        {/* Quick Toolbar */}
        <View style={styles.topBarRight}>
          {/* Timer Tool */}
          {timerSeconds !== null && timerSeconds > 0 && (
            <View style={[styles.timerBadge, timerSeconds <= 5 && styles.timerBadgeWarning]}>
              <Ionicons name="time-outline" size={15} color="#FFF" />
              <Text style={styles.timerBadgeText}>{timerSeconds}s</Text>
            </View>
          )}

          <Pressable
            style={[styles.pillBtn, isDark ? styles.pillBtnDark : styles.pillBtnLight]}
            onPress={() => (timerActive ? setTimerActive(false) : startTimer(60))}
            accessibilityLabel="Toggle timer"
          >
            <Ionicons name="stopwatch-outline" size={16} color={isDark ? '#D6C8F2' : '#7653A4'} />
            <Text style={[styles.pillBtnText, isDark ? styles.pillBtnTextDark : styles.pillBtnTextLight]}>
              {timerActive ? 'Stop' : '60s'}
            </Text>
          </Pressable>

          {/* Font Resizer */}
          <Pressable
            style={[styles.iconButton, isDark ? styles.iconButtonDark : styles.iconButtonLight]}
            onPress={() => setFontSizeOffset((prev) => (prev >= 6 ? -2 : prev + 2))}
            accessibilityLabel="Adjust font size"
          >
            <Ionicons name="text-outline" size={18} color={isDark ? '#E5DCDF' : '#3D2D27'} />
          </Pressable>

          {/* Theme Switcher */}
          <Pressable
            style={[styles.iconButton, isDark ? styles.iconButtonDark : styles.iconButtonLight]}
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
            accessibilityLabel="Toggle dark/light mode"
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={isDark ? '#FFD166' : '#5C4C44'} />
          </Pressable>

          {/* Slide Navigator Modal Button */}
          <Pressable
            style={[styles.slidePickerBtn, isDark ? styles.slidePickerBtnDark : styles.slidePickerBtnLight]}
            onPress={() => setShowSlidePicker(true)}
            accessibilityLabel="All slides list"
          >
            <Ionicons name="grid-outline" size={16} color={isDark ? '#FFF' : '#C85C3E'} />
            <Text style={[styles.slidePickerText, isDark ? { color: '#FFF' } : { color: '#C85C3E' }]}>
              {currentIndex + 1}/{questions.length}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── MAIN PROJECTOR SLIDE CANVAS ── */}
      <ScrollView
        contentContainerStyle={[styles.slideScrollContent, isWide && styles.slideScrollContentWide]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.slideCard, isDark ? styles.slideCardDark : styles.slideCardLight]}>
          {/* Slide Header Badges */}
          <View style={styles.slideCardHeader}>
            <View style={styles.qIndexBadge}>
              <Text style={styles.qIndexText}>Question {currentIndex + 1}</Text>
            </View>
            {currentQ.difficulty && (
              <View
                style={[
                  styles.diffBadge,
                  currentQ.difficulty === 'easy' && { backgroundColor: '#10B98125' },
                  currentQ.difficulty === 'medium' && { backgroundColor: '#F59E0B25' },
                  currentQ.difficulty === 'hard' && { backgroundColor: '#EF444425' },
                ]}
              >
                <Text
                  style={[
                    styles.diffBadgeText,
                    currentQ.difficulty === 'easy' && { color: '#10B981' },
                    currentQ.difficulty === 'medium' && { color: '#F59E0B' },
                    currentQ.difficulty === 'hard' && { color: '#EF4444' },
                  ]}
                >
                  {currentQ.difficulty.toUpperCase()}
                </Text>
              </View>
            )}
            {Boolean((currentQ as any)._chapterName) && (
              <Text style={[styles.chapterTag, isDark ? styles.subDark : styles.subLight]} numberOfLines={1}>
                {(currentQ as any)._chapterName}
              </Text>
            )}
          </View>

          {/* Question Prompt */}
          <View style={styles.promptBox}>
            <MathText
              text={currentQ.question}
              style={[
                styles.promptMath,
                isDark ? styles.promptMathDark : styles.promptMathLight,
                { fontSize: promptSize, lineHeight: promptSize * 1.45 },
              ]}
            />
          </View>

          {/* Options Section */}
          {currentQ.options && currentQ.options.length > 0 && (
            <View style={styles.optionsWrap}>
              <View style={styles.optionsHeaderRow}>
                <Text style={[styles.optionsLabel, isDark ? styles.subDark : styles.subLight]}>
                  Choices
                </Text>
                <Pressable
                  style={styles.toggleOptionsBtn}
                  onPress={() => setShowOptions((prev) => !prev)}
                >
                  <Ionicons
                    name={showOptions ? 'eye-off-outline' : 'eye-outline'}
                    size={14}
                    color={isDark ? '#B4A2CD' : '#7653A4'}
                  />
                  <Text style={[styles.toggleOptionsText, isDark ? { color: '#B4A2CD' } : { color: '#7653A4' }]}>
                    {showOptions ? 'Hide for Poll' : 'Show Options'}
                  </Text>
                </Pressable>
              </View>

              {showOptions && (
                <View style={styles.optionsList}>
                  {currentQ.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isCorrect = showAnswer && correctLetter === letter;

                    return (
                      <View
                        key={`slide-opt-${optIdx}`}
                        style={[
                          styles.optionCard,
                          isDark ? styles.optionCardDark : styles.optionCardLight,
                          isCorrect && (isDark ? styles.optionCardCorrectDark : styles.optionCardCorrectLight),
                        ]}
                      >
                        <View
                          style={[
                            styles.optionLetterBadge,
                            isDark ? styles.optionLetterBadgeDark : styles.optionLetterBadgeLight,
                            isCorrect && styles.optionLetterBadgeCorrect,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionLetterText,
                              isDark ? styles.textDark : styles.textLight,
                              isCorrect && { color: '#FFF' },
                            ]}
                          >
                            {letter}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <MathText
                            text={cleanOption(opt)}
                            style={[
                              styles.optionMath,
                              isDark ? styles.optionMathDark : styles.optionMathLight,
                              isCorrect && styles.optionMathCorrect,
                              { fontSize: optionSize, lineHeight: optionSize * 1.4 },
                            ]}
                          />
                        </View>
                        {isCorrect && (
                          <View style={styles.correctCheckIcon}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Reveal Correct Answer Banner */}
          {showAnswer && (
            <View style={[styles.answerBanner, isDark ? styles.answerBannerDark : styles.answerBannerLight]}>
              <View style={styles.answerBannerHead}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.answerBannerTitle}>Correct Answer:</Text>
                <Text style={styles.answerBannerValue}>
                  {correctLetter ? `(${correctLetter}) ` : ''}
                  {currentQ.answer || 'Option ' + correctLetter}
                </Text>
              </View>
            </View>
          )}

          {/* Reveal Explanation Box */}
          {showExplanation && (
            <View style={[styles.explanationBox, isDark ? styles.explanationBoxDark : styles.explanationBoxLight]}>
              <View style={styles.explanationHeaderRow}>
                <Ionicons name="bulb-outline" size={18} color={isDark ? '#FCD34D' : '#D97706'} />
                <Text style={[styles.explanationTitle, isDark ? { color: '#FCD34D' } : { color: '#92400E' }]}>
                  Step-by-Step Teacher Solution
                </Text>
              </View>
              {currentQ.explanation || currentQ.solution ? (
                <MathText
                  text={currentQ.explanation || currentQ.solution || ''}
                  style={[
                    styles.explanationMath,
                    isDark ? styles.explanationMathDark : styles.explanationMathLight,
                    { fontSize: optionSize - 1, lineHeight: optionSize * 1.4 },
                  ]}
                />
              ) : (
                <Text style={[styles.emptyExplanationText, isDark ? styles.subDark : styles.subLight]}>
                  No explanation provided for this question.
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── BOTTOM PRESENTATION ACTION BAR ── */}
      <View style={[styles.bottomBar, isDark ? styles.bottomBarDark : styles.bottomBarLight]}>
        {/* Previous Button */}
        <Pressable
          style={[
            styles.navBtn,
            currentIndex === 0 && styles.navBtnDisabled,
            isDark ? styles.navBtnDark : styles.navBtnLight,
          ]}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          accessibilityLabel="Previous slide"
        >
          <Ionicons name="chevron-back" size={20} color={currentIndex === 0 ? '#6B7280' : isDark ? '#FFF' : '#3D2D27'} />
          <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled, isDark ? styles.textDark : styles.textLight]}>
            Prev
          </Text>
        </Pressable>

        {/* Center Reveal Controls */}
        <View style={styles.revealControlsRow}>
          <Pressable
            style={[
              styles.revealActionBtn,
              showAnswer ? styles.revealActionBtnActiveAnswer : isDark ? styles.revealActionBtnDark : styles.revealActionBtnLight,
            ]}
            onPress={() => setShowAnswer((prev) => !prev)}
            accessibilityLabel="Reveal or hide correct answer"
          >
            <Ionicons
              name={showAnswer ? 'checkmark-circle' : 'key-outline'}
              size={17}
              color={showAnswer ? '#FFF' : isDark ? '#34D399' : '#059669'}
            />
            <Text style={[styles.revealActionBtnText, showAnswer && { color: '#FFF' }]}>
              {showAnswer ? 'Hide Answer' : 'Reveal Answer (A)'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.revealActionBtn,
              showExplanation ? styles.revealActionBtnActiveExpl : isDark ? styles.revealActionBtnDark : styles.revealActionBtnLight,
            ]}
            onPress={() => setShowExplanation((prev) => !prev)}
            accessibilityLabel="Reveal or hide explanation"
          >
            <Ionicons
              name="bulb-outline"
              size={17}
              color={showExplanation ? '#FFF' : isDark ? '#FCD34D' : '#D97706'}
            />
            <Text style={[styles.revealActionBtnText, showExplanation && { color: '#FFF' }]}>
              {showExplanation ? 'Hide Solution' : 'Solution (E)'}
            </Text>
          </Pressable>
        </View>

        {/* Next Button */}
        <Pressable
          style={[
            styles.navBtn,
            currentIndex === questions.length - 1 && styles.navBtnDisabled,
            isDark ? styles.navBtnDark : styles.navBtnLight,
          ]}
          onPress={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
          disabled={currentIndex === questions.length - 1}
          accessibilityLabel="Next slide"
        >
          <Text style={[styles.navBtnText, currentIndex === questions.length - 1 && styles.navBtnTextDisabled, isDark ? styles.textDark : styles.textLight]}>
            Next
          </Text>
          <Ionicons name="chevron-forward" size={20} color={currentIndex === questions.length - 1 ? '#6B7280' : isDark ? '#FFF' : '#3D2D27'} />
        </Pressable>
      </View>

      {/* ── SLIDE PICKER MODAL (GRID THUMBNAILS) ── */}
      <Modal visible={showSlidePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.modalContentDark : styles.modalContentLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.textDark : styles.textLight]}>
                Jump to Slide ({questions.length} Total)
              </Text>
              <Pressable onPress={() => setShowSlidePicker(false)}>
                <Ionicons name="close" size={22} color={isDark ? '#E5DCDF' : '#3D2D27'} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.slideGrid} showsVerticalScrollIndicator={false}>
              {questions.map((q, idx) => {
                const isSelected = idx === currentIndex;
                return (
                  <Pressable
                    key={`jump-slide-${idx}`}
                    style={[
                      styles.slideGridCard,
                      isDark ? styles.slideGridCardDark : styles.slideGridCardLight,
                      isSelected && styles.slideGridCardActive,
                    ]}
                    onPress={() => {
                      setCurrentIndex(idx);
                      setShowSlidePicker(false);
                    }}
                  >
                    <View style={styles.slideGridNumWrap}>
                      <Text style={[styles.slideGridNum, isSelected && { color: '#C85C3E' }]}>
                        Q{idx + 1}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.slideGridSnippet,
                        isDark ? styles.subDark : styles.subLight,
                        isSelected && { fontWeight: '700' },
                      ]}
                      numberOfLines={2}
                    >
                      {q.question.replace(/[$#*_]/g, '')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootDark: { backgroundColor: '#111827' },
  rootLight: { backgroundColor: '#F8F4EE' },

  textDark: { color: '#F9FAFB' },
  textLight: { color: '#1F2937' },
  subDark: { color: '#9CA3AF' },
  subLight: { color: '#6B7280' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 460, lineHeight: 20 },
  backActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#C85C3E', marginTop: 14 },
  backActionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  /* Top Bar */
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  topBarDark: { backgroundColor: '#1F2937', borderBottomColor: '#374151' },
  topBarLight: { backgroundColor: '#FFFFFF', borderBottomColor: '#E5E7EB' },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  titleInfo: { flex: 1 },
  deckTitle: { fontSize: 14, fontWeight: '800' },
  deckSub: { fontSize: 11, marginTop: 1 },

  iconButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconButtonDark: { backgroundColor: '#374151' },
  iconButtonLight: { backgroundColor: '#F3F4F6' },

  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
  pillBtnDark: { backgroundColor: '#374151' },
  pillBtnLight: { backgroundColor: '#F3F4F6' },
  pillBtnText: { fontSize: 11, fontWeight: '700' },
  pillBtnTextDark: { color: '#E5E7EB' },
  pillBtnTextLight: { color: '#374151' },

  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: '#10B981' },
  timerBadgeWarning: { backgroundColor: '#EF4444' },
  timerBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  slidePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, borderWidth: 1 },
  slidePickerBtnDark: { backgroundColor: '#374151', borderColor: '#4B5563' },
  slidePickerBtnLight: { backgroundColor: '#FFF7F2', borderColor: '#F2DDD3' },
  slidePickerText: { fontSize: 12, fontWeight: '800' },

  /* Canvas */
  slideScrollContent: { padding: 16, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  slideScrollContentWide: { maxWidth: 1100, alignSelf: 'center', width: '100%', paddingHorizontal: 32 },

  slideCard: { borderRadius: 20, padding: 24, borderWidth: 1 },
  slideCardDark: { backgroundColor: '#1F2937', borderColor: '#374151' },
  slideCardLight: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },

  slideCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  qIndexBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#C85C3E' },
  qIndexText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffBadgeText: { fontSize: 10, fontWeight: '800' },
  chapterTag: { fontSize: 12, flex: 1, textAlign: 'right' },

  promptBox: { marginBottom: 20 },
  promptMath: { fontWeight: '700' },
  promptMathDark: { color: '#F9FAFB' },
  promptMathLight: { color: '#111827' },

  optionsWrap: { marginTop: 8 },
  optionsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  optionsLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  toggleOptionsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  toggleOptionsText: { fontSize: 11, fontWeight: '700' },

  optionsList: { gap: 10 },
  optionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  optionCardDark: { backgroundColor: '#111827', borderColor: '#374151' },
  optionCardLight: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  optionCardCorrectDark: { borderColor: '#10B981', backgroundColor: '#064E3B30' },
  optionCardCorrectLight: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },

  optionLetterBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLetterBadgeDark: { backgroundColor: '#374151' },
  optionLetterBadgeLight: { backgroundColor: '#E5E7EB' },
  optionLetterBadgeCorrect: { backgroundColor: '#10B981' },
  optionLetterText: { fontSize: 13, fontWeight: '800' },

  optionMath: { flex: 1 },
  optionMathDark: { color: '#E5E7EB' },
  optionMathLight: { color: '#374151' },
  optionMathCorrect: { fontWeight: '700' },
  correctCheckIcon: { marginLeft: 8 },

  answerBanner: { marginTop: 18, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  answerBannerDark: { backgroundColor: '#064E3B25', borderColor: '#10B981' },
  answerBannerLight: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  answerBannerHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  answerBannerTitle: { fontSize: 13, fontWeight: '800', color: '#10B981' },
  answerBannerValue: { fontSize: 14, fontWeight: '800', color: '#047857', flex: 1 },

  explanationBox: { marginTop: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  explanationBoxDark: { backgroundColor: '#37415140', borderColor: '#F59E0B60' },
  explanationBoxLight: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  explanationHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  explanationTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  explanationMath: { marginTop: 4 },
  explanationMathDark: { color: '#E5E7EB' },
  explanationMathLight: { color: '#451A03' },
  emptyExplanationText: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },

  /* Bottom Bar */
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 10 },
  bottomBarDark: { backgroundColor: '#1F2937', borderTopColor: '#374151' },
  bottomBarLight: { backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB' },

  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  navBtnDark: { backgroundColor: '#374151', borderColor: '#4B5563' },
  navBtnLight: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontSize: 12, fontWeight: '700' },
  navBtnTextDisabled: { color: '#9CA3AF' },

  revealControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, borderWidth: 1 },
  revealActionBtnDark: { backgroundColor: '#374151', borderColor: '#4B5563' },
  revealActionBtnLight: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  revealActionBtnActiveAnswer: { backgroundColor: '#10B981', borderColor: '#10B981' },
  revealActionBtnActiveExpl: { backgroundColor: '#D97706', borderColor: '#D97706' },
  revealActionBtnText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 640, maxHeight: '80%', borderRadius: 20, padding: 20, borderWidth: 1 },
  modalContentDark: { backgroundColor: '#1F2937', borderColor: '#374151' },
  modalContentLight: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  slideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slideGridCard: { width: '48%', minHeight: 74, padding: 10, borderRadius: 12, borderWidth: 1.5 },
  slideGridCardDark: { backgroundColor: '#111827', borderColor: '#374151' },
  slideGridCardLight: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  slideGridCardActive: { borderColor: '#C85C3E', backgroundColor: '#FFF7F2' },
  slideGridNumWrap: { marginBottom: 4 },
  slideGridNum: { fontSize: 12, fontWeight: '900', color: '#6B7280' },
  slideGridSnippet: { fontSize: 11, lineHeight: 15 },
});
