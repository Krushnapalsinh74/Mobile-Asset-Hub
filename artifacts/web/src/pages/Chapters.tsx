import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { Layers, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { eduApi, type Chapter } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Chapters() {
  const { boardId, standardId } = useApp();
  const [match, params] = useRoute("/subjects/:id/chapters");
  const subjectId = params?.id;
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subjectId && boardId && standardId) {
      eduApi.getChapters(boardId, standardId, subjectId)
        .then((data) => {
          setChapters(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load chapters", err);
          setLoading(false);
        });
    }
  }, [subjectId, boardId, standardId]);

  return (
    <div className="page-container">
      <Link 
        href="/subjects"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Back to Subjects
      </Link>

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)' }}>Chapters</h1>
        <p style={{ fontSize: '15px' }}>Select a chapter to explore its topics.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Loader2 className="lucide-spin" size={32} color="var(--text-tertiary)" />
        </div>
      ) : (
        <div className="grid-cards">
          {chapters.map((chap, index) => (
              <Link 
              key={chap.id || chap._id} 
              href={`/chapters/${chap.id || chap._id}/topics?subjectId=${subjectId}`}
              className="card" 
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '8px', color: 'var(--brand-primary)' }}>
                  <Layers size={20} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  Ch {chap.order || index + 1}
                </span>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', lineHeight: 1.4 }}>{chap.name}</h3>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brand-primary)' }}>View Topics</span>
                <ChevronRight size={18} color="var(--text-tertiary)" />
              </div>
            </Link>
          ))}
          {chapters.length === 0 && (
            <p style={{ gridColumn: '1 / -1', color: 'var(--text-tertiary)' }}>No chapters found for this subject.</p>
          )}
        </div>
      )}
    </div>
  );
}
