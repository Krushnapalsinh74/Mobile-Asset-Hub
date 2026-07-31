import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { otpApi, localApi, type OtpUserProfile } from "../services/api";
import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp } from "../services/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "../services/firebase";

type AuthMethod = 'email' | 'phone' | 'google';
type Step = 'input' | 'otp';

export default function Login() {
  const [, setLocation] = useLocation();
  const { setStudent, setBoard, setStandard, boardId, standardId } = useApp();

  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [step, setStep] = useState<Step>('input');

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const firebaseConfirmRef = useRef<any>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const isValidPhone = (p: string) => /^\d{10}$/.test(p.trim());

  const finishLogin = async (resolvedEmail: string, profile?: OtpUserProfile) => {
    const name = profile?.name || "Student";
    setStudent(name, resolvedEmail);
    if (profile?.boardId && profile?.boardName && !boardId) {
      setBoard(profile.boardId, profile.boardName);
    }
    if (profile?.standardId && profile?.standardName && !standardId) {
      setStandard(profile.standardId, profile.standardName);
    }
    const hasBoardStd = (profile?.boardId && profile?.standardId) || (boardId && standardId);
    setLocation(hasBoardStd ? "/dashboard" : "/onboarding");
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) { setError("Please enter a valid email."); return; }
    
    setError(""); setLoading(true);
    try {
      const res = await otpApi.sendOtp(trimmed);
      if (res.success === false) { setError(res.message ?? 'Could not send OTP.'); return; }
      setStep('otp');
    } catch (e: any) { 
      setError(e?.message ?? 'Failed to send OTP.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { setError("Enter the OTP."); return; }
    
    setError(""); setLoading(true);
    try {
      const res = await otpApi.verifyOtp(email, otp);
      if (res.success === false) {
        setError(res.message ?? 'Invalid OTP.');
        return;
      }
      const [ourProfile, otpProfile] = await Promise.all([
        localApi.getProfile(email).catch(() => null),
        otpApi.getProfile(email).catch(() => null),
      ]);
      const merged: OtpUserProfile = {
        name: ourProfile?.name ?? otpProfile?.name,
        boardId: ourProfile?.boardId ?? otpProfile?.boardId,
        boardName: ourProfile?.boardName ?? otpProfile?.boardName,
        standardId: ourProfile?.standardId ?? otpProfile?.standardId,
        standardName: ourProfile?.standardName ?? otpProfile?.standardName,
      };
      await finishLogin(email, merged);
    } catch (e: any) { 
      setError(e?.message ?? 'Verification failed.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone)) { setError("Please enter a valid 10-digit number."); return; }
    
    setError(""); setLoading(true);
    try {
      const confirmation = await sendFirebasePhoneOtp(`+91${phone}`);
      firebaseConfirmRef.current = confirmation;
      setStep('otp');
    } catch (e: any) { 
      setError(e?.message ?? 'Failed to send SMS OTP.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError("Enter the 6-digit OTP."); return; }
    if (!firebaseConfirmRef.current) { setError("Session expired."); return; }
    
    setError(""); setLoading(true);
    try {
      const user = await verifyFirebasePhoneOtp(firebaseConfirmRef.current, otp);
      const identifier = user.phoneNumber ?? `+91${phone}`;
      const existing = await localApi.getProfile(identifier).catch(() => null);
      
      const merged: OtpUserProfile = {
        name: existing?.name ?? user.displayName ?? "Student",
        boardId: existing?.boardId ?? undefined,
        boardName: existing?.boardName ?? undefined,
        standardId: existing?.standardId ?? undefined,
        standardName: existing?.standardName ?? undefined,
      };
      await finishLogin(identifier, merged);
    } catch (e: any) { 
      setError(e?.message ?? 'Verification failed.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleGoogleSignIn = async () => {
    setError(""); setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const email = result.user.email;
      if (!email) throw new Error("No email found from Google.");
      
      const existing = await localApi.getProfile(email).catch(() => null);
      const merged: OtpUserProfile = {
        name: existing?.name ?? result.user.displayName ?? "Student",
        boardId: existing?.boardId ?? undefined,
        boardName: existing?.boardName ?? undefined,
        standardId: existing?.standardId ?? undefined,
        standardName: existing?.standardName ?? undefined,
      };
      await finishLogin(email, merged);
    } catch (e: any) { 
      setError(e?.message ?? 'Google Sign-in failed.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = authMethod === 'email' 
    ? (step === 'input' ? handleSendEmailOtp : handleVerifyEmailOtp)
    : (step === 'input' ? handleSendPhoneOtp : handleVerifyPhoneOtp);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', backgroundColor: 'var(--bg-surface)' }}>
      
      <div style={{ flex: 1, backgroundColor: '#F4F4F5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', borderRight: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: 700 }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--brand-primary)', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>KP</div>
          Knowledge Park
        </div>
        <div>
          <h1 style={{ fontSize: '40px', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '24px', color: 'var(--brand-primary)' }}>Master your exams <br/> with precision.</h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '400px' }}>Access professional-grade testing tools designed to mirror real CBT environments.</p>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>© 2026 Knowledge Park Inc.</div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Sign in</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>
            {step === 'input' ? "Choose a method to continue." : "Enter the verification code sent to you."}
          </p>

          {error && <div style={{ color: 'var(--brand-danger)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {step === 'input' ? (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button type="button" onClick={() => setAuthMethod('email')} className="btn" style={{ flex: 1, border: authMethod === 'email' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)' }}>Email</button>
                  <button type="button" onClick={() => setAuthMethod('phone')} className="btn" style={{ flex: 1, border: authMethod === 'phone' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)' }}>Phone</button>
                </div>
                
                {authMethod === 'email' ? (
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="input-field" required />
                ) : (
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit Phone" className="input-field" required />
                )}
              </>
            ) : (
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="OTP" className="input-field" required />
            )}
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px' }} disabled={loading}>
              {loading ? <Loader2 className="lucide-spin" size={20} /> : (step === 'input' ? "Send Code" : "Verify")}
            </button>
          </form>

          {step === 'input' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                <span style={{ padding: '0 16px', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 500 }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              </div>

              <button type="button" onClick={handleGoogleSignIn} className="btn btn-outline" style={{ width: '100%', height: '44px', marginBottom: '16px' }} disabled={loading}>
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: step === 'otp' ? '32px' : '0' }}>
            <button 
              type="button" 
              onClick={() => {
                if (step === 'otp') { setStep('input'); setOtp(''); }
                else setLocation('/dashboard');
              }} 
              className="btn" 
              style={{ padding: 0, background: 'none', color: 'var(--text-secondary)' }}
            >
              {step === 'otp' ? "Back" : "Continue as Guest"}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
