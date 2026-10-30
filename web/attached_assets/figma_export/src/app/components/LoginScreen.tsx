import { GraduationCap, Sparkles } from 'lucide-react'

interface Props {
  email: string
  setEmail: (e: string) => void
  onSendOTP: () => void
}

export function LoginScreen({ email, setEmail, onSendOTP }: Props) {
  return (
    <div className="min-h-full flex flex-col bg-background">
      {/* Hero gradient */}
      <div
        className="flex flex-col items-center justify-center px-6 pt-12 pb-8"
        style={{ background: 'linear-gradient(160deg, #4F46E5 0%, #7C3AED 60%, #F8F7FF 100%)' }}
      >
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-900/40 mb-4">
          <GraduationCap size={38} className="text-primary" strokeWidth={2} />
        </div>
        <h1 className="text-white font-bold tracking-tight mb-1" style={{ fontSize: 28 }}>
          EduLearn
        </h1>
        <p className="text-white/80 text-center text-sm leading-relaxed mb-3">
          Your AI-powered learning companion
        </p>
        <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
          <span className="text-base">🇮🇳</span>
          <span className="text-white/90 text-xs font-medium">Made for Indian Students</span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-5 -mt-5 mb-5">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-4">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { value: '50K+', label: 'Students' },
              { value: '1200+', label: 'Chapters' },
              { value: '4.9★', label: 'Rating' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center px-2">
                <div className="font-bold text-primary" style={{ fontSize: 17 }}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Boards supported */}
      <div className="px-5 mb-5">
        <div className="flex gap-2 justify-center">
          {['CBSE', 'ICSE', 'GSEB'].map(b => (
            <div key={b} className="flex-1 bg-accent rounded-xl py-2.5 text-center border border-border">
              <p className="font-semibold text-accent-foreground text-sm">{b}</p>
              <p className="text-[10px] text-muted-foreground">Supported</p>
            </div>
          ))}
        </div>
      </div>

      {/* Login form */}
      <div className="px-5 pb-6 mt-auto">
        <div className="bg-card rounded-3xl p-5 border border-border shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-primary" />
            <h2 className="font-semibold text-foreground">Sign in to continue</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">We'll send a 6-digit OTP to your email</p>

          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="arjun.sharma@gmail.com"
            className="w-full bg-muted rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 border-2 border-transparent focus:border-primary focus:outline-none transition-colors mb-4"
          />

          <button
            onClick={onSendOTP}
            disabled={!email.includes('@') || !email.includes('.')}
            className="w-full bg-primary text-white rounded-xl py-4 font-semibold disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            Send OTP →
          </button>

          <p className="text-center text-xs text-muted-foreground mt-3">
            By continuing, you agree to our{' '}
            <span className="text-primary font-medium">Terms of Service</span>
          </p>
        </div>
      </div>
    </div>
  )
}
