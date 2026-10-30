import { MessageContent } from '@/components/MessageContent';
import { DesktopHeaderNav } from '@/components/DesktopHeaderNav';
import { useApp } from '@/context/AppContext';
import type { ChatMessage, ChatSession } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Chapter, Subject, Topic } from '@/services/api';
import { sendGroqChat } from '@/services/groq';
import { APP_NAME, APP_TAGLINE, KNOWLEDGE_PARK_LOGO_DATA_URL } from '@/constants/branding';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PickerType = 'subject' | 'chapter' | 'topic' | 'language' | null;

export interface ChatLanguageOption {
  code: string;
  label: string;
  native: string;
  flag: string;
}

export const CHAT_LANGUAGES: ChatLanguageOption[] = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'hinglish', label: 'Hinglish', native: 'Hinglish / Gujlish', flag: '✨' },
];

const STARTER_PROMPTS = [
  'Explain this topic step-by-step with simple examples',
  '📄 Create a custom Question Paper PDF for this topic',
  '🚀 Test me with an interactive practice quiz',
  '🃏 Open revision flashcards for key formulas',
  'Give me 3 practice problems with full solutions',
  'What are common exam pitfalls to avoid in this topic?',
];

export const COPILOT_FEATURE_ACTIONS = [
  {
    id: 'snap',
    label: 'Snap & Solve',
    icon: 'camera-outline',
    color: '#C85C3E',
    prompt: 'I have a photo/diagram of a problem. Please analyze and solve it step-by-step.',
  },
  {
    id: 'mistakes',
    label: 'Diagnose Mistakes',
    icon: 'bandage-outline',
    color: '#DC2626',
    prompt: 'Please analyze my past test mistakes from my review bank, diagnose why I got them wrong, and give me a corrective practice question.',
  },
  {
    id: 'cheatsheet',
    label: 'Formula Cheat Sheet',
    icon: 'newspaper-outline',
    color: '#D97706',
    prompt: 'I want a Formula Cheat Sheet for this chapter. First, survey and list all the key data, formulas, derivations, and SI units available in this chapter. Then ask me what I need from this all, and provide the option to print or save as PDF!',
  },
  {
    id: 'viva',
    label: 'Oral Viva Examiner',
    icon: 'mic-outline',
    color: '#7C3AED',
    prompt: 'Act as my Board Exam oral viva examiner. Ask me 1 question at a time, wait for my answer, grade me out of 5, and give feedback.',
  },
  {
    id: 'plan',
    label: 'Daily Study Plan',
    icon: 'calendar-outline',
    color: '#059669',
    prompt: 'Based on my test history, streak, and weak topics, create a personalized daily study plan and exam countdown schedule.',
  },
  {
    id: 'pyq',
    label: 'PYQ Trends',
    icon: 'analytics-outline',
    color: '#2563EB',
    prompt: 'Analyze Gujarat Board (GSEB) and CBSE previous years questions (PYQs) for this topic and highlight high-weightage 3-mark and 5-mark questions.',
  },
  {
    id: 'notes_to_mcq',
    label: 'Notes ➔ MCQs',
    icon: 'flash-outline',
    color: '#EA580C',
    prompt: 'I want to convert my study notes into practice MCQs and flashcards. Please guide me on what notes to paste.',
  },
];

const ACTIVE_CHAT_KEY = '@edu:active_chat_session';

/**
 * Convert any image URI (blob:, file:, or existing data:) to a standard base64 data URL.
 * Required so multimodal vision models on Groq can inspect and solve the student's diagram or problem photo.
 */
async function resolveImageAsDataUrl(uri: string): Promise<string | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith('data:image/')) return uri;

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          resolve(uri);
        }
      };
      reader.onerror = () => resolve(uri);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not convert image URI to base64 data URL:', err);
    return uri;
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function printHtmlOnWeb(html: string) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=950,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.warn('Popup print trigger warning:', e);
      }
    }, 600);
    return;
  }

  const oldFrame = document.getElementById('__chat_notes_print_frame__');
  if (oldFrame && oldFrame.parentNode) {
    oldFrame.parentNode.removeChild(oldFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = '__chat_notes_print_frame__';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print warning:', err);
      }
    }, 600);
  }
}

