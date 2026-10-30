import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Globe, Settings2, Target, Type, Loader2 } from "lucide-react";
import { eduApi } from "../services/api";

const MARKS_OPTIONS = [1, 2, 3, 4];
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'hard', label: 'Hard', color: '#EF4444' },
  { value: 'advanced', label: 'Advanced', color: '#7C3AED' }
] as const;
type Difficulty = typeof DIFFICULTY_OPTIONS[number]['value'];

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' }
];

export default function TestConfig() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('subjectId');
  const chapterId = urlParams.get('chapterId');
  const topicId = urlParams.get('topicId');

  const [mode, setMode] = useState<'mcq' | 'subjective'>('mcq');
  const [marksPerQ, setMarksPerQ] = useState(1);
  const [difficulties, setDifficulties] = useState<Difficulty[]>(['medium']);
  const [difficultyBreakdown, setDifficultyBreakdown] = useState<Record<Difficulty, number>>({
    easy: 3, medium: 5, hard: 3, advanced: 3
  });
  const [selectedLang, setSelectedLang] = useState('en');
  const [availableLangs, setAvailableLangs] = useState<string[]>(['en']);
  const [scanningLangs, setScanningLangs] = useState(false);

  useEffect(() => {
    if (chapterId) {
      setScanningLangs(true);
      eduApi.getBankQuestions({ chapterId, topicId: topicId || undefined })
        .then(qs => {
          const langSet = new Set<string>(['en']);
          qs.forEach(q => {
            if (q.translations) {
              Object.keys(q.translations).forEach(k => langSet.add(k));
            }
          });
          setAvailableLangs(Array.from(langSet));
        })
        .catch(err => console.error("Failed to scan languages", err))
        .finally(() => setScanningLangs(false));
    }
  }, [chapterId, topicId]);

  const totalQuestions = difficulties.reduce((sum, d) => sum + (difficultyBreakdown[d] || 0), 0);
  const totalMarks = totalQuestions * marksPerQ;

  const toggleDifficulty = (d: Difficulty) => {
    if (difficulties.includes(d)) {
      if (difficulties.length === 1) return; // Keep at least one
      setDifficulties(difficulties.filter(x => x !== d));
    } else {
      setDifficulties([...difficulties, d]);
    }
  };

  const adjustCount = (d: Difficulty, delta: number) => {
    setDifficultyBreakdown(prev => ({
      ...prev,
      [d]: Math.max(1, Math.min(50, (prev[d] || 3) + delta))
    }));
  };

  const handleStartTest = () => {
    // For now, pass total count and the first selected difficulty to maintain compatibility with existing TestQuiz
    const diff = difficulties[0] || 'medium';
    let url = `/test/${subjectId}/${chapterId}?mode=${mode}&difficulty=${diff}&count=${totalQuestions}&lang=${selectedLang}&marks=${marksPerQ}`;
    if (topicId) url += `&topicId=${topicId}`;
    setLocation(url);
  };

  return (
    <div className="page-container" style={{ padding: 0, maxWidth: 'none', backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>

      {/* Premium Header */}
      <div style={{
        background: 'var(--brand-gradient)',
        padding: '32px 48px',
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Soft abstract shape */}
        <div style={{ position: 'absolute', top: -50, right: -20, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>

        <Link
          href={topicId ? `/topics/${topicId}/dashboard?subjectId=${subjectId}&chapterId=${chapterId}` : `/chapters/${chapterId}/topics?subjectId=${subjectId}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: 'white', textDecoration: 'none',
            fontSize: '14px', fontWeight: 600,
            background: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '12px',
            backdropFilter: 'blur(8px)', zIndex: 1
          }}
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ zIndex: 1 }}>
          <h1 style={{ fontSize: '28px', margin: '0 0 4px 0', fontWeight: 800, letterSpacing: '-0.5px' }}>Test Configuration</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>Configure parameters for your upcoming mock test</p>
        </div>
      </div>

      <div style={{ padding: '48px', maxWidth: '800px', margin: '0 auto' }}>

        {/* Main Settings Card */}
        <div className="card" style={{ padding: 0, marginBottom: '24px', overflow: 'hidden', borderRadius: '24px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '20px 24px', background: 'rgba(79, 70, 229, 0.03)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <Settings2 size={20} color="var(--brand-primary)" />
            </div>
            <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.3px' }}>Exam Parameters</h2>
          </div>

          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Mode & Marks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  <Type size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: 'var(--brand-primary)' }} />
                  Test Mode
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {(['mcq', 'subjective'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      style={{
                        flex: 1, padding: '14px', textTransform: 'capitalize', fontSize: '15px', fontWeight: 600,
                        background: mode === m ? 'var(--brand-primary)' : 'var(--bg-primary)',
                        color: mode === m ? 'white' : 'var(--text-primary)',
                        border: 'none',
                        borderRadius: '14px', cursor: 'pointer',
                        boxShadow: mode === m ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {m === 'mcq' ? 'Multiple Choice' : 'Subjective'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  <Target size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: 'var(--brand-primary)' }} />
                  Marks per Question
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {MARKS_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => setMarksPerQ(m)}
                      style={{
                        flex: 1, padding: '14px', fontSize: '15px', fontWeight: 600,
                        background: marksPerQ === m ? 'var(--brand-primary)' : 'var(--bg-primary)',
                        color: marksPerQ === m ? 'white' : 'var(--text-primary)',
                        border: 'none',
                        borderRadius: '14px', cursor: 'pointer',
                        boxShadow: marksPerQ === m ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: 0 }} />

            {/* Difficulty Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Difficulty Levels
              </label>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                {DIFFICULTY_OPTIONS.map(d => {
                  const active = difficulties.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      onClick={() => toggleDifficulty(d.value)}
                      style={{
                        padding: '12px 24px', fontSize: '14px', fontWeight: 600,
                        background: active ? `${d.color}15` : 'var(--bg-primary)',
                        color: active ? d.color : 'var(--text-secondary)',
                        border: active ? `1.5px solid ${d.color}` : '1.5px solid transparent',
                        borderRadius: '14px', cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>

              {/* Breakdown */}
              <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, marginTop: 0, marginBottom: '20px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Questions per Difficulty
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {DIFFICULTY_OPTIONS.filter(d => difficulties.includes(d.value)).map(d => (
                    <div key={d.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: d.color }}>{d.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                          onClick={() => adjustCount(d.value, -1)}
                          style={{ width: '36px', height: '36px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', color: 'var(--text-secondary)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        >-</button>
                        <span style={{ width: '32px', textAlign: 'center', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {difficultyBreakdown[d.value] || 3}
                        </span>
                        <button
                          onClick={() => adjustCount(d.value, 1)}
                          style={{ width: '36px', height: '36px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', color: 'var(--text-secondary)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        >+</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Questions</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-primary)' }}>{totalQuestions}</span>
                  </div>
                </div>
              </div>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: 0 }} />

            {/* Language */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>
                <div>
                  <Globe size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: 'var(--brand-primary)' }} />
                  Question Language
                </div>
                {scanningLangs && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)', fontSize: '12px' }}>
                    <Loader2 size={12} className="lucide-spin" /> Scanning available languages...
                  </div>
                )}
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {LANGUAGES.filter(lang => availableLangs.includes(lang.code)).map(lang => {
                  const active = selectedLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      style={{
                        padding: '16px',
                        background: active ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-primary)',
                        border: active ? '1.5px solid var(--brand-primary)' : '1.5px solid transparent',
                        borderRadius: '16px',
                        cursor: 'pointer', flex: 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: 700, color: active ? 'var(--brand-primary)' : 'var(--text-primary)' }}>{lang.native}</span>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: active ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}>{lang.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>



        {/* Start Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '24px 32px', border: 'none', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Total Exam Score</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{totalMarks} <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Marks</span></div>
          </div>
          <button
            onClick={handleStartTest}
            className="btn"
            style={{
              padding: '16px 48px', fontSize: '16px', fontWeight: 700,
              background: 'var(--cbt-answered)', color: 'white', border: 'none',
              borderRadius: '16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
              transition: 'all 0.2s ease', letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)'; }}
          >
            START TEST
          </button>
        </div>

      </div>
    </div>
  );
}
