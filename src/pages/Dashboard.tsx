import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { Wallet, Plus, Loader2, TrendingUp, TrendingDown, ChevronRight, X, Eye, EyeOff, CreditCard, Flame, Pencil, ArrowLeft, Trash2 } from 'lucide-react';
import { MiniSparkline } from '../components/ui/MiniSparkline';
import { api } from '../lib/api';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
const SettingsPage = lazy(() => import('./SettingsPage'));
const FinancialReport = lazy(() => import('./FinancialReport'));
const BudgetPage = lazy(() => import('./BudgetPage'));
const SpendingCategoryPage = lazy(() => import('./SpendingCategoryPage'));
const HistoryPage = lazy(() => import('./HistoryPage'));
const NotificationSettings = lazy(() => import('./NotificationSettings'));
import { CategorySelector } from '../components/CategorySelector';
import { WalletSelector } from '../components/WalletSelector';
import { BottomMenu } from '../components/BottomMenu';
import { useAppStore } from '../store/useAppStore';
import { formatMoney } from '../lib/utils';
import { formatDate } from '../utils/dateFormatter';
import { formatIDR, parseIDR } from '../utils/currencyFormatter';
import { MAX_WALLETS, WALLET_ICONS, WALLET_COLORS } from '../lib/constants';
import NotificationBell from '../components/NotificationBell';
import { useTransactionManager } from '../hooks/useTransactionManager';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';
import { KoprlystGuide } from '../components/guide/KoprlystGuide';
import { BalanceWarningModal } from '../components/modals/BalanceWarningModal';
import type { Category, Transaction, Profile, Wallet as WalletType, Notification } from '../types';


import { CategoryIcon } from '../components/ui/CategoryIcon';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';

