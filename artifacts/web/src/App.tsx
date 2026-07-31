import { Switch, Route, Link, useLocation } from "wouter";
import { 
  BookOpen, Layers, Clock, Bookmark, 
  MessageCircle, Settings, LogIn 
} from "lucide-react";
import { useApp } from "./context/AppContext";

import Login from "./pages/Login";
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

function Sidebar() {
  const [location] = useLocation();
  const { studentName, isAuthenticated, logout } = useApp();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: <Layers size={18} /> },
    { href: "/subjects", label: "Subjects", icon: <BookOpen size={18} /> },
    { href: "/history", label: "History", icon: <Clock size={18} /> },
    { href: "/saved", label: "Saved", icon: <Bookmark size={18} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">KP</div>
        Knowledge Park
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link 
            key={link.href} 
            href={link.href}
            className={`nav-item ${location.startsWith(link.href) ? "active" : ""}`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '13px' }}>
        {isAuthenticated ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{studentName || 'Student'}</div>
            <button onClick={logout} className="btn" style={{ padding: 0, background: 'none', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Log out
            </button>
          </>
        ) : (
          <>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Guest Mode</div>
            <Link href="/login">
              <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <LogIn size={16} /> Log In / Sign Up
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
  const isQuiz = location.startsWith('/test/') || location === '/onboarding' || location === '/login';

  return (
    <div className="app-container">
      {location !== '/onboarding' && location !== '/login' && <Sidebar />}
      <main className="main-content">
        {!isQuiz && (
          <header className="topbar">
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Professional Dashboard</h2>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <MessageCircle size={14} style={{ marginRight: '6px' }} /> Ask AI
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
  const { boardId, standardId } = useApp();
  const [location, setLocation] = useLocation();

  // Redirect root to onboarding or dashboard
  if (location === "/") {
    if (boardId && standardId) {
      setLocation("/dashboard");
    } else {
      setLocation("/onboarding");
    }
    return null;
  }

  return (
    <Switch>
      <Route path="/login"><Login /></Route>
      <Route path="/onboarding"><Onboarding /></Route>
      
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
