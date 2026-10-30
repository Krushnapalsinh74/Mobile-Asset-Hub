import { useEffect } from "react";
import { useLocation } from "wouter";

// Temporary mock auth state until we hook up Firebase
const useAuth = () => {
  return { isAuthenticated: true, loading: false };
};

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading || !isAuthenticated) {
    return <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return <>{children}</>;
}
