import { useState, useCallback } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { OTPScreen } from './components/OTPScreen'
import { OnboardingScreen } from './components/OnboardingScreen'
import { HomeScreen } from './components/HomeScreen'
import { SubjectsScreen } from './components/SubjectsScreen'
import { ChaptersScreen } from './components/ChaptersScreen'
import { TestConfigScreen } from './components/TestConfigScreen'
import { LiveTestScreen } from './components/LiveTestScreen'
import { TestResultScreen } from './components/TestResultScreen'
import { AIChatScreen } from './components/AIChatScreen'
import { TopicDashboardScreen } from './components/TopicDashboardScreen'
import { HistoryScreen } from './components/HistoryScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { BottomTabBar } from './components/BottomTabBar'
import type { Screen, Tab, Subject, TestQuestion, TestResult, ChatMessage } from './types'
import { SUBJECTS, getAIResponse } from './data'

const MAIN_TABS: Screen[] = ['home', 'subjects', 'history', 'chat', 'settings']

export default function App() {
  // Navigation
  const [screenStack, setScreenStack] = useState<Screen[]>(['login'])
  const screen = screenStack[screenStack.length - 1]

  const navigate = useCallback((s: Screen) => setScreenStack(prev => [...prev, s]), [])
  const goBack = useCallback(() => setScreenStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev), [])

  const [activeTab, setActiveTab] = useState<Tab>('home')
  const handleTabChange = useCallback((t: Tab) => {
    const map: Record<Tab, Screen> = { home: 'home', subjects: 'subjects', history: 'history', chat: 'chat', settings: 'settings' }
    setActiveTab(t)
    setScreenStack([map[t]])
  }, [])

  // App settings
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState('English')

  // Auth
  const [loginEmail, setLoginEmail] = useState('')

  // Onboarding
  const [onboardStep, setOnboardStep] = useState(0)
  const [board, setBoard] = useState<'CBSE' | 'ICSE' | 'GSEB' | ''>('')
  const [standard, setStandard] = useState(0)
  const [studentName, setStudentName] = useState('')

  // Subject/chapter/test flow
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([])
  const [testMarksPerQ, setTestMarksPerQ] = useState(1)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', content: "Hi! I'm your EduLearn AI tutor 🎓\n\nI can help you understand any concept from your CBSE/ICSE/GSEB syllabus. What would you like to learn today?", timestamp: new Date() },
  ])

  // Topic
  const [topicChapter, setTopicChapter] = useState('')

  const showTabBar = MAIN_TABS.includes(screen)

  const handleSubjectPress = (s: Subject) => {
    setSelectedSubject(s)
    setSelectedChapters([])
    navigate('chapters')
  }

  const handleTopicPress = (chapter: string) => {
    setTopicChapter(chapter)
    navigate('topic')
  }

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen email={loginEmail} setEmail={setLoginEmail} onSendOTP={() => navigate('otp')} />

      case 'otp':
        return <OTPScreen email={loginEmail} onVerify={() => { setOnboardStep(0); navigate('onboard') }} onBack={goBack} />

      case 'onboard':
        return (
          <OnboardingScreen
            step={onboardStep}
            board={board}
            standard={standard}
            name={studentName}
            onSetBoard={b => { setBoard(b); setOnboardStep(1) }}
            onSetStandard={s => { setStandard(s); setOnboardStep(2) }}
            onSetName={setStudentName}
            onComplete={() => { setScreenStack(['home']); setActiveTab('home') }}
            onBack={() => setOnboardStep(s => Math.max(0, s - 1))}
          />
        )

      case 'home':
        return (
          <HomeScreen
            studentName={studentName || 'Arjun'}
            board={board || 'CBSE'}
            standard={standard || 10}
            subjects={SUBJECTS}
            onSubjectPress={handleSubjectPress}
            onTopicPress={handleTopicPress}
            onViewAllHistory={() => handleTabChange('history')}
          />
        )

      case 'subjects':
        return <SubjectsScreen subjects={SUBJECTS} onSubjectPress={handleSubjectPress} />

      case 'chapters':
        if (!selectedSubject) return null
        return (
          <ChaptersScreen
            subject={selectedSubject}
            selectedChapters={selectedChapters}
            onToggleChapter={id =>
              setSelectedChapters(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
            }
            onStartTest={() => navigate('test-config')}
            onBack={goBack}
            onChapterPress={handleTopicPress}
          />
        )

      case 'test-config':
        if (!selectedSubject) return null
        return (
          <TestConfigScreen
            subject={selectedSubject}
            chapters={selectedChapters}
            onStartTest={(qs: TestQuestion[], marksPerQ: number) => {
              setTestQuestions(qs)
              setTestMarksPerQ(marksPerQ)
              navigate('live-test')
            }}
            onBack={goBack}
          />
        )

      case 'live-test':
        if (!selectedSubject || !testQuestions.length) return null
        return (
          <LiveTestScreen
            questions={testQuestions}
            subject={selectedSubject}
            marksPerQuestion={testMarksPerQ}
            onSubmit={result => { setTestResult(result); navigate('test-result') }}
            onBack={goBack}
          />
        )

      case 'test-result':
        if (!testResult || !selectedSubject) return null
        return (
          <TestResultScreen
            result={testResult}
            subject={selectedSubject}
            onHome={() => { setScreenStack(['home']); setActiveTab('home') }}
            onRetry={() => setScreenStack(prev => [...prev.slice(0, -1), 'test-config'])}
          />
        )

      case 'history':
        return (
          <HistoryScreen
            onViewResult={result => {
              setTestResult(result)
              if (!selectedSubject) {
                const fallback = SUBJECTS.find(s => s.name === result.subject) || SUBJECTS[0]
                setSelectedSubject(fallback)
              }
              navigate('test-result')
            }}
          />
        )

      case 'chat':
        return (
          <AIChatScreen
            messages={chatMessages}
            subject={selectedSubject?.name || 'General'}
            onSendMessage={msg => {
              const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() }
              setChatMessages(prev => [...prev, userMsg])
              setTimeout(() => {
                const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', content: getAIResponse(msg), timestamp: new Date() }
                setChatMessages(prev => [...prev, aiMsg])
              }, 1000)
            }}
          />
        )

      case 'topic':
        return (
          <TopicDashboardScreen
            chapter={topicChapter}
            subject={selectedSubject?.name || 'Mathematics'}
            onBack={goBack}
          />
        )

      case 'settings':
        return (
          <SettingsScreen
            darkMode={darkMode}
            language={language}
            studentName={studentName || 'Arjun'}
            board={board || 'CBSE'}
            standard={standard || 10}
            onToggleDark={() => setDarkMode(d => !d)}
            onChangeLanguage={setLanguage}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-violet-50 to-blue-100 dark:from-gray-950 dark:via-indigo-950 dark:to-slate-950 flex items-start justify-center py-6 px-4 overflow-auto">
        <div className="flex flex-col items-center gap-3">
          {/* Branding */}
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-0.5">
              <span className="text-xl">🎓</span>
              <span
                className="font-black text-transparent bg-clip-text"
                style={{ fontSize: 20, backgroundImage: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              >
                EduLearn
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Interactive Mobile App Preview</p>
          </div>

          {/* iPhone 16 Pro frame */}
          <div
            className="relative flex-shrink-0"
            style={{
              width: 413,
              background: 'linear-gradient(160deg, #2A2A2A 0%, #1A1A1A 100%)',
              borderRadius: 58,
              padding: 10,
              boxShadow:
                '0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 2px rgba(255,255,255,0.04)',
            }}
          >
            {/* Physical buttons */}
            <div className="absolute top-28 -left-[3px] w-[3px] h-7 rounded-l-sm" style={{ background: '#383838' }} />
            <div className="absolute top-44 -left-[3px] w-[3px] h-12 rounded-l-sm" style={{ background: '#383838' }} />
            <div className="absolute top-60 -left-[3px] w-[3px] h-12 rounded-l-sm" style={{ background: '#383838' }} />
            <div className="absolute top-36 -right-[3px] w-[3px] h-16 rounded-r-sm" style={{ background: '#383838' }} />

            {/* Screen */}
            <div
              className="relative overflow-hidden"
              style={{
                width: 393,
                height: 852,
                borderRadius: 48,
                backgroundColor: darkMode ? '#0F0E1A' : '#F8F7FF',
              }}
            >
              {/* Screen glare */}
              <div
                className="absolute inset-0 pointer-events-none z-[60]"
                style={{
                  borderRadius: 48,
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.055) 0%, transparent 35%)',
                }}
              />

              {/* Dynamic Island */}
              <div
                className="absolute z-50"
                style={{
                  top: 14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 126,
                  height: 37,
                  background: '#000',
                  borderRadius: 20,
                }}
              />

              {/* Status bar */}
              <div className="absolute top-0 left-0 right-0 h-[60px] z-40 flex items-end justify-between px-7 pb-2 pointer-events-none select-none">
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: darkMode ? 'rgba(240,239,254,0.65)' : 'rgba(15,14,26,0.55)' }}
                >
                  9:41
                </span>
                <div
                  className="flex items-center gap-1.5"
                  style={{ color: darkMode ? 'rgba(240,239,254,0.65)' : 'rgba(15,14,26,0.55)' }}
                >
                  <div className="flex items-end gap-[2px]" style={{ height: 10 }}>
                    {[4, 6, 8, 10].map((h, i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-[1px]"
                        style={{ height: h, background: 'currentColor', opacity: i < 3 ? 1 : 0.35 }}
                      />
                    ))}
                  </div>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" opacity={0.9}>
                    <circle cx="7" cy="9" r="1.5" />
                    <path d="M7 5.5C8.5 5.5 9.8 6.1 10.7 7L11.8 5.9C10.6 4.7 8.9 4 7 4S3.4 4.7 2.2 5.9l1.1 1.1C4.2 6.1 5.5 5.5 7 5.5z" />
                    <path d="M7 2C9.3 2 11.4 2.9 13 4.4l1.1-1.1C12.5 1.5 9.9 0.5 7 0.5S1.5 1.5 -0.1 3.3l1.1 1.1C2.6 2.9 4.7 2 7 2z" opacity="0.4" />
                  </svg>
                  <div className="flex items-center gap-[2px]">
                    <div
                      className="flex items-center p-[2px] rounded-[3px]"
                      style={{ width: 23, height: 12, border: '1px solid currentColor' }}
                    >
                      <div className="rounded-[1px] bg-current" style={{ width: '70%', height: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Screen content */}
              <div
                id="screen-scroll"
                className="absolute inset-0 overflow-y-auto"
                style={{ paddingTop: 60, paddingBottom: showTabBar ? 84 : 0 }}
              >
                <style>{`#screen-scroll::-webkit-scrollbar{display:none}#screen-scroll{scrollbar-width:none}`}</style>
                {renderScreen()}
              </div>

              {/* Bottom tab bar */}
              {showTabBar && (
                <div className="absolute bottom-0 left-0 right-0 z-40">
                  <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} />
                </div>
              )}

              {/* Home indicator */}
              <div
                className="absolute bottom-[7px] left-1/2 -translate-x-1/2 z-50 pointer-events-none rounded-full"
                style={{
                  width: 130,
                  height: 5,
                  background: darkMode ? 'rgba(240,239,254,0.28)' : 'rgba(15,14,26,0.22)',
                }}
              />
            </div>
          </div>

          {/* Current screen badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-full px-3 py-1.5 shadow-sm border border-white/50 dark:border-gray-700/50 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-gray-500 dark:text-gray-400">Screen:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{screen}</span>
            </div>
            {darkMode && (
              <div className="bg-indigo-900/60 text-indigo-300 px-2.5 py-1.5 rounded-full text-xs font-medium">
                🌙 Dark
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
