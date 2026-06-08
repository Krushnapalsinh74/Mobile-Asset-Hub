const OTP_BASE = 'https://otp.kparkit.com';

const BASE_URLS = [
  'https://kparkit.com/edu/api',
  'https://dalalifree.com/edu/api',
];

let activeBaseIndex = 0;

function getBase() {
  return BASE_URLS[activeBaseIndex];
}

async function tryFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const startIndex = activeBaseIndex;

  for (let attempt = 0; attempt < BASE_URLS.length; attempt++) {
    const index = (startIndex + attempt) % BASE_URLS.length;
    const url = BASE_URLS[index] + path;
    try {
      const r = await tryFetch(url, init);
      if (r.ok) {
        activeBaseIndex = index;
        return r.json() as Promise<T>;
      }
      if (r.status >= 400 && r.status < 500) {
        const msg = await r.text().catch(() => '');
        throw new Error(`API error ${r.status}: ${msg}`);
      }
    } catch (err: any) {
      const isClientError =
        err?.message?.includes('API error 4');
      if (isClientError || attempt === BASE_URLS.length - 1) {
        throw err;
      }
    }
  }
  throw new Error('All API servers unreachable');
}

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
  id?: string;
  question: string;
  options?: string[];
  answer?: string;
  solution?: string;
  explanation?: string;
  tip?: string;
  type?: string;
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
    otpReq<OtpSendResult>('/send-otp', { email }),
  verifyOtp: (email: string, otp: string) =>
    otpReq<OtpVerifyResult>('/verify-otp', { email, otp }),
};

export const eduApi = {
  getBoards: () => req<Board[]>('/boards'),
  getStandards: (boardId: string) => req<Standard[]>(`/boards/${boardId}/standards`),
  getSubjects: (boardId: string, stdId: string) =>
    req<Subject[]>(`/boards/${boardId}/standards/${stdId}/subjects`),
  getChapters: (boardId: string, stdId: string, subId: string) =>
    req<Chapter[]>(`/boards/${boardId}/standards/${stdId}/subjects/${subId}/chapters`),
  getTopics: (boardId: string, stdId: string, subId: string, chapId: string) =>
    req<Topic[]>(`/boards/${boardId}/standards/${stdId}/subjects/${subId}/chapters/${chapId}/topics`),
  getTopicDetails: (params: {
    board: string;
    standard: string;
    subject: string;
    chapter: string;
    topic: string;
  }) => req<Record<string, unknown>>('/curriculum/topic-details', {
    method: 'POST',
    body: JSON.stringify({ ...params, freshQuestions: true }),
  }),
  chat: (params: {
    message: string;
    history: ChatMessage[];
    context: { board: string; standard: string; subject: string; chapter?: string };
  }) => req<Record<string, unknown>>('/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  generateQuestions: (params: {
    board: string;
    standard: string;
    subject: string;
    chapter: string;
    options: { mode: string; count: number; seed?: number; difficulty?: string };
    freshQuestions?: boolean;
  }) => req<Record<string, unknown>>('/generate-questions', {
    method: 'POST',
    body: JSON.stringify({ ...params, freshQuestions: true }),
  }),
  submitTest: (params: {
    studentName: string;
    board: string;
    standard: string;
    subject: string;
    score: number;
    totalQuestions: number;
    timestamp: string;
  }) => req<void>('/test/submit', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  saveQuestions: (params: {
    boardId: string;
    standardId: string;
    subjectId: string;
    chapterId: string;
    topicId?: string;
    questions: Question[];
  }) => req<void>('/questions/save', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  getSavedQuestions: (filters?: { topicId?: string; chapterId?: string }) => {
    const qs = filters
      ? '?' + Object.entries(filters).filter(([, v]) => !!v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
      : '';
    return req<Question[]>(`/questions${qs}`);
  },
};
