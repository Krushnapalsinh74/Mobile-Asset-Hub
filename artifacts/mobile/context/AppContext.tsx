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

interface AppState {
  studentName: string | null;
  studentEmail: string | null;
  boardId: string | null;
  boardName: string | null;
  standardId: string | null;
  standardName: string | null;
  lastStudied: LastStudied | null;
  isLoaded: boolean;
}

interface AppContextValue extends AppState {
  setStudent: (name: string, email: string) => Promise<void>;
  setBoard: (id: string, name: string) => Promise<void>;
  setStandard: (id: string, name: string) => Promise<void>;
  setLastStudied: (data: LastStudied) => Promise<void>;
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
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    studentName: null,
    studentEmail: null,
    boardId: null,
    boardName: null,
    standardId: null,
    standardName: null,
    lastStudied: null,
    isLoaded: false,
  });

  useEffect(() => {
    AsyncStorage.multiGet(Object.values(KEYS)).then((pairs) => {
      const map: Record<string, string | null> = {};
      pairs.forEach(([k, v]) => { map[k] = v; });
      let lastStudied: LastStudied | null = null;
      try {
        if (map[KEYS.lastStudied]) lastStudied = JSON.parse(map[KEYS.lastStudied]!);
      } catch {}
      setState({
        studentName: map[KEYS.studentName],
        studentEmail: map[KEYS.studentEmail],
        boardId: map[KEYS.boardId],
        boardName: map[KEYS.boardName],
        standardId: map[KEYS.standardId],
        standardName: map[KEYS.standardName],
        lastStudied,
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

  const clearAll = async () => {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    setState({ studentName: null, studentEmail: null, boardId: null, boardName: null, standardId: null, standardName: null, lastStudied: null, isLoaded: true });
  };

  return (
    <AppContext.Provider value={{ ...state, setStudent, setBoard, setStandard, setLastStudied, clearAll }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
