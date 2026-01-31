import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { Wallet, Plus, Loader2, TrendingUp, TrendingDown, ChevronRight, X, Eye, EyeOff, CreditCard, Banknote, Flame } from 'lucide-react';
import { api } from '../lib/api';
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
import { MAX_WALLETS, WALLET_ICONS, WALLET_COLORS } from '../lib/constants';
import NotificationBell from '../components/NotificationBell';
import { useTransactionManager } from '../hooks/useTransactionManager';
import { EditTransactionModal } from '../components/EditTransactionModal';
import type { Category, Transaction, Profile, Wallet as WalletType, Notification } from '../types';

export default function Dashboard() {
    const { user } = useAuth();
    const { currency, isBottomMenuVisible, setBottomMenuVisible } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<WalletType[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showAddIncome, setShowAddIncome] = useState(false);

    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentView, setCurrentView] = useState<'home' | 'report' | 'settings' | 'budget' | 'category' | 'history' | 'notifications'>('home');
    const [showPrivacy, setShowPrivacy] = useState(true); // Default visible

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
        icon: string;
        color: string;
    }[]>([]);

    // Edit Transaction State
    const [showEditTransaction, setShowEditTransaction] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);



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

    const handleNavigate = useCallback((view: 'home' | 'report' | 'settings' | 'budget' | 'category' | 'history' | 'notifications') => {
        setCurrentView(view);
        // Refresh data when returning to home to sync any changes from other pages
        if (view === 'home') {
            loadData();
        }
    }, [loadData]);

    // Handle notification deep linking
    const handleNotificationClick = (notification: Notification) => {
        const deepLink = notification.metadata.deep_link;
        if (deepLink) {
            switch (deepLink) {
                case '/budget':
                    handleNavigate('budget');
                    break;
                case '/report':
                    handleNavigate('report');
                    break;
                case '/dashboard':
                default:
                    handleNavigate('home');
                    break;
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
                icon: w.type === 'cash' ? '💵' : w.type === 'bank' ? '🏦' : '💳',
                color: w.color || '#007AFF'
            })));
        } else {
            // Add one empty wallet by default
            setEditingWallets([{ name: 'My Wallet', balance: '', icon: '💳', color: '#007AFF' }]);
        }
        setShowWalletModal(true);
    }, [wallets]);

    const addNewWallet = useCallback(() => {
        if (editingWallets.length >= MAX_WALLETS) return;
        setEditingWallets(prev => [...prev, {
            name: `Wallet ${prev.length + 1} `,
            balance: '',
            icon: '💳',
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
            for (const wallet of wallets) {
                if (!existingIds.includes(wallet.id)) {
                    await api.deleteWallet(wallet.id);
                }
            }

            // Update or create wallets
            for (const wallet of editingWallets) {
                const walletData = {
                    name: wallet.name,
                    balance: parseFloat(wallet.balance) || 0,
                    type: wallet.icon === '💵' ? 'cash' : wallet.icon === '🏦' ? 'bank' : 'general',
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
            } else {
                alert(`Error saving wallets: ${e.message} `);
            }
        } finally {
            setSubmitting(false);
        }
    }, [editingWallets, wallets, user, loadData]);

    const getEditingTotal = () => {
        return editingWallets.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
    };



    const handleAddExpense = useCallback(async () => {
        if (!amount || !selectedCategory) return;
        setSubmitting(true);
        try {
            await api.addExpense({
                amount: parseFloat(amount),
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
        if (!amount) return;
        setSubmitting(true);
        try {
            await api.addIncome({
                amount: parseFloat(amount),
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

    // Total Budget = live wallet balance (updates with income/expenses)
    // This matches the Budget page so both show the same value
    const totalBudget = liveBalance;
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



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-text-primary pb-24 relative overflow-hidden">
            {/* Background Ambient Blobs */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] animate-blob" />
                <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] animate-blob animation-delay-2000" />
            </div>

            {currentView === 'home' && (
                <>
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

                    <div className="px-6 space-y-6">
                        {/* Total Budget Card */}
                        {/* Total Budget Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="px-6"
                        >
                            <div className="relative p-7 rounded-[32px] overflow-hidden glass-panel shadow-2xl transition-all duration-300 hover:shadow-primary/10">
                                {/* Background Gradient Mesh - Dynamic based on theme */}
                                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/20 dark:bg-blue-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-green-500/20 dark:bg-green-500/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-sm font-semibold text-text-secondary uppercase tracking-tight">Total Budget</p>
                                        <button
                                            onClick={() => setShowPrivacy(!showPrivacy)}
                                            className="text-text-secondary hover:text-text-primary transition-colors"
                                        >
                                            {showPrivacy ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                    </div>
                                    <h2 className="text-[42px] leading-none font-numeric text-text-primary mb-6 tracking-tight">
                                        {showPrivacy
                                            ? formatMoney(currentBalance, currency)
                                            : `${currencySymbol} ••••••••`}
                                    </h2>

                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-color mb-6 backdrop-blur-md">
                                        {isPositiveTrend ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
                                        <span className={`text-sm font-bold ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`}>
                                            {formatMoney(Math.abs(recentNet), currency)}
                                            <span className="opacity-70 font-normal ml-1">({Math.abs(trendPercentage).toFixed(1)}%)</span>
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-3 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden p-[2px]">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((Math.max(0, currentBalance) / totalBudget) * 100, 100)}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(34,197,94,0.4)] progress-liquid"
                                        ></motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Wallets Section */}
                        {/* Wallets Section */}
                        <div className="mt-8">
                            <div className="px-6 mb-4">
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">MY WALLETS</h3>
                            </div>
                            <div className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide snap-x">
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
                                            className={`min-w-[160px] p-5 rounded-[20px] ${gradientClass} border border-white/10 snap-start flex flex-col justify-between h-[110px] relative overflow-hidden group shadow-lg`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-center gap-2 text-white/90 relative z-10">
                                                {wallet.type === 'cash' ? <Banknote size={18} /> : <CreditCard size={18} />}
                                                <span className="text-sm font-bold truncate">{wallet.name}</span>
                                            </div>
                                            <div className="relative z-10">
                                                <p className="text-xl font-numeric text-white mb-2">
                                                    {showPrivacy ? formatMoney(wallet.balance, currency) : '••••'}
                                                </p>
                                                <div className="h-1 bg-black/20 rounded-full overflow-hidden w-full">
                                                    <div className="h-full bg-white/40 backdrop-blur-sm rounded-full" style={{ width: '60%' }} />
                                                </div>
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
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {/* Action Buttons */}
                        <div className="px-6 flex gap-4 mt-2">
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    setShowAddIncome(false);
                                    setShowEditTransaction(false);
                                    setShowAddExpense(!showAddExpense);
                                }}
                                className="flex-1 h-16 rounded-[20px] glass-panel border-green-500/30 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-green-500/10 transition-colors"
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
                                className="flex-1 h-16 rounded-[20px] glass-panel border-blue-500/30 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-blue-500/10 transition-colors"
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
                        </div>

                        {/* Add Expense Form */}
                        <AnimatePresence>
                            {showAddExpense && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="relative z-20"
                                >
                                    <div className="p-6 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color space-y-4 shadow-xl">
                                        <h3 className="text-lg font-semibold text-text-primary">Expense</h3>
                                        <Input
                                            label="Amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
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

                                        <CategorySelector
                                            categories={categories}
                                            selectedCategoryId={selectedCategory}
                                            onSelect={setSelectedCategory}
                                        />

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
                                    className="relative z-20"
                                >
                                    <div className="p-6 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color space-y-4 shadow-xl">
                                        <h3 className="text-lg font-semibold text-text-primary">Income</h3>
                                        <Input
                                            label="Amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
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
                        {/* Budget & Top Spend */}
                        <div className="px-6 mt-8 grid grid-cols-2 gap-4">
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
                                    <div className="flex justify-between text-[10px] text-text-secondary mb-2 font-mono">
                                        <span className="font-bold">{showPrivacy ? formatMoney(totalExpenses, currency) : '•••'}</span>
                                        <span className="opacity-70">{showPrivacy ? formatMoney(totalBudget, currency) : '•••'}</span>
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
                                                <div className="w-8 h-8 rounded-full bg-surface border border-border-color flex items-center justify-center text-sm shadow-sm">
                                                    {topCategory.icon}
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
                        </div>

                        {/* Spending Categories */}
                        {/* Spending Categories */}
                        <div className="px-6 mt-8">
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
                                        <div
                                            className="h-12 w-12 rounded-[18px] flex items-center justify-center text-xl bg-surface border border-border-color shadow-sm"
                                            style={{ color: cat.color }}
                                        >
                                            <span style={{ filter: 'drop-shadow(0 0 10px currentColor)' }}>
                                                {/* Fallback icon if mapped icon is missing */}
                                                {cat.icon || '🛍️'}
                                            </span>
                                        </div>
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
                        </div>

                        {/* Recent Activity */}
                        {/* Recent Activity */}
                        <div className="px-6 mt-8">
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
                                            <div className="h-10 w-10 rounded-full border border-border-color flex items-center justify-center text-xl bg-surface group-hover:scale-110 transition-transform">
                                                {txn.category?.icon || (txn.type === 'income' ? '💰' : '💸')}
                                            </div>
                                            <div>
                                                <p className="font-bold text-text-primary text-sm">{txn.description}</p>
                                                <p className="text-xs text-text-secondary">{new Date(txn.date).toLocaleDateString()}</p>
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
                        </div>
                    </div>

                    {/* Wallet Management Modal */}
                    <AnimatePresence>
                        {showWalletModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                                    <div className="p-6 bg-gradient-to-br from-primary/20 to-secondary/10 border-b border-border-color">
                                        <h3 className="text-lg font-bold text-center mb-1">Manage Wallets</h3>
                                        <p className="text-xs text-gray-400 text-center mb-4">Max 4 wallets</p>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Budget</p>
                                            <p className="text-3xl font-bold text-primary">{formatMoney(getEditingTotal(), currency)}</p>
                                        </div>
                                    </div>

                                    {/* Wallet List */}
                                    <div className="p-4 max-h-[50vh] overflow-y-auto space-y-3">
                                        {editingWallets.map((wallet, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-4 rounded-2xl bg-background border border-border-color"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Icon Picker */}
                                                    <div className="relative group">
                                                        <button className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-2xl border border-border-color hover:border-primary transition-colors">
                                                            {wallet.icon}
                                                        </button>
                                                        <div className="absolute top-full left-0 mt-1 p-2 bg-surface backdrop-blur-xl border border-border-color rounded-xl hidden group-hover:grid grid-cols-3 gap-1 z-10 shadow-xl">
                                                            {WALLET_ICONS.map(({ icon }) => (
                                                                <button
                                                                    key={icon}
                                                                    onClick={() => updateEditingWallet(index, 'icon', icon)}
                                                                    className={`w - 10 h - 10 rounded - lg flex items - center justify - center text - xl hover: bg - primary / 20 transition - colors ${wallet.icon === icon ? 'bg-primary/30' : ''} `}
                                                                >
                                                                    {icon}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Name & Balance */}
                                                    <div className="flex-1 space-y-2">
                                                        <input
                                                            type="text"
                                                            value={wallet.name}
                                                            onChange={(e) => updateEditingWallet(index, 'name', e.target.value)}
                                                            placeholder="Wallet Name"
                                                            className="w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 placeholder-gray-600"
                                                        />
                                                        <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
                                                            <span className="text-gray-400 text-sm">{currencySymbol}</span>
                                                            <input
                                                                type="number"
                                                                inputMode="numeric"
                                                                value={wallet.balance}
                                                                onChange={(e) => updateEditingWallet(index, 'balance', e.target.value)}
                                                                placeholder="0"
                                                                className="w-full bg-transparent border-none p-0 text-lg font-bold focus:ring-0 placeholder-gray-600"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Delete Button */}
                                                    {editingWallets.length > 1 && (
                                                        <button
                                                            onClick={() => removeEditingWallet(index)}
                                                            className="p-2 text-gray-500 hover:text-error transition-colors"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Color Picker */}
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-border-color">
                                                    {WALLET_COLORS.map((color) => (
                                                        <button
                                                            key={color}
                                                            onClick={() => updateEditingWallet(index, 'color', color)}
                                                            className={`w - 6 h - 6 rounded - full transition - transform ${wallet.color === color ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'} `}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ))}

                                        {/* Add Wallet Button */}
                                        {editingWallets.length < 4 && (
                                            <button
                                                onClick={addNewWallet}
                                                className="w-full py-4 rounded-2xl border-2 border-dashed border-border-color text-gray-400 hover:text-primary hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={18} />
                                                <span>Add Wallet</span>
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

            {/* Persistent Bottom Menu - Always mounted to preserve layout animation state */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{
                    opacity: isBottomMenuVisible ? 1 : 0,
                    pointerEvents: isBottomMenuVisible ? 'auto' : 'none'
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="fixed bottom-0 left-0 right-0 z-[50] flex justify-center pb-8 pointer-events-none"
            >
                <div className="pointer-events-auto">
                    <BottomMenu currentView={currentView} onNavigate={handleNavigate} />
                </div>
            </motion.div>
        </div >
    );
}
