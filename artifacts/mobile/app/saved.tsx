import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { DesktopHeaderNav } from '@/components/DesktopHeaderNav';
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
  useWindowDimensions,
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
    question: sq.question,
    options: sq.options,
    answer: sq.answer,
    solution: sq.solution,
    explanation: sq.explanation,
    tip: sq.tip,
  };
}

export default function SavedScreen() {
  const { savedQuestions, unsaveQuestion, mistakeQuestions } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('All');
  const subjectTabs = ['All', ...Array.from(new Set(savedQuestions.map((q) => q.subjectName).filter(Boolean)))];

  const topPad = insets.top + (Platform.OS === 'web' ? 20 : 0);
  const tabBarHeight = isDesktop ? 24 : BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 12 : 0);

  function toggleExpand(id: string) {
    Haptics.selectionAsync();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function launchQuiz(questions: SavedQuestion[]) {
    if (questions.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const converted: Question[] = questions.map(savedToQuestion);
    const sessionId = saveQuestions(converted);

    const subjects = [...new Set(questions.map((q) => q.subjectName))];
    const chapters = [...new Set(questions.map((q) => q.chapterName).filter(Boolean))];
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

  const filteredQuestions = savedQuestions.filter((q) =>
    activeTab === 'All' ? true : q.subjectName?.toLowerCase().includes(activeTab.toLowerCase())
  );

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{
          paddingTop: isDesktop ? topPad : 0,
          paddingBottom: tabBarHeight + 32,
          flexGrow: 1,
        }}
      >
        {/* ── DESKTOP UNIFIED TOP NAV BAR ── */}
        {isDesktop ? (
          <View style={styles.desktopNavWrapper}>
            <DesktopHeaderNav activeTab="saved" />

            {/* Desktop Page Title Banner */}
            <View style={styles.desktopHeaderStrip}>
              <View style={{ flex: 1 }}>
                <View style={styles.desktopBreadcrumb}>
                  <Pressable onPress={() => router.replace('/subjects')}>
                    <Text style={styles.desktopBreadcrumbLink}>Dashboard</Text>
                  </Pressable>
                  <Ionicons name="chevron-forward" size={12} color="#A49186" />
                  <Text style={styles.desktopBreadcrumbActive}>Saved Questions</Text>
                </View>
                <Text style={styles.desktopPageTitle}>Saved Bookmarks & Review Vault</Text>
                <Text style={styles.desktopPageSub}>
                  Quickly review challenging questions you bookmarked during study sessions and practice tests ({savedQuestions.length} saved)
                </Text>
              </View>

              {savedQuestions.length > 0 && (
                <Pressable
                  style={styles.desktopPracticeBtn}
                  onPress={() => launchQuiz(filteredQuestions.length > 0 ? filteredQuestions : savedQuestions)}
                >
                  <Ionicons name="play" size={16} color="#FFF" />
                  <Text style={styles.desktopPracticeBtnText}>
                    Practice These ({filteredQuestions.length})
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          /* ── MOBILE HEADER (Clean Top App Bar with Back & Quiz Action) ── */
          <View style={[styles.mobileNavHeader, { paddingTop: topPad + 10 }]}>
            <View style={styles.mobileNavRow}>
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/subjects');
                }}
                style={styles.mobileBackBtn}
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={20} color="#3D2D27" />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.mobileNavTitle} numberOfLines={1}>Saved Vault</Text>
                <Text style={styles.mobileNavSub} numberOfLines={1}>
                  {savedQuestions.length} {savedQuestions.length === 1 ? 'question' : 'questions'} bookmarked
                </Text>
              </View>
              {savedQuestions.length > 0 && (
                <Pressable
                  style={styles.mobilePracticeBtn}
                  onPress={() => launchQuiz(filteredQuestions.length > 0 ? filteredQuestions : savedQuestions)}
                >
                  <Ionicons name="play" size={13} color="#FFF" />
                  <Text style={styles.mobilePracticeBtnText}>
                    Quiz ({filteredQuestions.length})
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ── TOP SECTION TOGGLE: SAVED BOOKMARKS vs MISTAKE NOTEBOOK ── */}
        <View style={[styles.navSwitcher, isDesktop && styles.navSwitcherDesktop]}>
          <Pressable style={[styles.navSwitcherTab, styles.navSwitcherTabActive]}>
            <Ionicons name="bookmark" size={16} color="#C85C3E" />
            <Text style={[styles.navSwitcherText, styles.navSwitcherTextActive]}>
              Bookmarks Vault ({savedQuestions.length})
            </Text>
          </Pressable>
          <Pressable
            style={styles.navSwitcherTab}
            onPress={() => router.replace('/mistakes' as any)}
          >
            <Ionicons name="alert-circle-outline" size={16} color="#76645B" />
            <Text style={styles.navSwitcherText}>
              Mistake Notebook ({mistakeQuestions.length})
            </Text>
          </Pressable>
        </View>

        {/* ── FILTER CHIPS ── */}
        <View style={[styles.filterStrip, isDesktop && styles.filterStripDesktop]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {subjectTabs.map((sub) => {
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
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {sub}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── MAIN CONTENT CONTAINER ── */}
        <View style={[styles.container, isDesktop && styles.containerDesktop]}>
          {savedQuestions.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIllustration}>
                <Ionicons name="bookmark-outline" size={44} color="#C85C3E" />
              </View>
              <Text style={styles.emptyTitle}>No saved questions yet</Text>
              <Text style={styles.emptySub}>
                Tap the bookmark icon on any test question or explanation to save it here for quick review.
              </Text>

              <Pressable onPress={() => router.replace('/subjects')} style={styles.startBtn}>
                <Text style={styles.startBtnText}>Browse Practice Questions</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 8 }} />
              </Pressable>
            </View>
          ) : isDesktop ? (
            <View style={styles.desktopBentoRow}>
              {/* Left Column: Questions List */}
              <View style={styles.desktopBentoMain}>
                {filteredQuestions.length === 0 ? (
                  <View style={styles.emptyFilteredState}>
                    <Text style={styles.emptyFilteredText}>No saved questions found in {activeTab}.</Text>
                  </View>
                ) : (
                  <View style={styles.questionsList}>
                    {filteredQuestions.map((q) => {
                      const isOpen = expanded.has(q.id);
                      return (
                        <Pressable
                          key={q.id}
                          onPress={() => toggleExpand(q.id)}
                          style={styles.qCard}
                        >
                          <View style={styles.qAccentBar} />
                          <View style={styles.qBody}>
                            <View style={styles.qHeaderRow}>
                              <View style={styles.qMeta}>
                                <View style={styles.subjectPill}>
                                  <Ionicons name="book-outline" size={11} color="#C85C3E" />
                                  <Text style={styles.subjectPillText} numberOfLines={1}>
                                    {q.subjectName}
                                  </Text>
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
                                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                                </Pressable>
                              </View>
                            </View>

                            <View style={styles.questionRow}>
                              <View style={styles.qNumBadge}>
                                <Ionicons name="help-circle" size={14} color="#C85C3E" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <MathText
                                  style={styles.questionText}
                                  numberOfLines={isOpen ? undefined : 3}
                                  text={q.question}
                                />
                              </View>
                              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#A49186" />
                            </View>

                            {isOpen && (
                              <View style={styles.expandedBody}>
                                {q.options && q.options.length > 0 && (
                                  <View style={styles.optionsWrap}>
                                    <Text style={styles.sectionLabel}>Choices</Text>
                                    {q.options.map((opt, oi) => {
                                      const isCorrect = oi === q.correctOptionIndex;
                                      return (
                                        <View
                                          key={oi}
                                          style={[
                                            styles.optionRow,
                                            isCorrect && styles.optionRowCorrect,
                                          ]}
                                        >
                                          <View style={[styles.optLabel, isCorrect && styles.optLabelCorrect]}>
                                            <Text style={[styles.optLabelText, isCorrect && styles.optLabelTextCorrect]}>
                                              {OPTION_LABELS[oi]}
                                            </Text>
                                          </View>
                                          <MathText
                                            style={[styles.optText, isCorrect && styles.optTextCorrect]}
                                            text={opt}
                                          />
                                          {isCorrect && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
                                        </View>
                                      );
                                    })}
                                  </View>
                                )}

                                {(q.explanation || q.solution || q.tip) && (
                                  <View style={styles.solutionBox}>
                                    <View style={styles.solutionHeader}>
                                      <Ionicons name="bulb" size={15} color="#C85C3E" />
                                      <Text style={styles.solutionTitle}>Explanation & Solution</Text>
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
                    })}
                  </View>
                )}
              </View>

              {/* Right Column: Vault Analytics & Study Hub */}
              <View style={styles.desktopBentoAside}>
                <View style={styles.asideCard}>
                  <View style={styles.asideCardHeader}>
                    <Ionicons name="bookmark" size={18} color="#C85C3E" />
                    <Text style={styles.asideCardTitle}>Vault Overview</Text>
                  </View>
                  <View style={styles.asideMetricsRow}>
                    <View style={styles.asideMetricBox}>
                      <Text style={styles.asideMetricVal}>{savedQuestions.length}</Text>
                      <Text style={styles.asideMetricLbl}>Bookmarked</Text>
                    </View>
                    <View style={styles.asideMetricBox}>
                      <Text style={styles.asideMetricVal}>{filteredQuestions.length}</Text>
                      <Text style={styles.asideMetricLbl}>In {activeTab}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.asidePrimaryBtn}
                    onPress={() => launchQuiz(filteredQuestions.length > 0 ? filteredQuestions : savedQuestions)}
                  >
                    <Ionicons name="play" size={16} color="#FFF" />
                    <Text style={styles.asidePrimaryBtnText}>
                      Practice These ({filteredQuestions.length})
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.asideSecondaryBtn}
                    onPress={() => router.push('/flashcard' as any)}
                  >
                    <Ionicons name="albums-outline" size={16} color="#7653A4" />
                    <Text style={styles.asideSecondaryBtnText}>
                      Open Flashcard Mode
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.asideCard}>
                  <View style={styles.asideCardHeader}>
                    <Ionicons name="bulb-outline" size={18} color="#D97706" />
                    <Text style={styles.asideCardTitle}>Retention Tip</Text>
                  </View>
                  <Text style={styles.asideTipText}>
                    Revisiting questions you bookmarked within 24-48 hours strengthens neural pathways and prevents forgetting during final exam evaluations.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* Mobile Question List */
            filteredQuestions.length === 0 ? (
              <View style={styles.emptyFilteredState}>
                <Text style={styles.emptyFilteredText}>No saved questions found in {activeTab}.</Text>
              </View>
            ) : (
              <View style={styles.questionsList}>
                {filteredQuestions.map((q) => {
                  const isOpen = expanded.has(q.id);
                  return (
                    <Pressable
                      key={q.id}
                      onPress={() => toggleExpand(q.id)}
                      style={styles.qCard}
                    >
                      <View style={styles.qAccentBar} />
                      <View style={styles.qBody}>
                        <View style={styles.qHeaderRow}>
                          <View style={styles.qMeta}>
                            <View style={styles.subjectPill}>
                              <Ionicons name="book-outline" size={11} color="#C85C3E" />
                              <Text style={styles.subjectPillText} numberOfLines={1}>
                                {q.subjectName}
                              </Text>
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
                              <Ionicons name="trash-outline" size={14} color="#DC2626" />
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.questionRow}>
                          <View style={styles.qNumBadge}>
                            <Ionicons name="help-circle" size={14} color="#C85C3E" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <MathText
                              style={styles.questionText}
                              numberOfLines={isOpen ? undefined : 3}
                              text={q.question}
                            />
                          </View>
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#A49186" />
                        </View>

                        {isOpen && (
                          <View style={styles.expandedBody}>
                            {q.options && q.options.length > 0 && (
                              <View style={styles.optionsWrap}>
                                <Text style={styles.sectionLabel}>Choices</Text>
                                {q.options.map((opt, oi) => {
                                  const isCorrect = oi === q.correctOptionIndex;
                                  return (
                                    <View
                                      key={oi}
                                      style={[
                                        styles.optionRow,
                                        isCorrect && styles.optionRowCorrect,
                                      ]}
                                    >
                                      <View style={[styles.optLabel, isCorrect && styles.optLabelCorrect]}>
                                        <Text style={[styles.optLabelText, isCorrect && styles.optLabelTextCorrect]}>
                                          {OPTION_LABELS[oi]}
                                        </Text>
                                      </View>
                                      <MathText
                                        style={[styles.optText, isCorrect && styles.optTextCorrect]}
                                        text={opt}
                                      />
                                      {isCorrect && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
                                    </View>
                                  );
                                })}
                              </View>
                            )}

                            {(q.explanation || q.solution || q.tip) && (
                              <View style={styles.solutionBox}>
                                <View style={styles.solutionHeader}>
                                  <Ionicons name="bulb" size={15} color="#C85C3E" />
                                  <Text style={styles.solutionTitle}>Explanation & Solution</Text>
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
                })}
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Tab Bar ONLY on mobile screens */}
      {!isDesktop && <BottomTabBar activeTab="saved" />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FBF8F4',
  },

  /* DESKTOP NAV WRAPPER */
  desktopNavWrapper: {
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  desktopHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DFD5',
    padding: 24,
    gap: 20,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  desktopBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  desktopBreadcrumbLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85C3E',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopBreadcrumbActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B786D',
  },
  desktopPageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3D2D27',
    letterSpacing: -0.3,
  },
  desktopPageSub: {
    fontSize: 12.5,
    color: '#76645B',
    marginTop: 4,
    maxWidth: 620,
    lineHeight: 18,
  },
  desktopPracticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#C85C3E',
    shadowColor: '#C85C3E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopPracticeBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* MOBILE NAV HEADER */
  mobileNavHeader: {
    backgroundColor: '#FFFDF9',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE4D9',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  mobileNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3ECE3',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  mobileNavTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3D2D27',
  },
  mobileNavSub: {
    fontSize: 12,
    color: '#8B786D',
    marginTop: 1,
  },
  mobilePracticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#C85C3E',
    shadowColor: '#C85C3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  mobilePracticeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Tab Switcher: Bookmarks vs Mistakes */
  navSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#EAE1D5',
    padding: 4,
    borderRadius: 14,
  },
  navSwitcherDesktop: {
    width: '100%',
    paddingHorizontal: 0,
    marginHorizontal: 0,
    marginBottom: 12,
    alignSelf: 'stretch',
    maxWidth: 1240,
  },
  navSwitcherTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  navSwitcherTabActive: {
    backgroundColor: '#FFF',
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  navSwitcherText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#76645B',
  },
  navSwitcherTextActive: {
    color: '#C85C3E',
    fontWeight: '800',
  },

  /* FILTER CHIPS */
  filterStrip: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterStripDesktop: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 32,
  },
  filterScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 6 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DFD5',
    backgroundColor: '#FFFDF9',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  filterChipActive: { backgroundColor: '#C85C3E', borderColor: '#C85C3E' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#5E4B42' },
  filterChipTextActive: { color: '#FFF' },

  /* RESPONSIVE CONTAINER */
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  containerDesktop: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 32,
    paddingTop: 8,
  },

  /* DESKTOP BENTO ROW */
  desktopBentoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    width: '100%',
  },
  desktopBentoMain: {
    flex: 1,
    minWidth: 0,
    gap: 14,
  },
  desktopBentoAside: {
    width: 380,
    minWidth: 320,
    gap: 16,
  },
  asideCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DFD5',
    padding: 20,
    gap: 14,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  asideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  asideCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3D2D27',
  },
  asideMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  asideMetricBox: {
    flex: 1,
    backgroundColor: '#F8F4EE',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE4D9',
  },
  asideMetricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3D2D27',
  },
  asideMetricLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#76645B',
    marginTop: 2,
  },
  asidePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C85C3E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  asidePrimaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  asideSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  asideSecondaryBtnText: {
    color: '#7653A4',
    fontSize: 13,
    fontWeight: '800',
  },
  asideTipText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#76645B',
  },

  /* EMPTY STATE */
  emptyStateContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyIllustration: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8DFD5',
    marginBottom: 16,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#3D2D27', marginBottom: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20, color: '#76645B', maxWidth: 440, marginBottom: 24 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C85C3E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#C85C3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  startBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  emptyFilteredState: { alignItems: 'center', marginTop: 40 },
  emptyFilteredText: { fontSize: 13, color: '#76645B' },

  /* QUESTION CARD */
  questionsList: { gap: 14 },
  questionsListDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  qCard: {
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8DFD5',
    backgroundColor: '#FFFDF9',
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  qCardDesktop: {
    width: 'calc(50% - 8px)' as any,
    minWidth: 360,
    flexBasis: 'calc(50% - 8px)' as any,
  },
  qAccentBar: { width: 5, backgroundColor: '#C85C3E' },
  qBody: { flex: 1, padding: 18 },
  qHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  qMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FDECE6',
  },
  subjectPillText: { color: '#C85C3E', fontSize: 11, fontWeight: '800' },
  chapterText: { fontSize: 12, fontWeight: '600', color: '#76645B', flex: 1 },
  qActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedTime: { fontSize: 11, color: '#A49186' },
  unsaveBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  qNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#FDECE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  questionText: { fontSize: 13.5, lineHeight: 21, fontWeight: '600', color: '#3D2D27' },

  expandedBody: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0E6DE' },
  optionsWrap: { gap: 8, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: '#76645B', marginBottom: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#EFE7DE',
    backgroundColor: '#FFF',
  },
  optionRowCorrect: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  optLabel: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#EBE2D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLabelCorrect: { backgroundColor: '#10B981' },
  optLabelText: { fontSize: 10.5, fontWeight: '800', color: '#5C4C44' },
  optLabelTextCorrect: { color: '#FFF' },
  optText: { flex: 1, fontSize: 12.5, color: '#3D2D27' },
  optTextCorrect: { fontWeight: '700', color: '#065F46' },

  solutionBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF7F2',
    borderWidth: 1,
    borderColor: '#F2DDD3',
    gap: 8,
  },
  solutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  solutionTitle: { fontSize: 12.5, fontWeight: '800', color: '#C85C3E' },
  solutionText: { fontSize: 12.5, lineHeight: 19, color: '#3D2D27' },
  tipBox: { marginTop: 4, padding: 10, borderRadius: 9, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  tipText: { fontSize: 11.5, color: '#92400E' },
});
