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
  { bg: '#EEF2FF', text: '#4F46E5' }, // Purple
  { bg: '#FFF7ED', text: '#F97316' }, // Orange
  { bg: '#ECFDF5', text: '#10B981' }, // Green
  { bg: '#FEF2F2', text: '#EF4444' }, // Red
  { bg: '#EFF6FF', text: '#3B82F6' }, // Blue
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
        colors={['#1E1B4B', '#3B27ED', '#5B4AF0']}
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
          {isExplanation && (
            <Pressable style={styles.syllabusBtn}>
              <Ionicons name="bulb-outline" size={14} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.syllabusBtnText}>Study</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ── MASTER BANNER ── */}
      {!isMultiChapter && (
        <View style={styles.bannerContainer}>
          <LinearGradient colors={['#3B27ED', '#5B4AF0']} style={styles.masterBanner}>
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
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search topics..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── LIST ── */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>All Topics ({allTopics.length})</Text>
        <View style={styles.boardSelect}>
          <Text style={styles.boardSelectText}>CBSE {standardName || 'Class 11'}</Text>
          <Ionicons name="chevron-down" size={12} color="#5B4AF0" style={{ marginLeft: 4 }} />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5B4AF0" />
        </View>
      ) : (
        <FlatList
          data={filteredTopics}
          keyExtractor={(item) => getKey(item)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const numColor = NUMBER_COLORS[index % NUMBER_COLORS.length];
            const isSelected = selected.has(getKey(item));
            return (
              <Pressable
                style={[styles.topicCard, isSelected && { borderColor: '#5B4AF0', borderWidth: 2, backgroundColor: '#EEF2FF' }]}
                onPress={() => handleTopicPress(item)}
                onLongPress={() => {
                  setSelectMode(true);
                  toggleTopic(getKey(item));
                }}
              >
                <View style={[styles.numBadge, { backgroundColor: numColor.bg }]}>
                  <Text style={[styles.numText, { color: numColor.text }]}>{index + 1}</Text>
                </View>
                <View style={styles.topicInfo}>
                  <Text style={styles.topicName} numberOfLines={2}>{item.name}</Text>
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
                  <Ionicons name={isExplanation ? 'bulb-outline' : 'chevron-forward'} size={16} color="#94A3B8" style={{ marginLeft: 8 }} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

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
    shadowColor: '#3B27ED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
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
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: '#0F172A' },

  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  listTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  boardSelect: { flexDirection: 'row', alignItems: 'center' },
  boardSelectText: { fontSize: 12, fontWeight: '700', color: '#5B4AF0' },

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
  topicName: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 4, lineHeight: 18 },
  topicTag: { fontSize: 11, color: '#64748B' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBarBg: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
  progressBarFill: { width: 0, height: 4, borderRadius: 2, backgroundColor: '#5B4AF0' },
  progressText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
});
