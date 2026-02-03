import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatMoney } from '../../lib/utils';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    categoryName: string;
    transactionCount: number;
    totalAmount: number;
    currencySymbol?: string;
    isSubmitting?: boolean;
}

export const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    categoryName,
    transactionCount,
    totalAmount,
    currencySymbol = '$',
    isSubmitting = false
}: DeleteConfirmationModalProps) => {
    const hasTransactions = transactionCount > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-surface border border-border-color rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
                    >
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-error/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${hasTransactions ? 'bg-error/10 text-error' : 'bg-surface-highlight text-text-secondary'}`}>
                                {hasTransactions ? <AlertTriangle size={24} /> : <Trash2 size={24} />}
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-text-primary mb-2">
                                {hasTransactions ? 'Delete Category & Data?' : 'Delete Category?'}
                            </h3>

                            {/* Message - Smart Logic */}
                            <div className="text-text-secondary text-sm leading-relaxed mb-6 space-y-3">
                                <p>
                                    Are you sure you want to delete <span className="font-bold text-text-primary">"{categoryName}"</span>?
                                </p>

                                {hasTransactions && (
                                    <div className="p-4 rounded-xl bg-surface-highlight border border-border-color">
                                        <p className="font-semibold text-text-primary mb-1">Warning: Data Loss</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li><span className="font-bold">{transactionCount}</span> transactions will be deleted</li>
                                            <li>Total value: <span className="font-bold">{formatMoney(totalAmount, currencySymbol)}</span></li>
                                        </ul>
                                        <p className="mt-2 text-error text-xs font-medium">
                                            This action cannot be undone.
                                        </p>
                                    </div>
                                )}

                                {!hasTransactions && (
                                    <p>This category has no transactions, so it's safe to delete.</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={onClose}
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={onConfirm}
                                    isLoading={isSubmitting}
                                    className="flex-1 !bg-error hover:!bg-error/90 !text-white !border-none shadow-lg shadow-error/30"
                                >
                                    {hasTransactions ? 'Yes, Delete All' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
