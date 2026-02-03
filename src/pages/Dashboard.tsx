import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { Wallet, Plus, Loader2, TrendingUp, TrendingDown, ChevronRight, X, Eye, EyeOff, CreditCard, Flame, Pencil } from 'lucide-react';
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
import { MAX_WALLETS, WALLET_ICONS, WALLET_COLORS } from '../lib/constants';
import NotificationBell from '../components/NotificationBell';
import { useTransactionManager } from '../hooks/useTransactionManager';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';
import { KoprlystGuide } from '../components/guide/KoprlystGuide';
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
    const [editingWallets, setEditingWallets] = useState<{
        id?: string;
        name: string;
        balance: string;
        type: string;
        color: string;
    }[]>([]);

    // Edit Transaction State
    const [showEditTransaction, setShowEditTransaction] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [activeIconPickerIndex, setActiveIconPickerIndex] = useState<number | null>(null);



    // Manage Bottom Menu visibility for Dashboard (Home) View
    useEffect(() => {
        // Only control visibility from here if we are in 'home' view
        // Other views (budget, settings) will handle their own visibility state
        if (currentView === 'home') {
            const isAnyModalOpen = showWalletModal || showAddExpense || showAddIncome || showEditTransaction;
            setBottomMenuVisible(!isAnyModalOpen);
        }
    }, [currentView, showWalletModal, showAddExpense, showAddIncome, showEditTransaction, setBottomMenuVisible]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentView]);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            // Load profile
            const profileData = await api.getProfile();
            setProfile(profileData);

            // Load categories
            let cats = await api.getCategories();
            if (cats.length === 0) {
                await api.createDefaultCategories(user.id);
                cats = await api.getCategories();
            }
            setCategories(cats);

            // Load Wallets
            const walletsData = await api.getWallets();
            setWallets(walletsData);
            if (walletsData.length > 0) setSelectedWallet(walletsData[0].id);

            // Load transactions
            const txns = await api.getTransactions();
            // Sort by date descending
            txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(txns);

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
                setTimeout(() => setShowWelcome(false), 4000);
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

    const handleNavigate = useCallback((view: 'home' | 'report' | 'settings' | 'budget' | 'category' | 'history' | 'notifications') => {
        setCurrentView(view);
        // Refresh data when returning to home to sync any changes from other pages
        if (view === 'home') {
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

    const openWalletModal = useCallback(() => {
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
        setShowWalletModal(true);
    }, [wallets]);

    const addNewWallet = useCallback(() => {
        if (editingWallets.length >= MAX_WALLETS) return;
        setEditingWallets(prev => [...prev, {
            name: `Wallet ${prev.length + 1} `,
            balance: '',
            type: 'card',
            color: WALLET_COLORS[prev.length % WALLET_COLORS.length]
        }]);
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

            await loadData();
            setShowWalletModal(false);
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes('Could not find the table') || e.message?.includes('relation "public.wallets" does not exist')) {
                alert('Database Setup Required: The "wallets" table is missing. Please run the provided SQL script in your Supabase Dashboard.');
            } else if (e.message?.includes('foreign key constraint')) {
                alert('Cannot delete this wallet because it has transactions. Please reassign or delete the transactions first.');
            } else {
                alert(`Error saving wallets: ${e.message} `);
            }
        } finally {
            setSubmitting(false);
        }
    }, [editingWallets, wallets, transactions, user, loadData]);

    const getEditingTotal = () => {
        return editingWallets.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
    };



    const handleAddExpense = useCallback(async () => {
        const rawAmount = amount.replace(/\./g, '');
        if (!rawAmount || !selectedCategory) return;
        setSubmitting(true);
        try {
            await api.addExpense({
                amount: parseFloat(rawAmount),
                description,
                category_id: selectedCategory,
                wallet_id: selectedWallet || undefined, // Sanitize empty string to undefined
                user_id: user!.id,
                date: transactionDate
            } as any);

            setAmount('');
            setDescription('');
            setSelectedCategory('');
            setTransactionDate(new Date().toISOString().split('T')[0]);
            setShowAddExpense(false);

            await loadData();
        } catch (e: any) {
            console.error(e);
            alert(`Error adding expense: ${e.message || JSON.stringify(e)} `);
        } finally {
            setSubmitting(false);
        }
    }, [amount, selectedCategory, description, selectedWallet, user, transactionDate, loadData]);

    const handleAddIncome = useCallback(async () => {
        const rawAmount = amount.replace(/\./g, '');
        if (!rawAmount) return;
        setSubmitting(true);
        try {
            await api.addIncome({
                amount: parseFloat(rawAmount),
                description,
                wallet_id: selectedWallet || undefined, // Sanitize empty string to undefined
                user_id: user!.id,
                date: transactionDate
            });

            setAmount('');
            setDescription('');
            setTransactionDate(new Date().toISOString().split('T')[0]);
            setShowAddIncome(false);

            await loadData();
        } catch (e: any) {
            console.error(e);
            alert(`Error adding income: ${e.message || JSON.stringify(e)} `);
        } finally {
            setSubmitting(false);
        }
    }, [amount, description, selectedWallet, user, transactionDate, loadData]);




    const refreshData = async () => {
        await loadData();
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

    const handleUpdateSubmit = async (original: Transaction, updates: any) => {
        try {
            await updateTransaction(original, updates);
            setShowEditTransaction(false);
            setEditingTransaction(null);
        } catch (error: any) {
            alert(`Error updating transaction: ${error.message}`);
        }
    };

    const handleDeleteSubmit = async (txn: Transaction) => {
        try {
            await deleteTransaction(txn);
            setShowEditTransaction(false);
            setEditingTransaction(null);
        } catch (error: any) {
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
                                    loadData(); // Reload profile to update state
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
                                    {profile?.username?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || 'G'}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-text-secondary font-medium mb-0.5 uppercase tracking-wider">{getCurrentTime()}</p>
                                    <p className="font-bold text-xl text-text-primary leading-tight">{profile?.username || 'G is my name'}</p>
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

                            {/* Total Budget Card */}
                            {/* Total Budget Card */}
                            {/* Total Budget Card */}
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                                }}
                                className="px-5"
                            >
                                <div className="relative px-6 py-5 rounded-[32px] overflow-hidden glass-panel bg-white/70 backdrop-blur-xl dark:bg-white/5 dark:backdrop-blur-none border border-white/40 dark:border-white/10 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] dark:shadow-2xl transition-all duration-300 hover:shadow-primary/10">
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

                                            let gradientClass = "bg-gradient-to-br from-gray-800 to-gray-900"; // Default Dark
                                            if (isBCA) gradientClass = "bg-gradient-to-br from-blue-600 to-blue-900";
                                            else if (isJago) gradientClass = "bg-gradient-to-br from-emerald-500 to-emerald-800";

                                            // Light mode override classes could be handled better, but strict gradient was requested.
                                            // We'll use the specific gradients as they look good in both modes usually, 
                                            // or we could add dark: prefixes if needed. 
                                            // For now, let's Stick to rich gradients for these specific cards.

                                            return (
                                                <motion.div
                                                    key={wallet.id}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => {
                                                        setSelectedWallet(wallet.id);
                                                        openWalletModal();
                                                    }}
                                                    className={`min-w-[160px] p-5 rounded-[20px] ${!wallet.color ? gradientClass : ''} border border-white/10 snap-start flex flex-col justify-between h-[110px] relative overflow-hidden group shadow-lg`}
                                                    style={{ backgroundColor: wallet.color || undefined }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex items-center gap-2 text-white/90 relative z-10">
                                                        {(() => {
                                                            const IconComponent = WALLET_ICONS.find(i => i.type === wallet.type)?.Icon || CreditCard;
                                                            return <IconComponent size={18} />;
                                                        })()}
                                                        <span className="text-sm font-bold truncate">{wallet.name}</span>
                                                    </div>
                                                    <div className="relative z-10">
                                                        <p className="text-xl font-numeric text-white mb-2">
                                                            {showPrivacy ? formatMoney(wallet.balance, currency) : '••••'}
                                                        </p>
                                                        {/* Usage Bar */}
                                                        {(() => {
                                                            // Calculate usage based on (Current Balance / (Current Balance + Experiments))
                                                            const walletExpenses = transactions
                                                                .filter(t => t.wallet_id === wallet.id && t.type === 'expense')
                                                                .reduce((sum, t) => sum + Number(t.amount), 0);

                                                            const totalFunds = Number(wallet.balance) + walletExpenses;
                                                            const percentage = totalFunds > 0 ? (walletExpenses / totalFunds) * 100 : 0;

                                                            return (
                                                                <div className="h-1 bg-black/20 rounded-full overflow-hidden w-full">
                                                                    <div
                                                                        className="h-full bg-white/40 backdrop-blur-sm rounded-full transition-all duration-500"
                                                                        style={{ width: `${percentage}%` }}
                                                                    />
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={openWalletModal}
                                            className="min-w-[60px] rounded-[24px] bg-surface border border-border-color flex items-center justify-center snap-start hover:bg-surface/80 transition-colors"
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
                                                >
                                                    <X size={20} className="text-text-secondary" />
                                                </button>
                                            </div>
                                            <Input
                                                label="Amount"
                                                type="text"
                                                inputMode="numeric"
                                                value={amount}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setAmount(val ? new Intl.NumberFormat('id-ID').format(parseInt(val)) : '');
                                                }}
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
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setAmount(val ? new Intl.NumberFormat('id-ID').format(parseInt(val)) : '');
                                                }}
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
                                    await loadData();
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
                                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                                    onClick={() => setShowWalletModal(false)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.9, y: 20 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-md rounded-[28px] bg-surface backdrop-blur-xl border border-border-color overflow-hidden shadow-2xl"
                                    >
                                        {/* Header with Total Budget */}
                                        <div className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-b border-border-color">
                                            <h3 className="text-xl font-bold text-center mb-1 text-text-primary">Manage Wallets</h3>
                                            <p className="text-sm font-medium text-text-secondary text-center mb-6">Max 4 wallets</p>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1 opacity-80">Total Budget</p>
                                                <p className="text-4xl font-bold text-text-primary tracking-tight">{formatMoney(getEditingTotal(), currency)}</p>
                                            </div>
                                        </div>

                                        {/* Wallet List */}
                                        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-3">
                                            {editingWallets.map((wallet, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className={`p-4 rounded-2xl border border-border-color shadow-sm relative overflow-visible transition-all duration-300 ${!wallet.color ? 'bg-surface' : 'text-white'}`}
                                                    style={{ backgroundColor: wallet.color || undefined }}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {/* Icon Picker */}
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveIconPickerIndex(activeIconPickerIndex === index ? null : index);
                                                                }}
                                                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-border-color hover:border-primary transition-all relative group ${wallet.color ? 'bg-white/20 text-white border-white/30' : 'bg-surface-highlight text-text-primary'}`}
                                                            >
                                                                {(() => {
                                                                    const IconComponent = WALLET_ICONS.find(i => i.type === wallet.type)?.Icon || CreditCard;
                                                                    return <IconComponent size={24} />;
                                                                })()}
                                                                {/* Edit Indicator Badge */}
                                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface shadow-sm ${wallet.color ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                                                                    <Pencil size={10} />
                                                                </div>
                                                            </button>

                                                            {/* Icon Dropdown */}
                                                            {activeIconPickerIndex === index && (
                                                                <div className="absolute top-full left-0 mt-2 p-3 bg-white/80 dark:bg-[#121212]/95 backdrop-blur-2xl border border-border-color rounded-2xl grid grid-cols-3 gap-2 z-50 shadow-2xl min-w-[180px]">
                                                                    <div className="col-span-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1 mb-2">Select Icon</div>
                                                                    {WALLET_ICONS.map(({ type, Icon, label }) => (
                                                                        <button
                                                                            key={type}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateEditingWallet(index, 'type', type);
                                                                                setActiveIconPickerIndex(null);
                                                                            }}
                                                                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl hover:bg-primary/20 transition-all group/icon ${wallet.type === type ? 'bg-primary/20 ring-2 ring-primary text-primary' : 'bg-surface-highlight text-text-secondary hover:text-primary'} `}
                                                                            title={label}
                                                                        >
                                                                            <Icon size={24} strokeWidth={wallet.type === type ? 2.5 : 2} />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Name & Balance */}
                                                        <div className="flex-1 space-y-3">
                                                            {/* Wallet Name Input */}
                                                            <div className="relative group/input">
                                                                <input
                                                                    type="text"
                                                                    value={wallet.name}
                                                                    onChange={(e) => updateEditingWallet(index, 'name', e.target.value)}
                                                                    placeholder="Wallet Name"
                                                                    className={`w-full bg-transparent border-b pb-1 text-sm font-bold focus:outline-none transition-colors pr-6 ${wallet.color ? 'text-white border-white/50 focus:border-white placeholder:text-white/50' : 'text-text-primary border-border-color focus:border-primary placeholder:text-text-secondary/50'}`}
                                                                />
                                                                <Pencil size={12} className={`absolute right-0 top-1 opacity-50 group-hover/input:opacity-100 transition-opacity pointer-events-none ${wallet.color ? 'text-white' : 'text-text-secondary'}`} />
                                                            </div>

                                                            <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border transition-all ${wallet.color ? 'bg-white/20 border-white/30 focus-within:bg-white/30 focus-within:border-white' : 'bg-surface-highlight/50 border-border-color/50 focus-within:border-primary/50 focus-within:bg-surface-highlight'}`}>
                                                                <span className={`font-medium ${wallet.color ? 'text-white/80' : 'text-text-secondary'}`}>{currencySymbol}</span>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={wallet.balance ? wallet.balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value.replace(/\D/g, '');
                                                                        updateEditingWallet(index, 'balance', val);
                                                                    }}
                                                                    placeholder="0"
                                                                    className={`w-full bg-transparent border-none p-0 text-lg font-bold focus:ring-0 ${wallet.color ? 'text-white placeholder:text-white/30' : 'text-text-primary placeholder:text-text-secondary/30'}`}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Delete Button */}
                                                        {editingWallets.length > 1 && (
                                                            <button
                                                                onClick={() => removeEditingWallet(index)}
                                                                className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-full transition-colors self-center"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Color Picker */}
                                                    <div className="flex gap-2 mt-4 pt-3 border-t border-border-color overflow-x-visible p-1">
                                                        {WALLET_COLORS.map((color) => (
                                                            <button
                                                                key={color}
                                                                onClick={() => updateEditingWallet(index, 'color', color)}
                                                                className={`w-6 h-6 rounded-full transition-all flex-shrink-0 ${wallet.color === color ? 'scale-125 ring-2 ring-white dark:ring-white shadow-lg z-10' : 'hover:scale-110 opacity-70 hover:opacity-100'} `}
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {/* Add Wallet Button */}
                                            {editingWallets.length < 4 && (
                                                <button
                                                    id="add-wallet-button"
                                                    onClick={addNewWallet}
                                                    className="w-full py-4 rounded-2xl border-2 border-dashed border-border-color text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-surface-highlight group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                                        <Plus size={16} />
                                                    </div>
                                                    <span className="font-medium">Add New Wallet</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="p-4 border-t border-border-color flex gap-3">
                                            <Button
                                                variant="secondary"
                                                className="flex-1"
                                                onClick={() => setShowWalletModal(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className="flex-1"
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
                    </>
                )
                }


                {
                    currentView === 'settings' && (
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
                            <SettingsPage
                                onBack={() => {
                                    handleNavigate('home');
                                    loadData();
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
                                loadData();
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
                        <BottomMenu currentView={currentView} onNavigate={handleNavigate} />
                    )}
                </AnimatePresence>
            </div >
        </div >
    );
}
