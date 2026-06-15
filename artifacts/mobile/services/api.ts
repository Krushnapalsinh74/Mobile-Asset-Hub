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
  textDiagram?: string;
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

export interface OtpUserProfile {
  name?: string;
  boardId?: string;
  boardName?: string;
  standardId?: string;
  standardName?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  name?: string;
  email?: string;
  token?: string;
  message?: string;
  // Returned by otp.kparkit.com once they add profile storage
  profile?: OtpUserProfile;
  user?: OtpUserProfile;
}

export const otpApi = {
  sendOtp: (email: string) =>
    otpReq<OtpSendResult>('/send-otp', { email }),
  verifyOtp: (email: string, otp: string) =>
    otpReq<OtpVerifyResult>('/verify-otp', { email, otp }),
  saveProfile: (email: string, profile: OtpUserProfile) =>
    otpReq<{ success: boolean }>('/save-profile', { email, ...profile }),
  getProfile: (email: string) =>
    otpReq<OtpUserProfile & { success?: boolean }>('/get-profile', { email }),
};

export interface AppSettings {
  aiApiKey?: string;
  razorpayKey?: string;
  razorpayKeyId?: string;
  paymentGateway?: string;
  premiumPrice?: number;
  premiumCurrency?: string;
  appName?: string;
  [key: string]: unknown;
}

// ── Local Express backend (port 8080) ────────────────────────────────────
function getLocalBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain.replace(/^https?:\/\//, '')}:3001`;
  return 'http://localhost:3001';
}

async function localReq<T>(path: string, init?: RequestInit): Promise<T> {
  const url = getLocalBase() + path;
  const r = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(`Profile API error ${r.status}: ${msg}`);
  }
  return r.json() as Promise<T>;
}

export interface UserProfile {
  email: string;
  name?: string | null;
  boardId?: string | null;
  boardName?: string | null;
  standardId?: string | null;
  standardName?: string | null;
}

export const localApi = {
  getProfile: (email: string) =>
    localReq<UserProfile>(`/api/user/profile?email=${encodeURIComponent(email)}`),
  saveProfile: (profile: UserProfile) =>
    localReq<{ success: boolean }>('/api/user/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),
};

export const eduApi = {
  getSettings: () => req<AppSettings>('/settings'),
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
    board: string;
    standard: string;
    filters: { subject: string; chapter?: string };
  }) => req<Record<string, unknown>>('/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  generateQuestions: (params: {
    board: string;
    standard: string;
    subject: string;
    chapter: string;
    topic?: string;
    options: { mode: 'mcq'; count: number; seed?: number; difficulty?: string };
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
