import { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "../../context/AppContext";
import "./nta.css";

export default function NtaInstructions() {
  const [, setLocation] = useLocation();
  const { studentName } = useApp();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="nta-container" style={{ overflowY: 'auto' }}>
      <header className="nta-header">
        <div className="nta-header-title">National Testing Agency - Instructions</div>
      </header>

      <div className="nta-instructions-card">
        <h2 style={{ color: '#21618C', marginBottom: '20px', borderBottom: '2px solid #21618C', paddingBottom: '10px' }}>General Instructions</h2>
        
        <div style={{ lineHeight: '1.6', fontSize: '14px', color: '#333' }}>
          <p><strong>Please read the instructions carefully</strong></p>
          <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Total duration of examination is 180 minutes.</li>
            <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</li>
            <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
              <ul style={{ listStyleType: 'none', paddingLeft: '10px', marginTop: '10px' }}>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="nta-badge badge-not-visited">1</div> You have not visited the question yet.
                </li>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="nta-badge badge-not-answered">2</div> You have not answered the question.
                </li>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="nta-badge badge-answered">3</div> You have answered the question.
                </li>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="nta-badge badge-review">4</div> You have NOT answered the question, but have marked the question for review.
                </li>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="nta-badge badge-answered-review">5</div> The question(s) "Answered and Marked for Review" will be considered for evaluation.
                </li>
              </ul>
            </li>
            <li>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window.</li>
          </ol>

          <h3 style={{ margin: '20px 0 10px 0' }}>Navigating to a Question</h3>
          <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>To answer a question, do the following:
              <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
              </ul>
            </li>
          </ol>

          <h3 style={{ margin: '20px 0 10px 0' }}>Answering a Question</h3>
          <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Procedure for answering a multiple choice type question:
              <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                <li>To select your answer, click on the button of one of the options.</li>
                <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                <li>To change your chosen answer, click on the button of another option.</li>
                <li>To save your answer, you MUST click on the <strong>Save & Next</strong> button.</li>
              </ul>
            </li>
          </ol>
        </div>

        <div style={{ marginTop: '30px', backgroundColor: '#f9f9f9', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)} 
              style={{ marginTop: '4px' }}
            />
            <span style={{ fontSize: '14px', lineHeight: '1.4' }}>
              I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations.
            </span>
          </label>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button 
            className="nta-btn nta-btn-clear"
            onClick={() => setLocation('/nta/login')}
          >
            Go Back
          </button>
          <button 
            className="nta-btn nta-btn-save"
            style={{ opacity: agreed ? 1 : 0.5, cursor: agreed ? 'pointer' : 'not-allowed' }}
            disabled={!agreed}
            onClick={() => setLocation('/nta/exam')}
          >
            PROCEED
          </button>
        </div>

      </div>
    </div>
  );
}
