import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../lib/constants';
import { formatMoney } from '../lib/utils';
import type { Category, Transaction } from '../types';
import { DeleteConfirmationModal } from './modals/DeleteConfirmationModal';

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
    user_id: string;
    currencySymbol?: string;
    // Optional props for budget allocation visualization
    originalBudget?: number;
    totalCategoryBudgets?: number;
    initialCategory?: Category | null;
    showAllocationMessage?: boolean;
    transactions?: Transaction[];
}

export function AddCategoryModal({
    isOpen,
    onClose,
    onSuccess,
    user_id,
    currencySymbol = '$',
    originalBudget = 0,
    totalCategoryBudgets = 0,
    initialCategory = null,
    showAllocationMessage = false,
    transactions = []
}: AddCategoryModalProps) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
    const [color, setColor] = useState(CATEGORY_COLORS[0]);
    const [budget, setBudget] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialCategory) {
                setName(initialCategory.name);
                setIcon(initialCategory.icon);
                setColor(initialCategory.color);
                setBudget(initialCategory.monthly_budget ? initialCategory.monthly_budget.toString() : '');
            } else {
                // Reset form
                setName('');
                setIcon(CATEGORY_ICONS[0]);
                setColor(CATEGORY_COLORS[0]);
                setBudget('');
            }
        }
    }, [isOpen, initialCategory]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setSubmitting(true);
        try {
            const categoryData = {
                name,
                icon,
                color,
                monthly_budget: budget ? parseFloat(budget) : undefined,
                user_id
            };

            if (initialCategory) {
                await api.updateCategory(initialCategory.id, categoryData);
            } else {
                await api.createCategory(categoryData);
            }
            await onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save category:', error);
            alert('Failed to save category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!initialCategory) return;
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!initialCategory) return;
        setSubmitting(true);
        try {
            await api.deleteCategory(initialCategory.id);
            await onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to delete category:', error);
            alert('Failed to delete category');
        } finally {
            setSubmitting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:items-end sm:p-0"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-background rounded-2xl sm:rounded-t-[32px] sm:rounded-b-none border border-border-color overflow-hidden shadow-2xl"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-border-color flex items-center justify-between">
                                <h3 className="text-lg font-bold">
                                    {initialCategory ? 'Edit Category' : 'Add Category'}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-surface transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

                                {/* Budget Allocation Visualization (Optional) */}
                                {originalBudget > 0 && (
                                    <div className={`p-3 rounded-xl border ${(() => {
                                        const currentCatBudget = initialCategory?.monthly_budget || 0;
                                        const newCatBudget = budget ? parseFloat(budget) : 0;
                                        const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                        const wouldBeOver = projectedTotal > originalBudget;
                                        return wouldBeOver ? 'bg-error/10 border-error/30' : 'bg-surface border-border-color';
                                    })()
                                        }`}>
                                        {showAllocationMessage && (
                                            <div className="mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
                                                Adjust your allocation budget in the Budget Page &gt; Edit Category.
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-text-secondary">Budget Allocation</span>
                                            <span className="text-xs font-semibold">
                                                {(() => {
                                                    const currentCatBudget = initialCategory?.monthly_budget || 0;
                                                    const newCatBudget = budget ? parseFloat(budget) : 0;
                                                    const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                    const pct = originalBudget > 0 ? Math.round((projectedTotal / originalBudget) * 100) : 0;
                                                    return `${pct}%`;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-border-color rounded-full overflow-hidden mb-1">
                                            <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${Math.min((() => {
                                                        const currentCatBudget = initialCategory?.monthly_budget || 0;
                                                        const newCatBudget = budget ? parseFloat(budget) : 0;
                                                        const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                        return originalBudget > 0 ? (projectedTotal / originalBudget) * 100 : 0;
                                                    })(), 100)}%`,
                                                    backgroundColor: (() => {
                                                        const currentCatBudget = initialCategory?.monthly_budget || 0;
                                                        const newCatBudget = budget ? parseFloat(budget) : 0;
                                                        const projectedTotal = totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                        const pct = originalBudget > 0 ? (projectedTotal / originalBudget) * 100 : 0;
                                                        return projectedTotal > originalBudget ? '#FF3B30' : pct > 80 ? '#FF9500' : '#34C759';
                                                    })()
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-secondary">
                                                {formatMoney((() => {
                                                    const currentCatBudget = initialCategory?.monthly_budget || 0;
                                                    const newCatBudget = budget ? parseFloat(budget) : 0;
                                                    return totalCategoryBudgets - currentCatBudget + newCatBudget;
                                                })())} / {formatMoney(originalBudget)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Category Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Groceries"
                                        className="w-full px-4 py-3 rounded-xl bg-surface border border-border-color focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                    />
                                </div>

                                {/* Icon Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORY_ICONS.map((ic) => (
                                            <button
                                                key={ic}
                                                type="button"
                                                onClick={() => setIcon(ic)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${icon === ic ? 'bg-primary/30 scale-110 ring-2 ring-primary' : 'bg-surface hover:bg-surface-highlight'}`}
                                            >
                                                {ic}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORY_COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Budget */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Monthly Budget (Optional)</label>
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border-color focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
                                        <span className="text-text-secondary">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            value={budget}
                                            onChange={(e) => setBudget(e.target.value)}
                                            placeholder="0"
                                            className="flex-1 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <p className="text-xs text-text-secondary mt-1">Leave empty to only track spending</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-border-color flex gap-3">
                                {initialCategory && (
                                    <Button
                                        variant="secondary"
                                        className="!bg-error/10 !text-error !border-error/20 hover:!bg-error/20"
                                        onClick={handleDelete}
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                )}

                                <Button
                                    className="flex-1"
                                    onClick={handleSubmit}
                                    disabled={!name.trim()}
                                    isLoading={submitting}
                                >
                                    {initialCategory ? 'Save Changes' : 'Add Category'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {
                initialCategory && (
                    <DeleteConfirmationModal
                        isOpen={showDeleteConfirm}
                        onClose={() => setShowDeleteConfirm(false)}
                        onConfirm={confirmDelete}
                        categoryName={initialCategory.name}
                        transactionCount={transactions.filter(t => t.category_id === initialCategory.id).length}
                        totalAmount={transactions.filter(t => t.category_id === initialCategory?.id).reduce((sum, t) => sum + Number(t.amount), 0)}
                        currencySymbol={currencySymbol}
                        isSubmitting={submitting}
                    />
                )
            }
        </>
    );
}
