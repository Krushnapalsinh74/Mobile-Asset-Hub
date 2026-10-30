import { Moon, Sun, Globe, User, Shield, Bell, HelpCircle, LogOut, ChevronRight } from 'lucide-react'

interface Props {
  darkMode: boolean
  language: string
  studentName: string
  board: string
  standard: number
  onToggleDark: () => void
  onChangeLanguage: (l: string) => void
}

const LANGUAGES = ['English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali']

export function SettingsScreen({ darkMode, language, studentName, board, standard, onToggleDark, onChangeLanguage }: Props) {
  return (
    <div className="bg-background min-h-full pb-4">
      {/* Profile header */}
      <div
        className="px-5 pt-3 pb-8"
        style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
      >
        <h2 className="font-bold text-white mb-5" style={{ fontSize: 22 }}>Settings</h2>
        <div className="flex items-center gap-4 bg-white/15 rounded-2xl p-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center font-bold text-orange-900 flex-shrink-0" style={{ fontSize: 22 }}>
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-white font-bold" style={{ fontSize: 17 }}>{studentName}</p>
            <div className="flex gap-1.5 mt-1">
              <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">{board}</span>
              <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">Class {standard}</span>
            </div>
          </div>
          <button className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
            <User size={17} color="white" />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-4 flex flex-col gap-4">
        {/* Appearance */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <div className="px-4 py-2.5 border-b border-border/50 bg-muted/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Appearance</p>
          </div>
          <div className="divide-y divide-border/50">
            {/* Dark mode */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-indigo-950 dark:bg-indigo-900' : 'bg-yellow-100'}`}>
                  {darkMode ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-yellow-500" />}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{darkMode ? 'Dark Mode' : 'Light Mode'}</p>
                  <p className="text-xs text-muted-foreground">Current: {darkMode ? 'Dark' : 'Light'}</p>
                </div>
              </div>
              <button
                onClick={onToggleDark}
                className={`w-14 h-7 rounded-full transition-all duration-300 relative ${darkMode ? 'bg-primary' : 'bg-muted'}`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${darkMode ? 'left-7' : 'left-0.5'}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <div className="px-4 py-2.5 border-b border-border/50 bg-muted/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Language</p>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe size={18} className="text-primary" />
              </div>
              <p className="font-medium text-foreground text-sm flex-1">App Language</p>
              <span className="text-sm font-semibold text-primary">{language}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => onChangeLanguage(lang)}
                  className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all active:scale-95 ${
                    language === lang
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <div className="px-4 py-2.5 border-b border-border/50 bg-muted/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notifications</p>
          </div>
          <div className="divide-y divide-border/50">
            {[
              { label: 'Daily Study Reminders', desc: 'Get reminded to study every day', enabled: true },
              { label: 'Test Notifications', desc: 'Reminders before scheduled tests', enabled: true },
              { label: 'Result Alerts', desc: 'Get notified when results are ready', enabled: false },
            ].map(({ label, desc, enabled }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About & Support */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <div className="px-4 py-2.5 border-b border-border/50 bg-muted/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">About & Support</p>
          </div>
          <div className="divide-y divide-border/50">
            {[
              { icon: Shield, label: 'Privacy Policy', color: '#10B981' },
              { icon: HelpCircle, label: 'Help & FAQ', color: '#F59E0B' },
            ].map(({ icon: Icon, label, color }) => (
              <button key={label} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground text-left">{label}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* App info */}
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground">EduLearn v2.4.1</p>
          <p className="text-xs text-muted-foreground">🇮🇳 Made with ❤️ for Indian students</p>
        </div>

        {/* Sign out */}
        <button className="w-full py-4 rounded-2xl border-2 border-red-200 dark:border-red-900 text-red-500 font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
