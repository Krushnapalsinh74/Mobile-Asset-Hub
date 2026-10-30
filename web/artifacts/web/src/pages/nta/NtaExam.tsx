import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "../../context/AppContext";
import { User, Clock } from "lucide-react";
import "./nta.css";

// Sample NTA Exam Questions
const SAMPLE_QUESTIONS = [
  {
    id: 1,
    text: "A particle of mass m is projected with velocity v making an angle of 45° with the horizontal. When the particle lands on the level ground, the magnitude of the change in its momentum will be:",
    options: ["2mv", "mv/√2", "mv√2", "zero"],
    correct: 2, // 3rd option (mv√2)
  },
  {
    id: 2,
    text: "The half-life of a radioactive nucleus is 50 days. The time interval (t2 - t1) between the time t2 when 2/3 of it has decayed and the time t1 when 1/3 of it had decayed is:",
    options: ["30 days", "50 days", "60 days", "15 days"],
    correct: 1,
  },
  {
    id: 3,
    text: "Two solid cylinders P and Q of same mass and same radius start rolling down a fixed inclined plane from the same height at the same time. Cylinder P has most of its mass concentrated near its surface, while Q has most of its mass concentrated near the axis. Which statement is correct?",
    options: [
      "Both reach the bottom at the same time.",
      "Cylinder P reaches the bottom earlier than cylinder Q.",
      "Cylinder Q reaches the bottom earlier than cylinder P.",
      "The result depends on the angle of inclination."
    ],
    correct: 2,
  },
  {
    id: 4,
    text: "Let f(x) = x² - x + 1. Then the equation f(f(x)) = x has:",
    options: [
      "exactly two real roots",
      "exactly four real roots",
      "no real roots",
      "infinite real roots"
    ],
    correct: 2, // Actually no real roots
  },
  {
    id: 5,
    text: "Consider a mixture of n moles of helium gas and 2n moles of oxygen gas (assumed ideal) at absolute temperature T. The internal energy of the mixture is:",
    options: ["11/2 nRT", "15/2 nRT", "13/2 nRT", "9/2 nRT"],
    correct: 0,
  }
];

type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'review' | 'answered-review';

