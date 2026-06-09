import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Topic } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TaggedTopic = Topic & {
  _chapterId: string;
  _chapterName: string;
  _subjectId: string;
  _subjectName: string;
};

export default function TopicsScreen() {
  const {
    subjectId,
    subjectName,
    subjectIds: rawSubjectIds,
    subjectNames: rawSubjectNames,
    chapterId,
    chapterName,
    mode,
  } = useLocalSearchParams<{
    subjectId?: string;
    subjectName?: string;
    subjectIds?: string;      // comma-sep, aligned with chapterId (multi-subject path)
    subjectNames?: string;    // pipe-sep, aligned with chapterId
    chapterId: string;
    chapterName: string;
    mode?: string;
  }>();
  const { boardId, standardId, setSubjectTotal } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Parse chapter params (always comma/pipe-sep)
  const chapterIds = useMemo(() => (chapterId ?? '').split(',').filter(Boolean), [chapterId]);
  const chapterNames = useMemo(() => (chapterName ?? '').split('|||').filter(Boolean), [chapterName]);

  // Per-chapter subject info — from multi-subject path OR fall back to single subjectId
  const perChapterSubjectIds = useMemo(() => {
    if (rawSubjectIds) return rawSubjectIds.split(',').filter(Boolean);
    // Single subject: replicate for all chapters
    return chapterIds.map(() => subjectId ?? '');
  }, [rawSubjectIds, subjectId, chapterIds]);

  const perChapterSubjectNames = useMemo(() => {
    if (rawSubjectNames) return rawSubjectNames.split('|||').filter(Boolean);
    return chapterIds.map(() => subjectName ?? '');
  }, [rawSubjectNames, subjectName, chapterIds]);

  const isMultiChapter = chapterIds.length > 1;

  // Single chapter fetch (single chapter, single subject)
  const singleQuery = useQuery({
    queryKey: ['topics', boardId, standardId, perChapterSubjectIds[0], chapterIds[0]],
    queryFn: () => eduApi.getTopics(boardId!, standardId!, perChapterSubjectIds[0]!, chapterIds[0]!),
    enabled: !!boardId && !!standardId && !!perChapterSubjectIds[0] && chapterIds.length === 1,
  });

  // Multi-chapter parallel fetch — each with its own subjectId
  const multiQueries = useQueries({
    queries: chapterIds.map((cid, i) => ({
      queryKey: ['topics', boardId, standardId, perChapterSubjectIds[i], cid],
      queryFn: () => eduApi.getTopics(boardId!, standardId!, perChapterSubjectIds[i]!, cid),
      enabled: !!boardId && !!standardId && !!perChapterSubjectIds[i] && chapterIds.length > 1,
    })),
  });

  const isLoading = isMultiChapter
    ? multiQueries.some(q => q.isLoading)
    : singleQuery.isLoading;

  const isError = isMultiChapter
    ? multiQueries.every(q => q.isError)
    : !!singleQuery.error;

  // Flatten topics with full context tags
  const allTopics: TaggedTopic[] = useMemo(() => {
    if (isMultiChapter) {
      return multiQueries.flatMap((q, i) =>
        (q.data ?? []).map(t => ({
          ...t,
          _chapterId: chapterIds[i]!,
          _chapterName: chapterNames[i] ?? chapterIds[i]!,
          _subjectId: perChapterSubjectIds[i]!,
          _subjectName: perChapterSubjectNames[i] ?? perChapterSubjectIds[i]!,
        }))
      );
    }
    return (singleQuery.data ?? []).map(t => ({
      ...t,
      _chapterId: chapterIds[0]!,
      _chapterName: chapterNames[0] ?? chapterName,
      _subjectId: perChapterSubjectIds[0]!,
      _subjectName: perChapterSubjectNames[0] ?? subjectName ?? '',
    }));
  }, [isMultiChapter, multiQueries, singleQuery.data, chapterIds, chapterNames, perChapterSubjectIds, perChapterSubjectNames]);

  useEffect(() => {
    if (allTopics.length > 0 && !isMultiChapter && perChapterSubjectIds[0]) {
      setSubjectTotal(perChapterSubjectIds[0], allTopics.length);
    }
  }, [allTopics.length]);

  const isExplanation = mode === 'explanation';
  const isMultiSubject = (rawSubjectIds?.split(',') ?? []).filter(Boolean).length > 1;

  const getKey = (t: TaggedTopic) => `${t._subjectId}::${t._chapterId}::${getId(t)}`;

  function toggleSelectMode() {
    Haptics.selectionAsync();
    if (selectMode) { setSelected(new Set()); setSelectMode(false); }
    else setSelectMode(true);
  }

  function toggleItem(key: string) {
    Haptics.selectionAsync();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function selectAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selected.size === allTopics.length) setSelected(new Set());
    else setSelected(new Set(allTopics.map(t => getKey(t))));
  }

  function handleTopicPress(topic: TaggedTopic) {
    if (selectMode) { toggleItem(getKey(topic)); return; }
    Haptics.selectionAsync();
    if (isExplanation) {
      router.push({
        pathname: '/explanation' as any,
        params: {
          subjectId: topic._subjectId, subjectName: topic._subjectName,
          chapterId: topic._chapterId, chapterName: topic._chapterName,
          topicId: getId(topic), topicName: topic.name,
        },
      });
    } else {
      router.push({
        pathname: '/topic-dashboard' as any,
        params: {
          subjectId: topic._subjectId, subjectName: topic._subjectName,
          chapterId: topic._chapterId, chapterName: topic._chapterName,
          topicId: getId(topic), topicName: topic.name,
        },
      });
    }
  }

  function handleAction(action: 'test' | 'chat' | 'explanation') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // When no topics selected in select mode → fall back to testing the whole chapter(s)
    const selectedTopics = allTopics.filter(t => selected.has(getId(t)));
    const useWholeChapter = selectedTopics.length === 0;
    const topics = useWholeChapter ? allTopics : selectedTopics;
    if (topics.length === 0) return;

    const first = topics[0]!;

    if (action === 'test') {
      // Group selected topics by their chapter so multi-chapter works correctly
      const chapterMap = new Map<string, {
        subjectId: string; subjectName: string;
        chapterName: string; topicNames: string[];
      }>();
      for (const t of topics) {
        const cid = t._chapterId;
        if (!chapterMap.has(cid)) {
          chapterMap.set(cid, {
            subjectId: t._subjectId,
            subjectName: t._subjectName,
            chapterName: t._chapterName,
            topicNames: [],
          });
        }
        chapterMap.get(cid)!.topicNames.push(t.name);
      }
      const entries = [...chapterMap.entries()];

      router.push({
        pathname: '/test-config' as any,
        params: {
          subjectId: entries.map(([, v]) => v.subjectId).join(','),
          subjectName: entries.map(([, v]) => v.subjectName).join('|||'),
          chapterId: entries.map(([cid]) => cid).join(','),
          chapterName: entries.map(([, v]) => v.chapterName).join('|||'),
          // Pass topic names per chapter (pipe-sep within chapter, double-pipe between chapters)
          // For single chapter: "Topic A|||Topic B"
          // For multi-chapter: "Topic A|||Topic B::Topic C|||Topic D"
          topicNamesByChapter: entries.map(([, v]) => v.topicNames.join('|||')).join('::'),
          wholeChapter: useWholeChapter ? '1' : '0',
        },
      });
    } else if (action === 'chat') {
      router.push({
        pathname: '/chat' as any,
        params: {
          subjectId: first._subjectId,
          subjectName: first._subjectName,
          chapterId: first._chapterId,
          chapterName: first._chapterName,
          topicId: getId(first),
          topicName: topics.map(t => t.name).join(', '),
        },
      });
    } else {
      router.push({
        pathname: '/explanation' as any,
        params: {
          subjectId: first._subjectId, subjectName: first._subjectName,
          chapterId: first._chapterId, chapterName: first._chapterName,
          topicId: getId(first), topicName: first.name,
        },
      });
    }
  }

  const [search, setSearch] = useState('');
  const filteredTopics = allTopics.filter(t => !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()));
  const allSelected = allTopics.length > 0 && selected.size === allTopics.length;

  // Display label for the header sub-text
  const displaySubtitle = useMemo(() => {
    if (isMultiSubject) return `${perChapterSubjectIds.length} subjects`;
    if (isMultiChapter) return `${chapterIds.length} chapters`;
    return chapterNames[0] ?? chapterName ?? '';
  }, [isMultiSubject, isMultiChapter, perChapterSubjectIds, chapterIds, chapterNames, chapterName]);

  const refetchAll = () => {
    if (isMultiChapter) multiQueries.forEach(q => q.refetch());
    else singleQuery.refetch();
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <View style={styles.headerRow}>
          <Pressable onPress={() => {
            if (selectMode) { setSelectMode(false); setSelected(new Set()); }
            else router.back();
          }}>
            <View style={styles.backCircle}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {selectMode ? (selected.size === 0 ? 'Select Topics' : `${selected.size} selected`) : 'Topics'}
            </Text>
            {!selectMode && displaySubtitle ? (
              <Text style={styles.headerSub} numberOfLines={1}>{displaySubtitle}</Text>
            ) : null}
          </View>

          {selectMode && allTopics.length > 0 ? (
            <Pressable
              style={[styles.headerBtn, { backgroundColor: allSelected ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)' }]}
              onPress={selectAll}
            >
              <Ionicons name={allSelected ? 'checkmark-circle' : 'ellipse-outline'} size={15} color="#FFFFFF" />
              <Text style={styles.headerBtnText}>All</Text>
            </Pressable>
          ) : null}

          {allTopics.length > 1 && !isExplanation ? (
            <Pressable
              style={[styles.headerBtn, { backgroundColor: selectMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.18)' }]}
              onPress={toggleSelectMode}
            >
              <Ionicons name={selectMode ? 'close' : 'checkmark-done-outline'} size={15} color="#FFFFFF" />
              <Text style={styles.headerBtnText}>{selectMode ? 'Cancel' : 'Select'}</Text>
            </Pressable>
          ) : null}

          {isExplanation && (
            <View style={styles.modePill}>
              <Ionicons name="bulb-outline" size={12} color="#FFFFFF" />
              <Text style={styles.modePillText}>Study</Text>
            </View>
          )}
        </View>

        {!selectMode && displaySubtitle ? (
          <View style={styles.contextBanner}>
            <Ionicons
              name={isMultiSubject ? 'school-outline' : isMultiChapter ? 'layers-outline' : 'book-outline'}
              size={13}
              color="rgba(255,255,255,0.85)"
            />
            <Text style={styles.contextBannerText} numberOfLines={1}>{displaySubtitle}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* ── LOADING / ERROR / EMPTY ── */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.center}>
          <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.destructive} />
          </View>
          <Text style={[styles.stateText, { color: colors.text }]}>Couldn't load topics</Text>
          <Pressable onPress={refetchAll} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && allTopics.length === 0 && (
        <View style={styles.center}>
          <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="document-outline" size={34} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>No topics found</Text>
        </View>
      )}

      {/* ── TOPIC LIST ── */}
      {!isLoading && allTopics.length > 0 && (
        <FlatList
          data={filteredTopics}
          keyExtractor={(item) => `${item._subjectId}-${item._chapterId}-${getId(item)}`}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + (selectMode && selected.size > 0 ? 120 : 20) },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={15} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={`Search ${allTopics.length} topic${allTopics.length !== 1 ? 's' : ''}…`}
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={15} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
              <View style={styles.listHeaderRow}>
                <Text style={[styles.listHeaderCount, { color: colors.mutedForeground }]}>
                  {filteredTopics.length}{search.trim() ? ` of ${allTopics.length}` : ''} topic{filteredTopics.length !== 1 ? 's' : ''}
                  {isMultiSubject ? ` · ${perChapterSubjectIds.length} subjects` : isMultiChapter ? ` · ${chapterIds.length} chapters` : ''}
                </Text>
                {selectMode && (
                  <Text style={[styles.selectHint, { color: colors.mutedForeground }]}>Tap to select</Text>
                )}
              </View>
              {filteredTopics.length === 0 && search.trim() && (
                <View style={[styles.noResults, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={22} color={colors.mutedForeground} />
                  <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>No topics match "{search}"</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item, index }) => {
            const id = getId(item);
            const isSelected = selected.has(id);
            const showTag = isMultiChapter || isMultiSubject;
            return (
              <Pressable
                style={[
                  styles.topicCard,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}
                onPress={() => handleTopicPress(item)}
                onLongPress={() => {
                  if (!selectMode && !isExplanation) {
                    setSelectMode(true);
                    setSelected(new Set([id]));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                }}
              >
                {selectMode ? (
                  <View style={[
                    styles.checkbox,
                    { backgroundColor: isSelected ? colors.primary : 'transparent', borderColor: isSelected ? colors.primary : colors.border },
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                  </View>
                ) : (
                  <View style={[styles.topicNum, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.topicNumText, { color: colors.mutedForeground }]}>{index + 1}</Text>
                  </View>
                )}

                <View style={styles.topicBody}>
                  <Text style={[styles.topicName, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {showTag && (
                    <Text style={[styles.topicTag, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {isMultiSubject ? `${item._subjectName} · ${item._chapterName}` : item._chapterName}
                    </Text>
                  )}
                </View>

                {!selectMode && (
                  <View style={[styles.topicAction, { backgroundColor: isExplanation ? colors.accentLight : colors.secondary }]}>
                    <Ionicons
                      name={isExplanation ? 'bulb-outline' : 'chevron-forward'}
                      size={15}
                      color={isExplanation ? colors.accent : colors.mutedForeground}
                    />
                  </View>
                )}
              </Pressable>
            );
          }}
          scrollEnabled
        />
      )}

      {/* ── BOTTOM ACTION BAR ── */}
      {selectMode && (
        <View style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
          },
        ]}>
          <View style={styles.bottomCount}>
            {selected.size > 0 ? (
              <View style={[styles.countBubble, { backgroundColor: colors.primary }]}>
                <Text style={styles.countBubbleText}>{selected.size}</Text>
              </View>
            ) : (
              <View style={[styles.countBubble, { backgroundColor: '#6B7280' }]}>
                <Ionicons name="layers-outline" size={13} color="#FFF" />
              </View>
            )}
            <Text style={[styles.bottomCountLabel, { color: colors.mutedForeground }]}>
              {selected.size === 0
                ? 'Whole chapter'
                : selected.size === allTopics.length
                ? 'All topics'
                : selected.size === 1
                ? '1 topic'
                : `${selected.size} topics`}
            </Text>
          </View>

          <View style={styles.bottomActions}>
            {selected.size > 0 && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: '#10B981' + '18', borderColor: '#10B981' + '40' }]}
                onPress={() => handleAction('explanation')}
              >
                <Ionicons name="bulb-outline" size={16} color="#10B981" />
                <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Study</Text>
              </Pressable>
            )}

            {selected.size > 0 && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: '#6366F1' + '18', borderColor: '#6366F1' + '40' }]}
                onPress={() => handleAction('chat')}
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#6366F1" />
                <Text style={[styles.actionBtnText, { color: '#6366F1' }]}>AI Chat</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.actionBtn, {
                backgroundColor: '#F59E0B' + '18',
                borderColor: '#F59E0B' + '40',
                flex: selected.size === 0 ? 1 : undefined,
              }]}
              onPress={() => handleAction('test')}
            >
              <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
              <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>
                {selected.size === 0 ? 'Test Full Chapter' : 'Test'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    overflow: 'hidden', gap: 10,
  },
  blob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40,
  },
  blob2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backCircle: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  headerBtnText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  modePillText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, alignSelf: 'flex-start',
  },
  contextBannerText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)', flex: 1 },
  list: { padding: 16, gap: 8 },
  listHeader: { gap: 8, marginBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', padding: 0 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listHeaderCount: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600', letterSpacing: 0.3 },
  selectHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  noResults: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: 'center', gap: 8 },
  noResultsText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stateText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
  topicCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 18, borderWidth: 1, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 5, elevation: 1,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 7,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  topicNum: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  topicNumText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  topicBody: { flex: 1 },
  topicName: { fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium', lineHeight: 20 },
  topicTag: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  topicAction: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bottomBar: {
    borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10,
  },
  bottomCount: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countBubbleText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },
  bottomCountLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  bottomActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 11, borderRadius: 13, borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
