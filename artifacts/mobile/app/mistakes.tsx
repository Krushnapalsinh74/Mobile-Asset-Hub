import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { DesktopHeaderNav } from '@/components/DesktopHeaderNav';
import MathText from '@/components/MathText';
import { useApp } from '@/context/AppContext';
import type { MistakeQuestion } from '@/context/AppContext';
import type { Question } from '@/services/api';
import { saveQuestions } from '@/store/questionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

function timeAgo(ts: number) {
  if (!ts) return 'recently';
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

function extractCorrectLetter(q: MistakeQuestion): string | null {
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

function getCorrectOptionIndex(q: MistakeQuestion): number {
  const letter = extractCorrectLetter(q);
  if (!letter) return -1;
  return letter.charCodeAt(0) - 'A'.charCodeAt(0);
}

function printHtmlOnWeb(html: string) {
  if (typeof window === 'undefined') return;
  const printWindow = window.open('', '_blank', 'width=950,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.warn('Popup print trigger warning:', e);
      }
    }, 400);
    return;
  }
  const oldFrame = document.getElementById('__mistakes_print_frame__');
  if (oldFrame) oldFrame.remove();
  const iframe = document.createElement('iframe');
  iframe.id = '__mistakes_print_frame__';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print error:', e);
    }
  };
  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => setTimeout(triggerPrint, 350);
  }
  setTimeout(triggerPrint, 700);
}

