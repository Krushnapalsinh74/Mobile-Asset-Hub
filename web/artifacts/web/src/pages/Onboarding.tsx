import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import { eduApi, type Board, type Standard } from "../services/api";
import { useApp } from "../context/AppContext";

export default function Onboarding() {
  const [_, setLocation] = useLocation();
  const { setBoard, setStandard } = useApp();
  
  const [step, setStep] = useState<"board" | "standard">("board");
  const [boards, setBoards] = useState<Board[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  useEffect(() => {
    eduApi.getBoards()
      .then(data => {
        setBoards(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load boards", err);
        setLoading(false);
      });
  }, []);

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
        <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', marginBottom: '12px' }}>
          {step === "board" ? "Select Your Board" : "Select Your Class"}
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
          {step === "board" 
            ? "Choose your educational board to get personalized content." 
            : `You selected ${selectedBoard?.name}. Now choose your standard.`}
        </p>
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