function generateRevisionNotesHtml(opts: {
  subjectName?: string;
  chapterName?: string;
  topicName?: string;
  studentName?: string;
  boardName?: string;
  standardName?: string;
  messages: ChatMessage[];
}): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = opts.subjectName || 'Knowledge Park · AI Doubt Session';
  const chapter = opts.chapterName || 'Comprehensive Topic Breakdown';
  const topic = opts.topicName ? ` · ${opts.topicName}` : '';
  const student = opts.studentName || 'Student';
  const standard = opts.standardName || '';

  // Render conversation turns in chronological order
  const chronological = [...opts.messages].reverse();

  let userCount = 0;
  const renderedExchanges = chronological
    .map((msg) => {
      const isUser = msg.role === 'user';
      if (isUser) userCount++;
      const roleTitle = isUser ? `Student Doubt #${userCount}` : 'AI Tutor Solution & Concept Breakdown';
      const roleBadgeBg = isUser ? '#FDF2E9' : '#EDE9FE';
      const roleBadgeColor = isUser ? '#C85C3E' : '#7C3AED';
      const bubbleBg = isUser ? '#FAF6F0' : '#FFFFFF';
      const bubbleBorder = isUser ? '#EADDD0' : '#DDD6FE';

      let formatted = escapeHtml(msg.content)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:#F3F4F6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;">$1</code>')
        .replace(/\n\n/g, '<p style="margin:8px 0;"></p>')
        .replace(/\n/g, '<br/>');

      const imgTag = msg.imageUri
        ? `<div style="margin:10px 0;"><img src="${msg.imageUri}" style="max-width:320px;max-height:220px;border-radius:8px;border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.1);display:block;" alt="Attached Problem" /></div>`
        : '';

      return `
        <div style="margin-bottom:18px;page-break-inside:avoid;border-radius:12px;border:1.5px solid ${bubbleBorder};background:${bubbleBg};padding:14px 18px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:3px 10px;border-radius:20px;background:${roleBadgeBg};color:${roleBadgeColor};">
              ${isUser ? '👤 ' : '✨ '}${roleTitle}
            </span>
            <span style="font-size:10px;color:#9CA3AF;">${new Date(msg.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          ${imgTag}
          <div style="font-size:13px;line-height:1.65;color:#1F2937;">
            ${formatted}
          </div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(subject)} Revision Notes - Knowledge Park Academy</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 16mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #C85C3E;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      height: 48px;
      object-fit: contain;
    }
    .inst-name {
      font-size: 18px;
      font-weight: 800;
      color: #3D2D27;
      letter-spacing: -0.3px;
    }
    .inst-sub {
      font-size: 10px;
      color: #76645B;
      font-weight: 500;
      margin-top: 2px;
    }
    .badge-rev {
      background: #FDF2E9;
      border: 1px solid #F5C6B3;
      color: #C85C3E;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
      font-size: 11.5px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-lbl {
      color: #6B7280;
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .meta-val {
      color: #111827;
      font-weight: 700;
      margin-top: 1px;
    }
    .footer {
      margin-top: 24px;
      border-top: 1px dashed #D1D5DB;
      padding-top: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">
      <img src="${KNOWLEDGE_PARK_LOGO_DATA_URL}" class="logo-img" alt="Knowledge Park Logo" />
      <div>
        <div class="inst-name">${APP_NAME}</div>
        <div class="inst-sub">${APP_TAGLINE} · AI Tutor Revision Notes</div>
      </div>
    </div>
    <div class="badge-rev">AI Tutor Revision Sheet</div>
  </div>

  <div class="meta-card">
    <div class="meta-item">
      <span class="meta-lbl">Subject</span>
      <span class="meta-val">${escapeHtml(subject)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-lbl">Chapter</span>
      <span class="meta-val">${escapeHtml(chapter)}${escapeHtml(topic)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-lbl">Student</span>
      <span class="meta-val">${escapeHtml(student)}${standard ? ` (${escapeHtml(standard)})` : ''}</span>
    </div>
    <div class="meta-item">
      <span class="meta-lbl">Date & Time</span>
      <span class="meta-val">${dateStr}</span>
    </div>
    <div class="meta-item">
      <span class="meta-lbl">Doubt Exchanges</span>
      <span class="meta-val">${userCount} Doubts Solved</span>
    </div>
  </div>

  <div class="content">
    ${renderedExchanges}
  </div>

  <div class="footer">
    <span>Certified AI Tutoring Notes · Knowledge Park Academy</span>
    <span>Generated by ${APP_NAME} AI Assessment & Doubt System</span>
  </div>
</body>
</html>
  `;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    subjectId?: string; subjectName?: string;
    chapterId?: string; chapterName?: string;
    topicId?: string; topicName?: string;
    sessionId?: string;
    initialPrompt?: string;
    autoSend?: string;
  }>();

  const {
    boardId,
    boardName,
    standardId,
    standardName,
    studentName,
    studentEmail,
    testHistory,
    savedQuestions,
    mistakeQuestions,
    lastStudied,
    isPremium,
    chatHistory,
    addChatSession,
    deleteChatSession,
  } = useApp();

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [activeSessionId, setActiveSessionId] = useState<string>(
    params.sessionId || `${Date.now()}`
  );
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const recognitionRef = useRef<any>(null);
  const initialPromptHandledRef = useRef(false);
  const baseInputRef = useRef<string>('');

  const [selSubjectId, setSelSubjectId] = useState(params.subjectId ?? '');
  const [selSubjectName, setSelSubjectName] = useState(params.subjectName ?? '');
  const [selChapterId, setSelChapterId] = useState(params.chapterId ?? '');
  const [selChapterName, setSelChapterName] = useState(params.chapterName ?? '');
  const [selTopicId, setSelTopicId] = useState(params.topicId ?? '');
  const [selTopicName, setSelTopicName] = useState(params.topicName ?? '');
  const [selLanguage, setSelLanguage] = useState<string>('en');
  const selLanguageObj =
    CHAT_LANGUAGES.find((l) => l.code === selLanguage) ?? CHAT_LANGUAGES[0];

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [openPicker, setOpenPicker] = useState<PickerType>(null);

  // Load subject/chapter/topic hierarchy
  useEffect(() => {
    if (!boardId || !standardId) return;
    setSubjectsLoading(true);
    eduApi.getSubjects(boardId, standardId)
      .then((res) => {
        setSubjects(res);
        if (!selSubjectId && res.length > 0 && !params.subjectId) {
          // Default to first subject if none selected
          setSelSubjectId(getId(res[0]));
          setSelSubjectName(res[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setSubjectsLoading(false));
  }, [boardId, standardId]);

  useEffect(() => {
    if (!boardId || !standardId || !selSubjectId) { setChapters([]); return; }
    setChaptersLoading(true);
    eduApi.getChapters(boardId, standardId, selSubjectId).then(setChapters).catch(() => {}).finally(() => setChaptersLoading(false));
  }, [boardId, standardId, selSubjectId]);

  useEffect(() => {
    if (!boardId || !standardId || !selSubjectId || !selChapterId) { setTopics([]); return; }
    setTopicsLoading(true);
    eduApi.getTopics(boardId, standardId, selSubjectId, selChapterId).then(setTopics).catch(() => {}).finally(() => setTopicsLoading(false));
  }, [boardId, standardId, selSubjectId, selChapterId]);

  // Load requested or last active session
  useEffect(() => {
    async function loadInitialSession() {
      if (params.sessionId) {
        const found = chatHistory.find(
          (s) => s.id === params.sessionId || String(s.timestamp) === params.sessionId
        );
        if (found) {
          setActiveSessionId(found.id || String(found.timestamp));
          setSessionStartTime(found.timestamp);
          if (found.messages && found.messages.length > 0) {
            setMessages(found.messages);
          }
          if (found.subjectName) setSelSubjectName(found.subjectName);
          if (found.chapterName) setSelChapterName(found.chapterName);
          if (found.topicName) setSelTopicName(found.topicName);
          if (found.language) setSelLanguage(found.language);
          return;
        }
      }

      // Check active chat session cache
      try {
        const cached = await AsyncStorage.getItem(ACTIVE_CHAT_KEY);
        if (cached) {
          const parsed: ChatSession = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            setActiveSessionId(parsed.id || String(parsed.timestamp));
            setSessionStartTime(parsed.timestamp || Date.now());
            setMessages(parsed.messages);
            if (parsed.subjectName && !selSubjectName) setSelSubjectName(parsed.subjectName);
            if (parsed.chapterName && !selChapterName) setSelChapterName(parsed.chapterName);
            if (parsed.topicName && !selTopicName) setSelTopicName(parsed.topicName);
            if (parsed.language) setSelLanguage(parsed.language);
          }
        }
      } catch {}
    }

    loadInitialSession();
  }, [params.sessionId]);

  // Support clipboard paste (Ctrl+V / Cmd+V) and drag-and-drop of problem images on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              if (typeof loadEvt.target?.result === 'string') {
                setAttachedImage(loadEvt.target.result);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            if (typeof loadEvt.target?.result === 'string') {
              setAttachedImage(loadEvt.target.result);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

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
    setSelTopicId(getId(item));
    setSelTopicName(item.name);
    setOpenPicker(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const contextTitle = selTopicName || selChapterName || selSubjectName || 'General Doubt';
  const contextSub = `${[selSubjectName, selChapterName, selTopicName].filter(Boolean).join(' • ') || 'Select a subject to focus'} · ${selLanguageObj.flag} ${selLanguageObj.label}`;

  const canSend = !isLoading && (!!input.trim() || !!attachedImage);

  // Image capture / picker for Snap & Solve
  const pickImage = async (useCamera: boolean = false) => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            `Knowledge Park needs access to your ${useCamera ? 'camera' : 'photo library'} to solve diagrams and questions.`
          );
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: true,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let uriToStore = asset.uri;
        if (asset.base64) {
          const mime = asset.mimeType || (asset.uri?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
          uriToStore = `data:${mime};base64,${asset.base64}`;
        } else {
          const resolved = await resolveImageAsDataUrl(asset.uri);
          if (resolved) uriToStore = resolved;
        }
        setAttachedImage(uriToStore);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      Alert.alert('Error', 'Unable to pick image. Please try again.');
    }
  };

  const handleSnapAndSolve = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      pickImage(false);
      return;
    }
    Alert.alert(
      'Snap & Solve',
      'Upload a handwritten question, textbook diagram, or numerical problem:',
      [
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Gallery', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleFeaturePress = (feature: (typeof COPILOT_FEATURE_ACTIONS)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (feature.id === 'snap') {
      handleSnapAndSolve();
    } else if (feature.id === 'cheatsheet') {
      const sub = selSubjectName || 'Physics';
      const ch = selChapterName || 'Vectors';
      const top = selTopicName ? ` (${selTopicName})` : '';
      const prompt = `I would like to create a Formula Cheat Sheet for ${sub} • ${ch}${top}.
First, please review and survey all the key data, formulas, derivations, and SI units available in this chapter:
• Core Formulas & Equations
• SI Units, Dimensions & Physical Constants
• Essential Derivations & Board Proof Steps
• Value Tables & Approximations
• Golden Exam Shortcuts & Examiner Traps

Then, ask me what specific format or sections I need from all of this to make my ideal revision sheet (or if I want the complete All-In-One Master Cheat Sheet ready for print).
Provide clear options for me to choose from, and embed the printable cheat sheet hub with the option to print or save as PDF!`;
      sendMessage(prompt);
    } else if (feature.id === 'pyq') {
      const sub = selSubjectName || 'Physics';
      const ch = selChapterName || 'Vectors';
      const top = selTopicName ? ` (${selTopicName})` : '';
      const prompt = `Analyze Gujarat Board (GSEB) and CBSE previous years questions (PYQs) for ${sub} • ${ch}${top}. Highlight the top high-weightage 3-mark conceptual questions, 5-mark derivations, and numerical favorites from the last 10 years with tips on how to score full marks.`;
      sendMessage(prompt);
    } else {
      sendMessage(feature.prompt);
    }
  };

  // Start a new chat conversation
  const handleStartNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    baseInputRef.current = '';
    const newId = `${Date.now()}`;
    setActiveSessionId(newId);
    setSessionStartTime(Date.now());
    setMessages([]);
    setAttachedImage(null);
    AsyncStorage.removeItem(ACTIVE_CHAT_KEY).catch(() => {});
  };

  // Load a historical chat session
  const handleLoadSession = (session: ChatSession) => {
    Haptics.selectionAsync();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    baseInputRef.current = '';
    setActiveSessionId(session.id || String(session.timestamp));
    setSessionStartTime(session.timestamp);
    setMessages(session.messages || []);
    setAttachedImage(null);
    if (session.subjectName) setSelSubjectName(session.subjectName);
    if (session.chapterName) setSelChapterName(session.chapterName);
    if (session.topicName) setSelTopicName(session.topicName);
    if (session.language) setSelLanguage(session.language);
    setShowHistoryModal(false);
  };

  // Delete a saved session
  const handleDeleteSession = (idOrTimestamp: string | number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    deleteChatSession(idOrTimestamp);
    if (String(idOrTimestamp) === activeSessionId) {
      handleStartNewChat();
    }
  };

  // Send message to Groq AI & persist conversation
  const sendMessage = async (overridePrompt?: string) => {
    const rawText = (overridePrompt ?? input).trim();
    if ((!rawText && !attachedImage) || isLoading) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    baseInputRef.current = '';

    const currentImg = attachedImage;
    const text =
      rawText ||
      (currentImg ? 'Please read the attached question / problem sheet carefully. Identify the chapter and topic, transcribe each question, and provide complete, step-by-step solutions.' : '');

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    setAttachedImage(null);

    const userMsg: ChatMessage = {
      id: `${Date.now()}_u`,
      role: 'user',
      content: text,
      imageUri: currentImg || undefined,
      timestamp: Date.now(),
    };

    const nextMessages = [userMsg, ...messages];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const resolvedImageUrl = currentImg ? await resolveImageAsDataUrl(currentImg) : undefined;
      const promptToSend = text;

      const contextParts: string[] = [];
      if (boardName) contextParts.push(`Board: ${boardName}`);
      if (standardName) contextParts.push(`Class: ${standardName}`);
      if (selSubjectName) contextParts.push(`Subject: ${selSubjectName}`);
      if (selChapterName) contextParts.push(`Chapter: ${selChapterName}`);
      if (selTopicName) contextParts.push(`Topic: ${selTopicName}`);

      // Feed previous turns in chronological order for conversation memory
      const chronological = [...messages].reverse();

      // Calculate streak days from activities
      const activityDates = new Set<string>();
      testHistory.forEach((t) => {
        if (t.timestamp) activityDates.add(new Date(t.timestamp).toDateString());
      });
      if (lastStudied?.timestamp) {
        activityDates.add(new Date(lastStudied.timestamp).toDateString());
      }
      activityDates.add(new Date().toDateString());
      let streakDays = 0;
      const currDate = new Date();
      while (true) {
        if (activityDates.has(currDate.toDateString())) {
          streakDays++;
          currDate.setDate(currDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Calculate test history summary
      const totalTestsTaken = testHistory.length;
      const averageScorePct =
        totalTestsTaken > 0
          ? Math.round(
              testHistory.reduce(
                (sum, t) => sum + (t.percentage ?? (t.total > 0 ? (t.score / t.total) * 100 : 0)),
                0
              ) / totalTestsTaken
            )
          : 0;

      const recentTests = testHistory
        .slice(-5)
        .reverse()
        .map((t) => ({
          subject: t.subjectName,
          chapter: t.chapterName,
          score: t.score,
          total: t.total,
          percentage: t.percentage ?? (t.total > 0 ? Math.round((t.score / t.total) * 100) : null),
          date: new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        }));

      // Summarize saved doubts
      const recentSavedQuestions = savedQuestions
        .slice(-4)
        .reverse()
        .map((q) => ({
          question: q.question,
          subject: q.subjectName,
          chapter: q.chapterName,
        }));

      // Summarize mistake review bank
      const recentMistakesTopics = [
        ...new Set(mistakeQuestions.map((m) => m.chapterName || m.subjectName).filter(Boolean)),
      ].slice(0, 4) as string[];

      const responseText = await sendGroqChat({
        message: promptToSend,
        imageUrl: resolvedImageUrl,
        history: chronological,
        context: contextParts.length > 0 ? contextParts.join(' | ') : undefined,
        boardName: boardName || undefined,
        standardName: standardName || undefined,
        subjectName: selSubjectName || undefined,
        chapterName: selChapterName || undefined,
        topicName: selTopicName || undefined,
        studentName: studentName || undefined,
        studentEmail: studentEmail || undefined,
        language: selLanguageObj.label,
        streakDays,
        savedQuestionsCount: savedQuestions.length,
        recentSavedQuestions,
        testHistorySummary: {
          totalTestsTaken,
          averageScorePct,
          recentTests,
        },
        recentMistakesSummary: {
          mistakeCount: mistakeQuestions.length,
          recentTopics: recentMistakesTopics,
        },
        subscriptionPlan: isPremium ? 'Knowledge Park Pro Member' : 'Free Student Plan',
      });

      const aiMsg: ChatMessage = {
        id: `${Date.now()}_a`,
        role: 'assistant',
        content: String(responseText),
        timestamp: Date.now(),
      };

      const finalMessages = [aiMsg, ...nextMessages];
      setMessages(finalMessages);

      // SAVE CHAT SESSION IMMEDIATELY IN APP STATE & ASYNCSTORAGE
      const sessionToSave: ChatSession = {
        id: activeSessionId,
        subjectName: selSubjectName || 'Study Room',
        chapterName: selChapterName || undefined,
        topicName: selTopicName || undefined,
        timestamp: sessionStartTime,
        messages: finalMessages,
        lastMessage: text.slice(0, 100),
        language: selLanguage,
      };

      await addChatSession(sessionToSave);
      await AsyncStorage.setItem(ACTIVE_CHAT_KEY, JSON.stringify(sessionToSave)).catch(() => {});
    } catch (err: any) {
      console.error('AI Tutor chat error:', err);
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate limit');
      const errorMsg: ChatMessage = {
        id: `${Date.now()}_e`,
        role: 'assistant',
        content: isRateLimit
          ? '⏳ The AI service is currently processing high student demand. Please wait a few seconds and tap send again.'
          : 'I encountered a temporary connection issue communicating with the AI Tutor service. Please check your connection and tap send to try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [errorMsg, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  // Support initialPrompt & autoSend (e.g. from 1-tap "Ask AI Tutor" on test mistakes)
  useEffect(() => {
    if (params.initialPrompt && !initialPromptHandledRef.current) {
      initialPromptHandledRef.current = true;
      if (params.autoSend === '1') {
        const newSid = `${Date.now()}`;
        setActiveSessionId(newSid);
        setSessionStartTime(Date.now());
        sendMessage(params.initialPrompt);
      } else {
        setInput(params.initialPrompt);
      }
    }
  }, [params.initialPrompt, params.autoSend]);

  // Voice Doubt Solving using Web Speech Recognition API
  const toggleVoiceInput = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      Alert.alert('Voice Input', 'Voice doubt solving is supported in web browsers (Chrome, Edge, Safari).');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Alert.alert(
        'Speech Recognition Unavailable',
        'Your browser does not support Web Speech Recognition. Please use Chrome, Edge, or Safari for voice doubt solving.'
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    try {
      // Snapshot existing text input before speech begins so speech doesn't duplicate or erase it
      baseInputRef.current = input.trim();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selLanguage === 'gu' ? 'gu-IN' : selLanguage === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          sessionTranscript += event.results[i][0].transcript;
        }
        const clean = sessionTranscript.trim();
        if (clean) {
          const base = baseInputRef.current;
          setInput(base ? `${base} ${clean}` : clean);
        }
      };

      recognition.onerror = (err: any) => {
        if (err?.error !== 'no-speech' && err?.error !== 'aborted') {
          console.warn('Speech recognition error:', err?.error || err);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Export active conversation as clean printable Revision Notes PDF
  const handleExportNotes = async () => {
    if (!messages.length) {
      Alert.alert('No Notes to Export', 'Ask the AI Tutor a question first to generate revision notes.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExporting(true);
    try {
      const html = generateRevisionNotesHtml({
        subjectName: selSubjectName,
        chapterName: selChapterName,
        topicName: selTopicName,
        studentName: studentName || undefined,
        boardName: (boardName || boardId) || undefined,
        standardName: (standardName || standardId) || undefined,
        messages,
      });

      if (Platform.OS === 'web') {
        printHtmlOnWeb(html);
      } else {
        await Print.printAsync({ html });
      }
    } catch (err) {
      console.error('Failed to export revision notes:', err);
      Alert.alert('Export Error', 'Unable to generate revision notes. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 12 : 8);
  const pickerData =
    openPicker === 'subject'
      ? subjects
      : openPicker === 'chapter'
      ? chapters
      : openPicker === 'topic'
      ? topics
      : openPicker === 'language'
      ? CHAT_LANGUAGES.map((l) => ({
          id: l.code,
          name: `${l.flag}  ${l.label} (${l.native})`,
        }))
      : [];
  const pickerLoading =
    openPicker === 'subject'
      ? subjectsLoading
      : openPicker === 'chapter'
      ? chaptersLoading
      : openPicker === 'topic'
      ? topicsLoading
      : false;
  const pickerTitle =
    openPicker === 'subject'
      ? 'Select Subject'
      : openPicker === 'chapter'
      ? 'Select Chapter'
      : openPicker === 'topic'
      ? 'Select Topic'
      : 'Select AI Language';
  const pickerSelected =
    openPicker === 'subject'
      ? selSubjectId
      : openPicker === 'chapter'
      ? selChapterId
      : openPicker === 'topic'
      ? selTopicId
      : selLanguage;

  const onPickerSelect = (item: any) => {
    if (openPicker === 'subject') {
      pickSubject(item as Subject);
    } else if (openPicker === 'chapter') {
      pickChapter(item as Chapter);
    } else if (openPicker === 'topic') {
      pickTopic(item as Topic);
    } else if (openPicker === 'language') {
      const langCode = item.id || item.code || '';
      if (langCode) {
        setSelLanguage(langCode);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setOpenPicker(null);
    }
  };

  /* Chat Messages FlatList */
  const ChatMessages = (
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
            <ActivityIndicator size="small" color="#C85C3E" />
            <Text style={[styles.typingText, { color: colors.mutedForeground }]}>
              Solving & formulating response...
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="sparkles" size={36} color="#C85C3E" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Knowledge Park AI Tutor</Text>
            <Text style={[styles.emptyTopic, { color: '#C85C3E' }]}>{contextTitle}</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              Powered by Groq live inference. Ask any doubt, request step-by-step math/physics solutions, or explore concepts.
            </Text>

            {/* Quick Starter Prompts */}
            <View style={styles.starterGrid}>
              {STARTER_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  style={styles.starterPill}
                  onPress={() => sendMessage(prompt)}
                >
                  <Ionicons name="chatbubble-outline" size={13} color="#C85C3E" />
                  <Text style={styles.starterText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowAI]}>
          {item.role === 'assistant' && (
            <View style={[styles.msgAvatar, { backgroundColor: '#C85C3E' }]}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            </View>
          )}
          <View
            style={[
              styles.msgBubble,
              item.role === 'user'
                ? [styles.msgBubbleUser, { backgroundColor: '#C85C3E' }]
                : [styles.msgBubbleAI, { backgroundColor: '#FFFDF9', borderColor: '#EBDDCF', borderWidth: 1 }],
            ]}
          >
            {item.role === 'user' && item.imageUri && (
              <View style={styles.msgImageContainer}>
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.msgImage}
                  resizeMode="cover"
                />
              </View>
            )}
            <MessageContent
              content={item.content}
              isUser={item.role === 'user'}
              primaryColor="#C85C3E"
              textColor={colors.text}
              cardColor="#FFFDF9"
              borderColor="#EBDDCF"
              mutedColor={colors.mutedForeground}
              currentSubjectId={selSubjectId}
              currentSubjectName={selSubjectName}
              currentChapterId={selChapterId}
              currentChapterName={selChapterName}
              subjects={subjects}
              chapters={chapters}
              onQuickPrompt={(prompt) => sendMessage(prompt)}
            />
          </View>
        </View>
      )}
    />
  );

  /* Input Bar */
  const InputBar = (
    <View
      style={{
        backgroundColor: '#FFFDF9',
        borderTopWidth: 1,
        borderTopColor: '#ECE4D9',
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 14 : 8),
      }}
    >
      {/* 7 AI Features Quick Copilot Scroll */}
      <View style={styles.copilotBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.copilotScroll}
        >
          {COPILOT_FEATURE_ACTIONS.map((feat) => (
            <Pressable
              key={feat.id}
              style={[styles.copilotChip, { borderColor: feat.color + '40' }]}
              onPress={() => handleFeaturePress(feat)}
            >
              <Ionicons name={feat.icon as any} size={13} color={feat.color} />
              <Text style={[styles.copilotChipText, { color: feat.color }]}>
                {feat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Attached Image Preview */}
      {attachedImage && (
        <View style={styles.attachPreviewRow}>
          <Image source={{ uri: attachedImage }} style={styles.attachPreviewImg} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.attachPreviewTitle}>Photo attached for Snap & Solve</Text>
            <Text style={styles.attachPreviewSub}>The AI Tutor will analyze this diagram/numerical</Text>
          </View>
          <Pressable
            style={styles.attachRemoveBtn}
            onPress={() => setAttachedImage(null)}
            accessibilityLabel="Remove photo"
          >
            <Ionicons name="close" size={16} color="#76645B" />
          </Pressable>
        </View>
      )}

      {/* Voice Listening Active Indicator Banner */}
      {isListening && (
        <View style={styles.voiceListeningBanner}>
          <View style={styles.voicePulseDot} />
          <Text style={styles.voiceListeningText}>
            🎙️ Listening... Speak your doubt in {selLanguageObj.label} or English
          </Text>
          <Pressable onPress={toggleVoiceInput} style={styles.voiceStopBtn}>
            <Text style={styles.voiceStopText}>Done</Text>
          </Pressable>
        </View>
      )}

      {/* Input Controls */}
      <View style={styles.inputInnerRow}>
        <Pressable
          style={[styles.attachBtn, attachedImage ? { borderColor: '#C85C3E', backgroundColor: '#FDECE6' } : null]}
          onPress={handleSnapAndSolve}
          accessibilityLabel="Take photo or upload diagram"
        >
          <Ionicons name="camera-outline" size={20} color={attachedImage ? '#C85C3E' : '#76645B'} />
        </Pressable>

        <Pressable
          style={[
            styles.voiceBtn,
            isListening ? styles.voiceBtnActive : null,
          ]}
          onPress={toggleVoiceInput}
          accessibilityLabel={isListening ? "Stop listening" : "Speak doubt"}
        >
          <Ionicons
            name={isListening ? "mic" : "mic-outline"}
            size={20}
            color={isListening ? "#FFFFFF" : "#76645B"}
          />
        </Pressable>

        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: '#FAF5EF',
              color: '#3D2D27',
              borderColor: '#E8DDD0',
            },
          ]}
          placeholder={
            attachedImage
              ? 'Add details about this image (optional)...'
              : `Ask AI Tutor about ${contextTitle}...`
          }
          placeholderTextColor="#A49186"
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          blurOnSubmit={false}
          onKeyPress={(e: any) => {
            const key = e.nativeEvent?.key ?? e.key;
            const isShift = e.nativeEvent?.shiftKey ?? e.shiftKey;
            const isComposing = e.nativeEvent?.isComposing ?? (e as any).isComposing;
            if (key === 'Enter' && !isShift && !isComposing) {
              if (typeof e.preventDefault === 'function') {
                e.preventDefault();
              }
              if (canSend) {
                sendMessage();
              }
            }
          }}
          onSubmitEditing={() => {
            if (canSend) {
              sendMessage();
            }
          }}
          maxLength={2000}
        />

        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: canSend ? '#C85C3E' : '#E8DFD5' },
          ]}
          onPress={() => sendMessage()}
          disabled={!canSend}
        >
          <Ionicons name="arrow-up" size={18} color={canSend ? '#FFFFFF' : '#A49186'} />
        </Pressable>
      </View>
    </View>
  );

  /* Saved Chats Modal */
  const HistoryModal = (
    <Modal
      visible={showHistoryModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowHistoryModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowHistoryModal(false)}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      <View style={[styles.historyModalSheet, isDesktop && styles.historyModalDesktop]}>
        <View style={styles.historyModalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time" size={18} color="#C85C3E" />
            <Text style={styles.historyModalTitle}>Saved AI Conversations</Text>
          </View>
          <Pressable onPress={() => setShowHistoryModal(false)} style={styles.sheetClose}>
            <Ionicons name="close" size={18} color="#76645B" />
          </Pressable>
        </View>

        {chatHistory.length === 0 ? (
          <View style={styles.historyEmpty}>
            <Ionicons name="chatbubbles-outline" size={40} color="#C85C3E" />
            <Text style={styles.historyEmptyTitle}>No saved chats yet</Text>
            <Text style={styles.historyEmptySub}>
              Any question you ask the AI Tutor is automatically saved here so you can revisit solutions anytime.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
            {chatHistory.map((s) => {
              const sid = s.id || String(s.timestamp);
              const isActive = sid === activeSessionId;
              const dateStr = new Date(s.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Pressable
                  key={sid}
                  style={[styles.historyItem, isActive && styles.historyItemActive]}
                  onPress={() => handleLoadSession(s)}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.historySubjectTag}>
                        <Text style={styles.historySubjectText}>{s.subjectName || 'Study Room'}</Text>
                      </View>
                      <Text style={styles.historyDateText}>{dateStr}</Text>
                    </View>
                    {s.chapterName && (
                      <Text style={styles.historyChapterText} numberOfLines={1}>
                        {s.chapterName}
                      </Text>
                    )}
                    <Text style={styles.historyLastMsg} numberOfLines={2}>
                      {s.lastMessage || (s.messages?.[0]?.content ? s.messages[0].content.slice(0, 80) : 'Active session')}
                    </Text>
                  </View>

                  <Pressable
                    hitSlop={8}
                    style={styles.historyDeleteBtn}
                    onPress={() => handleDeleteSession(sid)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  /* ─── DESKTOP VIEW ─── */
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF6F0' }}>
        <View style={styles.desktopNavWrap}>
          <DesktopHeaderNav activeTab="chat" />
        </View>

        <View style={styles.desktopLayout}>
          {/* Left Sidebar */}
          <View style={styles.desktopSidebar}>
            <LinearGradient
              colors={['#C85C3E', '#A44732']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sidebarHeader}
            >
              <View style={styles.sidebarAvatarWrap}>
                <Ionicons name="sparkles" size={20} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sidebarTitle}>AI Tutor</Text>
                <Text style={styles.sidebarSub}>Groq Live Inference</Text>
              </View>
              <View style={styles.aiLivePill}>
                <View style={styles.aiLiveDot} />
                <Text style={styles.aiLiveText}>Live</Text>
              </View>
            </LinearGradient>

            {/* Quick Action Buttons */}
            <View style={styles.sidebarActionRow}>
              <Pressable style={styles.sidebarNewChatBtn} onPress={handleStartNewChat}>
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.sidebarNewChatText}>New Chat</Text>
              </Pressable>
              <Pressable style={styles.sidebarHistoryBtn} onPress={() => setShowHistoryModal(true)}>
                <Ionicons name="time-outline" size={16} color="#5E4B42" />
                <Text style={styles.sidebarHistoryText}>History ({chatHistory.length})</Text>
              </Pressable>
              <Pressable style={styles.sidebarExportBtn} onPress={handleExportNotes}>
                <Ionicons name="document-text-outline" size={16} color="#5E4B42" />
                <Text style={styles.sidebarHistoryText}>Export Notes</Text>
              </Pressable>
            </View>

            {/* Context Selectors */}
            <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarSectionLabel}>Study Focus</Text>

              {/* Subject */}
              <Pressable
                style={[styles.sidebarSelector, selSubjectId && styles.sidebarSelectorActive]}
                onPress={() => setOpenPicker('subject')}
              >
                <View style={styles.sidebarSelectorLeft}>
                  {subjectsLoading ? (
                    <ActivityIndicator size={14} color="#C85C3E" />
                  ) : (
                    <Ionicons name="book-outline" size={16} color={selSubjectId ? '#C85C3E' : '#76645B'} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sidebarSelectorLabel}>Subject</Text>
                    <Text
                      style={[
                        styles.sidebarSelectorValue,
                        selSubjectId && { color: '#C85C3E', fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {selSubjectName || 'Select subject...'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={14} color={selSubjectId ? '#C85C3E' : '#A8988C'} />
              </Pressable>

              {/* Chapter */}
              <Pressable
                style={[
                  styles.sidebarSelector,
                  selChapterId && styles.sidebarSelectorActive,
                  !selSubjectId && { opacity: 0.45 },
                ]}
                onPress={() => selSubjectId && setOpenPicker('chapter')}
              >
                <View style={styles.sidebarSelectorLeft}>
                  {chaptersLoading ? (
                    <ActivityIndicator size={14} color="#C85C3E" />
                  ) : (
                    <Ionicons name="layers-outline" size={16} color={selChapterId ? '#C85C3E' : '#76645B'} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sidebarSelectorLabel}>Chapter</Text>
                    <Text
                      style={[
                        styles.sidebarSelectorValue,
                        selChapterId && { color: '#C85C3E', fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {selChapterName || 'Select chapter...'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={14} color={selChapterId ? '#C85C3E' : '#A8988C'} />
              </Pressable>

              {/* Topic */}
              <Pressable
                style={[
                  styles.sidebarSelector,
                  selTopicId && styles.sidebarSelectorActive,
                  !selChapterId && { opacity: 0.45 },
                ]}
                onPress={() => selChapterId && setOpenPicker('topic')}>
                <View style={styles.sidebarSelectorLeft}>
                  {topicsLoading ? (
                    <ActivityIndicator size={14} color="#C85C3E" />
                  ) : (
                    <Ionicons name="list-outline" size={16} color={selTopicId ? '#C85C3E' : '#76645B'} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sidebarSelectorLabel}>Topic</Text>
                    <Text
                      style={[
                        styles.sidebarSelectorValue,
                        selTopicId && { color: '#C85C3E', fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {selTopicName || 'Select topic...'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={14} color={selTopicId ? '#C85C3E' : '#A8988C'} />
              </Pressable>

              {/* Language Selector */}
              <Pressable
                style={[styles.sidebarSelector, styles.sidebarSelectorActive]}
                onPress={() => setOpenPicker('language')}
              >
                <View style={styles.sidebarSelectorLeft}>
                  <Ionicons name="language-outline" size={16} color="#C85C3E" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sidebarSelectorLabel}>Language</Text>
                    <Text
                      style={[styles.sidebarSelectorValue, { color: '#C85C3E', fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      {selLanguageObj.flag} {selLanguageObj.label} ({selLanguageObj.native})
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={14} color="#C85C3E" />
              </Pressable>

              {/* Tips */}
              <Text style={[styles.sidebarSectionLabel, { marginTop: 20 }]}>Tutor Features</Text>
              {[
                'Step-by-step problem solver',
                'LaTeX formulas & math notation',
                'Gujarati & English bilingual clarity',
                'Auto-saved session history',
              ].map((tip) => (
                <View key={tip} style={styles.sidebarTip}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#C85C3E" />
                  <Text style={styles.sidebarTipText}>{tip}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Right Chat Area */}
          <View style={styles.desktopChatArea}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
              {ChatMessages}
              {InputBar}
            </KeyboardAvoidingView>
          </View>
        </View>

        {/* Pickers & Modals */}
        <Modal
          visible={openPicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setOpenPicker(null)}
        >
          <TouchableWithoutFeedback onPress={() => setOpenPicker(null)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={[styles.desktopModalSheet, { backgroundColor: '#FFFDF9' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{pickerTitle}</Text>
              <Pressable onPress={() => setOpenPicker(null)} style={styles.sheetClose}>
                <Ionicons name="close" size={18} color="#76645B" />
              </Pressable>
            </View>
            {pickerLoading ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator size="large" color="#C85C3E" />
                <Text style={styles.sheetLoadingText}>Loading curriculum...</Text>
              </View>
            ) : pickerData.length === 0 ? (
              <View style={styles.sheetLoading}>
                <Ionicons name="alert-circle-outline" size={36} color="#A49186" />
                <Text style={styles.sheetLoadingText}>No options found</Text>
              </View>
            ) : (
              <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                {pickerData.map((item: any) => {
                  const id = getId(item);
                  const isSelected = id === pickerSelected;
                  return (
                    <Pressable
                      key={id}
                      style={[styles.sheetItem, isSelected && { backgroundColor: '#FDECE6' }]}
                      onPress={() => onPickerSelect(item)}
                    >
                      <Text
                        style={[
                          styles.sheetItemText,
                          { color: isSelected ? '#C85C3E' : '#3D2D27', fontWeight: isSelected ? '700' : '400' },
                        ]}
                      >
                        {item.name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#C85C3E" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </Modal>

        {HistoryModal}
      </View>
    );
  }

  /* ─── MOBILE VIEW ─── */
  return (
    <View style={[styles.container, { backgroundColor: '#FAF6F0' }]}>
      {/* Flush Top App Bar */}
      <View style={[styles.mobileHeader, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/subjects');
          }}
          style={styles.mobileBackBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#3D2D27" />
        </Pressable>

        <View style={styles.mobileAvatar}>
          <Ionicons name="sparkles" size={16} color="#FFF" />
        </View>

        <View style={styles.mobileHeaderInfo}>
          <Text style={styles.mobileHeaderTitle}>AI Tutor</Text>
          <Text style={styles.mobileHeaderSub} numberOfLines={1}>{contextSub}</Text>
        </View>

        <View style={styles.mobileHeaderActions}>
          <Pressable
            style={styles.mobileExportBtn}
            onPress={handleExportNotes}
            accessibilityLabel="Export revision notes PDF"
          >
            <Ionicons name="document-text-outline" size={18} color="#C85C3E" />
          </Pressable>

          <Pressable
            style={styles.mobileNewChatBtn}
            onPress={handleStartNewChat}
            accessibilityLabel="New chat"
          >
            <Ionicons name="add" size={18} color="#C85C3E" />
          </Pressable>

          <Pressable
            style={styles.mobileHistoryBtn}
            onPress={() => setShowHistoryModal(true)}
            accessibilityLabel="Saved chats"
          >
            <Ionicons name="time-outline" size={18} color="#5E4B42" />
            {chatHistory.length > 0 && (
              <View style={styles.mobileHistoryBadge}>
                <Text style={styles.mobileHistoryBadgeText}>{chatHistory.length}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Curriculum Context Horizontal Scroll */}
      <View style={styles.selectorBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
          <Pressable
            style={[styles.selectorPill, selSubjectId && styles.selectorPillActive]}
            onPress={() => setOpenPicker('subject')}
          >
            <Ionicons name="book-outline" size={13} color={selSubjectId ? '#C85C3E' : '#76645B'} />
            <Text style={[styles.selectorText, selSubjectId && { color: '#C85C3E' }]} numberOfLines={1}>
              {selSubjectName || 'Subject'}
            </Text>
            <Ionicons name="chevron-down" size={11} color={selSubjectId ? '#C85C3E' : '#A49186'} />
          </Pressable>

          <Ionicons name="chevron-forward" size={12} color="#CFC5BA" />

          <Pressable
            style={[styles.selectorPill, selChapterId && styles.selectorPillActive, !selSubjectId && { opacity: 0.5 }]}
            onPress={() => selSubjectId && setOpenPicker('chapter')}
          >
            <Ionicons name="layers-outline" size={13} color={selChapterId ? '#C85C3E' : '#76645B'} />
            <Text style={[styles.selectorText, selChapterId && { color: '#C85C3E' }]} numberOfLines={1}>
              {selChapterName || 'Chapter'}
            </Text>
            <Ionicons name="chevron-down" size={11} color={selChapterId ? '#C85C3E' : '#A49186'} />
          </Pressable>

          <Ionicons name="chevron-forward" size={12} color="#CFC5BA" />

          <Pressable
            style={[styles.selectorPill, selTopicId && styles.selectorPillActive, !selChapterId && { opacity: 0.5 }]}
            onPress={() => selChapterId && setOpenPicker('topic')}
          >
            <Ionicons name="list-outline" size={13} color={selTopicId ? '#C85C3E' : '#76645B'} />
            <Text style={[styles.selectorText, selTopicId && { color: '#C85C3E' }]} numberOfLines={1}>
              {selTopicName || 'Topic'}
            </Text>
            <Ionicons name="chevron-down" size={11} color={selTopicId ? '#C85C3E' : '#A49186'} />
          </Pressable>

          <Ionicons name="chevron-forward" size={12} color="#CFC5BA" />

          {/* Language Selector Pill */}
          <Pressable
            style={[styles.selectorPill, styles.selectorPillActive]}
            onPress={() => setOpenPicker('language')}
          >
            <Ionicons name="language-outline" size={13} color="#C85C3E" />
            <Text style={[styles.selectorText, { color: '#C85C3E' }]} numberOfLines={1}>
              {selLanguageObj.flag} {selLanguageObj.label}
            </Text>
            <Ionicons name="chevron-down" size={11} color="#C85C3E" />
          </Pressable>
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={styles.kav} behavior="padding" keyboardVerticalOffset={0}>
        {ChatMessages}
        {InputBar}
      </KeyboardAvoidingView>

      {/* Curriculum Picker Modal */}
      <Modal
        visible={openPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenPicker(null)}
      >
        <TouchableWithoutFeedback onPress={() => setOpenPicker(null)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, { backgroundColor: '#FFFDF9', paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{pickerTitle}</Text>
            <Pressable onPress={() => setOpenPicker(null)} style={styles.sheetClose}>
              <Ionicons name="close" size={18} color="#76645B" />
            </Pressable>
          </View>
          {pickerLoading ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator size="large" color="#C85C3E" />
              <Text style={styles.sheetLoadingText}>Loading curriculum options...</Text>
            </View>
          ) : pickerData.length === 0 ? (
            <View style={styles.sheetLoading}>
              <Ionicons name="alert-circle-outline" size={36} color="#A49186" />
              <Text style={styles.sheetLoadingText}>No options found</Text>
            </View>
          ) : (
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {pickerData.map((item: any) => {
                const id = getId(item);
                const isSelected = id === pickerSelected;
                return (
                  <Pressable
                    key={id}
                    style={[styles.sheetItem, isSelected && { backgroundColor: '#FDECE6' }]}
                    onPress={() => onPickerSelect(item)}
                  >
                    <Text
                      style={[
                        styles.sheetItemText,
                        { color: isSelected ? '#C85C3E' : '#3D2D27', fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#C85C3E" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      {HistoryModal}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── DESKTOP ── */
  desktopNavWrap: { paddingHorizontal: 32, paddingTop: 24, backgroundColor: '#FAF6F0' },
  desktopLayout: { flex: 1, flexDirection: 'row', gap: 0 },
  desktopSidebar: { width: 300, backgroundColor: '#FFFDF9', borderRightWidth: 1, borderRightColor: '#E8DFD5', flexDirection: 'column' },
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18 },
  sidebarAvatarWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  sidebarTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  sidebarSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  sidebarActionRow: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: '#ECE4D9' },
  sidebarNewChatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#C85C3E', paddingVertical: 8, borderRadius: 10 },
  sidebarNewChatText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  sidebarHistoryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FAF5EF', borderWidth: 1, borderColor: '#E5DCD1', paddingVertical: 8, borderRadius: 10 },
  sidebarHistoryText: { color: '#5E4B42', fontSize: 12, fontWeight: '600' },
  sidebarScroll: { flex: 1, padding: 16 },
  sidebarSectionLabel: { fontSize: 11, fontWeight: '800', color: '#A8988C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  sidebarSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#E8DFD5', backgroundColor: '#FBF8F4', marginBottom: 10 },
  sidebarSelectorActive: { borderColor: '#C85C3E', backgroundColor: '#FFF2EB' },
  sidebarSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sidebarSelectorLabel: { fontSize: 10, fontWeight: '700', color: '#A8988C', textTransform: 'uppercase' },
  sidebarSelectorValue: { fontSize: 13, fontWeight: '600', color: '#3D2D27', marginTop: 1 },
  sidebarTip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sidebarTipText: { fontSize: 12, color: '#76645B', flex: 1, lineHeight: 16 },
  desktopChatArea: { flex: 1, backgroundColor: '#F9F6F0', flexDirection: 'column' },
  desktopModalSheet: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -200 }, { translateY: -200 }] as any, width: 400, maxHeight: 500, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, padding: 0, overflow: 'hidden' },

  /* ── MOBILE HEADER ── */
  container: { flex: 1 },
  mobileHeader: {
    backgroundColor: '#FFFDF9',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE4D9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  mobileBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3ECE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#C85C3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderInfo: { flex: 1, minWidth: 0 },
  mobileHeaderTitle: { fontSize: 17, fontWeight: '800', color: '#3D2D27' },
  mobileHeaderSub: { fontSize: 11.5, color: '#8B786D', marginTop: 1 },
  mobileHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileNewChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FDECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHistoryBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3ECE3',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mobileHistoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#C85C3E',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  mobileHistoryBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  aiLivePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  aiLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  aiLiveText: { fontSize: 10.5, color: '#FFFFFF', fontWeight: '800' },

  /* ── SELECTOR BAR ── */
  selectorBar: { backgroundColor: '#FFFDF9', borderBottomWidth: 1, borderBottomColor: '#EDE5DA', paddingVertical: 8 },
  selectorScroll: { paddingHorizontal: 16, alignItems: 'center', gap: 6 },
  selectorPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E8DFD5', backgroundColor: '#FAF6F1' },
  selectorPillActive: { borderColor: '#C85C3E', backgroundColor: '#FDECE6' },
  selectorText: { fontSize: 12, fontWeight: '600', color: '#5E4B42', maxWidth: 110 },

  /* ── CHAT LIST ── */
  kav: { flex: 1 },
  messageList: { padding: 16, gap: 8, flexGrow: 1 },
  emptyWrap: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 20, gap: 8 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyTopic: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 12.5, textAlign: 'center', lineHeight: 18, maxWidth: 360, marginTop: 2 },
  starterGrid: { width: '100%', gap: 8, marginTop: 18 },
  starterPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E8DFD5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  starterText: { fontSize: 12.5, color: '#3D2D27', fontWeight: '600', flex: 1 },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, alignSelf: 'flex-start', marginBottom: 6 },
  typingText: { fontSize: 13, fontWeight: '600' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  msgBubble: { maxWidth: '82%', borderRadius: 18, padding: 14 },
  msgBubbleUser: { borderBottomRightRadius: 4 },
  msgBubbleAI: { borderBottomLeftRadius: 4 },
  msgImageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  msgImage: {
    width: '100%',
    minWidth: 180,
    height: 140,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  /* ── INPUT BAR & COPILOT QUICK CHIPS ── */
  copilotBarWrap: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDE5DA',
    backgroundColor: '#FFFDF9',
  },
  copilotScroll: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  copilotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FAF6F1',
  },
  copilotChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  attachPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#F3DFC8',
  },
  attachPreviewImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#EBDDCF',
  },
  attachPreviewTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#3D2D27',
  },
  attachPreviewSub: {
    fontSize: 11,
    color: '#8B786D',
  },
  attachRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3ECE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF5EF',
    borderWidth: 1,
    borderColor: '#E8DDD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF5EF',
    borderWidth: 1,
    borderColor: '#E8DDD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  voiceListeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  voicePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  voiceListeningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  voiceStopBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  voiceStopText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  sidebarExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF5EF',
    borderWidth: 1,
    borderColor: '#E8DDD0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  mobileExportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5EF',
    borderWidth: 1,
    borderColor: '#E8DDD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 8,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  textInput: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14.5, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  /* ── MODALS & HISTORY ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '72%', paddingTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5DCD1', alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ECE4D9' },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#3D2D27' },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3ECE3', alignItems: 'center', justifyContent: 'center' },
  sheetLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  sheetLoadingText: { fontSize: 14, color: '#76645B' },
  sheetList: { paddingHorizontal: 12, paddingTop: 6 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EFE7DD', borderRadius: 10, marginBottom: 2 },
  sheetItemText: { fontSize: 14.5, flex: 1, marginRight: 8 },

  historyModalSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFDF9', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '78%', paddingBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 24 },
  historyModalDesktop: { position: 'absolute', top: '50%', left: '50%', bottom: 'auto', right: 'auto', transform: [{ translateX: -220 }, { translateY: -260 }] as any, width: 440, maxHeight: 520, borderRadius: 20 },
  historyModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#ECE4D9' },
  historyModalTitle: { fontSize: 16, fontWeight: '800', color: '#3D2D27' },
  historyEmpty: { alignItems: 'center', padding: 36, gap: 10 },
  historyEmptyTitle: { fontSize: 16, fontWeight: '800', color: '#3D2D27' },
  historyEmptySub: { fontSize: 13, textAlign: 'center', color: '#76645B', lineHeight: 19 },
  historyList: { padding: 14 },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#ECE3D8', backgroundColor: '#FAF6F1', marginBottom: 10, gap: 12 },
  historyItemActive: { borderColor: '#C85C3E', backgroundColor: '#FDECE6' },
  historySubjectTag: { backgroundColor: '#FDECE6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  historySubjectText: { color: '#C85C3E', fontSize: 11, fontWeight: '700' },
  historyDateText: { fontSize: 11, color: '#A49186' },
  historyChapterText: { fontSize: 12.5, fontWeight: '700', color: '#3D2D27' },
  historyLastMsg: { fontSize: 12, color: '#76645B', lineHeight: 16 },
  historyDeleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
});
