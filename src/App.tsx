import { useAuth, AuthProvider } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

import { useEffect, useState } from 'react';
import { api } from './lib/api';
import type { Profile } from './types';
import OnboardingPage from './pages/OnboardingPage';
import { useAppStore } from './store/useAppStore';

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

  if (!session) return <AuthPage />;

  // If user has no profile or username, show onboarding
  if (!profile || !profile.username) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
