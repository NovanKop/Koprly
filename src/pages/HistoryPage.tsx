import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import type { Transaction, Category } from '../types';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { parseISO } from 'date-fns';

interface HistoryPageProps {
    onBack: () => void;
}

const ITEMS_PER_PAGE = 30;

export default function HistoryPage({ onBack }: HistoryPageProps) {
    const { currency, setBottomMenuVisible } = useAppStore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        // Hide bottom menu when this page is active
        setBottomMenuVisible(false);
        loadData();

        return () => {
            // Restore bottom menu when leaving
            setBottomMenuVisible(true);
        };
    }, [setBottomMenuVisible]);

    const loadData = async () => {
        try {
            const [txns, cats] = await Promise.all([
                api.getTransactions(),
                api.getCategories()
            ]);
            // Sort by date descending (newest first)
            const sorted = (txns || []).sort((a, b) =>
                parseISO(b.date).getTime() - parseISO(a.date).getTime()
            );
            setTransactions(sorted);
            setCategories(cats || []);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const getCategoryName = (categoryId: string | null | undefined) => {
        if (!categoryId) return 'General';
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : 'Unknown';
    };

    const getCategoryIcon = (categoryId: string | null | undefined) => {
        if (!categoryId) return '💰';
        const category = categories.find(c => c.id === categoryId);
        return category ? category.icon : '💰';
    };

    // Filter and search transactions
    const filteredTransactions = useMemo(() => {
        if (!searchQuery.trim()) return transactions;

        const query = searchQuery.toLowerCase();
        return transactions.filter(txn => {
            const description = (txn.description || '').toLowerCase();
            const amount = txn.amount.toString();
            const categoryName = getCategoryName(txn.category_id).toLowerCase();

            return description.includes(query) ||
                amount.includes(query) ||
                categoryName.includes(query);
        });
    }, [transactions, searchQuery, categories]);

    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, end);
    }, [filteredTransactions, currentPage]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const formatMoney = (amount: number) => {
        if (currency === 'IDR') {
            return `Rp${amount.toLocaleString('id-ID')}`;
        }
        return `$${amount.toLocaleString('en-US')}`;
    };

    const formatDate = (dateString: string) => {
        const date = parseISO(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        const date = parseISO(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="min-h-screen bg-background text-text-primary pb-6">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border-color">
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-surface rounded-full transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-xl font-bold">History</h1>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-surface border border-border-color rounded-2xl text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="p-4">
                {filteredTransactions.length === 0 ? (
                    <div className="text-center text-text-secondary py-12">
                        {searchQuery ? 'No transactions found' : 'No transaction history'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {paginatedTransactions.map((txn) => {
                            const isIncome = txn.type === 'income';

                            return (
                                <motion.div
                                    key={txn.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="backdrop-blur-xl bg-surface border border-border-color rounded-[20px] p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${isIncome ? 'bg-success/20' : 'bg-surface-highlight'
                                            }`}>
                                            {isIncome ? (
                                                <TrendingUp className="text-success" size={24} />
                                            ) : (
                                                <span>{getCategoryIcon(txn.category_id)}</span>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="font-semibold">
                                                        {txn.description || (isIncome ? 'Income' : getCategoryName(txn.category_id))}
                                                    </div>
                                                    <div className="text-xs text-text-secondary mt-1">
                                                        {formatDate(txn.date)} • {formatTime(txn.date)}
                                                        {!isIncome && txn.category_id && (
                                                            <span> • {getCategoryName(txn.category_id)}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                <div className={`font-bold ${isIncome ? 'text-success' : 'text-error'}`}>
                                                    {isIncome ? '+' : '-'}{formatMoney(txn.amount)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-full hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => goToPage(pageNum)}
                                        className={`min-w-[40px] h-10 rounded-xl font-medium transition-colors ${currentPage === pageNum
                                            ? 'bg-primary text-white'
                                            : 'hover:bg-surface'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-full hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Results Info */}
                <div className="mt-4 text-center text-sm text-text-secondary">
                    Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredTransactions.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </div>
            </div>
        </div>
    );
}
