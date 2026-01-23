import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Category, Transaction, Wallet } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronDown, AlertTriangle, Trash2, X, ChevronRight } from 'lucide-react';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from 'date-fns';
import { Button } from '../components/ui/Button';

interface BudgetPageProps {
    onBack: () => void;
}

const CATEGORY_ICONS = ['🛒', '🍽️', '🚗', '🏠', '🎬', '🏥', '👕', '💼', '✈️', '📚', '💊', '🎮', '☕', '🔌', '🎁'];
const CATEGORY_COLORS = ['#34C759', '#FF9500', '#007AFF', '#5856D6', '#FF2D55', '#FF3B30', '#AF52DE', '#8E8E93', '#00C7BE', '#FFD60A'];
const WALLET_ICONS = [
    { icon: '💳', label: 'Card' },
    { icon: '💵', label: 'Cash' },
    { icon: '🏦', label: 'Bank' },
    { icon: '💰', label: 'Savings' },
    { icon: '📱', label: 'E-Wallet' },
    { icon: '🪙', label: 'Crypto' },
];
const WALLET_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE', '#5856D6'];

export default function BudgetPage({ onBack }: BudgetPageProps) {
    const { user } = useAuth();
    const { currency, setBottomMenuVisible } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [selectedMonth] = useState(new Date());
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    // Category Modal States
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showEditCategory, setShowEditCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Wallet Modal States
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [editingWallets, setEditingWallets] = useState<{
        id?: string;
        name: string;
        balance: string;
        icon: string;
        color: string;
    }[]>([]);

    // Form States
    const [categoryName, setCategoryName] = useState('');
    const [categoryIcon, setCategoryIcon] = useState('🛒');
    const [categoryColor, setCategoryColor] = useState('#34C759');
    const [categoryBudget, setCategoryBudget] = useState('');

    // Guidance Bubble: Track dismissed states separately for 'start' (0%) and 'partial' (1-99%)
    // This allows differentiation: dismissing "Partial" logic won't hide "Start" logic if user resets.
    const [dismissedStates, setDismissedStates] = useState<Record<string, boolean>>(() => {
        if (typeof sessionStorage === 'undefined') return { start: false, partial: false };
        return {
            start: !!sessionStorage.getItem('budgetGuidanceDismissed_start'),
            partial: !!sessionStorage.getItem('budgetGuidanceDismissed_partial')
        };
    });



    // Manage Bottom Menu visibility
    useEffect(() => {
        const isAnyModalOpen = showAddCategory || showEditCategory || showWalletModal;
        setBottomMenuVisible(!isAnyModalOpen);

        return () => setBottomMenuVisible(true); // Reset on unmount
    }, [showAddCategory, showEditCategory, showWalletModal, setBottomMenuVisible]);

    const currencySymbol = currency === 'IDR' ? 'Rp' : '$';

    useEffect(() => {
        window.scrollTo(0, 0);
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, txns, wlts] = await Promise.all([
                api.getCategories(),
                api.getTransactions(),
                api.getWallets()
            ]);
            setCategories(cats || []);
            setTransactions(txns || []);
            setWallets(wlts || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter expenses for selected month
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const monthlyExpenses = transactions.filter(t => {
        if (t.type !== 'expense') return false;
        const date = parseISO(t.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    // Calculate spending per category
    const categorySpending = categories.map(cat => {
        const spent = monthlyExpenses
            .filter(t => t.category_id === cat.id)
            .reduce((sum, t) => sum + Number(t.amount), 0);
        return { ...cat, spent };
    });

    // Live wallet balance (changes with transactions) - THIS is the Total Budget shown to user
    const liveBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    // Calculate total expenses and income from all transactions (not just monthly)
    const allExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const allIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);

    // Total Budget for DISPLAY = live wallet balance (updates with income/expenses)
    const totalBudget = liveBalance;

    // Original Budget = what user initially set (reverse transaction effects)
    // Used ONLY for Budget Allocation calculation - not affected by spending/income
    const originalBudget = liveBalance + allExpenses - allIncome;

    // Monthly spending for progress display
    const totalSpent = monthlyExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalRemaining = liveBalance; // Live balance is what remains
    const usedPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Budget Allocation = sum of all category budgets vs ORIGINAL Budget (not live balance)
    // This is NOT affected by expenses/income - only by setting category budgets
    const totalCategoryBudgets = categories.reduce((sum, c) => sum + (c.monthly_budget || 0), 0);
    const budgetAllocationRemaining = originalBudget - totalCategoryBudgets;
    const budgetAllocationPercent = originalBudget > 0 ? Math.round((totalCategoryBudgets / originalBudget) * 100) : 0;
    const isBudgetOverAllocated = totalCategoryBudgets > originalBudget;

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Wallet management functions
    const openWalletModal = () => {
        if (wallets.length > 0) {
            setEditingWallets(wallets.map(w => ({
                id: w.id,
                name: w.name,
                balance: String(w.balance),
                icon: w.type === 'cash' ? '💵' : w.type === 'bank' ? '🏦' : '💳',
                color: w.color || '#007AFF'
            })));
        } else {
            setEditingWallets([{ name: 'My Wallet', balance: '', icon: '💳', color: '#007AFF' }]);
        }
        setShowWalletModal(true);
    };

    const addNewWallet = () => {
        if (editingWallets.length >= 4) return;
        setEditingWallets([...editingWallets, {
            name: `Wallet ${editingWallets.length + 1}`,
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
        setEditingWallets(editingWallets.filter((_, i) => i !== index));
    };

    const getEditingTotal = () => {
        return editingWallets.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
    };

    const saveWallets = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            for (const wallet of editingWallets) {
                const iconType = wallet.icon === '💵' ? 'cash' : wallet.icon === '🏦' ? 'bank' : 'general';
                if (wallet.id) {
                    await api.updateWallet(wallet.id, {
                        name: wallet.name,
                        balance: parseFloat(wallet.balance) || 0,
                        color: wallet.color,
                        type: iconType
                    });
                } else {
                    await api.createWallet({
                        user_id: user.id,
                        name: wallet.name,
                        balance: parseFloat(wallet.balance) || 0,
                        color: wallet.color,
                        type: iconType
                    });
                }
            }
            await loadData();
            setShowWalletModal(false);
        } catch (error) {
            console.error('Failed to save wallets:', error);
            alert('Failed to save wallets');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setCategoryName('');
        setCategoryIcon('🛒');
        setCategoryColor('#34C759');
        setCategoryBudget('');
    };

    const handleAddCategory = async () => {
        if (!user || !categoryName.trim()) return;
        setSubmitting(true);
        try {
            // Parse budget value - set to undefined if empty
            const budgetValue = categoryBudget && categoryBudget.trim()
                ? parseFloat(categoryBudget)
                : undefined;

            const newCategory = await api.createCategory({
                name: categoryName.trim(),
                icon: categoryIcon,
                color: categoryColor,
                monthly_budget: budgetValue,
                user_id: user.id
            });

            // Optimistically add the new category to local state
            setCategories(prevCategories => [...prevCategories, newCategory]);

            setShowAddCategory(false);
            resetForm();

            // Reload data in background to sync any other changes
            loadData();
        } catch (error) {
            console.error('Failed to create category:', error);
            alert('Failed to create category. Please try again.');
            // Reload on error to ensure data consistency
            await loadData();
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditCategory = async () => {
        if (!editingCategory) return;
        setSubmitting(true);
        try {
            // Parse budget value - set to undefined if empty to clear the field
            const budgetValue = categoryBudget && categoryBudget.trim()
                ? parseFloat(categoryBudget)
                : undefined;

            const updatedCategory = await api.updateCategory(editingCategory.id, {
                name: categoryName.trim(),
                icon: categoryIcon,
                color: categoryColor,
                monthly_budget: budgetValue
            });

            // Optimistically update the local state
            setCategories(prevCategories =>
                prevCategories.map(cat =>
                    cat.id === editingCategory.id ? updatedCategory : cat
                )
            );

            // Background refresh to ensure consistency
            loadData();

            setEditingCategory(null);
            setShowEditCategory(false);
        } catch (error) {
            console.error('Error updating category:', error);
            alert('Failed to update category');
            // Reload data on error to revert optimistic update
            loadData();
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Delete this category? Transactions will keep their data.')) return;
        try {
            await api.deleteCategory(id);
            await loadData();
        } catch (error) {
            console.error('Failed to delete category:', error);
            alert('Failed to delete category');
        }
    };

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat);
        setCategoryName(cat.name);
        setCategoryIcon(cat.icon);
        setCategoryColor(cat.color);
        setCategoryBudget(cat.monthly_budget?.toString() || '');
        setShowEditCategory(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-text-primary pb-28 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/5 blur-[120px] animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] animate-blob" />
            </div>

            {/* Header */}
            <div className="px-6 pt-8 pb-4 flex items-center justify-between">
                <motion.button
                    onClick={onBack}
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 -ml-2 rounded-xl hover:bg-surface transition-colors"
                >
                    <ArrowLeft size={24} className="text-primary" />
                </motion.button>
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg font-bold"
                >
                    Budget
                </motion.h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Month Selector */}
            <div className="px-6 mb-6">
                <button
                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-color hover:bg-surface-highlight transition-colors"
                >
                    <span className="text-sm font-medium">{format(selectedMonth, 'MMMM yyyy')}</span>
                    <ChevronDown size={16} className={`transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} />
                </button>
            </div>

            <motion.div
                className="px-6 space-y-6"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
            >
                {/* Total Budget Summary Card - Clickable to manage wallets */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                    }}
                    onClick={openWalletModal}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="p-6 rounded-[32px] bg-surface backdrop-blur-xl border border-border-color shadow-sm cursor-pointer hover:bg-surface-highlight transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-text-secondary uppercase tracking-wider">Total Budget</p>
                                <ChevronRight size={14} className="text-text-secondary" />
                            </div>
                            <h2 className="text-3xl font-bold">
                                {formatMoney(totalBudget)}
                            </h2>
                            <p className="text-sm text-text-secondary mt-1">
                                {formatMoney(totalSpent)} spent • {formatMoney(totalRemaining)} remaining
                            </p>
                        </div>
                        {/* Circular Progress */}
                        {totalBudget > 0 && (
                            <div className="relative w-16 h-16">
                                <svg viewBox="0 0 36 36" className="rotate-[-90deg]">
                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                                    <motion.circle
                                        initial={{ strokeDasharray: "0 100" }}
                                        animate={{ strokeDasharray: `${Math.min(usedPercent, 100)} 100` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        cx="18" cy="18" r="15.5" fill="none"
                                        stroke={usedPercent > 100 ? '#FF3B30' : usedPercent > 80 ? '#FF9500' : '#34C759'}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                    {usedPercent}%
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Categories Header */}
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Categories</h3>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddCategory(true);
                        }}
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                        <Plus size={16} />
                        Add Category
                    </button>
                </div>

                {/* Budget Allocation Bar */}
                {totalBudget > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`relative p-4 rounded-[20px] border ${isBudgetOverAllocated ? 'bg-error/10 border-error/30' : 'bg-surface border-border-color'}`}
                    >
                        {/* Guidance Bubble */}
                        {(() => {
                            const isPartial = budgetAllocationPercent > 0;
                            const guidanceKey = isPartial ? 'partial' : 'start';
                            const isDismissed = dismissedStates[guidanceKey];
                            const shouldShow = !isDismissed && budgetAllocationPercent < 100;

                            if (!shouldShow) return null;

                            return (
                                <motion.div
                                    key={guidanceKey} // Animate when switching between messages
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="absolute -top-16 left-0 right-0 z-10 mx-auto w-[90%] md:w-[400px]"
                                >
                                    <div className="bg-[#2A2A40] text-white p-3 rounded-2xl shadow-xl border border-primary/30 flex items-center justify-between gap-3 relative">
                                        {/* Triangle pointer */}
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#2A2A40] border-r border-b border-primary/30 rotate-45"></div>

                                        <div className="flex-1 text-sm font-medium">
                                            {isPartial
                                                ? "You've started! Complete your budget allocation."
                                                : "Start setting up your budget allocation now!"}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Dismiss only the CURRENT state key
                                                const newStates = { ...dismissedStates, [guidanceKey]: true };
                                                setDismissedStates(newStates);
                                                sessionStorage.setItem(`budgetGuidanceDismissed_${guidanceKey}`, 'true');
                                            }}
                                            className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })()}

                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-text-secondary uppercase tracking-wider">Budget Allocation</span>
                            <span className={`text-xs font-semibold ${isBudgetOverAllocated ? 'text-error' : 'text-text-secondary'}`}>
                                {budgetAllocationPercent}% allocated
                            </span>
                        </div>
                        <div className="h-3 bg-border-color rounded-full overflow-hidden mb-2">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(budgetAllocationPercent, 100)}%` }}
                                transition={{ duration: 0.8 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: isBudgetOverAllocated ? '#FF3B30' : budgetAllocationPercent > 80 ? '#FF9500' : '#34C759' }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className={isBudgetOverAllocated ? 'text-error font-semibold' : 'text-text-secondary'}>
                                {formatMoney(totalCategoryBudgets)} allocated
                            </span>
                            <span className={isBudgetOverAllocated ? 'text-error font-semibold' : 'text-success font-semibold'}>
                                {isBudgetOverAllocated
                                    ? `-${formatMoney(Math.abs(budgetAllocationRemaining))} over`
                                    : `${formatMoney(budgetAllocationRemaining)} remaining`
                                }
                            </span>
                        </div>
                        {isBudgetOverAllocated && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-error/20 rounded-lg">
                                <AlertTriangle size={16} className="text-error" />
                                <span className="text-xs text-error">Category budgets exceed your total budget!</span>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Category List */}
                <div className="space-y-4">
                    {categorySpending.map((cat, idx) => {
                        const hasBudget = (cat.monthly_budget || 0) > 0;
                        const usedPct = hasBudget ? (cat.spent / cat.monthly_budget!) * 100 : 0;
                        const remaining = hasBudget ? cat.monthly_budget! - cat.spent : 0;
                        const isOver = remaining < 0;
                        const isWarning = usedPct >= 80 && usedPct < 100;

                        return (
                            <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => openEditModal(cat)}
                                className="p-4 rounded-[24px] bg-surface backdrop-blur-xl border border-border-color shadow-sm cursor-pointer hover:bg-surface-highlight transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                            style={{ backgroundColor: `${cat.color}20` }}
                                        >
                                            {cat.icon}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{cat.name}</p>
                                            {hasBudget && (
                                                <p className="text-xs text-text-secondary">{formatMoney(cat.monthly_budget!)} Limit</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {hasBudget ? (
                                            <p className={`font-bold ${isOver ? 'text-error' : 'text-success'}`}>
                                                {isOver ? `-${formatMoney(Math.abs(remaining))} over` : `${formatMoney(remaining)} left`}
                                            </p>
                                        ) : (
                                            <p className="font-bold">{formatMoney(cat.spent)}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar (only if budget set) */}
                                {hasBudget && (
                                    <>
                                        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                                            <span>{formatMoney(cat.spent)} spent</span>
                                            <span>{Math.round(usedPct)}%</span>
                                        </div>
                                        <div className="h-2 bg-border-color rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(usedPct, 100)}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 }}
                                                className="h-full rounded-full"
                                                style={{
                                                    backgroundColor: isOver ? '#FF3B30' : isWarning ? '#FF9500' : cat.color
                                                }}
                                            />
                                        </div>
                                        {isWarning && !isOver && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-warning">
                                                <AlertTriangle size={12} />
                                                <span>Approaching limit</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Add Category Button */}
                <motion.button
                    onClick={() => {
                        resetForm();
                        setShowAddCategory(true);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-[24px] bg-primary/20 border border-primary/30 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary/30 transition-colors"
                >
                    <Plus size={20} />
                    Add Category
                </motion.button>
            </motion.div>

            {/* Add/Edit Category Modal */}
            <AnimatePresence>
                {(showAddCategory || showEditCategory) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => {
                            setShowAddCategory(false);
                            setShowEditCategory(false);
                            setEditingCategory(null);
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-background rounded-t-[32px] border-t border-border-color overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-border-color flex items-center justify-between">
                                <h3 className="text-lg font-bold">
                                    {showEditCategory ? 'Edit Category' : 'Add Category'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowAddCategory(false);
                                        setShowEditCategory(false);
                                        setEditingCategory(null);
                                    }}
                                    className="p-2 rounded-full hover:bg-surface transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                {/* Budget Allocation Bar in Modal */}
                                {originalBudget > 0 && (
                                    <div className={`p-3 rounded-xl border ${(() => {
                                        // Calculate what allocation would be with current form value
                                        const currentCatBudget = editingCategory?.monthly_budget || 0;
                                        const newCatBudget = categoryBudget ? parseFloat(categoryBudget) : 0;
                                        const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                        const wouldBeOver = projectedTotal > originalBudget;
                                        return wouldBeOver ? 'bg-error/10 border-error/30' : 'bg-surface border-border-color';
                                    })()
                                        }`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-text-secondary">Budget Allocation</span>
                                            <span className="text-xs font-semibold">
                                                {(() => {
                                                    const currentCatBudget = editingCategory?.monthly_budget || 0;
                                                    const newCatBudget = categoryBudget ? parseFloat(categoryBudget) : 0;
                                                    const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                    const pct = originalBudget > 0 ? Math.round((projectedTotal / originalBudget) * 100) : 0;
                                                    return `${pct}%`;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-border-color rounded-full overflow-hidden mb-1">
                                            <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${Math.min((() => {
                                                        const currentCatBudget = editingCategory?.monthly_budget || 0;
                                                        const newCatBudget = categoryBudget ? parseFloat(categoryBudget) : 0;
                                                        const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                        return originalBudget > 0 ? (projectedTotal / originalBudget) * 100 : 0;
                                                    })(), 100)}%`,
                                                    backgroundColor: (() => {
                                                        const currentCatBudget = editingCategory?.monthly_budget || 0;
                                                        const newCatBudget = categoryBudget ? parseFloat(categoryBudget) : 0;
                                                        const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                        const pct = originalBudget > 0 ? (projectedTotal / originalBudget) * 100 : 0;
                                                        return projectedTotal > originalBudget ? '#FF3B30' : pct > 80 ? '#FF9500' : '#34C759';
                                                    })()
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-secondary">
                                                {formatMoney((() => {
                                                    const currentCatBudget = editingCategory?.monthly_budget || 0;
                                                    const newCatBudget = categoryBudget ? parseFloat(categoryBudget) : 0;
                                                    return totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                })())} / {formatMoney(originalBudget)}
                                            </span>
                                            {(() => {
                                                const currentCatBudget = editingCategory?.monthly_budget || 0;
                                                const newCatBudget = categoryBudget ? parseFloat(categoryBudget) : 0;
                                                const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                const remaining = originalBudget - projectedTotal;
                                                if (remaining < 0) {
                                                    return <span className="text-error font-semibold">{formatMoney(Math.abs(remaining))} over!</span>;
                                                }
                                                return <span className="text-success">{formatMoney(remaining)} left</span>;
                                            })()}
                                        </div>
                                    </div>
                                )}
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Category Name</label>
                                    <input
                                        type="text"
                                        value={categoryName}
                                        onChange={(e) => setCategoryName(e.target.value)}
                                        placeholder="e.g. Groceries"
                                        className="w-full px-4 py-3 rounded-xl bg-surface border border-border-color focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                    />
                                </div>

                                {/* Icon Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORY_ICONS.map((icon) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => setCategoryIcon(icon)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${categoryIcon === icon ? 'bg-primary/30 scale-110 ring-2 ring-primary' : 'bg-surface hover:bg-surface-highlight'}`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORY_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setCategoryColor(color)}
                                                className={`w-8 h-8 rounded-full transition-transform ${categoryColor === color ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Budget */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Monthly Budget (Optional)</label>
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border-color focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
                                        <span className="text-text-secondary">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            value={categoryBudget}
                                            onChange={(e) => setCategoryBudget(e.target.value)}
                                            placeholder="0"
                                            className="flex-1 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <p className="text-xs text-text-secondary mt-1">Leave empty to only track spending</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-border-color flex gap-3">
                                {showEditCategory && editingCategory && (
                                    <Button
                                        variant="secondary"
                                        className="!bg-error/10 !text-error !border-error/20 hover:!bg-error/20"
                                        onClick={() => {
                                            handleDeleteCategory(editingCategory.id);
                                            setShowEditCategory(false);
                                            setEditingCategory(null);
                                        }}
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowAddCategory(false);
                                        setShowEditCategory(false);
                                        setEditingCategory(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={showEditCategory ? handleEditCategory : handleAddCategory}
                                    disabled={!categoryName.trim()}
                                    isLoading={submitting}
                                >
                                    {showEditCategory ? 'Save Changes' : 'Add Category'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Wallet Management Modal */}
            <AnimatePresence>
                {showWalletModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-primary/20 transition-colors ${wallet.icon === icon ? 'bg-primary/30' : ''}`}
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
                                                    className={`w-6 h-6 rounded-full transition-transform ${wallet.color === color ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
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
        </div>
    );
}
