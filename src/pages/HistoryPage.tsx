import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import type { Transaction, Category, Wallet } from '../types';
import { TransactionItem } from '../components/TransactionItem';
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { useTransactionManager } from '../hooks/useTransactionManager';

interface HistoryPageProps {
    onBack: () => void;
}

const ITEMS_PER_PAGE = 30;

export default function HistoryPage({ onBack }: HistoryPageProps) {
    const { user } = useAuth();
    const { currency, setBottomMenuVisible } = useAppStore();

    // Data State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showEditTransaction, setShowEditTransaction] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const loadData = async () => {
        if (!user) return;
        try {
            const [txns, cats, walletsData] = await Promise.all([
                api.getTransactions(),
                api.getCategories(),
                api.getWallets()
            ]);
            // Sort by date descending (newest first)
            const sorted = (txns || []).sort((a, b) =>
                parseISO(b.date).getTime() - parseISO(a.date).getTime()
            );
            setTransactions(sorted);
            setCategories(cats || []);
            setWallets(walletsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const { updateTransaction, deleteTransaction, submitting: transactionSubmitting } = useTransactionManager({
        wallets,
        userId: user?.id,
        onRefresh: loadData
    });

    useEffect(() => {
        // Hide bottom menu when this page is active
        setBottomMenuVisible(false);
        window.scrollTo(0, 0);
        loadData();

        return () => {
            // Restore bottom menu when leaving
            setBottomMenuVisible(true);
        };
    }, [setBottomMenuVisible, user]);

    // Handle Edit Actions
    const handleEditClick = (txn: Transaction) => {
        setEditingTransaction(txn);
        setShowEditTransaction(true);
    };

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

    // Filter and search transactions
    const filteredTransactions = useMemo(() => {
        if (!searchQuery.trim()) return transactions;

        const query = searchQuery.toLowerCase();
        return transactions.filter(txn => {
            const description = (txn.description || '').toLowerCase();
            const amount = txn.amount.toString();
            const category = categories.find(c => c.id === txn.category_id);
            const categoryName = (category?.name || 'General').toLowerCase();

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

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="min-h-screen bg-background text-text-primary pb-6 relative">
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
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="text-center text-text-secondary py-12">
                        {searchQuery ? 'No transactions found' : 'No transaction history'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {paginatedTransactions.map((txn, idx) => {
                            // Enriched transaction with category object for the component
                            const txnWithCategory = {
                                ...txn,
                                category: categories.find(c => c.id === txn.category_id)
                            };

                            return (
                                <TransactionItem
                                    key={txn.id}
                                    transaction={txnWithCategory}
                                    currency={currency}
                                    variant="history"
                                    index={idx}
                                    onEdit={() => handleEditClick(txn)}
                                />
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

            {/* Edit Modal */}
            <EditTransactionModal
                isOpen={showEditTransaction}
                onClose={() => setShowEditTransaction(false)}
                transaction={editingTransaction}
                categories={categories}
                wallets={wallets}
                currencySymbol={currency === 'IDR' ? 'Rp' : '$'}
                onUpdate={handleUpdateSubmit}
                onDelete={handleDeleteSubmit}
                isLoading={transactionSubmitting}
            />
        </div>
    );
}
