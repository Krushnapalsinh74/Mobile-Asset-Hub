import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Chapter } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

const COUNTS = [5, 10, 15, 20, 25, 30];
const MODES = [
  {
    key: 'mcq',
    label: 'Multiple Choice',
    icon: 'checkmark-circle-outline' as const,
    desc: 'Choose from 4 options',
  },
  {
    key: 'short',
    label: 'Short Answer',
    icon: 'create-outline' as const,
    desc: 'Brief written responses',
  },
  {
    key: 'long',
    label: 'Long Answer',
    icon: 'document-text-outline' as const,
    desc: 'Detailed explanations',
  },
  {
    key: 'test',
    label: 'Mixed Test',
    icon: 'grid-outline' as const,
    desc: 'Variety of types',
  },
];

export default function TestConfigScreen() {
  const { subjectId, subjectName, chapterId: paramChapterId, chapterName: paramChapterName } =
    useLocalSearchParams<{
      subjectId: string;
      subjectName: string;
      chapterId?: string;
      chapterName?: string;
    }>();
  const { boardId, standardId, boardName, standardName } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [count, setCount] = useState(10);
  const [mode, setMode] = useState('mcq');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(
    paramChapterId ? { _id: paramChapterId, name: paramChapterName ?? '' } : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const chaptersQuery = useQuery({
    queryKey: ['chapters', boardId, standardId, subjectId],
    queryFn: () => eduApi.getChapters(boardId!, standardId!, subjectId),
    enabled: !!boardId && !!standardId && !!subjectId && !paramChapterId,
  });

  const handleGenerate = async () => {
    if (!selectedChapter) {
      setError('Please select a chapter to generate questions from.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    try {
      const res = await eduApi.generateQuestions({
        board: boardName ?? '',
        standard: standardName ?? '',
        subject: subjectName,
        chapter: selectedChapter.name,
        options: { mode, count },
      });
      const questions =
        (res as any)?.questions ??
        (Array.isArray(res) ? res : []);
      router.push({
        pathname: '/test-quiz' as any,
        params: {
          questionsJson: JSON.stringify(questions),
          subjectId,
          subjectName,
          chapterId: getId(selectedChapter),
          chapterName: selectedChapter.name,
          mode,
        },
      });
    } catch {
      setError('Failed to generate questions. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: 'Live Test' }} />

      <View style={[styles.infoCard, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="reader-outline" size={20} color={colors.primary} />
        <View style={styles.infoRight}>
          <Text style={[styles.infoSubject, { color: colors.primary }]}>{subjectName}</Text>
          {selectedChapter ? (
            <Text style={[styles.infoChapter, { color: colors.primary }]}>
              {selectedChapter.name}
            </Text>
          ) : (
            <Text style={[styles.infoChapter, { color: colors.accent }]}>
              Select a chapter below
            </Text>
          )}
        </View>
      </View>

      {!paramChapterId && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Chapter</Text>
          {chaptersQuery.isLoading && (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>
                Loading chapters...
              </Text>
            </View>
          )}
          {chaptersQuery.data?.map((ch) => {
            const isSelected = getId(selectedChapter ?? {}) === getId(ch);
            return (
              <Pressable
                key={getId(ch)}
                style={[
                  styles.chapterChip,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  setSelectedChapter(ch);
                  setError('');
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.chapterChipText,
                    { color: isSelected ? colors.primary : colors.text },
                  ]}
                  numberOfLines={2}
                >
                  {ch.name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Number of Questions</Text>
      <View style={styles.countRow}>
        {COUNTS.map((c) => (
          <Pressable
            key={c}
            style={[
              styles.countChip,
              {
                backgroundColor: count === c ? colors.primary : colors.card,
                borderColor: count === c ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { setCount(c); Haptics.selectionAsync(); }}
          >
            <Text
              style={[styles.countChipText, { color: count === c ? '#FFFFFF' : colors.text }]}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Question Type</Text>
      <View style={styles.modeGrid}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={[
              styles.modeCard,
              {
                backgroundColor: mode === m.key ? colors.primary : colors.card,
                borderColor: mode === m.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { setMode(m.key); Haptics.selectionAsync(); }}
          >
            <Ionicons name={m.icon} size={22} color={mode === m.key ? '#FFFFFF' : colors.primary} />
            <Text
              style={[styles.modeLabel, { color: mode === m.key ? '#FFFFFF' : colors.text }]}
            >
              {m.label}
            </Text>
            <Text
              style={[
                styles.modeDesc,
                {
                  color:
                    mode === m.key ? 'rgba(255,255,255,0.72)' : colors.mutedForeground,
                },
              ]}
            >
              {m.desc}
            </Text>
          </Pressable>
        ))}
      </View>

      {!!error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '18' }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <Pressable
        style={[styles.generateBtn, { backgroundColor: colors.primary, opacity: loading ? 0.65 : 1 }]}
        onPress={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="play-circle-outline" size={22} color="#FFFFFF" />
            <Text style={styles.generateBtnText}>Generate Test</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  infoRight: { flex: 1 },
  infoSubject: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  infoChapter: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loaderText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  chapterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 13,
    gap: 10,
  },
  chapterChipText: { flex: 1, fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  countRow: { flexDirection: 'row', gap: 8 },
  countChip: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
  },
  countChipText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeCard: {
    width: '47.5%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 6,
  },
  modeLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  modeDesc: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    padding: 18,
    gap: 10,
    marginTop: 6,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
