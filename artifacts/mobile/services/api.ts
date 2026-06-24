// ─────────────────────────────────────────────────────────────────────────────
// Yunora / kpark-edu.web.app — curriculum backend
// ─────────────────────────────────────────────────────────────────────────────
const YUNORA_BASE = 'https://kpark-edu.web.app/api';
const FIREBASE_API_KEY = 'AIzaSyDpUmL0FJseGKE07gEUa5sk0ekxXkAVnhk';
const YUNORA_EMAIL = 'admin@yunora.edu';
const YUNORA_PASSWORD = 'admin123';

interface FirebaseTokenState {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

let _firebaseToken: FirebaseTokenState | null = null;
let _tokenPromise: Promise<string> | null = null;

async function _signInFresh(): Promise<FirebaseTokenState> {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: YUNORA_EMAIL,
        password: YUNORA_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(`Yunora auth failed: ${msg}`);
  }
  const d = await r.json();
  return {
    idToken: d.idToken,
    refreshToken: d.refreshToken,
    expiresAt: Date.now() + Number(d.expiresIn) * 1000,
  };
}

async function _refreshToken(refreshToken: string): Promise<FirebaseTokenState> {
  const r = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    }
  );
  if (!r.ok) throw new Error('Token refresh failed');
  const d = await r.json();
  return {
    idToken: d.id_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + Number(d.expires_in) * 1000,
  };
}

async function getYunoraToken(): Promise<string> {
  // Deduplicate concurrent calls
  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = (async () => {
    try {
      // Return cached token if still valid (with 60s buffer)
      if (_firebaseToken && _firebaseToken.expiresAt > Date.now() + 60_000) {
        return _firebaseToken.idToken;
      }
      // Try refresh first, fall back to fresh sign-in
      if (_firebaseToken?.refreshToken) {
        try {
          _firebaseToken = await _refreshToken(_firebaseToken.refreshToken);
          return _firebaseToken.idToken;
        } catch {
          // fall through to fresh sign-in
        }
      }
      _firebaseToken = await _signInFresh();
      return _firebaseToken.idToken;
    } finally {
      _tokenPromise = null;
    }
  })();

  return _tokenPromise;
}

interface YunoraListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

async function yunoraReq<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getYunoraToken();

  const doFetch = (idToken: string) =>
    fetch(YUNORA_BASE + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...init?.headers,
      },
    });

  let res = await doFetch(token);

  // If 401, invalidate cached token and retry once
  if (res.status === 401) {
    _firebaseToken = null;
    const newToken = await getYunoraToken();
    res = await doFetch(newToken);
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Yunora API ${res.status}: ${msg}`);
  }

  return res.json() as Promise<T>;
}

// Fetch all pages for a list endpoint (handles pagination automatically)
async function yunoraList<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const qs = new URLSearchParams({ limit: '200', ...params }).toString();
  const result = await yunoraReq<YunoraListResponse<T>>(`${path}?${qs}`);
  // result can also be a plain array (question-types endpoint)
  if (Array.isArray(result)) return result as unknown as T[];
  return result.data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// kparkit.com — fallback for question generation, chat, topic details
// ─────────────────────────────────────────────────────────────────────────────
const OTP_BASE = 'https://otp.kparkit.com';

const BASE_URLS = [
  'https://kparkit.com/edu/api',
  'https://dalalifree.com/edu/api',
];

let activeBaseIndex = 0;

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
      const isClientError = err?.message?.includes('API error 4');
      if (isClientError || attempt === BASE_URLS.length - 1) {
        throw err;
      }
    }
  }
  throw new Error('All API servers unreachable');
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface Board {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
}
export interface Standard {
  _id?: string;
  id?: string;
  name: string;
  level?: number;
}
export interface Subject {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
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
  description?: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// OTP auth (student login — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Local Express backend (student profile storage)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// App settings (still from kparkit.com)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Main edu API — curriculum data from kpark-edu.web.app,
//               generation/chat/questions from kparkit.com
// ─────────────────────────────────────────────────────────────────────────────

export const eduApi = {
  // Settings still from kparkit.com
  getSettings: () => req<AppSettings>('/settings'),

  // ── Curriculum hierarchy — Yunora backend ──────────────────────────────

  getBoards: () =>
    yunoraList<Board>('/boards').then((items) =>
      items.map((b) => ({ id: b.id, name: b.name, code: (b as any).code }))
    ),

  getStandards: (boardId: string) =>
    yunoraList<Standard>('/standards', { boardId }).then((items) =>
      items.map((s) => ({ id: s.id, name: s.name, level: (s as any).level }))
    ),

  getSubjects: async (boardId: string, stdId: string) => {
    let items = await yunoraList<Subject>('/subjects', { boardId, standardId: stdId });
    // Yunora API only has CBSE-tagged subjects — fall back to all subjects for other boards
    if (items.length === 0) {
      items = await yunoraList<Subject>('/subjects');
    }
    return items.map((s) => ({ id: s.id, name: s.name }));
  },

  getChapters: (_boardId: string, _stdId: string, subId: string) =>
    yunoraList<Chapter>('/chapters', { subjectId: subId }).then((items) =>
      items.map((c) => ({
        id: c.id,
        name: c.name,
        order: (c as any).orderIndex ?? (c as any).order,
      }))
    ),

  getTopics: (_boardId: string, _stdId: string, _subId: string, chapId: string) =>
    yunoraList<Topic>('/topics', { chapterId: chapId }).then((items) =>
      items.map((t) => ({ id: t.id, name: t.name, description: (t as any).description }))
    ),

  // ── Question generation & AI — kparkit.com ────────────────────────────

  getTopicDetails: (params: {
    board: string;
    standard: string;
    subject: string;
    chapter: string;
    topic: string;
  }) =>
    req<Record<string, unknown>>('/curriculum/topic-details', {
      method: 'POST',
      body: JSON.stringify({ ...params, freshQuestions: true }),
    }),

  chat: (params: {
    message: string;
    history: ChatMessage[];
    board: string;
    standard: string;
    filters: { subject: string; chapter?: string };
  }) =>
    req<Record<string, unknown>>('/chat', {
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
  }) =>
    req<Record<string, unknown>>('/generate-questions', {
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
  }) =>
    req<void>('/test/submit', {
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
  }) =>
    req<void>('/questions/save', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getSavedQuestions: (filters?: { topicId?: string; chapterId?: string }) => {
    const qs = filters
      ? '?' +
        Object.entries(filters)
          .filter(([, v]) => !!v)
          .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
          .join('&')
      : '';
    return req<Question[]>(`/questions${qs}`);
  },
};
