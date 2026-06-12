import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

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

export interface ChatSession {
  subjectName: string;
  topicName?: string;
  chapterName?: string;
  timestamp: number;
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
  isLoaded: boolean;
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
  saveQuestion: (q: SavedQuestion) => Promise<void>;
  unsaveQuestion: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
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
};

function parse<T>(s: string | null, fallback: T): T {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    studentName: null,
    studentEmail: null,
    boardId: null,
    boardName: null,
    standardId: null,
    standardName: null,
    lastStudied: null,
    subjectProgress: {},
    testHistory: [],
    chatHistory: [],
    savedQuestions: [],
    isLoaded: false,
  });

  useEffect(() => {
    AsyncStorage.multiGet(Object.values(KEYS)).then((pairs) => {
      const map: Record<string, string | null> = {};
      pairs.forEach(([k, v]) => { map[k] = v; });
      setState({
        studentName: map[KEYS.studentName],
        studentEmail: map[KEYS.studentEmail],
        boardId: map[KEYS.boardId],
        boardName: map[KEYS.boardName],
        standardId: map[KEYS.standardId],
        standardName: map[KEYS.standardName],
        lastStudied: parse(map[KEYS.lastStudied], null),
        subjectProgress: parse(map[KEYS.subjectProgress], {}),
        testHistory: parse(map[KEYS.testHistory], []),
        chatHistory: parse(map[KEYS.chatHistory], []),
        savedQuestions: parse(map[KEYS.savedQuestions], []),
        isLoaded: true,
      });
    });
  }, []);

  const setStudent = async (name: string, email: string) => {
    await AsyncStorage.multiSet([[KEYS.studentName, name], [KEYS.studentEmail, email]]);
    setState(s => ({ ...s, studentName: name, studentEmail: email }));
  };

  const setBoard = async (id: string, name: string) => {
    await AsyncStorage.multiSet([[KEYS.boardId, id], [KEYS.boardName, name]]);
    setState(s => ({ ...s, boardId: id, boardName: name }));
  };

  const setStandard = async (id: string, name: string) => {
    await AsyncStorage.multiSet([[KEYS.standardId, id], [KEYS.standardName, name]]);
    setState(s => ({ ...s, standardId: id, standardName: name }));
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
      const cur = s.subjectProgress[subjectId] ?? { explored: 0, total: 0 };
      const next = {
        ...s.subjectProgress,
        [subjectId]: { explored: cur.explored + 1, total: cur.total },
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
      const next = [session, ...s.chatHistory].slice(0, 50);
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

  const clearAll = async () => {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    setState({
      studentName: null, studentEmail: null, boardId: null, boardName: null,
      standardId: null, standardName: null, lastStudied: null, subjectProgress: {},
      testHistory: [], chatHistory: [], savedQuestions: [], isLoaded: true,
    });
  };

  return (
    <AppContext.Provider value={{
      ...state, setStudent, setBoard, setStandard, setLastStudied,
      setSubjectTotal, incrementExplored, addTestResult, addChatSession,
      saveQuestion, unsaveQuestion, clearAll,
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
