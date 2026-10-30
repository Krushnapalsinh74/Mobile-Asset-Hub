import { useState } from "react";
import { ArrowLeft, User, LogOut, Check, Book } from "lucide-react";
import { useLocation } from "wouter";
import { useApp } from "../context/AppContext";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { studentName, studentEmail, boardName, standardName, setStudent, logout } = useApp();

  const [name, setName] = useState(studentName || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setStudent(name, studentEmail || '');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <button className="btn" onClick={() => setLocation('/dashboard')} style={{ padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', margin: 0 }}>Account Settings</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your profile and preferences.</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <User size={20} color="var(--brand-primary)" /> Profile Information
          </h3>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Student Name
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Your Name"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Email Address
            </label>
            <input 
              type="email" 
              value={studentEmail || ''}
              disabled
              className="input-field"
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>Email cannot be changed.</p>
          </div>

          <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saved ? <><Check size={16} /> Saved Successfully</> : "Save Changes"}
          </button>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Book size={20} color="var(--brand-primary)" /> Academic Profile
          </h3>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Board
              </label>
              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {boardName || 'Not Set'}
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Standard
              </label>
              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {standardName || 'Not Set'}
              </div>
            </div>
          </div>
          
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '16px' }}>
            To change your board or standard, you need to log out and re-enter the onboarding flow.
          </p>
        </div>

        <div className="card" style={{ padding: '32px', border: '1px solid #FCA5A5' }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#EF4444' }}>
            Danger Zone
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Logging out will clear your current session. You will need to verify your phone number or email again to log back in.
          </p>
          <button 
            className="btn" 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5' }}
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>

      </div>
    </div>
  );
}
