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

const NUMBER_COLORS = [
  { bg: '#F6DFD2', text: '#C85C3E' }, // Purple
  { bg: '#FFF7ED', text: '#F97316' }, // Orange
  { bg: '#ECFDF5', text: '#4F936C' }, // Green
  { bg: '#FEF2F2', text: '#EF4444' }, // Red
  { bg: '#EFF6FF', text: '#D97855' }, // Blue
];

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
    subjectIds?: string;
    subjectNames?: string;
    chapterId: string;
    chapterName: string;
    mode?: string;
  }>();
  const { boardId, standardId, standardName, setSubjectTotal } = useApp();
  const insets = useSafeAreaInsets();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const chapterIds = useMemo(() => (chapterId ?? '').split(',').filter(Boolean), [chapterId]);
  const chapterNames = useMemo(() => (chapterName ?? '').split('|||').filter(Boolean), [chapterName]);

  const perChapterSubjectIds = useMemo(() => {
    if (rawSubjectIds) return rawSubjectIds.split(',').filter(Boolean);
    return chapterIds.map(() => subjectId ?? '');
  }, [rawSubjectIds, subjectId, chapterIds]);

  const perChapterSubjectNames = useMemo(() => {
    if (rawSubjectNames) return rawSubjectNames.split('|||').filter(Boolean);
    return chapterIds.map(() => subjectName ?? '');
  }, [rawSubjectNames, subjectName, chapterIds]);

  const isMultiChapter = chapterIds.length > 1;

  const singleQuery = useQuery({
    queryKey: ['topics', boardId, standardId, perChapterSubjectIds[0], chapterIds[0]],
    queryFn: () => eduApi.getTopics(boardId!, standardId!, perChapterSubjectIds[0]!, chapterIds[0]!),
    enabled: !!boardId && !!standardId && !!perChapterSubjectIds[0] && chapterIds.length === 1,
  });

  const multiQueries = useQueries({
    queries: chapterIds.map((cid, i) => ({
      queryKey: ['topics', boardId, standardId, perChapterSubjectIds[i], cid],
      queryFn: () => eduApi.getTopics(boardId!, standardId!, perChapterSubjectIds[i]!, cid),
      enabled: !!boardId && !!standardId && !!perChapterSubjectIds[i] && chapterIds.length > 1,
    })),
  });

  const isLoading = isMultiChapter ? multiQueries.some(q => q.isLoading) : singleQuery.isLoading;
  const isError = isMultiChapter ? multiQueries.every(q => q.isError) : !!singleQuery.error;

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

  function toggleTopic(key: string) {
    Haptics.selectionAsync();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleTopicPress(topic: TaggedTopic) {
    if (selectMode) { toggleTopic(getKey(topic)); return; }
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

  const [search, setSearch] = useState('');
  const filteredTopics = allTopics.filter(t => !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()));

  const displaySubtitle = useMemo(() => {
    if (isMultiSubject) return `${perChapterSubjectIds.length} subjects`;
    if (isMultiChapter) return `${chapterIds.length} chapters`;
    return chapterNames[0] ?? chapterName ?? '';
  }, [isMultiSubject, isMultiChapter, perChapterSubjectIds, chapterIds, chapterNames, chapterName]);

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#6B382C', '#8E422E', '#C85C3E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/chapters'); }} style={styles.backCircle}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Topics</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{displaySubtitle} • {standardName || 'Class 11'}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.selectToggleBtn, selectMode && styles.selectToggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (selectMode) {
                  setSelected(new Set());
                  setSelectMode(false);
                } else {
                  setSelectMode(true);
                }
              }}
            >
              <Ionicons
                name={selectMode ? "close" : "checkbox-outline"}
                size={14}
                color={selectMode ? "#C85C3E" : "#FFF"}
              />
              <Text style={[styles.selectToggleBtnText, selectMode && styles.selectToggleBtnTextActive]}>
                {selectMode ? "Done" : "Select"}
              </Text>
            </Pressable>
            {isExplanation && (
              <Pressable style={styles.syllabusBtn}>
                <Ionicons name="bulb-outline" size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.syllabusBtnText}>Study</Text>
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ── MASTER BANNER ── */}
      {!isMultiChapter && (
        <View style={styles.bannerContainer}>
          <LinearGradient colors={['#8E422E', '#C85C3E']} style={styles.masterBanner}>
            <View style={styles.masterBannerTextWrap}>
              <Text style={styles.masterBannerTitle}>Master {displaySubtitle}</Text>
              <Text style={styles.masterBannerSub}>
                Explore topics, learn concepts, solve questions and track your progress.
              </Text>
            </View>
            <View style={styles.masterBannerIconWrap}>
              <Ionicons name="planet" size={60} color="#A5B4FC" style={{ opacity: 0.8 }} />
            </View>
          </LinearGradient>
        </View>
      )}

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#A49186" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search topics..."
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

      {/* ── LIST ── */}
      <View style={styles.listHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.listTitle}>All Topics ({allTopics.length})</Text>
          {selectMode && (
            <View style={styles.selectModeBadge}>
              <Text style={styles.selectModeBadgeText}>Multi-select active</Text>
            </View>
          )}
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
          data={filteredTopics}
          keyExtractor={(item) => getKey(item)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + (selected.size > 0 ? 110 : 80),
            gap: 12,
            maxWidth: 1200,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const numColor = NUMBER_COLORS[index % NUMBER_COLORS.length];
            const isSelected = selected.has(getKey(item));
            return (
              <Pressable
                style={({ hovered }: any) => [
                  styles.topicCard,
                  isSelected && styles.topicCardSelected,
                  hovered && styles.topicCardHovered,
                ]}
                onPress={(e: any) => {
                  if (selectMode || e?.ctrlKey || e?.metaKey) {
                    setSelectMode(true);
                    toggleTopic(getKey(item));
                    return;
                  }
                  handleTopicPress(item);
                }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setSelectMode(true);
                  toggleTopic(getKey(item));
                }}
              >
                {/* CHECKBOX */}
                {(selectMode || isSelected) && (
                  <Pressable
                    style={[styles.checkboxWrap, isSelected && styles.checkboxWrapSelected]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectMode(true);
                      toggleTopic(getKey(item));
                    }}
                  >
                    {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                  </Pressable>
                )}

                <View style={[styles.numBadge, { backgroundColor: numColor.bg }]}>
                  <Text style={[styles.numText, { color: numColor.text }]}>{index + 1}</Text>
                </View>
                <View style={styles.topicInfo}>
                  <Text style={[styles.topicName, isSelected && styles.topicNameSelected]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {(isMultiChapter || isMultiSubject) && (
                    <Text style={styles.topicTag} numberOfLines={1}>
                      {isMultiSubject ? `${item._subjectName} • ${item._chapterName}` : item._chapterName}
                    </Text>
                  )}
                </View>
                <View style={styles.progressWrap}>
                  <View style={styles.progressBarBg}>
                    <View style={styles.progressBarFill} />
                  </View>
                  <Text style={styles.progressText}>0%</Text>
                  <Ionicons name={isExplanation ? 'bulb-outline' : 'chevron-forward'} size={16} color="#A49186" style={{ marginLeft: 8 }} />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* ── FLOATING MULTI-SELECT DOCK ── */}
      {selected.size > 0 && (
        <View style={[styles.bottomDock, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
          <View style={styles.dockInner}>
            <View style={styles.dockLeft}>
              <View style={styles.dockCountBadge}>
                <Text style={styles.dockCountText}>{selected.size}</Text>
              </View>
              <Text style={styles.dockTitle}>
                {selected.size === 1 ? '1 Topic' : `${selected.size} Topics`} selected
              </Text>
              <Pressable
                style={styles.dockClearBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelected(new Set());
                }}
              >
                <Text style={styles.dockClearText}>Clear</Text>
              </Pressable>
            </View>

            <View style={styles.dockActions}>
              <Pressable
                style={styles.dockSecondaryBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (selected.size === filteredTopics.length) {
                    setSelected(new Set());
                  } else {
                    setSelected(new Set(filteredTopics.map(t => getKey(t))));
                  }
                }}
              >
                <Text style={styles.dockSecondaryText}>
                  {selected.size === filteredTopics.length ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.dockPrimaryBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const selectedTopicsList = allTopics.filter(t => selected.has(getKey(t)));
                  const chapterIdSet = Array.from(new Set(selectedTopicsList.map(t => t._chapterId)));
                  const chapterNameSet = chapterIdSet.map(cid => selectedTopicsList.find(t => t._chapterId === cid)?._chapterName ?? cid);
                  const subjectIdSet = chapterIdSet.map(cid => selectedTopicsList.find(t => t._chapterId === cid)?._subjectId ?? '');
                  const subjectNameSet = chapterIdSet.map(cid => selectedTopicsList.find(t => t._chapterId === cid)?._subjectName ?? '');
                  const topicNamesByChapter = chapterIdSet.map(cid => 
                    selectedTopicsList.filter(t => t._chapterId === cid).map(t => t.name).join('|||')
                  ).join('::');
                  router.push({
                    pathname: '/test-config',
                    params: {
                      subjectId: subjectIdSet.join(','),
                      subjectName: subjectNameSet.join('|||'),
                      chapterId: chapterIdSet.join(','),
                      chapterName: chapterNameSet.join('|||'),
                      topicNamesByChapter,
                    },
                  });
                }}
              >
                <Ionicons name="trophy-outline" size={14} color="#FFF" />
                <Text style={styles.dockPrimaryText}>Practice Quiz</Text>
              </Pressable>

              <Pressable
                style={[styles.dockPrimaryBtn, { backgroundColor: '#C85C3E' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const firstSelected = allTopics.find(t => selected.has(getKey(t)));
                  if (firstSelected) {
                    router.push({
                      pathname: '/flashcard',
                      params: {
                        subjectId: firstSelected._subjectId,
                        subjectName: firstSelected._subjectName,
                        chapterId: firstSelected._chapterId,
                        chapterName: firstSelected._chapterName,
                        topicId: getId(firstSelected),
                        topicName: firstSelected.name,
                      },
                    });
                  }
                }}
              >
                <Ionicons name="albums-outline" size={14} color="#FFF" />
                <Text style={styles.dockPrimaryText}>Flashcards</Text>
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

  header: {
    paddingHorizontal: 20, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backCircle: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  syllabusBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  syllabusBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  bannerContainer: { paddingHorizontal: 20, marginTop: -15 },
  masterBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 16,
    shadowColor: '#8E422E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  masterBannerTextWrap: { flex: 1, paddingRight: 16 },
  masterBannerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  masterBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
  masterBannerIconWrap: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },

  searchWrap: { paddingHorizontal: 20, marginTop: 16, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: '#3D2D27' },

  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  listTitle: { fontSize: 15, fontWeight: '800', color: '#3D2D27' },
  boardSelect: { flexDirection: 'row', alignItems: 'center' },
  boardSelectText: { fontSize: 12, fontWeight: '700', color: '#C85C3E' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topicCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
  },
  numBadge: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  numText: { fontSize: 16, fontWeight: '800' },
  topicInfo: { flex: 1 },
  topicName: { fontSize: 13, fontWeight: '700', color: '#3D2D27', marginBottom: 4, lineHeight: 18 },
  topicTag: { fontSize: 11, color: '#76645B' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBarBg: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
  progressBarFill: { width: 0, height: 4, borderRadius: 2, backgroundColor: '#C85C3E' },
  progressText: { fontSize: 11, fontWeight: '600', color: '#76645B' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectToggleBtn: {
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
  selectToggleBtnActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  selectToggleBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  selectToggleBtnTextActive: {
    color: '#C85C3E',
  },

  selectModeBadge: {
    backgroundColor: '#F6DFD2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  selectModeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C85C3E',
  },

  topicCardSelected: {
    borderColor: '#C85C3E',
    borderWidth: 2,
    backgroundColor: '#FFFBF7',
  },
  topicCardHovered: {
    ...(Platform.OS === 'web'
      ? { transform: [{ translateY: -2 }] as any, boxShadow: '0 6px 16px rgba(61, 45, 39, 0.08)' as any, cursor: 'pointer' as any }
      : {}),
  },
  topicNameSelected: {
    color: '#A84932',
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  checkboxWrapSelected: {
    borderColor: '#C85C3E',
    backgroundColor: '#C85C3E',
  },

  /* ── FLOATING MULTI-SELECT DOCK ── */
  bottomDock: {
    position: 'absolute',
    bottom: 0,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
