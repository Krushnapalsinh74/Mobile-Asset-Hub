import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Topic } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueries } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MARKS_OPTIONS = [1, 2, 3, 4];

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; icon: string; color: string }[] = [
  { value: 'easy',   label: 'Easy',   icon: '😊', color: '#10B981' },
  { value: 'medium', label: 'Medium', icon: '🔥', color: '#F59E0B' },
  { value: 'hard',   label: 'Hard',   icon: '💀', color: '#EF4444' },
];

type ChapterConfig = {
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
  count: number;
  marksPerQ: number;
  difficulty: Difficulty;
  expanded: boolean;
};

type TopicState = { selected: boolean };

export default function TestConfigScreen() {
  const {
    subjectId: paramSubjectId,
    subjectName: paramSubjectName,
    chapterId: paramChapterId,
    chapterName: paramChapterName,
    // From topics.tsx (multi-topic selection grouped by chapter)
    topicNamesByChapter: paramTopicNamesByChapter,
    wholeChapter: paramWholeChapter,
    // From topic-dashboard (single topic)
    topicId: paramTopicId,
    topicName: paramTopicName,
  } = useLocalSearchParams<{
    subjectId?: string;
    subjectName?: string;
    chapterId?: string;
    chapterName?: string;
    topicNamesByChapter?: string;
    wholeChapter?: string;
    topicId?: string;
    topicName?: string;
  }>();

  const { boardId, standardId, boardName, standardName } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const chapterIds = useMemo(
    () => (paramChapterId ?? '').split(',').filter(Boolean),
    [paramChapterId],
  );
  const chapterNames = useMemo(
    () => (paramChapterName ?? '').split('|||').filter(Boolean),
    [paramChapterName],
  );
  const subjectIds = useMemo(
    () => (paramSubjectId ?? '').split(',').filter(Boolean),
    [paramSubjectId],
  );
  const subjectNames = useMemo(
    () => (paramSubjectName ?? '').split('|||').filter(Boolean),
    [paramSubjectName],
  );

  // Preset topic names per chapter index (from topics.tsx selection)
  // Format: "Topic A|||Topic B::Topic C|||Topic D" (chapters separated by ::, topics by |||)
  const presetTopicNamesByChapterIndex: string[][] = useMemo(() => {
    if (paramWholeChapter === '1') return chapterIds.map(() => []);
    if (paramTopicName) return [[paramTopicName]]; // single topic from topic-dashboard
    if (paramTopicNamesByChapter) {
      return paramTopicNamesByChapter.split('::').map(chunk =>
        chunk.split('|||').filter(Boolean)
      );
    }
    return chapterIds.map(() => []);
  }, [paramTopicNamesByChapter, paramWholeChapter, paramTopicName, chapterIds]);

  const [configs, setConfigs] = useState<Record<string, ChapterConfig>>(() => {
    const result: Record<string, ChapterConfig> = {};
    chapterIds.forEach((cid, i) => {
      const sid =
        subjectIds.length > 1
          ? (subjectIds[i] ?? subjectIds[0] ?? '')
          : (subjectIds[0] ?? '');
      const sname =
        subjectNames.length > 1
          ? (subjectNames[i] ?? subjectNames[0] ?? '')
          : (subjectNames[0] ?? '');
      result[cid] = {
        chapterId: cid,
        chapterName: chapterNames[i] ?? cid,
        subjectId: sid,
        subjectName: sname,
        count: 5,
        marksPerQ: 1,
        difficulty: 'medium',
        expanded: false,
      };
    });
    return result;
  });

  const [topicStates, setTopicStates] = useState<Record<string, TopicState>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const topicQueries = useQueries({
    queries: chapterIds.map(cid => {
      const cfg = configs[cid]!;
      return {
        queryKey: ['topics', boardId, standardId, cfg.subjectId, cid],
        queryFn: () => eduApi.getTopics(boardId!, standardId!, cfg.subjectId, cid),
        enabled: !!boardId && !!standardId && !!cfg.subjectId && cfg.expanded,
      };
    }),
  });

  const configList = chapterIds.map(cid => configs[cid]!);
  const totalQuestions = configList.reduce((s, c) => s + c.count, 0);
  const totalMarks = configList.reduce((s, c) => s + c.count * c.marksPerQ, 0);

  function updateConfig(cid: string, patch: Partial<ChapterConfig>) {
    setConfigs(prev => ({ ...prev, [cid]: { ...prev[cid]!, ...patch } }));
  }

  function adjustCount(cid: string, delta: number) {
    Haptics.selectionAsync();
    const current = configs[cid]?.count ?? 5;
    const next = Math.max(1, Math.min(100, current + delta));
    updateConfig(cid, { count: next });
  }

  function setMarksPerQ(cid: string, m: number) {
    Haptics.selectionAsync();
    updateConfig(cid, { marksPerQ: m });
  }

  function setDifficulty(cid: string, d: Difficulty) {
    Haptics.selectionAsync();
    updateConfig(cid, { difficulty: d });
  }

  function toggleExpand(cid: string) {
    Haptics.selectionAsync();
    updateConfig(cid, { expanded: !configs[cid]?.expanded });
  }

  function toggleTopic(tid: string) {
    Haptics.selectionAsync();
    setTopicStates(prev => ({
      ...prev,
      [tid]: { selected: !(prev[tid]?.selected ?? true) },
    }));
  }

  // Parse questions from raw API response
  function parseQuestionsFromResponse(res: unknown): any[] {
    const r = res as any;
    return (
      r?.questions ??
      r?.data?.questions ??
      r?.result?.questions ??
      (Array.isArray(r) ? r : [])
    );
  }

  // Keep only real MCQ questions (must have options array with ≥2 items)
  function filterMcq(qs: any[]): any[] {
    return qs.filter(q => Array.isArray(q?.options) && q.options.length >= 2);
  }

  // Remove duplicate questions by normalised question text
  function deduplicate(qs: any[]): any[] {
    const seen = new Set<string>();
    return qs.filter(q => {
      const key = String(q?.question ?? '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const handleGenerate = async () => {
    if (chapterIds.length === 0) {
      setError('No chapters selected.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setLoadingMsg('Preparing questions…');
    setError('');
    setWarning('');

    try {
      // API caps ~10 questions per call. Run batches sequentially (not in
      // parallel) so the server treats each as a fresh request and doesn't
      // return the same cached set every time.
      const API_BATCH = 10;
      const BATCH_DELAY_MS = 600;

      const sleep = (ms: number) =>
        new Promise<void>(resolve => setTimeout(resolve, ms));

      const chapterResults: any[][] = [];
      const shortfalls: string[] = [];

      for (let chapterIdx = 0; chapterIdx < configList.length; chapterIdx++) {
        const cfg = configList[chapterIdx]!;
        const needed = cfg.count;
        const numBatches = Math.min(Math.ceil(needed / API_BATCH), 10);

        let resolvedTopicName: string | undefined;
        if (cfg.expanded) {
          const topicQuery = topicQueries[chapterIdx];
          const loadedTopics: Topic[] = topicQuery?.data ?? [];
          const activeTopicNames = loadedTopics
            .filter(t => topicStates[getId(t)]?.selected !== false)
            .map(t => t.name);
          if (activeTopicNames.length > 0 && activeTopicNames.length < loadedTopics.length) {
            resolvedTopicName = activeTopicNames.join(', ');
          }
        } else {
          const presetForChapter = presetTopicNamesByChapterIndex[chapterIdx] ?? [];
          if (presetForChapter.length > 0) {
            resolvedTopicName = presetForChapter.join(', ');
          }
        }

        const label = resolvedTopicName
          ? `"${resolvedTopicName.slice(0, 40)}…"`
          : `"${cfg.chapterName}"`;

        const pool: any[] = [];

        for (let i = 0; i < numBatches; i++) {
          setLoadingMsg(
            `Fetching questions for ${label}… (batch ${i + 1}/${numBatches})`
          );

          // Unique seed per batch: time-based + batch index so the API
          // cannot serve a cached result across calls.
          const seed = Date.now() + i * 100_003 + Math.floor(Math.random() * 9_999);

          const batch = await eduApi
            .generateQuestions({
              board: boardId ?? boardName ?? '',
              standard: standardId ?? standardName ?? '',
              subject: cfg.subjectName,
              chapter: cfg.chapterName,
              ...(resolvedTopicName ? { topic: resolvedTopicName } : {}),
              options: {
                mode: 'mcq',
                count: API_BATCH,
                seed,
                difficulty: cfg.difficulty,
              },
              freshQuestions: true,
            })
            .then(res => filterMcq(parseQuestionsFromResponse(res)))
            .catch(() => [] as any[]);

          pool.push(...batch);

          // Stop early if we already have enough unique questions
          const unique = deduplicate(pool);
          if (unique.length >= needed) break;

          // Wait before the next batch so the server generates fresh content
          if (i < numBatches - 1) await sleep(BATCH_DELAY_MS);
        }

        const unique = deduplicate(pool);
        const result = unique.slice(0, needed);
        chapterResults.push(result);

        if (result.length < needed) {
          shortfalls.push(
            `"${cfg.chapterName}": ${result.length} of ${needed} unique questions available`
          );
        }
      }

      const allQuestions = chapterResults.flat();

      if (allQuestions.length === 0) {
        setError('No MCQ questions could be generated. Try different chapters or a smaller count.');
        return;
      }

      if (shortfalls.length > 0) {
        setWarning(
          `Only ${allQuestions.length} unique question${allQuestions.length !== 1 ? 's' : ''} found ` +
          `(${shortfalls.join('; ')}). The API has a limited pool — try selecting fewer questions or different topics.`
        );
      }

      // Store questions in AsyncStorage to avoid URL param length limits
      // (large JSON passed via URL gets truncated, causing duplicate/missing questions)
      const questionsKey = `quiz_questions_${Date.now()}`;
      await AsyncStorage.setItem(questionsKey, JSON.stringify(allQuestions));

      const first = configList[0]!;
      router.push({
        pathname: '/test-quiz' as any,
        params: {
          questionsKey,
          subjectId: first.subjectId,
          subjectName: first.subjectName,
          chapterId: chapterIds.join(','),
          chapterName: chapterNames.join('|||'),
          mode: 'mcq',
        },
      });

      // Save in background (fire-and-forget)
      chapterResults.forEach((qs, i) => {
        const cfg = configList[i];
        if (!cfg || qs.length === 0) return;
        eduApi
          .saveQuestions({
            boardId: boardId ?? '',
            standardId: standardId ?? '',
            subjectId: cfg.subjectId,
            chapterId: cfg.chapterId,
            questions: qs as any[],
          })
          .catch(() => {});
      });
    } catch {
      setError('Failed to generate questions. Check your connection and try again.');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0) + 14;

  if (chapterIds.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="layers-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'Inter_600SemiBold', fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
          No chapters selected
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center' }}>
          Go back and select one or more chapters to generate a test.
        </Text>
        <Pressable
          style={{ marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontFamily: 'Inter_700Bold' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad }]}
      >
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <View style={styles.backCircle}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Generate Test</Text>
            <Text style={styles.headerSub}>
              {chapterIds.length} chapter{chapterIds.length > 1 ? 's' : ''} · MCQ
            </Text>
          </View>
          <View style={styles.mcqBadge}>
            <Ionicons name="trophy-outline" size={14} color="#FFFFFF" />
            <Text style={styles.mcqBadgeText}>MCQ</Text>
          </View>
        </View>

        {/* Quick stat chips */}
        <View style={styles.statChips}>
          <View style={styles.statChip}>
            <Ionicons name="help-circle-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.statChipText}>{totalQuestions} Questions</Text>
          </View>
          <View style={styles.statChipDot} />
          <View style={styles.statChip}>
            <Ionicons name="star-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.statChipText}>{totalMarks} Marks</Text>
          </View>
          <View style={styles.statChipDot} />
          <View style={styles.statChip}>
            <Ionicons name="layers-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.statChipText}>{chapterIds.length} Chapter{chapterIds.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Topic scope badge — show if topics were pre-selected */}
        {presetTopicNamesByChapterIndex.some(arr => arr.length > 0) && paramWholeChapter !== '1' && (
          <View style={styles.topicScopePill}>
            <Ionicons name="bookmark-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.topicScopeText} numberOfLines={1}>
              {presetTopicNamesByChapterIndex.flat().length === 1
                ? `Topic: ${presetTopicNamesByChapterIndex.flat()[0]}`
                : `${presetTopicNamesByChapterIndex.flat().length} topics selected`}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          QUESTIONS PER CHAPTER
        </Text>

        {chapterIds.map((cid, idx) => {
          const cfg = configs[cid]!;
          const topicQuery = topicQueries[idx];
          const topics: Topic[] = topicQuery?.data ?? [];
          const topicsLoading = topicQuery?.isLoading ?? false;

          return (
            <View
              key={cid}
              style={[styles.chapterCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Chapter title */}
              <View style={styles.chapterTop}>
                <View style={[styles.numBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.numBadgeText, { color: colors.primary }]}>{idx + 1}</Text>
                </View>
                <View style={styles.chapterNameWrap}>
                  <Text style={[styles.chapterName, { color: colors.text }]} numberOfLines={2}>
                    {cfg.chapterName}
                  </Text>
                  <Text style={[styles.chapterSubject, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {cfg.subjectName}
                  </Text>
                </View>
              </View>

              {/* Questions stepper */}
              <View style={[styles.controlRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.controlLabel, { color: colors.text }]}>Questions</Text>
                <View style={styles.stepperWrap}>
                  <Pressable
                    style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={() => adjustCount(cid, -5)}
                    onLongPress={() => adjustCount(cid, -1)}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </Pressable>
                  <TextInput
                    style={[styles.stepInput, { color: colors.text, borderColor: colors.primary + '60', backgroundColor: colors.primaryLight }]}
                    keyboardType="number-pad"
                    value={String(cfg.count)}
                    onChangeText={t => {
                      const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                      if (!isNaN(n) && n >= 1 && n <= 100) updateConfig(cid, { count: n });
                    }}
                    maxLength={3}
                    returnKeyType="done"
                    selectTextOnFocus
                  />
                  <Pressable
                    style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={() => adjustCount(cid, 5)}
                    onLongPress={() => adjustCount(cid, 1)}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </Pressable>
                </View>
              </View>

              {/* Marks per question */}
              <View style={[styles.controlRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.controlLabel, { color: colors.text }]}>Marks / question</Text>
                <View style={styles.marksRow}>
                  {MARKS_OPTIONS.map(m => (
                    <Pressable
                      key={m}
                      style={[
                        styles.markChip,
                        {
                          backgroundColor: cfg.marksPerQ === m ? colors.primary : colors.secondary,
                          borderColor: cfg.marksPerQ === m ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setMarksPerQ(cid, m)}
                    >
                      <Text style={[styles.markChipText, { color: cfg.marksPerQ === m ? '#FFF' : colors.text }]}>
                        {m}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Difficulty level */}
              <View style={[styles.controlRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.controlLabel, { color: colors.text }]}>Difficulty</Text>
                <View style={styles.marksRow}>
                  {DIFFICULTY_OPTIONS.map(d => {
                    const active = cfg.difficulty === d.value;
                    return (
                      <Pressable
                        key={d.value}
                        style={[
                          styles.diffChip,
                          {
                            backgroundColor: active ? d.color + '20' : colors.secondary,
                            borderColor: active ? d.color : colors.border,
                            borderWidth: active ? 1.5 : 1,
                          },
                        ]}
                        onPress={() => setDifficulty(cid, d.value)}
                      >
                        <Text style={styles.diffChipIcon}>{d.icon}</Text>
                        <Text style={[styles.diffChipText, { color: active ? d.color : colors.mutedForeground, fontWeight: active ? '700' : '400' }]}>
                          {d.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Subtotal */}
              <View style={[styles.subtotalRow, { borderTopColor: colors.border, backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.subtotalLabel, { color: colors.mutedForeground }]}>
                  {cfg.count} q × {cfg.marksPerQ} mark{cfg.marksPerQ > 1 ? 's' : ''}
                </Text>
                <Text style={[styles.subtotalValue, { color: colors.primary }]}>
                  = {cfg.count * cfg.marksPerQ} marks
                </Text>
              </View>

              {/* Topics toggle */}
              <Pressable
                style={[styles.topicsToggleRow, { borderTopColor: colors.border }]}
                onPress={() => toggleExpand(cid)}
              >
                <Ionicons
                  name={cfg.expanded ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
                  size={16}
                  color={cfg.expanded ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.topicsToggleText, { color: cfg.expanded ? colors.primary : colors.mutedForeground }]}>
                  {cfg.expanded ? 'Hide topics' : 'Filter by topics (optional)'}
                </Text>
              </Pressable>

              {/* Topics list */}
              {cfg.expanded && (
                <View style={[styles.topicsSection, { borderTopColor: colors.border }]}>
                  {topicsLoading ? (
                    <View style={styles.topicsLoadRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.topicsLoadText, { color: colors.mutedForeground }]}>
                        Loading topics…
                      </Text>
                    </View>
                  ) : topics.length === 0 ? (
                    <Text style={[styles.noTopicsText, { color: colors.mutedForeground }]}>
                      No topics found for this chapter.
                    </Text>
                  ) : (
                    <>
                      <View style={[styles.topicsHint, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.topicsHintText, { color: colors.mutedForeground }]}>
                          All topics selected by default. Tap to deselect.
                        </Text>
                      </View>
                      {topics.map((topic, ti) => {
                        const tid = getId(topic);
                        const isSelected = topicStates[tid]?.selected ?? true;
                        return (
                          <Pressable
                            key={tid}
                            style={[
                              styles.topicRow,
                              {
                                borderBottomColor: colors.border,
                                borderBottomWidth: ti < topics.length - 1 ? 1 : 0,
                                backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                              },
                            ]}
                            onPress={() => toggleTopic(tid)}
                          >
                            <View style={[
                              styles.topicCheck,
                              {
                                backgroundColor: isSelected ? colors.primary : 'transparent',
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                            ]}>
                              {isSelected && <Ionicons name="checkmark" size={11} color="#FFF" />}
                            </View>
                            <Text
                              style={[styles.topicName, { color: isSelected ? colors.primary : colors.text }]}
                              numberOfLines={2}
                            >
                              {topic.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {!!error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '18' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        {!!warning && (
          <View style={[styles.errorBanner, { backgroundColor: '#F59E0B18' }]}>
            <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
            <Text style={[styles.errorText, { color: '#92400E' }]}>{warning}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── BOTTOM SUMMARY + GENERATE ── */}
      <View style={[styles.bottomBar, {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 20 : 0) + 8,
      }]}>
        <View style={styles.totalsGroup}>
          <View style={styles.totalItem}>
            <Text style={[styles.totalNum, { color: colors.text }]}>{totalQuestions}</Text>
            <Text style={[styles.totalLbl, { color: colors.mutedForeground }]}>Questions</Text>
          </View>
          <View style={[styles.totalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.totalItem}>
            <Text style={[styles.totalNum, { color: colors.primary }]}>{totalMarks}</Text>
            <Text style={[styles.totalLbl, { color: colors.mutedForeground }]}>Marks</Text>
          </View>
          <View style={[styles.totalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.totalItem}>
            <Text style={[styles.totalNum, { color: colors.text }]}>{chapterIds.length}</Text>
            <Text style={[styles.totalLbl, { color: colors.mutedForeground }]}>Chapters</Text>
          </View>
        </View>

        <Pressable
          style={[styles.generateBtn, { backgroundColor: colors.primary, opacity: loading ? 0.65 : 1 }]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFF" size="small" />
              {!!loadingMsg && (
                <Text style={[styles.generateBtnText, { fontSize: 12, opacity: 0.9 }]} numberOfLines={1}>
                  {loadingMsg}
                </Text>
              )}
            </View>
          ) : (
            <>
              <Ionicons name="play-circle-outline" size={20} color="#FFF" />
              <Text style={styles.generateBtnText}>Generate</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    overflow: 'hidden', gap: 10,
  },
  headerBlob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  headerBlob2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backCircle: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  mcqBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  mcqBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  statChips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statChipText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  statChipDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  topicScopePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start',
  },
  topicScopeText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600', maxWidth: 260 },
  scrollContent: { padding: 16, gap: 12 },
  sectionLabel: {
    fontSize: 10, letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold', fontWeight: '600', marginBottom: 4,
  },
  chapterCard: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  chapterTop: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14,
  },
  numBadge: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  numBadgeText: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  chapterNameWrap: { flex: 1 },
  chapterName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', lineHeight: 20 },
  chapterSubject: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  controlRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  controlLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepInput: {
    width: 52, height: 34, borderRadius: 10, borderWidth: 1.5,
    textAlign: 'center', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold',
  },
  marksRow: { flexDirection: 'row', gap: 6 },
  markChip: {
    width: 38, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  markChipText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  diffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  diffChipIcon: { fontSize: 13 },
  diffChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  subtotalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 7, borderTopWidth: 1,
  },
  subtotalLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  subtotalValue: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  topicsToggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  topicsToggleText: { fontSize: 12, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  topicsSection: { borderTopWidth: 1 },
  topicsLoadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
  },
  topicsLoadText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  noTopicsText: { fontSize: 13, fontFamily: 'Inter_400Regular', padding: 12 },
  topicsHint: { paddingHorizontal: 14, paddingVertical: 7 },
  topicsHintText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  topicRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  topicCheck: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  topicName: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 14, borderRadius: 14,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16, paddingTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  totalsGroup: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  totalItem: { alignItems: 'center', gap: 1 },
  totalDivider: { width: 1, height: 30 },
  totalNum: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  totalLbl: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16,
  },
  generateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
