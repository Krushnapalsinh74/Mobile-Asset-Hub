import { useState } from 'react'
import { ArrowLeft, Search, CheckSquare, Square, BookOpen, Sparkles } from 'lucide-react'
import type { Subject, Chapter } from '../types'
import { CHAPTERS_BY_SUBJECT } from '../data'

interface Props {
  subject: Subject
  selectedChapters: string[]
  onToggleChapter: (id: string) => void
  onStartTest: () => void
  onBack: () => void
  onChapterPress: (name: string) => void
}

export function ChaptersScreen({ subject, selectedChapters, onToggleChapter, onStartTest, onBack, onChapterPress }: Props) {
  const [query, setQuery] = useState('')
  const chapters: Chapter[] = CHAPTERS_BY_SUBJECT[subject.id] || []
  const filtered = chapters.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
  const allSelected = filtered.length > 0 && filtered.every(c => selectedChapters.includes(c.id))

  const toggleAll = () => {
    if (allSelected) {
      filtered.forEach(c => selectedChapters.includes(c.id) && onToggleChapter(c.id))
    } else {
      filtered.forEach(c => !selectedChapters.includes(c.id) && onToggleChapter(c.id))
    }
  }

  return (
    <div className="bg-background min-h-full flex flex-col">
      {/* Header */}
      <div
        className="px-5 pt-2 pb-5"
        style={{ background: `linear-gradient(135deg, ${subject.color}E6 0%, ${subject.color}99 100%)` }}
      >
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/80 mb-4">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {subject.emoji}
          </div>
          <div>
            <h2 className="font-bold text-white" style={{ fontSize: 20 }}>{subject.name}</h2>
            <p className="text-white/70 text-xs">{chapters.length} chapters · Class content</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 flex-1 flex flex-col">
        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search chapters..."
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Select all + count */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={toggleAll} className="flex items-center gap-2 text-primary text-sm font-medium">
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          {selectedChapters.length > 0 && (
            <div className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
              {selectedChapters.length} selected
            </div>
          )}
        </div>

        {/* Chapter list */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {filtered.map(chapter => {
            const selected = selectedChapters.includes(chapter.id)
            return (
              <div
                key={chapter.id}
                className={`bg-card rounded-xl border-2 transition-all ${selected ? 'border-primary bg-primary/3' : 'border-border'}`}
              >
                <div className="flex items-center px-3 py-3">
                  <button
                    onClick={() => onToggleChapter(chapter.id)}
                    className="mr-3 flex-shrink-0"
                  >
                    <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${
                      selected ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {selected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm leading-tight ${selected ? 'text-foreground' : 'text-foreground/80'}`}>
                      {chapter.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{chapter.questionCount} practice questions</p>
                  </div>
                  <button
                    onClick={() => onChapterPress(chapter.name)}
                    className="ml-2 w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                    title="Study this chapter"
                  >
                    <BookOpen size={14} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating CTA */}
      {selectedChapters.length > 0 && (
        <div className="px-5 pt-3 pb-4 bg-background border-t border-border">
          <button
            onClick={onStartTest}
            className="w-full rounded-2xl py-4 font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            <Sparkles size={18} />
            Configure Test ({selectedChapters.length} chapter{selectedChapters.length > 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  )
}
