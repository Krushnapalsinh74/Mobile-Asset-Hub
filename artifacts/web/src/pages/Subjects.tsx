import { useState, useEffect } from "react";
import { Link } from "wouter";
import { BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { eduApi, type Subject } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Subjects() {
  const { boardId, standardId } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

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
        console.error("Failed to load subjects", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)' }}>Subjects</h1>
        <p style={{ fontSize: '15px' }}>Select a subject to view chapters and begin practice.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Loader2 className="lucide-spin" size={32} color="var(--text-tertiary)" />
        </div>
      ) : (
        <div className="grid-cards">
          {subjects.map(sub => (
            <Link 
            key={sub.id || sub._id} 
            href={`/subjects/${sub.id || sub._id}/chapters`}
            className="card" 
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px', color: 'var(--brand-primary)' }}>
                <BookOpen size={20} />
              </div>
              {/* Mock progress since it's not in the base API model */}
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)' }}>0% Mastery</span>
            </div>
            <div>
              <h3 style={{ fontSize: '18px', margin: 0 }}>{sub.name}</h3>
              <p style={{ fontSize: '14px', marginBottom: '20px' }}>Subject Code: {sub.code || "N/A"}</p>
            </div>
            <div style={{ 
              height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' 
            }}>
              <div style={{ width: `0%`, height: '100%', background: 'var(--brand-primary)' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brand-primary)' }}>View Chapters</span>
              <ChevronRight size={18} color="var(--text-tertiary)" />
            </div>
          </Link>
          ))}
        </div>
      )}
    </div>
  );
}
