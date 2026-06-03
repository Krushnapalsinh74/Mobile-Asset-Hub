import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi } from '@/services/api';
import type { ChatMessage } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const {
    subjectId,
    subjectName,
    chapterId,
    chapterName,
    topicId,
    topicName,
  } = useLocalSearchParams<{
    subjectId: string;
    subjectName: string;
    chapterId?: string;
    chapterName?: string;
    topicId?: string;
    topicName?: string;
  }>();
  const { boardId, boardName, standardId, standardName } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const contextTitle = topicName || chapterName || subjectName;
  const contextSub = topicName
    ? `${subjectName} • ${chapterName}`
    : chapterName
    ? `${subjectName} • ${chapterName}`
    : subjectName;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString() + 'u',
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
        context: {
          board: boardId ?? boardName ?? '',
          standard: standardId ?? standardName ?? '',
          subject: subjectName,
          chapter: chapterName,
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
      setMessages((prev) => [aiMsg, ...prev]);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="sparkles" size={17} color="#FFFFFF" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Tutor</Text>
          <Text
            style={[styles.headerSub, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {contextSub}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          ListHeaderComponent={
            isLoading ? (
              <View style={[styles.typingBubble, { backgroundColor: colors.card }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.typingText, { color: colors.mutedForeground }]}>
                  Thinking...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Ask me anything about
                </Text>
                <Text style={[styles.emptyTopic, { color: colors.primary }]}>
                  {contextTitle}
                </Text>
                <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                  I can explain concepts, solve problems, and answer all your questions.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.msgRow,
                item.role === 'user' ? styles.msgRowUser : styles.msgRowAI,
              ]}
            >
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
                    : [
                        styles.msgBubbleAI,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                      ],
                ]}
              >
                <Text
                  style={[
                    styles.msgText,
                    { color: item.role === 'user' ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {item.content}
                </Text>
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
            placeholder={`Ask about ${contextTitle}...`}
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="default"
            maxLength={1000}
          />
          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !isLoading ? colors.primary : colors.secondary,
              },
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={17}
              color={input.trim() && !isLoading ? '#FFFFFF' : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerBack: { padding: 4 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  kav: { flex: 1 },
  messageList: { padding: 16, gap: 6, flexGrow: 1 },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  emptyTopic: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  typingText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBubble: { maxWidth: '78%', borderRadius: 18, padding: 13 },
  msgBubbleUser: { borderBottomRightRadius: 4 },
  msgBubbleAI: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    fontFamily: 'Inter_400Regular',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
