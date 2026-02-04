import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import type { Category, Transaction } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, Filter, Loader2 } from 'lucide-react';
import { parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { formatDate } from '../utils/dateFormatter';

interface SpendingCategoryPageProps {
    onBack: () => void;
}

type DateFilter = '1d' | '7d' | '30d';

export default function SpendingCategoryPage({ onBack }: SpendingCategoryPageProps) {
    const { currency, setBottomMenuVisible, dateFormat, theme } = useAppStore();
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [dateFilter, setDateFilter] = useState<DateFilter>('7d');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [cats, txns] = await Promise.all([
                api.getCategories(),
                api.getTransactions()
            ]);
            setCategories(cats || []);
            setTransactions(txns || []);
        } catch (error: unknown) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Hide bottom menu when this page is active
        setBottomMenuVisible(false);
        window.scrollTo(0, 0);
        loadData();

        return () => {
            // Restore bottom menu when leaving
            setBottomMenuVisible(true);
        };
    }, [setBottomMenuVisible, loadData]);

    const toggleCategory = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    const categoriesWithStats = useMemo(() => {
        const now = new Date();
        const filterDays = dateFilter === '1d' ? 1 : dateFilter === '7d' ? 7 : 30;
        const startDate = startOfDay(subDays(now, filterDays));
        const endDate = endOfDay(now);

        return categories.map(category => {
            const filteredTxns = transactions.filter(txn => {
                const txnDate = parseISO(txn.date);
                return isWithinInterval(txnDate, { start: startDate, end: endDate }) &&
                    txn.category_id === category.id &&
                    txn.type === 'expense';
            });

            const spending = filteredTxns.reduce((sum, txn) => sum + txn.amount, 0);
            const budget = category.monthly_budget || 0;
            const progress = budget > 0 ? Math.min((spending / budget) * 100, 100) : 0;

            return {
                ...category,
                spending,
                filteredTxns,
                budget,
                progress
            };
        }).filter(cat => cat.spending > 0 || cat.budget > 0);
    }, [categories, transactions, dateFilter]);

    const formatMoney = (amount: number) => {
        if (currency === 'IDR') {
            return `Rp${amount.toLocaleString('id-ID')}`;
        }
        return `$${amount.toLocaleString('en-US')}`;
    };



    const filterOptions = [
        { value: '1d' as DateFilter, label: 'Last 1 Day' },
        { value: '7d' as DateFilter, label: 'Last 7 Days' },
        { value: '30d' as DateFilter, label: 'Last 30 Days' }
    ];

    return (
        <div className="min-h-screen bg-background text-text-primary pb-6">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border-color">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-surface rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                            aria-label="Go back to dashboard"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-xl font-bold">Spending Categories</h1>
                    </div>

                    {/* Filter Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className="p-2 hover:bg-surface rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                            aria-label="Filter spending by date range"
                        >
                            <Filter size={20} />
                        </button>

                        {/* Filter Dropdown */}
                        <AnimatePresence>
                            {showFilterMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className={`absolute right-0 mt-2 w-48 border rounded-2xl shadow-xl overflow-hidden z-50 ${theme === 'light'
                                        ? 'bg-white border-gray-100'
                                        : 'bg-[#151515] border-white/10'
                                        }`}
                                >
                                    {filterOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setDateFilter(option.value);
                                                setShowFilterMenu(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between group ${dateFilter === option.value
                                                ? (theme === 'light' ? 'bg-emerald-50 text-emerald-600 font-bold' : 'bg-primary/10 text-primary font-bold')
                                                : (theme === 'light' ? 'text-gray-900 hover:bg-gray-50' : 'text-gray-300 hover:bg-white/5')
                                                }`}
                                        >
                                            <span>{option.label}</span>
                                            {dateFilter === option.value && (
                                                <motion.div
                                                    layoutId="activeFilter"
                                                    className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-emerald-600' : 'bg-primary'}`}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Categories List */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center text-text-secondary py-12">
                        No categories found
                    </div>
                ) : (
                    categoriesWithStats.map((category: Category & { spending: number; budget: number; progress: number; filteredTxns: Transaction[] }) => {
                        const isExpanded = expandedCategories.has(category.id);
                        const { spending, filteredTxns, budget, progress } = category;

                        return (
                            <motion.div
                                key={category.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="backdrop-blur-xl bg-surface border border-border-color rounded-[24px] overflow-hidden shadow-sm"
                            >
                                {/* Category Header */}
                                <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="w-full p-4 flex items-center gap-4 hover:bg-surface-highlight/40 transition-colors text-left focus:outline-none"
                                    aria-expanded={isExpanded}
                                    aria-label={`${category.name}, total spending ${formatMoney(spending)}`}
                                >
                                    <CategoryIcon
                                        iconName={category.icon}
                                        variant="large"
                                        categoryColor={category.color}
                                    />

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-bold text-base">{category.name}</span>
                                            <span className={`font-black tracking-tight ${spending > 0 ? 'text-error' : 'text-text-primary'}`}>
                                                {spending > 0 ? '-' : ''}{formatMoney(spending)}
                                            </span>
                                        </div>

                                        {budget > 0 && (
                                            <div className="space-y-1.5">
                                                <div className="w-full bg-surface-highlight/30 rounded-full h-1.5 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                                        className={`h-full rounded-full ${progress >= 100 ? 'bg-error' : progress >= 80 ? 'bg-warning' : 'bg-success'
                                                            } shadow-[0_0_10px_rgba(34,197,94,0.3)]`}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-text-secondary font-bold uppercase tracking-tighter">
                                                    <span>{formatMoney(spending)} spent</span>
                                                    <span>Target: {formatMoney(budget)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <motion.div
                                        animate={{ rotate: isExpanded ? 90 : 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        <ChevronRight size={18} className="text-text-secondary opacity-60" />
                                    </motion.div>
                                </button>

                                {/* Expanded Transactions */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-t border-border-color"
                                        >
                                            <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                                                {filteredTxns.length === 0 ? (
                                                    <div className="text-center text-text-secondary py-4 text-sm">
                                                        No transactions in the selected period
                                                    </div>
                                                ) : (
                                                    filteredTxns.map((txn: Transaction) => (
                                                        <div
                                                            key={txn.id}
                                                            className="flex items-center justify-between p-3 bg-surface-highlight/50 hover:bg-surface-highlight transition-colors rounded-xl"
                                                        >
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="font-medium text-sm text-text-primary">{txn.description || 'No description'}</div>
                                                                <div className="text-[11px] text-text-secondary font-medium">{formatDate(txn.date, dateFormat)}</div>
                                                            </div>
                                                            <div className="font-bold text-error text-sm">-{formatMoney(txn.amount)}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
