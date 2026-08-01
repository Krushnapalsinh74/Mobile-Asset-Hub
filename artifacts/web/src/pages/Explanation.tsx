import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle, MessageCircle, RefreshCw } from "lucide-react";
import { useApp } from "../context/AppContext";
import { MathText } from "../components/MathText";

export default function Explanation() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');
  
  const [data, setData] = useState<{ score: number, total: number, questions: any[] } | null>(null);

  useEffect(() => {
    if (sessionId) {
      const raw = localStorage.getItem(sessionId);
      if (raw) {
        setData(JSON.parse(raw));
      }
    }
  }, [sessionId]);

  if (!data) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Results not found</h2>
        <button className="btn btn-primary" onClick={() => setLocation('/dashboard')} style={{ marginTop: '16px' }}>Back to Dashboard</button>
      </div>
    );
  }

  const percentage = Math.round((data.score / data.total) * 100);
  let gradeColor = '#22C55E';
  if (percentage < 40) gradeColor = '#EF4444';
  else if (percentage < 70) gradeColor = '#F59E0B';

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Header */}
      <div style={{ padding: '24px 32px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn" onClick={() => setLocation('/dashboard')} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Test Results</h2>
        <div style={{ width: '100px' }}></div> {/* Spacer for centering */}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Score Card */}
          <div style={{ 
            background: 'var(--bg-surface)', 
            borderRadius: '16px', 
            padding: '40px', 
            textAlign: 'center',
            marginBottom: '48px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontWeight: 500 }}>Your Score</h3>
            
            {/* Circular Progress */}
            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 24px' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke={gradeColor} 
                  strokeWidth="8" 
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * percentage) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{percentage}%</span>
              </div>
            </div>
            
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {data.score} out of {data.total} correct
            </div>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Detailed Solutions</h3>

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {data.questions.map((q, i) => {
              const isCorrect = q.userAnswer === q.answer || q.userAnswer?.startsWith(q.answer || 'xxx');
              const isUnanswered = !q.userAnswer;
              
              return (
                <div key={i} style={{ 
                  background: 'var(--bg-surface)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}>
                  {/* Header */}
                  <div style={{ 
                    padding: '16px 24px', 
                    borderBottom: '1px solid var(--border-color)',
                    background: isCorrect ? 'rgba(34, 197, 94, 0.05)' : isUnanswered ? 'var(--bg-primary)' : 'rgba(239, 68, 68, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Question {i + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isCorrect ? '#22C55E' : isUnanswered ? 'var(--text-tertiary)' : '#EF4444', fontWeight: 600, fontSize: '14px' }}>
                      {isCorrect ? <CheckCircle2 size={18} /> : isUnanswered ? <RefreshCw size={18} /> : <XCircle size={18} />}
                      {isCorrect ? 'Correct' : isUnanswered ? 'Unanswered' : 'Incorrect'}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '24px' }}>
                    <MathText text={q.question} style={{ fontSize: '16px', fontWeight: 500, margin: '0 0 24px 0', color: 'var(--text-primary)' }} />
                    
                    {q.diagram?.url && (
                      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                        <img src={q.diagram.url} alt="Question Diagram" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }} />
                      </div>
                    )}
                    
                    {q.textDiagram && (
                      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                        {q.textDiagram.trim().startsWith('<svg') ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: q.textDiagram }}
                            style={{ maxWidth: '100%', overflowX: 'auto', background: 'white', padding: '16px', borderRadius: '8px' }}
                          />
                        ) : (
                          <pre style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid #e2e8f0', fontSize: '14px', maxWidth: '100%' }}>
                            {q.textDiagram}
                          </pre>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                      {q.options?.map((opt: string, j: number) => {
                        const isSelected = q.userAnswer === opt;
                        const isActualAnswer = opt === q.answer || opt.startsWith(q.answer || 'xxx');
                        
                        let bg = 'var(--bg-primary)';
                        let border = '1px solid var(--border-color)';
                        let textColor = 'var(--text-primary)';
                        
                        if (isActualAnswer) {
                          bg = 'rgba(34, 197, 94, 0.1)';
                          border = '1px solid #22C55E';
                          textColor = '#166534';
                        } else if (isSelected && !isCorrect) {
                          bg = 'rgba(239, 68, 68, 0.1)';
                          border = '1px solid #EF4444';
                          textColor = '#991B1B';
                        }
                        
                        return (
                          <div key={j} style={{ padding: '12px 16px', borderRadius: '8px', background: bg, border, color: textColor, fontSize: '15px' }}>
                            <MathText text={opt} style={{ color: textColor }} />
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.solution && (
                      <div style={{ 
                        padding: '20px', 
                        background: 'rgba(245, 158, 11, 0.05)', 
                        borderLeft: '4px solid #F59E0B',
                        borderRadius: '0 8px 8px 0',
                        marginTop: '24px'
                      }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#B45309', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explanation</h4>
                        <MathText text={q.solution} style={{ color: 'var(--text-secondary)', fontSize: '14px' }} />
                      </div>
                    )}
                    
                    {/* Ask AI Action */}
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn" 
                        onClick={() => setLocation(`/chat?query=${encodeURIComponent(q.question)}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', border: 'none' }}
                      >
                        <MessageCircle size={16} /> Ask AI Tutor
                      </button>
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
