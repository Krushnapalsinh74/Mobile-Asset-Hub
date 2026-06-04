import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Chapter } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

export default function ChaptersScreen() {
  const { subjectId, subjectName, mode } = useLocalSearchParams<{
    subjectId: string;
    subjectName: string;
    mode?: string;
  }>();
  const { boardId, standardId } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const chaptersQuery = useQuery({
    queryKey: ['chapters', boardId, standardId, subjectId],
    queryFn: () => eduApi.getChapters(boardId!, standardId!, subjectId),
    enabled: !!boardId && !!standardId && !!subjectId,
  });

  const chapters = chaptersQuery.data ?? [];

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
    if (selected.size === chapters.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(chapters.map(c => getId(c))));
    }
  }

  function handleChapterPress(chapter: Chapter) {
    if (selectMode) {
      toggleItem(getId(chapter));
      return;
    }
    Haptics.selectionAsync();
    router.push({
      pathname: '/topics' as any,
      params: {
        subjectId,
        subjectName,
        chapterId: getId(chapter),
        chapterName: chapter.name,
        mode: mode ?? '',
      },
    });
  }

  function handleProceed() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const selectedChapters = chapters.filter(c => selected.has(getId(c)));
    const chapterIds = selectedChapters.map(c => getId(c)).join(',');
    const chapterNames = selectedChapters.map(c => c.name).join('|||');
    router.push({
      pathname: '/topics' as any,
      params: {
        subjectId,
        subjectName,
        chapterId: chapterIds,
        chapterName: chapterNames,
        mode: mode ?? '',
        multiSelect: 'true',
      },
    });
  }

  const isExplanation = mode === 'explanation';
  const allSelected = chapters.length > 0 && selected.size === chapters.length;

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
            {selectMode ? (selected.size === 0 ? 'Select Chapters' : `${selected.size} selected`) : 'Chapters'}
          </Text>
          {subjectName && !selectMode ? (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {subjectName}
            </Text>
          ) : null}
        </View>

        {/* Select-All toggle when in select mode */}
        {selectMode && chapters.length > 0 ? (
          <Pressable
            style={[styles.selectAllBtn, { backgroundColor: allSelected ? colors.primaryLight : colors.secondary }]}
            onPress={selectAll}
          >
            <Ionicons
              name={allSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={allSelected ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.selectAllText, { color: allSelected ? colors.primary : colors.mutedForeground }]}>
              {allSelected ? 'All' : 'All'}
            </Text>
          </Pressable>
        ) : null}

        {/* Select mode toggle */}
        {chapters.length > 1 ? (
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
      </View>

      {/* ── CONTENT ── */}
      {chaptersQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>Loading chapters...</Text>
        </View>
      )}

      {chaptersQuery.error && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.destructive} />
          </View>
          <Text style={[styles.errorText, { color: colors.text }]}>Couldn't load chapters</Text>
          <Pressable
            onPress={() => chaptersQuery.refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {chaptersQuery.data && (
        <FlatList
          data={chaptersQuery.data}
          keyExtractor={(item) => getId(item)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + (selectMode && selected.size > 0 ? 100 : 20) },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            chaptersQuery.data.length > 0 ? (
              <View style={styles.listHeaderRow}>
                <Text style={[styles.listHeader, { color: colors.mutedForeground }]}>
                  {chaptersQuery.data.length} chapters
                </Text>
                {selectMode && (
                  <Text style={[styles.selectHint, { color: colors.mutedForeground }]}>
                    Tap to select · proceed below
                  </Text>
                )}
              </View>
            ) : null
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
                  <View style={[styles.numBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.numText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                )}

                <View style={styles.chapterInfo}>
                  <Text style={[styles.chapterName, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.chapterHint, { color: colors.mutedForeground }]}>
                    {selectMode
                      ? isSelected ? 'Selected' : 'Tap to select'
                      : isExplanation ? 'Tap to view explanation' : 'Tap to explore topics'}
                  </Text>
                </View>

                {selectMode ? null : (
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
          scrollEnabled={!!chaptersQuery.data.length}
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
              {selected.size === 1 ? 'chapter selected' : 'chapters selected'}
            </Text>
          </View>
          <Pressable
            style={[styles.proceedBtn, { backgroundColor: colors.primary }]}
            onPress={handleProceed}
          >
            <Text style={styles.proceedBtnText}>View Topics</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </Pressable>
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
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectAllText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  selectToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectToggleText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  list: { padding: 16, gap: 8 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listHeader: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600', letterSpacing: 0.3 },
  selectHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadge: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  chapterInfo: { flex: 1 },
  chapterName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 3, lineHeight: 20 },
  chapterHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  chevronWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hintText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  bottomBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countBubbleText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFF' },
  bottomBarLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  proceedBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