export default function MistakeNotebookScreen() {
  const {
    studentName,
    boardName,
    standardName,
    mistakeQuestions,
    removeMistake,
    clearMistakes,
    savedQuestions,
  } = useApp();

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const topPad = insets.top + (Platform.OS === 'web' ? 20 : 0);
  const tabBarHeight = isDesktop ? 24 : BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 12 : 0);

  const subjectTabs = useMemo(() => {
    const list = Array.from(new Set(mistakeQuestions.map((q) => q.subjectName).filter(Boolean))) as string[];
    return ['All', ...list];
  }, [mistakeQuestions]);

  const filteredQuestions = useMemo(() => {
    return mistakeQuestions.filter((q) => {
      const matchSubject = activeTab === 'All' ? true : q.subjectName?.toLowerCase() === activeTab.toLowerCase();
      if (!matchSubject) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.trim().toLowerCase();
      return (
        q.question?.toLowerCase().includes(query) ||
        q.chapterName?.toLowerCase().includes(query) ||
        q.solution?.toLowerCase().includes(query) ||
        q.explanation?.toLowerCase().includes(query)
      );
    });
  }, [mistakeQuestions, activeTab, searchQuery]);

  function toggleExpand(id: string) {
    Haptics.selectionAsync();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleReattempt(q: MistakeQuestion) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const converted: Question = {
      question: q.question,
      options: q.options,
      answer: q.answer,
      solution: q.solution,
      explanation: q.explanation,
    };
    const sessionId = saveQuestions([converted]);
    router.push({
      pathname: '/test-quiz' as any,
      params: {
        sessionId,
        subjectName: q.subjectName || 'Mistake Practice',
        chapterName: q.chapterName || 'Question Re-Attempt',
        mode: 'mcq',
      },
    });
  }

  function handleDrillAll(questions: MistakeQuestion[]) {
    if (questions.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const convertedList: Question[] = questions.map((m) => ({
      question: m.question,
      options: m.options,
      answer: m.answer,
      solution: m.solution,
      explanation: m.explanation,
    }));
    const sessionId = saveQuestions(convertedList);
    router.push({
      pathname: '/test-quiz' as any,
      params: {
        sessionId,
        subjectName: activeTab === 'All' ? 'Mistake Drill' : activeTab,
        chapterName: 'Weak Areas Re-Test',
        mode: 'mcq',
      },
    });
  }

  function handleAiDiagnoseSingle(q: MistakeQuestion) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prompt = `I made a mistake on this question from ${q.subjectName || 'Subject'}${q.chapterName ? ` (${q.chapterName})` : ''}:

Question:
${q.question}

${q.userAnswer ? `My Choice: ${q.userAnswer}` : 'I skipped/timed-out on this question.'}
Correct Answer: ${q.answer || 'Check solution below'}

${q.solution ? `Provided Solution: ${q.solution}` : ''}

Please:
1. Explain specifically why my answer was wrong and diagnose the conceptual trap.
2. Teach me the correct underlying concept/formula in simple steps.
3. Give me a memorable trick or rule of thumb to ace this in the real exam.`;

    router.push({
      pathname: '/chat' as any,
      params: {
        subjectName: q.subjectName || 'Mistake Diagnosis',
        chapterName: q.chapterName || 'Conceptual Review',
        initialPrompt: prompt,
      },
    });
  }

  function handleAiDiagnoseAll() {
    if (!mistakeQuestions.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sample = filteredQuestions.slice(0, 5);
    const summary = sample
      .map(
        (m, i) =>
          `[Question ${i + 1}] (${m.subjectName || 'Subject'}${m.chapterName ? ` - ${m.chapterName}` : ''}):\n${m.question}\nMy Answer: ${m.userAnswer || 'Skipped'}\nCorrect Answer: ${m.answer || 'See solution'}${m.solution ? `\nSolution: ${m.solution}` : ''}`
      )
      .join('\n\n');

    const prompt = `I have accumulated ${filteredQuestions.length} questions in my Mistake Notebook. Here are sample questions I struggled with:\n\n${summary}\n\nPlease:
1. Identify the recurring patterns or conceptual traps across these mistakes.
2. Explain the fundamental formulas or principles I need to strengthen.
3. Give me a 3-step action plan to master these weak areas before exam day.`;

    router.push({
      pathname: '/chat' as any,
      params: {
        subjectName: sample[0]?.subjectName || 'Mistake Review',
        chapterName: 'Weak Areas Diagnosis',
        initialPrompt: prompt,
      },
    });
  }

  function handleMarkMastered(id: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Mark as Mastered?',
      'Awesome job! This question will be removed from your Mistake Notebook as mastered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Mastered',
          style: 'default',
          onPress: () => removeMistake(id),
        },
      ]
    );
  }

  function handleClearAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Clear Mistake Notebook?',
      'Are you sure you want to clear all questions from your Mistake Notebook? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearMistakes(),
        },
      ]
    );
  }

  async function handleExportPdf() {
    if (filteredQuestions.length === 0) return;
    setIsExporting(true);
    try {
      const itemsHtml = filteredQuestions
        .map((q, idx) => {
          const correctIdx = getCorrectOptionIndex(q);
          const optionsHtml =
            q.options && q.options.length > 0
              ? `<div style="margin: 8px 0;">
                  ${q.options
                    .map((opt, oi) => {
                      const isCorrect = oi === correctIdx;
                      const isUser = q.userAnswer === opt;
                      const bg = isCorrect ? '#ECFDF5' : isUser ? '#FEE2E2' : '#F9FAFB';
                      const color = isCorrect ? '#065F46' : isUser ? '#991B1B' : '#374151';
                      const border = isCorrect ? '#10B981' : isUser ? '#EF4444' : '#E5E7EB';
                      const tag = isCorrect ? ' [CORRECT]' : isUser ? ' [YOUR ANSWER]' : '';
                      return `<div style="background:${bg};border:1px solid ${border};color:${color};padding:6px 10px;border-radius:6px;margin-bottom:4px;font-size:12px;">
                        <strong>${OPTION_LABELS[oi]}.</strong> ${opt} <em>${tag}</em>
                      </div>`;
                    })
                    .join('')}
                </div>`
              : '';

          return `
            <div style="page-break-inside:avoid;border:1px solid #E5E7EB;border-left:4px solid #C85C3E;border-radius:8px;padding:14px;margin-bottom:16px;background:#FFF;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:11px;color:#6B7280;">
                <span><strong>Q${idx + 1}</strong> • ${q.subjectName || 'Subject'}${q.chapterName ? ` - ${q.chapterName}` : ''}</span>
                <span>${timeAgo(q.timestamp)}</span>
              </div>
              <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px;">${q.question}</div>
              ${optionsHtml}
              ${
                q.userAnswer
                  ? `<div style="font-size:12px;color:#DC2626;margin:4px 0;"><strong>Your Past Choice:</strong> ${q.userAnswer}</div>`
                  : `<div style="font-size:12px;color:#D97706;margin:4px 0;"><em>Question was skipped or unattempted in test</em></div>`
              }
              ${
                q.solution || q.explanation
                  ? `<div style="background:#FDF6F0;border-left:3px solid #C85C3E;padding:8px 12px;border-radius:4px;margin-top:8px;font-size:12px;color:#374151;">
                      <strong>Concept & Solution:</strong><br/>
                      ${q.solution || q.explanation}
                    </div>`
                  : ''
              }
            </div>
          `;
        })
        .join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Mistake Notebook - ${studentName || 'Student'} - Knowledge Park</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #111827; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #C85C3E; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: 800; color: #C85C3E; }
            .meta { font-size: 12px; color: #6B7280; text-align: right; }
            .badge { background: #FEE2E2; color: #991B1B; font-weight: bold; padding: 3px 8px; border-radius: 99px; font-size: 11px; }
            @media print { body { margin: 15mm; } button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Knowledge Park • Mistake Notebook</div>
              <div style="font-size: 13px; color: #4B5563; margin-top: 4px;">Targeted Revision & Weak Areas Error Log</div>
            </div>
            <div class="meta">
              <div><strong>${studentName || 'Learner'}</strong></div>
              <div>${boardName || 'Board'} • ${standardName || 'Standard'}</div>
              <div>Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div style="margin-top: 4px;"><span class="badge">${filteredQuestions.length} Questions Queued</span></div>
            </div>
          </div>
          ${itemsHtml}
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        printHtmlOnWeb(fullHtml);
      } else {
        await Print.printAsync({ html: fullHtml });
      }
    } catch (e) {
      console.warn('Print error:', e);
    } finally {
      setIsExporting(false);
    }
  }

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
            <DesktopHeaderNav />

            {/* Desktop Page Title Banner */}
            <View style={styles.desktopHeaderStrip}>
              <View style={{ flex: 1 }}>
                <View style={styles.desktopBreadcrumb}>
                  <Pressable onPress={() => router.replace('/subjects')}>
                    <Text style={styles.desktopBreadcrumbLink}>Dashboard</Text>
                  </Pressable>
                  <Ionicons name="chevron-forward" size={12} color="#A49186" />
                  <Text style={styles.desktopBreadcrumbActive}>Mistake Notebook</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <Text style={styles.desktopPageTitle}>Mistake Notebook & Error Bank</Text>
                  <View style={styles.errorCountBadge}>
                    <Text style={styles.errorCountBadgeText}>{mistakeQuestions.length} to master</Text>
                  </View>
                </View>
                <Text style={styles.desktopPageSub}>
                  Turn your test errors into exam mastery. Review misconceptions, re-attempt questions, or ask the AI tutor to diagnose weak spots.
                </Text>
              </View>

              {mistakeQuestions.length > 0 && (
                <View style={styles.desktopHeaderActions}>
                  <Pressable
                    style={styles.desktopDrillBtn}
                    onPress={() => handleDrillAll(filteredQuestions.length > 0 ? filteredQuestions : mistakeQuestions)}
                  >
                    <Ionicons name="play" size={16} color="#FFF" />
                    <Text style={styles.desktopDrillBtnText}>
                      Drill Mistakes ({filteredQuestions.length})
                    </Text>
                  </Pressable>
                  <Pressable style={styles.desktopAiBtn} onPress={handleAiDiagnoseAll}>
                    <Ionicons name="sparkles" size={15} color="#7C3AED" />
                    <Text style={styles.desktopAiBtnText}>AI Diagnosis</Text>
                  </Pressable>
                  <Pressable style={styles.desktopExportBtn} onPress={handleExportPdf} disabled={isExporting}>
                    <Ionicons name="print-outline" size={16} color="#3D2D27" />
                    <Text style={styles.desktopExportBtnText}>Print Sheet</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* ── MOBILE HEADER (Top App Bar with Back & Actions) ── */
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.mobileNavTitle} numberOfLines={1}>Mistake Notebook</Text>
                  {mistakeQuestions.length > 0 && (
                    <View style={styles.mobileCountPill}>
                      <Text style={styles.mobileCountPillText}>{mistakeQuestions.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.mobileNavSub} numberOfLines={1}>
                  Target & fix conceptual gaps
                </Text>
              </View>
              {mistakeQuestions.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable
                    style={styles.mobileDrillBtn}
                    onPress={() => handleDrillAll(filteredQuestions.length > 0 ? filteredQuestions : mistakeQuestions)}
                  >
                    <Ionicons name="play" size={13} color="#FFF" />
                    <Text style={styles.mobileDrillBtnText}>Drill ({filteredQuestions.length})</Text>
                  </Pressable>
                  <Pressable style={styles.mobileIconBtn} onPress={handleExportPdf} disabled={isExporting}>
                    <Ionicons name="print-outline" size={18} color="#3D2D27" />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── TOP SECTION TOGGLE: MISTAKE NOTEBOOK vs SAVED BOOKMARKS ── */}
        <View style={[styles.navSwitcher, isDesktop && styles.navSwitcherDesktop]}>
          <Pressable style={[styles.navSwitcherTab, styles.navSwitcherTabActive]}>
            <Ionicons name="book" size={16} color="#DC2626" />
            <Text style={[styles.navSwitcherText, styles.navSwitcherTextActive]}>
              Mistake Notebook ({mistakeQuestions.length})
            </Text>
          </Pressable>
          <Pressable
            style={styles.navSwitcherTab}
            onPress={() => router.replace('/saved')}
          >
            <Ionicons name="bookmark-outline" size={16} color="#76645B" />
            <Text style={styles.navSwitcherText}>
              Bookmarks Vault ({savedQuestions.length})
            </Text>
          </Pressable>
        </View>

        {/* ── SEARCH & FILTER STRIP ── */}
        <View style={[styles.filterStrip, isDesktop && styles.filterStripDesktop]}>
          {/* Search Box */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#8B786D" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search mistakes by concept, question or chapter..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {!!searchQuery && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#A49186" />
              </Pressable>
            )}
          </View>

          {/* Subject Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {subjectTabs.map((sub) => {
              const isActive = activeTab === sub;
              const count = sub === 'All' ? mistakeQuestions.length : mistakeQuestions.filter((m) => m.subjectName === sub).length;
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
                    {sub} {count > 0 ? `(${count})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── MAIN CONTENT CONTAINER ── */}
        <View style={[styles.container, isDesktop && styles.containerDesktop]}>
          {mistakeQuestions.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIllustration}>
                <Ionicons name="sparkles" size={46} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>Your Mistake Notebook is Clear! 🎯</Text>
              <Text style={styles.emptySub}>
                Zero unmastered mistakes logged right now. When you take practice quizzes and get questions wrong or skip them, they automatically queue here so you can turn weaknesses into strengths.
              </Text>

              <View style={styles.emptyActionsRow}>
                <Pressable onPress={() => router.push('/test-config')} style={styles.startQuizBtn}>
                  <Ionicons name="play" size={16} color="#FFF" />
                  <Text style={styles.startQuizBtnText}>Start a Practice Quiz</Text>
                </Pressable>
                <Pressable onPress={() => router.replace('/subjects')} style={styles.browseSubjectsBtn}>
                  <Text style={styles.browseSubjectsBtnText}>Explore Curriculum</Text>
                </Pressable>
              </View>
            </View>
          ) : isDesktop ? (
            <View style={styles.desktopBentoRow}>
              {/* Left Column: Mistake Questions List */}
              <View style={styles.desktopBentoMain}>
                {filteredQuestions.length === 0 ? (
                  <View style={styles.emptyFilteredState}>
                    <Text style={styles.emptyFilteredText}>No mistakes found matching "{searchQuery}" in {activeTab}.</Text>
                  </View>
                ) : (
                  <View style={styles.questionsList}>
                    {filteredQuestions.map((q, idx) => {
                      const isOpen = expanded.has(q.id);
                      const correctIdx = getCorrectOptionIndex(q);
                      return (
                        <Pressable
                          key={q.id || idx}
                          onPress={() => toggleExpand(q.id)}
                          style={styles.qCard}
                        >
                          <View style={styles.qAccentBar} />
                          <View style={styles.qBody}>
                            {/* Card Header */}
                            <View style={styles.qHeaderRow}>
                              <View style={styles.qMeta}>
                                <View style={styles.subjectPill}>
                                  <Ionicons name="alert-circle" size={12} color="#DC2626" />
                                  <Text style={styles.subjectPillText} numberOfLines={1}>
                                    {q.subjectName || 'Subject'}
                                  </Text>
                                </View>
                                {q.chapterName && (
                                  <Text style={styles.chapterText} numberOfLines={1}>
                                    {q.chapterName.split('|||')[0]}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.qActions}>
                                <Text style={styles.savedTime}>{timeAgo(q.timestamp)}</Text>
                                <Pressable
                                  onPress={() => handleMarkMastered(q.id)}
                                  hitSlop={8}
                                  style={styles.masteredIconBtn}
                                  accessibilityLabel="Mark as Mastered"
                                >
                                  <Ionicons name="checkmark-done-circle-outline" size={18} color="#059669" />
                                </Pressable>
                              </View>
                            </View>

                            {/* Question Title & MathJax */}
                            <View style={styles.questionRow}>
                              <View style={styles.qNumBadge}>
                                <Text style={styles.qNumBadgeText}>Q{idx + 1}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <MathText
                                  style={styles.questionText}
                                  numberOfLines={isOpen ? undefined : 3}
                                  text={q.question}
                                />
                              </View>
                              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#A49186" />
                            </View>

                            {/* Quick Mistake Tag */}
                            {!isOpen && (
                              <View style={styles.miniMistakePreview}>
                                <View style={styles.miniMistakeRow}>
                                  <Text style={styles.miniMistakeLabel}>Your Choice:</Text>
                                  <Text style={styles.miniMistakeBad} numberOfLines={1}>
                                    {q.userAnswer ? q.userAnswer : 'Skipped / Unattempted'}
                                  </Text>
                                </View>
                                <View style={styles.miniMistakeRow}>
                                  <Text style={styles.miniMistakeLabel}>Correct:</Text>
                                  <Text style={styles.miniMistakeGood} numberOfLines={1}>
                                    {q.answer ? q.answer : 'Check full solution'}
                                  </Text>
                                </View>
                              </View>
                            )}

                            {/* Expanded Card Details */}
                            {isOpen && (
                              <View style={styles.expandedBody}>
                                {/* Choices Breakdown */}
                                {q.options && q.options.length > 0 && (
                                  <View style={styles.optionsWrap}>
                                    <Text style={styles.sectionLabel}>Answer Options Analysis</Text>
                                    {q.options.map((opt, oi) => {
                                      const isCorrect = oi === correctIdx;
                                      const isUserChoice = q.userAnswer === opt;
                                      return (
                                        <View
                                          key={oi}
                                          style={[
                                            styles.optionRow,
                                            isCorrect && styles.optionRowCorrect,
                                            isUserChoice && !isCorrect && styles.optionRowWrong,
                                          ]}
                                        >
                                          <View
                                            style={[
                                              styles.optLabel,
                                              isCorrect && styles.optLabelCorrect,
                                              isUserChoice && !isCorrect && styles.optLabelWrong,
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                styles.optLabelText,
                                                isCorrect && styles.optLabelTextCorrect,
                                                isUserChoice && !isCorrect && styles.optLabelTextWrong,
                                              ]}
                                            >
                                              {OPTION_LABELS[oi]}
                                            </Text>
                                          </View>
                                          <View style={{ flex: 1 }}>
                                            <MathText
                                              style={[
                                                styles.optText,
                                                isCorrect && styles.optTextCorrect,
                                                isUserChoice && !isCorrect && styles.optTextWrong,
                                              ]}
                                              text={opt}
                                            />
                                          </View>
                                          {isCorrect && (
                                            <View style={styles.correctIndicator}>
                                              <Ionicons name="checkmark-circle" size={15} color="#059669" />
                                              <Text style={styles.correctIndicatorText}>Correct</Text>
                                            </View>
                                          )}
                                          {isUserChoice && !isCorrect && (
                                            <View style={styles.wrongIndicator}>
                                              <Ionicons name="close-circle" size={15} color="#DC2626" />
                                              <Text style={styles.wrongIndicatorText}>Your Choice</Text>
                                            </View>
                                          )}
                                        </View>
                                      );
                                    })}
                                  </View>
                                )}

                                {/* Solution / Explanation Box */}
                                {(q.explanation || q.solution) && (
                                  <View style={styles.solutionBox}>
                                    <View style={styles.solutionHeader}>
                                      <Ionicons name="bulb" size={16} color="#C85C3E" />
                                      <Text style={styles.solutionTitle}>Concept & Step-by-Step Solution</Text>
                                    </View>
                                    <MathText style={styles.solutionText} text={q.explanation || q.solution || ''} />
                                  </View>
                                )}

                                {/* Card Action Buttons */}
                                <View style={styles.cardActionRow}>
                                  <Pressable
                                    style={styles.cardReattemptBtn}
                                    onPress={() => handleReattempt(q)}
                                  >
                                    <Ionicons name="refresh" size={14} color="#C85C3E" />
                                    <Text style={styles.cardReattemptBtnText}>Re-Attempt Now</Text>
                                  </Pressable>

                                  <Pressable
                                    style={styles.cardAiBtn}
                                    onPress={() => handleAiDiagnoseSingle(q)}
                                  >
                                    <Ionicons name="sparkles" size={14} color="#7C3AED" />
                                    <Text style={styles.cardAiBtnText}>Ask AI Tutor to Explain</Text>
                                  </Pressable>

                                  <Pressable
                                    style={styles.cardMasteredBtn}
                                    onPress={() => handleMarkMastered(q.id)}
                                  >
                                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                    <Text style={styles.cardMasteredBtnText}>Mark Mastered</Text>
                                  </Pressable>
                                </View>
                              </View>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Right Column: Mistake Analytics & Actions Hub */}
              <View style={styles.desktopBentoAside}>
                <View style={styles.asideCard}>
                  <View style={styles.asideCardHeader}>
                    <Ionicons name="pulse" size={18} color="#DC2626" />
                    <Text style={styles.asideCardTitle}>Error Bank Snapshot</Text>
                  </View>
                  <View style={styles.asideMetricsRow}>
                    <View style={styles.asideMetricBox}>
                      <Text style={[styles.asideMetricVal, { color: '#DC2626' }]}>{mistakeQuestions.length}</Text>
                      <Text style={styles.asideMetricLbl}>Pending Review</Text>
                    </View>
                    <View style={styles.asideMetricBox}>
                      <Text style={styles.asideMetricVal}>{subjectTabs.length - 1}</Text>
                      <Text style={styles.asideMetricLbl}>Subjects Involved</Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.asidePrimaryBtn}
                    onPress={() => handleDrillAll(filteredQuestions.length > 0 ? filteredQuestions : mistakeQuestions)}
                  >
                    <Ionicons name="play" size={16} color="#FFF" />
                    <Text style={styles.asidePrimaryBtnText}>
                      Re-Test Filtered ({filteredQuestions.length})
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.asideAiBtn}
                    onPress={handleAiDiagnoseAll}
                  >
                    <Ionicons name="sparkles" size={15} color="#7C3AED" />
                    <Text style={styles.asideAiBtnText}>
                      AI Trap Diagnostics
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.asideExportBtn}
                    onPress={handleExportPdf}
                    disabled={isExporting}
                  >
                    <Ionicons name="print-outline" size={15} color="#3D2D27" />
                    <Text style={styles.asideExportBtnText}>
                      {isExporting ? 'Generating...' : 'Export Printable Revision Sheet'}
                    </Text>
                  </Pressable>
                </View>

                {/* Cognitive Retention Card */}
                <View style={styles.asideCard}>
                  <View style={styles.asideCardHeader}>
                    <Ionicons name="school-outline" size={18} color="#C85C3E" />
                    <Text style={styles.asideCardTitle}>The 3-Step Mastery Formula</Text>
                  </View>
                  <View style={styles.formulaStep}>
                    <Text style={styles.formulaStepNum}>1</Text>
                    <Text style={styles.formulaStepText}>
                      <strong>Diagnose:</strong> Find out why you picked the wrong choice vs the correct formula.
                    </Text>
                  </View>
                  <View style={styles.formulaStep}>
                    <Text style={styles.formulaStepNum}>2</Text>
                    <Text style={styles.formulaStepText}>
                      <strong>Re-Test:</strong> Click "Re-Attempt Now" to verify you can solve it without hints.
                    </Text>
                  </View>
                  <View style={styles.formulaStep}>
                    <Text style={styles.formulaStepNum}>3</Text>
                    <Text style={styles.formulaStepText}>
                      <strong>Master:</strong> Tap "Mark Mastered" once confident to keep this notebook focused!
                    </Text>
                  </View>
                  <Pressable onPress={handleClearAll} style={styles.clearAllBtn}>
                    <Ionicons name="trash-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.clearAllBtnText}>Clear All Mistakes</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            /* Mobile Mistake Questions List */
            <View style={styles.questionsList}>
              {filteredQuestions.length === 0 ? (
                <View style={styles.emptyFilteredState}>
                  <Text style={styles.emptyFilteredText}>No mistakes found in {activeTab}.</Text>
                </View>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const isOpen = expanded.has(q.id);
                  const correctIdx = getCorrectOptionIndex(q);
                  return (
                    <Pressable
                      key={q.id || idx}
                      onPress={() => toggleExpand(q.id)}
                      style={styles.qCard}
                    >
                      <View style={styles.qAccentBar} />
                      <View style={styles.qBody}>
                        {/* Header */}
                        <View style={styles.qHeaderRow}>
                          <View style={styles.qMeta}>
                            <View style={styles.subjectPill}>
                              <Ionicons name="alert-circle" size={11} color="#DC2626" />
                              <Text style={styles.subjectPillText} numberOfLines={1}>
                                {q.subjectName || 'Subject'}
                              </Text>
                            </View>
                            {q.chapterName && (
                              <Text style={styles.chapterText} numberOfLines={1}>
                                {q.chapterName.split('|||')[0]}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.savedTime}>{timeAgo(q.timestamp)}</Text>
                        </View>

                        {/* Question */}
                        <View style={styles.questionRow}>
                          <View style={styles.qNumBadge}>
                            <Text style={styles.qNumBadgeText}>Q{idx + 1}</Text>
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

                        {/* Collapsed Preview */}
                        {!isOpen && (
                          <View style={styles.miniMistakePreview}>
                            <View style={styles.miniMistakeRow}>
                              <Text style={styles.miniMistakeLabel}>Your Choice:</Text>
                              <Text style={styles.miniMistakeBad} numberOfLines={1}>
                                {q.userAnswer ? q.userAnswer : 'Skipped in test'}
                              </Text>
                            </View>
                            <View style={styles.miniMistakeRow}>
                              <Text style={styles.miniMistakeLabel}>Correct:</Text>
                              <Text style={styles.miniMistakeGood} numberOfLines={1}>
                                {q.answer ? q.answer : 'Tap to reveal'}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Expanded Content */}
                        {isOpen && (
                          <View style={styles.expandedBody}>
                            {q.options && q.options.length > 0 && (
                              <View style={styles.optionsWrap}>
                                <Text style={styles.sectionLabel}>Options</Text>
                                {q.options.map((opt, oi) => {
                                  const isCorrect = oi === correctIdx;
                                  const isUserChoice = q.userAnswer === opt;
                                  return (
                                    <View
                                      key={oi}
                                      style={[
                                        styles.optionRow,
                                        isCorrect && styles.optionRowCorrect,
                                        isUserChoice && !isCorrect && styles.optionRowWrong,
                                      ]}
                                    >
                                      <View
                                        style={[
                                          styles.optLabel,
                                          isCorrect && styles.optLabelCorrect,
                                          isUserChoice && !isCorrect && styles.optLabelWrong,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.optLabelText,
                                            isCorrect && styles.optLabelTextCorrect,
                                            isUserChoice && !isCorrect && styles.optLabelTextWrong,
                                          ]}
                                        >
                                          {OPTION_LABELS[oi]}
                                        </Text>
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <MathText
                                          style={[
                                            styles.optText,
                                            isCorrect && styles.optTextCorrect,
                                            isUserChoice && !isCorrect && styles.optTextWrong,
                                          ]}
                                          text={opt}
                                        />
                                      </View>
                                      {isCorrect && (
                                        <Ionicons name="checkmark-circle" size={16} color="#059669" />
                                      )}
                                      {isUserChoice && !isCorrect && (
                                        <Ionicons name="close-circle" size={16} color="#DC2626" />
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}

                            {(q.explanation || q.solution) && (
                              <View style={styles.solutionBox}>
                                <View style={styles.solutionHeader}>
                                  <Ionicons name="bulb" size={15} color="#C85C3E" />
                                  <Text style={styles.solutionTitle}>Solution Breakdown</Text>
                                </View>
                                <MathText style={styles.solutionText} text={q.explanation || q.solution || ''} />
                              </View>
                            )}

                            <View style={styles.mobileCardActionGrid}>
                              <Pressable
                                style={styles.cardReattemptBtn}
                                onPress={() => handleReattempt(q)}
                              >
                                <Ionicons name="refresh" size={13} color="#C85C3E" />
                                <Text style={styles.cardReattemptBtnText}>Re-Attempt</Text>
                              </Pressable>

                              <Pressable
                                style={styles.cardAiBtn}
                                onPress={() => handleAiDiagnoseSingle(q)}
                              >
                                <Ionicons name="sparkles" size={13} color="#7C3AED" />
                                <Text style={styles.cardAiBtnText}>AI Diagnosis</Text>
                              </Pressable>

                              <Pressable
                                style={styles.cardMasteredBtn}
                                onPress={() => handleMarkMastered(q.id)}
                              >
                                <Ionicons name="checkmark-circle" size={13} color="#059669" />
                                <Text style={styles.cardMasteredBtnText}>Mastered</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Tab Bar on Mobile */}
      {!isDesktop && <BottomTabBar activeTab="history" />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4EEE5',
  },

  /* Desktop Nav Wrapper */
  desktopNavWrapper: {
    maxWidth: 1240,
    width: '94%',
    alignSelf: 'center',
    marginBottom: 16,
  },
  desktopHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFD1C3',
    paddingHorizontal: 28,
    paddingVertical: 22,
    marginTop: 14,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  desktopBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  desktopBreadcrumbLink: {
    fontSize: 12,
    color: '#8B786D',
    fontWeight: '600',
  },
  desktopBreadcrumbActive: {
    fontSize: 12,
    color: '#C85C3E',
    fontWeight: '700',
  },
  desktopPageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3D2D27',
  },
  errorCountBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  errorCountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  desktopPageSub: {
    fontSize: 13,
    color: '#76645B',
    marginTop: 6,
    maxWidth: 680,
    lineHeight: 19,
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
  },
  desktopDrillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C85C3E',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#C85C3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  desktopDrillBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  desktopAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },
  desktopAiBtnText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '700',
  },
  desktopExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },
  desktopExportBtnText: {
    color: '#3D2D27',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Mobile Nav Header */
  mobileNavHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F4EEE5',
  },
  mobileNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileNavTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3D2D27',
  },
  mobileCountPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  mobileCountPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  mobileNavSub: {
    fontSize: 11,
    color: '#8B786D',
    marginTop: 1,
  },
  mobileDrillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#C85C3E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mobileDrillBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mobileIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Tab Switcher: Mistakes vs Bookmarks */
  navSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#EAE1D5',
    padding: 4,
    borderRadius: 14,
  },
  navSwitcherDesktop: {
    maxWidth: 1240,
    width: '94%',
    alignSelf: 'center',
    marginHorizontal: 0,
    marginBottom: 16,
  },
  navSwitcherTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
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
    color: '#DC2626',
    fontWeight: '800',
  },

  /* Filter & Search Strip */
  filterStrip: {
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 10,
  },
  filterStripDesktop: {
    maxWidth: 1240,
    width: '94%',
    alignSelf: 'center',
    paddingHorizontal: 0,
    marginBottom: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DFD1C3',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#3D2D27',
    paddingVertical: 0,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E8DED1',
  },
  filterChipActive: {
    backgroundColor: '#C85C3E',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E4B42',
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  /* Containers */
  container: {
    paddingHorizontal: 16,
  },
  containerDesktop: {
    maxWidth: 1240,
    width: '94%',
    alignSelf: 'center',
    paddingHorizontal: 0,
  },
  desktopBentoRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  desktopBentoMain: {
    flex: 1,
  },
  desktopBentoAside: {
    width: 350,
    gap: 16,
  },

  /* Questions List */
  questionsList: {
    gap: 14,
  },
  qCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DFD1C3',
    overflow: 'hidden',
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  qAccentBar: {
    height: 4,
    backgroundColor: '#DC2626',
  },
  qBody: {
    padding: 16,
  },
  qHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  qMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  subjectPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  chapterText: {
    fontSize: 11,
    color: '#8B786D',
    fontWeight: '500',
    flex: 1,
  },
  qActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  masteredIconBtn: {
    padding: 2,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  qNumBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  qNumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  questionText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#2A1F1B',
    lineHeight: 22,
  },

  /* Mini Mistake Preview on Collapsed Card */
  miniMistakePreview: {
    backgroundColor: '#FFF5EE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F3E5D8',
  },
  miniMistakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniMistakeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#76645B',
    width: 80,
  },
  miniMistakeBad: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  miniMistakeGood: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    flex: 1,
  },

  /* Expanded Card */
  expandedBody: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EFE5D9',
    paddingTop: 12,
    gap: 12,
  },
  optionsWrap: {
    gap: 7,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E4B42',
    marginBottom: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  optionRowCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  optionRowWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  optLabel: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EAE1D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLabelCorrect: {
    backgroundColor: '#059669',
  },
  optLabelWrong: {
    backgroundColor: '#DC2626',
  },
  optLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5E4B42',
  },
  optLabelTextCorrect: {
    color: '#FFF',
  },
  optLabelTextWrong: {
    color: '#FFF',
  },
  optText: {
    fontSize: 13,
    color: '#3D2D27',
    lineHeight: 18,
  },
  optTextCorrect: {
    color: '#065F46',
    fontWeight: '600',
  },
  optTextWrong: {
    color: '#991B1B',
    fontWeight: '600',
  },
  correctIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  correctIndicatorText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  wrongIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  wrongIndicatorText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#991B1B',
  },

  /* Solution Box */
  solutionBox: {
    backgroundColor: '#FBF5EE',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  solutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  solutionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#C85C3E',
  },
  solutionText: {
    fontSize: 13,
    color: '#3D2D27',
    lineHeight: 20,
  },

  /* Card Action Row */
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cardReattemptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#C85C3E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardReattemptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85C3E',
  },
  cardAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardAiBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  cardMasteredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  cardMasteredBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },

  mobileCardActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },

  /* Empty States */
  emptyStateContainer: {
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DFD1C3',
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIllustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3D2D27',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13.5,
    color: '#76645B',
    textAlign: 'center',
    maxWidth: 500,
    marginTop: 8,
    lineHeight: 21,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  startQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C85C3E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  startQuizBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  browseSubjectsBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  browseSubjectsBtnText: {
    color: '#3D2D27',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyFilteredState: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DFD1C3',
    padding: 30,
    alignItems: 'center',
  },
  emptyFilteredText: {
    fontSize: 13,
    color: '#8B786D',
  },

  /* Aside Hub Cards */
  asideCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DFD1C3',
    padding: 20,
    gap: 14,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  asideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  asideCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3D2D27',
  },
  asideMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  asideMetricBox: {
    flex: 1,
    backgroundColor: '#F7EFE6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  asideMetricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3D2D27',
  },
  asideMetricLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B786D',
    marginTop: 2,
  },
  asidePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C85C3E',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#C85C3E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  asidePrimaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  asideAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingVertical: 11,
    borderRadius: 12,
  },
  asideAiBtnText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '700',
  },
  asideExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DFD1C3',
    paddingVertical: 11,
    borderRadius: 12,
  },
  asideExportBtnText: {
    color: '#3D2D27',
    fontSize: 12.5,
    fontWeight: '600',
  },
  formulaStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  formulaStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C85C3E',
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  formulaStepText: {
    flex: 1,
    fontSize: 12,
    color: '#5E4B42',
    lineHeight: 18,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFE5D9',
  },
  clearAllBtnText: {
    fontSize: 11.5,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});

