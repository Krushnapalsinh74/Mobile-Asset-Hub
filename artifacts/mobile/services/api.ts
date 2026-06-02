const BASE_URL = 'https://kparkit.com/edu';
const OTP_BASE = 'https://otp.kparkit.com';

export interface Board {
  _id?: string;
  id?: string;
  name: string;
}
export interface Standard {
  _id?: string;
  id?: string;
  name: string;
}
export interface Subject {
  _id?: string;
  id?: string;
  name: string;
}
export interface Chapter {
  _id?: string;
  id?: string;
  name: string;
  order?: number;
}
export interface Topic {
  _id?: string;
  id?: string;
  name: string;
}

export function getId(item: { _id?: string; id?: string }): string {
  return (item._id ?? item.id ?? '');
}
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface Question {
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  type?: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE_URL + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(`API error ${r.status}: ${msg}`);
  }
  return r.json() as Promise<T>;
}

async function otpReq<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(OTP_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(`OTP error ${r.status}: ${msg}`);
  }
  return r.json() as Promise<T>;
}

export interface OtpSendResult {
  success: boolean;
  message?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  name?: string;
  email?: string;
  token?: string;
  message?: string;
}

export const otpApi = {
  sendOtp: (email: string) =>
    otpReq<OtpSendResult>('/send', { email }),
  verifyOtp: (email: string, otp: string) =>
    otpReq<OtpVerifyResult>('/verify', { email, otp }),
};

export const eduApi = {
  getBoards: () => req<Board[]>('/api/boards'),
  getStandards: (boardId: string) => req<Standard[]>(`/api/boards/${boardId}/standards`),
  getSubjects: (boardId: string, stdId: string) =>
    req<Subject[]>(`/api/boards/${boardId}/standards/${stdId}/subjects`),
  getChapters: (boardId: string, stdId: string, subId: string) =>
    req<Chapter[]>(`/api/boards/${boardId}/standards/${stdId}/subjects/${subId}/chapters`),
  getTopics: (boardId: string, stdId: string, subId: string, chapId: string) =>
    req<Topic[]>(`/api/boards/${boardId}/standards/${stdId}/subjects/${subId}/chapters/${chapId}/topics`),
  getTopicDetails: (params: {
    board: string;
    standard: string;
    subject: string;
    chapter: string;
    topic: string;
  }) => req<Record<string, unknown>>('/api/curriculum/topic-details', { method: 'POST', body: JSON.stringify(params) }),
  chat: (params: {
    message: string;
    history: ChatMessage[];
    context: { board: string; standard: string; subject: string; chapter?: string };
  }) => req<Record<string, unknown>>('/api/chat', { method: 'POST', body: JSON.stringify(params) }),
  generateQuestions: (params: {
    board: string;
    standard: string;
    subject: string;
    chapter: string;
    options: { mode: string; count: number };
  }) => req<Record<string, unknown>>('/api/generate-questions', { method: 'POST', body: JSON.stringify(params) }),
  submitTest: (params: {
    studentName: string;
    board: string;
    standard: string;
    subject: string;
    score: number;
    totalQuestions: number;
    timestamp: string;
  }) => req<void>('/api/test/submit', { method: 'POST', body: JSON.stringify(params) }),
};
