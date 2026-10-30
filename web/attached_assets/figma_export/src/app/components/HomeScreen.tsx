import { Bell, Flame, ChevronRight, Zap, TrendingUp, Trophy } from 'lucide-react'
import type { Subject } from '../types'

interface Props {
  studentName: string
  board: string
  standard: number
  subjects: Subject[]
  onSubjectPress: (s: Subject) => void
  onTopicPress: (chapter: string) => void
  onViewAllHistory: () => void
}

export function HomeScreen({ studentName, board, standard, subjects, onSubjectPress, onTopicPress, onViewAllHistory }: Props) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const greetEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙'

  const recentTests = [
    { subject: 'Mathematics', emoji: '📐', chapters: 'Real Numbers, Polynomials', score: 34, total: 40, date: '2 days ago' },
    { subject: 'Science', emoji: '🔬', chapters: 'Chemical Reactions', score: 18, total: 25, date: '5 days ago' },
  ]

  return (
    <div className="bg-background">
      {/* Gradient header */}
      <div
        className="px-5 pt-2 pb-16 rounded-b-[32px]"
        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-white/70 text-sm">{greeting} {greetEmoji}</p>
            <h2 className="text-white font-bold" style={{ fontSize: 22 }}>{studentName} 👋</h2>
            <div className="flex gap-1.5 mt-1.5">
              <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">{board}</span>
              <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">Class {standard}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center relative">
              <Bell size={19} color="white" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border border-white/50" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center font-bold text-orange-900">
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white/15 backdrop-blur rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-400/30 rounded-xl flex items-center justify-center">
              <Flame size={20} className="text-orange-300" />
            </div>
            <div>
              <p className="text-white font-bold leading-tight">7 Day Streak 🔥</p>
              <p className="text-white/60 text-xs">Keep it up! Don't break the chain</p>
            </div>
          </div>
          <div className="flex gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                  i < 7 ? 'bg-orange-400 text-white' : 'bg-white/20 text-white/50'
                }`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-5 -mt-8 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Tests Taken', value: '24', emoji: '📝', color: '#4F46E5' },
            { label: 'Avg Score', value: '72%', emoji: '🎯', color: '#10B981' },
            { label: 'Study Hrs', value: '48h', emoji: '⏱️', color: '#8B5CF6' },
          ].map(({ label, value, emoji, color }) => (
            <div key={label} className="bg-card rounded-2xl p-3 text-center border border-border shadow-md">
              <div className="text-xl mb-0.5">{emoji}</div>
              <div className="font-bold text-foreground" style={{ fontSize: 16, color }}>{value}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5">
        {/* AI suggestion */}
        <button
          onClick={() => onTopicPress('Quadratic Equations')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 mb-5 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={20} color="white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white/70 text-xs font-medium">✨ Suggested for today</p>
            <p className="text-white font-bold">Quadratic Equations</p>
            <p className="text-white/60 text-xs">15 questions · ~30 min · Class {standard}</p>
          </div>
          <ChevronRight size={18} color="white" opacity={0.7} />
        </button>

        {/* Subjects */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground" style={{ fontSize: 16 }}>My Subjects</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => onSubjectPress(subject)}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm text-left active:scale-95 transition-transform"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl"
                style={{ backgroundColor: subject.bgColor }}
              >
                {subject.emoji}
              </div>
              <p className="font-semibold text-foreground leading-tight mb-1" style={{ fontSize: 13 }}>
                {subject.name}
              </p>
              <p className="text-xs text-muted-foreground mb-2">{subject.chapters} chapters</p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${subject.progress}%`, backgroundColor: subject.color }}
                />
              </div>
              <p className="text-[11px] mt-1 font-medium" style={{ color: subject.color }}>
                {subject.progress}% complete
              </p>
            </button>
          ))}
        </div>

        {/* Recent Tests */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground" style={{ fontSize: 16 }}>Recent Tests</h3>
          <button onClick={onViewAllHistory} className="text-primary text-sm font-medium">View all</button>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {recentTests.map((test, i) => {
            const pct = Math.round((test.score / test.total) * 100)
            const color = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--error)'
            return (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3 shadow-sm">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${color}18` }}
                >
                  {test.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground" style={{ fontSize: 13 }}>{test.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{test.chapters}</p>
                  <p className="text-xs text-muted-foreground">{test.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold" style={{ fontSize: 16, color }}>{test.score}/{test.total}</p>
                  <p className="text-xs font-semibold" style={{ color }}>{pct}%</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Leaderboard teaser */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border border-yellow-200 dark:border-yellow-800/30 rounded-2xl p-4 flex items-center gap-3 mb-4">
          <Trophy size={24} className="text-yellow-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">Class Rank: #3 🏆</p>
            <p className="text-xs text-muted-foreground">You're in the top 10% this week!</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  )
}
