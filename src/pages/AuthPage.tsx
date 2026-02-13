import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { AppLayout } from '../layouts/AppLayout';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationSent } from '../components/auth/ConfirmationSent';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

// Google Icon Component
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" className="flex-shrink-0">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authMode, setAuthMode] = useState<AuthMode>('signin');
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isConfirmationSent, setIsConfirmationSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const { theme, setTheme } = useAppStore();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isForgotPassword) {
                await api.resetPassword(email);
                setMessage('Check your email for the password reset link!');
            } else if (authMode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                    },
                });
                if (error) throw error;

                // Debug logging
                console.log('Signup response:', {
                    user: data.user,
                    session: data.session,
                    confirmed_at: data.user?.confirmed_at
                });

                // If session is null, it means email confirmation is required
                if (data.user && !data.session) {
                    setIsConfirmationSent(true);
                } else {
                    // Check if user is actually confirmed (some Supabase configs auto-confirm)
                    if (data.user?.confirmed_at) {
                        // Auto-login logic would require session, which 'data' includes if confirmed
                        setMessage('Account created! Logging you in...');
                    } else {
                        // Even if session exists (rare if confirm enabled), show check email
                        setIsConfirmationSent(true);
                    }
                }
            } else {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Sync theme preference to profile on login
                if (data.user) {
                    await api.updateProfile({ theme });
                }
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            if (err.message === 'Invalid login credentials') {
                setError('Incorrect password or unregistered account.');
            } else if (err.message.includes('User not found') || err.message.includes('Invalid Grant')) {
                setError('Email Account unregistered yet, register first');
            } else if (err.message.includes('Error sending confirmation email')) {
                setError('System Limit: Supabase default email service is rate-limited. Please configure Custom SMTP in your Supabase Dashboard.');
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('Google login error:', err);
            setError('Failed to sign in with Google. Please try again.');
            setIsGoogleLoading(false);
        }
    };

    const switchMode = (mode: AuthMode) => {
        setAuthMode(mode);
        setIsForgotPassword(false);
        setIsConfirmationSent(false); // Reset confirmation state
        setMessage(null);
        setError(null);
    };

    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] relative">
                {/* Theme Toggle */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="absolute top-0 right-4 p-3 rounded-full bg-surface border border-border-color shadow-lg hover:bg-surface/80 transition-all backdrop-blur-md z-50 group"
                >
                    <AnimatePresence mode="wait">
                        {theme === 'dark' ? (
                            <motion.div
                                key="sun"
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Sun size={20} className="text-yellow-400 group-hover:text-yellow-300" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="moon"
                                initial={{ rotate: 90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: -90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Moon size={20} className="text-blue-500 group-hover:text-blue-400" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>

                {/* Logo Section */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 flex flex-col items-center"
                >
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 backdrop-blur-md overflow-hidden">
                        <img src="/logo.png" alt="Koprly" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-center">Koprly</h1>
                    <p className="text-text-secondary mt-2">Your money’s best friend.</p>
                </motion.div>

                <Card className="w-full max-w-md p-0 overflow-hidden" glass>
                    <AnimatePresence mode="wait">
                        {isConfirmationSent ? (
                            <ConfirmationSent
                                key="confirmation"
                                email={email}
                                onBack={() => switchMode('signin')}
                            />
                        ) : (
                            <motion.div
                                key="auth-form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {/* Tab Selector */}
                                {!isForgotPassword && (
                                    <div className="flex border-b border-border-color">
                                        <button
                                            type="button"
                                            onClick={() => switchMode('signin')}
                                            className={`flex-1 py-4 text-center font-semibold transition-all relative ${authMode === 'signin'
                                                ? 'text-primary'
                                                : 'text-text-secondary hover:text-text-primary'
                                                }`}
                                        >
                                            Login
                                            {authMode === 'signin' && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                                />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => switchMode('signup')}
                                            className={`flex-1 py-4 text-center font-semibold transition-all relative ${authMode === 'signup'
                                                ? 'text-primary'
                                                : 'text-text-secondary hover:text-text-primary'
                                                }`}
                                        >
                                            Register
                                            {authMode === 'signup' && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                                />
                                            )}
                                        </button>
                                    </div>
                                )}

                                <div className="p-6 md:p-8 space-y-6">
                                    {!isForgotPassword && (
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold mb-2">
                                                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
                                            </h2>
                                            <p className="text-text-secondary text-sm">
                                                {authMode === 'signin'
                                                    ? 'Login to your account'
                                                    : 'Start your financial journey today'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Google Button */}
                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        disabled={isGoogleLoading}
                                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border-color bg-surface hover:bg-surface/80 transition-all hover:scale-[0.98] active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        {isGoogleLoading ? (
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <GoogleIcon />
                                        )}
                                        <span className="font-medium group-hover:text-primary transition-colors">
                                            {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                                        </span>
                                    </button>

                                    <p className="text-xs text-center text-text-secondary/60">
                                        {authMode === 'signin'
                                            ? "Don't have an account? It takes less than a minute."
                                            : "Already have an account? Log in here."}
                                    </p>

                                    {/* Divider */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-px bg-border-color" />
                                        <span className="text-text-secondary text-sm">or continue with email</span>
                                        <div className="flex-1 h-px bg-border-color" />
                                    </div>

                                    {/* Email/Password Form */}
                                    <form onSubmit={handleAuth} className="space-y-4">
                                        <Input
                                            label="Email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        <AnimatePresence>
                                            {!isForgotPassword && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <Input
                                                        label="Password"
                                                        type={showPassword ? "text" : "password"}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        required={!isForgotPassword}
                                                        minLength={6}
                                                        rightIcon={
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="focus:outline-none text-text-secondary hover:text-primary transition-colors cursor-pointer"
                                                                tabIndex={-1}
                                                            >
                                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                            </button>
                                                        }
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-3 rounded-lg bg-error/10 text-error text-sm text-center"
                                            >
                                                {error}
                                            </motion.div>
                                        )}
                                        {message && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-3 rounded-lg bg-success/10 text-success text-sm text-center"
                                            >
                                                {message}
                                            </motion.div>
                                        )}

                                        <Button type="submit" className="w-full" isLoading={isLoading}>
                                            {isForgotPassword
                                                ? 'Send Reset Link'
                                                : authMode === 'signup'
                                                    ? 'Create Account'
                                                    : 'Login'}
                                        </Button>
                                    </form>

                                    {/* Footer Links */}
                                    {!isForgotPassword && (
                                        <div className="mt-2 text-center">
                                            {authMode === 'signin' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsForgotPassword(true);
                                                        setMessage(null);
                                                        setError(null);
                                                    }}
                                                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                                                >
                                                    Forgot password?
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </div >
        </AppLayout >
    );
}