export default function NtaExam() {
  const [, setLocation] = useLocation();
  const { studentName } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180 * 60); // 180 mins
  
  // State tracking for each question
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [statuses, setStatuses] = useState<QuestionStatus[]>(
    SAMPLE_QUESTIONS.map((_, i) => i === 0 ? 'not-answered' : 'not-visited')
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const submitExam = () => {
    // Simple submission alert for demo
    let score = 0;
    let attempted = 0;
    SAMPLE_QUESTIONS.forEach((q, idx) => {
      if (answers[idx] !== undefined) {
        attempted++;
        if (answers[idx] === q.correct) score += 4;
        else score -= 1; // NTA negative marking
      }
    });
    alert(`Exam Submitted!\nAttempted: ${attempted}/${SAMPLE_QUESTIONS.length}\nEstimated Score: ${score}`);
    setLocation("/dashboard");
  };

  const updateStatus = (index: number, newStatus: QuestionStatus) => {
    setStatuses(prev => {
      const copy = [...prev];
      copy[index] = newStatus;
      return copy;
    });
  };

  const goToQuestion = (index: number) => {
    // If the current question was only visited but no action taken and no answer selected, it stays not-answered.
    // Wait, if it has an answer but user just clicked away, maybe it's not saved?
    // NTA says clicking a number does NOT save the current answer. 
    // We will just change index. 
    // If the new question was not-visited, mark it not-answered.
    if (statuses[index] === 'not-visited') {
      updateStatus(index, 'not-answered');
    }
    setCurrentIndex(index);
  };

  const handleSaveAndNext = () => {
    const hasAnswer = answers[currentIndex] !== undefined;
    updateStatus(currentIndex, hasAnswer ? 'answered' : 'not-answered');
    if (currentIndex < SAMPLE_QUESTIONS.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handleClear = () => {
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[currentIndex];
      return copy;
    });
    updateStatus(currentIndex, 'not-answered');
  };

  const handleSaveAndReview = () => {
    const hasAnswer = answers[currentIndex] !== undefined;
    // You can only "Save and Mark for Review" if you answered it. 
    if (hasAnswer) {
      updateStatus(currentIndex, 'answered-review');
    }
    if (currentIndex < SAMPLE_QUESTIONS.length - 1) goToQuestion(currentIndex + 1);
  };

  const handleReviewAndNext = () => {
    updateStatus(currentIndex, 'review');
    if (currentIndex < SAMPLE_QUESTIONS.length - 1) goToQuestion(currentIndex + 1);
  };

  const q = SAMPLE_QUESTIONS[currentIndex];

  // Calculate palette stats
  const stats = {
    notVisited: statuses.filter(s => s === 'not-visited').length,
    notAnswered: statuses.filter(s => s === 'not-answered').length,
    answered: statuses.filter(s => s === 'answered').length,
    review: statuses.filter(s => s === 'review').length,
    answeredReview: statuses.filter(s => s === 'answered-review').length,
  };

  return (
    <div className="nta-container">
      <header className="nta-header">
        <div className="nta-header-title">National Testing Agency</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 'bold' }}>
          <Clock size={20} /> Time Left: {formatTime(timeLeft)}
        </div>
      </header>

      <div className="nta-main">
        {/* Left Panel - Question & Actions */}
        <div className="nta-left-panel">
          <div className="nta-question-header">
            <span>Question No. {currentIndex + 1}</span>
            <span>Subject: Physics</span>
          </div>
          
          <div className="nta-question-body">
            <div style={{ marginBottom: '30px', fontSize: '18px' }}>
              {q.text}
            </div>
            
            <div className="nta-options">
              {q.options.map((opt, i) => (
                <label key={i} className="nta-option">
                  <input 
                    type="radio" 
                    name={`q-${currentIndex}`} 
                    checked={answers[currentIndex] === i}
                    onChange={() => {
                      setAnswers(prev => ({ ...prev, [currentIndex]: i }));
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span>({i + 1}) {opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="nta-actions">
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="nta-btn nta-btn-save" onClick={handleSaveAndNext}>Save & Next</button>
              <button className="nta-btn nta-btn-clear" onClick={handleClear}>Clear Response</button>
              <button className="nta-btn nta-btn-review" onClick={handleSaveAndReview}>Save & Mark for Review</button>
              <button className="nta-btn nta-btn-mark" onClick={handleReviewAndNext}>Mark for Review & Next</button>
            </div>
          </div>
        </div>

        {/* Right Panel - Palette */}
        <div className="nta-right-panel">
          <div className="nta-profile">
            <div className="nta-profile-pic">
              <User size={36} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>{studentName || "Candidate Name"}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Paper: JEE Main - B.E/B.Tech</div>
            </div>
          </div>

          <div className="nta-palette-status">
            <div className="nta-status-item"><div className="nta-badge badge-not-visited">{stats.notVisited}</div> Not Visited</div>
            <div className="nta-status-item"><div className="nta-badge badge-not-answered">{stats.notAnswered}</div> Not Answered</div>
            <div className="nta-status-item"><div className="nta-badge badge-answered">{stats.answered}</div> Answered</div>
            <div className="nta-status-item"><div className="nta-badge badge-review">{stats.review}</div> Marked for Review</div>
            <div className="nta-status-item" style={{ gridColumn: 'span 2' }}>
              <div className="nta-badge badge-answered-review">{stats.answeredReview}</div> Answered & Marked for Review
            </div>
          </div>

          <div className="nta-palette-grid-container">
            <div className="nta-palette-header">Physics</div>
            <div className="nta-palette-grid">
              {SAMPLE_QUESTIONS.map((_, i) => (
                <button 
                  key={i} 
                  className={`nta-palette-btn badge-${statuses[i]}`}
                  onClick={() => goToQuestion(i)}
                  style={{ border: currentIndex === i ? '2px solid black' : 'none' }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '15px', borderTop: '1px solid #ccc', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
            <button className="nta-btn nta-btn-submit" style={{ width: '100%', padding: '12px' }} onClick={submitExam}>
              Submit Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
