import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Bot, BookOpen } from 'lucide-react'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  subject: string
  onSendMessage: (msg: string) => void
}

export function AIChatScreen({ messages, subject, onSendMessage }: Props) {
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const msg = input.trim()
    if (!msg) return
    setInput('')
    setIsTyping(true)
    onSendMessage(msg)
    setTimeout(() => setIsTyping(false), 1100)
  }

  const suggestions = [
    'Explain Pythagoras theorem',
    'What is photosynthesis?',
    'How to solve quadratic equations?',
    'Tips for board exam preparation',
  ]

  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-background min-h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-2 pb-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-md shadow-primary/25">
            <Bot size={20} color="white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground" style={{ fontSize: 16 }}>EduLearn AI</h2>
              <div className="flex items-center gap-1 bg-success/10 text-success text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Online
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Powered by Claude · Always accurate</p>
          </div>
        </div>
        {/* Subject context */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Context:</span>
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
            <BookOpen size={11} />
            {subject}
          </div>
          <span className="text-[10px] text-muted-foreground">· CBSE Class 10 · NCERT</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 1 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">
              Quick Questions
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="text-left bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground hover:border-primary/30 active:scale-98 transition-all flex items-center gap-2"
                >
                  <Sparkles size={13} className="text-primary flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={14} color="white" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-card border border-border text-foreground rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{fmt(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 items-end">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0">
                <Bot size={14} color="white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-3 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <div className="flex-1 bg-muted rounded-2xl px-4 py-3 min-h-[44px] flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about your syllabus..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-primary text-white disabled:opacity-40 active:scale-90 transition-all shadow-md shadow-primary/25 flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          AI responses are for educational purposes · Verify with NCERT
        </p>
      </div>
    </div>
  )
}
