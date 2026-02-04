import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { CATEGORY_ICONS } from '../lib/constants';
import type { Category, Transaction, Wallet, Profile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, AlertTriangle, Trash2, X, Pencil, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, subMonths, isBefore } from 'date-fns';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/glass/GlassCard';
import { ProgressBarGlow } from '../components/glass/ProgressBarGlow';
import { BudgetSkeleton } from '../components/skeletons/BudgetSkeleton';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SmartResetModal } from '../components/modals/SmartResetModal';

import { CategoryIcon } from '../components/ui/CategoryIcon';
import { MonthSelector } from '../components/MonthSelector';
import { formatIDR, parseIDR } from '../utils/currencyFormatter';
import { AddCategoryModal } from '../components/AddCategoryModal';


// Helper to generate last 12 months for dropdown - Deprecated/Replaced
// const getRecentMonths = () => {
//    return Array.from({ length: 12 }, (_, i) => subMonths(new Date(), i));
// };


interface BudgetPageProps {
    onBack: () => void;
}

export default function BudgetPage({ onBack }: BudgetPageProps) {
    const { user } = useAuth();
    const { currency, setBottomMenuVisible, showPrivacy, setShowPrivacy } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [availableMonths, setAvailableMonths] = useState<Date[]>([new Date()]);

    // Derived state for data protection
    const isPastMonth = isBefore(endOfMonth(selectedMonth), startOfMonth(new Date()));
    const isReadOnly = isPastMonth;

    const handleMonthSelect = (date: Date) => {
        setLoading(true);
        setSelectedMonth(date);
        // Simulate network delay for "Skeleton Loading" effect
        setTimeout(() => setLoading(false), 600);
    };

    // Category Modal States
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Budget Edit Limit State
    const [showEditBudget, setShowEditBudget] = useState(false);

    // Manage Bottom Menu visibility
    useEffect(() => {
        const isAnyModalOpen = showCategoryModal || showEditBudget;
        setBottomMenuVisible(!isAnyModalOpen);

        return () => setBottomMenuVisible(true); // Reset on unmount
    }, [showCategoryModal, showEditBudget, setBottomMenuVisible]);



    const currencySymbol = currency === 'IDR' ? 'Rp' : '$';

    useEffect(() => {
        window.scrollTo(0, 0);
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch earliest date for month selector logic
            const earliestDate = await api.getEarliestTransactionDate();

            // Generate months from today back to earliestDate (max 12)
            const today = new Date();
            const months: Date[] = [];
            let current = startOfMonth(today);
            const stopDate = earliestDate ? startOfMonth(earliestDate) : current;

            // Safety: Ensure we always show current month at minimum
            months.push(current);

            // Generate previous months
            for (let i = 1; i < 12; i++) {
                const prev = subMonths(current, 1);
                if (isBefore(prev, stopDate)) break;
                months.push(prev);
                current = prev;
            }
            setAvailableMonths(months);

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

    // Original Budget = STABLE anchor from user's profile (total_budget)
    // This is what the user set during onboarding - NOT affected by transactions
    // Falls back to dynamic calculation only if total_budget is not set
    const originalBudget = (profile?.total_budget && profile.total_budget > 0)
        ? profile.total_budget
        : (liveBalance + allExpenses - allIncome);

    // Monthly spending for progress display
    const totalSpent = categorySpending.reduce((acc, curr) => acc + curr.spent, 0);


    // Budget Allocation = sum of all category budgets vs ORIGINAL Budget (not live balance)
    // This is NOT affected by expenses/income - only by setting category budgets
    const totalCategoryBudgets = categories.reduce((sum, c) => sum + (c.monthly_budget || 0), 0);

    // Track previous total to detect distinct changes
    const prevTotalRef = useRef(0);

    // Congratulation Effect - Fires ONLY when user returns to dashboard with 100% allocation
    useEffect(() => {
        // Do not trigger while editing/adding (wait until modal closes)
        if (showCategoryModal) return;

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
    }, [totalCategoryBudgets, originalBudget, showCategoryModal]);
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

    const handleSaveSmartReset = async (amount: number, day: number) => {
        if (!user) return;
        setSubmitting(true);
        try {
            await api.updateProfile({
                total_budget: amount,
                reset_day: day
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
        if (isReadOnly) return;
        setEditingCategory(cat);
        setShowCategoryModal(true);
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
            <div className="px-6 mb-8">
                <MonthSelector
                    selectedMonth={selectedMonth}
                    months={availableMonths}
                    onSelect={handleMonthSelect}
                />
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
                {/* Total Balance Card */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                    }}
                >
                    <div className="relative px-6 py-6 rounded-[32px] overflow-hidden glass-panel bg-white/70 dark:bg-[#151515]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] dark:shadow-2xl">
                        {/* Background Gradient Mesh */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                        <div className="relative z-10">
                            {/* Header With Eye Icon */}
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">TOTAL BALANCE</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPrivacy(!showPrivacy);
                                        }}
                                        className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                                    >
                                        {showPrivacy ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Main Balance and Chart */}
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-4xl font-bold font-numeric tracking-tight text-text-primary">
                                    {showPrivacy ? formatMoney(liveBalance) : 'Rp •••••••'}
                                </h2>

                                {/* Circular Chart */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="relative w-14 h-14">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            {/* Background Circle */}
                                            <path className="text-black/5 dark:text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                            {/* Progress Circle */}
                                            <path
                                                className="text-primary transition-all duration-1000 ease-out"
                                                strokeDasharray={`${Math.min(originalBudget > 0 ? (totalSpent / originalBudget) * 100 : 0, 100)}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-[10px] font-bold font-numeric text-text-primary">
                                                {Math.round(originalBudget > 0 ? (totalSpent / originalBudget) * 100 : 0)}%
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-text-secondary">Used</span>
                                </div>
                            </div>

                            {/* Wallet Balance Slider */}
                            <div className="w-full">
                                <p className="text-sm font-medium text-text-secondary mb-3">Wallet Balance:</p>
                                <div className="relative">
                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 mask-linear-fade pr-4">
                                        {wallets.map(w => (
                                            <div
                                                key={w.id}
                                                className="px-4 py-2.5 rounded-xl whitespace-nowrap flex-shrink-0 flex items-center gap-2 shadow-lg border border-white/5 transition-transform hover:scale-[1.02]"
                                                style={{ backgroundColor: w.color || '#007AFF' }}
                                            >
                                                <span className="text-xs font-bold text-white tracking-wide">{w.name}</span>
                                                <span className="text-xs font-numeric text-white/90 bg-black/20 px-1.5 py-0.5 rounded-md">
                                                    {showPrivacy ? formatMoney(Number(w.balance)) : '•••'}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="w-14 flex-shrink-0" />
                                    </div>
                                    {/* Scroll Indicator - Adaptive Glass Fade - Only show if > 1 item */}
                                    {wallets.length > 1 && (
                                        <div className="absolute right-0 top-0 bottom-2 w-20 pointer-events-none flex items-center justify-end pr-2 rounded-r-xl">
                                            <ChevronRight className="text-green-500 w-6 h-6 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            </div>
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
                                        {showPrivacy ? formatMoney(originalBudget) : 'Rp •••••••'}
                                    </h2>
                                    <div className="mt-1">
                                        <p className="text-sm text-text-secondary">
                                            {showPrivacy ? formatMoney(totalCategoryBudgets) : '•••'} / {showPrivacy ? formatMoney(originalBudget) : '•••'} allocated
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

                <div id="budget-categories" className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Categories</h3>
                    {!isReadOnly && (
                        <button
                            onClick={() => {
                                setEditingCategory(null);
                                setShowCategoryModal(true);
                            }}
                            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                        >
                            <Plus size={16} />
                            Add Category
                        </button>
                    )}
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
                                            <CategoryIcon
                                                iconName={cat.icon}
                                                variant="default"
                                                categoryColor={cat.color}
                                            />

                                            <div>
                                                <p className="font-semibold">{cat.name}</p>
                                                {hasBudget && (
                                                    <p className="text-xs text-text-secondary font-numeric">{showPrivacy ? formatMoney(cat.monthly_budget!) : '•••'} Limit</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {hasBudget ? (
                                                <p className={`font-bold font-numeric ${isOver ? 'text-error' : 'text-success'}`}>
                                                    {showPrivacy
                                                        ? (isOver ? `-${formatMoney(Math.abs(remaining))} over` : `${formatMoney(remaining)} left`)
                                                        : (isOver ? '-••• over' : '••• left')
                                                    }
                                                </p>
                                            ) : (
                                                <p className="font-bold font-numeric">{showPrivacy ? formatMoney(cat.spent) : '•••'}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Bar (only if budget set) */}
                                    {hasBudget && (
                                        <>
                                            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                                                <span>{showPrivacy ? formatMoney(cat.spent) : '•••'} spent</span>
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

            {/* Category Modal - Shared Component */}
            <AddCategoryModal
                isOpen={showCategoryModal}
                onClose={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                }}
                onSuccess={async () => {
                    await loadData();
                }}
                user_id={user?.id || ''}
                currencySymbol={currencySymbol}
                originalBudget={originalBudget}
                totalCategoryBudgets={totalCategoryBudgets}
                initialCategory={editingCategory}
                transactions={transactions}
            />

            {/* Smart Reset Budget Modal */}
            <SmartResetModal
                isOpen={showEditBudget}
                onClose={() => setShowEditBudget(false)}
                onSave={handleSaveSmartReset}
                currentAmount={originalBudget}
                currentResetDay={profile?.reset_day || 1}
                currencySymbol={currencySymbol}
                isReadOnly={isReadOnly}
                selectedMonth={selectedMonth}
            />
        </div >
    );
}
