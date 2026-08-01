import { useState, useEffect } from "react";
import { BookOpen, ChevronRight, Book, Trophy, MessageCircle, BarChart2, Zap, Layout, Activity, Clock, TrendingUp, PlayCircle } from "lucide-react";
import { PulseLoader } from "../components/Spinner";
import { useLocation } from "wouter";
import { eduApi, type Subject } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { studentName, boardId, standardId, boardName, standardName } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="page-container" style={{ padding: '0', maxWidth: 'none', backgroundColor: 'var(--bg-surface)' }}>
      
      {/* Hero Header - Professional Command Center Theme */}
      <div style={{ 
        background: 'var(--bg-primary)',
        padding: '48px 48px 120px 48px',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle grid background */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(79, 70, 229, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 70, 229, 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0 }}></div>
        
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 12px #10B981' }}></div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>System Online</span>
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
                {getGreeting()}, {firstName}
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 24px 0', maxWidth: '500px' }}>
                Here is your learning overview for {boardName || 'your board'} • {standardName || 'your standard'}. Let's make today productive.
              </p>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={() => setLocation('/test-config')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, boxShadow: 'var(--shadow-glow)' }}>
                  <PlayCircle size={18} /> Resume Last Topic
                </button>
                <button onClick={() => setLocation('/chat')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, background: 'white' }}>
                  <MessageCircle size={18} /> Ask AI Tutor
                </button>
              </div>
            </div>
            
            {/* Right side graphical element */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Goal</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-primary)' }}>4 / 5 <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>tests</span></div>
              </div>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'conic-gradient(var(--brand-primary) 80%, var(--border-color) 0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  80%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 48px 64px 48px' }}>
        
        {/* KPI Dashboard - overlapping the header */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', 
          marginTop: '-48px', marginBottom: '48px', position: 'relative', zIndex: 2
        }}>
          {[
            { label: 'Tests Completed', val: stats.testsTaken, trend: '+2 this week', icon: Trophy, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Average Score', val: `${stats.avgScore}%`, trend: '+5% vs last month', icon: BarChart2, color: '#059669', bg: '#ECFDF5' },
            { label: 'Topics Mastered', val: stats.topicsDone, trend: '8 pending', icon: BookOpen, color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'AI Interactions', val: stats.aiChats, trend: 'Very active', icon: Zap, color: '#D97706', bg: '#FEF3C7' }
          ].map((stat, i) => (
            <div key={i} style={{ 
              padding: '24px', background: 'white', borderRadius: '20px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                  <stat.icon size={24} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#10B981', background: '#D1FAE5', padding: '4px 8px', borderRadius: '20px' }}>
                  <TrendingUp size={12} /> {stat.trend.split(' ')[0]}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>{stat.val}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          
          {/* Main Content Area */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
                Course Modules
              </h2>
              <button className="btn" style={{ fontSize: '14px', color: 'var(--brand-primary)', fontWeight: 600, background: 'transparent', padding: 0 }}>View All</button>
            </div>
            
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', background: 'white', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                <PulseLoader size={48} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {subjects.map((sub, idx) => (
                  <div 
                    key={sub.id || sub._id}
                    onClick={() => setLocation(`/subjects/${sub.id || sub._id}/chapters`)}
                    style={{ 
                      padding: '24px', background: 'white', borderRadius: '20px', 
                      border: '1px solid var(--border-color)', cursor: 'pointer',
                      transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: `radial-gradient(circle, ${idx % 2 === 0 ? 'rgba(79, 70, 229, 0.05)' : 'rgba(16, 185, 129, 0.05)'} 0%, transparent 70%)`, borderBottomLeftRadius: '100%' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '48px', height: '48px', background: idx % 2 === 0 ? '#EEF2FF' : '#ECFDF5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx % 2 === 0 ? '#4F46E5' : '#10B981' }}>
                        <Book size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', margin: '0 0 4px 0', fontWeight: 700, color: 'var(--text-primary)' }}>{sub.name}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Standard {standardName}</p>
                      </div>
                    </div>
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <span>Progress</span>
                        <span style={{ color: 'var(--text-primary)' }}>{Math.floor(Math.random() * 40) + 20}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: idx % 2 === 0 ? 'var(--brand-gradient)' : 'linear-gradient(90deg, #10B981, #34D399)', width: `${Math.floor(Math.random() * 40) + 20}%`, borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
                {subjects.length === 0 && (
                  <div style={{ gridColumn: 'span 2', padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'white', borderRadius: '24px', border: '1px dashed var(--border-color)' }}>
                    No subjects found for your profile.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--brand-primary)" /> Recent Activity
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { title: 'Completed Physics Mock', time: '2 hours ago', icon: Trophy, color: '#F59E0B', bg: '#FEF3C7' },
                  { title: 'Chatted with AI Tutor', time: 'Yesterday', icon: MessageCircle, color: '#8B5CF6', bg: '#F5F3FF' },
                  { title: 'Started Chapter 3', time: '2 days ago', icon: BookOpen, color: '#3B82F6', bg: '#EFF6FF' }
                ].map((act, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: act.bg, color: act.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <act.icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{act.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>{act.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-outline" style={{ width: '100%', marginTop: '24px', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>View Full History</button>
            </div>

            <div style={{ background: 'var(--brand-primary)', borderRadius: '24px', padding: '32px', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', borderRadius: '50%' }}></div>
              <Activity size={32} style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Mock Test Simulator</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px', lineHeight: 1.5 }}>
                Ready to evaluate your preparation? Launch the NTA simulator now.
              </p>
              <button onClick={() => setLocation('/test-config')} className="btn" style={{ width: '100%', background: 'white', color: 'var(--brand-primary)', padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '15px' }}>
                Launch Configurator
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
