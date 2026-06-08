import { TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react'
import type { TestResult } from '../types'
import { MOCK_HISTORY, SAMPLE_QUESTIONS } from '../data'

interface Props {
  onViewResult: (r: TestResult) => void
}

export function HistoryScreen({ onViewResult }: Props) {
  const tests = MOCK_HISTORY

  const totalTests = tests.length
  const avgScore = Math.round(tests.reduce((s, t) => s + (t.score / t.total) * 100, 0) / tests.length)
  const bestScore = Math.max(...tests.map(t => Math.round((t.score / t.total) * 100)))

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
  const fmtDate = (d: Date) => {
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const handleView = (entry: typeof tests[0]) => {
    const q = SAMPLE_QUESTIONS.slice(0, Math.round(entry.total / 2))
    const result: TestResult = {
      questions: q,
      userAnswers: q.map((_, i) => i < entry.score ? q[i].correctIndex : null),
      timeTaken: entry.timeTaken,
      subject: entry.subject,
      date: entry.date,
      marksPerQuestion: 2,
    }
    onViewResult(result)
  }

  return (
    <div className="bg-background min-h-full px-5 pt-4 pb-4">
      <h2 className="font-bold text-foreground mb-1" style={{ fontSize: 22 }}>Test History</h2>
      <p className="text-sm text-muted-foreground mb-4">Your past performance</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Tests Done', value: totalTests, emoji: '📝', color: '#4F46E5' },
          { label: 'Avg Score', value: `${avgScore}%`, emoji: '🎯', color: '#10B981' },
          { label: 'Best Score', value: `${bestScore}%`, emoji: '🏆', color: '#F59E0B' },
        ].map(({ label, value, emoji, color }) => (
          <div key={label} className="bg-card rounded-2xl p-3 text-center border border-border shadow-sm">
            <div className="text-xl mb-0.5">{emoji}</div>
            <p className="font-bold" style={{ fontSize: 16, color }}>{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Test list */}
      <div className="flex flex-col gap-3">
        {tests.map(entry => {
          const pct = Math.round((entry.score / entry.total) * 100)
          const color = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--error)'
          const TrendIcon = pct >= 70 ? TrendingUp : TrendingDown

          return (
            <button
              key={entry.id}
              onClick={() => handleView(entry)}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm text-left active:scale-98 transition-transform"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${entry.subjectColor}18` }}
                >
                  <TrendIcon size={22} style={{ color: entry.subjectColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-foreground" style={{ fontSize: 15 }}>{entry.subject}</p>
                    <div
                      className="px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <span className="font-bold text-sm" style={{ color }}>{pct}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {entry.chapters.join(' · ')}
                  </p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar size={11} />
                        <span className="text-[11px]">{fmtDate(entry.date)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={11} />
                        <span className="text-[11px]">{fmt(entry.timeTaken)}</span>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{entry.score}/{entry.total} marks</p>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {tests.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          <p className="font-semibold text-foreground">No tests yet</p>
          <p className="text-sm text-muted-foreground mt-1">Complete your first test to see results here</p>
        </div>
      )}
    </div>
  )
}
