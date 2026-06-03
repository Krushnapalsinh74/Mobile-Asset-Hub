import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Chapter } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
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

  const chaptersQuery = useQuery({
    queryKey: ['chapters', boardId, standardId, subjectId],
    queryFn: () => eduApi.getChapters(boardId!, standardId!, subjectId),
    enabled: !!boardId && !!standardId && !!subjectId,
  });

  const handleChapterPress = (chapter: Chapter) => {
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
  };

  const isExplanation = mode === 'explanation';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: subjectName ? `${subjectName} — Chapters` : 'Chapters' }} />

      {chaptersQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Loading chapters...
          </Text>
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
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            chaptersQuery.data.length > 0 ? (
              <Text style={[styles.listHeader, { color: colors.mutedForeground }]}>
                {chaptersQuery.data.length} chapters
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={[
                styles.chapterCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => handleChapterPress(item)}
            >
              <View style={[styles.numBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.numText, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <View style={styles.chapterInfo}>
                <Text style={[styles.chapterName, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.chapterHint, { color: colors.mutedForeground }]}>
                  {isExplanation ? 'Tap to view explanation' : 'Tap to explore topics'}
                </Text>
              </View>
              <View style={[styles.chevronWrap, { backgroundColor: colors.secondary }]}>
                <Ionicons
                  name={isExplanation ? 'bulb-outline' : 'chevron-forward'}
                  size={16}
                  color={isExplanation ? colors.accent : colors.mutedForeground}
                />
              </View>
            </Pressable>
          )}
          scrollEnabled={!!chaptersQuery.data.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8 },
  listHeader: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
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
  numBadge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  chapterInfo: { flex: 1 },
  chapterName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 3,
    lineHeight: 20,
  },
  chapterHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
