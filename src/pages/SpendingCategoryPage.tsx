import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import type { Category, Transaction } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, Filter, Loader2 } from 'lucide-react';
import { parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';

interface SpendingCategoryPageProps {
    onBack: () => void;
}

type DateFilter = '1d' | '7d' | '30d';

export default function SpendingCategoryPage({ onBack }: SpendingCategoryPageProps) {
    const { currency, setBottomMenuVisible } = useAppStore();
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [dateFilter, setDateFilter] = useState<DateFilter>('7d');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Hide bottom menu when this page is active
        setBottomMenuVisible(false);
        window.scrollTo(0, 0);
        loadData();

        return () => {
            // Restore bottom menu when leaving
            setBottomMenuVisible(true);
        };
    }, [setBottomMenuVisible]);

    const loadData = async () => {
        try {
            const [cats, txns] = await Promise.all([
                api.getCategories(),
                api.getTransactions()
            ]);
            setCategories(cats || []);
            setTransactions(txns || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    const getFilteredTransactions = (categoryId: string) => {
        const now = new Date();
        const filterDays = dateFilter === '1d' ? 1 : dateFilter === '7d' ? 7 : 30;
        const startDate = startOfDay(subDays(now, filterDays));
        const endDate = endOfDay(now);

        return transactions.filter(txn => {
            const txnDate = parseISO(txn.date);
            const withinDateRange = isWithinInterval(txnDate, { start: startDate, end: endDate });
            const matchesCategory = txn.category_id === categoryId;
            const isExpense = txn.type === 'expense';

            return withinDateRange && matchesCategory && isExpense;
        });
    };

    const getCategorySpending = (categoryId: string) => {
        const filtered = getFilteredTransactions(categoryId);
        return filtered.reduce((sum, txn) => sum + txn.amount, 0);
    };

    const formatMoney = (amount: number) => {
        if (currency === 'IDR') {
            return `Rp${amount.toLocaleString('id-ID')}`;
        }
        return `$${amount.toLocaleString('en-US')}`;
    };

    const formatDate = (dateString: string) => {
        const date = parseISO(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
                            className="p-2 hover:bg-surface rounded-full transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-xl font-bold">Spending Categories</h1>
                    </div>

                    {/* Filter Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className="p-2 hover:bg-surface rounded-full transition-colors"
                        >
                            <Filter size={20} />
                        </button>

                        {/* Filter Dropdown */}
                        <AnimatePresence>
                            {showFilterMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 mt-2 w-48 backdrop-blur-xl bg-surface/95 border border-border-color rounded-2xl shadow-xl overflow-hidden"
                                >
                                    {filterOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setDateFilter(option.value);
                                                setShowFilterMenu(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left transition-colors ${dateFilter === option.value
                                                ? 'bg-primary/20 text-primary'
                                                : 'hover:bg-surface-highlight'
                                                }`}
                                        >
                                            {option.label}
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
                    categories.map((category) => {
                        const isExpanded = expandedCategories.has(category.id);
                        const spending = getCategorySpending(category.id);
                        const filteredTxns = getFilteredTransactions(category.id);
                        const budget = category.monthly_budget || 0;
                        const progress = budget > 0 ? Math.min((spending / budget) * 100, 100) : 0;

                        return (
                            <motion.div
                                key={category.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="backdrop-blur-xl bg-surface border border-border-color rounded-[20px] overflow-hidden"
                            >
                                {/* Category Header */}
                                <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="w-full p-4 flex items-center gap-3 hover:bg-surface-highlight transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-surface-highlight flex items-center justify-center text-2xl">
                                        {category.icon}
                                    </div>

                                    <div className="flex-1 text-left">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold">{category.name}</span>
                                            <span className={`font-bold ${spending > 0 ? 'text-error' : 'text-text-primary'}`}>
                                                {spending > 0 ? '-' : ''}{formatMoney(spending)}
                                            </span>
                                        </div>

                                        {budget > 0 && (
                                            <div className="space-y-1">
                                                <div className="w-full bg-surface-highlight rounded-full h-2 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.5 }}
                                                        className={`h-full rounded-full ${progress >= 100 ? 'bg-error' : progress >= 80 ? 'bg-warning' : 'bg-success'
                                                            }`}
                                                    />
                                                </div>
                                                <div className="text-xs text-text-secondary">
                                                    {formatMoney(spending)} of {formatMoney(budget)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <motion.div
                                        animate={{ rotate: isExpanded ? 90 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronRight size={20} className="text-text-secondary" />
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
                                            <div className="p-4 space-y-2">
                                                {filteredTxns.length === 0 ? (
                                                    <div className="text-center text-text-secondary py-4 text-sm">
                                                        No transactions in the selected period
                                                    </div>
                                                ) : (
                                                    filteredTxns.map((txn) => (
                                                        <div
                                                            key={txn.id}
                                                            className="flex items-center justify-between p-3 bg-surface-highlight rounded-xl"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-xl">
                                                                    {category.icon}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium">{txn.description || 'No description'}</div>
                                                                    <div className="text-xs text-text-secondary">{formatDate(txn.date)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="font-bold text-error">-{formatMoney(txn.amount)}</div>
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
