import { useState } from 'react'
import { Home, RefreshCw, ChevronDown, ChevronUp, Share2 } from 'lucide-react'
import type { Subject, TestResult } from '../types'

interface Props {
  result: TestResult
  subject: Subject
  onHome: () => void
  onRetry: () => void
}

export function TestResultScreen({ result, subject, onHome, onRetry }: Props) {
  const [expandedQ, setExpandedQ] = useState<number | null>(null)

  const { questions, userAnswers, timeTaken, marksPerQuestion } = result
  const correct = userAnswers.filter((a, i) => a === questions[i]?.correctIndex).length
  const wrong = userAnswers.filter((a, i) => a !== null && a !== questions[i]?.correctIndex).length
  const skipped = userAnswers.filter(a => a === null).length
  const totalMarks = questions.length * marksPerQuestion
  const score = correct * marksPerQuestion
  const pct = Math.round((score / totalMarks) * 100)

  const gradientStyle = pct >= 70
    ? 'linear-gradient(135deg, #059669, #10B981)'
    : pct >= 50
    ? 'linear-gradient(135deg, #D97706, #F59E0B)'
    : 'linear-gradient(135deg, #4F46E5, #7C3AED)'

  const emoji = pct >= 80 ? '🏆' : pct >= 70 ? '🎯' : pct >= 50 ? '💪' : '📚'
  const message =
    pct >= 80 ? "Excellent! You've mastered this topic!" :
    pct >= 70 ? "Great work! Keep practicing to improve further." :
    pct >= 50 ? "Good effort! Review the explanations to strengthen your concepts." :
    "Don't give up! Every attempt makes you stronger. Review and retry."

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`

  return (
    <div className="bg-background min-h-full">
      {/* Gradient header */}
      <div className="px-5 pt-4 pb-8 rounded-b-[32px] text-white" style={{ background: gradientStyle }}>
        <div className="text-center">
          <div className="text-5xl mb-3">{emoji}</div>
          <p className="text-white/80 text-sm font-medium mb-1">Test Result</p>
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="font-bold" style={{ fontSize: 48 }}>{score}</span>
            <span className="text-white/70" style={{ fontSize: 22 }}>/{totalMarks}</span>
          </div>
          <div
            className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-3"
          >
            <span className="font-bold" style={{ fontSize: 20 }}>{pct}%</span>
          </div>
          <p className="text-white/80 text-sm text-center px-4 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="px-5 -mt-4">
        {/* Stats grid */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-4 mb-4">
          <div className="grid grid-cols-4 divide-x divide-border">
            {[
              { label: 'Correct', value: correct, color: 'var(--success)' },
              { label: 'Wrong', value: wrong, color: 'var(--error)' },
              { label: 'Skipped', value: skipped, color: 'var(--warning)' },
              { label: 'Time', value: fmt(timeTaken), color: 'var(--primary)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-2">
                <p className="font-bold" style={{ fontSize: 18, color }}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Performance bar */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Performance Breakdown</p>
          <div className="space-y-2.5">
            {[
              { label: 'Correct', count: correct, total: questions.length, color: 'var(--success)' },
              { label: 'Wrong', count: wrong, total: questions.length, color: 'var(--error)' },
              { label: 'Skipped', count: skipped, total: questions.length, color: 'var(--warning)' },
            ].map(({ label, count, total, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold text-foreground">{count}/{total}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-primary text-primary font-semibold active:scale-95 transition-all"
          >
            <RefreshCw size={16} />
            Retry
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-border text-foreground font-semibold active:scale-95 transition-all"
          >
            <Share2 size={16} />
            Share
          </button>
          <button
            onClick={onHome}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold active:scale-95 transition-all shadow-md shadow-primary/25"
          >
            <Home size={16} />
            Home
          </button>
        </div>

        {/* Explanations */}
        <div className="mb-4">
          <p className="font-bold text-foreground mb-3" style={{ fontSize: 16 }}>Question Review</p>
          <div className="flex flex-col gap-2">
            {questions.slice(0, 8).map((q, i) => {
              const ua = userAnswers[i]
              const isCorrect = ua === q.correctIndex
              const isSkipped = ua === null
              const isExpanded = expandedQ === i

              const statusColor = isSkipped ? 'var(--warning)' : isCorrect ? 'var(--success)' : 'var(--error)'
              const statusLabel = isSkipped ? 'Skipped' : isCorrect ? 'Correct ✓' : 'Wrong ✗'
              const statusBg = isSkipped ? 'var(--warning-bg)' : isCorrect ? 'var(--success-bg)' : 'var(--error-bg)'

              return (
                <div
                  key={i}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
                >
                  <button
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                    onClick={() => setExpandedQ(isExpanded ? null : i)}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: statusBg, color: statusColor }}
                    >
                      {i + 1}
                    </div>
                    <p className="flex-1 text-sm text-foreground leading-snug line-clamp-2">{q.question}</p>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-[10px] font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/50">
                      <div className="flex flex-col gap-1.5 mt-3 mb-3">
                        {q.options.map((opt, j) => {
                          const isUserAnswer = ua === j
                          const isCorrectAnswer = q.correctIndex === j
                          let bg = 'var(--muted)'
                          let color = 'var(--muted-foreground)'
                          let border = 'transparent'
                          if (isCorrectAnswer) { bg = 'var(--success-bg)'; color = 'var(--success)'; border = 'var(--success)' }
                          else if (isUserAnswer && !isCorrect) { bg = 'var(--error-bg)'; color = 'var(--error)'; border = 'var(--error)' }
                          return (
                            <div
                              key={j}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: bg, borderColor: border !== 'transparent' ? border : 'transparent' }}
                            >
                              <span className="w-5 h-5 rounded font-bold text-xs flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22', color }}>
                                {String.fromCharCode(65 + j)}
                              </span>
                              <span className="text-xs leading-snug" style={{ color }}>{opt}</span>
                              {isCorrectAnswer && <span className="ml-auto text-xs font-bold" style={{ color }}>✓ Correct</span>}
                              {isUserAnswer && !isCorrect && <span className="ml-auto text-xs font-bold" style={{ color }}>Your answer</span>}
                            </div>
                          )
                        })}
                      </div>
                      <div className="bg-accent rounded-xl p-3">
                        <p className="text-xs font-semibold text-accent-foreground mb-1">💡 Explanation</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
