import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function FormattedText({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return (
            <Text
              key={i}
              style={[styles.heading3, { color: colors.text }]}
            >
              {line.slice(4).replace(/\*\*(.*?)\*\*/g, '$1')}
            </Text>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <Text key={i} style={[styles.heading2, { color: colors.text }]}>
              {line.slice(3).replace(/\*\*(.*?)\*\*/g, '$1')}
            </Text>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <Text key={i} style={[styles.heading1, { color: colors.text }]}>
              {line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}
            </Text>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1');
          return (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.bodyText, { color: colors.text }]}>{content}</Text>
            </View>
          );
        }
        if (!line.trim()) {
          return <View key={i} style={{ height: 6 }} />;
        }
        const stripped = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
        return (
          <Text key={i} style={[styles.bodyText, { color: colors.text }]}>
            {stripped}
          </Text>
        );
      })}
    </View>
  );
}

export default function ExplanationScreen() {
  const { subjectId, subjectName, chapterId, chapterName, topicId, topicName } =
    useLocalSearchParams<{
      subjectId: string;
      subjectName: string;
      chapterId: string;
      chapterName: string;
      topicId: string;
      topicName: string;
    }>();
  const { boardName, standardName } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const query = useQuery({
    queryKey: ['topic-details', subjectId, chapterId, topicId],
    queryFn: () =>
      eduApi.getTopicDetails({
        board: boardName ?? '',
        standard: standardName ?? '',
        subject: subjectName,
        chapter: chapterName,
        topic: topicName,
      }),
  });

  const rawContent: string =
    typeof query.data === 'string'
      ? query.data
      : ((query.data as any)?.studyGuide ??
        (query.data as any)?.explanation ??
        (query.data as any)?.content ??
        (query.data as any)?.text ??
        (query.data ? JSON.stringify(query.data, null, 2) : ''));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: topicName || 'Explanation' }} />

      <View style={[styles.topicBanner, { backgroundColor: colors.success + '1A' }]}>
        <Ionicons name="bulb-outline" size={17} color={colors.success} />
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTopic, { color: colors.success }]} numberOfLines={2}>
            {topicName}
          </Text>
          <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
            {subjectName} • {chapterName}
          </Text>
        </View>
      </View>

      {query.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.success} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Generating explanation...
          </Text>
          <Text style={[styles.loadingHint, { color: colors.mutedForeground }]}>
            This may take a moment
          </Text>
        </View>
      )}

      {query.error && (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={52} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.text }]}>Failed to load explanation</Text>
          <Pressable
            onPress={() => query.refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {query.data && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.explanationCard, { backgroundColor: colors.card }]}>
            <FormattedText text={rawContent} colors={colors} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bannerText: { flex: 1 },
  bannerTopic: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  bannerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 15, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  loadingHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 13 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16 },
  explanationCard: {
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  heading1: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginTop: 18,
    marginBottom: 6,
    lineHeight: 30,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginTop: 14,
    marginBottom: 5,
    lineHeight: 26,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 25,
  },
  bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginLeft: 4 },
  bulletDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 9 },
});
