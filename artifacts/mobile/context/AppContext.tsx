import AsyncStorage from '@react-native-async-storage/async-storage';
import { localApi, otpApi, subscriptionApi, type SubscriptionPlan } from '@/services/api';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface LastStudied {
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  topicName?: string;
  timestamp: number;
}

export interface SubjectProgress {
  explored: number;
  total: number;
}

export interface TestResult {
  subjectName: string;
  chapterName?: string;
  mode: string;
  score: number;
  total: number;
  percentage: number | null;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  imageUri?: string;
}

export interface ChatSession {
  id?: string;
  subjectName: string;
  topicName?: string;
  chapterName?: string;
  timestamp: number;
  messages?: ChatMessage[];
  lastMessage?: string;
  language?: string;
}

export interface SavedQuestion {
  id: string;
  question: string;
  options?: string[];
  answer?: string;
  solution?: string;
  explanation?: string;
  tip?: string;
  subjectName: string;
  chapterName?: string;
  correctOptionIndex: number;
  savedAt: number;
}

export interface MistakeQuestion {
  id: string;
  question: string;
  options?: string[];
  answer?: string;
  solution?: string;
  explanation?: string;
  userAnswer?: string;
  subjectName?: string;
  chapterName?: string;
  timestamp: number;
}

interface AppState {
  studentName: string | null;
  studentEmail: string | null;
  boardId: string | null;
  boardName: string | null;
  standardId: string | null;
  standardName: string | null;
  lastStudied: LastStudied | null;
  subjectProgress: Record<string, SubjectProgress>;
  testHistory: TestResult[];
  chatHistory: ChatSession[];
  savedQuestions: SavedQuestion[];
  mistakeQuestions: MistakeQuestion[];
  isLoaded: boolean;
  plans: SubscriptionPlan[];
  activePlanId: string | null;
}

interface AppContextValue extends AppState {
  setStudent: (name: string, email: string) => Promise<void>;
  setBoard: (id: string, name: string) => Promise<void>;
  setStandard: (id: string, name: string) => Promise<void>;
  setLastStudied: (data: LastStudied) => Promise<void>;
  setSubjectTotal: (subjectId: string, total: number) => Promise<void>;
  incrementExplored: (subjectId: string) => Promise<void>;
  addTestResult: (result: TestResult) => Promise<void>;
  addChatSession: (session: ChatSession) => Promise<void>;
  deleteChatSession: (idOrTimestamp: string | number) => Promise<void>;
  saveQuestion: (q: SavedQuestion) => Promise<void>;
  unsaveQuestion: (id: string) => Promise<void>;
  recordMistakes: (mistakes: MistakeQuestion[]) => Promise<void>;
  removeMistake: (id: string) => Promise<void>;
  clearMistakes: () => Promise<void>;
  clearAll: () => Promise<void>;
  isPremium: boolean;
  activePlanId: string | null;
  subscriptionStatus: import('@/services/api').SubscriptionStatusResponse | null;
  refreshSubscription: () => Promise<void>;
  setActivePlan: (planId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const KEYS = {
  studentName: '@edu:studentName',
  studentEmail: '@edu:studentEmail',
  boardId: '@edu:boardId',
  boardName: '@edu:boardName',
  standardId: '@edu:standardId',
  standardName: '@edu:standardName',
  lastStudied: '@edu:lastStudied',
  subjectProgress: '@edu:subjectProgress',
  testHistory: '@edu:testHistory',
  chatHistory: '@edu:chatHistory',
  savedQuestions: '@edu:savedQuestions',
  mistakeQuestions: '@edu:mistakeQuestions',
  activePlanId: '@edu:activePlanId',
};

function parse<T>(s: string | null, fallback: T): T {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

function getInitialSyncString(key: string, fallback: string | null = null): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    } catch {}
  }
  return fallback;
}

