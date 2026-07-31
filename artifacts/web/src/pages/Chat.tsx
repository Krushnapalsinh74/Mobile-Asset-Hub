import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, ArrowLeft, Bot, User } from "lucide-react";
import { useLocation } from "wouter";
import { eduApi } from "../services/api";
import { useApp } from "../context/AppContext";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const [, setLocation] = useLocation();
  const { boardId, standardId, studentName } = useApp();
  
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('query');
  
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string = input) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMsg = { role: "user", content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await eduApi.chat({
        message: textToSend,
        boardId: boardId || undefined,
        standardId: standardId || undefined,
        context: messages.map(m => `${m.role}: ${m.content}`).join('\n')
      });
      
      setMessages(prev => [...prev, { role: "assistant", content: res.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
      
      {/* Header */}
      <div style={{ 
        height: '64px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', flexShrink: 0
      }}>
        <button className="btn" onClick={() => window.history.back()} style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Bot size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>AI Tutor</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Always here to help you learn</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: 'var(--bg-primary)' }}>
        {messages.length === 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
            <MessageCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', fontWeight: 500 }}>Ask me anything about your subjects!</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} style={{ 
            display: 'flex', 
            gap: '12px',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
          }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? 'var(--bg-surface)' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)', 
              border: msg.role === 'user' ? '1px solid var(--border-color)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              color: msg.role === 'user' ? 'var(--text-secondary)' : 'white'
            }}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div style={{ 
              padding: '16px', borderRadius: '12px',
              backgroundColor: msg.role === 'user' ? 'var(--brand-primary)' : 'var(--bg-surface)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              lineHeight: 1.6,
              fontSize: '15px'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
              <Bot size={16} />
            </div>
            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <Loader2 className="lucide-spin" size={18} color="var(--text-secondary)" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ 
          maxWidth: '1000px', margin: '0 auto', 
          display: 'flex', alignItems: 'flex-end', gap: '12px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px'
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            style={{ 
              flex: 1, border: 'none', background: 'transparent', resize: 'none', 
              outline: 'none', minHeight: '24px', maxHeight: '120px', 
              fontSize: '15px', color: 'var(--text-primary)', padding: '4px'
            }}
            rows={1}
          />
          <button 
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{ padding: '10px', borderRadius: '8px', height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={18} />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', margin: '12px 0 0 0' }}>
          AI Tutor can make mistakes. Consider verifying important information.
        </p>
      </div>

    </div>
  );
}
