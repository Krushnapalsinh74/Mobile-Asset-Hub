import { ArrowLeft, BarChart2, Calendar, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import { useApp } from "../context/AppContext";

export default function History() {
  const [, setLocation] = useLocation();
  const { testHistory } = useApp();

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <div className="page-container">
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <button className="btn" onClick={() => setLocation('/dashboard')} style={{ padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', margin: 0 }}>Test History</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Track your performance across all subjects.</p>
        </div>
      </div>
      
      {testHistory.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <BarChart2 size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>No tests taken yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Complete a practice test to see your history here.</p>
          <button className="btn btn-primary" onClick={() => setLocation('/dashboard')} style={{ marginTop: '24px' }}>Go to Dashboard</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {testHistory.map((t, i) => {
            const pct = t.percentage || 0;
            const isGood = pct >= 70;
            const isOk = pct >= 40 && pct < 70;
            
            let color = '#EF4444'; // Red
            let bg = '#FEF2F2';
            if (isGood) { color = '#22C55E'; bg = '#F0FDF4'; }
            else if (isOk) { color = '#F59E0B'; bg = '#FFFBEB'; }

            return (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  
                  {/* Score Bubble */}
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '50%', 
                    background: bg, border: `2px solid ${color}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color, lineHeight: 1 }}>{pct}%</span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                      {t.subjectId || 'Subject'} - {t.chapterId || 'Chapter'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} /> {formatTime(t.timestamp)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trophy size={14} /> {t.score} / {t.total} Correct
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
