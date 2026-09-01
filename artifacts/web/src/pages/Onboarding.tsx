import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Lock } from "lucide-react";
import { eduApi, type Board, type Standard } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Onboarding() {
  const [_, setLocation] = useLocation();
  const { setBoard, setStandard, activePlanId, isPremium, isAuthenticated } = useApp();

  const [step, setStep] = useState<"board" | "standard">("board");
  const [boards, setBoards] = useState<Board[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  // ── Plan gate: if user has no plan selected, redirect to pricing ──────────
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (!activePlanId) {
      setLocation("/pricing");
      return;
    }
    // All good — fetch boards
    eduApi.getBoards()
      .then(data => {
        setBoards(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load boards", err);
        setLoading(false);
      });
  }, [isAuthenticated, activePlanId]);

  const handleBoardSelect = (board: Board) => {
    setSelectedBoard(board);
    setLoading(true);
    eduApi.getStandards(board.id || board._id!)
      .then(data => {
        setStandards(data);
        setStep("standard");
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load standards", err);
        setLoading(false);
      });
  };

  const handleStandardSelect = (std: Standard) => {
    if (!selectedBoard) return;
    setBoard(selectedBoard.id || selectedBoard._id!, selectedBoard.name);
    setStandard(std.id || std._id!, std.name);
    setLocation("/dashboard");
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '64px' }}>
      {step === "standard" && (
        <button
          onClick={() => { setStep("board"); setSelectedBoard(null); }}
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '24px', background: 'transparent', padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Boards
        </button>
      )}

      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        {/* Plan badge */}
        {activePlanId && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isPremium ? 'rgba(99,102,241,0.1)' : 'rgba(148,163,184,0.1)',
            border: `1px solid ${isPremium ? 'rgba(99,102,241,0.4)' : 'rgba(148,163,184,0.3)'}`,
            borderRadius: '999px',
            padding: '4px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: isPremium ? '#818cf8' : 'var(--text-tertiary)',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {isPremium ? '⭐ Premium Plan' : '🔒 Free Plan'}
          </div>
        )}

        <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', marginBottom: '12px' }}>
          {step === "board" ? "Select Your Board" : "Select Your Class"}
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
          {step === "board"
            ? "Choose your educational board to get personalized content."
            : `You selected ${selectedBoard?.name}. Now choose your standard.`}
        </p>

        {/* Upgrade nudge for free users */}
        {!isPremium && (
          <button
            className="btn"
            onClick={() => setLocation("/pricing")}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '12px',
              background: 'rgba(99,102,241,0.08)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Lock size={13} /> Upgrade for unlimited questions & AI features
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Loader2 className="lucide-spin" size={32} color="var(--text-tertiary)" />
        </div>
      ) : step === "board" ? (
        <div className="grid-cards">
          {boards.map(b => (
            <div
              key={b.id || b._id}
              className="card"
              onClick={() => handleBoardSelect(b)}
              style={{ cursor: 'pointer', textAlign: 'center', padding: '32px 24px' }}
            >
              <h3 style={{ fontSize: '20px', margin: 0 }}>{b.name}</h3>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-cards">
          {standards.map(s => (
            <div
              key={s.id || s._id}
              className="card"
              onClick={() => handleStandardSelect(s)}
              style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }}
            >
              <h3 style={{ fontSize: '18px', margin: 0 }}>{s.name}</h3>
            </div>
          ))}
          {standards.length === 0 && (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No classes found for this board.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
