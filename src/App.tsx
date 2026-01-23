import { useAuth, AuthProvider } from './context/AuthContext';
import { useEffect, useState, lazy, Suspense } from 'react';
import { api } from './lib/api';
import type { Profile } from './types';
import { useAppStore } from './store/useAppStore';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

function AppContent() {
  const { session, loading: authLoading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { theme } = useAppStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (session?.user) {
      setProfileLoading(true);
      api.getProfile().then(data => {
        setProfile(data);
        setProfileLoading(false);
      });
    } else {
      setProfile(null);
    }
  }, [session]);

  const handleOnboardingComplete = () => {
    // Refresh profile to update state and redirect
    if (session?.user) {
      setProfileLoading(true);
      api.getProfile().then(data => {
        setProfile(data);
        setProfileLoading(false);
      });
    }
  };

  if (authLoading || (session && profileLoading)) {
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
      ) : (!profile || !profile.username) ? (
        <OnboardingPage onComplete={handleOnboardingComplete} />
      ) : (
        <Dashboard />
      )}
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