export default function Dashboard() {
    const { user } = useAuth();
    const { currency, isBottomMenuVisible, setBottomMenuVisible, dateFormat } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<WalletType[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showAddIncome, setShowAddIncome] = useState(false);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);


    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentView, setCurrentView] = useState<'home' | 'report' | 'settings' | 'budget' | 'category' | 'history' | 'notifications'>('home');
    const [showPrivacy, setShowPrivacy] = useState(true); // Default visible
    const [showWelcome, setShowWelcome] = useState(false); // First-visit welcome
    const [showKoprlyst, setShowKoprlyst] = useState(false); // Interactive guide

    // Calculate Sparkline Data (Last 5 transactions)
    const sparklineData = useMemo(() => {
        // Assuming currentBalance is calculated elsewhere, e.g., sum of all wallet balances
        const currentBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

        if (transactions.length === 0) return [0, 0, 0, 0, 0]; // Flat line if no data

        // Get last 5 transactions (they are already sorted desc by date)
        const newestFirstIso = transactions.slice(0, 5); // Index 0 is newest.

        let tempBalance = currentBalance;
        const history = [tempBalance];

        for (const txn of newestFirstIso) {
            const amount = Number(txn.amount);
            if (txn.type === 'income') {
                tempBalance -= amount; // Undo income
            } else {
                tempBalance += amount; // Undo expense
            }
            history.unshift(tempBalance);
        }

        // Now history is [OldestBalance, ..., CurrentBalance]
        // If less than 5 transactions, pad with the oldest known balance? Or just flat?
        while (history.length < 5) {
            history.unshift(history[0]);
        }

        return history;
    }, [transactions, wallets]);

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedWallet, setSelectedWallet] = useState<string>('');
    const currencySymbol = currency === 'IDR' ? 'Rp' : '$';

    // Wallet Modal State
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [editingWallets, setEditingWallets] = useState<any[]>([]);
    const [activeModalWalletIndex, setActiveModalWalletIndex] = useState(0);

    const [showEditTransaction, setShowEditTransaction] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [activeIconPickerIndex, setActiveIconPickerIndex] = useState<number | null>(null);
    const [showBalanceWarning, setShowBalanceWarning] = useState(false);
    const [showDeleteWalletConfirm, setShowDeleteWalletConfirm] = useState(false);
    const [walletToDelete, setWalletToDelete] = useState<number | null>(null);

    // Manage Bottom Menu visibility for Dashboard (Home) View
    useEffect(() => {
        // Only control visibility from here if we are in 'home' view
        // Other views (budget, settings) will handle their own visibility state
        if (currentView === 'home') {
            // Only hide completely for modals that take up full attention (Wallet config, Edit trans)
            // For Add Expense/Income, we now "collapse" to a button instead of hiding
            const shouldHideCompletely = showWalletModal || showEditTransaction;
            setBottomMenuVisible(!shouldHideCompletely);
        }
    }, [currentView, showWalletModal, showEditTransaction, setBottomMenuVisible]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentView]);

    const loadData = useCallback(async (forceRefresh = false) => {
        if (!user) return;

        // Check if data was recently loaded (within last 2 minutes)
        // Skip reload unless explicitly forced
        const lastLoadTime = sessionStorage.getItem('koprly_data_last_loaded');
        const lastUserId = sessionStorage.getItem('koprly_data_user_id');
        const now = Date.now();
        const TWO_MINUTES = 2 * 60 * 1000;

        if (!forceRefresh && lastLoadTime && lastUserId === user.id) {
            const timeSinceLoad = now - parseInt(lastLoadTime, 10);
            if (timeSinceLoad < TWO_MINUTES) {
                // Restore cached data into React state if state is currently empty
                // This handles the case where the component remounted but data is still fresh
                const cachedData = sessionStorage.getItem('koprly_cached_data');
                if (cachedData) {
                    try {
                        const parsed = JSON.parse(cachedData);
                        if (parsed.userId === user.id) {
                            // Only restore if React state is empty (component just remounted)
                            setProfile(prev => prev || parsed.profile);
                            setCategories(prev => prev.length > 0 ? prev : parsed.categories || []);
                            setWallets(prev => prev.length > 0 ? prev : parsed.wallets || []);
                            setTransactions(prev => prev.length > 0 ? prev : parsed.transactions || []);
                            if (parsed.wallets?.length > 0) {
                                setSelectedWallet(prev => prev || parsed.wallets[0].id);
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to restore cached data', e);
                    }
                }
                console.log('Data is fresh, restored from cache (loaded', Math.round(timeSinceLoad / 1000), 'seconds ago)');
                setLoading(false);
                return;
            }
        }

        try {
            const [profileData, initialCats, walletsData, txns] = await Promise.all([
                api.getProfile(),
                api.getCategories(),
                api.getWallets(),
                api.getTransactions()
            ]);

            setProfile(profileData);

            let cats = initialCats;
            if (cats.length === 0) {
                await api.createDefaultCategories(user!.id);
                cats = await api.getCategories();
            }
            setCategories(cats);

            setWallets(walletsData);
            if (walletsData.length > 0) setSelectedWallet(walletsData[0].id);

            // Sort by date descending
            txns.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(txns);

            // Mark data as freshly loaded AND cache the actual data
            sessionStorage.setItem('koprly_data_last_loaded', now.toString());
            sessionStorage.setItem('koprly_data_user_id', user.id);
            try {
                sessionStorage.setItem('koprly_cached_data', JSON.stringify({
                    userId: user.id,
                    profile: profileData,
                    categories: cats,
                    wallets: walletsData,
                    transactions: txns,
                }));
            } catch (e) {
                // sessionStorage might be full; non-critical
                console.warn('Failed to cache data in sessionStorage', e);
            }

        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Welcome animation for first visit after onboarding
    useEffect(() => {
        if (profile?.onboarding_complete && !loading) {
            const hasSeenWelcome = localStorage.getItem('koprly_welcome_seen');
            if (!hasSeenWelcome) {
                setShowWelcome(true);
                localStorage.setItem('koprly_welcome_seen', 'true');
                // Fire confetti
                confetti({
                    particleCount: 200,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#34C759', '#32ADE6', '#FFCC00', '#FF9500'],
                    disableForReducedMotion: true,
                });
                // Auto-dismiss after 4 seconds
                const timer = setTimeout(() => setShowWelcome(false), 4000);
                return () => clearTimeout(timer);
            }
        }
    }, [profile?.onboarding_complete, loading]);

    // Koprlyst Guide for users who completed onboarding
    useEffect(() => {
        if (profile?.onboarding_complete && !profile?.onboarding_koprlyst_done && !loading) {
            // Small delay to let welcome animation finish
            const timer = setTimeout(() => setShowKoprlyst(true), 5000);
            return () => clearTimeout(timer);
        }
    }, [profile?.onboarding_complete, profile?.onboarding_koprlyst_done, loading]);

    // Simplified: Removed visibility change listener to prevent disruptive reloads.
    // Data will only reload on explicit navigation or user action.

    const handleNavigate = useCallback((view: 'home' | 'report' | 'settings' | 'budget' | 'category' | 'history' | 'notifications') => {
        setCurrentView(view);

        // Only refresh if data is stale when returning to home
        if (view === 'home') {
            const lastLoadTime = sessionStorage.getItem('koprly_data_last_loaded');
            const lastUserId = sessionStorage.getItem('koprly_data_user_id');
            if (lastLoadTime && lastUserId === user?.id) {
                const timeSinceLoad = Date.now() - parseInt(lastLoadTime, 10);
                const TWO_MINUTES = 2 * 60 * 1000;
                if (timeSinceLoad < TWO_MINUTES) {
                    console.log('Navigating to home, data still fresh, skipping reload');
                    return; // Skip reload
                }
            }
            console.log('Navigating to home, data is stale, reloading...');
            loadData();
        }
    }, [loadData]);

    // Handle notification deep linking
    // Handle notification deep linking
    const handleNotificationClick = (notification: Notification) => {
        const deepLink = notification.metadata.deep_link;
        if (deepLink) {
            if (deepLink.startsWith('/budget')) {
                handleNavigate('budget');
            } else if (deepLink.startsWith('/report')) {
                handleNavigate('report');
            } else {
                handleNavigate('home');
            }
        }
    };

    const openWalletModal = useCallback((walletIndex?: number) => {
        // Initialize with existing wallets
        if (wallets.length > 0) {
            setEditingWallets(wallets.map(w => ({
                id: w.id,
                name: w.name,
                balance: String(w.balance),
                type: w.type || 'card',
                color: w.color || '#007AFF'
            })));
        } else {
            // Add one empty wallet by default
            setEditingWallets([{ name: 'My Wallet', balance: '', type: 'card', color: '#007AFF' }]);
        }
        setActiveModalWalletIndex(walletIndex !== undefined ? walletIndex : 0);
        setShowWalletModal(true);
    }, [wallets]);

    const addNewWallet = useCallback(() => {
        if (editingWallets.length >= MAX_WALLETS) return;
        setEditingWallets(prev => [...prev, {
            color: WALLET_COLORS[prev.length % WALLET_COLORS.length]
        }]);
        setActiveModalWalletIndex(editingWallets.length);
    }, [editingWallets.length]);

    const updateEditingWallet = useCallback((index: number, field: string, value: string) => {
        setEditingWallets(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }, []);

    const removeEditingWallet = useCallback((index: number) => {
        setEditingWallets(prev => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    const saveWallets = useCallback(async () => {
        setSubmitting(true);
        try {
            // Delete wallets that are no longer in editingWallets
            const existingIds = editingWallets.filter(w => w.id).map(w => w.id);
            const walletsToDelete = wallets.filter(wallet => !existingIds.includes(wallet.id));

            // Check if any wallet to delete has transactions
            for (const wallet of walletsToDelete) {
                const walletTransactions = transactions.filter(t => t.wallet_id === wallet.id);
                if (walletTransactions.length > 0) {
                    alert(`Cannot delete "${wallet.name}" because it has ${walletTransactions.length} transaction(s). Please reassign or delete those transactions first.`);
                    setSubmitting(false);
                    return;
                }
            }

            // Now safe to delete
            for (const wallet of walletsToDelete) {
                await api.deleteWallet(wallet.id);
            }

            // Update or create wallets
            for (const wallet of editingWallets) {
                const walletData = {
                    name: wallet.name,
                    balance: parseFloat(wallet.balance) || 0,
                    type: wallet.type,
                    color: wallet.color,
                    user_id: user!.id
                };

                if (wallet.id) {
                    await api.updateWallet(wallet.id, walletData);
                } else {
                    await api.createWallet(walletData);
                }
            }

            await loadData(true); // Force refresh after wallet update
            setShowWalletModal(false);
        } catch (e: unknown) {
            console.error(e);
            let errorMessage = 'An unexpected error occurred';
            if (e instanceof Error) {
                errorMessage = e.message;
            }

            if (errorMessage.includes('Could not find the table') || errorMessage.includes('relation "public.wallets" does not exist')) {
                alert('Database Setup Required: The "wallets" table is missing. Please run the provided SQL script in your Supabase Dashboard.');
            } else if (errorMessage.includes('foreign key constraint')) {
                alert('Cannot delete this wallet because it has transactions. Please reassign or delete the transactions first.');
            } else {
                alert(`Error saving wallets: ${errorMessage} `);
            }
        } finally {
            setSubmitting(false);
        }
    }, [editingWallets, wallets, transactions, user, loadData]);

    const getEditingTotal = () => {
        return editingWallets.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
    };



    const handleProceedWithExpense = useCallback(async () => {
        const numericAmount = parseIDR(amount);
        setSubmitting(true);
        try {
            await api.addExpense({
                amount: numericAmount,
                description,
                category_id: selectedCategory,
                wallet_id: selectedWallet || undefined,
                user_id: user!.id,
                date: transactionDate
            });

            setAmount('');
            setDescription('');
            setSelectedCategory('');
            setTransactionDate(new Date().toISOString().split('T')[0]);
            setShowAddExpense(false);
            setShowBalanceWarning(false);

            await loadData(true); // Force refresh after adding expense
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : 'Unknown error';
            alert(`Error adding expense: ${msg}`);
        } finally {
            setSubmitting(false);
        }
    }, [amount, selectedCategory, description, selectedWallet, user, transactionDate, loadData]);

    const handleAddExpense = useCallback(async () => {
        const numericAmount = parseIDR(amount);
        if (numericAmount <= 0 || !selectedCategory) return;

        // Check wallet balance
        if (selectedWallet) {
            const wallet = wallets.find(w => w.id === selectedWallet);
            if (wallet && numericAmount > wallet.balance) {
                setShowBalanceWarning(true);
                return;
            }
        }

        await handleProceedWithExpense();
    }, [amount, selectedCategory, selectedWallet, wallets, handleProceedWithExpense]);

    const handleAddIncome = useCallback(async () => {
        const numericAmount = parseIDR(amount);
        if (numericAmount <= 0) return;
        setSubmitting(true);
        try {
            await api.addIncome({
                amount: numericAmount,
                description,
                wallet_id: selectedWallet || undefined, // Sanitize empty string to undefined
                user_id: user!.id,
                date: transactionDate
            });

            setAmount('');
            setDescription('');
            setTransactionDate(new Date().toISOString().split('T')[0]);
            setShowAddIncome(false);

            await loadData(true); // Force refresh after adding income
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : 'Unknown error';
            alert(`Error adding income: ${msg} `);
        } finally {
            setSubmitting(false);
        }
    }, [amount, description, selectedWallet, user, transactionDate, loadData]);




    const refreshData = async () => {
        await loadData(true); // Always force refresh when explicitly called
    };

    const { updateTransaction, deleteTransaction, submitting: transactionSubmitting } = useTransactionManager({
        wallets,
        userId: user?.id,
        onRefresh: refreshData
    });

    const handleEditClick = useCallback((txn: Transaction) => {
        setEditingTransaction(txn);
        setShowEditTransaction(true);
    }, []);

    const handleUpdateSubmit = async (original: Transaction, updates: { amount: number; description: string; date: string; category_id?: string; wallet_id?: string }) => {
        try {
            await updateTransaction(original, updates);
            setShowEditTransaction(false);
            setEditingTransaction(null);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            alert(`Error updating transaction: ${msg}`);
        }
    };

    const handleDeleteSubmit = async (txn: Transaction) => {
        try {
            await deleteTransaction(txn);
            setShowEditTransaction(false);
            setEditingTransaction(null);
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to delete transaction');
        }
    };

    const getCurrentTime = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    // Calculate metrics
    // Live wallet balance (changes with transactions) - THIS is the Total Budget shown to user
    // Calculate metrics
    // Live wallet balance (changes with transactions) - THIS is the Total Budget shown to user
    const liveBalance = useMemo(() => wallets.reduce((acc, wallet) => acc + Number(wallet.balance), 0), [wallets]);

    // Total Expenses from all transactions
    const totalExpenses = useMemo(() => transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount), 0), [transactions]);

    // Total Budget = User defined spending limit
    const totalBudget = profile?.total_budget || 0;
    const currentBalance = liveBalance;

    const recentTxns = useMemo(() => transactions.slice(0, 5), [transactions]);
    const recentExpenses = useMemo(() => recentTxns.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0), [recentTxns]);
    const recentIncome = useMemo(() => recentTxns.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0), [recentTxns]);
    const recentNet = recentIncome - recentExpenses;
    const trendPercentage = useMemo(() => totalBudget > 0 ? ((recentNet / totalBudget) * 100) : 0, [totalBudget, recentNet]);
    const isPositiveTrend = recentNet >= 0;

    const categorySpending = useMemo(() => categories.map(cat => {
        const catExpenses = transactions.filter(t => t.type === 'expense' && t.category_id === cat.id);
        const total = catExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
        return { ...cat, spent: total, count: catExpenses.length };
    }).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent), [categories, transactions]);

    const topCategory = categorySpending[0];

    // Calculate budget utilization
    const budgetUsed = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    // Trigger Budget Notifications
    useBudgetNotifications({ profile, categories });

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="min-h-screen bg-transparent text-text-primary pb-24 relative overflow-hidden">
            {/* Background Ambient Blobs - Liquid Glass Effect */}
            {/* Background Ambient Blobs - Liquid Glass Effect */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Green Orb - Top Left */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-green-400/20 dark:bg-green-600/10 blur-[100px] animate-blob mix-blend-multiply dark:mix-blend-normal" />

                {/* Purple Orb - Top Right */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-normal" />

                {/* Red/Pink Orb - Center Left */}
                <div className="absolute top-[30%] left-[-15%] w-[45%] h-[45%] rounded-full bg-rose-400/20 dark:bg-rose-600/10 blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply dark:mix-blend-normal" />

                {/* Yellow Orb - Center Right */}
                <div className="absolute top-[40%] right-[-5%] w-[40%] h-[40%] rounded-full bg-amber-300/20 dark:bg-amber-500/10 blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-normal" />

                {/* Blue Orb - Bottom */}
                <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] animate-blob animation-delay-4000 mix-blend-multiply dark:mix-blend-normal" />
            </div>

            {/* Content Wrapper - Lifts content above background blobs */}
            <div className="relative z-10 w-full h-full">
                {currentView === 'home' && (
                    <>
                        {/* Welcome Modal - First Visit After Onboarding */}
                        <AnimatePresence>
                            {showWelcome && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                                >
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        transition={{ type: 'spring', duration: 0.5 }}
                                        className="bg-surface border border-border-color rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl"
                                    >
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.4)]"
                                        >
                                            <span className="text-4xl">🎉</span>
                                        </motion.div>
                                        <h2 className="text-2xl font-bold mb-2">Welcome, {profile?.display_name || profile?.username || 'Friend'}!</h2>
                                        <p className="text-gray-400 mb-6">Your financial journey starts now. Let's make every Rupiah count!</p>
                                        <Button onClick={() => setShowWelcome(false)} className="w-full">
                                            Let's Go!
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Koprlyst Interactive Guide */}
                        {showKoprlyst && (
                            <KoprlystGuide
                                onComplete={() => {
                                    setShowKoprlyst(false);
                                    loadData(true); // Force refresh to update profile state
                                }}
                            />
                        )}

                        {/* Header - Profile Section */}
                        <div className="px-6 pt-12 pb-6 flex items-center justify-between">
                            <motion.button
                                onClick={() => handleNavigate('settings')}
                                className="flex items-center gap-4 group"
                            >
                                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-900/20 ring-4 ring-white/5 group-hover:scale-105 transition-transform">
                                    {(profile?.display_name || profile?.username)?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-text-secondary font-medium mb-0.5 uppercase tracking-wider">{getCurrentTime()}</p>
                                    <p className="font-bold text-xl text-text-primary leading-tight">{profile?.display_name || profile?.username || 'User'}</p>
                                </div>
                            </motion.button>
                            <NotificationBell onNotificationClick={handleNotificationClick} />
                        </div>

                        <motion.div
                            className="space-y-6 pb-24"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.1
                                    }
                                }
                            }}
                        >

                            {/* Total Balance Card */}
                            {/* Total Balance Card */}
                            {/* Total Balance Card */}
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                                }}
                                className="px-5"
                            >
                                <div className="relative px-6 py-5 rounded-[32px] overflow-hidden glass-panel bg-white/80 backdrop-blur-xl dark:bg-white/5 dark:backdrop-blur-none border border-white/40 dark:border-white/10 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] dark:shadow-2xl transition-all duration-300 hover:shadow-primary/10">
                                    {/* Background Gradient Mesh - Dynamic based on theme */}
                                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/20 dark:bg-blue-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                                    <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-green-500/20 dark:bg-green-500/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3" />

                                    <div className="relative z-10 flex flex-col gap-1">
                                        {/* Header: Title + Eye */}
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] sm:text-xs text-text-secondary uppercase tracking-wider font-bold">Total Balance</p>
                                            <button
                                                onClick={() => setShowPrivacy(!showPrivacy)}
                                                className="text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                                                aria-label={showPrivacy ? "Hide balance" : "Show balance"}
                                            >
                                                {showPrivacy ? <Eye size={14} /> : <EyeOff size={14} />}
                                            </button>
                                        </div>

                                        {/* Main Balance + Sparkline */}
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-3xl font-bold font-numeric tracking-tight text-text-primary mb-1">
                                                {showPrivacy
                                                    ? formatMoney(currentBalance, currency)
                                                    : `${currencySymbol} ••••••••`}
                                            </h2>
                                            {/* Mini Sparkline */}
                                            <div className="ml-auto opacity-100 pb-1 text-emerald-600 dark:text-[#00FF88]">
                                                <MiniSparkline
                                                    data={sparklineData}
                                                    width={80}
                                                    height={30}
                                                    color="currentColor"
                                                    strokeWidth={2.5}
                                                />
                                            </div>
                                        </div>

                                        {/* Trend Pill - Strictly Left Aligned */}
                                        <div className="flex items-start">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel">
                                                {isPositiveTrend ? <TrendingUp size={12} className="text-green-600 dark:text-[#00FF88]" /> : <TrendingDown size={12} className="text-red-500" />}
                                                <span className={`text-xs font-medium ${isPositiveTrend ? 'text-green-700 dark:text-[#00FF88]' : 'text-red-500'}`}>
                                                    {formatMoney(Math.abs(recentNet), currency)}
                                                    <span className="opacity-70 font-normal ml-1">({Math.abs(trendPercentage).toFixed(1)}%)</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Wallets Section */}
                            {/* Wallets Section */}
                            <motion.div
                                className="mt-8"
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                                }}
                            >
                                <div className="px-5 mb-4">
                                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">MY WALLETS</h3>
                                </div>

                                {/* Scroll Container Wrapper with Fade Effect */}
                                <div className="relative group">
                                    <div className="flex gap-4 overflow-x-auto px-0 pb-4 scrollbar-hide snap-x relative z-10 w-full [mask-image:linear-gradient(to_right,black_85%,transparent_100%)]">
                                        <div className="min-w-[1.25rem] snap-start shrink-0" />
                                        {wallets.map((wallet) => {
                                            // Determine gradient based on wallet name/type
                                            const isBCA = wallet.name.toLowerCase().includes('bca');
                                            const isJago = wallet.name.toLowerCase().includes('jago');

                                            let gradientClass = "bg-gradient-to-br from-[#1E293B] to-[#0F172A] dark:from-gray-800 dark:to-gray-900"; // Default
                                            if (isBCA) gradientClass = "bg-gradient-to-br from-blue-600 to-blue-900";
                                            else if (isJago) gradientClass = "bg-gradient-to-br from-emerald-500 to-emerald-800";
                                            // For now, let's Stick to rich gradients for these specific cards.

                                            return (
                                                <motion.div
                                                    key={wallet.id}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => {
                                                        const walletIndex = wallets.findIndex(w => w.id === wallet.id);
                                                        setSelectedWallet(wallet.id);
                                                        openWalletModal(walletIndex);
                                                    }}
                                                    className={`min-w-[180px] p-5 rounded-[20px] ${!wallet.color ? (isBCA || isJago ? gradientClass : 'bg-gradient-to-br from-[#F8F9FB] to-[#E2E8F0] dark:from-gray-800 dark:to-gray-900') : ''} border ${!wallet.color ? 'border-primary/10 dark:border-white/10' : 'border-white/10'} snap-start flex flex-col justify-between h-[120px] relative overflow-hidden group shadow-xl dark:shadow-2xl transition-all duration-300 hover:shadow-primary/20`}
                                                    style={{ backgroundColor: wallet.color || undefined }}
                                                >
                                                    {/* Glass Overlay & Shine Effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-60 pointer-events-none" />
                                                    <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-pulse duration-[3000ms] pointer-events-none" />

                                                    {/* Large Dynamic Watermark Icon */}
                                                    <div className="absolute -right-4 -bottom-4 opacity-15 rotate-[15deg] pointer-events-none text-white transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[20deg]">
                                                        {(() => {
                                                            const IconComponent = WALLET_ICONS.find(i => i.type === wallet.type)?.Icon || CreditCard;
                                                            return <IconComponent size={100} strokeWidth={1.5} />;
                                                        })()}
                                                    </div>

                                                    {/* Content Layer */}
                                                    <div className="relative z-10 flex flex-col h-full justify-between">
                                                        <div className="space-y-0">
                                                            <h4 className={`text-sm font-bold tracking-wide truncate uppercase opacity-90 ${!wallet.color && !isBCA && !isJago ? 'text-[#1A1A1A] dark:text-white' : 'text-white'}`}>{wallet.name}</h4>
                                                            <p className={`text-lg font-black tracking-tight leading-tight font-numeric ${!wallet.color && !isBCA && !isJago ? 'text-[#1A1A1A] dark:text-white' : 'text-white'}`}>
                                                                {showPrivacy ? formatMoney(wallet.balance, currency) : '••••'}
                                                            </p>
                                                        </div>

                                                        {/* Usage Progress Section */}
                                                        <div>
                                                            {(() => {
                                                                // Calculate usage based on (Expenses / (Balance + Expenses))
                                                                const walletExpenses = transactions
                                                                    .filter(t => t.wallet_id === wallet.id && t.type === 'expense')
                                                                    .reduce((sum, t) => sum + Number(t.amount), 0);

                                                                const totalFunds = Number(wallet.balance) + walletExpenses;
                                                                const percentage = totalFunds > 0 ? Math.min((walletExpenses / totalFunds) * 100, 100) : 0;

                                                                return (
                                                                    <div className="">
                                                                        <div className="h-1 bg-black/20 rounded-full overflow-hidden w-full border border-white/5 backdrop-blur-sm">
                                                                            <motion.div
                                                                                initial={{ width: 0 }}
                                                                                animate={{ width: `${percentage}%` }}
                                                                                transition={{ duration: 1, ease: "easeOut" }}
                                                                                className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)] relative"
                                                                            >
                                                                                {/* Progress Glow */}
                                                                                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white blur-[2px]" />
                                                                            </motion.div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => openWalletModal()}
                                            className="min-w-[60px] rounded-[24px] bg-surface border border-border-color flex items-center justify-center snap-start hover:bg-surface/80 transition-colors"
                                            aria-label="Add new wallet"
                                        >
                                            <Plus size={24} className="text-text-secondary" />
                                        </motion.button>
                                        <div className="min-w-[1.25rem] snap-start shrink-0" />
                                    </div>
                                    {/* Scroll shadow removed - handled by mask-image */}
                                </div>
                            </motion.div>

                            {/* Action Buttons */}
                            {/* Action Buttons */}
                            <motion.div
                                className="px-5 flex gap-4 mt-2"
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                                }}
                            >
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setShowAddIncome(false);
                                        setShowEditTransaction(false);
                                        setShowAddExpense(!showAddExpense);
                                    }}
                                    className="flex-1 h-16 rounded-[20px] glass-panel border border-white/40 dark:border-white/10 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-green-500/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3 z-10">
                                        <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
                                            <Plus size={20} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-[10px] text-green-500 font-extrabold uppercase tracking-widest">ADD</span>
                                            <span className="text-sm font-bold text-text-primary">Expense</span>
                                        </div>
                                    </div>
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setShowAddExpense(false);
                                        setShowEditTransaction(false);
                                        setShowAddIncome(!showAddIncome);
                                    }}
                                    className="flex-1 h-16 rounded-[20px] glass-panel border border-white/40 dark:border-white/10 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-blue-500/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3 z-10">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <Plus size={20} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-[10px] text-blue-500 font-extrabold uppercase tracking-widest">ADD</span>
                                            <span className="text-sm font-bold text-text-primary">Income</span>
                                        </div>
                                    </div>
                                </motion.button>
                            </motion.div>

                            {/* Add Expense Form */}
                            <AnimatePresence>
                                {showAddExpense && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="relative z-20 px-5"
                                    >
                                        <div className="p-6 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color space-y-4 shadow-xl">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-text-primary">Expense</h3>
                                                <button
                                                    onClick={() => setShowAddExpense(false)}
                                                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                                    aria-label="Close expense form"
                                                >
                                                    <X size={20} className="text-text-secondary" />
                                                </button>
                                            </div>
                                            <Input
                                                label="Amount"
                                                type="text"
                                                inputMode="numeric"
                                                value={amount}
                                                onChange={(e) => setAmount(formatIDR(e.target.value))}
                                            />
                                            <Input
                                                label="Description"
                                                type="text"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                            />
                                            <div className="relative">
                                                <DatePicker
                                                    label="Date"
                                                    value={transactionDate}
                                                    onChange={setTransactionDate}
                                                />
                                            </div>

                                            <WalletSelector
                                                wallets={wallets}
                                                selectedWalletId={selectedWallet}
                                                onSelect={setSelectedWallet}
                                                label="Pay from"
                                                currencySymbol={currencySymbol}
                                            />

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs text-gray-400">Category</label>
                                                    <button
                                                        onClick={() => setShowAddCategoryModal(true)}
                                                        className="text-xs font-bold text-primary hover:text-primary-highlight transition-colors flex items-center gap-1"
                                                    >
                                                        <Plus size={12} />
                                                        New
                                                    </button>
                                                </div>
                                                <CategorySelector
                                                    categories={categories}
                                                    selectedCategoryId={selectedCategory}
                                                    onSelect={setSelectedCategory}
                                                />
                                            </div>

                                            <Button
                                                className="w-full"
                                                isLoading={submitting}
                                                onClick={handleAddExpense}
                                                disabled={!amount || !selectedCategory}
                                            >
                                                Add Expense
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Add Income Form */}
                            <AnimatePresence>
                                {showAddIncome && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="relative z-20 px-5"
                                    >
                                        <div className="p-6 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color space-y-4 shadow-xl">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-text-primary">Income</h3>
                                                <button
                                                    onClick={() => setShowAddIncome(false)}
                                                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                                >
                                                    <X size={20} className="text-text-secondary" />
                                                </button>
                                            </div>
                                            <Input
                                                label="Amount"
                                                type="text"
                                                inputMode="numeric"
                                                value={amount}
                                                onChange={(e) => setAmount(formatIDR(e.target.value))}
                                            />
                                            <Input
                                                label="Description"
                                                type="text"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="e.g., Salary, Freelance work"
                                            />
                                            <div className="relative">
                                                <DatePicker
                                                    label="Date"
                                                    value={transactionDate}
                                                    onChange={setTransactionDate}
                                                />
                                            </div>

                                            <WalletSelector
                                                wallets={wallets}
                                                selectedWalletId={selectedWallet}
                                                onSelect={setSelectedWallet}
                                                label="Deposit to"
                                                currencySymbol={currencySymbol}
                                            />

                                            <Button
                                                className="w-full"
                                                isLoading={submitting}
                                                onClick={handleAddIncome}
                                                disabled={!amount}
                                            >
                                                Add Income
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Add Category Modal (from Expense Form) */}
                            <AddCategoryModal
                                isOpen={showAddCategoryModal}
                                onClose={() => setShowAddCategoryModal(false)}
                                onSuccess={async () => {
                                    await loadData(true);
                                }}
                                user_id={user?.id || ''}
                                currencySymbol={currencySymbol}
                                originalBudget={profile?.total_budget}
                                totalCategoryBudgets={categories.reduce((acc, c) => acc + (c.monthly_budget || 0), 0)}
                                showAllocationMessage={true}
                                transactions={transactions}
                            />

                            {/* Edit Transaction Modal */}
                            {/* Edit Transaction Modal */}
                            <EditTransactionModal
                                isOpen={showEditTransaction}
                                onClose={() => setShowEditTransaction(false)}
                                transaction={editingTransaction}
                                categories={categories}
                                wallets={wallets}
                                currencySymbol={currencySymbol}
                                onUpdate={handleUpdateSubmit}
                                onDelete={handleDeleteSubmit}
                                isLoading={transactionSubmitting}
                            />

                            {/* Budget & Top Spend */}
                            <motion.div
                                className="px-5 mt-8 grid grid-cols-2 gap-4"
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                                }}
                            >
                                {/* Budget Card */}
                                <motion.button
                                    onClick={() => handleNavigate('budget')}
                                    whileTap={{ scale: 0.98 }}
                                    className="p-5 rounded-[20px] glass-card flex flex-col justify-between h-[180px] relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex justify-between items-start w-full relative z-10">
                                        <p className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest">BUDGET</p>
                                        <Wallet size={16} className="text-text-secondary" />
                                    </div>

                                    <div className="mt-2 relative z-10">
                                        <p className="text-4xl font-numeric text-text-primary leading-none">
                                            {showPrivacy ? `${budgetUsed.toFixed(0)}%` : '••%'}
                                        </p>
                                        <p className="text-xs text-text-secondary mt-1">Used</p>
                                    </div>

                                    <div className="w-full mt-auto relative z-10">
                                        <div className="flex flex-col gap-0.5 mb-2">
                                            <span className="text-sm font-bold text-text-primary font-numeric leading-tight">
                                                {showPrivacy ? formatMoney(totalExpenses, currency) : '•••'}
                                            </span>
                                            <span className="text-xs text-text-secondary font-numeric opacity-70">
                                                {showPrivacy ? formatMoney(totalBudget, currency) : '•••'}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </motion.button>

                                {/* Top Spend Card */}
                                <div
                                    onClick={() => handleNavigate('category')}
                                    className="p-5 rounded-[20px] glass-card flex flex-col justify-between h-[180px] relative overflow-hidden cursor-pointer group"
                                >
                                    <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex justify-between items-start w-full relative z-10">
                                        <p className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest">TOP SPEND</p>
                                        <Flame size={16} className="text-orange-500" />
                                    </div>

                                    <div className="mt-2 flex-1 flex flex-col justify-center relative z-10">
                                        {topCategory ? (
                                            <>
                                                <p className="text-2xl font-bold text-text-primary leading-tight mb-2 line-clamp-2">{topCategory.name}</p>
                                                <div className="flex -space-x-2">
                                                    <div className="w-8 h-8 rounded-full bg-surface border border-border-color flex items-center justify-center text-sm shadow-sm overflow-hidden">
                                                        <CategoryIcon
                                                            iconName={topCategory.icon}
                                                            variant="default"
                                                            categoryColor={topCategory.color}
                                                            className="w-4 h-4"
                                                        />
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-surface border border-border-color flex items-center justify-center text-[10px] font-bold text-text-secondary shadow-sm">
                                                        +{topCategory.count}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-text-secondary mt-2 font-medium">{topCategory.count} transactions</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-text-secondary">No data</p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Spending Categories */}
                            {/* Spending Categories */}
                            <motion.div
                                className="px-5 mt-8"
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                                }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">SPENDING CATEGORIES</h3>
                                    <button
                                        onClick={() => handleNavigate('category')}
                                        className="text-xs text-blue-500 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                                    >
                                        View All
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {categorySpending.slice(0, 3).map((cat, idx) => (
                                        <motion.div
                                            key={cat.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * idx }}
                                            className="p-4 rounded-[20px] glass-card flex items-center gap-4 hover:bg-surface/80 transition-colors"
                                        >
                                            <CategoryIcon
                                                iconName={cat.icon || 'shopping-cart'}
                                                variant="large"
                                                categoryColor={cat.color}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="font-bold text-text-primary truncate">{cat.name}</p>
                                                    <p className="text-sm font-numeric text-text-primary">{formatMoney(cat.spent, currency)}</p>
                                                </div>
                                                <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full shadow-[0_0_8px_currentColor]"
                                                        style={{
                                                            width: `${Math.min((cat.spent / totalExpenses) * 100, 100)}%`,
                                                            backgroundColor: cat.color || '#3B82F6',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Recent Activity */}
                            {/* Recent Activity */}
                            <motion.div
                                className="px-5 mt-8"
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                                }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">RECENT ACTIVITY</h3>
                                    <button
                                        onClick={() => handleNavigate('history')}
                                        className="text-xs text-blue-500 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                                    >
                                        History
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {transactions.slice(0, 5).map((txn) => (
                                        <div
                                            key={txn.id}
                                            onClick={() => handleEditClick(txn)}
                                            className="p-4 rounded-[20px] glass-card flex items-center justify-between cursor-pointer hover:bg-surface/80 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <CategoryIcon
                                                    iconName={txn.category?.icon || (txn.type === 'income' ? 'banknote' : 'help-circle')}
                                                    variant="default"
                                                    categoryColor={txn.type === 'income' ? '#22C55E' : txn.category?.color}
                                                />
                                                <div>
                                                    <p className="font-bold text-text-primary text-sm">{txn.description}</p>
                                                    <p className="text-xs text-text-secondary font-medium font-sans">{formatDate(txn.date, dateFormat)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-numeric text-sm ${txn.type === 'income' ? 'text-green-500' : 'text-text-primary'}`}>
                                                    {txn.type === 'income' ? '+' : '-'}{formatMoney(txn.amount, currency)}
                                                </p>
                                                <ChevronRight size={14} className="ml-auto text-text-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Wallet Management Modal */}
                        <AnimatePresence>
                            {showWalletModal && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/10 dark:bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                                    onClick={() => setShowWalletModal(false)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.9, y: 20 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-md rounded-[28px] bg-white/90 backdrop-blur-2xl dark:bg-[#121820] overflow-hidden shadow-2xl border border-black/10 dark:border-white/5"
                                    >
                                        {/* Header with Total Balance */}
                                        <div className="p-8 pb-4 text-center">
                                            <h3 className="text-2xl font-black text-black dark:text-white mb-1">Manage Wallets</h3>
                                            <p className="text-[10px] font-black text-text-secondary/30 dark:text-text-secondary/50 uppercase tracking-[0.4em] mb-12">Max 4 wallets</p>

                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-text-secondary/40 dark:text-text-secondary/60 uppercase tracking-[0.2em]">Total Balance</p>
                                                <p className="text-[40px] font-black text-black dark:text-white tracking-tight font-numeric leading-none">{formatMoney(getEditingTotal(), currency)}</p>
                                            </div>
                                        </div>

                                        {/* Wallet Revolving Carousel */}
                                        <div className="relative py-12 px-4 h-[380px] flex items-center justify-center perspective-1000">
                                            <div className="relative w-full max-w-[320px] h-full flex items-center justify-center">
                                                <AnimatePresence mode="popLayout">
                                                    {editingWallets.map((wallet, idx) => {
                                                        const offset = idx - activeModalWalletIndex;
                                                        const isVisible = Math.abs(offset) <= 2;

                                                        if (!isVisible) return null;

                                                        return (
                                                            <motion.div
                                                                key={idx}
                                                                initial={{ opacity: 0, scale: 0.8, x: offset * 100 }}
                                                                animate={{
                                                                    opacity: 1 - Math.abs(offset) * 0.3,
                                                                    scale: 1 - Math.abs(offset) * 0.1,
                                                                    x: offset * 40,
                                                                    y: Math.abs(offset) * 15,
                                                                    zIndex: 10 - Math.abs(offset),
                                                                    rotate: offset * 2,
                                                                }}
                                                                exit={{ opacity: 0, scale: 0.8, x: offset * 100 }}
                                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                drag="x"
                                                                dragConstraints={{ left: 0, right: 0 }}
                                                                onDragEnd={(_, info) => {
                                                                    if (info.offset.x < -50 && activeModalWalletIndex < editingWallets.length - 1) {
                                                                        setActiveModalWalletIndex(prev => prev + 1);
                                                                    } else if (info.offset.x > 50 && activeModalWalletIndex > 0) {
                                                                        setActiveModalWalletIndex(prev => prev - 1);
                                                                    }
                                                                }}
                                                                className="absolute w-full aspect-[4/3] rounded-[32px] p-6 shadow-2xl cursor-grab active:cursor-grabbing overflow-hidden"
                                                                style={{
                                                                    backgroundColor: wallet.color || '#007AFF',
                                                                    pointerEvents: idx === activeModalWalletIndex ? 'auto' : 'none'
                                                                }}
                                                            >
                                                                {/* Glass Overlay */}
                                                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-60 pointer-events-none" />

                                                                {/* Delete Button */}
                                                                {editingWallets.length > 1 && idx === activeModalWalletIndex && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setWalletToDelete(activeModalWalletIndex);
                                                                            setShowDeleteWalletConfirm(true);
                                                                        }}
                                                                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-error/20 backdrop-blur-md flex items-center justify-center text-error hover:bg-error/30 transition-all z-20"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                )}

                                                                <div className="relative z-10 h-full flex flex-col justify-between">
                                                                    <div className="flex items-center gap-4 pr-12">
                                                                        <div className="relative">
                                                                            <button
                                                                                onClick={() => setActiveIconPickerIndex(activeIconPickerIndex === idx ? null : idx)}
                                                                                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white relative group"
                                                                            >
                                                                                {(() => {
                                                                                    const IconComponent = WALLET_ICONS.find(i => i.type === wallet.type)?.Icon || CreditCard;
                                                                                    return <IconComponent size={32} />;
                                                                                })()}
                                                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg text-primary">
                                                                                    <Pencil size={12} />
                                                                                </div>
                                                                            </button>

                                                                            <AnimatePresence>
                                                                                {activeIconPickerIndex === idx && (
                                                                                    <motion.div
                                                                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                                        className="absolute top-full left-0 mt-4 p-4 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl border border-white/20 rounded-[24px] grid grid-cols-3 gap-2 z-[100] shadow-2xl min-w-[200px]"
                                                                                    >
                                                                                        {WALLET_ICONS.map(({ type, Icon }) => (
                                                                                            <button
                                                                                                key={type}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    updateEditingWallet(idx, 'type', type);
                                                                                                    setActiveIconPickerIndex(null);
                                                                                                }}
                                                                                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${wallet.type === type ? 'bg-primary text-white scale-110' : 'bg-surface-highlight text-text-secondary hover:bg-primary/20 hover:text-primary'}`}
                                                                                            >
                                                                                                <Icon size={24} />
                                                                                            </button>
                                                                                        ))}
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>

                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                                <input
                                                                                    type="text"
                                                                                    value={wallet.name}
                                                                                    onChange={(e) => updateEditingWallet(idx, 'name', e.target.value)}
                                                                                    className="w-full bg-transparent border-none p-0 text-xl font-black text-white placeholder:text-white/40 focus:ring-0"
                                                                                    placeholder="Wallet Name"
                                                                                />
                                                                                <Pencil size={14} className="text-white/60 flex-shrink-0" />
                                                                            </div>
                                                                            {idx === 0 && (
                                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                                                                                    <p className="text-[10px] font-black text-white uppercase tracking-[0.15em] opacity-80">Primary Wallet</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-white/20 backdrop-blur-md rounded-[24px] px-6 py-5 border border-white/20">
                                                                        <div className="flex items-baseline gap-3">
                                                                            <span className="text-sm font-black text-white uppercase opacity-70 tracking-tighter">{currencySymbol}</span>
                                                                            <input
                                                                                type="text"
                                                                                inputMode="numeric"
                                                                                value={formatIDR(wallet.balance)}
                                                                                onChange={(e) => updateEditingWallet(idx, 'balance', parseIDR(e.target.value).toString())}
                                                                                className="w-full bg-transparent border-none p-0 text-[32px] font-black text-white placeholder:text-white/30 focus:ring-0 font-numeric leading-none"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex gap-3 justify-between items-center pt-2">
                                                                        <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-80">Card Color</p>
                                                                        <div className="flex gap-2">
                                                                            {WALLET_COLORS.map((color) => (
                                                                                <button
                                                                                    key={color}
                                                                                    onClick={() => updateEditingWallet(idx, 'color', color)}
                                                                                    className={`w-6 h-6 rounded-full border-2 transition-all ${wallet.color === color ? 'border-white scale-125 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                                                    style={{ backgroundColor: color }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Navigation Dots & Hints */}
                                        <div className="mt-12 text-center space-y-4">
                                            <div className="flex justify-center gap-2">
                                                {editingWallets.map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 transition-all duration-300 rounded-full ${i === activeModalWalletIndex ? 'w-10 bg-[#00D09E]' : 'w-1.5 bg-border-color'}`}
                                                    />
                                                ))}
                                            </div>

                                            {editingWallets.length > 1 && (
                                                <div className="flex items-center justify-center gap-6 text-[10px] font-black text-text-secondary/40 dark:text-text-secondary/50 uppercase tracking-[0.3em]">
                                                    <ArrowLeft size={16} strokeWidth={2.5} className="opacity-40" />
                                                    <span>Swipe to Switch</span>
                                                    <ChevronRight size={18} strokeWidth={2.5} className="opacity-40" />
                                                </div>
                                            )}

                                            {/* Dedicated Add Wallet CTA */}
                                            {editingWallets.length < 4 && (
                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={addNewWallet}
                                                    className="w-[200px] h-[60px] mx-auto rounded-[24px] border-2 border-dashed border-border-color flex items-center justify-center gap-3 text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-surface-highlight group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                                        <Plus size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold uppercase tracking-widest">Add Wallet</span>
                                                </motion.button>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="p-6 border-t border-black/10 dark:border-white/5 flex gap-4">
                                            <Button
                                                variant="secondary"
                                                className="flex-1 bg-black/5 dark:bg-white/5 border-none text-emerald-600 dark:text-emerald-400 hover:bg-black/10 dark:hover:bg-white/10"
                                                onClick={() => setShowWalletModal(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 border-none shadow-lg shadow-emerald-500/20"
                                                onClick={saveWallets}
                                                isLoading={submitting}
                                            >
                                                Save Wallets
                                            </Button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Delete Wallet Confirmation Modal */}
                        <AnimatePresence>
                            {showDeleteWalletConfirm && walletToDelete !== null && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                                    onClick={() => setShowDeleteWalletConfirm(false)}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-md bg-surface border border-border-color rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
                                    >
                                        {/* Background Decor */}
                                        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-error/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                        <div className="relative z-10">
                                            {/* Icon */}
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-error/10 text-error">
                                                <Trash2 size={24} />
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-xl font-bold text-text-primary mb-2">
                                                Remove Wallet?
                                            </h3>

                                            {/* Message */}
                                            <div className="text-text-secondary text-sm leading-relaxed mb-6 space-y-3">
                                                <p>
                                                    Are you sure you want to remove <span className="font-bold text-text-primary">"{editingWallets[walletToDelete]?.name || 'this wallet'}"</span>?
                                                </p>

                                                {(() => {
                                                    const walletId = editingWallets[walletToDelete]?.id;
                                                    if (!walletId) {
                                                        return (
                                                            <p className="text-xs">This wallet hasn't been saved yet, so it's safe to remove.</p>
                                                        );
                                                    }

                                                    const walletTransactions = transactions.filter(t => t.wallet_id === walletId);
                                                    const hasTransactions = walletTransactions.length > 0;

                                                    if (hasTransactions) {
                                                        const totalAmount = walletTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
                                                        return (
                                                            <div className="p-4 rounded-xl bg-surface-highlight border border-border-color">
                                                                <p className="font-semibold text-text-primary mb-1">Warning: Cannot Delete</p>
                                                                <ul className="list-disc list-inside space-y-1 text-xs">
                                                                    <li><span className="font-bold">{walletTransactions.length}</span> transactions are linked to this wallet</li>
                                                                    <li>Total value: <span className="font-bold">{formatMoney(totalAmount, currency)}</span></li>
                                                                </ul>
                                                                <p className="mt-2 text-error text-xs font-medium">
                                                                    Please reassign or delete these transactions first.
                                                                </p>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <p className="text-xs">This wallet has no transactions, so it's safe to remove.</p>
                                                    );
                                                })()}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setShowDeleteWalletConfirm(false)}
                                                    className="flex-1"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        const walletId = editingWallets[walletToDelete]?.id;
                                                        if (walletId) {
                                                            const walletTransactions = transactions.filter(t => t.wallet_id === walletId);
                                                            if (walletTransactions.length > 0) {
                                                                setShowDeleteWalletConfirm(false);
                                                                return;
                                                            }
                                                        }

                                                        const currentIdx = walletToDelete;
                                                        if (currentIdx > 0) setActiveModalWalletIndex(currentIdx - 1);
                                                        removeEditingWallet(currentIdx);
                                                        setShowDeleteWalletConfirm(false);
                                                        setWalletToDelete(null);
                                                    }}
                                                    className="flex-1 !bg-error hover:!bg-error/90 !text-white !border-none shadow-lg shadow-error/30"
                                                    disabled={(() => {
                                                        const walletId = editingWallets[walletToDelete]?.id;
                                                        if (!walletId) return false;
                                                        const walletTransactions = transactions.filter(t => t.wallet_id === walletId);
                                                        return walletTransactions.length > 0;
                                                    })()}
                                                >
                                                    Remove Wallet
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}


                {
                    currentView === 'settings' && (
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
                            <SettingsPage
                                onBack={() => {
                                    handleNavigate('home');
                                }}
                                onNavigateToNotifications={() => handleNavigate('notifications')}
                            />
                        </Suspense>
                    )
                }

                {
                    currentView === 'notifications' && (
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
                            <NotificationSettings onBack={() => handleNavigate('settings')} />
                        </Suspense>
                    )
                }

                {
                    currentView === 'report' && (
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
                            <FinancialReport onBack={() => handleNavigate('home')} onNavigate={handleNavigate} />
                        </Suspense>
                    )
                }

                {
                    currentView === 'budget' && (
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
                            <BudgetPage onBack={() => {
                                handleNavigate('home');
                            }} />
                        </Suspense>
                    )
                }

                {
                    currentView === 'category' && (
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
                            <SpendingCategoryPage onBack={() => handleNavigate('home')} />
                        </Suspense>
                    )
                }

                {
                    currentView === 'history' && (
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
                            <HistoryPage onBack={() => handleNavigate('home')} />
                        </Suspense>
                    )
                }

                {/* Persistent Bottom Menu - Using Portal to escape parent transforms */}
                {/* Persistent Bottom Menu */}
                <AnimatePresence>
                    {isBottomMenuVisible && (
                        <BottomMenu
                            currentView={currentView}
                            onNavigate={handleNavigate}
                            isCollapsed={showAddExpense || showAddIncome}
                            onToggleCollapse={() => {
                                setShowAddExpense(false);
                                setShowAddIncome(false);
                            }}
                        />
                    )}
                </AnimatePresence>

                <BalanceWarningModal
                    isOpen={showBalanceWarning}
                    onClose={() => setShowBalanceWarning(false)}
                    onConfirm={handleProceedWithExpense}
                    walletName={wallets.find(w => w.id === selectedWallet)?.name || 'Selected Wallet'}
                    currentBalance={wallets.find(w => w.id === selectedWallet)?.balance || 0}
                    expenseAmount={parseIDR(amount)}
                    currency={currency}
                    isSubmitting={submitting}
                />
            </div >
        </div >
    );
}
