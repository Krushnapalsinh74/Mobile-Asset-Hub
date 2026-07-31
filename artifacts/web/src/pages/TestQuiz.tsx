import { useState, useEffect, useRef } from "react";
import { Flag, ChevronRight, ChevronLeft, Check, Circle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useApp } from "../context/AppContext";
import { eduApi, type Question } from "../services/api";
import { MathText } from "../components/MathText";

export default function TestQuiz({ subjectId, chapterId }: { subjectId: string, chapterId: string }) {
  const [, setLocation] = useLocation();
  const { boardId, standardId, boardName, standardName, studentName, addTestResult } = useApp();
  
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('topicId');
  const mode = urlParams.get('mode') || 'mcq';
  const difficulty = urlParams.get('difficulty') || 'medium';
  const count = parseInt(urlParams.get('count') || '10', 10);
  const useAI = urlParams.get('ai') === 'true';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const totalTime = count * 90; // 90 seconds per question
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [submitted, setSubmitted] = useState(false);
  
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    async function loadTest() {
      try {
        setLoading(true);
        const res = await eduApi.generateQuestions({
          board: boardId || boardName || 'CBSE',
          standard: standardId || standardName || 'Class 10',
          subject: subjectId || '',
          chapter: chapterId || '',
          topic: topicId || undefined,
          options: { mode: mode as any, count, difficulty },
          freshQuestions: useAI
        });
        
        const r = res as any;
        let fetchedQuestions = r?.questions ?? r?.data?.questions ?? r?.result?.questions ?? (Array.isArray(r) ? r : []);
        
        if (fetchedQuestions.length === 0) {
          throw new Error("No questions returned from the server.");
        }
        
        // Ensure options exist for MCQ
        fetchedQuestions = fetchedQuestions.map((q: any) => {
          if (!q.options || q.options.length === 0) {
            // Fake options for testing if server doesn't return them properly
            return {
              ...q,
              options: [q.answer || 'True', 'False', 'Option C', 'Option D']
            }
          }
          return q;
        });
        
        setQuestions(fetchedQuestions);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load test');
        setLoading(false);
      }
    }
    
    if (boardId || boardName) {
      loadTest();
    }
  }, [boardId, boardName, standardId, standardName, subjectId, chapterId, topicId, mode, count, difficulty, useAI]);

  // Timer logic
  useEffect(() => {
    if (loading || submitted || error) return;
    
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerRef.current);
  }, [loading, submitted, error]);

  useEffect(() => {
    setVisited(prev => {
      const newSet = new Set(prev);
      newSet.add(currentIndex);
      return newSet;
    });
  }, [currentIndex]);

  const handleOptionSelect = (opt: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [currentIndex]: opt }));
  };

  const toggleMarkForReview = () => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentIndex)) {
        newSet.delete(currentIndex);
      } else {
        newSet.add(currentIndex);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    clearInterval(timerRef.current);
    
    // Calculate score
    let correct = 0;
    questions.forEach((q, i) => {
      const userAns = answers[i];
      if (userAns === q.answer || userAns?.startsWith(q.answer || 'xxx')) {
        correct++;
      }
    });

    const pct = Math.round((correct / questions.length) * 100);

    try {
      await eduApi.submitTest({
        studentName: studentName || 'Student',
        board: boardId || boardName || '',
        standard: standardId || standardName || '',
        subject: subjectId || '',
        score: correct,
        totalQuestions: questions.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to submit test stats', err);
    }
    
    // Save to global history
    addTestResult({
      subjectId,
      chapterId,
      mode,
      score: correct,
      total: questions.length,
      percentage: pct,
      timestamp: Date.now()
    });
    
    // Save questions with user answers to localStorage to pass to Explanation
    const sessionData = questions.map((q, i) => ({
      ...q,
      userAnswer: answers[i]
    }));
    const sessionId = `test_${Date.now()}`;
    localStorage.setItem(sessionId, JSON.stringify({ score: correct, total: questions.length, questions: sessionData }));
    
    // Navigate to explanation
    setLocation(`/explanation?sessionId=${sessionId}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="lucide-spin" size={48} color="var(--brand-primary)" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--text-primary)' }}>Generating your test...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>This may take a moment if AI is creating fresh questions.</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <h2 style={{ color: 'var(--brand-danger)', marginBottom: '16px' }}>Error</h2>
        <p style={{ color: 'var(--text-primary)' }}>{error || 'No questions available.'}</p>
        <button className="btn btn-primary" onClick={() => window.history.back()} style={{ marginTop: '24px' }}>Go Back</button>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
      
      {/* Left Area: Question Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ 
          height: '64px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subjectId} - Practice Test
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: timeLeft < 60 ? '#EF4444' : 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace', fontSize: '18px' }}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Question Area */}
        <div style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>
            
            <div style={{ fontSize: '20px', lineHeight: 1.6, marginBottom: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>
              <MathText text={currentQ.question} />
            </div>

            {currentQ.diagram?.url && (
              <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
                <img src={currentQ.diagram.url} alt="Question Diagram" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }} />
              </div>
            )}
            
            {currentQ.textDiagram && (
              <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
                <pre style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                  {currentQ.textDiagram}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options?.map((opt, i) => {
                const isSelected = answers[currentIndex] === opt;
                return (
                  <label key={i} style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', 
                    padding: '20px 24px', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', background: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                    border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                    transition: 'all 0.1s ease',
                    boxShadow: isSelected ? '0 0 0 1px var(--brand-primary)' : 'none'
                  }}>
                    <div style={{ color: isSelected ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}>
                      {isSelected ? <Check size={20} /> : <Circle size={20} />}
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                      <MathText text={opt} />
                    </span>
                    <input 
                      type="radio" 
                      name={`answer-${currentIndex}`}
                      checked={isSelected}
                      onChange={() => handleOptionSelect(opt)}
                      style={{ display: 'none' }} 
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div style={{ 
          height: '72px', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={`btn ${markedForReview.has(currentIndex) ? 'btn-primary' : 'btn-outline'}`}
              style={{ height: '40px' }}
              onClick={toggleMarkForReview}
            >
              <Flag size={16} /> {markedForReview.has(currentIndex) ? 'Marked' : 'Mark for Review'}
            </button>
            <button 
              className="btn btn-outline" 
              style={{ height: '40px', color: 'var(--text-secondary)', border: 'none' }}
              onClick={() => {
                const newAnswers = {...answers};
                delete newAnswers[currentIndex];
                setAnswers(newAnswers);
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-outline" 
              style={{ height: '40px', padding: '0 24px' }}
              onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button 
              className="btn btn-primary" 
              style={{ height: '40px', padding: '0 24px' }}
              onClick={() => {
                if (currentIndex === questions.length - 1) {
                  handleSubmit();
                } else {
                  setCurrentIndex(p => p + 1);
                }
              }}
            >
              {currentIndex === questions.length - 1 ? 'Submit' : 'Next'} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Area: Minimalist Question Grid */}
      <div style={{ width: '300px', backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Grid Stats Legend */}
        <div style={{ padding: '32px 24px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Status Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '12px', height: '12px', background: '#22C55E', borderRadius: '2px' }}></div>
                <span>Answered</span>
              </div>
              <span>{Object.keys(answers).length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }}></div>
                <span>Not Answered</span>
              </div>
              <span>{visited.size - Object.keys(answers).length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '12px', height: '12px', background: '#F59E0B', borderRadius: '2px' }}></div>
                <span>Marked for Review</span>
              </div>
              <span>{markedForReview.size}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '12px', height: '12px', background: '#E2E8F0', borderRadius: '2px' }}></div>
                <span>Not Visited</span>
              </div>
              <span>{questions.length - visited.size}</span>
            </div>
          </div>
        </div>

        {/* Question Number Grid */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {questions.map((_, i) => {
              const isAnswered = answers[i] !== undefined;
              const isMarked = markedForReview.has(i);
              const isVisited = visited.has(i);
              const isCurrent = i === currentIndex;
              
              let bg = '#E2E8F0'; // Not Visited
              let color = '#64748B';
              let border = '1px solid var(--border-color)';
              
              if (isMarked) {
                bg = '#F59E0B'; // Marked for review
                color = 'white';
                border = '1px solid #F59E0B';
              } else if (isAnswered) {
                bg = '#22C55E'; // Answered
                color = 'white';
                border = '1px solid #22C55E';
              } else if (isVisited) {
                bg = '#EF4444'; // Visited but not answered
                color = 'white';
                border = '1px solid #EF4444';
              }

              if (isCurrent) {
                border = '2px solid var(--brand-primary)';
              }

              return (
                <button 
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  style={{ 
                    aspectRatio: '1', borderRadius: '4px', 
                    border, background: bg, color,
                    fontWeight: isCurrent ? 700 : 500, fontSize: '13px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isCurrent ? '0 0 0 2px rgba(79, 70, 229, 0.2)' : 'none'
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Submit */}
        <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', height: '44px' }}
            onClick={handleSubmit}
          >
            Submit Exam
          </button>
        </div>

      </div>

    </div>
  );
}
