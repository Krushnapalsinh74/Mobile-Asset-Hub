import { useApp } from '@/context/AppContext';
import { eduApi, getId } from '@/services/api';
import type { Chapter } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActionConfig = {
  key: string;
  label: string;
  desc: string;
  tag: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  color: string;
  route: string;
  extra?: Record<string, string>;
};

const ACTIONS: ActionConfig[] = [
  {
    key: 'chapters',
    label: 'Chapters & Topics',
    desc: 'Browse all chapters and explore topics step by step',
    tag: 'Curriculum',
    icon: 'list',
    color: '#C85C3E',
    route: '/chapters',
  },
  {
    key: 'explanation',
    label: 'Explanation',
    desc: 'Deep-dive study guide and notes for any concept',
    tag: 'Study Guide',
    icon: 'bulb-outline',
    color: '#4F936C',
    route: '/chapters',
    extra: { mode: 'explanation' },
  },
  {
    key: 'test',
    label: 'Live Test',
    desc: 'AI-generated questions and timed practice to test yourself',
    tag: 'Practice Quiz',
    icon: 'trophy-outline',
    color: '#F59E0B',
    route: '/test-config',
  },
  {
    key: 'questions-pdf',
    label: 'Questions to PDF',
    desc: 'Create a custom printable question sheet with answer key',
    tag: 'Exam Paper',
    icon: 'document-text-outline',
    color: '#4388BA',
    route: '/questions-pdf',
  },
  {
    key: 'chat',
    label: 'AI Tutor',
    desc: 'Ask anything, get instant step-by-step guidance and doubt solving',
    tag: '24/7 AI Helper',
    icon: 'chatbubble-ellipses-outline',
    color: '#9333EA',
    route: '/chat',
  },
];

