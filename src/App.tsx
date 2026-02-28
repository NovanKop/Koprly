import { useAuth, AuthProvider } from './context/AuthContext';
import { useEffect, useState, lazy, Suspense } from 'react';
import { api } from './lib/api';
import type { Profile } from './types';
import { useAppStore } from './store/useAppStore';
import { PWATutorialBubble } from './components/PWATutorialBubble';
import { PWAReleaseNotesModal } from './components/modals/PWAReleaseNotesModal';
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

function AppContent() {
  const { session, loading: authLoading } = useAuth();
  const [profileFetched, setProfileFetched] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { theme } = useAppStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#0B1218'; // Force dark background
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#F5F7F8'; // Force light background
    }
  }, [theme]);

  // Only re-fetch profile when the actual user changes (login/logout),
  // NOT on every session object change (e.g., token refresh).
  const userId = session?.user?.id;
  useEffect(() => {
    if (userId) {
      setProfileFetched(false);
      api.getProfile().then(data => {
        setProfile(data);
        setProfileFetched(true);
      });
    } else {
      setProfile(null);
      setProfileFetched(false);
    }
  }, [userId]);

  const handleOnboardingComplete = () => {
    // Refresh profile to update state and redirect
    if (session?.user) {
      setProfileFetched(false);
      api.getProfile().then(data => {
        setProfile(data);
        setProfileFetched(true);
      });
    }
  };

  if (authLoading || (session && !profileFetched)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    }>
      {!session ? (
        <AuthPage />
      ) : (!profile || !profile.username || typeof profile.total_budget !== 'number' || profile.total_budget <= 0) ? (
        <OnboardingPage onComplete={handleOnboardingComplete} />
      ) : (
        <Dashboard />
      )}
      <PWATutorialBubble />
      <PWAReleaseNotesModal profile={profile} onDismiss={() => { }} />
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
