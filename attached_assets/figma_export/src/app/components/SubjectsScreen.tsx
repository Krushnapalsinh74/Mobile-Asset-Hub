import { Search, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Subject } from '../types'

interface Props {
  subjects: Subject[]
  onSubjectPress: (s: Subject) => void
}

export function SubjectsScreen({ subjects, onSubjectPress }: Props) {
  const [query, setQuery] = useState('')
  const filtered = subjects.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="bg-background min-h-full px-5 pt-4 pb-4">
      <h2 className="font-bold text-foreground mb-1" style={{ fontSize: 22 }}>Subjects</h2>
      <p className="text-sm text-muted-foreground mb-4">Select a subject to explore chapters</p>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search subjects..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Subject grid */}
      <div className="flex flex-col gap-3">
        {filtered.map(subject => (
          <button
            key={subject.id}
            onClick={() => onSubjectPress(subject)}
            className="bg-card rounded-2xl p-4 border border-border shadow-sm text-left flex items-center gap-4 active:scale-98 transition-transform"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: subject.bgColor }}
            >
              {subject.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground" style={{ fontSize: 15 }}>{subject.name}</p>
              <p className="text-xs text-muted-foreground mb-2">{subject.chapters} chapters</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${subject.progress}%`, backgroundColor: subject.color }}
                  />
                </div>
                <span className="text-xs font-semibold" style={{ color: subject.color }}>
                  {subject.progress}%
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-foreground">No subjects found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  )
}
