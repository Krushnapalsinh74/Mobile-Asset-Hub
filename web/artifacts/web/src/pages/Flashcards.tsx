import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Zap, Brain, X, Check } from "lucide-react";
import { eduApi, type Question } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Flashcards() {
  const { boardId, standardId, boardName, standardName } = useApp();
  
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('subjectId');
  const chapterId = urlParams.get('chapterId');
  const topicId = urlParams.get('topicId');
  
  const [cards, setCards] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);

  useEffect(() => {
    async function loadCards() {
      try {
        setLoading(true);
        // Using generateQuestions with MCQ mode to get flashcard content quickly
        const res = await eduApi.generateQuestions({
          board: boardId || boardName || 'CBSE',
          standard: standardId || standardName || 'Class 10',
          subject: subjectId || '',
          chapter: chapterId || '',
          topic: topicId || undefined,
          options: { mode: 'mcq', count: 15, difficulty: 'medium' },
          freshQuestions: false
        });
        
        const r = res as any;
        let fetched = r?.questions ?? r?.data?.questions ?? r?.result?.questions ?? (Array.isArray(r) ? r : []);
        setCards(fetched);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    
    if (boardId || boardName) {
      loadCards();
    }
  }, [boardId, boardName, standardId, standardName, subjectId, chapterId, topicId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="lucide-spin" size={48} color="var(--brand-primary)" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--text-primary)' }}>Loading Flashcards...</h2>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>No Flashcards Available</h2>
        <button className="btn btn-primary" onClick={() => window.history.back()} style={{ marginTop: '16px' }}>Go Back</button>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="card" style={{ padding: '48px', textAlign: 'center', maxWidth: '500px' }}>
          <Brain size={64} color="#8B5CF6" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>Session Complete!</h2>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            You reviewed {cards.length} cards and remembered {sessionScore} perfectly.
          </p>
          <button className="btn btn-primary" onClick={() => window.history.back()} style={{ width: '100%' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handleNext = (remembered: boolean) => {
    if (remembered) setSessionScore(s => s + 1);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(c => c + 1);
    }, 150); // Small delay for the flip animation to start resetting
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', padding: 0 }}>
      
      {/* Header */}
      <div style={{ 
        height: '64px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px'
      }}>
        <button className="btn" onClick={() => window.history.back()} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Exit Session
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B5CF6', fontWeight: 600 }}>
            <Zap size={16} /> Streak: {sessionScore}
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: '14px' }}>
            {currentIndex + 1} / {cards.length}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', backgroundColor: 'var(--bg-primary)' }}>
        
        {/* Flashcard 3D Scene */}
        <div 
          style={{ 
            perspective: '1000px',
            width: '100%',
            maxWidth: '600px',
            height: '400px',
            marginBottom: '48px',
            cursor: 'pointer'
          }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}>
            
            {/* Front of Card */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
              backgroundColor: 'var(--bg-surface)', borderRadius: '24px', padding: '48px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
              border: '1px solid var(--border-color)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '32px' }}>Question</p>
              <h3 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {currentCard.question}
              </h3>
              <p style={{ position: 'absolute', bottom: '24px', fontSize: '13px', color: 'var(--text-tertiary)' }}>Click to flip</p>
            </div>

            {/* Back of Card */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
              backgroundColor: 'var(--bg-surface)', borderRadius: '24px', padding: '48px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
              border: '2px solid var(--brand-primary)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center',
              transform: 'rotateY(180deg)'
            }}>
              <p style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-primary)', marginBottom: '32px', fontWeight: 600 }}>Answer</p>
              <h3 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {currentCard.answer || "Correct Option"}
              </h3>
              {currentCard.solution && (
                <p style={{ marginTop: '24px', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {currentCard.solution}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Actions (Only visible when flipped) */}
        <div style={{ 
          display: 'flex', gap: '24px', width: '100%', maxWidth: '600px',
          opacity: isFlipped ? 1 : 0.3, pointerEvents: isFlipped ? 'auto' : 'none',
          transition: 'opacity 0.3s ease'
        }}>
          <button 
            className="btn btn-outline" 
            onClick={() => handleNext(false)}
            style={{ flex: 1, padding: '16px', height: '64px', borderRadius: '16px', color: '#EF4444', borderColor: '#FCA5A5', background: '#FEF2F2' }}
          >
            <X size={24} style={{ marginRight: '8px' }} /> Don't Know
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => handleNext(true)}
            style={{ flex: 1, padding: '16px', height: '64px', borderRadius: '16px', background: '#22C55E', borderColor: '#22C55E' }}
          >
            <Check size={24} style={{ marginRight: '8px' }} /> Got It
          </button>
        </div>

      </div>
    </div>
  );
}
