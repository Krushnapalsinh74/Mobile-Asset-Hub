import type { Question } from '@/services/api';

const store = new Map<string, Question[]>();

export function saveQuestions(questions: Question[]): string {
  const id = `qs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  store.set(id, questions);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(id, JSON.stringify(questions));
    } catch {}
  }
  return id;
}

export function loadQuestions(id: string): Question[] | null {
  const inMem = store.get(id);
  if (inMem && inMem.length > 0) return inMem;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(id);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          store.set(id, parsed);
          return parsed;
        }
      }
    } catch {}
  }
  return inMem ?? null;
}

export function clearQuestions(id: string): void {
  store.delete(id);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(id);
    } catch {}
  }
}
