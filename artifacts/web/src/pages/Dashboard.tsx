import { useState, useEffect } from "react";
import { BookOpen, ChevronRight, Loader2, Book, Trophy, MessageCircle, BarChart2, Zap, Layout } from "lucide-react";
import { useLocation } from "wouter";
import { eduApi, type Subject } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { studentName, boardId, standardId, boardName, standardName } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for now since we don't have full test history synced to context in web yet
  const stats = {
    testsTaken: 12,
    aiChats: 45,
    topicsDone: 28,
    avgScore: 84
  };

  useEffect(() => {
    if (!boardId || !standardId) {
      setLoading(false);
      return;
    }
    eduApi.getSubjects(boardId, standardId)
      .then((data) => {
        setSubjects(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard failed to load subjects", err);
        setLoading(false);
      });
  }, [boardId, standardId]);

  const firstName = studentName ? studentName.split(' ')[0] : 'Student';
  
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page-container" style={{ padding: '0', maxWidth: 'none' }}>
      
      {/* Hero Header - Professional Slate/Blue gradient instead of bright colors */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        padding: '64px 48px',
        color: 'white',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background decoration */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '16px', color: '#94A3B8', marginBottom: '8px', fontWeight: 500 }}>{getGreeting()}</p>
              <h1 style={{ fontSize: '36px', fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
                Welcome back, {firstName}
              </h1>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                {boardName && (
                  <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Book size={14} /> {boardName}
                  </div>
                )}
                {standardName && (
                  <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trophy size={14} /> {standardName}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 600, border: '2px solid rgba(255,255,255,0.2)'
            }}>
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px' }}>
        
        {/* Quick Stats Grid */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', 
          marginTop: '-80px', marginBottom: '48px', position: 'relative', zIndex: 2
        }}>
          {[
            { label: 'Tests Taken', val: stats.testsTaken, icon: Trophy, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'AI Chats', val: stats.aiChats, icon: MessageCircle, color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Topics Done', val: stats.topicsDone, icon: BookOpen, color: '#059669', bg: '#ECFDF5' },
            { label: 'Avg Score', val: `${stats.avgScore}%`, icon: BarChart2, color: '#0891B2', bg: '#ECFEFF' }
          ].map((stat, i) => (
            <div key={i} className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                <stat.icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.val}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Browse Curriculum', icon: Layout, route: null },
              { label: 'Practice Test', icon: Zap, route: '/test-config' },
              { label: 'Ask AI Tutor', icon: MessageCircle, route: '/chat' },
              { label: 'Saved Explanations', icon: BookOpen, route: '/saved' }
            ].map((action, i) => (
              <button 
                key={i} 
                className="btn btn-outline"
                style={{ height: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)' }}
                onClick={() => {
                  if (action.route) setLocation(action.route);
                }}
              >
                <div style={{ color: 'var(--text-secondary)' }}><action.icon size={24} /></div>
                <span style={{ fontWeight: 500 }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subjects Grid */}
        <h2 style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Your Subjects
        </h2>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <Loader2 className="lucide-spin" size={32} color="var(--text-tertiary)" />
          </div>
        ) : (
          <div className="grid-cards">
            {subjects.map((sub) => (
              <div 
                key={sub.id || sub._id}
                onClick={() => setLocation(`/subjects/${sub.id || sub._id}/chapters`)}
                className="card" 
                style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div style={{ padding: '12px', background: '#F1F5F9', borderRadius: '12px', color: '#475569' }}>
                    <Book size={24} />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', margin: '0 0 4px 0', fontWeight: 600 }}>{sub.name}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Explore chapters</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <ChevronRight size={20} color="var(--brand-primary)" />
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <p style={{ color: 'var(--text-tertiary)' }}>No subjects found for your profile.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
