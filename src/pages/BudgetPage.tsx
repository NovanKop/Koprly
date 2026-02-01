import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Category, Transaction, Wallet, Profile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronDown, AlertTriangle, Trash2, X, Pencil } from 'lucide-react';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/glass/GlassCard';
import { ProgressBarGlow } from '../components/glass/ProgressBarGlow';
import { BudgetSkeleton } from '../components/skeletons/BudgetSkeleton';

interface BudgetPageProps {
    onBack: () => void;
}

const CATEGORY_ICONS = ['🛒', '🍽️', '🚗', '🏠', '🎬', '🏥', '👕', '💼', '✈️', '📚', '💊', '🎮', '☕', '🔌', '🎁'];
const CATEGORY_COLORS = ['#34C759', '#FF9500', '#007AFF', '#5856D6', '#FF2D55', '#FF3B30', '#AF52DE', '#8E8E93', '#00C7BE', '#FFD60A'];

export default function BudgetPage({ onBack }: BudgetPageProps) {
    const { user } = useAuth();
    const { currency, setBottomMenuVisible } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedMonth] = useState(new Date());
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    // Category Modal States
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showEditCategory, setShowEditCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Form States
    const [categoryName, setCategoryName] = useState('');
    const [categoryIcon, setCategoryIcon] = useState('🛒');
    const [categoryColor, setCategoryColor] = useState('#34C759');
    const [categoryBudget, setCategoryBudget] = useState('');

    // Budget Edit Limit State
    const [showEditBudget, setShowEditBudget] = useState(false);
    const [newBudgetLimit, setNewBudgetLimit] = useState('');
    const [resetDay, setResetDay] = useState<number>(1);


    // Manage Bottom Menu visibility
    useEffect(() => {
        const isAnyModalOpen = showAddCategory || showEditCategory || showEditBudget;
        setBottomMenuVisible(!isAnyModalOpen);

        return () => setBottomMenuVisible(true); // Reset on unmount
    }, [showAddCategory, showEditCategory, showEditBudget, setBottomMenuVisible]);

    const currencySymbol = currency === 'IDR' ? 'Rp' : '$';

    useEffect(() => {
        window.scrollTo(0, 0);
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, txns, wlts, prof] = await Promise.all([
                api.getCategories(),
                api.getTransactions(),
                api.getWallets(),
                api.getProfile()
            ]);
            setCategories(cats || []);
            setTransactions(txns || []);
            setWallets(wlts || []);
            setProfile(prof);
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

    // Original Budget = STABLE anchor from user's profile (total_budget)
    // This is what the user set during onboarding - NOT affected by transactions
    // Falls back to dynamic calculation only if total_budget is not set
    const originalBudget = (profile?.total_budget && profile.total_budget > 0)
        ? profile.total_budget
        : (liveBalance + allExpenses - allIncome);

    // Monthly spending for progress display
    const totalSpent = categorySpending.reduce((acc, curr) => acc + curr.spent, 0);
    const totalRemaining = liveBalance; // Live balance is what remains
    const usedPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;


    // Budget Allocation = sum of all category budgets vs ORIGINAL Budget (not live balance)
    // This is NOT affected by expenses/income - only by setting category budgets
    const totalCategoryBudgets = categories.reduce((sum, c) => sum + (c.monthly_budget || 0), 0);

    // Track previous total to detect distinct changes
    const prevTotalRef = useRef(0);

    // Congratulation Effect - Fires ONLY when user returns to dashboard with 100% allocation
    useEffect(() => {
        // Do not trigger while editing/adding (wait until modal closes)
        if (showEditCategory || showAddCategory) return;

        const isFullBudget = originalBudget > 0 && Math.abs(totalCategoryBudgets - originalBudget) < 1;
        // Check if value actually changed (to avoid re-firing on random renders)
        const hasChanged = Math.abs(prevTotalRef.current - totalCategoryBudgets) > 1;

        if (isFullBudget && hasChanged) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#34C759', '#32ADE6', '#FFCC00'],
                disableForReducedMotion: true,
                zIndex: 9999
            });
        }

        // Update ref for next comparison
        prevTotalRef.current = totalCategoryBudgets;
    }, [totalCategoryBudgets, originalBudget, showEditCategory, showAddCategory]);
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

            // Update the local state with the server response (not optimistic)
            setCategories(prevCategories =>
                prevCategories.map(cat =>
                    cat.id === editingCategory.id ? updatedCategory : cat
                )
            );

            // No loadData() here - the above update is sufficient and avoids race condition

            setEditingCategory(null);
            setShowEditCategory(false);
        } catch (error) {
            console.error('Error updating category:', error);
            alert('Failed to update category');
            // Reload data on error to revert any partial changes
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

    const handleUpdateBudgetLimit = async () => {
        if (!user || !newBudgetLimit) return;
        setSubmitting(true);
        try {
            await api.updateProfile({
                total_budget: parseFloat(newBudgetLimit),
                reset_day: resetDay
            });
            await loadData();
            setShowEditBudget(false);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#34C759', '#32ADE6']
            });
        } catch (error) {
            console.error('Failed to update budget:', error);
            alert('Failed to update budget limit');
        } finally {
            setSubmitting(false);
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
        return <BudgetSkeleton />;
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
                >
                    <div className="relative px-6 py-5 rounded-[32px] overflow-hidden glass-panel bg-white/70 backdrop-blur-xl dark:bg-white/5 dark:backdrop-blur-none border border-white/40 dark:border-white/10 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] dark:shadow-2xl transition-all duration-300 hover:shadow-primary/10">
                        {/* Background Gradient Mesh - Dynamic based on theme */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/20 dark:bg-blue-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-green-500/20 dark:bg-green-500/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3" />

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs text-text-secondary uppercase tracking-wider">Total Balance</p>
                                </div>
                                <h2 className="text-3xl font-bold font-numeric">
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
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-numeric">
                                        {usedPercent}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>


                {/* Budget Allocation Bar - Moved Here */}
                {originalBudget > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-20"
                    >
                        <div
                            id="budget-limit-card"
                            onClick={() => {
                                setNewBudgetLimit(originalBudget.toString());
                                setResetDay(profile?.reset_day || 1);
                                setShowEditBudget(true);
                            }}
                            className={`relative px-6 py-5 rounded-[32px] overflow-hidden glass-panel bg-white/70 backdrop-blur-xl dark:bg-white/5 dark:backdrop-blur-none border border-white/40 dark:border-white/10 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] dark:shadow-2xl transition-all duration-300 hover:shadow-primary/10 cursor-pointer group ${isBudgetOverAllocated ? '!bg-error/10 !border-error/30' : ''}`}
                        >
                            {/* Background Gradient Mesh - Dynamic based on theme */}
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/20 dark:bg-blue-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-green-500/20 dark:bg-green-500/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3" />

                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-xs text-text-secondary uppercase tracking-wider">Monthly Budget Limit</p>
                                        <Pencil size={12} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <h2 className="text-3xl font-bold font-numeric">
                                        {formatMoney(originalBudget)}
                                    </h2>
                                    <div className="mt-1">
                                        <p className="text-sm text-text-secondary">
                                            {formatMoney(totalCategoryBudgets)} / {formatMoney(originalBudget)} allocated
                                        </p>
                                    </div>
                                </div>

                                {/* Circular Progress */}
                                <div className="relative w-16 h-16">
                                    <svg viewBox="0 0 36 36" className="rotate-[-90deg]">
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                                        <motion.circle
                                            initial={{ strokeDasharray: "0 100" }}
                                            animate={{ strokeDasharray: `${Math.min(budgetAllocationPercent, 100)} 100` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            cx="18" cy="18" r="15.5" fill="none"
                                            stroke={isBudgetOverAllocated ? '#FF3B30' : budgetAllocationPercent > 80 ? '#FF9500' : '#34C759'}
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold font-numeric ${isBudgetOverAllocated ? 'text-error' : ''}`}>
                                        {budgetAllocationPercent}%
                                    </span>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                )}

                {/* Categories Header */}
                <div id="budget-categories" className="flex items-center justify-between">
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
                            >
                                <GlassCard
                                    onClick={() => openEditModal(cat)}
                                    className="p-4 rounded-[20px]"
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
                                                    <p className="text-xs text-text-secondary font-numeric">{formatMoney(cat.monthly_budget!)} Limit</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {hasBudget ? (
                                                <p className={`font-bold font-numeric ${isOver ? 'text-error' : 'text-success'}`}>
                                                    {isOver ? `-${formatMoney(Math.abs(remaining))} over` : `${formatMoney(remaining)} left`}
                                                </p>
                                            ) : (
                                                <p className="font-bold font-numeric">{formatMoney(cat.spent)}</p>
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
                                            <ProgressBarGlow
                                                progress={usedPct}
                                                color={isOver ? '#FF3B30' : isWarning ? '#FF9500' : cat.color}
                                                height={8}
                                            />
                                            {isWarning && !isOver && (
                                                <div className="flex items-center gap-1 mt-2 text-xs text-warning">
                                                    <AlertTriangle size={12} />
                                                    <span>Approaching limit</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </GlassCard>
                            </motion.div>
                        );
                    })}
                </div>
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
                                            type="text"
                                            value={categoryBudget.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                                                setCategoryBudget(rawValue);
                                            }}
                                            placeholder="0"
                                            className="flex-1 bg-transparent outline-none"
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

            {/* Edit Budget Limit Modal */}
            <AnimatePresence>
                {showEditBudget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
                        onClick={() => setShowEditBudget(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-surface border border-border-color w-full max-w-md rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Edit Budget Limit</h3>
                                <button
                                    onClick={() => setShowEditBudget(false)}
                                    className="p-2 bg-surface-highlight rounded-full text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Monthly Spending Limit</label>
                                    <div className="flex items-center bg-surface-highlight rounded-2xl px-4 py-3 border border-border-color focus-within:border-primary transition-colors">
                                        <span className="text-text-secondary font-semibold mr-2">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            value={newBudgetLimit}
                                            onChange={(e) => setNewBudgetLimit(e.target.value)}
                                            className="bg-transparent border-none outline-none w-full text-lg font-bold text-text-primary placeholder:text-text-secondary/50"
                                            placeholder="0"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-text-secondary mt-2">
                                        This is the total amount you plan to spend across all categories this month.
                                    </p>
                                </div>

                                {/* Reset Date Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        Budget Reset Date
                                        <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                            {resetDay === -1 ? 'Last Day' : `${resetDay}${['st', 'nd', 'rd'][((resetDay % 10) - 1)] || 'th'}`}
                                        </span>
                                    </label>

                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x pt-1">
                                        {/* Last Day Button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setResetDay(-1); }}
                                            className={`flex-none px-4 py-2 rounded-xl border text-sm font-medium transition-all snap-center whitespace-nowrap ${resetDay === -1
                                                ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                                : 'bg-surface-highlight border-transparent text-text-secondary hover:bg-white/5'
                                                }`}
                                        >
                                            Last Day
                                        </button>

                                        {/* days 1-31 */}
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                            <button
                                                key={day}
                                                onClick={(e) => { e.stopPropagation(); setResetDay(day); }}
                                                className={`flex-none w-10 h-10 rounded-xl border text-sm font-medium transition-all snap-center flex items-center justify-center ${resetDay === day
                                                    ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                                    : 'bg-surface-highlight border-transparent text-text-secondary hover:bg-white/5'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-text-secondary mt-2">
                                        Your budget will reset every {resetDay === -1 ? 'last day' : `${resetDay}${['st', 'nd', 'rd'][((resetDay % 10) - 1)] || 'th'}`} of the month.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleUpdateBudgetLimit}
                                    disabled={submitting || !newBudgetLimit}
                                    className="w-full py-4 text-base rounded-2xl"
                                >
                                    {submitting ? 'Saving...' : 'Save Limit'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