function getInitialSync<T>(key: string, fallback: T): T {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return parse(val, fallback);
    } catch {}
  }
  return fallback;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const defaultBoardId = getInitialSyncString(KEYS.boardId, null);
    const defaultBoardName = getInitialSyncString(KEYS.boardName, null);
    const defaultStdId = getInitialSyncString(KEYS.standardId, null);
    const defaultStdName = getInitialSyncString(KEYS.standardName, null);

    return {
      studentName: getInitialSyncString(KEYS.studentName, null),
      studentEmail: getInitialSyncString(KEYS.studentEmail, null),
      boardId: defaultBoardId,
      boardName: defaultBoardName,
      standardId: defaultStdId,
      standardName: defaultStdName,
      lastStudied: getInitialSync(KEYS.lastStudied, null),
      subjectProgress: getInitialSync(KEYS.subjectProgress, {}),
      testHistory: getInitialSync(KEYS.testHistory, []),
      chatHistory: getInitialSync(KEYS.chatHistory, []),
      savedQuestions: getInitialSync(KEYS.savedQuestions, []),
      mistakeQuestions: getInitialSync(KEYS.mistakeQuestions, []),
      isLoaded: Platform.OS === 'web',
      plans: [],
      activePlanId: getInitialSyncString(KEYS.activePlanId, null),
    };
  });

  const [subscriptionStatus, setSubscriptionStatus] = useState<import('@/services/api').SubscriptionStatusResponse | null>(null);

  const refreshSubscription = async () => {
    try {
      const status = await subscriptionApi.getStatus();
      if (status) {
        setSubscriptionStatus(status);
        if (status.hasActivePlan && status.subscription?.planId) {
          await AsyncStorage.setItem(KEYS.activePlanId, String(status.subscription.planId));
          setState(s => ({ ...s, activePlanId: String(status.subscription?.planId) }));
        }
      }
    } catch {
      // offline / not signed in
    }
  };

  useEffect(() => {
    AsyncStorage.multiGet(Object.values(KEYS)).then((pairs) => {
      const map: Record<string, string | null> = {};
      pairs.forEach(([k, v]) => { map[k] = v; });
      setState((prev) => ({
        studentName: map[KEYS.studentName] ?? prev.studentName,
        studentEmail: map[KEYS.studentEmail] ?? prev.studentEmail,
        boardId: map[KEYS.boardId] ?? prev.boardId,
        boardName: map[KEYS.boardName] ?? prev.boardName,
        standardId: map[KEYS.standardId] ?? prev.standardId,
        standardName: map[KEYS.standardName] ?? prev.standardName,
        lastStudied: parse(map[KEYS.lastStudied], prev.lastStudied),
        subjectProgress: parse(map[KEYS.subjectProgress], prev.subjectProgress),
        testHistory: parse(map[KEYS.testHistory], prev.testHistory),
        chatHistory: parse(map[KEYS.chatHistory], prev.chatHistory),
        savedQuestions: parse(map[KEYS.savedQuestions], prev.savedQuestions),
        mistakeQuestions: parse(map[KEYS.mistakeQuestions], prev.mistakeQuestions),
        activePlanId: map[KEYS.activePlanId] ?? prev.activePlanId,
        isLoaded: true,
        plans: prev.plans,
      }));
    });

    subscriptionApi.getPlans()
      .then(fetchedPlans => {
        setState(s => ({ ...s, plans: fetchedPlans }));
      })
      .catch(() => {
        setState(s => ({ ...s, plans: [] }));
      });

    refreshSubscription();
  }, []);

  const setStudent = async (name: string, email: string) => {
    await AsyncStorage.multiSet([[KEYS.studentName, name], [KEYS.studentEmail, email]]);
    setState(s => ({ ...s, studentName: name, studentEmail: email }));
    // Sync to both backends (fire-and-forget — never block the UI)
    localApi.saveProfile({ email, name }).catch(() => {});
    otpApi.saveProfile(email, { name }).catch(() => {});
    refreshSubscription();
  };

  const setBoard = async (id: string, name: string) => {
    await AsyncStorage.multiSet([[KEYS.boardId, String(id)], [KEYS.boardName, String(name)]]);
    setState(s => {
      const email = s.studentEmail ?? '';
      localApi.saveProfile({ email, boardId: id, boardName: name }).catch(() => {});
      otpApi.saveProfile(email, { boardId: id, boardName: name }).catch(() => {});
      return { ...s, boardId: id, boardName: name };
    });
  };

  const setStandard = async (id: string, name: string) => {
    await AsyncStorage.multiSet([[KEYS.standardId, String(id)], [KEYS.standardName, String(name)]]);
    setState(s => {
      const email = s.studentEmail ?? '';
      localApi.saveProfile({ email, standardId: id, standardName: name }).catch(() => {});
      otpApi.saveProfile(email, { standardId: id, standardName: name }).catch(() => {});
      return { ...s, standardId: id, standardName: name };
    });
  };

  const setLastStudied = async (data: LastStudied) => {
    await AsyncStorage.setItem(KEYS.lastStudied, JSON.stringify(data));
    setState(s => ({ ...s, lastStudied: data }));
  };

  const setSubjectTotal = async (subjectId: string, total: number) => {
    setState(s => {
      const next = {
        ...s.subjectProgress,
        [subjectId]: { explored: s.subjectProgress[subjectId]?.explored ?? 0, total },
      };
      AsyncStorage.setItem(KEYS.subjectProgress, JSON.stringify(next));
      return { ...s, subjectProgress: next };
    });
  };

  const incrementExplored = async (subjectId: string) => {
    setState(s => {
      const current = s.subjectProgress[subjectId] ?? { explored: 0, total: 1 };
      const next = {
        ...s.subjectProgress,
        [subjectId]: { ...current, explored: Math.min(current.explored + 1, current.total) },
      };
      AsyncStorage.setItem(KEYS.subjectProgress, JSON.stringify(next));
      return { ...s, subjectProgress: next };
    });
  };

  const addTestResult = async (result: TestResult) => {
    setState(s => {
      const next = [result, ...s.testHistory].slice(0, 50);
      AsyncStorage.setItem(KEYS.testHistory, JSON.stringify(next));
      return { ...s, testHistory: next };
    });
  };

  const addChatSession = async (session: ChatSession) => {
    setState(s => {
      const idx = s.chatHistory.findIndex(
        cs => (session.id && cs.id && cs.id === session.id) || cs.timestamp === session.timestamp
      );
      let next: ChatSession[];
      if (idx >= 0) {
        next = [...s.chatHistory];
        next[idx] = { ...next[idx], ...session };
      } else {
        next = [session, ...s.chatHistory].slice(0, 50);
      }
      AsyncStorage.setItem(KEYS.chatHistory, JSON.stringify(next));
      return { ...s, chatHistory: next };
    });
  };

  const deleteChatSession = async (idOrTimestamp: string | number) => {
    setState(s => {
      const next = s.chatHistory.filter(
        cs => cs.id !== String(idOrTimestamp) && cs.timestamp !== idOrTimestamp
      );
      AsyncStorage.setItem(KEYS.chatHistory, JSON.stringify(next));
      return { ...s, chatHistory: next };
    });
  };

  const saveQuestion = async (q: SavedQuestion) => {
    setState(s => {
      if (s.savedQuestions.find(sq => sq.id === q.id)) return s;
      const next = [q, ...s.savedQuestions].slice(0, 300);
      AsyncStorage.setItem(KEYS.savedQuestions, JSON.stringify(next));
      return { ...s, savedQuestions: next };
    });
  };

  const unsaveQuestion = async (id: string) => {
    setState(s => {
      const next = s.savedQuestions.filter(q => q.id !== id);
      AsyncStorage.setItem(KEYS.savedQuestions, JSON.stringify(next));
      return { ...s, savedQuestions: next };
    });
  };

  const recordMistakes = async (mistakes: MistakeQuestion[]) => {
    setState(s => {
      const existingIds = new Set(s.mistakeQuestions.map(m => m.id));
      const newItems = mistakes.filter(m => !existingIds.has(m.id));
      const next = [...newItems, ...s.mistakeQuestions].slice(0, 500);
      AsyncStorage.setItem(KEYS.mistakeQuestions, JSON.stringify(next));
      return { ...s, mistakeQuestions: next };
    });
  };

  const removeMistake = async (id: string) => {
    setState(s => {
      const next = s.mistakeQuestions.filter(m => m.id !== id);
      AsyncStorage.setItem(KEYS.mistakeQuestions, JSON.stringify(next));
      return { ...s, mistakeQuestions: next };
    });
  };

  const clearMistakes = async () => {
    await AsyncStorage.removeItem(KEYS.mistakeQuestions);
    setState(s => ({ ...s, mistakeQuestions: [] }));
  };

  const setActivePlan = async (planId: string) => {
    await AsyncStorage.setItem(KEYS.activePlanId, planId);
    setState(s => ({ ...s, activePlanId: planId }));
  };

  const isPremium = 
    !!subscriptionStatus?.hasActivePlan || 
    (!!state.activePlanId && 
    state.activePlanId !== 'free' && 
    state.plans.some(p => String(p.id) === state.activePlanId));

  const clearAll = async () => {
    try {
      const { signOut } = await import('firebase/auth');
      const { firebaseAuth } = await import('@/services/firebase');
      await signOut(firebaseAuth).catch(() => {});
    } catch {}
    await AsyncStorage.multiRemove(Object.values(KEYS));
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
      } catch {}
    }
    setSubscriptionStatus(null);
    setState({
      studentName: null, studentEmail: null, boardId: null, boardName: null,
      standardId: null, standardName: null, lastStudied: null, subjectProgress: {},
      testHistory: [], chatHistory: [], savedQuestions: [], mistakeQuestions: [],
      isLoaded: true, plans: state.plans, activePlanId: null,
    });
  };

  return (
    <AppContext.Provider value={{
      ...state, setStudent, setBoard, setStandard, setLastStudied,
      setSubjectTotal, incrementExplored, addTestResult, addChatSession,
      deleteChatSession,
      saveQuestion, unsaveQuestion, recordMistakes, removeMistake, clearMistakes,
      clearAll, isPremium, setActivePlan,
      subscriptionStatus, refreshSubscription,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
