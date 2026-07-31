import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Sparkles, BrainCircuit } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function TestConfig() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('subjectId');
  const chapterId = urlParams.get('chapterId');
  const topicId = urlParams.get('topicId');
  
  const [mode, setMode] = useState<'mcq' | 'subjective'>('mcq');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [useAI, setUseAI] = useState(false);

  const handleStartTest = () => {
    // Navigate to TestQuiz page with configuration in query params
    let url = `/test/${subjectId}/${chapterId}?mode=${mode}&difficulty=${difficulty}&count=${questionCount}&ai=${useAI}`;
    if (topicId) url += `&topicId=${topicId}`;
    setLocation(url);
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <Link 
          href={topicId ? `/topics/${topicId}/dashboard?subjectId=${subjectId}&chapterId=${chapterId}` : `/chapters/${chapterId}/topics?subjectId=${subjectId}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Test Configuration</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Set up your practice test parameters.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px' }}>
        
        {/* Mode Selection */}
        <section>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Test Mode</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn" 
              onClick={() => setMode('mcq')}
              style={{ flex: 1, border: mode === 'mcq' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)', background: mode === 'mcq' ? 'rgba(79, 70, 229, 0.05)' : 'white' }}
            >
              Multiple Choice
            </button>
            <button 
              className="btn" 
              onClick={() => setMode('subjective')}
              style={{ flex: 1, border: mode === 'subjective' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)', background: mode === 'subjective' ? 'rgba(79, 70, 229, 0.05)' : 'white' }}
            >
              Subjective
            </button>
          </div>
        </section>

        {/* Difficulty Selection */}
        <section>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Difficulty Level</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['easy', 'medium', 'hard'].map((level) => (
              <button 
                key={level}
                className="btn" 
                onClick={() => setDifficulty(level as any)}
                style={{ 
                  flex: 1, 
                  textTransform: 'capitalize',
                  border: difficulty === level ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)', 
                  background: difficulty === level ? 'rgba(79, 70, 229, 0.05)' : 'white' 
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </section>

        {/* Question Count Selection */}
        <section>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Number of Questions</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[5, 10, 15, 20].map((count) => (
              <button 
                key={count}
                className="btn" 
                onClick={() => setQuestionCount(count)}
                style={{ 
                  flex: 1, 
                  border: questionCount === count ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)', 
                  background: questionCount === count ? 'rgba(79, 70, 229, 0.05)' : 'white' 
                }}
              >
                {count}
              </button>
            ))}
          </div>
        </section>

        {/* AI Generation Toggle */}
        <section>
          <div 
            onClick={() => setUseAI(!useAI)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '20px',
              borderRadius: '16px',
              border: useAI ? '2px solid #7C3AED' : '1px solid var(--border-color)',
              background: useAI ? 'rgba(124, 58, 237, 0.05)' : 'white',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={24} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>AI Generated Questions</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Bypass the question bank and generate fresh questions</p>
              </div>
            </div>
            
            {/* Custom Toggle Switch UI */}
            <div style={{ 
              width: '44px', 
              height: '24px', 
              borderRadius: '12px', 
              background: useAI ? '#7C3AED' : '#E5E7EB',
              position: 'relative',
              transition: 'background 0.3s'
            }}>
              <div style={{
                position: 'absolute',
                top: '2px',
                left: useAI ? '22px' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '10px',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.3s'
              }} />
            </div>
          </div>
        </section>

        <button 
          onClick={handleStartTest}
          className="btn btn-primary" 
          style={{ width: '100%', padding: '16px', fontSize: '16px', marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}
        >
          <Sparkles size={20} /> Start Test Now
        </button>

      </div>
    </div>
  );
}
