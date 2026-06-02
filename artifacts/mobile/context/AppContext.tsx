import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AppState {
  studentName: string | null;
  studentEmail: string | null;
  boardId: string | null;
  boardName: string | null;
  standardId: string | null;
  standardName: string | null;
  isLoaded: boolean;
}

interface AppContextValue extends AppState {
  setStudent: (name: string, email: string) => Promise<void>;
  setBoard: (id: string, name: string) => Promise<void>;
  setStandard: (id: string, name: string) => Promise<void>;
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
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    studentName: null,
    studentEmail: null,
    boardId: null,
    boardName: null,
    standardId: null,
    standardName: null,
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

  const clearAll = async () => {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    setState({ studentName: null, studentEmail: null, boardId: null, boardName: null, standardId: null, standardName: null, isLoaded: true });
  };

  return (
    <AppContext.Provider value={{ ...state, setStudent, setBoard, setStandard, clearAll }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
