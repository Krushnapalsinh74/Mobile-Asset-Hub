import { Home, BookOpen, ClipboardList, MessageCircle, Settings } from 'lucide-react'
import type { Tab } from '../types'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'subjects', label: 'Subjects', Icon: BookOpen },
  { id: 'history', label: 'History', Icon: ClipboardList },
  { id: 'chat', label: 'Chat', Icon: MessageCircle },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

export function BottomTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="bg-card border-t border-border px-1 pt-2 pb-7">
      <div className="flex items-center justify-around">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>
                <Icon
                  size={22}
                  className={active ? 'text-primary' : 'text-muted-foreground'}
                  strokeWidth={active ? 2.5 : 1.5}
                />
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
