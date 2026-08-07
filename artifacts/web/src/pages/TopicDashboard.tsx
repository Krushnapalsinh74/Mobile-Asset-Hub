import { useRoute, Link, useLocation } from "wouter";
import { BookOpen, MessageCircle, Trophy, Layers, ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext";

const TOPIC_ACTIONS = [
  {
    key: 'explanation',
    label: 'Study Guide',
    desc: 'Key concepts & detailed notes',
    icon: <BookOpen size={24} color="white" />,
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    route: '/explanation',
  },
  {
    key: 'chat',
    label: 'AI Tutor',
    desc: 'Ask anything, get instant help',
    icon: <MessageCircle size={24} color="white" />,
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    route: '/chat',
  },
  {
    key: 'test',
    label: 'Practice Test',
    desc: 'MCQ questions with solutions',
    icon: <Trophy size={24} color="white" />,
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    route: '/test-config',
  },
  {
    key: 'flashcard',
    label: 'Flashcards',
    desc: 'Flip-card rapid revision',
    icon: <Layers size={24} color="white" />,
    gradient: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)',
    route: '/topics/:id/flashcards',
  },
];

export default function TopicDashboard() {
  const [, params] = useRoute("/topics/:id/dashboard");
  const topicId = params ? (params as any).id : null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('subjectId');
  const chapterId = urlParams.get('chapterId');
  const [, setLocation] = useLocation();

  const { boardName, standardName } = useApp();

  return (
    <div className="page-container" style={{ padding: 0 }}>
      {/* HERO HEADER */}
      <div style={{ 
        background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 50%, #7C3AED 100%)',
        padding: '48px',
        color: 'white',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '200px', height: '200px', borderRadius: '100px', background: 'rgba(255,255,255,0.06)' }}></div>
        <div style={{ position: 'absolute', bottom: '-20px', left: '-30px', width: '130px', height: '130px', borderRadius: '65px', background: 'rgba(255,255,255,0.05)' }}></div>

        <Link 
          href={`/chapters/${chapterId}/topics?subjectId=${subjectId}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', fontWeight: 500, position: 'relative', zIndex: 1 }}
        >
          <ArrowLeft size={16} /> Back to Topics
        </Link>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
            Subject › Chapter
          </div>
          <h1 style={{ fontSize: '32px', margin: '0 0 16px 0', lineHeight: 1.2 }}>
            Topic Dashboard
          </h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            {boardName && (
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{boardName}</span>
            )}
            {standardName && (
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{standardName}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 48px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>What would you like to do?</p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px' 
        }}>
          {TOPIC_ACTIONS.map(action => {
            let actualRoute = action.route.replace(':id', topicId || '');
            if (action.route === '/test-config' || action.route === '/topics/:id/flashcards') {
              actualRoute += `${actualRoute.includes('?') ? '&' : '?'}subjectId=${subjectId}&chapterId=${chapterId}&topicId=${topicId}`;
            }
              
            return (
              <div 
                key={action.key}
                onClick={() => setLocation(actualRoute)}
                style={{ 
                  background: action.gradient,
                  borderRadius: '20px',
                  padding: '24px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {action.icon}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700 }}>{action.label}</h3>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.9, lineHeight: 1.4 }}>{action.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
