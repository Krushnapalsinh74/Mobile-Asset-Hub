import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Topic } from '@/services/api';
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

export default function TopicsScreen() {
  const { subjectId, subjectName, chapterId, chapterName, mode } =
    useLocalSearchParams<{
      subjectId: string;
      subjectName: string;
      chapterId: string;
      chapterName: string;
      mode?: string;
    }>();
  const { boardId, standardId } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topicsQuery = useQuery({
    queryKey: ['topics', boardId, standardId, subjectId, chapterId],
    queryFn: () => eduApi.getTopics(boardId!, standardId!, subjectId, chapterId),
    enabled: !!boardId && !!standardId && !!subjectId && !!chapterId,
  });

  const handleTopicPress = (topic: Topic) => {
    Haptics.selectionAsync();
    if (mode === 'explanation') {
      router.push({
        pathname: '/explanation' as any,
        params: {
          subjectId,
          subjectName,
          chapterId,
          chapterName,
          topicId: getId(topic),
          topicName: topic.name,
        },
      });
    } else {
      router.push({
        pathname: '/topic-dashboard' as any,
        params: {
          subjectId,
          subjectName,
          chapterId,
          chapterName,
          topicId: getId(topic),
          topicName: topic.name,
        },
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: chapterName || 'Topics' }} />

      {chapterName ? (
        <View style={[styles.chapterBanner, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="book-outline" size={15} color={colors.primary} />
          <Text style={[styles.chapterText, { color: colors.primary }]} numberOfLines={1}>
            {chapterName}
          </Text>
        </View>
      ) : null}

      {topicsQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {topicsQuery.error && (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.text }]}>Failed to load topics</Text>
          <Pressable
            onPress={() => topicsQuery.refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {topicsQuery.data && topicsQuery.data.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="document-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No topics found for this chapter
          </Text>
        </View>
      )}

      {topicsQuery.data && topicsQuery.data.length > 0 && (
        <FlatList
          data={topicsQuery.data}
          keyExtractor={(item) => getId(item)}
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.topicCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => handleTopicPress(item)}
            >
              <View style={[styles.topicDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.topicName, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Ionicons
                name={mode === 'explanation' ? 'bulb-outline' : 'chevron-forward'}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
          scrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chapterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chapterText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', flex: 1 },
  list: { padding: 16, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  topicDot: { width: 9, height: 9, borderRadius: 4.5 },
  topicName: { flex: 1, fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