export default function SubjectScreen() {
  const { subjectId, subjectName } = useLocalSearchParams<{
    subjectId: string;
    subjectName: string;
  }>();
  const { boardId, standardId, boardName, standardName, setLastStudied, subjectProgress, testHistory, savedQuestions } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;

  const { data: chapters = [], isLoading: isLoadingChapters } = useQuery({
    queryKey: ['chapters', boardId, standardId, subjectId],
    queryFn: () => eduApi.getChapters(boardId!, standardId!, subjectId!),
    enabled: !!boardId && !!standardId && !!subjectId,
    initialData: () => eduApi.getCachedChapters(subjectId),
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (subjectId && subjectName) {
      setLastStudied({
        subjectId,
        subjectName,
        timestamp: Date.now(),
      });
    }
  }, [subjectId, subjectName]);

  const progress = subjectId ? subjectProgress[subjectId] : undefined;
  const explored = progress?.explored ?? 0;
  const total = progress?.total ?? (chapters.length || 0);
  const percent = total > 0 ? Math.min(100, Math.round((explored / total) * 100)) : 0;
  const subjectTests = (testHistory ?? []).filter(
    (t) => t.subjectName.toLowerCase() === (subjectName ?? '').toLowerCase()
  );
  const subjectSaved = (savedQuestions ?? []).filter(
    (q) => q.subjectName.toLowerCase() === (subjectName ?? '').toLowerCase()
  );

  const topPad = insets.top + (Platform.OS === 'web' ? 20 : 0);

  return (
    <View style={styles.root}>
      {/* ── TOP HEADER CARD ── */}
      <View style={[styles.headerCard, isDesktop && styles.headerCardDesktop, { paddingTop: topPad + 14 }]}>
        <View style={[styles.headerRow, isDesktop && styles.headerRowDesktop]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (router.canGoBack()) router.back();
              else router.replace('/subjects');
            }}
            style={({ pressed, hovered }: any) => [
              styles.backBtn,
              hovered && styles.backBtnHovered,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityLabel="Back to subjects"
          >
            <Ionicons name="arrow-back" size={20} color="#3D2D27" />
            {isDesktop && <Text style={styles.backBtnText}>Subjects</Text>}
          </Pressable>

          <View style={styles.subjectIconWrap}>
            <Ionicons name="document-text" size={22} color="#C85C3E" />
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.subjectName} numberOfLines={1}>
              {subjectName || 'Subject'}
            </Text>
            <Text style={styles.breadcrumb} numberOfLines={1}>
              {boardName || 'Gujarat Secondary Board'} • {standardName || 'Class 11'}
            </Text>
          </View>

          {isDesktop && (
            <View style={styles.headerRightDesktop}>
              <Pressable
                onPress={() => router.push('/history')}
                style={({ hovered }: any) => [styles.headerPill, hovered && styles.headerPillHovered]}
              >
                <Ionicons name="time-outline" size={15} color="#76645B" />
                <Text style={styles.headerPillText}>{subjectTests.length} Tests</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/saved')}
                style={({ hovered }: any) => [styles.headerPill, hovered && styles.headerPillHovered]}
              >
                <Ionicons name="bookmark-outline" size={15} color="#76645B" />
                <Text style={styles.headerPillText}>{subjectSaved.length} Saved</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.contentDesktop,
          { paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerContainer, isDesktop && styles.innerContainerDesktop]}>
          {isDesktop ? (
            <View style={styles.desktopLayout}>
              {/* ──── LEFT MAIN STAGE (FLEX 1) ──── */}
              <View style={styles.desktopMainColumn}>
                {/* 1. SPOTLIGHT CARD */}
                <LinearGradient
                  colors={['#C85C3E', '#A44732', '#863220']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.spotlightCard}
                >
                  <View style={styles.spotlightDecorCircle} />
                  <View style={styles.spotlightTopRow}>
                    <View style={styles.spotlightBadge}>
                      <Ionicons name="sparkles" size={12} color="#FFF8EF" />
                      <Text style={styles.spotlightBadgeText}>SUBJECT DASHBOARD</Text>
                    </View>
                    <Text style={styles.spotlightStatsText}>
                      {chapters.length > 0 ? `${chapters.length} Chapters` : 'Curriculum'} • {explored} Explored
                    </Text>
                  </View>

                  <View style={styles.spotlightContent}>
                    <Text style={styles.spotlightTitle}>{subjectName || 'Subject'}</Text>
                    <Text style={styles.spotlightSubtitle}>
                      {boardName || 'Gujarat Board'} • {standardName || 'Class 11'}
                    </Text>
                  </View>

                  <View style={styles.spotlightProgressSection}>
                    <View style={styles.spotlightProgressHeader}>
                      <Text style={styles.spotlightProgressLabel}>Curriculum Progress</Text>
                      <Text style={styles.spotlightProgressPercent}>{percent}% Completed</Text>
                    </View>
                    <View style={styles.spotlightProgressBarTrack}>
                      <View style={[styles.spotlightProgressBarFill, { width: `${Math.max(4, percent)}%` }]} />
                    </View>
                  </View>

                  <View style={styles.spotlightActionsRow}>
                    <Pressable
                      style={({ pressed, hovered }: any) => [
                        styles.spotlightPrimaryBtn,
                        hovered && styles.spotlightPrimaryBtnHovered,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/chapters',
                          params: { subjectId, subjectName },
                        });
                      }}
                    >
                      <Text style={styles.spotlightPrimaryBtnText}>Explore Curriculum</Text>
                      <Ionicons name="arrow-forward" size={14} color="#C85C3E" />
                    </Pressable>
                    <Pressable
                      style={({ pressed, hovered }: any) => [
                        styles.spotlightSecondaryBtn,
                        hovered && styles.spotlightSecondaryBtnHovered,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/test-config',
                          params: { subjectId, subjectName },
                        });
                      }}
                    >
                      <Ionicons name="trophy-outline" size={14} color="#FFF" />
                      <Text style={styles.spotlightSecondaryBtnText}>Practice Quiz</Text>
                    </Pressable>
                  </View>
                </LinearGradient>

                {/* 2. PRIMARY LEARNING PATHS (2x2 GRID) */}
                <View style={styles.sectionHeadingRow}>
                  <Text style={styles.sectionHeadingTitle}>Learning Pathways</Text>
                  <Text style={styles.sectionHeadingSub}>Choose a mode to study {subjectName}</Text>
                </View>

                <View style={styles.actionsGrid2x2}>
                  {ACTIONS.filter((a) => a.key !== 'chat').map((action) => (
                    <Pressable
                      key={action.key}
                      style={({ pressed, hovered }: any) => [
                        styles.desktopActionCard,
                        { borderLeftColor: action.color },
                        hovered && styles.desktopActionCardHovered,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: action.route as any,
                          params: {
                            subjectId,
                            subjectName,
                            ...(action.extra ?? {}),
                          },
                        });
                      }}
                    >
                      <View style={styles.actionCardTop}>
                        <View style={[styles.actionIconBadge, { backgroundColor: action.color + '18' }]}>
                          <Ionicons name={action.icon} size={20} color={action.color} />
                        </View>
                        <View style={styles.actionCardTopRight}>
                          <View style={[styles.actionTag, { backgroundColor: action.color + '14' }]}>
                            <Text style={[styles.actionTagText, { color: action.color }]}>{action.tag}</Text>
                          </View>
                          <View style={[styles.actionChevron, { backgroundColor: action.color + '12' }]}>
                            <Ionicons name="arrow-forward" size={13} color={action.color} />
                          </View>
                        </View>
                      </View>
                      <View style={styles.actionCardBody}>
                        <Text style={styles.actionTitleText}>{action.label}</Text>
                        <Text style={styles.actionDescText} numberOfLines={2}>{action.desc}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {/* 3. CHAPTERS & TOPICS DIRECTORY */}
                <View style={styles.chaptersCard}>
                  <View style={styles.chaptersHeader}>
                    <View style={styles.chaptersHeaderLeft}>
                      <View style={styles.chaptersIconWrap}>
                        <Ionicons name="book" size={18} color="#C85C3E" />
                      </View>
                      <View>
                        <Text style={styles.chaptersCardTitle}>Syllabus & Chapters</Text>
                        <Text style={styles.chaptersCardSubtitle}>
                          {chapters.length > 0 ? `${chapters.length} Chapters in this curriculum` : 'Loading chapters...'}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.viewAllChaptersBtn}
                      onPress={() => router.push({ pathname: '/chapters', params: { subjectId, subjectName } })}
                    >
                      <Text style={styles.viewAllChaptersText}>View all</Text>
                      <Ionicons name="chevron-forward" size={14} color="#C85C3E" />
                    </Pressable>
                  </View>

                  {isLoadingChapters ? (
                    <View style={styles.loadingChaptersWrap}>
                      <ActivityIndicator color="#C85C3E" />
                      <Text style={styles.loadingChaptersText}>Loading chapter syllabus...</Text>
                    </View>
                  ) : chapters.length === 0 ? (
                    <Text style={styles.emptyChaptersText}>No chapters available yet for this subject.</Text>
                  ) : (
                    <View style={styles.chapterListGrid}>
                      {chapters.slice(0, 8).map((ch, idx) => (
                        <Pressable
                          key={getId(ch) || idx}
                          style={({ pressed, hovered }: any) => [
                            styles.chapterItemRow,
                            hovered && styles.chapterItemRowHovered,
                            pressed && { opacity: 0.85 },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push({
                              pathname: '/chapters',
                              params: { subjectId, subjectName },
                            });
                          }}
                        >
                          <View style={styles.chapterIndexBadge}>
                            <Text style={styles.chapterIndexText}>{idx + 1}</Text>
                          </View>
                          <Text style={styles.chapterItemName} numberOfLines={1}>{ch.name}</Text>
                          <Ionicons name="chevron-forward" size={14} color="#A49186" style={styles.chapterChevron} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* ──── RIGHT SIDEBAR (360PX) ──── */}
              <View style={styles.desktopAsideColumn}>
                {/* 1. 24/7 AI TUTOR CARD */}
                <View style={styles.aiTutorCard}>
                  <View style={styles.aiTutorHeader}>
                    <View style={styles.aiTutorIconWrap}>
                      <Ionicons name="sparkles" size={20} color="#9333EA" />
                    </View>
                    <View style={styles.aiTutorBadge}>
                      <Text style={styles.aiTutorBadgeText}>24/7 AI TUTOR</Text>
                    </View>
                  </View>

                  <Text style={styles.aiTutorTitle}>Need help with {subjectName}?</Text>
                  <Text style={styles.aiTutorDesc}>
                    Ask our AI tutor anything — doubt solving, formula derivations, or step-by-step problem explanations.
                  </Text>

                  <View style={styles.aiTutorChipsWrap}>
                    <Pressable
                      style={({ hovered }: any) => [styles.aiPromptChip, hovered && styles.aiPromptChipHovered]}
                      onPress={() => router.push({ pathname: '/chat', params: { subjectId, subjectName } })}
                    >
                      <Text style={styles.aiPromptChipText}>⚡ Formula cheat sheet</Text>
                    </Pressable>
                    <Pressable
                      style={({ hovered }: any) => [styles.aiPromptChip, hovered && styles.aiPromptChipHovered]}
                      onPress={() => router.push({ pathname: '/chat', params: { subjectId, subjectName } })}
                    >
                      <Text style={styles.aiPromptChipText}>💡 Explain key concepts</Text>
                    </Pressable>
                    <Pressable
                      style={({ hovered }: any) => [styles.aiPromptChip, hovered && styles.aiPromptChipHovered]}
                      onPress={() => router.push({ pathname: '/chat', params: { subjectId, subjectName } })}
                    >
                      <Text style={styles.aiPromptChipText}>📝 Practice problems</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      styles.aiTutorBtn,
                      hovered && styles.aiTutorBtnHovered,
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: '/chat', params: { subjectId, subjectName } });
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFF" />
                    <Text style={styles.aiTutorBtnText}>Chat with AI Tutor</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFF" />
                  </Pressable>
                </View>

                {/* 2. SUBJECT ACTIVITY & STATS */}
                <View style={styles.asideCard}>
                  <Text style={styles.asideCardTitle}>Your Activity</Text>
                  <View style={styles.asideStatsGrid}>
                    <Pressable
                      style={({ hovered }: any) => [styles.asideStatBox, hovered && styles.asideStatBoxHovered]}
                      onPress={() => router.push('/history')}
                    >
                      <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
                      <Text style={styles.asideStatValue}>{subjectTests.length}</Text>
                      <Text style={styles.asideStatLabel}>Tests Taken</Text>
                    </Pressable>
                    <Pressable
                      style={({ hovered }: any) => [styles.asideStatBox, hovered && styles.asideStatBoxHovered]}
                      onPress={() => router.push('/saved')}
                    >
                      <Ionicons name="bookmark-outline" size={20} color="#C85C3E" />
                      <Text style={styles.asideStatValue}>{subjectSaved.length}</Text>
                      <Text style={styles.asideStatLabel}>Saved Questions</Text>
                    </Pressable>
                  </View>
                </View>

                {/* 3. EXAM PAPER BUILDER SHORTCUT */}
                <View style={styles.asideCard}>
                  <View style={styles.paperPromoTop}>
                    <View style={styles.paperPromoIconWrap}>
                      <Ionicons name="print-outline" size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.asideCardTitle}>Exam Paper Builder</Text>
                  </View>
                  <Text style={styles.paperPromoDesc}>
                    Create custom printable question papers with marks, answer keys, and LaTeX math.
                  </Text>
                  <Pressable
                    style={({ hovered }: any) => [styles.paperPromoBtn, hovered && styles.paperPromoBtnHovered]}
                    onPress={() => router.push({ pathname: '/questions-pdf', params: { subjectId, subjectName } })}
                  >
                    <Text style={styles.paperPromoBtnText}>Build Question Paper</Text>
                    <Ionicons name="arrow-forward" size={14} color="#1D4ED8" />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            /* ──── MOBILE LAYOUT ──── */
            <>
              <Text style={styles.sectionLabel}>Choose what to do</Text>
              <View style={styles.actionGrid}>
                {ACTIONS.map((action) => (
                  <Pressable
                    key={action.key}
                    style={({ pressed }: any) => [
                      styles.actionCard,
                      { borderLeftColor: action.color },
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({
                        pathname: action.route as any,
                        params: {
                          subjectId,
                          subjectName,
                          ...(action.extra ?? {}),
                        },
                      });
                    }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                      <Ionicons name={action.icon} size={22} color={action.color} />
                    </View>
                    <View style={styles.actionText}>
                      <View style={styles.actionLabelRow}>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                        {action.tag && (
                          <View style={[styles.actionTag, { backgroundColor: action.color + '14' }]}>
                            <Text style={[styles.actionTagText, { color: action.color }]}>{action.tag}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.actionDesc} numberOfLines={2}>{action.desc}</Text>
                    </View>
                    <View style={[styles.actionChevron, { backgroundColor: action.color + '12' }]}>
                      <Ionicons name="arrow-forward" size={15} color={action.color} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEE5' },

  /* HEADER */
  headerCard: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E9DED4',
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    zIndex: 10,
  },
  headerCardDesktop: {
    paddingHorizontal: 0,
    paddingBottom: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: '#E6DCD2',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRowDesktop: {
    width: '100%',
    maxWidth: 1600,
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F4EEE5',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  backBtnHovered: {
    backgroundColor: '#EADECF',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3D2D27',
  },
  subjectIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  subjectName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#3D2D27',
    letterSpacing: -0.3,
  },
  breadcrumb: {
    fontSize: 12,
    fontWeight: '500',
    color: '#76645B',
    marginTop: 1,
  },
  headerRightDesktop: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F4EEE5',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  headerPillHovered: {
    backgroundColor: '#EADECF',
  },
  headerPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B4B42',
  },

  /* CONTENT */
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  contentDesktop: {
    paddingHorizontal: 0,
    paddingTop: 24,
    width: '100%',
  },
  innerContainer: {
    width: '100%',
  },
  innerContainerDesktop: {
    width: '100%',
    maxWidth: 1600,
    alignSelf: 'center',
    paddingHorizontal: 32,
  },

  /* ──── DESKTOP BENTO COCKPIT ──── */
  desktopLayout: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'flex-start',
    width: '100%',
  },
  desktopMainColumn: {
    flex: 1,
    minWidth: 0,
    gap: 22,
  },
  desktopAsideColumn: {
    width: 360,
    gap: 20,
  },

  /* 1. SPOTLIGHT HERO BANNER */
  spotlightCard: {
    borderRadius: 24,
    padding: 28,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#B84F33',
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(200, 92, 62, 0.22)' as any },
      default: { elevation: 4 },
    }),
  },
  spotlightDecorCircle: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  spotlightTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  spotlightBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  spotlightStatsText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  spotlightContent: {
    marginBottom: 20,
  },
  spotlightTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  spotlightSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  spotlightProgressSection: {
    marginBottom: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderRadius: 14,
    padding: 14,
  },
  spotlightProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotlightProgressLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  spotlightProgressPercent: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  spotlightProgressBarTrack: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  spotlightProgressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  spotlightActionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  spotlightPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'all 0.18s ease' as any } : {}),
  },
  spotlightPrimaryBtnHovered: {
    backgroundColor: '#FDF7F4',
    transform: [{ translateY: -1 }],
  },
  spotlightPrimaryBtnText: {
    color: '#C85C3E',
    fontSize: 13,
    fontWeight: '800',
  },
  spotlightSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'all 0.18s ease' as any } : {}),
  },
  spotlightSecondaryBtnHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    transform: [{ translateY: -1 }],
  },
  spotlightSecondaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* 2. LEARNING PATHWAYS 2x2 GRID */
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  sectionHeadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3D2D27',
    letterSpacing: -0.2,
  },
  sectionHeadingSub: {
    fontSize: 12,
    color: '#76645B',
    fontWeight: '500',
  },
  actionsGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  desktopActionCard: {
    ...Platform.select({
      web: {
        width: 'calc(50% - 7px)' as any,
        flexBasis: 'calc(50% - 7px)' as any,
        cursor: 'pointer' as any,
        boxShadow: '0px 2px 10px rgba(61, 45, 39, 0.04)' as any,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' as any,
      },
      default: { width: '48%' },
    }),
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6DCD2',
    borderLeftWidth: 4,
    gap: 12,
  },
  desktopActionCardHovered: {
    ...Platform.select({
      web: {
        transform: [{ translateY: -3 }] as any,
        boxShadow: '0px 10px 24px rgba(61, 45, 39, 0.08)' as any,
        borderColor: '#D4C4B5',
      },
      default: {},
    }),
  },
  actionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCardBody: {
    gap: 4,
  },
  actionTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D2D27',
  },
  actionDescText: {
    fontSize: 12,
    color: '#76645B',
    lineHeight: 17,
  },

  /* 3. CHAPTERS & TOPICS DIRECTORY CARD */
  chaptersCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E6DCD2',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(61, 45, 39, 0.04)' as any },
      default: { elevation: 1 },
    }),
  },
  chaptersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DC',
  },
  chaptersHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chaptersIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chaptersCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3D2D27',
  },
  chaptersCardSubtitle: {
    fontSize: 12,
    color: '#76645B',
    marginTop: 1,
  },
  viewAllChaptersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4EEE5',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  viewAllChaptersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C85C3E',
  },
  loadingChaptersWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingChaptersText: {
    fontSize: 13,
    color: '#76645B',
  },
  emptyChaptersText: {
    fontSize: 13,
    color: '#8E7B70',
    paddingVertical: 20,
    textAlign: 'center',
  },
  chapterListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chapterItemRow: {
    ...Platform.select({
      web: {
        width: 'calc(50% - 5px)' as any,
        flexBasis: 'calc(50% - 5px)' as any,
        cursor: 'pointer' as any,
        transition: 'all 0.15s ease' as any,
      },
      default: { width: '48%' },
    }),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#ECE1D5',
  },
  chapterItemRowHovered: {
    backgroundColor: '#F4EDE2',
    borderColor: '#DECABA',
  },
  chapterIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EBE0D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5B4B42',
  },
  chapterItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#3D2D27',
  },
  chapterChevron: {
    marginLeft: 4,
  },

  /* ──── ASIDE COLUMN (RIGHT SIDEBAR) ──── */
  aiTutorCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(147, 51, 234, 0.08)' as any },
      default: { elevation: 2 },
    }),
  },
  aiTutorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  aiTutorIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTutorBadge: {
    backgroundColor: '#9333EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiTutorBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  aiTutorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E1065',
    marginBottom: 6,
  },
  aiTutorDesc: {
    fontSize: 12.5,
    color: '#6B21A8',
    lineHeight: 18,
    marginBottom: 16,
  },
  aiTutorChipsWrap: {
    gap: 8,
    marginBottom: 16,
  },
  aiPromptChip: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'all 0.15s ease' as any } : {}),
  },
  aiPromptChipHovered: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  aiPromptChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B21A8',
  },
  aiTutorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9333EA',
    paddingVertical: 12,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'all 0.15s ease' as any } : {}),
  },
  aiTutorBtnHovered: {
    backgroundColor: '#7E22CE',
  },
  aiTutorBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  asideCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6DCD2',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(61, 45, 39, 0.04)' as any },
      default: { elevation: 1 },
    }),
  },
  asideCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D2D27',
  },
  asideStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  asideStatBox: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#ECE1D5',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'all 0.15s ease' as any } : {}),
  },
  asideStatBoxHovered: {
    backgroundColor: '#F4EDE2',
    borderColor: '#DECABA',
  },
  asideStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3D2D27',
  },
  asideStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#76645B',
  },

  paperPromoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  paperPromoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperPromoDesc: {
    fontSize: 12,
    color: '#76645B',
    lineHeight: 17,
    marginBottom: 14,
  },
  paperPromoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'all 0.15s ease' as any } : {}),
  },
  paperPromoBtnHovered: {
    backgroundColor: '#DBEAFE',
  },
  paperPromoBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  /* ──── MOBILE STYLES ──── */
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 6,
  },
  actionGrid: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE3D8',
    borderLeftWidth: 3,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3D2D27',
  },
  actionTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionDesc: {
    fontSize: 11.5,
    color: '#76645B',
    lineHeight: 16,
  },
  actionChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
