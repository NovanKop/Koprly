import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatMoney } from '../../lib/utils';

interface BalanceWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    walletName: string;
    currentBalance: number;
    expenseAmount: number;
    currency?: string;
    isSubmitting?: boolean;
}

export const BalanceWarningModal = ({
    isOpen,
    onClose,
    onConfirm,
    walletName,
    currentBalance,
    expenseAmount,
    currency = 'IDR',
    isSubmitting = false
}: BalanceWarningModalProps) => {
    const projectedBalance = currentBalance - expenseAmount;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
                        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-warning/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10">
                            {/* Icon */}
                            <div className="w-12 h-12 rounded-full bg-warning/10 text-warning flex items-center justify-center mb-4">
                                <AlertTriangle size={24} />
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-text-primary mb-2">
                                Insufficient Balance?
                            </h3>

                            {/* Message */}
                            <div className="text-text-secondary text-sm leading-relaxed mb-6 space-y-4">
                                <p>
                                    The expense amount is greater than the current balance in <span className="font-bold text-text-primary">{walletName}</span>.
                                </p>

                                <div className="p-4 rounded-2xl bg-surface-highlight border border-border-color space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span>Current Balance</span>
                                        <span className="font-medium text-text-primary">{formatMoney(currentBalance, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span>Expense Amount</span>
                                        <span className="font-medium text-error">-{formatMoney(expenseAmount, currency)}</span>
                                    </div>
                                    <div className="h-px bg-border-color" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold">Projected Balance</span>
                                        <span className="text-sm font-bold text-error">
                                            {projectedBalance < 0 ? '-' : ''}{formatMoney(Math.abs(projectedBalance), currency)}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs italic">
                                    Your wallet balance will become negative if you proceed. Do you still want to record this expense?
                                </p>
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
                                    className="flex-1 !bg-primary hover:!bg-primary/90 !text-white !border-none shadow-lg shadow-primary/30"
                                >
                                    Proceed Anyway
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
