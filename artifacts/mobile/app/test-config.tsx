import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Topic } from '@/services/api';
import { saveQuestions } from '@/store/questionStore';
import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DIAGRAM_KEYWORDS =
  /\b(diagram|circuit|triangle|rectangle|square|circle|angle|parallel|perpendicular|polygon|geometry|coordinate|graph|ray|lens|mirror|prism|force|vector|velocity|wave|cell|membrane|chromosome|dna|bond|molecule|structure|figure|orbital|refract|reflect|bisect|congruent|similar|hypotenuse|altitude|median|electric|magnetic|field|flux)\b/i;

async function generateDiagramsForQuestions(
  questions: any[],
  board: string,
  standard: string,
  subject: string,
  chapter: string,
): Promise<any[]> {
  const candidates = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => DIAGRAM_KEYWORDS.test(String(q?.question ?? '')));

  if (candidates.length === 0) return questions;

  const prompt = [
    'Generate ASCII text diagrams for quiz questions where a diagram genuinely helps understanding.',
    'Rules: use only plain ASCII chars (-, |, /, \\, +, *, =, >, <, ^, arrows like --> or <--). Max 8 lines per diagram. No markdown code fences.',
    'Return ONLY valid JSON (no extra text): an array where each entry is {"index":<number>,"diagram":"<ascii text>"}.',
    'Only include entries where a visual genuinely aids the question. Skip purely text-based questions.',
    '',
    'Questions:',
    ...candidates.map(({ q, i }) => `${i}. ${String(q.question).slice(0, 200)}`),
  ].join('\n');

  try {
    const res = await eduApi.chat({
      message: prompt,
      history: [],
      board,
      standard,
      filters: { subject, chapter },
    });

    const text = String(
      (res as any)?.response ??
      (res as any)?.message ??
      (res as any)?.content ??
      '',
    ).trim();

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return questions;

    const entries: { index: number; diagram: string }[] = JSON.parse(match[0]);
    const result = questions.map(q => ({ ...q }));
    for (const { index, diagram } of entries) {
      if (result[index] && typeof diagram === 'string' && diagram.trim()) {
        result[index] = { ...result[index], textDiagram: diagram.trim() };
      }
    }
    return result;
  } catch {
    return questions;
  }
}

const MARKS_OPTIONS = [1, 2, 3, 4];

type Difficulty = 'easy' | 'medium' | 'hard' | 'advanced';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; icon: string; color: string }[] = [
  { value: 'easy',     label: 'Easy',     icon: '😊', color: '#10B981' },
  { value: 'medium',  label: 'Medium',   icon: '🔥', color: '#F59E0B' },
  { value: 'hard',    label: 'Hard',     icon: '💀', color: '#EF4444' },
  { value: 'advanced',label: 'Advanced', icon: '🚀', color: '#7C3AED' },
];

type ChapterConfig = {
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
  marksPerQ: number;
  difficulties: Difficulty[];
  difficultyBreakdown: Record<Difficulty, number>;
  expanded: boolean;
};

type TopicState = { selected: boolean };

function getChapterCount(cfg: ChapterConfig): number {
  return cfg.difficulties.reduce((s, d) => s + (cfg.difficultyBreakdown[d] ?? 0), 0);
}

