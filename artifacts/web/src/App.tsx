import { useState } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { 
  BookOpen, Layers, Clock, Bookmark, 
  Settings, LogIn, ChevronLeft, ChevronRight,
  CreditCard
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
import Payment from "./pages/Payment";

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
    { href: "/payment", label: "Plans & Unlock", icon: <CreditCard size={18} /> },
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
          zIndex: 10,
          color: 'var(--text-secondary)'
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav className="nav-links">
        {links.map((link) => {
          const isActive = location === link.href || (link.href !== "/dashboard" && location.startsWith(link.href));
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              {link.icon}
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {studentName || "Learner"}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Active Student</div>
              </div>
            )}
            <button 
              onClick={logout} 
              title="Logout" 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}
            >
              <LogIn size={16} />
            </button>
          </div>
        ) : (
          <Link 
            href="/login" 
            className="nav-link" 
            style={{ padding: '8px', color: 'var(--brand-primary)', fontWeight: 600 }}
          >
            <LogIn size={18} />
            {!collapsed && <span>Sign In</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function RouteHandler() {
  const { boardId, standardId, isAuthenticated } = useApp();
  const [location, setLocation] = useLocation();

  // Redirect root to dashboard only if fully authenticated and onboarded
  if (location === "/" && isAuthenticated) {
    if (boardId && standardId) {
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
            <Route path="/payment"><Payment /></Route>
            <Route path="/plans"><Payment /></Route>
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
