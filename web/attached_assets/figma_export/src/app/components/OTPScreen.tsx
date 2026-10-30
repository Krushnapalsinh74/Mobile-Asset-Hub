import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'

interface Props {
  email: string
  onVerify: () => void
  onBack: () => void
}

export function OTPScreen({ email, onVerify, onBack }: Props) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(30)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(s => s - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [timer])

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const complete = otp.every(d => d !== '')

  return (
    <div className="min-h-full flex flex-col bg-background px-6 pt-4">
      <button onClick={onBack} className="self-start flex items-center gap-1.5 text-primary py-2 -ml-2 mb-6">
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="mb-8">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">📧</span>
        </div>
        <h2 className="font-bold text-foreground mb-2" style={{ fontSize: 24 }}>Verify your email</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a 6-digit code to{' '}
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <div className="flex gap-2 justify-between mb-6">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className={`w-[46px] h-14 text-center font-bold rounded-xl border-2 bg-muted transition-all focus:outline-none ${
              digit
                ? 'border-primary bg-primary/8 text-primary'
                : 'border-border text-foreground'
            } focus:border-primary`}
            style={{ fontSize: 22 }}
          />
        ))}
      </div>

      <button
        onClick={onVerify}
        disabled={!complete}
        className="w-full bg-primary text-white rounded-xl py-4 font-semibold disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-primary/25 mb-5"
      >
        {complete ? '✓ Verify & Continue' : 'Enter all 6 digits'}
      </button>

      <div className="text-center">
        {timer > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend in <span className="text-primary font-semibold">{timer}s</span>
          </p>
        ) : (
          <button
            onClick={() => setTimer(30)}
            className="inline-flex items-center gap-1.5 text-primary text-sm font-medium"
          >
            <RefreshCw size={14} />
            Resend OTP
          </button>
        )}
      </div>

      <div className="mt-auto pb-6 text-center">
        <p className="text-xs text-muted-foreground bg-muted rounded-xl px-4 py-2.5 inline-block">
          💡 Demo: enter any 6 digits to proceed
        </p>
      </div>
    </div>
  )
}