export default function TestConfigScreen() {
  const {
    subjectId: paramSubjectId,
    subjectName: paramSubjectName,
    chapterId: paramChapterId,
    chapterName: paramChapterName,
    topicNamesByChapter: paramTopicNamesByChapter,
    wholeChapter: paramWholeChapter,
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

  const presetTopicNamesByChapterIndex: string[][] = useMemo(() => {
    if (paramWholeChapter === '1') return chapterIds.map(() => []);
    if (paramTopicName) return [[paramTopicName]];
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
        marksPerQ: 1,
        difficulties: ['medium'],
        difficultyBreakdown: { easy: 3, medium: 5, hard: 3, advanced: 3 },
        expanded: false,
      };
    });
    return result;
  });

  const [topicStates, setTopicStates] = useState<Record<string, TopicState>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');

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
  const totalQuestions = configList.reduce((s, c) => s + getChapterCount(c), 0);
  const totalMarks = configList.reduce((s, c) => s + getChapterCount(c) * c.marksPerQ, 0);

  function updateConfig(cid: string, patch: Partial<ChapterConfig>) {
    setConfigs(prev => ({ ...prev, [cid]: { ...prev[cid]!, ...patch } }));
  }

  function toggleDifficulty(cid: string, d: Difficulty) {
    Haptics.selectionAsync();
    const cfg = configs[cid]!;
    const already = cfg.difficulties.includes(d);
    if (already) {
      if (cfg.difficulties.length === 1) return; // keep at least one
      updateConfig(cid, { difficulties: cfg.difficulties.filter(x => x !== d) });
    } else {
      updateConfig(cid, { difficulties: [...cfg.difficulties, d] });
    }
  }

  function adjustDifficultyCount(cid: string, d: Difficulty, delta: number) {
    Haptics.selectionAsync();
    const cfg = configs[cid]!;
    const current = cfg.difficultyBreakdown[d] ?? 3;
    const next = Math.max(1, Math.min(100, current + delta));
    updateConfig(cid, {
      difficultyBreakdown: { ...cfg.difficultyBreakdown, [d]: next },
    });
  }

  function setSingleCount(cid: string, val: number) {
    const cfg = configs[cid]!;
    const d = cfg.difficulties[0]!;
    updateConfig(cid, {
      difficultyBreakdown: { ...cfg.difficultyBreakdown, [d]: val },
    });
  }

  function setMarksPerQ(cid: string, m: number) {
    Haptics.selectionAsync();
    updateConfig(cid, { marksPerQ: m });
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

  function parseQuestionsFromResponse(res: unknown): { questions: any[]; serverActual?: number } {
    const r = res as any;
    const questions =
      r?.questions ??
      r?.data?.questions ??
      r?.result?.questions ??
      (Array.isArray(r) ? r : []);
    const serverActual: number | undefined =
      r?.actualMcqCount ?? r?.data?.actualMcqCount ?? undefined;
    return { questions, serverActual };
  }

  function filterMcq(qs: any[]): any[] {
    return qs.filter(q => Array.isArray(q?.options) && q.options.length >= 2);
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

    try {
      // Server now batches internally (up to 3×20 parallel AI calls + dedup),
      // so request the full needed count in one shot. Only retry if we're still
      // short AND the server didn't signal it hit its own limit (actualMcqCount).
      const MAX_ATTEMPTS = 3;
      const chapterResults: any[][] = [];

      for (let chapterIdx = 0; chapterIdx < configList.length; chapterIdx++) {
        const cfg = configList[chapterIdx]!;

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

        const chapterLabel = resolvedTopicName
          ? `"${resolvedTopicName.slice(0, 30)}"`
          : `"${cfg.chapterName}"`;

        const allForChapter: any[] = [];
        const globalSeen = new Set<string>();

        for (const diff of cfg.difficulties) {
          const needed = cfg.difficultyBreakdown[diff] ?? 0;
          if (needed === 0) continue;

          const diffOpt = DIFFICULTY_OPTIONS.find(o => o.value === diff)!;
          const pool: any[] = [];
          const seen = new Set<string>();
          let attempts = 0;
          let serverHitLimit = false;

          while (pool.length < needed && attempts < MAX_ATTEMPTS && !serverHitLimit) {
            attempts++;
            setLoadingMsg(
              `${diffOpt.icon} ${diffOpt.label} questions for ${chapterLabel}… (${pool.length}/${needed})`,
            );

            const remaining = needed - pool.length;
            const raw = await eduApi
              .generateQuestions({
                board: boardId ?? boardName ?? '',
                standard: standardId ?? standardName ?? '',
                subject: cfg.subjectName,
                chapter: cfg.chapterName,
                ...(resolvedTopicName ? { topic: resolvedTopicName } : {}),
                options: {
                  mode: 'mcq',
                  count: remaining,
                  seed: Math.floor(Math.random() * 9_000_000) + attempts * 137_003,
                  difficulty: diff,
                },
                freshQuestions: true,
              })
              .catch(() => ({} as Record<string, unknown>));

            const { questions: rawBatch, serverActual } = parseQuestionsFromResponse(raw);
            const batch = filterMcq(rawBatch);

            // If server tells us it hit its generation limit, no point retrying
            if (serverActual !== undefined && serverActual < remaining) {
              serverHitLimit = true;
            }

            let newInBatch = 0;
            for (const q of batch) {
              const key = String(q?.question ?? '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 120);
              if (!key) continue;
              if (!seen.has(key) && !globalSeen.has(key)) {
                seen.add(key);
                globalSeen.add(key);
                pool.push(q);
                newInBatch++;
              }
            }

            // Also stop early if we got nothing new from a non-empty batch
            if (batch.length > 0 && newInBatch === 0 && pool.length > 0) break;
          }

          allForChapter.push(...pool.slice(0, needed));
        }

        chapterResults.push(allForChapter);
      }

      let allQuestions = chapterResults.flat();

      if (allQuestions.length === 0) {
        setError('No MCQ questions could be generated. Try different chapters or a smaller count.');
        return;
      }

      // Generate AI text diagrams for visual questions (one batch call)
      setLoadingMsg('🎨 Generating diagrams for visual questions…');
      const firstCfg = configList[0]!;
      allQuestions = await generateDiagramsForQuestions(
        allQuestions,
        boardId ?? boardName ?? '',
        standardId ?? standardName ?? '',
        firstCfg.subjectName,
        firstCfg.chapterName,
      );

      const sessionId = saveQuestions(allQuestions);

      const doLaunch = () => {
        const first = configList[0]!;
        router.push({
          pathname: '/test-quiz' as any,
          params: {
            sessionId,
            subjectId: first.subjectId,
            subjectName: first.subjectName,
            chapterId: chapterIds.join(','),
            chapterName: chapterNames.join('|||'),
            mode: 'mcq',
          },
        });
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
      };

      if (allQuestions.length < totalQuestions) {
        setLoading(false);
        setLoadingMsg('');
        Alert.alert(
          'Fewer Questions Available',
          `The API only has ${allQuestions.length} unique MCQ questions for this selection (you asked for ${totalQuestions}).\n\nThe test will start with all ${allQuestions.length} available questions.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start Anyway', style: 'default', onPress: doLaunch },
          ],
        );
        return;
      }

      doLaunch();
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
          const isMultiDiff = cfg.difficulties.length > 1;
          const chapterTotal = getChapterCount(cfg);

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

              {/* Questions stepper — only when single difficulty */}
              {!isMultiDiff && (
                <View style={[styles.controlRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.controlLabel, { color: colors.text }]}>Questions</Text>
                  <View style={styles.stepperWrap}>
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      onPress={() => adjustDifficultyCount(cid, cfg.difficulties[0]!, -5)}
                      onLongPress={() => adjustDifficultyCount(cid, cfg.difficulties[0]!, -1)}
                    >
                      <Ionicons name="remove" size={16} color={colors.text} />
                    </Pressable>
                    <TextInput
                      style={[styles.stepInput, { color: colors.text, borderColor: colors.primary + '60', backgroundColor: colors.primaryLight }]}
                      keyboardType="number-pad"
                      value={String(cfg.difficultyBreakdown[cfg.difficulties[0]!] ?? 5)}
                      onChangeText={t => {
                        const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(n) && n >= 1 && n <= 100) setSingleCount(cid, n);
                      }}
                      maxLength={3}
                      returnKeyType="done"
                      selectTextOnFocus
                    />
                    <Pressable
                      style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      onPress={() => adjustDifficultyCount(cid, cfg.difficulties[0]!, 5)}
                      onLongPress={() => adjustDifficultyCount(cid, cfg.difficulties[0]!, 1)}
                    >
                      <Ionicons name="add" size={16} color={colors.text} />
                    </Pressable>
                  </View>
                </View>
              )}

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

              {/* Difficulty level — multi-select */}
              <View style={[styles.controlRow, { borderTopColor: colors.border, flexWrap: 'wrap', gap: 8 }]}>
                <Text style={[styles.controlLabel, { color: colors.text }]}>Difficulty</Text>
                <View style={styles.diffRow}>
                  {DIFFICULTY_OPTIONS.map(d => {
                    const active = cfg.difficulties.includes(d.value);
                    return (
                      <Pressable
                        key={d.value}
                        style={[
                          styles.diffChip,
                          {
                            backgroundColor: active ? d.color + '22' : colors.secondary,
                            borderColor: active ? d.color : colors.border,
                            borderWidth: active ? 1.5 : 1,
                          },
                        ]}
                        onPress={() => toggleDifficulty(cid, d.value)}
                      >
                        <Text style={styles.diffChipIcon}>{d.icon}</Text>
                        <Text style={[styles.diffChipText, { color: active ? d.color : colors.mutedForeground, fontWeight: active ? '700' : '400' }]}>
                          {d.label}
                        </Text>
                        {active && isMultiDiff && (
                          <View style={[styles.diffActiveDot, { backgroundColor: d.color }]} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Per-level question count — only when multiple difficulties selected */}
              {isMultiDiff && (
                <View style={[styles.breakdownSection, { borderTopColor: colors.border, backgroundColor: colors.primaryLight }]}>
                  <View style={styles.breakdownHeader}>
                    <Ionicons name="options-outline" size={13} color={colors.primary} />
                    <Text style={[styles.breakdownTitle, { color: colors.primary }]}>
                      Questions per difficulty level
                    </Text>
                  </View>
                  {DIFFICULTY_OPTIONS.filter(d => cfg.difficulties.includes(d.value)).map(d => (
                    <View key={d.value} style={[styles.breakdownRow, { borderTopColor: colors.border + '80' }]}>
                      <View style={styles.breakdownLabelWrap}>
                        <Text style={styles.breakdownIcon}>{d.icon}</Text>
                        <Text style={[styles.breakdownLabel, { color: d.color }]}>{d.label}</Text>
                      </View>
                      <View style={styles.breakdownStepper}>
                        <Pressable
                          style={[styles.miniStepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => adjustDifficultyCount(cid, d.value, -1)}
                        >
                          <Ionicons name="remove" size={14} color={colors.text} />
                        </Pressable>
                        <View style={[styles.miniStepVal, { backgroundColor: d.color + '18', borderColor: d.color + '40' }]}>
                          <Text style={[styles.miniStepText, { color: d.color }]}>
                            {cfg.difficultyBreakdown[d.value] ?? 3}
                          </Text>
                        </View>
                        <Pressable
                          style={[styles.miniStepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => adjustDifficultyCount(cid, d.value, 1)}
                        >
                          <Ionicons name="add" size={14} color={colors.text} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <View style={[styles.breakdownTotal, { borderTopColor: colors.border }]}>
                    <Text style={[styles.breakdownTotalLabel, { color: colors.mutedForeground }]}>Total questions</Text>
                    <Text style={[styles.breakdownTotalVal, { color: colors.primary }]}>{chapterTotal}</Text>
                  </View>
                </View>
              )}

              {/* Subtotal */}
              <View style={[styles.subtotalRow, { borderTopColor: colors.border, backgroundColor: isMultiDiff ? colors.card : colors.primaryLight }]}>
                <Text style={[styles.subtotalLabel, { color: colors.mutedForeground }]}>
                  {chapterTotal} q × {cfg.marksPerQ} mark{cfg.marksPerQ > 1 ? 's' : ''}
                </Text>
                <Text style={[styles.subtotalValue, { color: colors.primary }]}>
                  = {chapterTotal * cfg.marksPerQ} marks
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
  diffRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  diffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  diffChipIcon: { fontSize: 13 },
  diffChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  diffActiveDot: {
    width: 5, height: 5, borderRadius: 3, marginLeft: 1,
  },

  breakdownSection: {
    borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
  },
  breakdownHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  breakdownTitle: {
    fontSize: 11, fontWeight: '700', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3,
  },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 7, borderTopWidth: 1,
  },
  breakdownLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownIcon: { fontSize: 15 },
  breakdownLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  breakdownStepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniStepBtn: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  miniStepVal: {
    minWidth: 36, height: 28, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  miniStepText: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  breakdownTotal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, paddingBottom: 4, marginTop: 4, borderTopWidth: 1,
  },
  breakdownTotalLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  breakdownTotalVal: { fontSize: 15, fontWeight: '800', fontFamily: 'Inter_700Bold' },

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
