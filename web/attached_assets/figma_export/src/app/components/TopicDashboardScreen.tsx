import { useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, BookOpen, Zap, List } from 'lucide-react'

interface Props {
  chapter: string
  subject: string
  onBack: () => void
}

type Tab = 'guide' | 'flashcards' | 'concepts'

const FLASHCARDS: { front: string; back: string }[] = [
  { front: 'What is Euclid\'s Division Lemma?', back: 'For any two positive integers a and b, there exist unique integers q and r such that a = bq + r, where 0 ≤ r < b.' },
  { front: 'Define a rational number.', back: 'A number that can be expressed in the form p/q where p, q are integers and q ≠ 0. It has a terminating or repeating decimal expansion.' },
  { front: 'What is HCF?', back: 'Highest Common Factor (HCF) is the largest positive integer that divides two or more numbers without leaving a remainder.' },
  { front: 'Define an irrational number.', back: 'A real number that cannot be expressed as p/q where p, q are integers and q ≠ 0. Examples: √2, π, e. It has a non-terminating, non-repeating decimal.' },
  { front: 'State the Fundamental Theorem of Arithmetic.', back: 'Every composite number can be expressed (factorised) as a product of primes, and this factorisation is unique, regardless of the order.' },
]

const KEY_CONCEPTS = [
  { title: 'Euclid\'s Division Algorithm', desc: 'Used to find HCF of two numbers using repeated division.', tag: 'Algorithm' },
  { title: 'Prime Factorisation', desc: 'Express any composite number as a unique product of prime numbers.', tag: 'Core' },
  { title: 'HCF & LCM Relationship', desc: 'HCF(a,b) × LCM(a,b) = a × b for any two positive integers.', tag: 'Formula' },
  { title: 'Rational vs Irrational', desc: 'Rationals have terminating/repeating decimals; irrationals are non-terminating and non-repeating.', tag: 'Concept' },
  { title: 'Proof of Irrationality', desc: 'Prove √2, √3 are irrational by contradiction using unique factorisation.', tag: 'Proof' },
]

const STUDY_GUIDE = `## Overview
This chapter introduces fundamental concepts about the number system that form the basis for higher mathematics.

## Key Topics

**1. Euclid's Division Lemma**
For positive integers a and b: a = bq + r (0 ≤ r < b)
This is used to find the HCF of two numbers through repeated division.

**2. Fundamental Theorem of Arithmetic**
Every composite number has a unique prime factorisation. This powerful theorem has many applications including finding HCF and LCM.

**3. Revisiting Irrational Numbers**
Prove that √2, √3, √5 are irrational using proof by contradiction.

**4. Revisiting Rational Numbers**
A rational p/q (in lowest terms) has:
• Terminating decimal if q = 2ⁿ × 5ᵐ
• Non-terminating repeating decimal otherwise

## Important Formulas
• HCF(a,b) × LCM(a,b) = a × b
• log(ab) = log a + log b (for Chapter reference)

## Board Exam Tips
✓ Practice Euclid's algorithm problems thoroughly
✓ Remember the HCF×LCM = product formula
✓ Be able to prove irrationality of √2, √3
✓ Know when a rational number has terminating decimal`

export function TopicDashboardScreen({ chapter, subject, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('guide')
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const card = FLASHCARDS[cardIdx]

  const nextCard = () => { setCardIdx(i => (i + 1) % FLASHCARDS.length); setFlipped(false) }
  const prevCard = () => { setCardIdx(i => (i - 1 + FLASHCARDS.length) % FLASHCARDS.length); setFlipped(false) }

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'guide', label: 'Study Guide', Icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', Icon: Zap },
    { id: 'concepts', label: 'Key Concepts', Icon: List },
  ]

  return (
    <div className="bg-background min-h-full flex flex-col">
      {/* Header */}
      <div
        className="px-5 pt-2 pb-6"
        style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
      >
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/80 mb-4">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} color="white" />
          </div>
          <div>
            <p className="text-white/70 text-xs mb-0.5">{subject}</p>
            <h2 className="font-bold text-white" style={{ fontSize: 18 }}>{chapter || 'Chapter Overview'}</h2>
            <div className="flex gap-2 mt-1.5">
              <span className="bg-white/20 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">CBSE Class 10</span>
              <span className="bg-white/20 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">NCERT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 -mt-4 mb-4">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              activeTab === id
                ? 'bg-card text-primary border border-primary/20 shadow-md'
                : 'bg-card/70 text-muted-foreground border border-border'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {activeTab === 'guide' && (
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            {STUDY_GUIDE.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-foreground mt-4 mb-2 first:mt-0" style={{ fontSize: 15 }}>{line.slice(3)}</h3>
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-foreground mt-3 mb-1 text-sm">{line.slice(2, -2)}</p>
              if (line.startsWith('• ')) return <p key={i} className="text-sm text-foreground/80 ml-3 mb-0.5">• {line.slice(2)}</p>
              if (line.startsWith('✓ ')) return <p key={i} className="text-sm text-foreground/80 flex gap-1.5 mb-0.5"><span className="text-success">✓</span>{line.slice(2)}</p>
              if (line.trim() === '') return <div key={i} className="h-1" />
              return <p key={i} className="text-sm text-foreground/80 leading-relaxed">{line}</p>
            })}
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-4">{cardIdx + 1} of {FLASHCARDS.length} cards · Tap to flip</p>

            {/* Card */}
            <button
              onClick={() => setFlipped(f => !f)}
              className="w-full mb-5"
              style={{ perspective: '1000px' }}
            >
              <div
                className="relative w-full rounded-2xl shadow-xl transition-all duration-500"
                style={{
                  height: 220,
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  }}
                >
                  <span className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">Question</span>
                  <p className="text-white font-semibold leading-relaxed" style={{ fontSize: 15 }}>{card.front}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-white/50 text-xs">
                    <RotateCcw size={12} />
                    Tap to reveal answer
                  </div>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center bg-card border border-border"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <span className="text-primary text-xs font-semibold uppercase tracking-wider mb-4">Answer</span>
                  <p className="text-foreground leading-relaxed" style={{ fontSize: 13 }}>{card.back}</p>
                </div>
              </div>
            </button>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={prevCard}
                className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
              >
                <ChevronLeft size={20} className="text-foreground" />
              </button>
              <div className="flex gap-1.5">
                {FLASHCARDS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all ${i === cardIdx ? 'w-6 bg-primary' : 'w-2 bg-muted'}`}
                  />
                ))}
              </div>
              <button
                onClick={nextCard}
                className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
              >
                <ChevronRight size={20} className="text-foreground" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'concepts' && (
          <div className="flex flex-col gap-3">
            {KEY_CONCEPTS.map((concept, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-foreground" style={{ fontSize: 14 }}>{concept.title}</p>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    {concept.tag}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{concept.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
