import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, ChevronRight, Loader2, Lock, Unlock, Sparkles, CreditCard } from "lucide-react";
import { eduApi, type Subject } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Subjects() {
  const [, setLocation] = useLocation();
  const { boardId, standardId, isSubjectUnlocked } = useApp();
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
  }, [boardId, standardId]);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Subjects & Curriculum</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0 }}>
            Select an unlocked subject to start practice quizzes and explore chapters.
          </p>
        </div>

        <button 
          onClick={() => setLocation('/payment')}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', background: 'white' }}
        >
          <CreditCard size={16} color="var(--brand-primary)" />
          <span>Subject Plans & Pricing</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Loader2 className="lucide-spin" size={32} color="var(--text-tertiary)" />
        </div>
      ) : (
        <div className="grid-cards">
          {subjects.map(sub => {
            const sId = sub.id || sub._id;
            const unlocked = isSubjectUnlocked(sId);
            const targetUrl = unlocked 
              ? `/subjects/${sId}/chapters` 
              : `/payment?subjectId=${sId}`;

            return (
              <Link 
                key={sId} 
                href={targetUrl}
                className="card" 
                style={{ 
                  display: 'block', 
                  textDecoration: 'none', 
                  color: 'inherit',
                  border: unlocked ? '1px solid var(--border-color)' : '1px dashed #FCA5A5',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div style={{ 
                    padding: '16px', 
                    background: unlocked ? 'rgba(79, 70, 229, 0.05)' : 'rgba(239, 68, 68, 0.05)', 
                    borderRadius: '16px', 
                    color: unlocked ? 'var(--brand-primary)' : '#EF4444' 
                  }}>
                    <BookOpen size={24} />
                  </div>

                  {unlocked ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '4px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Unlock size={12} /> Unlocked
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '4px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> Locked
                    </span>
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>{sub.name}</h3>
                  <p style={{ fontSize: '14px', marginBottom: '20px', color: 'var(--text-secondary)' }}>
                    Subject Code: {sub.code || "N/A"}
                  </p>
                </div>

                <div style={{ 
                  height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' 
                }}>
                  <div style={{ width: unlocked ? `35%` : `0%`, height: '100%', background: 'var(--brand-primary)' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {unlocked ? (
                    <>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brand-primary)' }}>View Chapters</span>
                      <ChevronRight size={18} color="var(--text-tertiary)" />
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={14} color="var(--brand-primary)" /> Unlock with Plan
                      </span>
                      <ChevronRight size={18} color="#DC2626" />
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
