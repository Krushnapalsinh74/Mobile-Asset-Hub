export type Screen =
  | 'login' | 'otp' | 'onboard'
  | 'home' | 'subjects' | 'chapters' | 'test-config' | 'live-test' | 'test-result'
  | 'history' | 'chat' | 'topic' | 'settings'

export type Tab = 'home' | 'subjects' | 'history' | 'chat' | 'settings'

export interface Subject {
  id: string
  name: string
  emoji: string
  color: string
  bgColor: string
  chapters: number
  progress: number
}

export interface Chapter {
  id: string
  name: string
  questionCount: number
}

export interface TestQuestion {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  chapter: string
}

export interface TestResult {
  questions: TestQuestion[]
  userAnswers: (number | null)[]
  timeTaken: number
  subject: string
  date: Date
  marksPerQuestion: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

export interface ChapterConfig {
  questionCount: number
  marksPerQuestion: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface HistoryEntry {
  id: string
  subject: string
  subjectColor: string
  chapters: string[]
  score: number
  total: number
  date: Date
  timeTaken: number
}
