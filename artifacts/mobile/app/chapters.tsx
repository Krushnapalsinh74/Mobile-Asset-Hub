import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Chapter, Topic } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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

export interface SelectedTopicMeta {
  topicId: string;
  topicName: string;
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
}

export interface SelectedChapterMeta {
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
}

const _selectionCache: Record<
  string,
  {
    selectedChapters: string[];
    selectedTopics: string[];
    expandedChapters: string[];
    selectedChapterMetaMap: Record<string, SelectedChapterMeta>;
    selectedTopicMetaMap: Record<string, SelectedTopicMeta>;
  }
> = {};

type TaggedChapter = Chapter & { _subjectId: string; _subjectName: string };

const NUMBER_COLORS = [
  { bg: '#F6DFD2', text: '#C85C3E' },
  { bg: '#FFF7ED', text: '#F97316' },
  { bg: '#ECFDF5', text: '#4F936C' },
  { bg: '#FEF2F2', text: '#EF4444' },
  { bg: '#EFF6FF', text: '#D97855' },
];

export default function ChaptersScreen() {
  const { subjectId, subjectName, mode } = useLocalSearchParams<{
    subjectId: string;
    subjectName: string;
    mode?: string;
  }>();
  const { boardId, standardId, boardName, standardName } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const subjectIds = useMemo(() => (subjectId ?? '').split(',').filter(Boolean), [subjectId]);
  const subjectNames = useMemo(() => (subjectName ?? '').split('|||').filter(Boolean), [subjectName]);
  const isMultiSubject = subjectIds.length > 1;
  const cacheKey = `${boardId ?? ''}_${standardId ?? ''}_${subjectIds.join(',')}`;

  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(
    () => new Set(_selectionCache[cacheKey]?.selectedChapters ?? [])
  );
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(
    () => new Set(_selectionCache[cacheKey]?.selectedTopics ?? [])
  );
  const [selectedChapterMetaMap, setSelectedChapterMetaMap] = useState<Record<string, SelectedChapterMeta>>(
    () => _selectionCache[cacheKey]?.selectedChapterMetaMap ?? {}
  );
  const [selectedTopicMetaMap, setSelectedTopicMetaMap] = useState<Record<string, SelectedTopicMeta>>(
    () => _selectionCache[cacheKey]?.selectedTopicMetaMap ?? {}
  );
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    () => new Set(_selectionCache[cacheKey]?.expandedChapters ?? [])
  );
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    _selectionCache[cacheKey] = {
      selectedChapters: [...selectedChapters],
      selectedTopics: [...selectedTopics],
      expandedChapters: [...expandedChapters],
      selectedChapterMetaMap,
      selectedTopicMetaMap,
    };
  }, [cacheKey, selectedChapters, selectedTopics, expandedChapters, selectedChapterMetaMap, selectedTopicMetaMap]);

  const singleQuery = useQuery({
    queryKey: ['chapters', boardId, standardId, subjectIds[0]],
    queryFn: () => eduApi.getChapters(boardId!, standardId!, subjectIds[0]!),
    enabled: !!boardId && !!standardId && subjectIds.length === 1,
  });

  const multiQueries = useQueries({
    queries: subjectIds.map((sid) => ({
      queryKey: ['chapters', boardId, standardId, sid],
      queryFn: () => eduApi.getChapters(boardId!, standardId!, sid),
      enabled: !!boardId && !!standardId && subjectIds.length > 1,
    })),
  });

  const isLoading = isMultiSubject ? multiQueries.some((q) => q.isLoading) : singleQuery.isLoading;
  const isError = isMultiSubject ? multiQueries.every((q) => q.isError) : !!singleQuery.error;

  const allChapters: TaggedChapter[] = useMemo(() => {
    if (isMultiSubject) {
      return multiQueries.flatMap((q, i) =>
        (q.data ?? []).map((ch) => ({
          ...ch,
          _subjectId: subjectIds[i]!,
          _subjectName: subjectNames[i] ?? subjectIds[i]!,
        }))
      );
    }
    return (singleQuery.data ?? []).map((ch) => ({
      ...ch,
      _subjectId: subjectIds[0]!,
      _subjectName: subjectNames[0] ?? subjectName,
    }));
  }, [isMultiSubject, multiQueries, singleQuery.data, subjectIds, subjectNames]);

  const filteredChapters = allChapters.filter(
    (c) => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getKey = (c: TaggedChapter) => `${c._subjectId}::${getId(c)}`;

  function toggleExpand(chKey: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chKey)) next.delete(chKey);
      else next.add(chKey);
      return next;
    });
  }

  function handleRegisterLoadedTopics(chapter: TaggedChapter, topics: Topic[]) {
    const chKey = getKey(chapter);
    const isChSelected = selectedChapters.has(chKey);

    setSelectedTopicMetaMap((prev) => {
      let changed = false;
      const next = { ...prev };
      topics.forEach((t) => {
        const tKey = `${chKey}::${getId(t)}`;
        if (selectedTopics.has(tKey) || isChSelected) {
          if (!next[tKey] || next[tKey].topicName !== t.name) {
            next[tKey] = {
              topicId: getId(t),
              topicName: t.name,
              chapterId: getId(chapter),
              chapterName: chapter.name,
              subjectId: chapter._subjectId,
              subjectName: chapter._subjectName,
            };
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }

  function toggleChapterSelect(chapter: TaggedChapter, topics?: Topic[]) {
    Haptics.selectionAsync();
    const chKey = getKey(chapter);
    const isChSelected = selectedChapters.has(chKey);

    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (isChSelected) next.delete(chKey);
      else next.add(chKey);
      return next;
    });

    setSelectedChapterMetaMap((prev) => {
      const next = { ...prev };
      if (isChSelected) {
        delete next[chKey];
      } else {
        next[chKey] = {
          chapterId: getId(chapter),
          chapterName: chapter.name,
          subjectId: chapter._subjectId,
          subjectName: chapter._subjectName,
        };
      }
      return next;
    });

    if (topics && topics.length > 0) {
      setSelectedTopics((prev) => {
        const next = new Set(prev);
        topics.forEach((t) => {
          const tKey = `${chKey}::${getId(t)}`;
          if (isChSelected) next.delete(tKey);
          else next.add(tKey);
        });
        return next;
      });

      setSelectedTopicMetaMap((prev) => {
        const next = { ...prev };
        topics.forEach((t) => {
          const tKey = `${chKey}::${getId(t)}`;
          if (isChSelected) {
            delete next[tKey];
          } else {
            next[tKey] = {
              topicId: getId(t),
              topicName: t.name,
              chapterId: getId(chapter),
              chapterName: chapter.name,
              subjectId: chapter._subjectId,
              subjectName: chapter._subjectName,
            };
          }
        });
        return next;
      });
    }
  }

  function toggleTopicSelect(chapter: TaggedChapter, topic: Topic, allTopics?: Topic[]) {
    Haptics.selectionAsync();
    const chKey = getKey(chapter);
    const topicId = getId(topic);
    const tKey = `${chKey}::${topicId}`;
    const isTopicSelected = selectedTopics.has(tKey);

    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (isTopicSelected) {
        next.delete(tKey);
      } else {
        next.add(tKey);
      }

      if (allTopics && allTopics.length > 0) {
        const allSelected = allTopics.every((t) =>
          `${chKey}::${getId(t)}` === tKey ? !isTopicSelected : next.has(`${chKey}::${getId(t)}`)
        );
        setSelectedChapters((prevCh) => {
          const nextCh = new Set(prevCh);
          if (allSelected) nextCh.add(chKey);
          else nextCh.delete(chKey);
          return nextCh;
        });
      }

      return next;
    });

    setSelectedTopicMetaMap((prev) => {
      const next = { ...prev };
      if (isTopicSelected) {
        delete next[tKey];
      } else {
        next[tKey] = {
          topicId,
          topicName: topic.name,
          chapterId: getId(chapter),
          chapterName: chapter.name,
          subjectId: chapter._subjectId,
          subjectName: chapter._subjectName,
        };
      }
      return next;
    });

    setSelectedChapterMetaMap((prev) => ({
      ...prev,
      [chKey]: {
        chapterId: getId(chapter),
        chapterName: chapter.name,
        subjectId: chapter._subjectId,
        subjectName: chapter._subjectName,
      },
    }));
  }

  function toggleSelectAllTopicsInChapter(chapter: TaggedChapter, topics: Topic[], select: boolean) {
    Haptics.selectionAsync();
    const chKey = getKey(chapter);

    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (select) next.add(chKey);
      else next.delete(chKey);
      return next;
    });

    setSelectedChapterMetaMap((prev) => {
      const next = { ...prev };
      if (select) {
        next[chKey] = {
          chapterId: getId(chapter),
          chapterName: chapter.name,
          subjectId: chapter._subjectId,
          subjectName: chapter._subjectName,
        };
      } else {
        delete next[chKey];
      }
      return next;
    });

    setSelectedTopics((prev) => {
      const next = new Set(prev);
      topics.forEach((t) => {
        const tKey = `${chKey}::${getId(t)}`;
        if (select) next.add(tKey);
        else next.delete(tKey);
      });
      return next;
    });

    setSelectedTopicMetaMap((prev) => {
      const next = { ...prev };
      topics.forEach((t) => {
        const tKey = `${chKey}::${getId(t)}`;
        if (select) {
          next[tKey] = {
            topicId: getId(t),
            topicName: t.name,
            chapterId: getId(chapter),
            chapterName: chapter.name,
            subjectId: chapter._subjectId,
            subjectName: chapter._subjectName,
          };
        } else {
          delete next[tKey];
        }
      });
      return next;
    });
  }

  function removeSingleTopic(topicKey: string, chKey: string) {
    Haptics.selectionAsync();
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      next.delete(topicKey);
      return next;
    });
    setSelectedTopicMetaMap((prev) => {
      const next = { ...prev };
      delete next[topicKey];
      return next;
    });
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      next.delete(chKey);
      return next;
    });
  }

  function removeChapterGroup(chKey: string, topics: { key: string }[]) {
    Haptics.selectionAsync();
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      next.delete(chKey);
      return next;
    });
    setSelectedChapterMetaMap((prev) => {
      const next = { ...prev };
      delete next[chKey];
      return next;
    });
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      topics.forEach((t) => next.delete(t.key));
      Array.from(next).forEach((k) => {
        if (k.startsWith(`${chKey}::`)) next.delete(k);
      });
      return next;
    });
    setSelectedTopicMetaMap((prev) => {
      const next = { ...prev };
      topics.forEach((t) => delete next[t.key]);
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${chKey}::`)) delete next[k];
      });
      return next;
    });
  }

  function clearAllSelection() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedChapters(new Set());
    setSelectedTopics(new Set());
    setSelectedChapterMetaMap({});
    setSelectedTopicMetaMap({});
    setIsDetailsExpanded(false);
  }

  const selectedGroupedByChapter = useMemo(() => {
    const map: Record<
      string,
      {
        chapterId: string;
        chapterName: string;
        subjectId: string;
        subjectName: string;
        isWholeChapter: boolean;
        topics: { topicId: string; topicName: string; key: string }[];
      }
    > = {};

    selectedChapters.forEach((chKey) => {
      const meta = selectedChapterMetaMap[chKey];
      const ch = allChapters.find((c) => getKey(c) === chKey);
      const chapterId = meta?.chapterId ?? chKey.split('::')[1] ?? '';
      const chapterName = meta?.chapterName ?? ch?.name ?? 'Chapter';
      const subjectId = meta?.subjectId ?? ch?._subjectId ?? '';
      const subjectName = meta?.subjectName ?? ch?._subjectName ?? '';

      map[chKey] = {
        chapterId,
        chapterName,
        subjectId,
        subjectName,
        isWholeChapter: true,
        topics: [],
      };
    });

    selectedTopics.forEach((tKey) => {
      const parts = tKey.split('::');
      const sId = parts[0] ?? '';
      const cId = parts[1] ?? '';
      const chKey = `${sId}::${cId}`;
      const meta = selectedTopicMetaMap[tKey];
      const ch = allChapters.find((c) => getKey(c) === chKey);
      const chapterId = meta?.chapterId ?? cId;
      const chapterName = meta?.chapterName ?? ch?.name ?? 'Chapter';
      const subjectId = meta?.subjectId ?? sId;
      const subjectName = meta?.subjectName ?? ch?._subjectName ?? '';
      const topicId = meta?.topicId ?? parts[2] ?? '';
      const topicName = meta?.topicName ?? `Topic ${topicId}`;

      if (!map[chKey]) {
        map[chKey] = {
          chapterId,
          chapterName,
          subjectId,
          subjectName,
          isWholeChapter: false,
          topics: [],
        };
      }

      if (!map[chKey].topics.some((t) => t.key === tKey)) {
        map[chKey].topics.push({
          topicId,
          topicName,
          key: tKey,
        });
      }
    });

    return Object.values(map);
  }, [selectedChapters, selectedTopics, selectedChapterMetaMap, selectedTopicMetaMap, allChapters]);

  const selectionSummaryText = useMemo(() => {
    const chCount = selectedChapters.size;
    const tCount = selectedTopics.size;
    if (chCount > 0 && tCount > 0) {
      return `${chCount} ${chCount === 1 ? 'Chapter' : 'Chapters'} • ${tCount} ${tCount === 1 ? 'Topic' : 'Topics'}`;
    }
    if (chCount > 0) {
      return `${chCount} ${chCount === 1 ? 'Chapter' : 'Chapters'}`;
    }
    if (tCount > 0) {
      return `${tCount} ${tCount === 1 ? 'Topic' : 'Topics'}`;
    }
    return '';
  }, [selectedChapters.size, selectedTopics.size]);

  const hasAnySelection = selectedChapters.size > 0 || selectedTopics.size > 0;
  const totalSelectedCount = selectedChapters.size + selectedTopics.size;

  function handleLaunchQuiz() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDetailsExpanded(false);
    const selectedList = allChapters.filter((c) => {
      const chKey = getKey(c);
      return selectedChapters.has(chKey) || Array.from(selectedTopics).some((k) => k.startsWith(`${chKey}::`));
    });

    if (selectedList.length === 0) return;

    const cIds = selectedList.map((c) => getId(c)).join(',');
    const cNames = selectedList.map((c) => c.name).join('|||');
    const sIds = selectedList.map((c) => c._subjectId).join(',');
    const sNames = selectedList.map((c) => c._subjectName).join('|||');

    const topicNamesByChapter = selectedList
      .map((c) => {
        const chKey = getKey(c);
        if (selectedChapters.has(chKey)) {
          return '';
        }
        const topicNames = Array.from(selectedTopics)
          .filter((k) => k.startsWith(`${chKey}::`))
          .map((k) => selectedTopicMetaMap[k]?.topicName ?? k.split('::')[2]);
        return topicNames.join('|||');
      })
      .join('::');

    router.push({
      pathname: '/test-config',
      params: {
        subjectId: sIds,
        subjectName: sNames,
        chapterId: cIds,
        chapterName: cNames,
        ...(topicNamesByChapter.replace(/:/g, '') ? { topicNamesByChapter } : { wholeChapter: '1' }),
      },
    });
  }

  function handleLaunchPaper() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDetailsExpanded(false);
    const selectedList = allChapters.filter((c) => {
      const chKey = getKey(c);
      return selectedChapters.has(chKey) || Array.from(selectedTopics).some((k) => k.startsWith(`${chKey}::`));
    });

    if (selectedList.length === 0) return;

    const cIds = selectedList.map((c) => getId(c)).join(',');
    const cNames = selectedList.map((c) => c.name).join('|||');
    const sIds = selectedList.map((c) => c._subjectId).join(',');
    const sNames = selectedList.map((c) => c._subjectName).join('|||');

    router.push({
      pathname: '/questions-pdf',
      params: {
        subjectId: sIds,
        subjectName: sNames,
        chapterId: cIds,
        chapterName: cNames,
      },
    });
  }

  function handleLaunchFlashcards() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDetailsExpanded(false);
    const selectedList = allChapters.filter((c) => {
      const chKey = getKey(c);
      return selectedChapters.has(chKey) || Array.from(selectedTopics).some((k) => k.startsWith(`${chKey}::`));
    });

    if (selectedList[0]) {
      const firstChapter = selectedList[0];
      const chKey = getKey(firstChapter);
      const topicKeysForCh = Array.from(selectedTopics).filter((k) => k.startsWith(`${chKey}::`));
      const firstTopicKey = topicKeysForCh[0];
      const firstTopicMeta = firstTopicKey ? selectedTopicMetaMap[firstTopicKey] : null;

      router.push({
        pathname: '/flashcard',
        params: {
          subjectId: firstChapter._subjectId,
          subjectName: firstChapter._subjectName,
          chapterId: getId(firstChapter),
          chapterName: firstChapter.name,
          ...(firstTopicMeta ? { topicId: firstTopicMeta.topicId, topicName: firstTopicMeta.topicName } : {}),
        },
      });
    }
  }

  function handleLaunchExplanation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDetailsExpanded(false);
    const selectedList = allChapters.filter((c) => {
      const chKey = getKey(c);
      return selectedChapters.has(chKey) || Array.from(selectedTopics).some((k) => k.startsWith(`${chKey}::`));
    });

    if (selectedList[0]) {
      const firstChapter = selectedList[0];
      const chKey = getKey(firstChapter);
      const topicKeysForCh = Array.from(selectedTopics).filter((k) => k.startsWith(`${chKey}::`));
      const firstTopicKey = topicKeysForCh[0];
      const firstTopicMeta = firstTopicKey ? selectedTopicMetaMap[firstTopicKey] : null;

      router.push({
        pathname: '/explanation',
        params: {
          subjectId: firstChapter._subjectId,
          subjectName: firstChapter._subjectName,
          chapterId: getId(firstChapter),
          chapterName: firstChapter.name,
          ...(firstTopicMeta ? { topicId: firstTopicMeta.topicId, topicName: firstTopicMeta.topicName } : {}),
        },
      });
    }
  }

  function handleLaunchChat() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDetailsExpanded(false);
    const selectedList = allChapters.filter((c) => {
      const chKey = getKey(c);
      return selectedChapters.has(chKey) || Array.from(selectedTopics).some((k) => k.startsWith(`${chKey}::`));
    });

    if (selectedList[0]) {
      const firstChapter = selectedList[0];
      const chKey = getKey(firstChapter);
      const topicKeysForCh = Array.from(selectedTopics).filter((k) => k.startsWith(`${chKey}::`));
      const firstTopicKey = topicKeysForCh[0];
      const firstTopicMeta = firstTopicKey ? selectedTopicMetaMap[firstTopicKey] : null;

      router.push({
        pathname: '/chat',
        params: {
          subjectId: firstChapter._subjectId,
          subjectName: firstChapter._subjectName,
          chapterId: getId(firstChapter),
          chapterName: firstChapter.name,
          ...(firstTopicMeta ? { topicId: firstTopicMeta.topicId, topicName: firstTopicMeta.topicName } : {}),
        },
      });
    }
  }

  const displayTitle = isMultiSubject ? `${subjectIds.length} Subjects` : (subjectNames[0] ?? subjectName ?? '');
  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/subjects');
            }}
            style={styles.backCircle}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Chapters & Topics</Text>
            <Text style={styles.headerSub}>{displayTitle} • {standardName || 'Class 11'}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.expandAllBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (expandedChapters.size === filteredChapters.length) {
                  setExpandedChapters(new Set());
                } else {
                  setExpandedChapters(new Set(filteredChapters.map((c) => getKey(c))));
                }
              }}
            >
              <Ionicons
                name={expandedChapters.size === filteredChapters.length ? 'contract-outline' : 'expand-outline'}
                size={14}
                color="#FFF"
              />
              <Text style={styles.expandAllBtnText}>
                {expandedChapters.size === filteredChapters.length ? 'Collapse All' : 'Expand All'}
              </Text>
            </Pressable>
            <Pressable style={styles.syllabusBtn}>
              <Ionicons name="document-text" size={14} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.syllabusBtnText}>Syllabus</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── MASTER BANNER ── */}
      {!isMultiSubject && (
        <View style={styles.bannerContainer}>
          <View style={styles.masterBanner}>
            <View style={styles.masterBannerTextWrap}>
              <Text style={styles.masterBannerTitle}>Master {displayTitle}</Text>
              <Text style={styles.masterBannerSub}>
                Click any chapter to drop down its topics. Check individual topics or entire chapters to practice quizzes and build papers.
              </Text>
            </View>
            <View style={styles.masterBannerIconWrap}>
              <Ionicons name="planet" size={60} color="#A5B4FC" style={{ opacity: 0.8 }} />
            </View>
          </View>
        </View>
      )}

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#A49186" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chapters or topics..."
            placeholderTextColor="#A49186"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#A49186" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── LIST HEADER ── */}
      <View style={styles.listHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.listTitle}>All Chapters ({allChapters.length})</Text>
          <Text style={styles.listHint}>Click chapter to reveal topics</Text>
        </View>
        <View style={styles.boardSelect}>
          <Text style={styles.boardSelectText}>CBSE {standardName || 'Class 11'}</Text>
          <Ionicons name="chevron-down" size={12} color="#C85C3E" style={{ marginLeft: 4 }} />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C85C3E" />
        </View>
      ) : (
        <FlatList
          data={filteredChapters}
          keyExtractor={(item) => getKey(item)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + (hasAnySelection ? 120 : 80),
            gap: 14,
            maxWidth: 1200,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const chKey = getKey(item);
            const isExpanded = expandedChapters.has(chKey);
            const isChapterSelected = selectedChapters.has(chKey);

            return (
              <ChapterAccordionItem
                chapter={item}
                index={index}
                boardId={boardId}
                standardId={standardId}
                isExpanded={isExpanded}
                isChapterSelected={isChapterSelected}
                selectedTopics={selectedTopics}
                onToggleExpand={() => toggleExpand(chKey)}
                onToggleChapterSelect={(topics) => toggleChapterSelect(item, topics)}
                onToggleTopicSelect={(topic, topics) => toggleTopicSelect(item, topic, topics)}
                onSelectAllTopicsInChapter={(topics, select) =>
                  toggleSelectAllTopicsInChapter(item, topics, select)
                }
                onRegisterLoadedTopics={(topics) => handleRegisterLoadedTopics(item, topics)}
              />
            );
          }}
        />
      )}

      {/* ── SMALL FLOATING SELECTION CONTAINER (COLLAPSED) ── */}
      {hasAnySelection && !isDetailsExpanded && (
        <View
          style={[
            styles.smallDock,
            isMobile && styles.smallDockMobile,
            { bottom: Math.max(16, insets.bottom + 8) },
          ]}
        >
          <Pressable
            style={({ hovered }: any) => [
              styles.smallDockMain,
              hovered && styles.smallDockMainHovered,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsDetailsExpanded(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Expand selection details and actions"
          >
            <View style={styles.smallDockCountBadge}>
              <Text style={styles.smallDockCountText}>{totalSelectedCount}</Text>
            </View>
            <View style={styles.smallDockTextWrap}>
              <Text style={styles.smallDockTitle} numberOfLines={1} ellipsizeMode="tail">
                {selectionSummaryText} selected
              </Text>
              <View style={styles.smallDockSubRow}>
                <Text style={styles.smallDockSub} numberOfLines={1} ellipsizeMode="tail">
                  {isMobile ? 'Tap to view details & actions' : 'Tap to review details & actions'}
                </Text>
                <Ionicons name="chevron-up" size={12} color="#F6DFD2" style={{ flexShrink: 0 }} />
              </View>
            </View>
          </Pressable>

          <View style={styles.smallDockActions}>
            <Pressable
              style={({ hovered }: any) => [
                isMobile ? styles.smallDockActionBtnMobile : styles.smallDockReviewBtn,
                hovered && (isMobile ? styles.smallDockActionBtnMobileHovered : styles.smallDockReviewBtnHovered),
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsDetailsExpanded(true);
              }}
            >
              <Ionicons name={isMobile ? 'flash' : 'eye-outline'} size={14} color="#FFF" />
              <Text style={isMobile ? styles.smallDockActionBtnMobileText : styles.smallDockReviewBtnText}>
                {isMobile ? 'Actions' : 'View Details'}
              </Text>
              <Ionicons name="chevron-up" size={12} color="#FFF" />
            </Pressable>

            {!isMobile && (
              <Pressable
                style={({ hovered }: any) => [styles.smallDockQuizBtn, hovered && styles.smallDockQuizBtnHovered]}
                onPress={handleLaunchQuiz}
              >
                <Ionicons name="trophy-outline" size={14} color="#FFF" />
                <Text style={styles.smallDockQuizBtnText}>Practice Quiz</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ── BIGGER EXPANDED CONTAINER (MODAL / DETAILED PANEL) ── */}
      <Modal
        visible={isDetailsExpanded && hasAnySelection}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDetailsExpanded(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsDetailsExpanded(false)}>
          <Pressable
            style={[styles.expandedDrawer, { paddingBottom: Math.max(20, insets.bottom + 12) }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* DRAWER HEADER */}
            <View style={styles.expandedHeader}>
              <View style={styles.expandedHeaderHandle} />
              <View style={styles.expandedHeaderRow}>
                <View style={styles.expandedTitleWrap}>
                  <View style={styles.expandedIconBadge}>
                    <Ionicons name="layers" size={20} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={styles.expandedTitle}>Selected Curriculum</Text>
                      <View style={styles.expandedCountPill}>
                        <Text style={styles.expandedCountPillText}>
                          {selectedChapters.size} {selectedChapters.size === 1 ? 'Chapter' : 'Chapters'} • {selectedTopics.size} {selectedTopics.size === 1 ? 'Topic' : 'Topics'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.expandedSubtitle}>
                      Manage your selections across all chapters and launch study actions
                    </Text>
                  </View>
                </View>

                <View style={styles.expandedHeaderRightBtns}>
                  <Pressable
                    style={styles.clearAllBtn}
                    onPress={clearAllSelection}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={styles.clearAllBtnText}>Clear All</Text>
                  </Pressable>
                  <Pressable
                    style={styles.minimizeBtn}
                    onPress={() => setIsDetailsExpanded(false)}
                  >
                    <Ionicons name="chevron-down" size={20} color="#5E4B42" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* SCROLLABLE DETAILED SELECTION BREAKDOWN */}
            <ScrollView style={styles.expandedScrollArea} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={true}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="checkmark-done-circle-outline" size={16} color="#C85C3E" />
                <Text style={styles.expandedSectionLabel}>EVERYTHING CURRENTLY SELECTED</Text>
              </View>

              <View style={styles.detailedGroupList}>
                {selectedGroupedByChapter.map((group) => {
                  const chKey = `${group.subjectId}::${group.chapterId}`;
                  return (
                    <View key={chKey} style={styles.detailedChapterCard}>
                      <View style={styles.detailedChapterCardTop}>
                        <View style={styles.detailedChapterTitleRow}>
                          <View style={styles.detailedChapterIcon}>
                            <Ionicons name="book-outline" size={16} color="#C85C3E" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.detailedChapterName}>{group.chapterName}</Text>
                            {isMultiSubject && (
                              <Text style={styles.detailedSubjectTag}>{group.subjectName}</Text>
                            )}
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View
                            style={[
                              styles.statusPill,
                              group.isWholeChapter ? styles.statusPillWhole : styles.statusPillPartial,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                group.isWholeChapter ? styles.statusPillWholeText : styles.statusPillPartialText,
                              ]}
                            >
                              {group.isWholeChapter ? 'Whole Chapter' : `${group.topics.length} topics`}
                            </Text>
                          </View>
                          <Pressable
                            style={styles.removeGroupBtn}
                            onPress={() => removeChapterGroup(chKey, group.topics)}
                            accessibilityLabel={`Remove ${group.chapterName}`}
                          >
                            <Ionicons name="close" size={16} color="#76645B" />
                          </Pressable>
                        </View>
                      </View>

                      {/* INDIVIDUAL TOPIC CHIPS */}
                      {group.topics.length > 0 && (
                        <View style={styles.detailedTopicsWrap}>
                          {group.topics.map((t) => (
                            <View key={t.key} style={styles.detailedTopicChip}>
                              <Ionicons name="radio-button-on" size={10} color="#C85C3E" />
                              <Text style={styles.detailedTopicChipText} numberOfLines={1}>
                                {t.topicName}
                              </Text>
                              <Pressable
                                style={styles.removeTopicChipBtn}
                                onPress={() => removeSingleTopic(t.key, chKey)}
                              >
                                <Ionicons name="close" size={13} color="#C85C3E" />
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* ── ALL ACTION BUTTONS ── */}
              <View style={styles.actionButtonsSection}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="flash-outline" size={16} color="#C85C3E" />
                  <Text style={styles.expandedSectionLabel}>CHOOSE ACTION FOR THIS SELECTION</Text>
                </View>

                <View style={styles.actionCardsGrid}>
                  {/* 1. PRACTICE QUIZ */}
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.actionBigCard,
                      { borderLeftColor: '#F59E0B' },
                      hovered && styles.actionBigCardHovered,
                    ]}
                    onPress={handleLaunchQuiz}
                  >
                    <View style={[styles.actionBigIconWrap, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="trophy-outline" size={24} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.actionBigCardHeader}>
                        <Text style={styles.actionBigTitle}>Practice Quiz</Text>
                        <View style={[styles.actionTagBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.actionTagBadgeText, { color: '#B45309' }]}>Timed Test</Text>
                        </View>
                      </View>
                      <Text style={styles.actionBigDesc}>
                        Take an AI-generated quiz tailored strictly to your selected chapters and topics
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#D97706" />
                  </Pressable>

                  {/* 2. EXAM PAPER */}
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.actionBigCard,
                      { borderLeftColor: '#2563EB' },
                      hovered && styles.actionBigCardHovered,
                    ]}
                    onPress={handleLaunchPaper}
                  >
                    <View style={[styles.actionBigIconWrap, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="print-outline" size={24} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.actionBigCardHeader}>
                        <Text style={styles.actionBigTitle}>Exam Paper (PDF)</Text>
                        <View style={[styles.actionTagBadge, { backgroundColor: '#EFF6FF' }]}>
                          <Text style={[styles.actionTagBadgeText, { color: '#1D4ED8' }]}>Printable</Text>
                        </View>
                      </View>
                      <Text style={styles.actionBigDesc}>
                        Build and print a formatted question paper with answer keys & solutions
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#2563EB" />
                  </Pressable>

                  {/* 3. FLASHCARDS */}
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.actionBigCard,
                      { borderLeftColor: '#7C3AED' },
                      hovered && styles.actionBigCardHovered,
                    ]}
                    onPress={handleLaunchFlashcards}
                  >
                    <View style={[styles.actionBigIconWrap, { backgroundColor: '#F5F3FF' }]}>
                      <Ionicons name="albums-outline" size={24} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.actionBigCardHeader}>
                        <Text style={styles.actionBigTitle}>Flashcards Revision</Text>
                        <View style={[styles.actionTagBadge, { backgroundColor: '#F5F3FF' }]}>
                          <Text style={[styles.actionTagBadgeText, { color: '#6D28D9' }]}>Speed Review</Text>
                        </View>
                      </View>
                      <Text style={styles.actionBigDesc}>
                        Flip through interactive question & formula cards for rapid memorization
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#7C3AED" />
                  </Pressable>

                  {/* 4. CONCEPT EXPLANATION */}
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.actionBigCard,
                      { borderLeftColor: '#10B981' },
                      hovered && styles.actionBigCardHovered,
                    ]}
                    onPress={handleLaunchExplanation}
                  >
                    <View style={[styles.actionBigIconWrap, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="book-outline" size={24} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.actionBigCardHeader}>
                        <Text style={styles.actionBigTitle}>Study Guide & Notes</Text>
                        <View style={[styles.actionTagBadge, { backgroundColor: '#ECFDF5' }]}>
                          <Text style={[styles.actionTagBadgeText, { color: '#047857' }]}>Theory</Text>
                        </View>
                      </View>
                      <Text style={styles.actionBigDesc}>
                        Read detailed theory, solved examples, formula sheets, and concept breakdowns
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#059669" />
                  </Pressable>

                  {/* 5. AI TUTOR DOUBT SOLVER */}
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.actionBigCard,
                      { borderLeftColor: '#9333EA' },
                      hovered && styles.actionBigCardHovered,
                    ]}
                    onPress={handleLaunchChat}
                  >
                    <View style={[styles.actionBigIconWrap, { backgroundColor: '#FAF5FF' }]}>
                      <Ionicons name="sparkles" size={24} color="#9333EA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.actionBigCardHeader}>
                        <Text style={styles.actionBigTitle}>Ask AI Tutor</Text>
                        <View style={[styles.actionTagBadge, { backgroundColor: '#FAF5FF' }]}>
                          <Text style={[styles.actionTagBadgeText, { color: '#7E22CE' }]}>24/7 AI</Text>
                        </View>
                      </View>
                      <Text style={styles.actionBigDesc}>
                        Get instant step-by-step help, doubts clearing, and derivations for this selection
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#9333EA" />
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ChapterAccordionItem({
  chapter,
  index,
  boardId,
  standardId,
  isExpanded,
  isChapterSelected,
  selectedTopics,
  onToggleExpand,
  onToggleChapterSelect,
  onToggleTopicSelect,
  onSelectAllTopicsInChapter,
  onRegisterLoadedTopics,
}: {
  chapter: TaggedChapter;
  index: number;
  boardId?: string | null;
  standardId?: string | null;
  isExpanded: boolean;
  isChapterSelected: boolean;
  selectedTopics: Set<string>;
  onToggleExpand: () => void;
  onToggleChapterSelect: (topics?: Topic[]) => void;
  onToggleTopicSelect: (topic: Topic, allTopics?: Topic[]) => void;
  onSelectAllTopicsInChapter: (topics: Topic[], select: boolean) => void;
  onRegisterLoadedTopics?: (topics: Topic[]) => void;
}) {
  const chapterId = getId(chapter);
  const chKey = `${chapter._subjectId}::${chapterId}`;
  const numColor = NUMBER_COLORS[index % NUMBER_COLORS.length]!;

  const topicsQuery = useQuery({
    queryKey: ['topics', boardId, standardId, chapter._subjectId, chapterId],
    queryFn: () => eduApi.getTopics(boardId!, standardId!, chapter._subjectId, chapterId),
    enabled: isExpanded && !!boardId && !!standardId && !!chapterId,
  });

  const topics = topicsQuery.data ?? [];

  useEffect(() => {
    if (topics.length > 0 && onRegisterLoadedTopics) {
      onRegisterLoadedTopics(topics);
    }
  }, [topics]);
  const selectedCountInChapter = topics.filter((t) => selectedTopics.has(`${chKey}::${getId(t)}`)).length;
  const isPartiallySelected = !isChapterSelected && selectedCountInChapter > 0;
  const isFullySelected = isChapterSelected || (topics.length > 0 && selectedCountInChapter === topics.length);

  return (
    <View style={[styles.accordionCard, (isFullySelected || isPartiallySelected) && styles.accordionCardSelected]}>
      {/* CHAPTER HEADER ROW (CLICK EXPANDS DROPDOWN) */}
      <Pressable
        style={({ hovered }: any) => [styles.accordionHeader, hovered && styles.accordionHeaderHovered]}
        onPress={onToggleExpand}
      >
        {/* CHAPTER CHECKBOX (TOGGLES CHAPTER + ALL ITS TOPICS) */}
        <Pressable
          style={[
            styles.checkboxWrap,
            isFullySelected && styles.checkboxWrapSelected,
            isPartiallySelected && styles.checkboxWrapPartial,
          ]}
          onPress={(e) => {
            e.stopPropagation();
            onToggleChapterSelect(topics);
          }}
        >
          {isFullySelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
          {isPartiallySelected && <Ionicons name="remove" size={13} color="#FFF" />}
        </Pressable>

        <View style={[styles.numBadge, { backgroundColor: numColor.bg }]}>
          <Text style={[styles.numText, { color: numColor.text }]}>{index + 1}</Text>
        </View>

        <View style={styles.chapterInfo}>
          <Text
            style={[styles.chapterName, (isFullySelected || isPartiallySelected) && styles.chapterNameSelected]}
            numberOfLines={2}
          >
            {chapter.name}
          </Text>
          <View style={styles.chapterMetaRow}>
            <Text style={styles.chapterTopics}>
              {topics.length > 0 ? `${topics.length} topics` : 'Click to drop down topics'}
            </Text>
            {selectedCountInChapter > 0 && (
              <View style={styles.selectedCountTag}>
                <Text style={styles.selectedCountTagText}>{selectedCountInChapter} selected</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerRightControls}>
          <View style={styles.progressWrap}>
            <View style={styles.progressBarBg}>
              <View style={styles.progressBarFill} />
            </View>
            <Text style={styles.progressText}>0%</Text>
          </View>
          <View style={[styles.chevronWrap, isExpanded && styles.chevronWrapExpanded]}>
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={isExpanded ? '#C85C3E' : '#A49186'}
            />
          </View>
        </View>
      </Pressable>

      {/* EXPANDED TOPICS DROPDOWN */}
      {isExpanded && (
        <View style={styles.topicsDropdown}>
          <View style={styles.topicsDropdownHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="layers-outline" size={15} color="#C85C3E" />
              <Text style={styles.topicsDropdownTitle}>
                Topics in {chapter.name} ({topics.length})
              </Text>
            </View>
            {topics.length > 0 && (
              <Pressable
                style={styles.dropdownSelectAllBtn}
                onPress={() => onSelectAllTopicsInChapter(topics, selectedCountInChapter !== topics.length)}
              >
                <Text style={styles.dropdownSelectAllText}>
                  {selectedCountInChapter === topics.length ? 'Deselect All' : 'Select All Topics'}
                </Text>
              </Pressable>
            )}
          </View>

          {topicsQuery.isLoading ? (
            <View style={styles.topicsLoadingWrap}>
              <ActivityIndicator size="small" color="#C85C3E" />
              <Text style={styles.topicsLoadingText}>Loading topics...</Text>
            </View>
          ) : topics.length === 0 ? (
            <Text style={styles.emptyTopicsText}>No topics listed for this chapter.</Text>
          ) : (
            <View style={styles.topicsList}>
              {topics.map((topic, tIdx) => {
                const tKey = `${chKey}::${getId(topic)}`;
                const isTopicSelected = isFullySelected || selectedTopics.has(tKey);

                return (
                  <Pressable
                    key={getId(topic) || tIdx}
                    style={({ hovered }: any) => [
                      styles.topicRow,
                      isTopicSelected && styles.topicRowSelected,
                      hovered && styles.topicRowHovered,
                    ]}
                    onPress={() => onToggleTopicSelect(topic, topics)}
                  >
                    <View style={[styles.topicCheckbox, isTopicSelected && styles.topicCheckboxSelected]}>
                      {isTopicSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>

                    <Text style={styles.topicIndexText}>
                      {index + 1}.{tIdx + 1}
                    </Text>

                    <Text
                      style={[styles.topicRowTitle, isTopicSelected && styles.topicRowTitleSelected]}
                      numberOfLines={2}
                    >
                      {topic.name}
                    </Text>

                    <Pressable
                      style={styles.topicStudyIconBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/topic-dashboard',
                          params: {
                            subjectId: chapter._subjectId,
                            subjectName: chapter._subjectName,
                            chapterId,
                            chapterName: chapter.name,
                            topicId: getId(topic),
                            topicName: topic.name,
                          },
                        });
                      }}
                      accessibilityLabel="Study this topic"
                    >
                      <Ionicons name="bulb-outline" size={14} color="#C85C3E" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEE5' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: '#6B382C',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  expandAllBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  syllabusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  syllabusBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  bannerContainer: { paddingHorizontal: 20, marginTop: -15 },
  masterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#C85C3E',
    shadowColor: '#8E422E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  masterBannerTextWrap: { flex: 1, paddingRight: 16 },
  masterBannerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  masterBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
  masterBannerIconWrap: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },

  searchWrap: { paddingHorizontal: 20, marginTop: 16, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: '#3D2D27' },

  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  listTitle: { fontSize: 15, fontWeight: '800', color: '#3D2D27' },
  listHint: { fontSize: 11, fontWeight: '600', color: '#A49186' },
  boardSelect: { flexDirection: 'row', alignItems: 'center' },
  boardSelectText: { fontSize: 12, fontWeight: '700', color: '#C85C3E' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* ACCORDION CARD */
  accordionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE3D8',
    overflow: 'hidden',
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  accordionCardSelected: {
    borderColor: '#C85C3E',
    borderWidth: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'background-color 0.15s ease' as any } : {}),
  },
  accordionHeaderHovered: {
    backgroundColor: '#FCFAF7',
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
    marginRight: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  checkboxWrapSelected: {
    borderColor: '#C85C3E',
    backgroundColor: '#C85C3E',
  },
  checkboxWrapPartial: {
    borderColor: '#C85C3E',
    backgroundColor: '#C85C3E',
  },

  numBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  numText: { fontSize: 16, fontWeight: '800' },

  chapterInfo: { flex: 1 },
  chapterName: { fontSize: 14, fontWeight: '700', color: '#3D2D27', marginBottom: 4, lineHeight: 19 },
  chapterNameSelected: { color: '#C85C3E' },
  chapterMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chapterTopics: { fontSize: 11, color: '#76645B' },
  selectedCountTag: {
    backgroundColor: '#F6DFD2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  selectedCountTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C85C3E',
  },

  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBarBg: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
  progressBarFill: { width: 0, height: 4, borderRadius: 2, backgroundColor: '#C85C3E' },
  progressText: { fontSize: 11, fontWeight: '600', color: '#76645B' },

  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F6EFE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrapExpanded: {
    backgroundColor: '#F6DFD2',
  },

  /* DROPDOWN TOPICS LIST */
  topicsDropdown: {
    backgroundColor: '#FAF6F0',
    borderTopWidth: 1,
    borderTopColor: '#EFE3D8',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topicsDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE3D8',
  },
  topicsDropdownTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5E4B42',
  },
  dropdownSelectAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E6DCD2',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  dropdownSelectAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C85C3E',
  },

  topicsLoadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topicsLoadingText: {
    fontSize: 12,
    color: '#76645B',
  },
  emptyTopicsText: {
    fontSize: 12,
    color: '#8E7B70',
    paddingVertical: 12,
    textAlign: 'center',
  },
  topicsList: {
    gap: 8,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#ECE1D5',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'all 0.15s ease' as any } : {}),
  },
  topicRowSelected: {
    backgroundColor: '#FFF7F2',
    borderColor: '#C85C3E',
  },
  topicRowHovered: {
    borderColor: '#C85C3E',
  },
  topicCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C4B5A5',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  topicCheckboxSelected: {
    borderColor: '#C85C3E',
    backgroundColor: '#C85C3E',
  },
  topicIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B786D',
    marginRight: 8,
  },
  topicRowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#3D2D27',
  },
  topicRowTitleSelected: {
    fontWeight: '800',
    color: '#A84932',
  },
  topicStudyIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },

  /* ── SMALL FLOATING SELECTION CONTAINER (COLLAPSED) ── */
  smallDock: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxWidth: 860,
    alignSelf: 'center',
    backgroundColor: '#2A1E17',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  smallDockMobile: {
    left: 12,
    right: 12,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  smallDockMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  smallDockMainHovered: {
    opacity: 0.9,
  },
  smallDockCountBadge: {
    backgroundColor: '#C85C3E',
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  smallDockCountText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  smallDockTextWrap: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  smallDockTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap', textOverflow: 'ellipsis' } as any) : {}),
  },
  smallDockSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    overflow: 'hidden',
  },
  smallDockSub: {
    color: '#D4C4B8',
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
    minWidth: 0,
    ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap', textOverflow: 'ellipsis' } as any) : {}),
  },
  smallDockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  smallDockActionBtnMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#C85C3E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  smallDockActionBtnMobileHovered: {
    backgroundColor: '#B5492C',
  },
  smallDockActionBtnMobileText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  smallDockReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  smallDockReviewBtnHovered: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  smallDockReviewBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  smallDockQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C85C3E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  smallDockQuizBtnHovered: {
    backgroundColor: '#B5492C',
  },
  smallDockQuizBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* ── BIGGER EXPANDED CONTAINER (MODAL / DETAILED PANEL) ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 17, 13, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1000,
  },
  expandedDrawer: {
    width: '100%',
    maxWidth: 880,
    maxHeight: '88%',
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#E6DCD2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  expandedHeader: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE3D8',
  },
  expandedHeaderHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D9CCC0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  expandedTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  expandedIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#C85C3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  expandedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3D2D27',
  },
  expandedCountPill: {
    backgroundColor: '#F6DFD2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expandedCountPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C85C3E',
  },
  expandedSubtitle: {
    fontSize: 12,
    color: '#76645B',
    marginTop: 3,
  },
  expandedHeaderRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  clearAllBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  minimizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0E8DF',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },

  expandedScrollArea: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  expandedSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#76645B',
    letterSpacing: 0.6,
  },
  detailedGroupList: {
    gap: 10,
    marginBottom: 24,
  },
  detailedChapterCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE1D5',
    padding: 14,
  },
  detailedChapterCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailedChapterTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailedChapterIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailedChapterName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3D2D27',
  },
  detailedSubjectTag: {
    fontSize: 11,
    color: '#76645B',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillWhole: {
    backgroundColor: '#ECFDF5',
  },
  statusPillPartial: {
    backgroundColor: '#FFF7ED',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillWholeText: {
    color: '#059669',
  },
  statusPillPartialText: {
    color: '#D97706',
  },
  removeGroupBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#F5ECE3',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  detailedTopicsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2E9E0',
  },
  detailedTopicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFF7F2',
    borderWidth: 1,
    borderColor: '#F6DFD2',
    maxWidth: '100%',
  },
  detailedTopicChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A3C28',
    flexShrink: 1,
  },
  removeTopicChipBtn: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },

  actionButtonsSection: {
    marginTop: 4,
  },
  actionCardsGrid: {
    gap: 10,
  },
  actionBigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#ECE1D5',
    borderLeftWidth: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any, transition: 'all 0.15s ease' as any } : {}),
  },
  actionBigCardHovered: {
    backgroundColor: '#FCFAF7',
    borderColor: '#C85C3E',
  },
  actionBigIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBigCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  actionBigTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3D2D27',
  },
  actionTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  actionTagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionBigDesc: {
    fontSize: 12,
    color: '#76645B',
    lineHeight: 16,
  },
});
