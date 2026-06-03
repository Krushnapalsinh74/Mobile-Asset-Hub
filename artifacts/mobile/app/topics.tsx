import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Topic } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
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
  const { boardId, standardId, setSubjectTotal } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topicsQuery = useQuery({
    queryKey: ['topics', boardId, standardId, subjectId, chapterId],
    queryFn: () => eduApi.getTopics(boardId!, standardId!, subjectId, chapterId),
    enabled: !!boardId && !!standardId && !!subjectId && !!chapterId,
  });

  useEffect(() => {
    if (topicsQuery.data && subjectId) {
      setSubjectTotal(subjectId, (topicsQuery.data.length));
    }
  }, [topicsQuery.data, subjectId]);

  const isExplanation = mode === 'explanation';

  const handleTopicPress = (topic: Topic) => {
    Haptics.selectionAsync();
    if (isExplanation) {
      router.push({
        pathname: '/explanation' as any,
        params: { subjectId, subjectName, chapterId, chapterName, topicId: getId(topic), topicName: topic.name },
      });
    } else {
      router.push({
        pathname: '/topic-dashboard' as any,
        params: { subjectId, subjectName, chapterId, chapterName, topicId: getId(topic), topicName: topic.name },
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <Pressable onPress={() => router.back()}>
          <View style={[styles.backCircle, { backgroundColor: colors.secondary }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </View>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Topics</Text>
          {chapterName ? (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {chapterName}
            </Text>
          ) : null}
        </View>
        {isExplanation && (
          <View style={[styles.modePill, { backgroundColor: colors.accent }]}>
            <Text style={styles.modePillText}>Explanation</Text>
          </View>
        )}
      </View>

      {chapterName ? (
        <View style={[styles.chapterBanner, { backgroundColor: colors.primaryLight, borderBottomColor: colors.border }]}>
          <View style={[styles.bannerIconWrap, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name="book-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.chapterText, { color: colors.primary }]} numberOfLines={1}>
            {chapterName}
          </Text>
          {isExplanation && (
            <View style={[styles.modePill, { backgroundColor: colors.primary }]}>
              <Text style={styles.modeText}>Explanation</Text>
            </View>
          )}
        </View>
      ) : null}

      {topicsQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {topicsQuery.error && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.destructive} />
          </View>
          <Text style={[styles.errorText, { color: colors.text }]}>Couldn't load topics</Text>
          <Pressable
            onPress={() => topicsQuery.refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {topicsQuery.data && topicsQuery.data.length === 0 && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="document-outline" size={34} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
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
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: colors.mutedForeground }]}>
              {topicsQuery.data.length} topics
            </Text>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={[
                styles.topicCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => handleTopicPress(item)}
            >
              <View style={[styles.topicNum, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.topicNumText, { color: colors.mutedForeground }]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[styles.topicName, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={[styles.topicAction, { backgroundColor: isExplanation ? colors.accentLight : colors.secondary }]}>
                <Ionicons
                  name={isExplanation ? 'bulb-outline' : 'chevron-forward'}
                  size={15}
                  color={isExplanation ? colors.accent : colors.mutedForeground}
                />
              </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  modePillText: { fontSize: 11, color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontWeight: '700' },
  chapterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  bannerIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  modePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  modeText: { fontSize: 10, color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontWeight: '700' },
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
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  topicNum: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicNumText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  topicName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  topicAction: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
