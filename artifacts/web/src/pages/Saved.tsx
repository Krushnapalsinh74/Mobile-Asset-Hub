import { ArrowLeft, Bookmark } from "lucide-react";
import { useLocation } from "wouter";
import { useApp } from "../context/AppContext";

export default function Saved() {
  const [, setLocation] = useLocation();
  const { savedQuestions, unsaveQuestion } = useApp();

  return (
    <div className="page-container">
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <button className="btn" onClick={() => setLocation('/dashboard')} style={{ padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', margin: 0 }}>Saved Explanations</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Review the concepts you've bookmarked.</p>
        </div>
      </div>
      
      {savedQuestions.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <Bookmark size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>No saved questions</h3>
          <p style={{ color: 'var(--text-secondary)' }}>When taking a test or reviewing explanations, you can bookmark tricky questions here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {savedQuestions.map((q, i) => (
            <div key={i} className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  {q.subjectName} - {q.chapterName || q.topicName}
                </span>
                <button 
                  onClick={() => unsaveQuestion(q.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                >
                  <Bookmark size={20} fill="currentColor" />
                </button>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.6 }}>
                {q.question}
              </p>
              
              <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', borderLeft: '4px solid #22C55E' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', color: '#166534' }}>Correct Answer</h4>
                <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>{q.answer || "Correct Option"}</p>
              </div>
              
              {q.solution && (
                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--brand-primary)' }}>Explanation</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{q.solution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
