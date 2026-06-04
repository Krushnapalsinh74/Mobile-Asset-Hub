import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Topic } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQueries, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TopicsScreen() {
  const { subjectId, subjectName, chapterId, chapterName, mode, multiSelect } =
    useLocalSearchParams<{
      subjectId: string;
      subjectName: string;
      chapterId: string;
      chapterName: string;
      mode?: string;
      multiSelect?: string;
    }>();
  const { boardId, standardId, setSubjectTotal } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Support comma-separated chapter IDs (multi-chapter select from chapters screen)
  const chapterIds = useMemo(() => (chapterId ?? '').split(',').filter(Boolean), [chapterId]);
  const chapterNames = useMemo(() => (chapterName ?? '').split('|||').filter(Boolean), [chapterName]);
  const isMultiChapter = chapterIds.length > 1;

  // Single chapter fetch
  const singleQuery = useQuery({
    queryKey: ['topics', boardId, standardId, subjectId, chapterIds[0]],
    queryFn: () => eduApi.getTopics(boardId!, standardId!, subjectId, chapterIds[0]!),
    enabled: !!boardId && !!standardId && !!subjectId && chapterIds.length === 1,
  });

  // Multi-chapter fetch — parallel queries
  const multiQueries = useQueries({
    queries: chapterIds.map((cid) => ({
      queryKey: ['topics', boardId, standardId, subjectId, cid],
      queryFn: () => eduApi.getTopics(boardId!, standardId!, subjectId, cid!),
      enabled: !!boardId && !!standardId && !!subjectId && chapterIds.length > 1,
    })),
  });

  const isLoading = isMultiChapter
    ? multiQueries.some(q => q.isLoading)
    : singleQuery.isLoading;

  const isError = isMultiChapter
    ? multiQueries.every(q => q.isError)
    : !!singleQuery.error;

  // Flatten topics from all chapters, tagging each with its chapter info
  const allTopics: Array<Topic & { _chapterId: string; _chapterName: string }> = useMemo(() => {
    if (isMultiChapter) {
      return multiQueries.flatMap((q, i) =>
        (q.data ?? []).map(t => ({
          ...t,
          _chapterId: chapterIds[i]!,
          _chapterName: chapterNames[i] ?? chapterIds[i]!,
        }))
      );
    }
    return (singleQuery.data ?? []).map(t => ({
      ...t,
      _chapterId: chapterIds[0]!,
      _chapterName: chapterNames[0] ?? chapterNames[0] ?? chapterName,
    }));
  }, [isMultiChapter, multiQueries, singleQuery.data, chapterIds, chapterNames]);

  useEffect(() => {
    if (allTopics.length > 0 && subjectId && !isMultiChapter) {
      setSubjectTotal(subjectId, allTopics.length);
    }
  }, [allTopics.length, subjectId]);

  const isExplanation = mode === 'explanation';

  function toggleSelectMode() {
    Haptics.selectionAsync();
    if (selectMode) {
      setSelected(new Set());
      setSelectMode(false);
    } else {
      setSelectMode(true);
    }
  }

  function toggleItem(id: string) {
    Haptics.selectionAsync();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selected.size === allTopics.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allTopics.map(t => getId(t))));
    }
  }

  function handleTopicPress(topic: Topic & { _chapterId: string; _chapterName: string }) {
    if (selectMode) {
      toggleItem(getId(topic));
      return;
    }
    Haptics.selectionAsync();
    if (isExplanation) {
      router.push({
        pathname: '/explanation' as any,
        params: {
          subjectId, subjectName,
          chapterId: topic._chapterId,
          chapterName: topic._chapterName,
          topicId: getId(topic),
          topicName: topic.name,
        },
      });
    } else {
      router.push({
        pathname: '/topic-dashboard' as any,
        params: {
          subjectId, subjectName,
          chapterId: topic._chapterId,
          chapterName: topic._chapterName,
          topicId: getId(topic),
          topicName: topic.name,
        },
      });
    }
  }

  function getSelectedTopics() {
    return allTopics.filter(t => selected.has(getId(t)));
  }

  function handleAction(action: 'test' | 'chat' | 'explanation') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const topics = getSelectedTopics();
    if (topics.length === 0) return;

    if (action === 'test') {
      // Use first selected topic's chapter for test generation
      const first = topics[0]!;
      router.push({
        pathname: '/test-config' as any,
        params: {
          subjectId, subjectName,
          chapterId: first._chapterId,
          chapterName: first._chapterName,
          topicIds: topics.map(t => getId(t)).join(','),
          topicNames: topics.map(t => t.name).join('|||'),
        },
      });
    } else if (action === 'chat') {
      const topicNamesStr = topics.map(t => t.name).join(', ');
      const first = topics[0]!;
      router.push({
        pathname: '/chat' as any,
        params: {
          subjectId, subjectName,
          chapterId: first._chapterId,
          chapterName: first._chapterName,
          topicId: getId(first),
          topicName: topicNamesStr,
        },
      });
    } else {
      // explanation — open first selected topic
      const first = topics[0]!;
      router.push({
        pathname: '/explanation' as any,
        params: {
          subjectId, subjectName,
          chapterId: first._chapterId,
          chapterName: first._chapterName,
          topicId: getId(first),
          topicName: first.name,
        },
      });
    }
  }

  const allSelected = allTopics.length > 0 && selected.size === allTopics.length;
  const displayChapterName = isMultiChapter
    ? `${chapterIds.length} chapters`
    : (chapterNames[0] ?? chapterName);

  const refetchAll = () => {
    if (isMultiChapter) multiQueries.forEach(q => q.refetch());
    else singleQuery.refetch();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 14,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => {
          if (selectMode) { setSelectMode(false); setSelected(new Set()); }
          else router.back();
        }}>
          <View style={[styles.backCircle, { backgroundColor: colors.secondary }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </View>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {selectMode
              ? selected.size === 0 ? 'Select Topics' : `${selected.size} selected`
              : 'Topics'}
          </Text>
          {!selectMode && displayChapterName ? (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {displayChapterName}
            </Text>
          ) : null}
        </View>

        {/* Select-All when in select mode */}
        {selectMode && allTopics.length > 0 ? (
          <Pressable
            style={[styles.selectAllBtn, { backgroundColor: allSelected ? colors.primaryLight : colors.secondary }]}
            onPress={selectAll}
          >
            <Ionicons
              name={allSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={allSelected ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.selectAllText, { color: allSelected ? colors.primary : colors.mutedForeground }]}>All</Text>
          </Pressable>
        ) : null}

        {/* Select mode toggle */}
        {allTopics.length > 1 && !isExplanation ? (
          <Pressable
            style={[styles.selectToggle, { backgroundColor: selectMode ? colors.primary + '18' : colors.secondary, borderColor: selectMode ? colors.primary : colors.border }]}
            onPress={toggleSelectMode}
          >
            <Ionicons name={selectMode ? 'close' : 'checkmark-done-outline'} size={15} color={selectMode ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.selectToggleText, { color: selectMode ? colors.primary : colors.mutedForeground }]}>
              {selectMode ? 'Cancel' : 'Select'}
            </Text>
          </Pressable>
        ) : null}

        {isExplanation && (
          <View style={[styles.modePill, { backgroundColor: colors.accent }]}>
            <Text style={styles.modePillText}>Explanation</Text>
          </View>
        )}
      </View>

      {/* ── CHAPTER BANNER ── */}
      {!selectMode && displayChapterName ? (
        <View style={[styles.chapterBanner, { backgroundColor: colors.primaryLight, borderBottomColor: colors.border }]}>
          <View style={[styles.bannerIconWrap, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name={isMultiChapter ? 'layers-outline' : 'book-outline'} size={14} color={colors.primary} />
          </View>
          <Text style={[styles.chapterText, { color: colors.primary }]} numberOfLines={1}>
            {displayChapterName}
          </Text>
        </View>
      ) : null}

      {/* ── LOADING / ERROR ── */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.destructive} />
          </View>
          <Text style={[styles.errorText, { color: colors.text }]}>Couldn't load topics</Text>
          <Pressable onPress={refetchAll} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && allTopics.length === 0 && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="document-outline" size={34} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            No topics found
          </Text>
        </View>
      )}

      {!isLoading && allTopics.length > 0 && (
        <FlatList
          data={allTopics}
          keyExtractor={(item) => `${item._chapterId}-${getId(item)}`}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + (selectMode && selected.size > 0 ? 120 : 20) },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeaderRow}>
              <Text style={[styles.listHeader, { color: colors.mutedForeground }]}>
                {allTopics.length} topic{allTopics.length !== 1 ? 's' : ''}
                {isMultiChapter ? ` across ${chapterIds.length} chapters` : ''}
              </Text>
              {selectMode && (
                <Text style={[styles.selectHint, { color: colors.mutedForeground }]}>
                  Tap to select
                </Text>
              )}
            </View>
          }
          renderItem={({ item, index }) => {
            const id = getId(item);
            const isSelected = selected.has(id);
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
                    {
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                  </View>
                ) : (
                  <View style={[styles.topicNum, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.topicNumText, { color: colors.mutedForeground }]}>
                      {index + 1}
                    </Text>
                  </View>
                )}

                <View style={styles.topicBody}>
                  <Text style={[styles.topicName, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {isMultiChapter && (
                    <Text style={[styles.topicChapterTag, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item._chapterName}
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
          scrollEnabled={true}
        />
      )}

      {/* ── BOTTOM ACTION BAR ── */}
      {selectMode && selected.size > 0 && (
        <View style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
          },
        ]}>
          {/* Count label */}
          <View style={styles.bottomCount}>
            <View style={[styles.countBubble, { backgroundColor: colors.primary }]}>
              <Text style={styles.countBubbleText}>{selected.size}</Text>
            </View>
            <Text style={[styles.bottomCountLabel, { color: colors.mutedForeground }]}>
              {selected.size === allTopics.length ? 'All' : selected.size === 1 ? '1 topic' : `${selected.size} topics`}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.bottomActions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#10B981' + '18', borderColor: '#10B981' + '40' }]}
              onPress={() => handleAction('explanation')}
            >
              <Ionicons name="bulb-outline" size={16} color="#10B981" />
              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Study</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#6366F1' + '18', borderColor: '#6366F1' + '40' }]}
              onPress={() => handleAction('chat')}
            >
              <Ionicons name="chatbubbles-outline" size={16} color="#6366F1" />
              <Text style={[styles.actionBtnText, { color: '#6366F1' }]}>AI Tutor</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#F59E0B' + '18', borderColor: '#F59E0B' + '40' }]}
              onPress={() => handleAction('test')}
            >
              <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
              <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Test</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  modePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  modePillText: { fontSize: 11, color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontWeight: '700' },
  selectAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  selectAllText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  selectToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  selectToggleText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  chapterBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1,
  },
  bannerIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chapterText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', flex: 1 },
  list: { padding: 16, gap: 8 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listHeader: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600', letterSpacing: 0.3 },
  selectHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
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
  topicChapterTag: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  topicAction: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hintText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
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
