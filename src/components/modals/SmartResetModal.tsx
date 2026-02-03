import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { getDaysInMonth } from 'date-fns';

interface SmartResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (amount: number, resetDay: number) => void;
    currentAmount: number;
    currentResetDay: number;
    currencySymbol: string;
    isReadOnly?: boolean;
    selectedMonth: Date;
}

export const SmartResetModal: React.FC<SmartResetModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentAmount,
    currentResetDay,
    currencySymbol,
    isReadOnly = false,
    selectedMonth
}) => {
    const [amount, setAmount] = React.useState(currentAmount.toString());
    const [resetDay, setResetDay] = React.useState(currentResetDay);

    // Update local state when props change
    React.useEffect(() => {
        if (isOpen) {
            setAmount(currentAmount.toString());
            setResetDay(currentResetDay);
        }
    }, [isOpen, currentAmount, currentResetDay]);

    const daysInMonth = getDaysInMonth(selectedMonth);
    // Generate grid: 1 to daysInMonth
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleSave = () => {
        const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
        if (!isNaN(numAmount)) {
            onSave(numAmount, resetDay);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-md bg-background backdrop-blur-xl rounded-[32px] overflow-hidden shadow-2xl border border-border-color"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-text-primary">Budget Settings</h3>
                            {isReadOnly && (
                                <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    Read Only
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <X size={20} className="text-text-secondary" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                        {isReadOnly && (
                            <div className="p-3 rounded-xl bg-surface border border-border-color flex gap-3 items-start">
                                <AlertTriangle size={16} className="text-warning mt-0.5" />
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    You are viewing a past budget period. Settings cannot be modified to ensure historical accuracy.
                                </p>
                            </div>
                        )}

                        {/* Amount Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Monthly Limit</label>
                            <div className={`relative px-4 py-3 rounded-2xl bg-surface border border-border-color flex items-center gap-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors ${isReadOnly ? 'opacity-60' : ''}`}>
                                <span className="text-lg font-bold text-text-secondary">{currencySymbol}</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full bg-transparent text-xl font-bold font-numeric text-text-primary outline-none placeholder:text-text-secondary/30"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Reset Day Logic */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Reset Cycle</label>

                            <div className={`p-4 rounded-2xl bg-surface/50 border border-border-color space-y-4 ${isReadOnly ? 'opacity-60 pointer-events-none' : ''}`}>
                                {/* Last Day Toggle */}
                                <button
                                    onClick={() => setResetDay(-1)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${resetDay === -1
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                        : 'bg-surface border-transparent text-text-primary hover:bg-surface-highlight'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Calendar size={18} />
                                        <span className="font-bold text-sm">Last Day of Month</span>
                                    </div>
                                    {resetDay === -1 && <motion.div layoutId="check" className="w-2 h-2 bg-white rounded-full" />}
                                </button>

                                <div className="text-center">
                                    <p className="text-[10px] text-text-secondary font-medium mb-3 uppercase tracking-widest">--- OR SELECT DAY ---</p>
                                    <div className="grid grid-cols-7 gap-2">
                                        {days.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setResetDay(d)}
                                                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all border ${resetDay === d
                                                    ? 'bg-primary text-white border-primary shadow-md'
                                                    : 'bg-surface text-text-primary border-transparent hover:bg-surface-highlight hover:scale-105'
                                                    }`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2">
                            {!isReadOnly ? (
                                <Button
                                    onClick={handleSave}
                                    className="w-full py-4 text-base rounded-2xl shadow-xl shadow-primary/20"
                                >
                                    Save Changes
                                </Button>
                            ) : (
                                <Button
                                    onClick={onClose}
                                    variant="secondary"
                                    className="w-full py-4 text-base rounded-2xl"
                                >
                                    Close
                                </Button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
