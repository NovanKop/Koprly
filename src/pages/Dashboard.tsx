import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { Wallet, Plus, Loader2, TrendingUp, TrendingDown, ChevronRight, X, Eye, EyeOff, CreditCard, Banknote, Flame } from 'lucide-react';
import { api } from '../lib/api';
import type { Category, Transaction, Profile, Wallet as WalletType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsPage from './SettingsPage';
import FinancialReport from './FinancialReport';
import BudgetPage from './BudgetPage';
import SpendingCategoryPage from './SpendingCategoryPage';
import HistoryPage from './HistoryPage';
import NotificationSettings from './NotificationSettings';
import { BottomMenu } from '../components/BottomMenu';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../lib/utils';
import NotificationBell from '../components/NotificationBell';
import type { Notification } from '../types';

export default function Dashboard() {
    const { user } = useAuth();
    const { currency, dateFormat, isBottomMenuVisible, setBottomMenuVisible } = useAppStore();
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

    const WALLET_ICONS = [
        { icon: '💳', label: 'Card' },
        { icon: '💵', label: 'Cash' },
        { icon: '🏦', label: 'Bank' },
        { icon: '💰', label: 'Savings' },
        { icon: '📱', label: 'E-Wallet' },
        { icon: '🪙', label: 'Crypto' },
    ];

    const WALLET_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE', '#5856D6'];

    const handleNavigate = (view: 'home' | 'report' | 'settings' | 'budget' | 'category' | 'history' | 'notifications') => {
        setCurrentView(view);
        // Refresh data when returning to home to sync any changes from other pages
        if (view === 'home') {
            loadData();
        }
    };

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

    const openWalletModal = () => {
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
    };

    const addNewWallet = () => {
        if (editingWallets.length >= 4) return;
        setEditingWallets([...editingWallets, {
            name: `Wallet ${editingWallets.length + 1} `,
            balance: '',
            icon: '💳',
            color: WALLET_COLORS[editingWallets.length % WALLET_COLORS.length]
        }]);
    };

    const updateEditingWallet = (index: number, field: string, value: string) => {
        const updated = [...editingWallets];
        updated[index] = { ...updated[index], [field]: value };
        setEditingWallets(updated);
    };

    const removeEditingWallet = (index: number) => {
        if (editingWallets.length <= 1) return;
        setEditingWallets(editingWallets.filter((_, i) => i !== index));
    };

    const saveWallets = async () => {
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
    };

    const getEditingTotal = () => {
        return editingWallets.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
    };

    useEffect(() => {
        loadData();
    }, [user]);

    // Manage Bottom Menu visibility for Dashboard (Home) View
    useEffect(() => {
        // Only control visibility from here if we are in 'home' view
        // Other views (budget, settings) will handle their own visibility state
        if (currentView === 'home') {
            const isAnyModalOpen = showWalletModal || showAddExpense || showAddIncome || showEditTransaction;
            setBottomMenuVisible(!isAnyModalOpen);
        }
    }, [currentView, showWalletModal, showAddExpense, showAddIncome, showEditTransaction, setBottomMenuVisible]);

    const loadData = async () => {
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
            setTransactions(txns);

        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async () => {
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
    };

    const handleAddIncome = async () => {
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
    };


    const handleEditClick = (txn: Transaction) => {
        setEditingTransaction(txn);
        setAmount(txn.amount.toString());
        setDescription(txn.description || '');
        setTransactionDate(txn.date);
        setSelectedWallet(txn.wallet_id || '');
        setSelectedCategory(txn.category_id || '');
        setShowEditTransaction(true);
    };

    const handleUpdateTransaction = async () => {
        if (!editingTransaction || !amount) return;
        setSubmitting(true);
        try {
            const oldTxn = editingTransaction;
            const newAmount = parseFloat(amount);
            const isExpense = oldTxn.type === 'expense';
            const oldWalletId = oldTxn.wallet_id;
            const newWalletId = selectedWallet;

            // 1. Update Transaction
            await api.updateTransaction(oldTxn.id, {
                amount: newAmount,
                description,
                date: transactionDate,
                category_id: isExpense ? selectedCategory : undefined,
                wallet_id: selectedWallet || undefined
            });

            // 2. Update Wallets (Balance Management)
            // Only if wallets are involved
            if (oldWalletId || newWalletId) {
                // Scenario A: Wallet Changed
                if (oldWalletId !== newWalletId) {
                    // Revert old wallet
                    if (oldWalletId) {
                        const oldWallet = wallets.find(w => w.id === oldWalletId);
                        if (oldWallet) {
                            const revertAmount = isExpense ? oldTxn.amount : -oldTxn.amount;
                            await api.updateWallet(oldWalletId, {
                                balance: Number(oldWallet.balance) + Number(revertAmount)
                            });
                        }
                    }
                    // Apply to new wallet
                    if (newWalletId) {
                        const newWallet = wallets.find(w => w.id === newWalletId);
                        if (newWallet) {
                            const applyAmount = isExpense ? -newAmount : newAmount;
                            await api.updateWallet(newWalletId, {
                                balance: Number(newWallet.balance) + Number(applyAmount)
                            });
                        }
                    }
                }
                // Scenario B: Same Wallet, Amount Changed
                else if (oldWalletId && oldWalletId === newWalletId) {
                    if (Number(oldTxn.amount) !== newAmount) {
                        const wallet = wallets.find(w => w.id === oldWalletId);
                        if (wallet) {
                            const diff = newAmount - Number(oldTxn.amount);
                            const adjustment = isExpense ? -diff : diff; // If expense increases (diff > 0), balance decreases (adjustment < 0)
                            await api.updateWallet(oldWalletId, {
                                balance: Number(wallet.balance) + Number(adjustment)
                            });
                        }
                    }
                }
            }

            // Reset and Reload
            setShowEditTransaction(false);
            setEditingTransaction(null);
            setAmount('');
            setDescription('');
            setTransactionDate(new Date().toISOString().split('T')[0]);
            setSelectedCategory('');

            await loadData();
        } catch (e: unknown) {
            console.error(e);
            if (e instanceof Error) {
                alert(`Error updating transaction: ${e.message} `);
            } else {
                alert('Error updating transaction');
            }
        } finally {
            setSubmitting(false);
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
    const liveBalance = wallets.reduce((acc, wallet) => acc + Number(wallet.balance), 0);

    // Total Expenses from all transactions
    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    // Total Budget = live wallet balance (updates with income/expenses)
    // This matches the Budget page so both show the same value
    const totalBudget = liveBalance;
    const currentBalance = liveBalance;

    const recentTxns = transactions.slice(0, 5);
    const recentExpenses = recentTxns.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const recentIncome = recentTxns.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const recentNet = recentIncome - recentExpenses;
    const trendPercentage = totalBudget > 0 ? ((recentNet / totalBudget) * 100) : 0;
    const isPositiveTrend = recentNet >= 0;

    const categorySpending = categories.map(cat => {
        const catExpenses = transactions.filter(t => t.type === 'expense' && t.category_id === cat.id);
        const total = catExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
        return { ...cat, spent: total, count: catExpenses.length };
    }).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent);

    const topCategory = categorySpending[0];

    // Calculate budget utilization
    const budgetUsed = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    const formatMoney = (amount: number) => {
        return `${currencySymbol}${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} `;
    };

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
                    <div className="px-6 pt-8 pb-6 flex items-center justify-between">
                        <motion.button
                            onClick={() => handleNavigate('settings')}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-3 cursor-pointer"
                        >
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-lg">
                                {profile?.username?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <div className="text-left">
                                <p className="text-sm text-gray-400">{getCurrentTime()}</p>
                                <p className="font-semibold text-base">{profile?.username || user?.email?.split('@')[0] || 'User'}</p>
                            </div>
                        </motion.button>
                        <NotificationBell onNotificationClick={handleNotificationClick} />
                    </div>

                    <div className="px-6 space-y-6">
                        {/* Total Budget Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                            <div className="relative p-6 rounded-[24px] backdrop-blur-2xl bg-surface border border-border-color shadow-2xl overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-2xl"></div>

                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-sm text-gray-300">Total Budget</p>
                                        <button
                                            onClick={() => setShowPrivacy(!showPrivacy)}
                                            className="text-text-secondary hover:text-text-primary transition-colors"
                                        >
                                            {showPrivacy ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                    </div>
                                    <h2 className="text-4xl font-bold mb-3 tracking-tight">
                                        {showPrivacy
                                            ? formatMoney(currentBalance)
                                            : `${currencySymbol} ••••••••`}
                                    </h2>

                                    <div className="flex items-center gap-2">
                                        <div className={`flex items - center text - sm px - 2 py - 1 rounded - lg backdrop - blur - sm ${isPositiveTrend ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                            } `}>
                                            {isPositiveTrend ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            <span className="ml-1">
                                                {showPrivacy
                                                    ? `${isPositiveTrend ? '+' : ''}${formatMoney(Math.abs(recentNet))} (${Math.abs(trendPercentage).toFixed(1)}%)`
                                                    : '•••• (%)'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Dynamic Chart */}
                                    <div className="absolute bottom-0 right-0 h-16 w-32 opacity-40">
                                        {(() => {
                                            const today = new Date().toISOString().split('T')[0];
                                            const todayTxns = transactions
                                                .filter(t => t.date === today)
                                                .slice(0, 5)
                                                .reverse();

                                            const chartDataPoints = todayTxns.reduce((acc, txn) => {
                                                const val = txn.type === 'income' ? txn.amount : -txn.amount;
                                                const prev = acc[acc.length - 1];
                                                acc.push(prev + Number(val));
                                                return acc;
                                            }, [0] as number[]);

                                            const chartNetChange = chartDataPoints[chartDataPoints.length - 1];
                                            const isChartPositive = chartNetChange >= 0;

                                            const generatePath = (points: number[]) => {
                                                if (points.length < 2) return "M 0 20 L 100 20";
                                                const max = Math.max(...points);
                                                const min = Math.min(...points);
                                                const range = (max - min) || 1;
                                                const width = 100;
                                                const height = 40;
                                                const padding = 5;
                                                const availableHeight = height - (padding * 2);

                                                return points.map((val, i) => {
                                                    const x = (i / (points.length - 1)) * width;
                                                    const normalizedVal = (val - min) / range;
                                                    const y = height - padding - (normalizedVal * availableHeight);
                                                    return `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
                                                }).join(' ');
                                            };

                                            return (
                                                <svg viewBox="0 0 100 40" className={`w - full h - full ${isChartPositive ? 'text-success' : 'text-error'} `} fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d={generatePath(chartDataPoints)} strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Wallets Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400">My Wallets</h3>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {wallets.map((wallet) => (
                                    <motion.div
                                        key={wallet.id}
                                        whileHover={{ scale: 1.02 }}
                                        className="min-w-[160px] p-4 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color flex flex-col justify-between h-[100px]"
                                        style={{ borderColor: wallet.color ? `${wallet.color} 40` : undefined }}
                                    >
                                        <div className="flex items-center gap-2 text-gray-400">
                                            {wallet.type === 'cash' ? <Banknote size={16} /> : <CreditCard size={16} />}
                                            <span className="text-sm font-medium truncate">{wallet.name}</span>
                                        </div>
                                        <p className="text-xl font-bold">
                                            {showPrivacy ? formatMoney(wallet.balance) : '••••'}
                                        </p>
                                    </motion.div>
                                ))}
                                <Button
                                    variant="secondary"
                                    className="min-w-[50px] rounded-[20px] h-[100px] border-dashed border-2 flex items-center justify-center"
                                    onClick={openWalletModal}
                                >
                                    <Plus size={20} className="text-gray-400" />
                                </Button>
                            </div>
                        </motion.div>

                        {/* Action Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex gap-4"
                        >
                            <Button
                                className="flex-1 bg-success hover:bg-success/90 text-white border-none shadow-lg hover:shadow-xl transition-shadow"
                                onClick={() => {
                                    setShowAddIncome(false);
                                    setShowEditTransaction(false);
                                    setShowAddExpense(!showAddExpense);
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="6" width="20" height="14" rx="3" />
                                    <circle cx="12" cy="13" r="3" />
                                    <circle cx="6" cy="10" r="1" fill="currentColor" />
                                    <circle cx="18" cy="10" r="1" fill="currentColor" />
                                    <circle cx="6" cy="16" r="1" fill="currentColor" />
                                    <circle cx="18" cy="16" r="1" fill="currentColor" />
                                    <path d="M12 3v4m0 0l-3-3m3 3l3-3" />
                                </svg>
                                Add Expense
                            </Button>
                            <Button
                                variant="secondary"
                                className="flex-1 backdrop-blur-xl bg-surface border-border-color hover:bg-surface-highlight"
                                onClick={() => {
                                    setShowAddExpense(false);
                                    setShowEditTransaction(false);
                                    setShowAddIncome(!showAddIncome);
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="6" width="20" height="14" rx="3" />
                                    <circle cx="12" cy="13" r="3" />
                                    <circle cx="6" cy="10" r="1" fill="currentColor" />
                                    <circle cx="18" cy="10" r="1" fill="currentColor" />
                                    <circle cx="6" cy="16" r="1" fill="currentColor" />
                                    <circle cx="18" cy="16" r="1" fill="currentColor" />
                                    <path d="M12 17v4m0 0l3-3m0 3l-3-3" />
                                </svg>
                                Income
                            </Button>
                        </motion.div>

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
                                    <div className="p-6 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color space-y-4">
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

                                        {/* Wallet Selector */}
                                        <div>
                                            <label className="text-xs text-gray-400 mb-2 block">Pay from</label>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                {wallets.map(w => (
                                                    <button
                                                        key={w.id}
                                                        onClick={() => setSelectedWallet(w.id)}
                                                        className={`px - 3 py - 1.5 rounded - lg text - sm border transition - all whitespace - nowrap
                                                            ${selectedWallet === w.id
                                                                ? 'bg-primary text-white border-primary'
                                                                : 'bg-surface border-border-color text-gray-400'
                                                            } `}
                                                    >
                                                        {w.name} ({formatMoney(w.balance)})
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {categories.map(cat => (
                                                <motion.button
                                                    key={cat.id}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setSelectedCategory(cat.id)}
                                                    className={`
flex - shrink - 0 px - 4 py - 2.5 rounded - full border transition - all backdrop - blur - md
                        flex items - center gap - 2 whitespace - nowrap
                        ${selectedCategory === cat.id
                                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                                                            : 'bg-surface border-border-color text-text-secondary hover:border-primary/40 hover:bg-surface-highlight'
                                                        }
`}
                                                >
                                                    <span>{cat.icon}</span>
                                                    <span className="text-sm font-medium">{cat.name}</span>
                                                </motion.button>
                                            ))}
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
                                    className="relative z-20"
                                >
                                    <div className="p-6 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color space-y-4">
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

                                        {/* Wallet Selector */}
                                        <div>
                                            <label className="text-xs text-gray-400 mb-2 block">Deposit to</label>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                {wallets.map(w => (
                                                    <button
                                                        key={w.id}
                                                        onClick={() => setSelectedWallet(w.id)}
                                                        className={`px - 3 py - 1.5 rounded - lg text - sm border transition - all whitespace - nowrap
                                                            ${selectedWallet === w.id
                                                                ? 'bg-primary text-white border-primary'
                                                                : 'bg-surface border-border-color text-gray-400'
                                                            } `}
                                                    >
                                                        {w.name} ({formatMoney(w.balance)})
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

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
                        <AnimatePresence>
                            {showEditTransaction && editingTransaction && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                    onClick={() => setShowEditTransaction(false)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.9, y: 20 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-md rounded-[24px] bg-surface border border-border-color overflow-hidden max-h-[90vh] overflow-y-auto"
                                    >
                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xl font-bold">Edit {editingTransaction.type === 'expense' ? 'Expense' : 'Income'}</h3>
                                                <button
                                                    onClick={() => setShowEditTransaction(false)}
                                                    className="p-2 rounded-full hover:bg-white/5 transition-colors"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>

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

                                            {/* Wallet Selector */}
                                            <div>
                                                <label className="text-xs text-gray-400 mb-2 block">
                                                    {editingTransaction.type === 'expense' ? 'Pay from' : 'Deposit to'}
                                                </label>
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {wallets.map(w => (
                                                        <button
                                                            key={w.id}
                                                            onClick={() => setSelectedWallet(w.id)}
                                                            className={`px - 3 py - 1.5 rounded - lg text - sm border transition - all whitespace - nowrap
                                                                ${selectedWallet === w.id
                                                                    ? 'bg-primary text-white border-primary'
                                                                    : 'bg-surface border-border-color text-gray-400'
                                                                } `}
                                                        >
                                                            {w.name} ({formatMoney(w.balance)})
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Category Selector (Only for Expense) */}
                                            {editingTransaction.type === 'expense' && (
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {categories.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => setSelectedCategory(cat.id)}
                                                            className={`
flex - shrink - 0 px - 4 py - 2.5 rounded - full border transition - all backdrop - blur - md
                                                                flex items - center gap - 2 whitespace - nowrap
                                                                ${selectedCategory === cat.id
                                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                                                                    : 'bg-surface border-border-color text-text-secondary hover:border-primary/40 hover:bg-surface-highlight'
                                                                }
`}
                                                        >
                                                            <span>{cat.icon}</span>
                                                            <span className="text-sm font-medium">{cat.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex gap-3 mt-6">
                                                <Button
                                                    className="flex-1 w-full"
                                                    isLoading={submitting}
                                                    onClick={handleUpdateTransaction}
                                                >
                                                    Update
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Budget & Top Spend */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-2 gap-4"
                        >
                            {/* Budget - Clickable */}
                            <motion.button
                                onClick={openWalletModal}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="p-5 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color hover:bg-surface-highlight transition-all text-left"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Budget</p>
                                    <Wallet size={14} className="text-gray-500" />
                                </div>
                                <p className="text-2xl font-bold mb-2">
                                    {showPrivacy ? `${budgetUsed.toFixed(0)}% ` : '•••%'}
                                </p>
                                <p className="text-xs text-gray-500 mb-3">Used</p>
                                <div className="h-1.5 bg-border-color rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(budgetUsed, 100)}% ` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h - full rounded - full ${budgetUsed > 90 ? 'bg-error' : budgetUsed > 70 ? 'bg-warning' : 'bg-gradient-to-r from-success to-warning'
                                            } `}
                                    ></motion.div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {showPrivacy
                                        ? `${formatMoney(totalExpenses)} of ${formatMoney(totalBudget)} `
                                        : `${currencySymbol}•••••• of ${currencySymbol}••••••`}
                                </p>
                            </motion.button>

                            <div className="p-5 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color hover:bg-surface-highlight transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Top Spend</p>
                                    <Flame size={14} className="text-warning" />
                                </div>
                                {topCategory ? (
                                    <>
                                        <p className="text-2xl font-bold mb-1">{topCategory.name}</p>
                                        <p className="text-xs text-gray-500">{topCategory.count} transactions</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-500">No data</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Spending Categories */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-base">Spending Categories</h3>
                                <button
                                    onClick={() => handleNavigate('category')}
                                    className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all"
                                >
                                    View All
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {categorySpending.slice(0, 3).map((cat, idx) => (
                                    <motion.div
                                        key={cat.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + idx * 0.1 }}
                                        whileHover={{ x: 4 }}
                                    >
                                        <div className="p-4 rounded-[20px] backdrop-blur-xl bg-surface border border-border-color flex items-center gap-4 hover:bg-surface-highlight transition-all cursor-pointer">
                                            <div
                                                className="h-11 w-11 rounded-xl backdrop-blur-md border border-border-color flex items-center justify-center text-xl shadow-lg"
                                                style={{ backgroundColor: `${cat.color} 15` }}
                                            >
                                                {cat.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium mb-1.5">{cat.name}</p>
                                                <div className="h-1.5 bg-border-color rounded-full overflow-hidden backdrop-blur-sm">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min((cat.spent / totalExpenses) * 100, 100)}% ` }}
                                                        transition={{ duration: 0.8, delay: 0.4 + idx * 0.1 }}
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: cat.color || '#007AFF' }}
                                                    ></motion.div>
                                                </div>
                                            </div>
                                            <p className="text-sm font-semibold text-text-secondary">{formatMoney(cat.spent)}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Recent Activity */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Recent Activity</h3>
                                <button
                                    onClick={() => handleNavigate('history')}
                                    className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all"
                                >
                                    History
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {transactions.slice(0, 5).map((txn, idx) => {
                                    const isIncome = txn.type === 'income';
                                    return (
                                        <motion.div
                                            key={txn.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + idx * 0.05, type: "spring" }}
                                            whileHover={{ x: 4 }}
                                            onClick={() => handleEditClick(txn)}
                                        >
                                            <div className={`p - 4 rounded - [20px] backdrop - blur - xl border flex items - center justify - between transition - all cursor - pointer group ${isIncome ? 'bg-success/5 border-success/30 hover:bg-success/10' : 'bg-surface border-border-color hover:bg-surface-highlight'} `}>
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={`h - 11 w - 11 rounded - xl flex items - center justify - center text - xl shadow - lg border ${isIncome ? 'border-success/30' : 'border-border-color'} `}
                                                        style={{ backgroundColor: isIncome ? '#34C75920' : (txn.category?.color ? `${txn.category.color} 18` : '#007AFF18') }}
                                                    >
                                                        {isIncome ? '💰' : (txn.category?.icon || '💸')}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{txn.description || (isIncome ? 'Income' : txn.category?.name)}</p>
                                                        <p className={`text - xs ${isIncome ? 'text-success/70' : 'text-gray-500'} `}>
                                                            {txn.date ? formatDate(txn.date, dateFormat) : ''} • {isIncome ? 'Income' : txn.category?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <p className={`font - bold ${isIncome ? 'text-success' : 'text-error'} `}>
                                                        {isIncome ? '+' : '-'}{formatMoney(Number(txn.amount))}
                                                    </p>
                                                    <ChevronRight size={16} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {transactions.length === 0 && (
                                    <div className="text-center py-12">
                                        <div className="h-16 w-16 rounded-full bg-surface border border-border-color flex items-center justify-center mx-auto mb-4">
                                            <Wallet size={28} className="text-gray-500" />
                                        </div>
                                        <p className="text-gray-500">No transactions yet.</p>
                                        <p className="text-sm text-gray-600 mt-1">Start by adding your first expense or income!</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
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
                                    className="w-full max-w-md rounded-[28px] bg-surface border border-border-color overflow-hidden"
                                >
                                    {/* Header with Total Budget */}
                                    <div className="p-6 bg-gradient-to-br from-primary/20 to-secondary/10 border-b border-border-color">
                                        <h3 className="text-lg font-bold text-center mb-1">Manage Wallets</h3>
                                        <p className="text-xs text-gray-400 text-center mb-4">Max 4 wallets</p>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Budget</p>
                                            <p className="text-3xl font-bold text-primary">{formatMoney(getEditingTotal())}</p>
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
                                                        <div className="absolute top-full left-0 mt-1 p-2 bg-surface border border-border-color rounded-xl hidden group-hover:grid grid-cols-3 gap-1 z-10 shadow-xl">
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
                    <SettingsPage
                        onBack={() => {
                            handleNavigate('home');
                            loadData();
                        }}
                        onNavigateToNotifications={() => handleNavigate('notifications')}
                    />
                )
            }

            {
                currentView === 'notifications' && (
                    <NotificationSettings onBack={() => handleNavigate('settings')} />
                )
            }

            {
                currentView === 'report' && (
                    <FinancialReport onBack={() => handleNavigate('home')} />
                )
            }

            {
                currentView === 'budget' && (
                    <BudgetPage onBack={() => {
                        handleNavigate('home');
                        loadData();
                    }} />
                )
            }

            {
                currentView === 'category' && (
                    <SpendingCategoryPage onBack={() => handleNavigate('home')} />
                )
            }

            {
                currentView === 'history' && (
                    <HistoryPage onBack={() => handleNavigate('home')} />
                )
            }

            {/* Persistent Bottom Menu */}
            <AnimatePresence>
                {isBottomMenuVisible && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="fixed bottom-0 left-0 right-0 z-[50]"
                    >
                        <BottomMenu currentView={currentView} onNavigate={handleNavigate} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
