import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { Transaction, Wallet } from '../types';

interface UseTransactionManagerProps {
    wallets: Wallet[];
    userId: string | undefined;
    onRefresh: () => Promise<void>;
}

export function useTransactionManager({ wallets, userId, onRefresh }: UseTransactionManagerProps) {
    const [submitting, setSubmitting] = useState(false);

    const updateTransaction = useCallback(async (
        originalTransaction: Transaction,
        updates: {
            amount: number;
            description: string;
            date: string;
            category_id?: string;
            wallet_id?: string;
        }
    ) => {
        if (!userId) return;
        setSubmitting(true);
        try {
            const oldTxn = originalTransaction;
            const newAmount = updates.amount;
            const isExpense = oldTxn.type === 'expense';
            const oldWalletId = oldTxn.wallet_id;
            const newWalletId = updates.wallet_id;

            // 1. Update Transaction
            await api.updateTransaction(oldTxn.id, {
                amount: newAmount,
                description: updates.description,
                date: updates.date,
                category_id: isExpense ? updates.category_id : undefined,
                wallet_id: newWalletId || undefined
            });

            // 2. Update Wallets (Balance Management)
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
                            const adjustment = isExpense ? -diff : diff;
                            await api.updateWallet(oldWalletId, {
                                balance: Number(wallet.balance) + Number(adjustment)
                            });
                        }
                    }
                }
            }

            await onRefresh();
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        } finally {
            setSubmitting(false);
        }
    }, [wallets, userId, onRefresh]);

    const deleteTransaction = useCallback(async (transaction: Transaction) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;

        setSubmitting(true);
        try {
            // DB trigger handles balance updates automatically

            await api.deleteTransaction(transaction.id);
            await onRefresh();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        } finally {
            setSubmitting(false);
        }
    }, [wallets, onRefresh]);

    return {
        updateTransaction,
        deleteTransaction,
        submitting
    };
}
