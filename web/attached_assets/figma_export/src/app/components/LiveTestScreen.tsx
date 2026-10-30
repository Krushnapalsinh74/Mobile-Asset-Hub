import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Flag } from 'lucide-react'
import type { Subject, TestQuestion, TestResult } from '../types'

interface Props {
  questions: TestQuestion[]
  subject: Subject
  marksPerQuestion?: number
  onSubmit: (result: TestResult) => void
  onBack: () => void
}

const OPTIONS = ['A', 'B', 'C', 'D']

export function LiveTestScreen({ questions, subject, marksPerQuestion = 1, onSubmit, onBack }: Props) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(questions.length).fill(null))
  const [timeLeft, setTimeLeft] = useState(questions.length * 90)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [flagged, setFlagged] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (timeLeft <= 0) { handleFinalSubmit(); return }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [timeLeft])

  const handleFinalSubmit = useCallback(() => {
    const result: TestResult = {
      questions,
      userAnswers: answers,
      timeTaken: questions.length * 90 - timeLeft,
      subject: subject.name,
      date: new Date(),
      marksPerQuestion,
    }
    onSubmit(result)
  }, [answers, questions, timeLeft, subject, onSubmit])

  const select = (optIndex: number) => {
    setAnswers(prev => {
      const next = [...prev]
      next[current] = optIndex
      return next
    })
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const answered = answers.filter(a => a !== null).length
  const progress = (answered / questions.length) * 100
  const isLowTime = timeLeft < 120

  const q = questions[current]
  const statusFor = (i: number) => {
    if (i === current) return 'current'
    if (flagged.has(i)) return 'flagged'
    if (answers[i] !== null) return 'answered'
    return 'unanswered'
  }

  return (
    <div className="bg-background min-h-full flex flex-col">
      {/* Sticky header */}
      <div className="bg-card border-b border-border px-4 pt-2 pb-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: subject.bgColor }}
            >
              {subject.emoji}
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs leading-none">{subject.name}</p>
              <p className="text-muted-foreground text-[10px]">Q {current + 1} of {questions.length}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold ${
            isLowTime
              ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
              : 'bg-primary/10 text-primary'
          }`}>
            <span className="text-sm tabular-nums">{fmt(timeLeft)}</span>
            {isLowTime && <AlertCircle size={13} />}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: 'var(--primary)' }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{answered}/{questions.length} answered</span>
          <span className="text-[10px] font-medium text-primary">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
              Q{current + 1}
            </span>
            <button
              onClick={() => setFlagged(prev => {
                const next = new Set(prev)
                next.has(current) ? next.delete(current) : next.add(current)
                return next
              })}
              className={`flex-shrink-0 transition-colors ${flagged.has(current) ? 'text-warning' : 'text-muted-foreground'}`}
            >
              <Flag size={16} fill={flagged.has(current) ? 'currentColor' : 'none'} />
            </button>
          </div>
          <p className="text-foreground leading-relaxed" style={{ fontSize: 14 }}>{q.question}</p>
          <p className="text-xs text-muted-foreground mt-2">Chapter: {q.chapter}</p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2.5 mb-6">
          {q.options.map((opt, i) => {
            const selected = answers[current] === i
            return (
              <button
                key={i}
                onClick={() => select(i)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all active:scale-98 ${
                  selected
                    ? 'border-primary bg-primary/8 shadow-md shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all ${
                    selected
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {OPTIONS[i]}
                </div>
                <span className={`text-sm leading-snug ${selected ? 'text-foreground font-medium' : 'text-foreground/80'}`}>
                  {opt}
                </span>
              </button>
            )
          })}
        </div>

        {/* Question navigator */}
        <div className="bg-card rounded-2xl border border-border p-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2.5">Question Navigator</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((_, i) => {
              const s = statusFor(i)
              return (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-8 h-8 rounded-lg font-semibold transition-all active:scale-90 text-xs ${
                    s === 'current'
                      ? 'bg-primary text-white shadow-md shadow-primary/30 scale-110'
                      : s === 'answered'
                      ? 'bg-success text-white'
                      : s === 'flagged'
                      ? 'bg-warning text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  style={
                    s === 'answered' ? { backgroundColor: 'var(--success)', color: 'white' }
                    : s === 'flagged' ? { backgroundColor: 'var(--warning)', color: 'white' }
                    : {}
                  }
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            {[
              { color: 'bg-primary', label: 'Current' },
              { color: 'bg-success', label: 'Answered', style: { backgroundColor: 'var(--success)' } },
              { color: 'bg-warning', label: 'Flagged', style: { backgroundColor: 'var(--warning)' } },
              { color: 'bg-muted', label: 'Not visited' },
            ].map(({ color, label, style }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${color}`} style={style} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="px-4 pb-4 bg-background border-t border-border pt-3">
        <div className="flex gap-3 mb-3">
          <button
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex-1 py-3 rounded-xl border-2 border-border font-semibold text-foreground disabled:opacity-40 active:scale-95 transition-all text-sm"
          >
            ← Previous
          </button>
          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold active:scale-95 transition-all border-2 border-primary/20 text-sm"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold active:scale-95 transition-all text-sm shadow-md shadow-primary/25"
            >
              Submit Test
            </button>
          )}
        </div>
        {current === questions.length - 1 && (
          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            Submit All Answers
          </button>
        )}
      </div>

      {/* Submit modal */}
      {showSubmitModal && (
        <div className="absolute inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-card w-full rounded-t-3xl p-6">
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-5" />
            <h3 className="font-bold text-foreground text-center mb-1" style={{ fontSize: 18 }}>Submit Test?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5">
              {answered} of {questions.length} questions answered
              {questions.length - answered > 0 && (
                <span className="text-error font-medium"> · {questions.length - answered} unanswered</span>
              )}
            </p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Answered', value: answered, color: 'var(--success)' },
                { label: 'Unanswered', value: questions.length - answered, color: 'var(--error)' },
                { label: 'Flagged', value: flagged.size, color: 'var(--warning)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted rounded-xl p-3 text-center">
                  <p className="font-bold" style={{ fontSize: 20, color }}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={handleFinalSubmit}
              className="w-full py-4 rounded-xl bg-primary text-white font-bold mb-3 shadow-lg shadow-primary/25 active:scale-95 transition-all"
            >
              Yes, Submit Test
            </button>
            <button
              onClick={() => setShowSubmitModal(false)}
              className="w-full py-3 rounded-xl border-2 border-border font-semibold text-foreground"
            >
              Continue Answering
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
