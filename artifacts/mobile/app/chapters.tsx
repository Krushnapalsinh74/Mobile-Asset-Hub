import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Chapter } from '@/services/api';
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

// Module-level cache so selections survive navigation (back button)
const _selectionCache: Record<string, { selectMode: boolean; selected: string[] }> = {};

type TaggedChapter = Chapter & { _subjectId: string; _subjectName: string };

export default function ChaptersScreen() {
  const { subjectId, subjectName, mode } = useLocalSearchParams<{
    subjectId: string;
    subjectName: string;
    mode?: string;
  }>();
  const { boardId, standardId } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Support comma-separated subject IDs (from subjects multi-select)
  const subjectIds = useMemo(() => (subjectId ?? '').split(',').filter(Boolean), [subjectId]);
  const subjectNames = useMemo(() => (subjectName ?? '').split('|||').filter(Boolean), [subjectName]);
  const isMultiSubject = subjectIds.length > 1;
  const cacheKey = subjectIds.join(',');

  // Restore selections from cache when navigating back
  const [selectMode, setSelectMode] = useState(() => _selectionCache[cacheKey]?.selectMode ?? false);
  const [selected, setSelected] = useState<Set<string>>(() =>
    new Set(_selectionCache[cacheKey]?.selected ?? [])
  );

  // Persist selections to cache whenever they change
  useEffect(() => {
    _selectionCache[cacheKey] = { selectMode, selected: [...selected] };
  }, [cacheKey, selectMode, selected]);

  // Single-subject fetch
  const singleQuery = useQuery({
    queryKey: ['chapters', boardId, standardId, subjectIds[0]],
    queryFn: () => eduApi.getChapters(boardId!, standardId!, subjectIds[0]!),
    enabled: !!boardId && !!standardId && subjectIds.length === 1,
  });

  // Multi-subject parallel fetch
  const multiQueries = useQueries({
    queries: subjectIds.map((sid) => ({
      queryKey: ['chapters', boardId, standardId, sid],
      queryFn: () => eduApi.getChapters(boardId!, standardId!, sid),
      enabled: !!boardId && !!standardId && subjectIds.length > 1,
    })),
  });

  const isLoading = isMultiSubject
    ? multiQueries.some(q => q.isLoading)
    : singleQuery.isLoading;

  const isError = isMultiSubject
    ? multiQueries.every(q => q.isError)
    : !!singleQuery.error;

  // Flatten and tag all chapters with their subject info
  const allChapters: TaggedChapter[] = useMemo(() => {
    if (isMultiSubject) {
      return multiQueries.flatMap((q, i) =>
        (q.data ?? []).map(ch => ({
          ...ch,
          _subjectId: subjectIds[i]!,
          _subjectName: subjectNames[i] ?? subjectIds[i]!,
        }))
      );
    }
    return (singleQuery.data ?? []).map(ch => ({
      ...ch,
      _subjectId: subjectIds[0]!,
      _subjectName: subjectNames[0] ?? subjectName,
    }));
  }, [isMultiSubject, multiQueries, singleQuery.data, subjectIds, subjectNames]);

  // Group chapters by subject (stable memo, used for auto-select)
  const chaptersBySubject = useMemo(() => {
    const map: Record<string, TaggedChapter[]> = {};
    for (const ch of allChapters) {
      if (!map[ch._subjectId]) map[ch._subjectId] = [];
      map[ch._subjectId]!.push(ch);
    }
    return map;
  }, [allChapters]);

  function toggleSelectMode() {
    Haptics.selectionAsync();
    if (selectMode) {
      setSelected(new Set());
      setSelectMode(false);
      delete _selectionCache[cacheKey];
    } else {
      setSelectMode(true);
    }
  }

  function toggleItem(id: string) {
    Haptics.selectionAsync();

    if (!isMultiSubject) {
      // Single subject: plain toggle
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      return;
    }

    // Multi-subject: auto-select same-position chapter across ALL subjects
    const chapter = allChapters.find(c => getId(c) === id);
    if (!chapter) return;

    const subjectChapters = chaptersBySubject[chapter._subjectId] ?? [];
    const chapterIndex = subjectChapters.findIndex(c => getId(c) === id);

    // Collect same-index chapter from every subject
    const toToggle = new Set<string>([id]);
    for (const [sid, chapters] of Object.entries(chaptersBySubject)) {
      if (sid === chapter._subjectId) continue;
      const sameIndex = chapters[chapterIndex];
      if (sameIndex) toToggle.add(getId(sameIndex));
    }

    setSelected(prev => {
      const next = new Set(prev);
      const isSelected = next.has(id);
      for (const cId of toToggle) {
        if (isSelected) next.delete(cId); else next.add(cId);
      }
      return next;
    });
  }

  function selectAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selected.size === allChapters.length) setSelected(new Set());
    else setSelected(new Set(allChapters.map(c => getId(c))));
  }

  function handleChapterPress(chapter: TaggedChapter) {
    if (selectMode) { toggleItem(getId(chapter)); return; }
    Haptics.selectionAsync();
    router.push({
      pathname: '/topics' as any,
      params: {
        subjectId: chapter._subjectId,
        subjectName: chapter._subjectName,
        chapterId: getId(chapter),
        chapterName: chapter.name,
        mode: mode ?? '',
      },
    });
  }

  function handleGenerateTest() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sel = allChapters.filter(c => selected.has(getId(c)));
    if (sel.length === 0) return;
    router.push({
      pathname: '/test-config' as any,
      params: {
        subjectId: sel.map(c => c._subjectId).join(','),
        subjectName: sel.map(c => c._subjectName).join('|||'),
        chapterId: sel.map(c => getId(c)).join(','),
        chapterName: sel.map(c => c.name).join('|||'),
      },
    });
  }

  function handleProceed() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sel = allChapters.filter(c => selected.has(getId(c)));
    if (sel.length === 0) return;

    if (sel.length === 1) {
      const ch = sel[0]!;
      router.push({
        pathname: '/topics' as any,
        params: {
          subjectId: ch._subjectId,
          subjectName: ch._subjectName,
          chapterId: getId(ch),
          chapterName: ch.name,
          mode: mode ?? '',
        },
      });
    } else {
      router.push({
        pathname: '/topics' as any,
        params: {
          subjectIds: sel.map(c => c._subjectId).join(','),
          subjectNames: sel.map(c => c._subjectName).join('|||'),
          chapterId: sel.map(c => getId(c)).join(','),
          chapterName: sel.map(c => c.name).join('|||'),
          mode: mode ?? '',
          multiSelect: 'true',
        },
      });
    }
  }

  const [search, setSearch] = useState('');
  const filteredChapters = allChapters.filter(c => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()));

  const isExplanation = mode === 'explanation';
  const allSelected = allChapters.length > 0 && selected.size === allChapters.length;
  const displayTitle = isMultiSubject
    ? `${subjectIds.length} Subjects`
    : (subjectNames[0] ?? subjectName ?? '');

  const refetchAll = () => {
    if (isMultiSubject) multiQueries.forEach(q => q.refetch());
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
              {selectMode ? (selected.size === 0 ? 'Select Chapters' : `${selected.size} selected`) : 'Chapters'}
            </Text>
            {displayTitle && !selectMode ? (
              <Text style={styles.headerSub} numberOfLines={1}>{displayTitle}</Text>
            ) : null}
          </View>

          {selectMode && allChapters.length > 0 ? (
            <Pressable
              style={[styles.headerBtn, { backgroundColor: allSelected ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)' }]}
              onPress={selectAll}
            >
              <Ionicons name={allSelected ? 'checkmark-circle' : 'ellipse-outline'} size={15} color="#FFFFFF" />
              <Text style={styles.headerBtnText}>All</Text>
            </Pressable>
          ) : null}

          {allChapters.length > 1 ? (
            <Pressable
              style={[styles.headerBtn, { backgroundColor: selectMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.18)' }]}
              onPress={toggleSelectMode}
            >
              <Ionicons name={selectMode ? 'close' : 'checkmark-done-outline'} size={15} color="#FFFFFF" />
              <Text style={styles.headerBtnText}>{selectMode ? 'Cancel' : 'Select'}</Text>
            </Pressable>
          ) : null}
        </View>

        {isMultiSubject && !selectMode && (
          <View style={styles.subjectBanner}>
            <Ionicons name="layers-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.subjectBannerText} numberOfLines={1}>
              {subjectIds.length} subjects combined
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* ── LOADING / ERROR ── */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>Loading chapters…</Text>
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.destructive} />
          </View>
          <Text style={[styles.errorText, { color: colors.text }]}>Couldn't load chapters</Text>
          <Pressable onPress={refetchAll} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && allChapters.length === 0 && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="layers-outline" size={34} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>No chapters found</Text>
        </View>
      )}

      {/* ── CHAPTER LIST ── */}
      {!isLoading && allChapters.length > 0 && (
        <FlatList
          data={filteredChapters}
          keyExtractor={(item) => `${item._subjectId}-${getId(item)}`}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + (selectMode && selected.size > 0 ? 100 : 20) },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={15} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={`Search ${allChapters.length} chapter${allChapters.length !== 1 ? 's' : ''}…`}
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
                  {filteredChapters.length}{search.trim() ? ` of ${allChapters.length}` : ''} chapter{filteredChapters.length !== 1 ? 's' : ''}
                  {isMultiSubject ? ` · ${subjectIds.length} subjects` : ''}
                </Text>
                {selectMode && (
                  <Text style={[styles.selectHint, { color: colors.mutedForeground }]}>Tap to select</Text>
                )}
              </View>
              {filteredChapters.length === 0 && search.trim() && (
                <View style={[styles.noResults, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={22} color={colors.mutedForeground} />
                  <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>No chapters match "{search}"</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item, index }) => {
            const id = getId(item);
            const isSelected = selected.has(id);
            return (
              <Pressable
                style={[
                  styles.chapterCard,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}
                onPress={() => handleChapterPress(item)}
                onLongPress={() => {
                  if (!selectMode) {
                    setSelectMode(true);
                    setSelected(new Set([id]));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                }}
              >
                {selectMode ? (
                  <View style={[styles.checkbox, { backgroundColor: isSelected ? colors.primary : 'transparent', borderColor: isSelected ? colors.primary : colors.border }]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                  </View>
                ) : (
                  <View style={[styles.numBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.numText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                )}

                <View style={styles.chapterInfo}>
                  <Text style={[styles.chapterName, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {isMultiSubject && (
                    <Text style={[styles.chapterSubjectTag, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item._subjectName}
                    </Text>
                  )}
                  {!isMultiSubject && (
                    <Text style={[styles.chapterHint, { color: colors.mutedForeground }]}>
                      {selectMode ? (isSelected ? 'Selected' : 'Tap to select') : isExplanation ? 'Tap to view explanation' : 'Tap to explore topics'}
                    </Text>
                  )}
                </View>

                {!selectMode && (
                  <View style={[styles.chevronWrap, { backgroundColor: colors.secondary }]}>
                    <Ionicons
                      name={isExplanation ? 'bulb-outline' : 'chevron-forward'}
                      size={16}
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
      {selectMode && selected.size > 0 && (
        <View style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
          },
        ]}>
          <View style={styles.bottomBarLeft}>
            <View style={[styles.countBubble, { backgroundColor: colors.primary }]}>
              <Text style={styles.countBubbleText}>{selected.size}</Text>
            </View>
            <Text style={[styles.bottomBarLabel, { color: colors.text }]}>
              {selected.size === allChapters.length ? 'All chapters' : selected.size === 1 ? 'chapter selected' : 'chapters selected'}
            </Text>
          </View>
          <View style={styles.bottomBtns}>
            <Pressable style={[styles.proceedBtn, { backgroundColor: '#F59E0B' }]} onPress={handleGenerateTest}>
              <Ionicons name="trophy-outline" size={15} color="#FFF" />
              <Text style={styles.proceedBtnText}>Test</Text>
            </Pressable>
            <Pressable style={[styles.proceedBtn, { backgroundColor: colors.primary }]} onPress={handleProceed}>
              <Text style={styles.proceedBtnText}>Topics</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFF" />
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
  subjectBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, alignSelf: 'flex-start',
  },
  subjectBannerText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
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
  emptyIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  chapterCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 20, borderWidth: 1, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 7,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  numBadge: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  chapterInfo: { flex: 1 },
  chapterName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 3, lineHeight: 20 },
  chapterSubjectTag: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  chapterHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  chevronWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hintText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 12,
  },
  bottomBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countBubbleText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },
  bottomBarLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  bottomBtns: { flexDirection: 'row', gap: 8 },
  proceedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
  },
  proceedBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
