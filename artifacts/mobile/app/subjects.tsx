import { useApp, type ChatSession, type LastStudied, type SavedQuestion, type SubjectProgress, type TestResult } from '@/context/AppContext';
import { BottomTabBar, BOTTOM_TAB_INNER_HEIGHT } from '@/components/BottomTabBar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { eduApi, type Subject } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { KNOWLEDGE_PARK_LOGO_IMAGE } from '@/constants/branding';

export default function SubjectsScreen() {
  const {
    studentName,
    boardId,
    standardId,
    boardName,
    standardName,
    lastStudied,
    subjectProgress,
    testHistory,
    chatHistory,
    savedQuestions,
    mistakeQuestions,
    isSubjectUnlocked,
  } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;
  const [mobileSelectMode, setMobileSelectMode] = useState(false);
  const [mobileSelectedSubjects, setMobileSelectedSubjects] = useState<Set<string>>(new Set());

  function toggleMobileSubject(idOrName: string) {
    setMobileSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(idOrName)) next.delete(idOrName);
      else next.add(idOrName);
      return next;
    });
  }

  const [mobileHeroSlide, setMobileHeroSlide] = useState(0);
  const mobileHeroSlides = [
    {
      eyebrow: 'YOUR LEARNING DESK',
      title: `Make today count, ${studentName || 'Learner'}.`,
      description: 'One small step at a time brings you closer to your goals.',
      action: 'Ask the AI tutor',
      kind: 'books' as const,
      icon: 'book' as const,
    },
    {
      eyebrow: 'LEARN IT. SEE IT. REMEMBER IT.',
      title: 'Turn big ideas into clear pictures.',
      description: 'Explore visual notes and diagrams as you work through each topic.',
      action: 'Explore subjects',
      kind: 'photo' as const,
      icon: 'images' as const,
    },
    {
      eyebrow: 'YOUR NEXT LESSON, ON PLAY',
      title: 'Watch a concept come to life.',
      description: 'Build understanding one short lesson at a time.',
      action: 'Find a lesson',
      kind: 'video' as const,
      icon: 'play' as const,
    },
  ];
  useEffect(() => {
    const timer = setInterval(() => {
      setMobileHeroSlide((current) => (current + 1) % mobileHeroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [mobileHeroSlides.length]);

  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects', boardId, standardId],
    queryFn: () => eduApi.getSubjects(boardId!, standardId!),
    enabled: !!boardId && !!standardId,
    initialData: () => eduApi.getCachedSubjects(boardId, standardId),
    staleTime: 1000 * 60 * 30,
  });

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 16);
  const tabBarHeight = isDesktop ? 24 : BOTTOM_TAB_INNER_HEIGHT + insets.bottom + (Platform.OS === 'web' ? 8 : 0);
  const currentMobileHero = mobileHeroSlides[mobileHeroSlide];
  const featuredSubject = subjects.find((subject) => subject.id === lastStudied?.subjectId) ?? subjects[0];
  const mobileProgressTotals = Object.values(subjectProgress).reduce(
    (totals, progress) => ({
      explored: totals.explored + progress.explored,
      total: totals.total + progress.total,
    }),
    { explored: 0, total: 0 },
  );
  const mobileProgressPercent = mobileProgressTotals.total > 0
    ? Math.min(100, Math.round((mobileProgressTotals.explored / mobileProgressTotals.total) * 100))
    : 0;

  if (isDesktop) {
    return (
      <DesktopHome
        isSubjectUnlocked={isSubjectUnlocked}
        studentName={studentName}
        boardName={boardName}
        standardName={standardName}
        subjects={subjects}
        isLoading={isLoading}
        topPad={topPad}
        lastStudied={lastStudied}
        subjectProgress={subjectProgress}
        testHistory={testHistory}
        chatHistory={chatHistory}
        savedQuestions={savedQuestions}
        mistakeQuestions={mistakeQuestions}
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: tabBarHeight + 24,
        }}
      >
        {/* TOP APP BAR */}
        <View style={[styles.appBar, styles.desktopContainer]}>
          <View style={styles.appBarLeft}>
            <Image
              source={KNOWLEDGE_PARK_LOGO_IMAGE}
              style={{ width: 155, height: 38 }}
              resizeMode="contain"
            />
          </View>
          <View style={styles.appBarRight}>
            <Pressable style={styles.mobileHeaderAction} onPress={() => router.push('/history')} accessibilityLabel="Test history">
              <Ionicons name="time-outline" size={19} color="#3D2D27" />
            </Pressable>
            <Pressable style={[styles.mobileHeaderAction, { backgroundColor: '#FFF5EE' }]} onPress={() => router.push('/payment' as any)} accessibilityLabel="Plans & Pricing">
              <Ionicons name="card-outline" size={19} color="#C85C3E" />
            </Pressable>
            <Pressable style={styles.mobileHeaderAction} onPress={() => router.push('/saved')} accessibilityLabel="Saved questions">
              <Ionicons name="bookmark-outline" size={19} color="#3D2D27" />
              {savedQuestions.length > 0 && <View style={styles.mobileHeaderBadge}><Text style={styles.mobileHeaderBadgeText}>{savedQuestions.length}</Text></View>}
            </Pressable>
            <Pressable style={styles.avatarButton} onPress={() => router.push('/settings')} accessibilityLabel="Profile">
              <Ionicons name="person" size={20} color="#C85C3E" />
            </Pressable>
          </View>
        </View>

        <View style={styles.px}>
          <LinearGradient
            colors={mobileHeroSlide === 1 ? ['#526F67', '#344F49'] : mobileHeroSlide === 2 ? ['#4A596E', '#323E52'] : ['#C85C3E', '#9E3F2B']}
            style={styles.mobileCarouselHero}
          >
            <View style={styles.mobileHeroAccent} />
            <View style={styles.mobileCarouselCopy}>
              <Text style={styles.mobileHeroEyebrow}>{currentMobileHero.eyebrow}</Text>
              <Text style={styles.mobileHeroTitle}>{currentMobileHero.title}</Text>
              <Text style={styles.mobileHeroSubtitle}>{currentMobileHero.description}</Text>
              <Pressable
                style={styles.mobileHeroButton}
                onPress={() => {
                  if (currentMobileHero.kind === 'books') {
                    router.push('/chat');
                  } else if (featuredSubject) {
                    router.push({ pathname: '/subject', params: { subjectId: featuredSubject.id, subjectName: featuredSubject.name } });
                  } else {
                    router.push('/subjects');
                  }
                }}
              >
                <Text style={styles.mobileHeroButtonText}>{currentMobileHero.action}</Text>
                <Ionicons name="arrow-forward" size={15} color="#C85C3E" />
              </Pressable>
            </View>
            <View style={styles.mobileCarouselArtwork}>
              {currentMobileHero.kind === 'books' ? (
                <>
                  <View style={styles.mobileCarouselOrbit} />
                  <View style={styles.mobileCarouselBook}><Ionicons name={currentMobileHero.icon} size={36} color="#C85C3E" /></View>
                  <View style={styles.mobileCarouselBookStack}><View style={styles.mobileCarouselBookGold} /><View style={styles.mobileCarouselBookGreen} /><View style={styles.mobileCarouselBookPeach} /></View>
                  <Ionicons name="sparkles" size={16} color="#F6D28B" style={styles.mobileCarouselSparkle} />
                </>
              ) : currentMobileHero.kind === 'photo' ? (
                <>
                  <View style={styles.mobilePhotoFrame} />
                  <View style={styles.mobilePhotoSun} />
                  <View style={styles.mobilePhotoHillBack} />
                  <View style={styles.mobilePhotoHillFront} />
                  <View style={styles.mobilePhotoTag}><Ionicons name="images-outline" size={10} color="#FFF8EF" /><Text style={styles.mobilePhotoTagText}>VISUAL NOTES</Text></View>
                </>
              ) : (
                <View style={styles.mobileVideoFrame}>
                  <Ionicons name="school-outline" size={35} color="rgba(255,248,239,0.78)" />
                  <View style={styles.mobileVideoPlay}><Ionicons name="play" size={18} color="#42536B" /></View>
                  <Text style={styles.mobileVideoLabel}>LESSON PREVIEW</Text>
                  <View style={styles.mobileVideoProgress}><View style={styles.mobileVideoProgressFill} /></View>
                </View>
              )}
            </View>
            <View style={styles.mobileCarouselControls}>
              <Pressable
                style={styles.mobileCarouselArrow}
                onPress={() => setMobileHeroSlide((mobileHeroSlide + mobileHeroSlides.length - 1) % mobileHeroSlides.length)}
                accessibilityLabel="Previous featured item"
              ><Ionicons name="chevron-back" size={14} color="#FFF8EF" /></Pressable>
              {mobileHeroSlides.map((slide, index) => (
                <Pressable
                  key={slide.kind}
                  style={[styles.mobileCarouselDot, index === mobileHeroSlide && styles.mobileCarouselDotActive]}
                  onPress={() => setMobileHeroSlide(index)}
                  accessibilityLabel={`Show featured item ${index + 1}`}
                />
              ))}
              <Pressable
                style={styles.mobileCarouselArrow}
                onPress={() => setMobileHeroSlide((mobileHeroSlide + 1) % mobileHeroSlides.length)}
                accessibilityLabel="Next featured item"
              ><Ionicons name="chevron-forward" size={14} color="#FFF8EF" /></Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* MY SUBJECTS */}
        <View style={[{ marginTop: 18 }, isDesktop && styles.desktopSubjectProgressRow]}>
          <View style={isDesktop ? styles.desktopSubjectsColumn : undefined}>
            <View style={[!isDesktop && styles.px, styles.sectionHeader]}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Ionicons name="book" size={20} color="#3D2D27" />
                <Text style={styles.sectionTitle}>My Subjects</Text>
              </View>
              <Pressable
                style={[styles.mobileSelectBtn, mobileSelectMode && styles.mobileSelectBtnActive]}
                onPress={() => {
                  if (mobileSelectMode) {
                    setMobileSelectedSubjects(new Set());
                    setMobileSelectMode(false);
                  } else {
                    setMobileSelectMode(true);
                  }
                }}
              >
                <Ionicons
                  name={mobileSelectMode ? "close" : "checkbox-outline"}
                  size={14}
                  color={mobileSelectMode ? "#C85C3E" : "#76645B"}
                />
                <Text style={[styles.mobileSelectBtnText, mobileSelectMode && { color: '#C85C3E' }]}>
                  {mobileSelectMode ? "Done" : "Select"}
                </Text>
              </Pressable>
            </View>
            {isLoading && subjects.length === 0 ? (
              <View style={[styles.subjectsScroll, isDesktop && styles.desktopSubjectsScroll]}><Text style={{ color: '#76645B' }}>Loading subjects...</Text></View>
            ) : isDesktop ? (
              <View style={[styles.subjectsScroll, styles.desktopSubjectsScroll]}>
                {subjects?.map((sub, index) => (
                  <Pressable
                    key={sub.id}
                    style={styles.desktopSubjectCard}
                    onPress={() => router.push({ pathname: '/subject', params: { subjectId: sub.id, subjectName: sub.name } })}
                  >
                    <View style={[styles.subjectIconWrap, styles.desktopSubjectIcon]}>
                      <Ionicons name={index % 2 === 0 ? 'library' : 'flask'} size={24} color="#C85C3E" />
                    </View>
                    <View style={styles.desktopSubjectCopy}>
                      <Text style={[styles.subjectCardTitle, styles.desktopSubjectTitle]}>{sub.name}</Text>
                      <Text style={styles.desktopSubjectCaption}>Pick up a lesson and keep moving forward.</Text>
                    </View>
                    <View style={styles.desktopSubjectArrow}><Ionicons name="arrow-forward" size={15} color="#C85C3E" /></View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ScrollView horizontal style={styles.subjectsScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
                {subjects?.map((sub) => {
                  const key = sub.id ?? sub.name;
                  const isSelected = mobileSelectedSubjects.has(key);
                  return (
                    <Pressable
                      key={sub.id}
                      style={[
                        styles.subjectCard,
                        subjects.length === 1 && { width: Math.max(160, width - 40) },
                        isSelected && { borderColor: '#C85C3E', borderWidth: 2, backgroundColor: '#FFF5EE' },
                      ]}
                      onPress={() => {
                        if (mobileSelectMode) {
                          toggleMobileSubject(key);
                          return;
                        }
                        router.push({ pathname: '/subject', params: { subjectId: sub.id, subjectName: sub.name } });
                      }}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setMobileSelectMode(true);
                        toggleMobileSubject(key);
                      }}
                    >
                      <View style={styles.mobileSubjectCardTop}>
                        <View style={styles.subjectIconWrap}>
                          <Ionicons name="library" size={22} color="#C85C3E" />
                        </View>
                        {(mobileSelectMode || isSelected) ? (
                          <View style={[styles.checkboxWrap, isSelected && styles.checkboxWrapSelected, { marginRight: 0 }]}>
                            {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                          </View>
                        ) : (
                          <View style={styles.mobileSubjectArrow}>
                            <Ionicons name="arrow-forward" size={14} color="#C85C3E" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.subjectCardTitle, isSelected && { color: '#C85C3E' }]} numberOfLines={1}>
                        {sub.name}
                      </Text>
                      <Text style={styles.mobileSubjectMeta}>
                        {sub.id && subjectProgress[sub.id] ? `${subjectProgress[sub.id].explored} lessons explored` : 'Open to start learning'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* LEARNING PROGRESS */}
          <View style={[isDesktop ? styles.desktopProgressColumn : styles.px, !isDesktop && { marginTop: 12 }]}>
            <View style={[styles.progressCard, isDesktop && styles.desktopProgressCard]}>
              <View style={styles.progressCardHeader}>
                <View style={styles.progressIconWrap}>
                  <Ionicons name="trending-up" size={21} color="#C85C3E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.progressCardTitle}>Your Learning Progress</Text>
                  <Text style={styles.progressCardSub}>{mobileProgressTotals.total > 0 ? `${mobileProgressTotals.explored} of ${mobileProgressTotals.total} lessons explored` : 'Your learning journey starts here'}</Text>
                </View>
                <Text style={styles.progressCardValue}>{mobileProgressPercent}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${mobileProgressPercent}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* LATEST UPDATES */}
        <View style={{ marginTop: 20 }}>
          <View style={[styles.px, styles.sectionHeader]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Ionicons name="megaphone" size={20} color="#3D2D27" />
              <Text style={styles.sectionTitle}>Latest Updates</Text>
            </View>
          </View>
          <View style={[styles.px, { paddingBottom: 16 }]}>
            <View style={[styles.mobileUpdateCard, isDesktop && styles.desktopUpdateCard]}>
              <View style={styles.mobileUpdateNew}><Text style={styles.mobileUpdateNewText}>NEW</Text></View>
              <View style={styles.mobileUpdateIcon}><Ionicons name="book" size={20} color="#C85C3E" /></View>
              <View style={styles.mobileUpdateCopy}>
                <Text style={styles.mobileUpdateTitle}>New Chapter Added</Text>
                <Text style={styles.mobileUpdateDescription}>Class 12 · Physics · Chapter 5</Text>
                <View style={styles.mobileUpdateFooter}>
                  <Text style={styles.mobileUpdateChapter}>Current Electricity</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* MOBILE FLOATING MULTI-SELECT DOCK */}
      {!isDesktop && mobileSelectedSubjects.size > 0 && (
        <View style={[styles.bottomDock, { bottom: tabBarHeight + 8 }]}>
          <View style={styles.dockInner}>
            <View style={styles.dockLeft}>
              <View style={styles.dockCountBadge}>
                <Text style={styles.dockCountText}>{mobileSelectedSubjects.size}</Text>
              </View>
              <Text style={styles.dockTitle}>
                {mobileSelectedSubjects.size === 1 ? '1 Subject' : `${mobileSelectedSubjects.size} Subjects`}
              </Text>
              <Pressable
                style={styles.dockClearBtn}
                onPress={() => setMobileSelectedSubjects(new Set())}
              >
                <Text style={styles.dockClearText}>Clear</Text>
              </Pressable>
            </View>

            <View style={styles.dockActions}>
              <Pressable
                style={styles.dockPrimaryBtn}
                onPress={() => {
                  const list = (subjects ?? []).filter((s) => mobileSelectedSubjects.has(s.id ?? s.name));
                  const sIds = list.map((s) => s.id ?? '').filter(Boolean).join(',');
                  const sNames = list.map((s) => s.name).join('|||');
                  router.push({
                    pathname: '/chapters',
                    params: { subjectId: sIds, subjectName: sNames },
                  });
                }}
              >
                <Ionicons name="list" size={14} color="#FFF" />
                <Text style={styles.dockPrimaryText}>Chapters</Text>
              </Pressable>

              <Pressable
                style={[styles.dockPrimaryBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => {
                  const list = (subjects ?? []).filter((s) => mobileSelectedSubjects.has(s.id ?? s.name));
                  const sIds = list.map((s) => s.id ?? '').filter(Boolean).join(',');
                  const sNames = list.map((s) => s.name).join('|||');
                  router.push({
                    pathname: '/test-config',
                    params: { subjectId: sIds, subjectName: sNames },
                  });
                }}
              >
                <Ionicons name="trophy-outline" size={14} color="#FFF" />
                <Text style={styles.dockPrimaryText}>Quiz</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {!isDesktop && <BottomTabBar activeTab="home" />}
    </View>
  );
}

function DesktopHome({
  isSubjectUnlocked,
  studentName,
  boardName,
  standardName,
  subjects,
  isLoading,
  topPad,
  lastStudied,
  subjectProgress,
  testHistory,
  chatHistory,
  savedQuestions,
}: {
  isSubjectUnlocked?: (id: any) => boolean;
  studentName?: string | null;
  boardName?: string | null;
  standardName?: string | null;
  subjects: Array<{ id?: string; name: string }>;
  isLoading: boolean;
  topPad: number;
  lastStudied: LastStudied | null;
  subjectProgress: Record<string, SubjectProgress>;
  testHistory: TestResult[];
  chatHistory: ChatSession[];
  savedQuestions: SavedQuestion[];
  mistakeQuestions?: import("@/context/AppContext").MistakeQuestion[];
}) {
  const [searchText, setSearchText] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

  function toggleSubject(idOrName: string) {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(idOrName)) next.delete(idOrName);
      else next.add(idOrName);
      return next;
    });
  }

  const progressTotals = Object.values(subjectProgress).reduce(
    (totals, progress) => ({
      explored: totals.explored + progress.explored,
      total: totals.total + progress.total,
    }),
    { explored: 0, total: 0 },
  );

  const progressPercent = progressTotals.total > 0
    ? Math.min(100, Math.round((progressTotals.explored / progressTotals.total) * 100))
    : 0;

  const continueSubject = subjects.find((s) => s.id === lastStudied?.subjectId) ?? subjects[0];
  const continueSubjectProgress = continueSubject?.id ? subjectProgress[continueSubject.id] : undefined;
  const continueExplored = continueSubjectProgress?.explored ?? (lastStudied ? 1 : 0);
  const continueTotal = continueSubjectProgress?.total && continueSubjectProgress.total > 0 ? continueSubjectProgress.total : 10;
  const continuePercent = continueTotal > 0
    ? Math.min(100, Math.round((continueExplored / continueTotal) * 100))
    : 0;

  const visibleSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  const recentActivity = [
    ...testHistory.map((test) => ({
      id: `test-${test.timestamp}`,
      title: 'Test completed',
      detail: `${test.subjectName}${test.chapterName ? ` · ${test.chapterName}` : ''}`,
      score: test.score != null ? `${test.score}/${test.total}` : undefined,
      timestamp: test.timestamp,
      icon: 'trophy-outline' as const,
      color: '#F59E0B',
      background: '#FEF3C7',
      route: '/history' as const,
    })),
    ...savedQuestions.map((question) => ({
      id: `saved-${question.id}`,
      title: 'Question bookmarked',
      detail: `${question.subjectName}${question.chapterName ? ` · ${question.chapterName}` : ''}`,
      score: undefined,
      timestamp: question.savedAt,
      icon: 'bookmark-outline' as const,
      color: '#C85C3E',
      background: '#FEE2E2',
      route: '/saved' as const,
    })),
    ...chatHistory.map((chat) => ({
      id: `chat-${chat.timestamp}`,
      title: 'AI Tutor session',
      detail: `${chat.subjectName}${chat.topicName ? ` · ${chat.topicName}` : ''}`,
      score: undefined,
      timestamp: chat.timestamp,
      icon: 'chatbubble-ellipses-outline' as const,
      color: '#9333EA',
      background: '#F3E8FF',
      route: '/chat' as const,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayDayIndex = (new Date().getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - todayDayIndex);
  startOfWeek.setHours(0, 0, 0, 0);

  const activeDaysThisWeek = new Set<number>();
  const allEvents = [
    ...testHistory.map((t) => t.timestamp),
    ...chatHistory.map((c) => c.timestamp),
    ...savedQuestions.map((s) => s.savedAt),
  ];
  allEvents.forEach((ts) => {
    const d = new Date(ts);
    if (d >= startOfWeek) {
      activeDaysThisWeek.add((d.getDay() + 6) % 7);
    }
  });
  const activeStreakCount = activeDaysThisWeek.size;

  return (
    <View style={styles.desktopRoot}>
      <ScrollView
        style={styles.desktopScrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[styles.desktopScrollContent, { paddingTop: topPad, paddingBottom: 64 }]}
      >
        {/* ── TOP COMMAND BAR ── */}
        <View style={styles.desktopNav}>
          <View style={styles.desktopNavLeft}>
            <Image
              source={KNOWLEDGE_PARK_LOGO_IMAGE}
              style={{ width: 180, height: 44, marginRight: 8 }}
              resizeMode="contain"
            />
            <View style={styles.desktopBoardPill}>
              <View style={styles.desktopBoardDot} />
              <Text style={styles.desktopBoardText} numberOfLines={1}>
                {boardName || 'Curriculum'} • {standardName || 'Standard'}
              </Text>
            </View>
          </View>

          <View style={styles.desktopSearchWrap}>
            <Ionicons name="search" size={17} color="#8B786D" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search subjects, chapters, questions..."
              placeholderTextColor="#A49186"
              style={styles.desktopSearchInput}
            />
            {!!searchText && (
              <Pressable onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={16} color="#A49186" />
              </Pressable>
            )}
          </View>

          <View style={styles.desktopNavRight}>
            {activeStreakCount > 0 && (
              <View style={styles.desktopStreakBadge}>
                <Text style={styles.desktopStreakIcon}>🔥</Text>
                <Text style={styles.desktopStreakLabel}>{activeStreakCount}-Day Streak</Text>
              </View>
            )}

            <Pressable
              style={({ hovered }: any) => [styles.desktopNavLink, hovered && styles.desktopNavLinkHovered]}
              onPress={() => router.push('/history')}
            >
              <Ionicons name="time-outline" size={17} color="#5E4B42" />
              <Text style={styles.desktopNavLinkText}>History</Text>
            </Pressable>

            <Pressable
              style={({ hovered }: any) => [styles.desktopNavLink, hovered && styles.desktopNavLinkHovered]}
              onPress={() => router.push('/saved')}
            >
              <Ionicons name="bookmark-outline" size={17} color="#5E4B42" />
              <Text style={styles.desktopNavLinkText}>Saved</Text>
              {savedQuestions.length > 0 && (
                <View style={styles.desktopNavBadge}>
                  <Text style={styles.desktopNavBadgeText}>{savedQuestions.length}</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={({ hovered }: any) => [styles.desktopNavLink, hovered && styles.desktopNavLinkHovered]}
              onPress={() => router.push('/chat')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={17} color="#9333EA" />
              <Text style={[styles.desktopNavLinkText, { color: '#9333EA' }]}>AI Tutor</Text>
            </Pressable>

            <Pressable
              style={({ hovered }: any) => [styles.desktopProfileBtn, hovered && styles.desktopProfileBtnHovered]}
              onPress={() => router.push('/settings')}
            >
              <View style={styles.desktopAvatarWrap}>
                <Ionicons name="person" size={16} color="#C85C3E" />
              </View>
              <Text style={styles.desktopStudentName}>{studentName || 'Learner'}</Text>
              <Ionicons name="chevron-down" size={13} color="#8B786D" />
            </Pressable>
          </View>
        </View>



        {/* ── EXPANDED CLEAN HERO DASHBOARD ── */}
        {continueSubject && (
          <LinearGradient
            colors={['#C85C3E', '#A44732', '#7E2F1F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.spotlightCard}
          >
            <View style={styles.spotlightCardDecorOne} />
            <View style={styles.spotlightCardDecorTwo} />

            {/* ── Top Header Row: Welcome & Board Info ── */}
            <View style={styles.spotlightHeaderRow}>
              <View style={styles.spotlightWelcomeArea}>
                <Text style={styles.spotlightWelcomeTitle}>
                  Welcome back, {studentName || 'Scholar'}! ✨
                </Text>
                <Text style={styles.spotlightWelcomeSub}>
                  Command Center • {boardName || 'Curriculum'} ({standardName || 'Your Class'})
                </Text>
              </View>

              <View style={styles.spotlightDailyPill}>
                <Ionicons name="sparkles" size={13} color="#FED7AA" />
                <Text style={styles.spotlightDailyTitle}>Daily Goal:</Text>
                <Text style={styles.spotlightDailySub}>1 Quiz + 1 Guide</Text>
              </View>
            </View>

            <View style={styles.spotlightDivider} />

            {/* ── 3-Card Feature Bento Row (Active Study + Instant Doubts + Study Snapshot) ── */}
            <View style={styles.heroFeaturesRow}>
              {/* FEATURE 1: ACTIVE STUDY FOCUS */}
              <View style={styles.heroFeatureCardActive}>
                <View style={styles.heroFeatureTop}>
                  <View style={styles.spotlightBadge}>
                    <Ionicons name="flash" size={11} color="#FFF8EF" />
                    <Text style={styles.spotlightBadgeText}>ACTIVE FOCUS</Text>
                  </View>
                  <View style={styles.spotlightLiveStatus}>
                    <View style={styles.spotlightPulseDot} />
                    <Text style={styles.spotlightStatusText}>Ready</Text>
                  </View>
                </View>

                <View style={{ marginVertical: 8 }}>
                  <Text style={styles.spotlightSubjectName}>{continueSubject.name}</Text>
                  <Text style={styles.heroActiveTitle} numberOfLines={1}>
                    {lastStudied?.chapterName ?? 'Explore Chapters & Lessons'}
                  </Text>
                </View>

                <View style={styles.heroActiveProgressWrap}>
                  <View style={styles.heroProgressLabels}>
                    <Text style={styles.heroProgressText}>{continuePercent}% Mastered</Text>
                    <Text style={styles.heroProgressCount}>{continueExplored} Lessons</Text>
                  </View>
                  <View style={styles.spotlightProgressBar}>
                    <View style={[styles.spotlightProgressFill, { width: `${continuePercent}%` }]} />
                  </View>
                </View>

                <View style={styles.heroActionsRow}>
                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      styles.spotlightPrimaryBtn,
                      hovered && styles.spotlightPrimaryBtnHovered,
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: '/subject',
                        params: { subjectId: continueSubject.id, subjectName: continueSubject.name },
                      })
                    }
                  >
                    <Ionicons name="play" size={14} color="#9E3F2B" />
                    <Text style={styles.spotlightPrimaryBtnText}>Resume</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      styles.spotlightSecondaryBtn,
                      hovered && styles.spotlightSecondaryBtnHovered,
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: '/test-config',
                        params: { subjectId: continueSubject.id, subjectName: continueSubject.name },
                      })
                    }
                  >
                    <Ionicons name="trophy-outline" size={14} color="#FFF8EF" />
                    <Text style={styles.spotlightSecondaryBtnText}>Quiz</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      styles.spotlightSecondaryBtn,
                      hovered && styles.spotlightSecondaryBtnHovered,
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: '/questions-pdf',
                        params: { subjectId: continueSubject.id, subjectName: continueSubject.name },
                      })
                    }
                  >
                    <Ionicons name="document-text-outline" size={14} color="#FFF8EF" />
                    <Text style={styles.spotlightSecondaryBtnText}>Paper</Text>
                  </Pressable>
                </View>
              </View>

              {/* FEATURE 2: INSTANT DOUBTS & TUTOR */}
              <View style={styles.heroFeatureCardAi}>
                <View style={styles.heroFeatureTop}>
                  <View style={[styles.spotlightBadge, { backgroundColor: 'rgba(255, 248, 239, 0.18)', borderColor: 'rgba(255, 248, 239, 0.25)' }]}>
                    <Ionicons name="chatbubble-ellipses" size={12} color="#FED7AA" />
                    <Text style={[styles.spotlightBadgeText, { color: '#FFF8EF' }]}>AI STUDY ROOM</Text>
                  </View>
                  <View style={styles.aiLiveBadge}>
                    <Text style={styles.aiLiveBadgeText}>24/7</Text>
                  </View>
                </View>

                <View style={{ marginVertical: 8 }}>
                  <Text style={styles.heroAiTitle}>Instant Doubts & Tutor</Text>
                  <Text style={styles.heroAiDesc}>
                    Stuck on a question? Get instant step-by-step solutions.
                  </Text>
                </View>

                <Pressable
                  style={({ pressed, hovered }: any) => [
                    styles.heroAiBtn,
                    hovered && styles.heroAiBtnHovered,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => router.push('/chat')}
                >
                  <Ionicons name="sparkles" size={14} color="#C85C3E" />
                  <Text style={styles.heroAiBtnText}>Ask AI Tutor</Text>
                  <Ionicons name="arrow-forward" size={13} color="#C85C3E" />
                </Pressable>
              </View>

              {/* FEATURE 3: YOUR STUDY SNAPSHOT */}
              <View style={styles.heroFeatureCardSnapshot}>
                <View style={styles.heroFeatureTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="analytics-outline" size={14} color="#FED7AA" />
                    <Text style={styles.heroSnapshotHeading}>Study Snapshot</Text>
                  </View>
                  <Text style={styles.heroMasteryPill}>{progressPercent}% Mastery</Text>
                </View>

                <View style={styles.heroSnapshotGrid}>
                  <View style={styles.heroSnapshotBox}>
                    <Text style={styles.heroSnapshotVal}>{progressTotals.explored}</Text>
                    <Text style={styles.heroSnapshotLbl}>Lessons</Text>
                  </View>
                  <View style={styles.heroSnapshotBox}>
                    <Text style={styles.heroSnapshotVal}>{testHistory.length}</Text>
                    <Text style={styles.heroSnapshotLbl}>Tests</Text>
                  </View>
                  <View style={styles.heroSnapshotBox}>
                    <Text style={styles.heroSnapshotVal}>{savedQuestions.length}</Text>
                    <Text style={styles.heroSnapshotLbl}>Saved</Text>
                  </View>
                  <View style={styles.heroSnapshotBox}>
                    <Text style={styles.heroSnapshotVal}>{chatHistory.length}</Text>
                    <Text style={styles.heroSnapshotLbl}>Chats</Text>
                  </View>
                </View>

                <View style={styles.heroSnapshotMasteryTrack}>
                  <View style={[styles.heroSnapshotMasteryFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* ── BENTO DASHBOARD (2 COLUMNS) ── */}
        <View style={styles.desktopBentoContainer}>
          {/* ──── LEFT MAIN STAGE ──── */}
          <View style={styles.desktopBentoMain}>

            {/* 2. CURRICULUM SUBJECTS GRID */}
            <View style={styles.curriculumSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Your Curriculum</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    style={[styles.desktopSelectToggleBtn, selectMode && styles.desktopSelectToggleBtnActive]}
                    onPress={() => {
                      if (selectMode) {
                        setSelectedSubjects(new Set());
                        setSelectMode(false);
                      } else {
                        setSelectMode(true);
                      }
                    }}
                  >
                    <Ionicons
                      name={selectMode ? "close" : "checkbox-outline"}
                      size={15}
                      color={selectMode ? "#C85C3E" : "#5E4B42"}
                    />
                    <Text style={[styles.desktopSelectToggleBtnText, selectMode && styles.desktopSelectToggleBtnTextActive]}>
                      {selectMode ? "Done" : "Select Multiple"}
                    </Text>
                  </Pressable>
                  <View style={styles.subjectCountBadge}>
                    <Text style={styles.subjectCountText}>{visibleSubjects.length} Available</Text>
                  </View>
                </View>
              </View>

              {isLoading && visibleSubjects.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>Loading your curriculum...</Text>
                </View>
              ) : (
                <View style={styles.subjectsBentoGrid}>
                  {visibleSubjects.map((subject, idx) => {
                    const prog = subject.id ? subjectProgress[subject.id] : undefined;
                    const subPercent = prog && prog.total > 0
                      ? Math.min(100, Math.round((prog.explored / prog.total) * 100))
                      : 0;
                    const colorPalette = [
                      { bg: '#F6DFD2', accent: '#C85C3E', icon: 'flask-outline' },
                      { bg: '#DCEBDD', accent: '#4F936C', icon: 'planet-outline' },
                      { bg: '#DCECEF', accent: '#4388BA', icon: 'calculator-outline' },
                      { bg: '#F8E4C9', accent: '#D97706', icon: 'book-outline' },
                    ][idx % 4]!;
                    const key = subject.id ?? subject.name;
                    const isSelected = selectedSubjects.has(key);

                    return (
                      <View
                        key={key}
                        style={[
                          styles.subjectBentoCard,
                          isSelected && styles.subjectBentoCardSelected,
                        ]}
                      >
                        <Pressable
                          style={styles.subjectCardMainClick}
                          onPress={(e: any) => {
                            if (selectMode || e?.ctrlKey || e?.metaKey) {
                              setSelectMode(true);
                              toggleSubject(key);
                              return;
                            }
                            router.push({
                              pathname: '/subject',
                              params: { subjectId: subject.id, subjectName: subject.name },
                            });
                          }}
                        >
                          <View style={styles.subjectCardTop}>
                            <View style={[styles.subjectIconBadge, { backgroundColor: colorPalette.bg }]}>
                              <Ionicons name={colorPalette.icon as any} size={22} color={colorPalette.accent} />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {(selectMode || isSelected) && (
                                <Pressable
                                  style={[styles.subjectCheckboxWrap, isSelected && styles.subjectCheckboxWrapSelected]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    setSelectMode(true);
                                    toggleSubject(key);
                                  }}
                                >
                                  {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                                </Pressable>
                              )}
                              <View style={styles.subjectBadgePill}>
                                <Text style={styles.subjectBadgePillText}>{standardName || 'Subject'}</Text>
                              </View>
                            </View>
                          </View>

                          <Text style={[styles.subjectCardTitle, isSelected && { color: '#C85C3E' }]} numberOfLines={1}>
                            {subject.name}
                          </Text>
                          <Text style={styles.subjectCardMeta}>
                            {prog?.explored ?? 0} lessons completed
                          </Text>

                          <View style={styles.subjectCardTrack}>
                            <View
                              style={[
                                styles.subjectCardFill,
                                { width: `${subPercent}%`, backgroundColor: colorPalette.accent },
                              ]}
                            />
                          </View>
                        </Pressable>

                        {/* Quick Action Bar on Card */}
                        <View style={styles.subjectCardActions}>
                          <Pressable
                            style={styles.subjectMiniAction}
                            onPress={() =>
                              router.push({
                                pathname: '/chapters',
                                params: { subjectId: subject.id, subjectName: subject.name },
                              })
                            }
                          >
                            <Ionicons name="list" size={13} color="#C85C3E" />
                            <Text style={styles.subjectMiniActionText}>Chapters</Text>
                          </Pressable>

                          <Pressable
                            style={styles.subjectMiniAction}
                            onPress={() =>
                              router.push({
                                pathname: '/chapters',
                                params: { subjectId: subject.id, subjectName: subject.name, mode: 'explanation' },
                              })
                            }
                          >
                            <Ionicons name="bulb-outline" size={13} color="#4F936C" />
                            <Text style={styles.subjectMiniActionText}>Notes</Text>
                          </Pressable>

                          <Pressable
                            style={styles.subjectMiniAction}
                            onPress={() =>
                              router.push({
                                pathname: '/test-config',
                                params: { subjectId: subject.id, subjectName: subject.name },
                              })
                            }
                          >
                            <Ionicons name="trophy-outline" size={13} color="#F59E0B" />
                            <Text style={styles.subjectMiniActionText}>Quiz</Text>
                          </Pressable>

                          <Pressable
                            style={styles.subjectMiniAction}
                            onPress={() =>
                              router.push({
                                pathname: '/questions-pdf',
                                params: { subjectId: subject.id, subjectName: subject.name },
                              })
                            }
                          >
                            <Ionicons name="document-text-outline" size={13} color="#4388BA" />
                            <Text style={styles.subjectMiniActionText}>PDF</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 3. QUICK STUDY TOOLS (4 CARDS) */}
            <View style={styles.launchpadSection}>
              <Text style={styles.sectionTitle}>Quick Study Tools</Text>

              <View style={styles.launchpadGrid}>
                {[
                  {
                    title: 'Live Practice Test',
                    icon: 'trophy-outline',
                    color: '#F59E0B',
                    bg: '#FEF3C7',
                    route: '/test-config',
                  },
                  {
                    title: 'Concept Study Guides',
                    icon: 'bulb-outline',
                    color: '#4F936C',
                    bg: '#D1FAE5',
                    route: continueSubject
                      ? { pathname: '/chapters', params: { subjectId: continueSubject.id, subjectName: continueSubject.name, mode: 'explanation' } }
                      : '/subjects',
                  },
                  {
                    title: 'Exam Paper Generator',
                    icon: 'document-text-outline',
                    color: '#4388BA',
                    bg: '#E0F2FE',
                    route: continueSubject
                      ? { pathname: '/questions-pdf', params: { subjectId: continueSubject.id, subjectName: continueSubject.name } }
                      : '/subjects',
                  },
                  {
                    title: '24/7 AI Tutor',
                    icon: 'chatbubble-ellipses-outline',
                    color: '#9333EA',
                    bg: '#F3E8FF',
                    route: '/chat',
                  },
                ].map((tool) => (
                  <Pressable
                    key={tool.title}
                    style={({ pressed, hovered }: any) => [
                      styles.launchpadCard,
                      hovered && styles.launchpadCardHovered,
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() => {
                      if (typeof tool.route === 'string') router.push(tool.route as any);
                      else router.push(tool.route as any);
                    }}
                  >
                    <View style={[styles.launchpadIcon, { backgroundColor: tool.bg }]}>
                      <Ionicons name={tool.icon as any} size={20} color={tool.color} />
                    </View>
                    <View style={styles.launchpadCopy}>
                      <Text style={styles.launchpadTitle}>{tool.title}</Text>
                    </View>
                    <View style={styles.launchpadArrow}>
                      <Ionicons name="arrow-forward" size={14} color={tool.color} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* ──── RIGHT SMART SIDEBAR (WIDTH 340) ──── */}
          <View style={styles.desktopBentoAside}>

            {/* WIDGET 2: WEEKLY HABIT & STREAK TRACKER */}
            <View style={styles.sidebarWidget}>
              <View style={styles.sidebarWidgetHeader}>
                <Text style={{ fontSize: 16 }}>🔥</Text>
                <Text style={styles.sidebarWidgetTitle}>Study Habit Streak</Text>
              </View>

              <View style={styles.streakWeekRow}>
                {daysOfWeek.map((day, dIdx) => {
                  const isActive = activeDaysThisWeek.has(dIdx);
                  const isToday = dIdx === todayDayIndex;
                  return (
                    <View key={`${day}-${dIdx}`} style={styles.streakDayCol}>
                      <View
                        style={[
                          styles.streakCircle,
                          isActive && styles.streakCircleActive,
                          isToday && !isActive && styles.streakCircleToday,
                        ]}
                      >
                        {isActive ? (
                          <Ionicons name="checkmark" size={13} color="#FFF" />
                        ) : (
                          <View style={styles.streakDotInactive} />
                        )}
                      </View>
                      <Text style={[styles.streakDayText, isToday && styles.streakDayTextToday]}>
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.streakBadgeWrap}>
                <Text style={styles.streakBadgeText}>
                  {activeStreakCount > 0 ? `🔥 ${activeStreakCount}-Day Active This Week` : 'Study today to build your streak'}
                </Text>
              </View>
            </View>

            {/* WIDGET 3: RECENT ACTIVITY FEED */}
            <View style={styles.sidebarWidget}>
              <View style={styles.sidebarWidgetHeader}>
                <Ionicons name="time-outline" size={18} color="#C85C3E" />
                <Text style={styles.sidebarWidgetTitle}>Recent Activity</Text>
                <Pressable onPress={() => router.push('/history')} style={{ marginLeft: 'auto' }}>
                  <Text style={styles.sidebarHeaderLink}>View All</Text>
                </Pressable>
              </View>

              {recentActivity.length > 0 ? (
                <View style={styles.recentActivityList}>
                  {recentActivity.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.recentActivityItem}
                      onPress={() => router.push(item.route)}
                    >
                      <View style={[styles.recentActivityIcon, { backgroundColor: item.background }]}>
                        <Ionicons name={item.icon} size={15} color={item.color} />
                      </View>
                      <View style={styles.recentActivityCopy}>
                        <Text style={styles.recentActivityTitle}>{item.title}</Text>
                        <Text style={styles.recentActivityDetail} numberOfLines={1}>
                          {item.detail}
                        </Text>
                      </View>
                      {item.score && (
                        <View style={styles.recentActivityScoreBadge}>
                          <Text style={styles.recentActivityScoreText}>{item.score}</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.recentEmpty}>
                  <Ionicons name="hourglass-outline" size={20} color="#A49186" />
                  <Text style={styles.recentEmptyText}>
                    Complete a test or bookmark questions to see activity.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── DESKTOP FLOATING MULTI-SELECT DOCK ── */}
      {selectedSubjects.size > 0 && (
        <View style={styles.desktopBottomDock}>
          <View style={styles.desktopDockInner}>
            <View style={styles.dockLeft}>
              <View style={styles.dockCountBadge}>
                <Text style={styles.dockCountText}>{selectedSubjects.size}</Text>
              </View>
              <Text style={styles.dockTitle}>
                {selectedSubjects.size === 1 ? '1 Subject' : `${selectedSubjects.size} Subjects`} selected
              </Text>
              <Pressable
                style={styles.dockClearBtn}
                onPress={() => setSelectedSubjects(new Set())}
              >
                <Text style={styles.dockClearText}>Clear</Text>
              </Pressable>
            </View>

            <View style={styles.dockActions}>
              <Pressable
                style={styles.dockSecondaryBtn}
                onPress={() => {
                  if (selectedSubjects.size === visibleSubjects.length) {
                    setSelectedSubjects(new Set());
                  } else {
                    setSelectedSubjects(new Set(visibleSubjects.map((s) => s.id ?? s.name)));
                  }
                }}
              >
                <Text style={styles.dockSecondaryText}>
                  {selectedSubjects.size === visibleSubjects.length ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.dockPrimaryBtn}
                onPress={() => {
                  const list = visibleSubjects.filter((s) => selectedSubjects.has(s.id ?? s.name));
                  const sIds = list.map((s) => s.id ?? '').filter(Boolean).join(',');
                  const sNames = list.map((s) => s.name).join('|||');
                  router.push({
                    pathname: '/chapters',
                    params: {
                      subjectId: sIds,
                      subjectName: sNames,
                    },
                  });
                }}
              >
                <Ionicons name="list" size={14} color="#FFF" />
                <Text style={styles.dockPrimaryText}>Explore Chapters</Text>
              </Pressable>

              <Pressable
                style={[styles.dockPrimaryBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => {
                  const list = visibleSubjects.filter((s) => selectedSubjects.has(s.id ?? s.name));
                  const sIds = list.map((s) => s.id ?? '').filter(Boolean).join(',');
                  const sNames = list.map((s) => s.name).join('|||');
                  router.push({
                    pathname: '/test-config',
                    params: {
                      subjectId: sIds,
                      subjectName: sNames,
                    },
                  });
                }}
              >
                <Ionicons name="trophy-outline" size={14} color="#FFF" />
                <Text style={styles.dockPrimaryText}>Combined Quiz</Text>
              </Pressable>

              <Pressable
                style={[styles.dockPrimaryBtn, { backgroundColor: '#2563EB' }]}
                onPress={() => {
                  const list = visibleSubjects.filter((s) => selectedSubjects.has(s.id ?? s.name));
                  const sIds = list.map((s) => s.id ?? '').filter(Boolean).join(',');
                  const sNames = list.map((s) => s.name).join('|||');
                  router.push({
                    pathname: '/questions-pdf',
                    params: {
                      subjectId: sIds,
                      subjectName: sNames,
                    },
                  });
                }}
              >
                <Ionicons name="print-outline" size={14} color="#FFF" />
                <Text style={styles.dockPrimaryText}>Build Exam Paper</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEE5' },
  desktopRoot: {
    flex: 1,
    height: '100%',
    backgroundColor: '#F8F5F0',
    ...Platform.select({
      web: {
        height: '100vh' as any,
        maxHeight: '100vh' as any,
      },
    }),
  },
  desktopScrollView: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        overflowY: 'auto' as any,
        WebkitOverflowScrolling: 'touch' as any,
      },
    }),
  },
  desktopContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  desktopScrollContent: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 32,
    flexGrow: 1,
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },

  /* ── NAV BAR ── */
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDE4DA',
    marginBottom: 20,
    gap: 16,
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(61,45,39,0.04)' },
      default: { elevation: 1 },
    }),
  },
  desktopNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#C85C3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopLogoText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3D2D27',
    letterSpacing: -0.3,
  },
  desktopLogoAccent: {
    color: '#C85C3E',
  },
  desktopLogoTagline: {
    fontSize: 10,
    color: '#8B786D',
    fontWeight: '600',
  },
  desktopBoardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5ECE3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 8,
  },
  desktopBoardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C85C3E',
  },
  desktopBoardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#785A4E',
  },
  desktopSearchWrap: {
    flex: 1,
    maxWidth: 480,
    minWidth: 180,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5F0',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E8DED3',
    paddingHorizontal: 12,
    gap: 8,
  },
  desktopSearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: '#3D2D27',
    paddingVertical: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  desktopNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF0EB',
    borderWidth: 1,
    borderColor: '#F8DACF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  desktopStreakIcon: {
    fontSize: 14,
  },
  desktopStreakLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C85C3E',
  },
  desktopNavLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  desktopNavLinkHovered: {
    backgroundColor: '#F5ECE4',
  },
  desktopNavLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E4B42',
  },
  desktopNavBadge: {
    backgroundColor: '#C85C3E',
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  desktopNavBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  desktopProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#FAF4ED',
    borderWidth: 1,
    borderColor: '#EBE0D5',
  },
  desktopProfileBtnHovered: {
    backgroundColor: '#F3E9DD',
  },
  desktopAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopStudentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3D2D27',
  },

  /* ── HERO STRIP ── */
  desktopHeroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  desktopHeroGreeting: {
    flex: 1,
  },
  desktopGreetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3D2D27',
    letterSpacing: -0.4,
  },
  desktopGreetingSubtitle: {
    fontSize: 13,
    color: '#8B786D',
    marginTop: 4,
  },
  desktopGoalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#EBDDCF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(61,45,39,0.03)' },
      default: {},
    }),
  },
  desktopGoalIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopGoalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  desktopGoalDesc: {
    fontSize: 11,
    color: '#785A4E',
    fontWeight: '600',
  },

  /* ── BENTO MAIN CONTAINERS ── */
  desktopBentoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    width: '100%',
  },
  desktopBentoMain: {
    flex: 1,
    minWidth: 0,
    gap: 24,
  },
  desktopBentoAside: {
    width: 380,
    minWidth: 330,
    gap: 20,
  },

  /* ── 1. SPOTLIGHT CARD (EXPANDED FULL-WIDTH HERO) ── */
  spotlightCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 28,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 248, 239, 0.22)',
    ...Platform.select({
      web: { boxShadow: '0 12px 36px rgba(164,71,50,0.22)' },
      default: { elevation: 6 },
    }),
  },
  spotlightCardDecorOne: {
    position: 'absolute',
    top: -80,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,248,239,0.08)',
  },
  spotlightCardDecorTwo: {
    position: 'absolute',
    bottom: -60,
    left: 240,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,248,239,0.05)' as any,
  },
  spotlightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
  },
  spotlightWelcomeArea: {
    flex: 1,
    minWidth: 320,
  },
  spotlightWelcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF8EF',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  spotlightWelcomeSub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#FBD9CA',
    maxWidth: 680,
    fontWeight: '500',
  },
  spotlightBadgesCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  spotlightBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,248,239,0.2)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,239,0.25)',
  },
  spotlightBadgeText: {
    color: '#FFF8EF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  spotlightLiveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  spotlightPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  spotlightStatusText: {
    color: '#FFF8EF',
    fontSize: 11,
    fontWeight: '600',
  },
  spotlightDailyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,248,239,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,239,0.2)',
  },
  spotlightDailyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FED7AA',
  },
  spotlightDailySub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF8EF',
  },
  spotlightDivider: {
    height: 1,
    backgroundColor: 'rgba(255,248,239,0.16)',
    marginVertical: 18,
    width: '100%',
  },
  /* ── 3-CARD HERO BENTO ROW ── */
  heroFeaturesRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  heroFeatureCardActive: {
    flex: 1.35,
    minWidth: 310,
    backgroundColor: 'rgba(255, 248, 239, 0.1)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 248, 239, 0.18)',
    justifyContent: 'space-between',
  },
  heroFeatureCardAi: {
    flex: 1,
    minWidth: 260,
    backgroundColor: 'rgba(255, 248, 239, 0.12)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 248, 239, 0.22)',
    justifyContent: 'space-between',
  },
  heroFeatureCardSnapshot: {
    flex: 1.15,
    minWidth: 280,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 248, 239, 0.16)',
    justifyContent: 'space-between',
  },
  heroFeatureTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroActiveTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF8EF',
    letterSpacing: -0.3,
  },
  heroActiveProgressWrap: {
    marginVertical: 10,
  },
  heroProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroProgressText: {
    color: '#FFF8EF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  heroProgressCount: {
    color: '#FED7AA',
    fontSize: 11.5,
    fontWeight: '600',
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  aiLiveBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 248, 239, 0.2)',
  },
  aiLiveBadgeText: {
    color: '#FED7AA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroAiTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF8EF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroAiDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#FBD9CA',
  },
  heroAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF8EF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.18)' },
      default: {},
    }),
  },
  heroAiBtnHovered: {
    backgroundColor: '#FFFFFF',
    transform: [{ translateY: -1 }],
  },
  heroAiBtnText: {
    color: '#C85C3E',
    fontSize: 13,
    fontWeight: '800',
  },
  heroSnapshotHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF8EF',
    letterSpacing: -0.2,
  },
  heroMasteryPill: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FED7AA',
    backgroundColor: 'rgba(255, 248, 239, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroSnapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  heroSnapshotBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 248, 239, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  heroSnapshotVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF8EF',
  },
  heroSnapshotLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FBD9CA',
    marginTop: 1,
  },
  heroSnapshotMasteryTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  heroSnapshotMasteryFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  streakBadgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  streakBadgeText: {
    color: '#B45309',
    fontSize: 11.5,
    fontWeight: '800',
  },

  spotlightSubjectName: {
    color: '#FED7AA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  spotlightProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  spotlightProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFF8EF',
  },
  spotlightPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8EF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.18)' },
      default: {},
    }),
  },
  spotlightPrimaryBtnHovered: {
    backgroundColor: '#FFFFFF',
    transform: [{ translateY: -1 }],
  },
  spotlightPrimaryBtnText: {
    color: '#9E3F2B',
    fontSize: 12,
    fontWeight: '800',
  },
  spotlightSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,248,239,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,239,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  spotlightSecondaryBtnHovered: {
    backgroundColor: 'rgba(255,248,239,0.28)',
    transform: [{ translateY: -1 }],
  },
  spotlightSecondaryBtnText: {
    color: '#FFF8EF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── 2. CURRICULUM SECTION ── */
  curriculumSection: {
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8B786D',
    marginTop: 2,
  },
  subjectCountBadge: {
    backgroundColor: '#F0E6DC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subjectCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#785A4E',
  },
  emptyCard: {
    padding: 24,
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE4DA',
    alignItems: 'center',
  },
  emptyCardText: {
    color: '#8B786D',
    fontSize: 13,
  },
  subjectsBentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    ...Platform.select({
      web: {
        display: 'grid' as any,
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 340px))' as any,
        gap: '16px' as any,
      },
    }),
  },
  subjectBentoCard: {
    ...Platform.select({
      web: {
        width: '100%' as any,
        maxWidth: 340,
        minWidth: 280,
      },
      default: {
        width: 300,
        minWidth: 260,
      },
    }),
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAE1D7',
    padding: 18,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(61,45,39,0.04)' },
      default: { elevation: 2 },
    }),
  },
  subjectBentoCardHalf: {
    ...Platform.select({
      web: {
        width: '100%' as any,
        maxWidth: 340,
        minWidth: 280,
      },
      default: { width: 300 },
    }),
  },
  subjectCardMainClick: {
    ...Platform.select({
      web: { cursor: 'pointer' as any },
      default: {},
    }),
  },
  subjectCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subjectIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectBadgePill: {
    backgroundColor: '#F4ECE4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  subjectBadgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B786D',
  },
  subjectCardMeta: {
    fontSize: 11,
    color: '#8B786D',
    marginTop: 4,
  },
  subjectCardTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F0E6DC',
    overflow: 'hidden',
    marginTop: 12,
  },
  subjectCardFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F4EBE3',
  },
  subjectMiniAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FAF5EF',
    borderWidth: 1,
    borderColor: '#EAE0D6',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
  },
  subjectMiniActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5E4B42',
  },

  /* Companion AI Study Room Card */
  aiStudyRoomCard: {
    ...Platform.select({
      web: {
        width: '100%' as any,
        maxWidth: 340,
        minWidth: 280,
      },
      default: {
        width: 300,
        minWidth: 260,
      },
    }),
    backgroundColor: '#FAF8FF',
    borderColor: '#E9E2F8',
    justifyContent: 'space-between',
  },
  aiStudyRoomDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 6,
  },
  aiStudyRoomActionWrap: {
    marginTop: 16,
  },
  aiStudyRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(124,58,237,0.25)' },
      default: {},
    }),
  },
  aiStudyRoomBtnHovered: {
    backgroundColor: '#6D28D9',
  },
  aiStudyRoomBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* ── 3. SMART LAUNCHPAD ── */
  launchpadSection: {
    gap: 14,
  },
  launchpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  launchpadCard: {
    ...Platform.select({
      web: {
        width: 'calc(50% - 6px)' as any,
        flexBasis: 'calc(50% - 6px)' as any,
      },
      default: { width: '48%' },
    }),
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE1D7',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(61,45,39,0.03)' },
      default: { elevation: 1 },
    }),
  },
  launchpadCardHovered: {
    borderColor: '#C85C3E',
    backgroundColor: '#FFF',
  },
  launchpadIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchpadCopy: {
    flex: 1,
    minWidth: 0,
  },
  launchpadTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3D2D27',
  },
  launchpadDesc: {
    fontSize: 11,
    color: '#8B786D',
    marginTop: 2,
    lineHeight: 15,
  },
  launchpadArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── 4. RIGHT SIDEBAR WIDGETS ── */
  sidebarWidget: {
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDE4DA',
    padding: 18,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(61,45,39,0.04)' },
      default: { elevation: 2 },
    }),
  },
  sidebarWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sidebarWidgetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3D2D27',
  },
  sidebarHeaderLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C85C3E',
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  snapshotMetricBox: {
    ...Platform.select({
      web: {
        width: 'calc(50% - 5px)' as any,
        flexBasis: 'calc(50% - 5px)' as any,
      },
      default: { width: '48%' },
    }),
    backgroundColor: '#FAF6F1',
    borderWidth: 1,
    borderColor: '#EFE7DE',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  snapshotMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  snapshotMetricVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3D2D27',
  },
  snapshotMetricLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B786D',
    marginTop: 2,
  },
  overallMasteryWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F2E9E0',
  },
  overallMasteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  overallMasteryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5E4B42',
  },
  overallMasteryPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C85C3E',
  },
  overallMasteryTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EDE3D8',
    overflow: 'hidden',
  },
  overallMasteryFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#C85C3E',
  },

  /* Weekly Habit / Streak */
  streakWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  streakDayCol: {
    alignItems: 'center',
    gap: 6,
  },
  streakCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0E6DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCircleActive: {
    backgroundColor: '#C85C3E',
  },
  streakCircleToday: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  streakDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4C6B9',
  },
  streakDayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A49186',
  },
  streakDayTextToday: {
    color: '#C85C3E',
    fontWeight: '800',
  },
  streakMotivation: {
    fontSize: 11,
    color: '#785A4E',
    lineHeight: 16,
    marginTop: 10,
    backgroundColor: '#FFF5F0',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F8DACF',
  },

  /* Recent Activity */
  recentActivityList: {
    gap: 10,
  },
  recentActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EDE5',
  },
  recentActivityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentActivityCopy: {
    flex: 1,
    minWidth: 0,
  },
  recentActivityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3D2D27',
  },
  recentActivityDetail: {
    fontSize: 10,
    color: '#8B786D',
    marginTop: 2,
  },
  recentActivityScoreBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recentActivityScoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  recentEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  recentEmptyText: {
    fontSize: 11,
    color: '#8B786D',
    textAlign: 'center',
    lineHeight: 16,
  },

  /* Pro Tip Widget */
  proTipWidget: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  proTipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  proTipBody: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  proTipBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  proTipBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  mobileHero: {
    minHeight: 190,
    padding: 20,
    borderRadius: 22,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(98, 51, 35, 0.14)' },
      default: { elevation: 5 },
    }),
  },
  mobileCarouselHero: {
    minHeight: 276,
    padding: 18,
    borderRadius: 22,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0px 8px 20px rgba(98, 51, 35, 0.14)' },
      default: { elevation: 5 },
    }),
  },
  mobileHeroAccent: { position: 'absolute', width: 170, height: 170, borderRadius: 90, right: 0, top: -114, backgroundColor: 'rgba(255,248,239,0.13)' },
  mobileCarouselCopy: { width: '100%', paddingBottom: 118, zIndex: 1 },
  mobileCarouselArtwork: { position: 'absolute', right: 10, bottom: 32, width: 145, height: 112, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mobileCarouselOrbit: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: 'rgba(255,248,239,0.4)' },
  mobileCarouselBook: { width: 60, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FFF8EF', transform: [{ rotate: '-8deg' }] },
  mobileCarouselBookStack: { position: 'absolute', bottom: 2, width: 112, height: 21, alignItems: 'center', justifyContent: 'flex-end' },
  mobileCarouselBookGold: { width: 108, height: 6, borderRadius: 2, backgroundColor: '#E7C98F', marginBottom: 1 },
  mobileCarouselBookGreen: { width: 94, height: 6, borderRadius: 2, backgroundColor: '#6D897D', marginBottom: 1 },
  mobileCarouselBookPeach: { width: 110, height: 6, borderRadius: 2, backgroundColor: '#D89970', marginBottom: 1 },
  mobileCarouselSparkle: { position: 'absolute', top: 9, right: 21 },
  mobilePhotoFrame: { position: 'absolute', width: 133, height: 88, borderRadius: 12, backgroundColor: '#C8DDD5', borderWidth: 3, borderColor: 'rgba(255,248,239,0.9)' },
  mobilePhotoSun: { position: 'absolute', top: 20, right: 27, width: 22, height: 22, borderRadius: 11, backgroundColor: '#F5D58B' },
  mobilePhotoHillBack: { position: 'absolute', width: 105, height: 45, left: 24, bottom: 24, borderTopLeftRadius: 60, borderTopRightRadius: 60, backgroundColor: '#789D8C', transform: [{ rotate: '-9deg' }] },
  mobilePhotoHillFront: { position: 'absolute', width: 114, height: 39, left: 47, bottom: 17, borderTopLeftRadius: 60, borderTopRightRadius: 60, backgroundColor: '#4E7466', transform: [{ rotate: '8deg' }] },
  mobilePhotoTag: { position: 'absolute', left: 5, bottom: 26, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(45,70,60,0.75)' },
  mobilePhotoTagText: { color: '#FFF8EF', fontSize: 6, fontWeight: '800', letterSpacing: 0.5 },
  mobileVideoFrame: { width: 133, height: 88, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 12, borderWidth: 3, borderColor: 'rgba(255,248,239,0.9)', backgroundColor: '#667A91' },
  mobileVideoPlay: { position: 'absolute', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#FFF8EF' },
  mobileVideoLabel: { position: 'absolute', top: 7, left: 8, color: '#FFF8EF', fontSize: 6, fontWeight: '800', letterSpacing: 0.5 },
  mobileVideoProgress: { position: 'absolute', right: 8, bottom: 8, left: 8, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,248,239,0.45)', overflow: 'hidden' },
  mobileVideoProgressFill: { width: '34%', height: '100%', backgroundColor: '#C85C3E' },
  mobileCarouselControls: { position: 'absolute', bottom: 10, left: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  mobileCarouselArrow: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(255,248,239,0.2)' },
  mobileCarouselDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,248,239,0.55)' },
  mobileCarouselDotActive: { width: 18, borderRadius: 5, backgroundColor: '#FFF8EF' },
  mobileHeaderAction: { width: 36, height: 36, position: 'relative', alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E7DED4' },
  mobileHeaderBadge: { position: 'absolute', top: -3, right: -4, minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#C85C3E' },
  mobileHeaderBadgeText: { color: '#FFF8EF', fontSize: 8, fontWeight: '800' },
  desktopHero: { minHeight: 228, paddingHorizontal: 34, paddingVertical: 28, borderRadius: 22 },
  heroAccentCircle: { position: 'absolute', width: 230, height: 230, borderRadius: 120, right: -105, top: -118, backgroundColor: '#EBAF91', opacity: 0.25 },
  mobileHeroContent: { maxWidth: '82%', zIndex: 1 },
  desktopHeroTitle: { fontSize: 32, lineHeight: 38, maxWidth: 530 },
  mobileHeroEyebrow: { color: '#F6DFD2', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 9 },
  mobileHeroTitle: { color: '#FFF8EF', fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4 },
  mobileHeroSubtitle: { color: '#F8DCCE', fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 13 },
  mobileHeroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8EF', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20 },
  mobileHeroButtonText: { color: '#9E3F2B', fontSize: 11, fontWeight: '800' },
  mobileHeroIcon: { position: 'absolute', right: 17, bottom: 15, width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255, 248, 239, 0.16)', alignItems: 'center', justifyContent: 'center' },
  desktopHeroArtwork: { position: 'absolute', right: 60, top: 0, bottom: 0, width: 260, alignItems: 'center', justifyContent: 'center' },
  desktopArtworkBack: { position: 'absolute', right: 42, top: 31, width: 86, height: 86, borderRadius: 27, backgroundColor: 'rgba(255, 248, 239, 0.19)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '12deg' }] },
  desktopArtworkBook: { width: 120, height: 120, borderRadius: 35, backgroundColor: '#FFF8EF', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], ...Platform.select({ web: { boxShadow: '0px 12px 24px rgba(70, 36, 26, 0.18)' }, default: { elevation: 5 } }) },
  desktopArtworkBadge: { position: 'absolute', bottom: 24, right: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: '#FFF8EF' },
  desktopArtworkBadgeText: { color: '#76564A', fontSize: 7, fontWeight: '800', letterSpacing: 0.6 },
  desktopArtworkDotOne: { position: 'absolute', left: 31, top: 57, width: 9, height: 9, borderRadius: 5, backgroundColor: '#F8E4C9' },
  desktopArtworkDotTwo: { position: 'absolute', left: 59, bottom: 40, width: 6, height: 6, borderRadius: 3, backgroundColor: '#F6DFD2' },
  shortcutsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },
  desktopShortcutCard: { width: '32%', minHeight: 110 },
  shortcutCard: {
    width: '48.5%',
    minHeight: 122,
    marginBottom: 10,
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DFD1C3',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(61, 45, 39, 0.05)' },
      default: { elevation: 2 },
    }),
  },
  shortcutCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  shortcutIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shortcutTitle: { fontSize: 13, fontWeight: '800', color: '#3D2D27', marginBottom: 4 },
  shortcutSubtitle: { fontSize: 10, color: '#76645B', lineHeight: 14 },
  desktopPage: { width: '100%', maxWidth: 1360, alignSelf: 'center', paddingHorizontal: 42, paddingTop: 22, paddingBottom: 40 },
  dateLabel: { color: '#8B786D', fontSize: 12, letterSpacing: 0.5 },
  desktopIconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#DFD1C3' },
  editorialHero: {
    flexDirection: 'row',
    gap: 34,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    padding: 30,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0px 10px 28px rgba(98, 51, 35, 0.16)' },
      default: { elevation: 5 },
    }),
  },
  heroCopy: { flex: 1, paddingVertical: 4, maxWidth: 620, zIndex: 1 },
  eyebrow: { color: '#F6DFD2', fontSize: 10, fontWeight: '800', letterSpacing: 1.9, marginBottom: 10 },
  editorialTitle: { color: '#FFF8EF', fontSize: 39, lineHeight: 44, fontWeight: '800', letterSpacing: -1.1, marginBottom: 10 },
  editorialSubtitle: { color: '#F8DCCE', fontSize: 13, lineHeight: 20, maxWidth: 490, marginBottom: 17 },
  terracottaButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFF8EF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  terracottaButtonText: { color: '#9E3F2B', fontSize: 12, fontWeight: '800' },
  featuredTopic: {
    width: 300,
    minHeight: 205,
    padding: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 248, 239, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 248, 239, 0.22)',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  featuredKicker: { color: '#F6DFD2', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  featuredIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFF8EF', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  featuredTitle: { color: '#FFF8EF', fontSize: 22, fontWeight: '800', marginTop: 8 },
  featuredMeta: { color: '#F8DCCE', fontSize: 11, marginTop: 4 },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,248,239,0.2)', paddingTop: 11, marginTop: 13 },
  featuredLink: { color: '#FFF8EF', fontSize: 11, fontWeight: '800' },
  desktopShortcutRow: { flexDirection: 'row', gap: 14, marginBottom: 24 },
  desktopShortcutCopy: { flex: 1 },
  desktopShortcutSub: { color: '#8B786D', fontSize: 10 },
  desktopColumns: { flexDirection: 'row', gap: 22 },
  plannerColumn: { flex: 1.55, minWidth: 0 },
  curriculumShelf: { flex: 1, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E6DCD2', padding: 22, borderRadius: 20, minWidth: 310 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  editorialSectionTitle: { color: '#3D2D27', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  sectionDescription: { color: '#8B786D', fontSize: 12, marginTop: 5 },
  weekLabel: { color: '#C85C3E', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 8 },
  weekGrid: { flexDirection: 'row', gap: 12 },
  weekCard: { flex: 1, minHeight: 164, padding: 15, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E6DCD2', borderRadius: 16, ...Platform.select({ web: { boxShadow: '0px 4px 12px rgba(61, 45, 39, 0.04)' }, default: { elevation: 2 } }) },
  weekDay: { color: '#A49186', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  weekIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  weekTitle: { color: '#3D2D27', fontSize: 13, fontWeight: '800', marginBottom: 5 },
  weekSub: { color: '#8B786D', fontSize: 11, lineHeight: 16 },
  cardArrow: { color: '#C85C3E', fontSize: 20, alignSelf: 'flex-end', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, backgroundColor: '#F8E8DC', borderRadius: 14 },
  statLabel: { color: '#A49186', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  statValue: { color: '#3D2D27', fontSize: 16, fontWeight: '800' },
  shelfItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E9DED4' },
  shelfNumber: { color: '#D4B19B', fontSize: 15, fontWeight: '700', width: 24 },
  shelfText: { flex: 1 },
  shelfTitle: { color: '#3D2D27', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  shelfMeta: { color: '#8B786D', fontSize: 11 },
  shelfButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  shelfButtonText: { color: '#C85C3E', fontSize: 12, fontWeight: '800' },
  px: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  subjectsScroll: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  desktopSubjectProgressRow: { width: '100%', maxWidth: 1200, alignSelf: 'center', flexDirection: 'row', alignItems: 'stretch', gap: 18, paddingHorizontal: 20 },
  desktopSubjectsColumn: { flex: 1, minWidth: 0 },
  desktopSubjectsScroll: { width: '100%', maxWidth: '100%', alignSelf: 'stretch', paddingHorizontal: 0 },
  desktopSubjectCard: { width: '100%', minHeight: 102, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 17, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: '#DFD1C3', backgroundColor: '#FFFDF9', ...Platform.select({ web: { boxShadow: '0px 4px 12px rgba(61, 45, 39, 0.05)' }, default: { elevation: 2 } }) },
  desktopSubjectIcon: { width: 48, height: 48, marginBottom: 0 },
  desktopSubjectCopy: { flex: 1 },
  desktopSubjectTitle: { textAlign: 'left' },
  desktopSubjectCaption: { color: '#8B786D', fontSize: 10, marginTop: 5 },
  desktopSubjectArrow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#F6DFD2' },
  desktopProgressColumn: { width: 340, justifyContent: 'center' },
  desktopProgressCard: { flex: 1, justifyContent: 'center', minHeight: 135, paddingHorizontal: 17, borderWidth: 1, borderColor: '#F0DACE', backgroundColor: '#F8E8DC' },
  desktopUpdateCard: { paddingTop: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#DFD1C3', borderRadius: 16, backgroundColor: '#FFFDF9' },
  desktopUpdateRow: { minHeight: 49 },

  
  /* APP BAR */
  appBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { width: 44, height: 44, backgroundColor: '#F6DFD2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: '#3D2D27', letterSpacing: -0.5, lineHeight: 20 },
  logoSubtitle: { fontSize: 18, fontWeight: '800', color: '#C85C3E', lineHeight: 20 },
  logoTagline: { fontSize: 10, color: '#76645B', fontWeight: '600', marginTop: 2 },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  avatarButton: { width: 36, height: 36, backgroundColor: '#DBEAFE', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  /* PROGRESS */
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#3D2D27' },
  viewAll: { color: '#C85C3E', fontSize: 13, fontWeight: '600' },

  progressCard: { backgroundColor: '#FFF5ED', borderRadius: 18, padding: 15, borderWidth: 1, borderColor: '#F0DACE' },
  progressCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  progressIconWrap: { width: 40, height: 40, backgroundColor: '#F6DFD2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressCardTitle: { fontSize: 14, fontWeight: '700', color: '#3D2D27' },
  progressCardSub: { fontSize: 12, color: '#76645B', marginTop: 2 },
  progressCardValue: { fontSize: 13, fontWeight: '700', color: '#3D2D27' },
  progressBarBg: { height: 7, backgroundColor: '#EAD8CC', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#C85C3E', borderRadius: 4 },
  
  subjectCard: { width: 160, minHeight: 128, backgroundColor: '#FFFDF9', borderRadius: 18, padding: 14, alignItems: 'stretch', borderWidth: 1, borderColor: '#EFE3D8', shadowColor: '#3D2D27', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  mobileSubjectCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  subjectIconWrap: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F6DFD2', alignItems: 'center', justifyContent: 'center' },
  mobileSubjectArrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF0E9' },
  subjectCardTitle: { fontSize: 13, fontWeight: '800', color: '#3D2D27' },
  mobileSubjectMeta: { marginTop: 5, color: '#8B786D', fontSize: 10, fontWeight: '600' },
  mobileUpdateCard: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 14, borderWidth: 1, borderColor: '#EFE3D8', borderRadius: 18, backgroundColor: '#FFFDF9', shadowColor: '#3D2D27', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  mobileUpdateNew: { position: 'absolute', top: 12, right: 12, backgroundColor: '#F6DFD2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  mobileUpdateNewText: { color: '#A84932', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  mobileUpdateIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF0E9' },
  mobileUpdateCopy: { flex: 1, minWidth: 0, paddingRight: 32 },
  mobileUpdateTitle: { color: '#3D2D27', fontSize: 13, fontWeight: '800', marginTop: 1 },
  mobileUpdateDescription: { color: '#8B786D', fontSize: 10, marginTop: 6 },
  mobileUpdateFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  mobileUpdateChapter: { color: '#C85C3E', fontSize: 11, fontWeight: '700', flexShrink: 1 },

  /* MULTI-SELECT TOGGLES & BADGES */
  desktopSelectToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E6DCD2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopSelectToggleBtnActive: {
    backgroundColor: '#F6DFD2',
    borderColor: '#C85C3E',
  },
  desktopSelectToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E4B42',
  },
  desktopSelectToggleBtnTextActive: {
    color: '#C85C3E',
  },
  mobileSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EAE0D5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  mobileSelectBtnActive: {
    backgroundColor: '#F6DFD2',
    borderColor: '#C85C3E',
  },
  mobileSelectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#76645B',
  },

  subjectBentoCardSelected: {
    borderColor: '#C85C3E',
    borderWidth: 2,
    backgroundColor: '#FFFBF7',
  },
  subjectCheckboxWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#C4B5A5',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  subjectCheckboxWrapSelected: {
    borderColor: '#C85C3E',
    backgroundColor: '#C85C3E',
  },
  checkboxWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#C4B5A5',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxWrapSelected: {
    borderColor: '#C85C3E',
    backgroundColor: '#C85C3E',
  },

  /* ── FLOATING MULTI-SELECT DOCKS ── */
  desktopBottomDock: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  desktopDockInner: {
    width: '90%',
    maxWidth: 960,
    backgroundColor: '#3D2D27',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    ...Platform.select({
      web: { boxShadow: '0 12px 36px rgba(0,0,0,0.28)' as any },
      default: { elevation: 8 },
    }),
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    zIndex: 100,
  },
  dockInner: {
    width: '92%',
    maxWidth: 960,
    backgroundColor: '#3D2D27',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.25)' as any },
      default: { elevation: 6 },
    }),
  },
  dockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dockCountBadge: {
    backgroundColor: '#C85C3E',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dockTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dockClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  dockClearText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
  },
  dockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dockSecondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  dockSecondaryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dockPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C85C3E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  dockPrimaryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
