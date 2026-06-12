import { MessageContent } from '@/components/MessageContent';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { ChatMessage, Chapter, Subject, Topic } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type PickerType = 'subject' | 'chapter' | 'topic' | null;

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    subjectId?: string;
    subjectName?: string;
    chapterId?: string;
    chapterName?: string;
    topicId?: string;
    topicName?: string;
  }>();

  const { boardId, boardName, standardId, standardName, addChatSession } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [selSubjectId, setSelSubjectId] = useState(params.subjectId ?? '');
  const [selSubjectName, setSelSubjectName] = useState(params.subjectName ?? '');
  const [selChapterId, setSelChapterId] = useState(params.chapterId ?? '');
  const [selChapterName, setSelChapterName] = useState(params.chapterName ?? '');
  const [selTopicId, setSelTopicId] = useState(params.topicId ?? '');
  const [selTopicName, setSelTopicName] = useState(params.topicName ?? '');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const [openPicker, setOpenPicker] = useState<PickerType>(null);

  useEffect(() => {
    if (!boardId || !standardId) return;
    setSubjectsLoading(true);
    eduApi
      .getSubjects(boardId, standardId)
      .then(setSubjects)
      .catch(() => {})
      .finally(() => setSubjectsLoading(false));
  }, [boardId, standardId]);

  useEffect(() => {
    if (!boardId || !standardId || !selSubjectId) {
      setChapters([]);
      return;
    }
    setChaptersLoading(true);
    eduApi
      .getChapters(boardId, standardId, selSubjectId)
      .then(setChapters)
      .catch(() => {})
      .finally(() => setChaptersLoading(false));
  }, [boardId, standardId, selSubjectId]);

  useEffect(() => {
    if (!boardId || !standardId || !selSubjectId || !selChapterId) {
      setTopics([]);
      return;
    }
    setTopicsLoading(true);
    eduApi
      .getTopics(boardId, standardId, selSubjectId, selChapterId)
      .then(setTopics)
      .catch(() => {})
      .finally(() => setTopicsLoading(false));
  }, [boardId, standardId, selSubjectId, selChapterId]);

  const pickSubject = (item: Subject) => {
    const id = getId(item);
    if (id !== selSubjectId) {
      setSelSubjectId(id);
      setSelSubjectName(item.name);
      setSelChapterId('');
      setSelChapterName('');
      setSelTopicId('');
      setSelTopicName('');
    }
    setOpenPicker(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickChapter = (item: Chapter) => {
    const id = getId(item);
    if (id !== selChapterId) {
      setSelChapterId(id);
      setSelChapterName(item.name);
      setSelTopicId('');
      setSelTopicName('');
    }
    setOpenPicker(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickTopic = (item: Topic) => {
    const id = getId(item);
    setSelTopicId(id);
    setSelTopicName(item.name);
    setOpenPicker(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const contextTitle = selTopicName || selChapterName || selSubjectName || 'AI Tutor';
  const contextSub = selTopicName
    ? `${selSubjectName} • ${selChapterName}`
    : selChapterName
    ? `${selSubjectName} • ${selChapterName}`
    : selSubjectName || 'Select a subject to start';

  const canSend = !!selSubjectId && !!input.trim() && !isLoading;

  const sendMessage = async () => {
    if (!canSend) return;
    const text = input.trim();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: Message = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}_u`,
      role: 'user',
      content: text,
    };

    const currentMessages = messages;
    setMessages((prev) => [userMsg, ...prev]);
    setIsLoading(true);

    try {
      const history: ChatMessage[] = [...currentMessages]
        .reverse()
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await eduApi.chat({
        message: text,
        history,
        board: boardName ?? boardId ?? '',
        standard: standardName ?? standardId ?? '',
        filters: {
          subject: selSubjectName,
          chapter: selChapterName || undefined,
        },
      });

      const responseText =
        (res as any)?.response ??
        (res as any)?.message ??
        (res as any)?.text ??
        (res as any)?.answer ??
        'I received your message but could not parse the response.';

      const aiMsg: Message = {
        id: Date.now().toString() + 'a',
        role: 'assistant',
        content: String(responseText),
      };
      setMessages((prev) => {
        if (prev.length === 0) {
          addChatSession({
            subjectName: selSubjectName,
            chapterName: selChapterName || undefined,
            topicName: selTopicName || undefined,
            timestamp: Date.now(),
          }).catch(() => {});
        }
        return [aiMsg, ...prev];
      });
    } catch {
      const errMsg: Message = {
        id: Date.now().toString() + 'e',
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your connection and try again.',
      };
      setMessages((prev) => [errMsg, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const pickerData =
    openPicker === 'subject'
      ? subjects
      : openPicker === 'chapter'
      ? chapters
      : openPicker === 'topic'
      ? topics
      : [];

  const pickerLoading =
    openPicker === 'subject'
      ? subjectsLoading
      : openPicker === 'chapter'
      ? chaptersLoading
      : topicsLoading;

  const pickerTitle =
    openPicker === 'subject'
      ? 'Select Subject'
      : openPicker === 'chapter'
      ? 'Select Chapter'
      : 'Select Topic';

  const pickerSelected =
    openPicker === 'subject'
      ? selSubjectId
      : openPicker === 'chapter'
      ? selChapterId
      : selTopicId;

  const onPickerSelect = (item: any) => {
    if (openPicker === 'subject') pickSubject(item as Subject);
    else if (openPicker === 'chapter') pickChapter(item as Chapter);
    else pickTopic(item as Topic);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <Pressable onPress={() => router.back()} style={styles.backCircle}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerAvatar}>
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>AI Tutor</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{contextSub}</Text>
        </View>

        <View style={styles.aiLivePill}>
          <View style={styles.aiLiveDot} />
          <Text style={styles.aiLiveText}>Live</Text>
        </View>
      </LinearGradient>

      <View style={[styles.selectorBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
          <Pressable
            style={[
              styles.selectorPill,
              {
                backgroundColor: selSubjectId ? colors.primaryLight : colors.background,
                borderColor: selSubjectId ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setOpenPicker('subject')}
          >
            {subjectsLoading && !selSubjectId ? (
              <ActivityIndicator size={12} color={colors.primary} />
            ) : (
              <Ionicons name="book-outline" size={13} color={selSubjectId ? colors.primary : colors.mutedForeground} />
            )}
            <Text
              style={[
                styles.selectorText,
                { color: selSubjectId ? colors.primary : colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {selSubjectName || 'Subject'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={selSubjectId ? colors.primary : colors.mutedForeground} />
          </Pressable>

          <View style={[styles.selectorArrow, { opacity: selSubjectId ? 1 : 0.3 }]}>
            <Ionicons name="chevron-forward" size={13} color={colors.mutedForeground} />
          </View>

          <Pressable
            style={[
              styles.selectorPill,
              {
                backgroundColor: selChapterId ? colors.primaryLight : colors.background,
                borderColor: selChapterId ? colors.primary : colors.border,
                opacity: selSubjectId ? 1 : 0.45,
              },
            ]}
            onPress={() => selSubjectId && setOpenPicker('chapter')}
          >
            {chaptersLoading ? (
              <ActivityIndicator size={12} color={colors.primary} />
            ) : (
              <Ionicons name="layers-outline" size={13} color={selChapterId ? colors.primary : colors.mutedForeground} />
            )}
            <Text
              style={[
                styles.selectorText,
                { color: selChapterId ? colors.primary : colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {selChapterName || 'Chapter'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={selChapterId ? colors.primary : colors.mutedForeground} />
          </Pressable>

          <View style={[styles.selectorArrow, { opacity: selChapterId ? 1 : 0.3 }]}>
            <Ionicons name="chevron-forward" size={13} color={colors.mutedForeground} />
          </View>

          <Pressable
            style={[
              styles.selectorPill,
              {
                backgroundColor: selTopicId ? colors.primaryLight : colors.background,
                borderColor: selTopicId ? colors.primary : colors.border,
                opacity: selChapterId ? 1 : 0.45,
              },
            ]}
            onPress={() => selChapterId && setOpenPicker('topic')}
          >
            {topicsLoading ? (
              <ActivityIndicator size={12} color={colors.primary} />
            ) : (
              <Ionicons name="list-outline" size={13} color={selTopicId ? colors.primary : colors.mutedForeground} />
            )}
            <Text
              style={[
                styles.selectorText,
                { color: selTopicId ? colors.primary : colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {selTopicName || 'Topic'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={selTopicId ? colors.primary : colors.mutedForeground} />
          </Pressable>
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={styles.kav} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            isLoading ? (
              <View style={[styles.typingBubble, { backgroundColor: colors.card }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Thinking...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
                </View>
                {selSubjectId ? (
                  <>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Ask me anything about</Text>
                    <Text style={[styles.emptyTopic, { color: colors.primary }]}>{contextTitle}</Text>
                    <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                      I can explain concepts, solve problems, and answer all your questions.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Select a subject above</Text>
                    <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                      Choose a subject (and optionally a chapter or topic) to focus your AI chat session.
                    </Text>
                  </>
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowAI]}>
              {item.role === 'assistant' && (
                <View style={[styles.msgAvatar, { backgroundColor: colors.primary }]}>
                  <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                </View>
              )}
              <View
                style={[
                  styles.msgBubble,
                  item.role === 'user'
                    ? [styles.msgBubbleUser, { backgroundColor: colors.primary }]
                    : [styles.msgBubbleAI, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }],
                ]}
              >
                <MessageContent
                  content={item.content}
                  isUser={item.role === 'user'}
                  primaryColor={colors.primary}
                  textColor={colors.text}
                  cardColor={colors.card}
                  borderColor={colors.border}
                  mutedColor={colors.mutedForeground}
                />
              </View>
            </View>
          )}
        />

        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={selSubjectId ? `Ask about ${contextTitle}...` : 'Select a subject first...'}
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="default"
            maxLength={1000}
            editable={!!selSubjectId}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: canSend ? colors.primary : colors.secondary }]}
            onPress={sendMessage}
            disabled={!canSend}
          >
            <Ionicons name="send" size={17} color={canSend ? '#FFFFFF' : colors.mutedForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={openPicker !== null} transparent animationType="slide" onRequestClose={() => setOpenPicker(null)}>
        <TouchableWithoutFeedback onPress={() => setOpenPicker(null)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{pickerTitle}</Text>
            <Pressable onPress={() => setOpenPicker(null)} style={[styles.sheetClose, { backgroundColor: colors.background }]}>
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {pickerLoading ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.sheetLoadingText, { color: colors.mutedForeground }]}>Loading...</Text>
            </View>
          ) : pickerData.length === 0 ? (
            <View style={styles.sheetLoading}>
              <Ionicons name="alert-circle-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.sheetLoadingText, { color: colors.mutedForeground }]}>No options found</Text>
            </View>
          ) : (
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {pickerData.map((item: any) => {
                const id = getId(item);
                const isSelected = id === pickerSelected;
                return (
                  <Pressable
                    key={id}
                    style={[
                      styles.sheetItem,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                        borderBottomColor: colors.border,
                      },
                    ]}
                    onPress={() => onPickerSelect(item)}
                  >
                    <Text
                      style={[
                        styles.sheetItemText,
                        { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '400' },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -40,
  },
  blob2: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: -20,
  },
  backCircle: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  aiLivePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  aiLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  aiLiveText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },

  selectorBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  selectorScroll: {
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    maxWidth: 160,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 100,
  },
  selectorArrow: {
    paddingHorizontal: 2,
  },

  kav: { flex: 1 },
  messageList: { padding: 16, gap: 6, flexGrow: 1 },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: {
    width: 78, height: 78, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyTopic: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 4 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 6,
  },
  typingText: { fontSize: 13 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  msgBubble: { maxWidth: '78%', borderRadius: 18, padding: 13 },
  msgBubbleUser: { borderBottomRightRadius: 4 },
  msgBubbleAI: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 10,
  },
  textInput: {
    flex: 1, borderRadius: 22, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 120,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '72%',
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
    justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetClose: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetLoading: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 48, gap: 12,
  },
  sheetLoadingText: { fontSize: 14 },
  sheetList: { paddingHorizontal: 8 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginHorizontal: 4,
    marginBottom: 2,
  },
  sheetItemText: { fontSize: 15, flex: 1, marginRight: 8 },
});
