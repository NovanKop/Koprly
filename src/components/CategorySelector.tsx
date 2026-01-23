import { motion } from 'framer-motion';
import type { Category } from '../types';

interface CategorySelectorProps {
    categories: Category[];
    selectedCategoryId: string;
    onSelect: (id: string) => void;
    label?: string;
}

export function CategorySelector({ categories, selectedCategoryId, onSelect, label }: CategorySelectorProps) {
    return (
        <div>
            {label && <label className="text-xs text-gray-400 mb-2 block">{label}</label>}
            <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide">
                {categories.map(cat => (
                    <motion.button
                        key={cat.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(cat.id)}
                        type="button"
                        className={`
                            flex-shrink-0 px-4 py-2.5 rounded-full border transition-all backdrop-blur-md
                            flex items-center gap-2 whitespace-nowrap
                            ${selectedCategoryId === cat.id
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                                : 'bg-surface border-border-color text-text-secondary hover:border-primary/40 hover:bg-surface-highlight'
                            }
                        `}
                    >
                        <span>{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.name}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
