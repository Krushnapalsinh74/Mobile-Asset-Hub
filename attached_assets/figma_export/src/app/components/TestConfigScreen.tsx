import { useState, useMemo } from 'react'
import { ArrowLeft, Plus, Minus, Play } from 'lucide-react'
import type { Subject, TestQuestion, ChapterConfig } from '../types'
import { SAMPLE_QUESTIONS, CHAPTERS_BY_SUBJECT } from '../data'

interface Props {
  subject: Subject
  chapters: string[]
  onStartTest: (questions: TestQuestion[], marksPerQ: number) => void
  onBack: () => void
}

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy 😊', color: 'var(--success)', bg: 'var(--success-bg)' },
  medium: { label: 'Medium 🔥', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  hard: { label: 'Hard 💀', color: 'var(--error)', bg: 'var(--error-bg)' },
}

const defaultConfig = (): ChapterConfig => ({ questionCount: 5, marksPerQuestion: 1, difficulty: 'medium' })

export function TestConfigScreen({ subject, chapters, onStartTest, onBack }: Props) {
  const chapterNames = useMemo(() => {
    const all = CHAPTERS_BY_SUBJECT[subject.id] || []
    return chapters.map(id => all.find(c => c.id === id)?.name || id)
  }, [subject, chapters])

  const [configs, setConfigs] = useState<Record<string, ChapterConfig>>(
    () => Object.fromEntries(chapters.map(id => [id, defaultConfig()]))
  )

  const update = (id: string, patch: Partial<ChapterConfig>) => {
    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const totalQuestions = Object.values(configs).reduce((sum, c) => sum + c.questionCount, 0)
  const avgMarks = Math.round(Object.values(configs).reduce((sum, c) => sum + c.marksPerQuestion, 0) / chapters.length)
  const totalMarks = Object.values(configs).reduce((sum, c) => sum + c.questionCount * c.marksPerQuestion, 0)

  const handleStart = () => {
    const pool = [...SAMPLE_QUESTIONS]
    const questions: TestQuestion[] = []
    for (let i = 0; i < totalQuestions; i++) {
      questions.push(pool[i % pool.length])
    }
    onStartTest(questions.map((q, i) => ({ ...q, id: i + 1 })), avgMarks)
  }

  return (
    <div className="bg-background min-h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-2 pb-5 border-b border-border bg-card">
        <button onClick={onBack} className="flex items-center gap-1.5 text-primary mb-3">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: subject.bgColor }}
          >
            {subject.emoji}
          </div>
          <div>
            <h2 className="font-bold text-foreground" style={{ fontSize: 18 }}>Configure Test</h2>
            <p className="text-xs text-muted-foreground">{subject.name} · {chapters.length} chapter{chapters.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4 mb-4">
          {chapters.map((id, idx) => {
            const cfg = configs[id]
            const name = chapterNames[idx]
            return (
              <div key={id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border/50 bg-muted/40">
                  <p className="font-semibold text-foreground text-sm">{name}</p>
                </div>
                <div className="p-4 space-y-4">
                  {/* Question count stepper */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Questions
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => update(id, { questionCount: Math.max(1, cfg.questionCount - 1) })}
                        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-90 transition-transform border border-border"
                      >
                        <Minus size={16} className="text-foreground" />
                      </button>
                      <div className="flex-1 text-center">
                        <span className="font-bold text-primary" style={{ fontSize: 22 }}>{cfg.questionCount}</span>
                        <span className="text-muted-foreground text-sm"> questions</span>
                      </div>
                      <button
                        onClick={() => update(id, { questionCount: Math.min(30, cfg.questionCount + 1) })}
                        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-90 transition-transform border border-border"
                      >
                        <Plus size={16} className="text-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Marks per question */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Marks per Question
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(m => (
                        <button
                          key={m}
                          onClick={() => update(id, { marksPerQuestion: m })}
                          className={`flex-1 py-2 rounded-xl border-2 font-bold transition-all active:scale-95 ${
                            cfg.marksPerQuestion === m
                              ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                              : 'bg-muted border-border text-foreground'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Difficulty
                    </p>
                    <div className="flex gap-2">
                      {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG['easy']][]).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => update(id, { difficulty: key })}
                          className={`flex-1 py-2 rounded-xl border-2 font-medium transition-all active:scale-95 text-xs`}
                          style={{
                            borderColor: cfg.difficulty === key ? val.color : 'var(--border)',
                            backgroundColor: cfg.difficulty === key ? val.bg : 'var(--muted)',
                            color: cfg.difficulty === key ? val.color : 'var(--muted-foreground)',
                          }}
                        >
                          {val.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chapter subtotal */}
                  <div className="bg-muted/60 rounded-xl px-3 py-2 flex justify-between text-xs">
                    <span className="text-muted-foreground">Chapter marks</span>
                    <span className="font-semibold text-foreground">
                      {cfg.questionCount} × {cfg.marksPerQuestion} = <span className="text-primary">{cfg.questionCount * cfg.marksPerQuestion} marks</span>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Total summary + Start */}
      <div className="border-t border-border bg-card px-5 pt-4 pb-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Questions', value: totalQuestions },
            { label: 'Total Marks', value: totalMarks },
            { label: 'Est. Time', value: `${Math.ceil(totalQuestions * 1.5)}m` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted rounded-xl py-2.5 text-center">
              <p className="font-bold text-primary" style={{ fontSize: 18 }}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <button
          onClick={handleStart}
          className="w-full rounded-xl py-4 font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          <Play size={18} fill="white" />
          Start Test Now
        </button>
      </div>
    </div>
  )
}
