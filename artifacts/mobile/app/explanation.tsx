import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi } from '@/services/api';
import { LANGUAGES, translateText } from '@/services/translate';
import type { Language } from '@/services/translate';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
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
            <Text key={i} style={[styles.heading3, { color: colors.text }]}>
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
        if (!line.trim()) return <View key={i} style={{ height: 6 }} />;
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

function LanguagePicker({
  visible,
  selected,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  selected: Language;
  onSelect: (lang: Language) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Choose Language</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {LANGUAGES.map((lang) => {
            const active = lang.code === selected.code;
            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.langRow,
                  {
                    backgroundColor: active ? colors.primaryLight : 'transparent',
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(lang);
                  onClose();
                }}
              >
                <View style={styles.langTexts}>
                  <Text style={[styles.langNative, { color: active ? colors.primary : colors.text }]}>
                    {lang.native}
                  </Text>
                  <Text style={[styles.langName, { color: colors.mutedForeground }]}>
                    {lang.name}
                  </Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
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
  const { boardId, boardName, standardId, standardName } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const query = useQuery({
    queryKey: ['topic-details', subjectId, chapterId, topicId],
    queryFn: () =>
      eduApi.getTopicDetails({
        board: boardId ?? boardName ?? '',
        standard: standardId ?? standardName ?? '',
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

  const handleSelectLanguage = useCallback(
    async (lang: Language) => {
      setSelectedLang(lang);
      setTranslatedText(null);
      if (lang.code === 'en' || !rawContent) return;

      setTranslating(true);
      setProgress(0);
      Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }).start();

      try {
        const result = await translateText(rawContent, lang.code, (pct) => {
          setProgress(pct);
          Animated.timing(progressAnim, {
            toValue: pct / 100,
            duration: 200,
            useNativeDriver: false,
          }).start();
        });
        setTranslatedText(result);
      } catch {
        setTranslatedText(null);
      } finally {
        setTranslating(false);
      }
    },
    [rawContent, progressAnim],
  );

  useEffect(() => {
    if (rawContent && selectedLang.code !== 'en') {
      handleSelectLanguage(selectedLang);
    }
  }, [rawContent]);

  const displayContent = selectedLang.code === 'en' ? rawContent : (translatedText ?? rawContent);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0) + 8;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.secondary }]}
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={[styles.headerTopicName, { color: colors.text }]} numberOfLines={1}>
              {topicName}
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {subjectName} · {chapterName}
            </Text>
          </View>
          <Pressable
            style={[styles.langBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPickerVisible(true);
            }}
          >
            <Ionicons name="language-outline" size={15} color={colors.primary} />
            <Text style={[styles.langBtnText, { color: colors.primary }]}>
              {selectedLang.native}
            </Text>
          </Pressable>
        </View>
      </View>

      {translating && (
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      )}

      {translating && (
        <View style={styles.translatingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.translatingText, { color: colors.mutedForeground }]}>
            Translating to {selectedLang.name}... {progress}%
          </Text>
        </View>
      )}

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

      {query.data && !query.isLoading && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.explanationCard, { backgroundColor: colors.card }]}>
            {translating && !translatedText ? (
              <View style={styles.transLoadWrap}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.translatingText, { color: colors.mutedForeground }]}>
                  Translating content...
                </Text>
              </View>
            ) : (
              <FormattedText text={displayContent} colors={colors} />
            )}
          </View>
        </ScrollView>
      )}

      <LanguagePicker
        visible={pickerVisible}
        selected={selectedLang}
        onSelect={handleSelectLanguage}
        onClose={() => setPickerVisible(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1 },
  headerTopicName: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    maxWidth: 70,
  },
  progressBar: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  translatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  translatingText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
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
  transLoadWrap: { alignItems: 'center', gap: 10, paddingVertical: 24 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  langTexts: { flex: 1 },
  langNative: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  langName: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
