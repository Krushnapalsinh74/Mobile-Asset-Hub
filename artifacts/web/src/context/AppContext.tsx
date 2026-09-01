import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscriptionApi, type SubscriptionPlan } from '../services/api';

interface AppContextType {
  studentName: string | null;
  studentEmail: string | null;
  boardId: string | null;
  boardName: string | null;
  standardId: string | null;
  standardName: string | null;
  isAuthenticated: boolean;

  // ── Subscription ──────────────────────────────────────────────────────────
  plans: SubscriptionPlan[];
  activePlanId: string | null;       // plan id the user has selected / purchased
  isPremium: boolean;                // true when user has a paid plan
  setActivePlan: (planId: string) => void;

  setStudent: (name: string | null, email: string) => void;
  setBoard: (id: string, name: string) => void;
  setStandard: (id: string, name: string) => void;
  logout: () => void;

  testHistory: any[];
  addTestResult: (result: any) => void;

  savedQuestions: any[];
  saveQuestion: (q: any) => void;
  unsaveQuestion: (id: string) => void;
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
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Subscription state ────────────────────────────────────────────────────
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    setStudentName(localStorage.getItem('studentName'));
    setStudentEmail(localStorage.getItem('studentEmail'));
    setBoardIdState(localStorage.getItem('boardId'));
    setBoardNameState(localStorage.getItem('boardName'));
    setStandardIdState(localStorage.getItem('standardId'));
    setStandardNameState(localStorage.getItem('standardName'));
    setActivePlanIdState(localStorage.getItem('activePlanId'));

    try {
      const hist = JSON.parse(localStorage.getItem('testHistory') || '[]');
      setTestHistory(Array.isArray(hist) ? hist : []);
      const saved = JSON.parse(localStorage.getItem('savedQuestions') || '[]');
      setSavedQuestions(Array.isArray(saved) ? saved : []);
    } catch {
      setTestHistory([]);
      setSavedQuestions([]);
    }

    setIsLoaded(true);

    // Fetch plans from backend
    subscriptionApi.getPlans()
      .then(setPlans)
      .catch(() => {
        // Fallback: show a free plan so app doesn't break when offline
        setPlans([{ id: 'free', name: 'Free', price: 0, questionLimit: 20 }]);
      });
  }, []);

  const setActivePlan = (planId: string) => {
    setActivePlanIdState(planId);
    localStorage.setItem('activePlanId', planId);
  };

  // A plan is "premium" if it exists in the fetched plans list and is not 'free'
  const isPremium =
    !!activePlanId &&
    activePlanId !== 'free' &&
    plans.some(p => String(p.id) === activePlanId);

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
    setActivePlanIdState(null);
    setTestHistory([]);
    setSavedQuestions([]);
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
        plans,
        activePlanId,
        isPremium,
        setActivePlan,
        setStudent,
        setBoard,
        setStandard,
        logout,
        testHistory,
        addTestResult,
        savedQuestions,
        saveQuestion,
        unsaveQuestion,
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
