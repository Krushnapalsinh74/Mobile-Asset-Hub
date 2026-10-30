import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { ChevronRight, Loader2, ArrowLeft, FileText } from "lucide-react";
import { eduApi, type Topic } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Topics() {
  const { boardId, standardId } = useApp();
  const [, params] = useRoute("/chapters/:id/topics");
  const chapterId = params ? (params as any).id : null;
  
  // Extract subjectId from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('subjectId');
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subjectId && chapterId && boardId && standardId) {
      eduApi.getTopics(boardId, standardId, subjectId, chapterId)
        .then((data) => {
          setTopics(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load topics", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [subjectId, chapterId, boardId, standardId]);

  return (
    <div className="page-container">
      <Link 
        href={subjectId ? `/subjects/${subjectId}/chapters` : `/subjects`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Back to Chapters
      </Link>

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)' }}>Topics</h1>
        <p style={{ fontSize: '15px' }}>Select a topic to study, take a quiz, or view flashcards.</p>
      </div>

      {!subjectId && (
        <div style={{ padding: '24px', background: 'var(--brand-danger)', color: 'white', borderRadius: '8px' }}>
          Missing subjectId in URL. Please navigate from the Subjects page.
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Loader2 className="lucide-spin" size={32} color="var(--text-tertiary)" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {topics.map((topic, index) => (
            <Link 
              key={topic.id || topic._id} 
              href={`/topics/${topic.id || topic._id}/dashboard?subjectId=${subjectId}&chapterId=${chapterId}`}
              className="card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(79, 70, 229, 0.05)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px' }}>
                  {index + 1}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: '0 0 4px 0', lineHeight: 1.4 }}>{topic.name}</h3>
                  {topic.description && (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{topic.description}</p>
                  )}
                </div>
              </div>
              <ChevronRight size={20} color="var(--text-tertiary)" />
            </Link>
          ))}
          
          {topics.length === 0 && subjectId && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>No topics found for this chapter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
