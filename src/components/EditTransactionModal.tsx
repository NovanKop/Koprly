import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DatePicker } from './ui/DatePicker';
import { CategorySelector } from './CategorySelector';
import { WalletSelector } from './WalletSelector';
import type { Transaction, Category, Wallet } from '../types';

interface EditTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    categories: Category[];
    wallets: Wallet[];
    currencySymbol: string;
    onUpdate: (original: Transaction, updates: any) => Promise<void>;
    onDelete: (transaction: Transaction) => Promise<void>;
    isLoading?: boolean;
}

export function EditTransactionModal({
    isOpen,
    onClose,
    transaction,
    categories,
    wallets,
    currencySymbol,
    onUpdate,
    onDelete,
    isLoading = false
}: EditTransactionModalProps) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [walletId, setWalletId] = useState('');
    const [categoryId, setCategoryId] = useState('');

    useEffect(() => {
        if (transaction && isOpen) {
            setAmount(transaction.amount.toString());
            setDescription(transaction.description || '');
            setDate(transaction.date);
            setWalletId(transaction.wallet_id || '');
            setCategoryId(transaction.category_id || '');
        }
    }, [transaction, isOpen]);

    const handleSubmit = async () => {
        if (!transaction || !amount) return;
        await onUpdate(transaction, {
            amount: parseFloat(amount),
            description,
            date,
            wallet_id: walletId,
            category_id: categoryId
        });
        onClose();
    };

    const handleDelete = async () => {
        if (!transaction) return;
        await onDelete(transaction);
        onClose();
    };

    if (!isOpen || !transaction) return null;

    const isExpense = transaction.type === 'expense';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" onClick={onClose}>
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-[24px] bg-surface backdrop-blur-xl border border-border-color overflow-hidden max-h-[90vh] overflow-y-auto shadow-2xl"
                    >
                        <div className="p-6 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold">Edit {isExpense ? 'Expense' : 'Income'}</h3>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 rounded-full hover:bg-error/20 text-error transition-colors"
                                        title="Delete Transaction"
                                        disabled={isLoading}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full hover:bg-white/5 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Form Fields */}
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
                                    value={date}
                                    onChange={setDate}
                                />
                            </div>

                            <WalletSelector
                                wallets={wallets}
                                selectedWalletId={walletId}
                                onSelect={setWalletId}
                                label={isExpense ? 'Pay from' : 'Deposit to'}
                                currencySymbol={currencySymbol}
                            />

                            {isExpense && (
                                <CategorySelector
                                    categories={categories}
                                    selectedCategoryId={categoryId}
                                    onSelect={setCategoryId}
                                />
                            )}

                            {/* Actions */}
                            <div className="mt-6">
                                <Button
                                    className="w-full"
                                    isLoading={isLoading}
                                    onClick={handleSubmit}
                                >
                                    Update
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
