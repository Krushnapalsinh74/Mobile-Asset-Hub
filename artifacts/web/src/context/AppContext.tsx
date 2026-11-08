import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { paymentApi } from '../services/api';

interface AppContextType {
  studentName: string | null;
  studentEmail: string | null;
  boardId: string | null;
  boardName: string | null;
  standardId: string | null;
  standardName: string | null;
  isAuthenticated: boolean;
  
  setStudent: (name: string | null, email: string) => void;
  setBoard: (id: string, name: string) => void;
  setStandard: (id: string, name: string) => void;
  logout: () => void;
  
  testHistory: any[];
  addTestResult: (result: any) => void;
  
  savedQuestions: any[];
  saveQuestion: (q: any) => void;
  unsaveQuestion: (id: string) => void;

  // Payment & Subject Access
  unlockedSubjects: (string | number)[];
  isSubjectUnlocked: (subjectId: string | number) => boolean;
  unlockSubject: (subjectId: string | number) => void;
  activeSubscription: any;
  refreshSubscription: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentEmail, setStudentEmail] = useState<string | null>(null);
  const [boardId, setBoardIdState] = useState<string | null>(null);
  const [boardName, setBoardNameState] = useState<string | null>(null);
  const [standardId, setStandardIdState] = useState<string | null>(null);
  const [standardName, setStandardNameState] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<any[]>([]);
  const [unlockedSubjects, setUnlockedSubjects] = useState<(string | number)[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    setStudentName(localStorage.getItem('studentName'));
    setStudentEmail(localStorage.getItem('studentEmail'));
    setBoardIdState(localStorage.getItem('boardId'));
    setBoardNameState(localStorage.getItem('boardName'));
    setStandardIdState(localStorage.getItem('standardId'));
    setStandardNameState(localStorage.getItem('standardName'));
    
    try {
      const hist = JSON.parse(localStorage.getItem('testHistory') || '[]');
      setTestHistory(Array.isArray(hist) ? hist : []);
      const saved = JSON.parse(localStorage.getItem('savedQuestions') || '[]');
      setSavedQuestions(Array.isArray(saved) ? saved : []);
      const unlocked = JSON.parse(localStorage.getItem('unlockedSubjects') || '[]');
      setUnlockedSubjects(Array.isArray(unlocked) ? unlocked : []);
    } catch {
      setTestHistory([]);
      setSavedQuestions([]);
      setUnlockedSubjects([]);
    }
    
    setIsLoaded(true);
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const res = await paymentApi.getSubscriptionStatus();
      if (res) {
        setActiveSubscription(res);
        if (Array.isArray(res.unlockedSubjectIds) && res.unlockedSubjectIds.length > 0) {
          setUnlockedSubjects((prev) => {
            const merged = Array.from(new Set([...prev, ...res.unlockedSubjectIds]));
            localStorage.setItem('unlockedSubjects', JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (e) {
      console.warn('Could not refresh subscription status', e);
    }
  }, []);

  useEffect(() => {
    if (studentEmail) {
      refreshSubscription();
    }
  }, [studentEmail, refreshSubscription]);

  const isSubjectUnlocked = useCallback(
    (subjectId: string | number) => {
      // If student has global active subscription without subject restriction
      if (activeSubscription?.hasActivePlan && (activeSubscription?.accessScope === 'all' || !activeSubscription?.subjectId)) {
        return true;
      }
      const sId = String(subjectId);
      const nId = Number(subjectId);
      return unlockedSubjects.some((u) => String(u) === sId || (Number(u) === nId && !Number.isNaN(nId)));
    },
    [unlockedSubjects, activeSubscription]
  );

  const unlockSubject = useCallback((subjectId: string | number) => {
    setUnlockedSubjects((prev) => {
      if (prev.some((u) => String(u) === String(subjectId))) return prev;
      const next = [...prev, subjectId];
      localStorage.setItem('unlockedSubjects', JSON.stringify(next));
      return next;
    });
  }, []);

  const addTestResult = (result: any) => {
    setTestHistory(prev => {
      const next = [result, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem('testHistory', JSON.stringify(next));
      return next;
    });
  };

  const saveQuestion = (q: any) => {
    setSavedQuestions(prev => {
      if (prev.some(x => x.id === q.id)) return prev;
      const next = [q, ...prev];
      localStorage.setItem('savedQuestions', JSON.stringify(next));
      return next;
    });
  };

  const unsaveQuestion = (id: string) => {
    setSavedQuestions(prev => {
      const next = prev.filter(q => q.id !== id);
      localStorage.setItem('savedQuestions', JSON.stringify(next));
      return next;
    });
  };

  const setStudent = (name: string | null, email: string) => {
    setStudentName(name);
    setStudentEmail(email);
    if (name) localStorage.setItem('studentName', name);
    localStorage.setItem('studentEmail', email);
  };

  const setBoard = (id: string, name: string) => {
    setBoardIdState(id);
    setBoardNameState(name);
    localStorage.setItem('boardId', id);
    localStorage.setItem('boardName', name);
  };

  const setStandard = (id: string, name: string) => {
    setStandardIdState(id);
    setStandardNameState(name);
    localStorage.setItem('standardId', id);
    localStorage.setItem('standardName', name);
  };

  const logout = () => {
    setStudentName(null);
    setStudentEmail(null);
    setBoardIdState(null);
    setBoardNameState(null);
    setStandardIdState(null);
    setStandardNameState(null);
    setTestHistory([]);
    setSavedQuestions([]);
    setUnlockedSubjects([]);
    setActiveSubscription(null);
    localStorage.clear();
  };

  if (!isLoaded) return null; // Prevent hydration mismatch

  return (
    <AppContext.Provider
      value={{
        studentName,
        studentEmail,
        boardId,
        boardName,
        standardId,
        standardName,
        isAuthenticated: !!studentEmail,
        setStudent,
        setBoard,
        setStandard,
        logout,
        testHistory,
        addTestResult,
        savedQuestions,
        saveQuestion,
        unsaveQuestion,
        unlockedSubjects,
        isSubjectUnlocked,
        unlockSubject,
        activeSubscription,
        refreshSubscription,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
