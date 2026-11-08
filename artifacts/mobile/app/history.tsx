import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { DesktopHeaderNav } from '@/components/DesktopHeaderNav';
import { useApp, type TestResult } from '@/context/AppContext';
import { saveQuestions } from '@/store/questionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDate(ts: number) {
  if (!ts) return 'Recent';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getScoreColors(percent: number) {
  if (percent >= 75) {
    return { bg: '#ECFDF5', text: '#059669', badgeBg: '#D1FAE5' };
  }
  if (percent >= 50) {
    return { bg: '#FFFBEB', text: '#D97706', badgeBg: '#FEF3C7' };
  }
  return { bg: '#FEF2F2', text: '#DC2626', badgeBg: '#FEE2E2' };
}

export default function HistoryScreen() {
  const { testHistory, mistakeQuestions } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const topPad = insets.top + (Platform.OS === 'web' ? 20 : 0);
  const tabBarHeight = isDesktop ? 24 : BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 12 : 0);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/subjects');
    }
  };

  const handleDrillAllMistakes = () => {
    if (!mistakeQuestions.length) return;
    const drillQuestions = mistakeQuestions.map((m) => ({
      question: m.question,
      options: m.options,
      answer: m.answer,
      solution: m.solution,
      explanation: m.explanation,
    }));
    const drillSessionId = saveQuestions(drillQuestions as any);
    router.push({
      pathname: '/test-quiz',
      params: {
        sessionId: drillSessionId,
        subjectName: 'Mistake Drill',
        chapterName: 'Weak Areas Re-Test',
      },
    });
  };

  const handleDiagnoseMistakesWithAi = () => {
    if (!mistakeQuestions.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sample = mistakeQuestions.slice(0, 5);
    const summary = sample
      .map(
        (m, i) =>
          `[Question ${i + 1}] (${m.subjectName || 'Subject'}${m.chapterName ? ` - ${m.chapterName}` : ''}):\n${m.question}\nMy Answer: ${m.userAnswer || 'Skipped'}\nCorrect Answer: ${m.answer}${m.solution ? `\nSolution: ${m.solution}` : ''}`
      )
      .join('\n\n');

    const prompt = `I have accumulated ${mistakeQuestions.length} questions in my Mistake Bank. Here are recent questions I struggled with:\n\n${summary}\n\nPlease:
1. Identify the recurring conceptual traps or weak areas in these questions.
2. Explain how to avoid these specific pitfalls with step-by-step clarity.
3. Provide quick memory techniques and mnemonics for these topics.`;

    router.push({
      pathname: '/chat',
      params: {
        subjectName: sample[0]?.subjectName || 'Mistake Review',
        chapterName: 'Weak Areas Diagnosis',
        initialPrompt: prompt,
        autoSend: '1',
      },
    });
  };

  const hasHistory = Array.isArray(testHistory) && testHistory.length > 0;

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
        {/* ── DESKTOP UNIFIED TOP NAV BAR (Exact match to Home) ── */}
        {isDesktop ? (
          <View style={styles.desktopNavWrapper}>
            <DesktopHeaderNav activeTab="history" />

            {/* Desktop Page Title Banner */}
            <View style={styles.desktopHeaderStrip}>
              <View style={{ flex: 1 }}>
                <View style={styles.desktopBreadcrumb}>
                  <Pressable onPress={() => router.replace('/subjects')}>
                    <Text style={styles.desktopBreadcrumbLink}>Dashboard</Text>
                  </Pressable>
                  <Ionicons name="chevron-forward" size={12} color="#A49186" />
                  <Text style={styles.desktopBreadcrumbActive}>Test History & Analytics</Text>
                </View>
                <Text style={styles.desktopPageTitle}>Test History & Performance Analytics</Text>
                <Text style={styles.desktopPageSub}>
                  {hasHistory
                    ? `Review past test scores, retake challenging quizzes, and drill weak areas (${testHistory.length} completed)`
                    : 'Your completed test assessments and mistake drills will appear here'}
                </Text>
              </View>

              <View style={styles.desktopActionRow}>
                <Pressable
                  style={styles.desktopReportCardBtn}
                  onPress={() => router.push('/report-card' as any)}
                >
                  <Ionicons name="document-text" size={16} color="#7653A4" />
                  <Text style={styles.desktopReportCardBtnText}>Official Report Card</Text>
                </Pressable>

                {mistakeQuestions.length > 0 && (
                  <>
                    <Pressable
                      style={styles.desktopAiDiagnoseBtn}
                      onPress={handleDiagnoseMistakesWithAi}
                    >
                      <Ionicons name="sparkles" size={16} color="#7C3AED" />
                      <Text style={styles.desktopAiDiagnoseBtnText}>
                        AI Diagnosis ({mistakeQuestions.length})
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.desktopMistakeDrillBtn}
                      onPress={handleDrillAllMistakes}
                    >
                      <Ionicons name="flash" size={16} color="#FFF" />
                      <Text style={styles.desktopMistakeDrillBtnText}>
                        Drill Mistakes ({mistakeQuestions.length})
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        ) : (
          /* ── MOBILE HEADER (Clean Top App Bar with Back & Report Action) ── */
          <View style={[styles.mobileNavHeader, { paddingTop: topPad + 10 }]}>
            <View style={styles.mobileNavRow}>
              <Pressable onPress={handleBack} style={styles.mobileBackBtn} accessibilityLabel="Go back">
                <Ionicons name="arrow-back" size={20} color="#3D2D27" />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.mobileNavTitle} numberOfLines={1}>Test History</Text>
                <Text style={styles.mobileNavSub} numberOfLines={1}>
                  {hasHistory ? `${testHistory.length} completed assessments` : 'Track performance'}
                </Text>
              </View>

              <Pressable
                style={styles.mobileNavReportBtn}
                onPress={() => router.push('/report-card' as any)}
              >
                <Ionicons name="document-text" size={14} color="#7C3AED" />
                <Text style={styles.mobileNavReportBtnText}>Report Card</Text>
              </Pressable>
            </View>

            {/* Mobile KPI Summary Strip */}
            {hasHistory && (
              <View style={styles.mobileKpiRow}>
                <View style={styles.mobileKpiBox}>
                  <Text style={styles.mobileKpiVal}>{testHistory.length}</Text>
                  <Text style={styles.mobileKpiLbl}>Tests Taken</Text>
                </View>
                <View style={styles.mobileKpiBox}>
                  <Text style={[styles.mobileKpiVal, { color: '#059669' }]}>
                    {Math.round(
                      testHistory.reduce((acc, t) => acc + (t.percentage || (t.total ? (t.score / t.total) * 100 : 0)), 0) /
                        testHistory.length
                    )}%
                  </Text>
                  <Text style={styles.mobileKpiLbl}>Avg Accuracy</Text>
                </View>
                {mistakeQuestions.length > 0 ? (
                  <>
                    <Pressable style={[styles.mobileKpiBox, styles.mobileKpiBoxMistake]} onPress={handleDrillAllMistakes}>
                      <Text style={[styles.mobileKpiVal, { color: '#DC2626' }]}>{mistakeQuestions.length}</Text>
                      <Text style={[styles.mobileKpiLbl, { color: '#DC2626' }]}>Mistakes</Text>
                    </Pressable>
                    <Pressable style={[styles.mobileKpiBox, styles.mobileKpiBoxAi]} onPress={handleDiagnoseMistakesWithAi}>
                      <Ionicons name="sparkles" size={16} color="#7C3AED" />
                      <Text style={[styles.mobileKpiLbl, { color: '#7C3AED', fontWeight: '700' }]}>AI Tutor</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.mobileKpiBox}>
                    <Text style={[styles.mobileKpiVal, { color: '#C85C3E' }]}>0</Text>
                    <Text style={styles.mobileKpiLbl}>Mistakes</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── MAIN CONTENT CONTAINER ── */}
        <View style={[styles.container, isDesktop && styles.containerDesktop]}>
          {isDesktop ? (
            <View style={styles.desktopBentoRow}>
              {/* Left Column: Test Cards List */}
              <View style={styles.desktopBentoMain}>
                <View style={styles.listSectionHeader}>
                  <Text style={styles.sectionHeading}>Completed Assessments ({testHistory.length})</Text>
                </View>

                {hasHistory ? (
                  <View style={styles.historyList}>
                    {testHistory.map((item: TestResult, idx: number) => {
                      const pct =
                        typeof item.percentage === 'number'
                          ? Math.round(item.percentage)
                          : item.total > 0
                          ? Math.round((item.score / item.total) * 100)
                          : 0;
                      const scoreTheme = getScoreColors(pct);

                      return (
                        <View key={`${item.timestamp || idx}-${idx}`} style={styles.testCard}>
                          <View style={styles.testCardTop}>
                            <View style={styles.subjectIconBadge}>
                              <Ionicons name="trophy" size={20} color="#C85C3E" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.subjectName}>
                                {item.subjectName || 'Practice Test'}
                              </Text>
                              {item.chapterName ? (
                                <Text style={styles.chapterName} numberOfLines={1}>
                                  {item.chapterName}
                                </Text>
                              ) : null}
                            </View>
                            <View style={[styles.scoreBadge, { backgroundColor: scoreTheme.bg }]}>
                              <Text style={[styles.scoreText, { color: scoreTheme.text }]}>
                                {item.score}/{item.total}
                              </Text>
                              <Text style={[styles.scorePercentText, { color: scoreTheme.text }]}>
                                ({pct}%)
                              </Text>
                            </View>
                          </View>

                          <View style={styles.testCardFooter}>
                            <View style={styles.metaRow}>
                              <Ionicons name="time-outline" size={13} color="#9C8E85" />
                              <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
                              <Text style={styles.modeTag}>· {item.mode?.toUpperCase() || 'QUIZ'}</Text>
                            </View>
                            <Pressable
                              style={styles.retakeBtn}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push({
                                  pathname: '/test-config',
                                  params: {
                                    subjectName: item.subjectName,
                                    chapterName: item.chapterName,
                                  },
                                });
                              }}
                            >
                              <Text style={styles.retakeBtnText}>Practice Again</Text>
                              <Ionicons name="chevron-forward" size={13} color="#C85C3E" />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyCard}>
                      <View style={styles.iconWrap}>
                        <Ionicons name="document-text-outline" size={44} color="#C85C3E" />
                      </View>
                      <Text style={styles.emptyTitle}>No test records yet</Text>
                      <Text style={styles.emptySub}>
                        Take a quick quiz or chapter assessment from the Home dashboard to track your performance and build your study stats.
                      </Text>
                      <Pressable onPress={() => router.replace('/subjects')} style={styles.startBtn}>
                        <Text style={styles.startBtnText}>Explore Chapter Tests</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              {/* Right Column: Performance Stats & Quick Actions */}
              <View style={styles.desktopBentoAside}>
                <View style={styles.asideCard}>
                  <View style={styles.asideCardHeader}>
                    <Ionicons name="stats-chart" size={18} color="#C85C3E" />
                    <Text style={styles.asideCardTitle}>Performance Snapshot</Text>
                  </View>
                  <View style={styles.asideMetricsRow}>
                    <View style={styles.asideMetricBox}>
                      <Text style={styles.asideMetricVal}>{testHistory.length}</Text>
                      <Text style={styles.asideMetricLbl}>Tests Completed</Text>
                    </View>
                    <View style={styles.asideMetricBox}>
                      <Text style={styles.asideMetricVal}>
                        {testHistory.length > 0
                          ? Math.round(
                              testHistory.reduce((acc, t) => acc + (t.percentage || (t.total ? (t.score / t.total) * 100 : 0)), 0) /
                                testHistory.length
                            )
                          : 0}%
                      </Text>
                      <Text style={styles.asideMetricLbl}>Avg Accuracy</Text>
                    </View>
                  </View>
                  <View style={styles.asideMetricBoxFull}>
                    <Text style={[styles.asideMetricVal, { color: mistakeQuestions.length > 0 ? '#DC2626' : '#059669' }]}>
                      {mistakeQuestions.length}
                    </Text>
                    <Text style={styles.asideMetricLbl}>Mistake Bank Questions</Text>
                  </View>
                </View>

                <View style={styles.asideCard}>
                  <Text style={styles.asideCardTitle}>Quick Hub</Text>
                  <Pressable
                    style={styles.asideActionBtn}
                    onPress={() => router.push('/report-card' as any)}
                  >
                    <View style={[styles.asideActionIcon, { backgroundColor: '#F3E8FF' }]}>
                      <Ionicons name="document-text" size={16} color="#7653A4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.asideActionTitle}>Official Report Card</Text>
                      <Text style={styles.asideActionSub}>Printable performance transcript</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#A49186" />
                  </Pressable>

                  {mistakeQuestions.length > 0 && (
                    <>
                      <Pressable
                        style={styles.asideActionBtn}
                        onPress={handleDiagnoseMistakesWithAi}
                      >
                        <View style={[styles.asideActionIcon, { backgroundColor: '#EDE9FE' }]}>
                          <Ionicons name="sparkles" size={16} color="#7C3AED" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.asideActionTitle}>AI Tutor Diagnostic</Text>
                          <Text style={styles.asideActionSub}>Diagnose weak concepts with tutor</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#A49186" />
                      </Pressable>

                      <Pressable
                        style={styles.asideActionBtn}
                        onPress={() => router.push('/mistakes' as any)}
                      >
                        <View style={[styles.asideActionIcon, { backgroundColor: '#FEE2E2' }]}>
                          <Ionicons name="book-outline" size={16} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.asideActionTitle}>Mistake Notebook</Text>
                          <Text style={styles.asideActionSub}>{mistakeQuestions.length} to master</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#A49186" />
                      </Pressable>

                      <Pressable
                        style={styles.asideActionBtn}
                        onPress={handleDrillAllMistakes}
                      >
                        <View style={[styles.asideActionIcon, { backgroundColor: '#FEE2E2' }]}>
                          <Ionicons name="flash" size={16} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.asideActionTitle}>Drill Mistakes</Text>
                          <Text style={styles.asideActionSub}>{mistakeQuestions.length} questions queued</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#A49186" />
                      </Pressable>
                    </>
                  )}

                  <Pressable
                    style={styles.asideActionBtn}
                    onPress={() => router.replace('/subjects')}
                  >
                    <View style={[styles.asideActionIcon, { backgroundColor: '#FFF0EB' }]}>
                      <Ionicons name="book" size={16} color="#C85C3E" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.asideActionTitle}>Study Subjects</Text>
                      <Text style={styles.asideActionSub}>Explore topics & chapters</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#A49186" />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* Test Cards List */}
              {hasHistory ? (
                <View style={styles.historyList}>
                  <View style={styles.listSectionHeader}>
                    <Text style={styles.sectionHeading}>Completed Assessments ({testHistory.length})</Text>
                  </View>

                  {testHistory.map((item: TestResult, idx: number) => {
                    const pct =
                      typeof item.percentage === 'number'
                        ? Math.round(item.percentage)
                        : item.total > 0
                        ? Math.round((item.score / item.total) * 100)
                        : 0;
                    const scoreTheme = getScoreColors(pct);

                    return (
                      <View key={`${item.timestamp || idx}-${idx}`} style={styles.testCard}>
                        <View style={styles.testCardTop}>
                          <View style={styles.subjectIconBadge}>
                            <Ionicons name="trophy" size={20} color="#C85C3E" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.subjectName}>
                              {item.subjectName || 'Practice Test'}
                            </Text>
                            {item.chapterName ? (
                              <Text style={styles.chapterName} numberOfLines={1}>
                                {item.chapterName}
                              </Text>
                            ) : null}
                          </View>
                          <View style={[styles.scoreBadge, { backgroundColor: scoreTheme.bg }]}>
                            <Text style={[styles.scoreText, { color: scoreTheme.text }]}>
                              {item.score}/{item.total}
                            </Text>
                            <Text style={[styles.scorePercentText, { color: scoreTheme.text }]}>
                              ({pct}%)
                            </Text>
                          </View>
                        </View>

                        <View style={styles.testCardFooter}>
                          <View style={styles.metaRow}>
                            <Ionicons name="time-outline" size={13} color="#9C8E85" />
                            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
                            <Text style={styles.modeTag}>· {item.mode?.toUpperCase() || 'QUIZ'}</Text>
                          </View>
                          <Pressable
                            style={styles.retakeBtn}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              router.push({
                                pathname: '/test-config',
                                params: {
                                  subjectName: item.subjectName,
                                  chapterName: item.chapterName,
                                },
                              });
                            }}
                          >
                            <Text style={styles.retakeBtnText}>Practice Again</Text>
                            <Ionicons name="chevron-forward" size={13} color="#C85C3E" />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* ── EMPTY STATE ── */
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyCard}>
                    <View style={styles.iconWrap}>
                      <Ionicons name="document-text-outline" size={44} color="#C85C3E" />
                    </View>

                    <Text style={styles.emptyTitle}>No test records yet</Text>
                    <Text style={styles.emptySub}>
                      Take a quick quiz or chapter assessment from the Home dashboard to track your performance and build your study stats.
                    </Text>

                    <Pressable onPress={() => router.replace('/subjects')} style={styles.startBtn}>
                      <Text style={styles.startBtnText}>Explore Chapter Tests</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Tab Bar ONLY on mobile screens */}
      {!isDesktop && <BottomTabBar activeTab="history" />}
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
  desktopActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopReportCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D4C3EE',
    backgroundColor: '#FAF5FF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopReportCardBtnText: {
    color: '#7653A4',
    fontSize: 13,
    fontWeight: '800',
  },
  desktopAiDiagnoseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopAiDiagnoseBtnText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '800',
  },
  desktopMistakeDrillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopMistakeDrillBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* MOBILE NAV HEADER & KPI STRIP */
  mobileNavHeader: {
    backgroundColor: '#FFFDF9',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE4D9',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
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
  mobileNavReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F5EEFC',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  mobileNavReportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  mobileKpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  mobileKpiBox: {
    flex: 1,
    backgroundColor: '#FBF8F4',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE8DE',
  },
  mobileKpiBoxMistake: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  mobileKpiBoxAi: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  mobileKpiVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D2D27',
  },
  mobileKpiLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B786D',
    marginTop: 1,
  },

  /* RESPONSIVE CONTAINER */
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  containerDesktop: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 32,
    paddingTop: 4,
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
  asideMetricBoxFull: {
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
  asideActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FAF5EF',
    borderWidth: 1,
    borderColor: '#ECE3D8',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  asideActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  asideActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3D2D27',
  },
  asideActionSub: {
    fontSize: 11,
    color: '#8B786D',
    marginTop: 1,
  },

  /* MOBILE QUICK HUB */
  mobileQuickHub: {
    gap: 10,
    marginBottom: 16,
  },
  quickHubCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8DFD5',
    backgroundColor: '#FFFDF9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  quickHubCardMistake: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF8F8',
  },
  quickHubIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickHubTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3D2D27',
  },
  quickHubSub: {
    fontSize: 11,
    color: '#76645B',
    marginTop: 2,
  },
  drillPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  drillPillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3D2D27',
  },

  /* LIST OF TESTS */
  historyList: {
    gap: 12,
  },
  testCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8DFD5',
    backgroundColor: '#FFFDF9',
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  testCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  subjectIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D2D27',
  },
  chapterName: {
    fontSize: 12.5,
    color: '#76645B',
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 11,
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
  },
  scorePercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  testCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3ECE4',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 11.5,
    color: '#8A7A71',
    fontWeight: '600',
  },
  modeTag: {
    fontSize: 11,
    color: '#A49186',
    fontWeight: '700',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: '#FFF2EB',
    borderWidth: 1,
    borderColor: '#F6D9CD',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C85C3E',
  },

  /* EMPTY STATE */
  emptyContainer: {
    paddingTop: 30,
    alignItems: 'center',
  },
  emptyCard: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 24,
    paddingVertical: 54,
    paddingHorizontal: 32,
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E8DFD5',
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3D2D27',
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 21,
    color: '#76645B',
    marginBottom: 30,
    maxWidth: 420,
  },
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
  startBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
