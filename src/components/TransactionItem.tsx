import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Edit2 } from 'lucide-react';
import type { Transaction } from '../types';
import { formatMoney, formatTime } from '../lib/utils';
import { formatDate } from '../utils/dateFormatter';
import { CategoryIcon } from './ui/CategoryIcon';
import type { DateFormat } from '../types';

interface TransactionItemProps {
    transaction: Transaction;
    onClick?: () => void;
    onEdit?: () => void;
    currency: string;
    dateFormat?: DateFormat;
    index?: number;
    variant?: 'default' | 'history';
}

export function TransactionItem({
    transaction,
    onClick,
    onEdit,
    currency,
    dateFormat = 'DD/MM/YYYY',
    index = 0,
    variant = 'default'
}: TransactionItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isIncome = transaction.type === 'income';

    const handleItemClick = () => {
        if (variant === 'history') {
            setIsExpanded(!isExpanded);
        }
        onClick?.();
    };

    // Determine description text
    const fullDescription = transaction.description || (isIncome ? 'Income' : transaction.category?.name || 'Unknown');
    const shouldTruncate = variant === 'history' && !isExpanded && fullDescription.length > 25;
    const displayDescription = shouldTruncate ? `${fullDescription.slice(0, 25)}...` : fullDescription;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, type: "spring" }}
            className={`backdrop-blur-xl border rounded-[20px] overflow-hidden transition-all shadow-sm ${isExpanded ? 'bg-surface border-primary/30 ring-1 ring-primary/20' :
                isIncome
                    ? 'bg-success/5 border-success/30 hover:bg-success/10'
                    : 'bg-surface border-border-color hover:bg-surface-highlight'
                }`}
        >
            <div
                onClick={handleItemClick}
                className="p-4 flex items-start justify-between cursor-pointer gap-3"
            >
                <div className="flex items-start gap-3 flex-1 overflow-hidden">
                    {/* Icon */}
                    <CategoryIcon
                        iconName={isIncome ? 'banknote' : transaction.category?.icon || 'help-circle'}
                        variant="default"
                        categoryColor={isIncome ? '#22C55E' : transaction.category?.color}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className={`font-medium leading-tight ${isExpanded ? '' : 'truncate'}`}>
                            {displayDescription}
                        </p>

                        <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                            <span>{transaction.date ? formatDate(transaction.date, dateFormat) : ''}</span>
                            {!isExpanded && variant === 'history' && (
                                <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Amount */}
                <div className="flex flex-col items-end">
                    <p className={`font-bold whitespace-nowrap ${isIncome ? 'text-success' : 'text-error'}`}>
                        {isIncome ? '+' : '-'}{formatMoney(Number(transaction.amount), currency)}
                    </p>
                    {variant === 'default' && onClick && (
                        <ChevronRight size={16} className="text-gray-400 mt-1" />
                    )}
                </div>
            </div>

            {/* Expanded Details (History Mode) */}
            <AnimatePresence>
                {isExpanded && variant === 'history' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-4 pt-0 text-sm text-text-secondary border-t border-dashed border-border-color/50 mt-2"
                    >
                        <div className="pt-3 space-y-2">
                            <div className="flex justify-between">
                                <span>Time</span>
                                <span className="text-text-primary font-medium">
                                    {transaction.date ? formatTime(transaction.date) : '--:--'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Category</span>
                                <span className="text-text-primary font-medium flex items-center gap-2">
                                    <div className="w-4 h-4">
                                        <CategoryIcon
                                            iconName={transaction.category?.icon || 'help-circle'}
                                            variant="small"
                                            categoryColor={transaction.category?.color}
                                            className="w-4 h-4"
                                            containerClassName="shadow-none border-none"
                                        />
                                    </div>
                                    {transaction.category?.name || 'Uncategorized'}
                                </span>
                            </div>
                            {fullDescription.length > 25 && (
                                <div>
                                    <span className="block mb-1">Full Description</span>
                                    <p className="text-text-primary bg-background/50 p-2 rounded-lg italic">
                                        "{fullDescription}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {onEdit && (
                            <div className="flex justify-end mt-4 pt-3 border-t border-border-color/50">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                                >
                                    <Edit2 size={12} />
                                    Edit Transaction
                                </button>
                            </div>
                        )}

                        <div className="mt-3 flex justify-center">
                            <ChevronDown size={16} className="text-text-secondary/50 rotate-180" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
