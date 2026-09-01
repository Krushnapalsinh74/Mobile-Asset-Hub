import { useState } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { 
  BookOpen, Layers, Clock, Bookmark, 
  MessageCircle, Settings, LogIn, ChevronLeft, ChevronRight
} from "lucide-react";
import { useApp } from "./context/AppContext";

import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import TestQuiz from "./pages/TestQuiz";
import Subjects from "./pages/Subjects";
import Chapters from "./pages/Chapters";
import Topics from "./pages/Topics";
import Flashcards from "./pages/Flashcards";
import History from "./pages/History";
import TopicDashboard from "./pages/TopicDashboard";
import TestConfig from "./pages/TestConfig";
import Explanation from "./pages/Explanation";
import Chat from "./pages/Chat";
import Saved from "./pages/Saved";
import SettingsPage from "./pages/SettingsPage";
import Pricing from "./pages/Pricing";

import NtaLogin from "./pages/nta/NtaLogin";
import NtaInstructions from "./pages/nta/NtaInstructions";
import NtaExam from "./pages/nta/NtaExam";

function Sidebar() {
  const [location] = useLocation();
  const { studentName, isAuthenticated, logout } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: <Layers size={18} /> },
    { href: "/subjects", label: "Subjects", icon: <BookOpen size={18} /> },
    { href: "/history", label: "History", icon: <Clock size={18} /> },
    { href: "/saved", label: "Saved", icon: <Bookmark size={18} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">KP</div>
        {!collapsed && <span>Knowledge Park</span>}
      </div>
      
      <button 
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          top: '28px',
          right: '-14px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          zIndex: 20,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link 
            key={link.href} 
            href={link.href}
            className={`nav-item ${location.startsWith(link.href) ? "active" : ""}`}
          >
            {link.icon}
            {!collapsed && <span>{link.label}</span>}
          </Link>
        ))}
      </nav>
      
      <div style={{ marginTop: 'auto', padding: collapsed ? '20px 8px' : '20px 16px', background: 'var(--bg-primary)', borderRadius: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
        {isAuthenticated ? (
          <>
            {!collapsed && <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>{studentName || 'Student'}</div>}
            <button onClick={logout} className="btn" style={{ padding: 0, background: 'none', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {collapsed ? <LogIn size={16} style={{ transform: 'rotate(180deg)' }} /> : 'Log out'}
            </button>
          </>
        ) : (
          <>
            {!collapsed && <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Guest Mode</div>}
            <Link href="/login">
              <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: collapsed ? '10px 0' : '10px 18px' }}>
                <LogIn size={16} /> {!collapsed && 'Log In / Sign Up'}
              </button>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  
  // Don't show topbar inside the quiz, it has its own
  const isQuiz = location.startsWith('/test/') || location === '/onboarding' || location === '/login' || location === '/' || location === '/pricing';

  return (
    <div className="app-container">
      {location !== '/onboarding' && location !== '/login' && location !== '/' && location !== '/pricing' && <Sidebar />}
      <main className="main-content">
        {!isQuiz && (
          <header className="topbar">
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>Knowledge Park</h2>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '12px', boxShadow: 'var(--shadow-glow)' }}>
                <MessageCircle size={16} style={{ marginRight: '6px' }} /> Ask AI Tutor
              </button>
            </div>
          </header>
        )}
        {children}
      </main>
    </div>
  );
}

function RouteHandler() {
  const { boardId, standardId, isAuthenticated, activePlanId } = useApp();
  const [location, setLocation] = useLocation();

  // Redirect root to dashboard only if fully authenticated and onboarded
  if (location === "/" && isAuthenticated) {
    if (!activePlanId) {
      setLocation("/pricing");
    } else if (boardId && standardId) {
      setLocation("/dashboard");
    } else {
      setLocation("/onboarding");
    }
    return null;
  }

  return (
    <Switch>
      <Route path="/"><Landing /></Route>
      <Route path="/login"><Login /></Route>
      <Route path="/onboarding"><Onboarding /></Route>
      <Route path="/pricing"><Pricing /></Route>

      {/* NTA Mock Test Simulator Routes */}
      <Route path="/nta/login"><NtaLogin /></Route>
      <Route path="/nta/instructions"><NtaInstructions /></Route>
      <Route path="/nta/exam"><NtaExam /></Route>
      <Route path="/web"><NtaLogin /></Route>
      
      {/* Main App Routes */}
      <Route>
        <MainLayout>
          <Switch>
            <Route path="/dashboard"><Dashboard /></Route>
            <Route path="/subjects"><Subjects /></Route>
            <Route path="/subjects/:id/chapters"><Chapters /></Route>
            <Route path="/chapters/:id/topics"><Topics /></Route>
            <Route path="/topics/:id/dashboard"><TopicDashboard /></Route>
            <Route path="/test-config"><TestConfig /></Route>
            <Route path="/topics/:id/flashcards"><Flashcards /></Route>
            <Route path="/test/:subjectId/:chapterId"><TestQuiz subjectId="Physics" chapterId="Ch3" /></Route>
            <Route path="/explanation"><Explanation /></Route>
            <Route path="/chat"><Chat /></Route>
            <Route path="/history"><History /></Route>
            <Route path="/saved"><Saved /></Route>
            <Route path="/settings"><SettingsPage /></Route>
          </Switch>
        </MainLayout>
      </Route>
    </Switch>
  );
}

export default function App() {
  return <RouteHandler />;
}
