import { motion } from 'framer-motion';
import { CategoryIcon } from './ui/CategoryIcon';
import { X } from 'lucide-react';
import type { Category } from '../types';

interface CategorySelectorProps {
    categories: Category[];
    selectedCategoryId: string;
    onSelect: (id: string) => void;
    label?: string;
}

export function CategorySelector({ categories, selectedCategoryId, onSelect, label }: CategorySelectorProps) {
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    return (
        <div>
            {label && <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-[0.1em] mb-2 block">{label}</label>}
            <div className="relative w-full">
                {selectedCategory ? (
                    // Selected state: Show only the selected category, filling width, clearly styled
                    <motion.button
                        layoutId="category-card"
                        key="selected-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect('')}
                        type="button"
                        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-primary bg-primary/5 shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <CategoryIcon
                                iconName={selectedCategory.icon}
                                variant="large"
                                categoryColor={selectedCategory.color}
                            />
                            <div className="text-left">
                                <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">Selected Category</span>
                                <span className="text-lg font-bold text-text-primary">{selectedCategory.name}</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center text-text-secondary">
                            <X size={16} strokeWidth={2.5} />
                        </div>
                    </motion.button>
                ) : (
                    // Unselected state: Grid of categories
                    <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-4 sm:grid-cols-5 gap-3"
                    >
                        {categories.map(cat => (
                            <motion.button
                                layoutId={selectedCategoryId === cat.id ? "category-card" : undefined}
                                key={cat.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSelect(cat.id)}
                                type="button"
                                className="flex flex-col items-center justify-center p-3 gap-2 rounded-2xl border border-border-color bg-surface hover:border-primary/40 hover:bg-surface-highlight transition-all"
                            >
                                <CategoryIcon
                                    iconName={cat.icon}
                                    variant="default"
                                    categoryColor={cat.color}
                                />
                                <span className="text-[11px] font-bold text-text-primary text-center truncate w-full leading-tight">{cat.name}</span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
