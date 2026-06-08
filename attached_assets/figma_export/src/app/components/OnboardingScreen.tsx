import { Check, ArrowLeft } from 'lucide-react'

interface Props {
  step: number
  board: string
  standard: number
  name: string
  onSetBoard: (b: 'CBSE' | 'ICSE' | 'GSEB') => void
  onSetStandard: (s: number) => void
  onSetName: (n: string) => void
  onComplete: () => void
  onBack: () => void
}

const BOARDS = [
  { id: 'CBSE', label: 'CBSE', desc: 'Central Board of Secondary Education', emoji: '🏛️', students: '250M+' },
  { id: 'ICSE', label: 'ICSE', desc: 'Indian Certificate of Secondary Education', emoji: '🎓', students: '15M+' },
  { id: 'GSEB', label: 'GSEB', desc: 'Gujarat Secondary Education Board', emoji: '🦁', students: '10M+' },
]

export function OnboardingScreen({ step, board, standard, name, onSetBoard, onSetStandard, onSetName, onComplete, onBack }: Props) {
  return (
    <div className="min-h-full flex flex-col bg-background px-5 pt-4">
      {/* Progress */}
      <div className="mb-6">
        {step > 0 && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-primary -ml-1 mb-4">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}
        <div className="flex gap-2 mb-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Step {step + 1} of 3</p>
      </div>

      {/* Step 0 — Board */}
      {step === 0 && (
        <div>
          <div className="mb-6">
            <p className="text-3xl mb-3">🎒</p>
            <h2 className="font-bold text-foreground mb-1" style={{ fontSize: 24 }}>Select Your Board</h2>
            <p className="text-sm text-muted-foreground">Choose the curriculum you follow in school</p>
          </div>
          <div className="flex flex-col gap-3">
            {BOARDS.map(b => (
              <button
                key={b.id}
                onClick={() => onSetBoard(b.id as 'CBSE' | 'ICSE' | 'GSEB')}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-98 ${
                  board === b.id
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                  {b.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground">{b.label}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{b.desc}</div>
                  <div className="text-xs text-primary font-medium mt-0.5">{b.students} students</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  board === b.id ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {board === b.id && <Check size={14} color="white" strokeWidth={3} />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1 — Standard */}
      {step === 1 && (
        <div>
          <div className="mb-6">
            <p className="text-3xl mb-3">📚</p>
            <h2 className="font-bold text-foreground mb-1" style={{ fontSize: 24 }}>Select Your Class</h2>
            <p className="text-sm text-muted-foreground">We'll tailor content for your grade level</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[6, 7, 8, 9, 10, 11, 12].map(s => (
              <button
                key={s}
                onClick={() => onSetStandard(s)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border-2 ${
                  standard === s
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-card border-border text-foreground hover:border-primary/40'
                }`}
              >
                <span className={`text-[10px] font-medium ${standard === s ? 'text-white/80' : 'text-muted-foreground'}`}>
                  Class
                </span>
                <span className="font-bold" style={{ fontSize: 20 }}>{s}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 bg-accent rounded-2xl p-4">
            <p className="text-xs text-accent-foreground">
              🎯 <strong>Tip:</strong> Content is aligned to NCERT textbooks for all selected classes (6–12).
            </p>
          </div>
        </div>
      )}

      {/* Step 2 — Name */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            >
              <span className="text-3xl">👋</span>
            </div>
            <h2 className="font-bold text-foreground mb-1" style={{ fontSize: 24 }}>What's your name?</h2>
            <p className="text-sm text-muted-foreground">Personalise your learning experience</p>
          </div>

          <input
            type="text"
            value={name}
            onChange={e => onSetName(e.target.value)}
            placeholder="e.g. Arjun Sharma"
            className="w-full bg-muted rounded-xl px-4 py-4 text-foreground placeholder:text-muted-foreground/50 border-2 border-transparent focus:border-primary focus:outline-none transition-colors mb-5"
            style={{ fontSize: 17 }}
          />

          <div className="bg-secondary/60 rounded-2xl p-4 border border-border mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Profile</p>
            <div className="flex flex-wrap gap-2">
              {[board, `Class ${standard}`, 'NCERT Aligned', 'AI-Powered'].map(tag => (
                <span key={tag} className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onComplete}
            disabled={name.trim().length < 2}
            className="w-full bg-primary text-white rounded-xl py-4 font-semibold disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-primary/30 mt-auto"
          >
            Start Learning! 🚀
          </button>
        </div>
      )}
    </div>
  )
}
