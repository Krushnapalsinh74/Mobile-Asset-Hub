import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Mail, Phone, ArrowLeft } from "lucide-react";
import { Spinner } from "../components/Spinner";
import { useApp } from "../context/AppContext";
import { otpApi, localApi, type OtpUserProfile } from "../services/api";
import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp } from "../services/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "../services/firebase";

type AuthMethod = 'none' | 'email' | 'phone';
type Step = 'select' | 'input' | 'otp';

export default function Login() {
  const [, setLocation] = useLocation();
  const { setStudent, setBoard, setStandard, boardId, standardId } = useApp();

  const [authMethod, setAuthMethod] = useState<AuthMethod>('none');
  const [step, setStep] = useState<Step>('select');

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
      
      {/* Left Visual Pane */}
      <div style={{ 
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'var(--brand-gradient)', display: 'flex', flexDirection: 'column', 
        justifyContent: 'space-between', padding: '48px', color: 'white'
      }}>
        {/* Soft abstract shapes */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: 800, position: 'relative', zIndex: 1, letterSpacing: '-0.5px' }}>
          <div style={{ width: '40px', height: '40px', background: 'white', color: 'var(--brand-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>KP</div>
          Knowledge Park
        </div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '56px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
            Elevate your <br/> learning journey.
          </h1>
          <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.8)', maxWidth: '400px', lineHeight: 1.5 }}>
            Access professional-grade CBT tools designed to help you master every subject with confidence.
          </p>
        </div>
        
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}>© 2026 Knowledge Park Inc.</div>
      </div>

      {/* Right Login Pane */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
          
          {step !== 'select' && (
            <button 
              onClick={() => {
                if (step === 'otp') { setStep('input'); setOtp(''); }
                else { setStep('select'); setAuthMethod('none'); }
                setError("");
              }}
              className="btn"
              style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '50%', marginBottom: '24px', color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-1px', color: 'var(--text-primary)' }}>
            {step === 'select' ? "Welcome back" : step === 'input' ? `Enter your ${authMethod}` : "Verify your code"}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '16px' }}>
            {step === 'select' ? "Choose a login method to continue." : step === 'input' ? "We'll send you a verification code." : "Enter the verification code sent to you."}
          </p>

          {error && <div style={{ color: '#EF4444', backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center' }}>{error}</div>}

          {step === 'select' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <button 
                onClick={handleGoogleSignIn} 
                className="btn" 
                style={{ width: '100%', height: '56px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', transition: 'all 0.2s ease' }} 
                disabled={loading}
              >
                {loading ? <Spinner size={24} /> : (
                  <>
                    <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <button 
                onClick={() => { setAuthMethod('email'); setStep('input'); }}
                className="btn" 
                style={{ width: '100%', height: '56px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', transition: 'all 0.2s ease' }}
              >
                <Mail size={22} color="#10B981" />
                Continue with Email
              </button>

              <button 
                onClick={() => { setAuthMethod('phone'); setStep('input'); }}
                className="btn" 
                style={{ width: '100%', height: '56px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', transition: 'all 0.2s ease' }}
              >
                <Phone size={22} color="#4F46E5" />
                Continue with Phone
              </button>

            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {step === 'input' ? (
                authMethod === 'email' ? (
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="input-field" style={{ padding: '16px', borderRadius: '16px', fontSize: '16px' }} required />
                ) : (
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit Phone Number" className="input-field" style={{ padding: '16px', borderRadius: '16px', fontSize: '16px' }} required />
                )
              ) : (
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" className="input-field" style={{ padding: '16px', borderRadius: '16px', fontSize: '16px', letterSpacing: '4px', textAlign: 'center', fontWeight: 700 }} required />
              )}
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '56px', borderRadius: '16px', fontSize: '16px', fontWeight: 700, boxShadow: 'var(--shadow-glow)' }} disabled={loading}>
                {loading ? <Spinner size={24} /> : (step === 'input' ? "Send Verification Code" : "Verify & Log In")}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <button 
              type="button" 
              onClick={() => setLocation('/')} 
              className="btn" 
              style={{ padding: 0, background: 'none', color: 'var(--text-tertiary)', fontWeight: 600 }}
            >
              Cancel and return to home
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
