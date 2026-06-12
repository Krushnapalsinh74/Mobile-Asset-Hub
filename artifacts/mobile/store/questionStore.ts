import type { Question } from '@/services/api';

const store = new Map<string, Question[]>();

export function saveQuestions(questions: Question[]): string {
  const id = `qs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  store.set(id, questions);
  return id;
}

export function loadQuestions(id: string): Question[] | null {
  return store.get(id) ?? null;
}

export function clearQuestions(id: string): void {
  store.delete(id);
}
