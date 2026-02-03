import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { Category } from '../types';

interface CategorySelectorProps {
    categories: Category[];
    selectedCategoryId: string;
    onSelect: (id: string) => void;
    label?: string;
}

import { CategoryIcon } from './ui/CategoryIcon';

export function CategorySelector({ categories, selectedCategoryId, onSelect, label }: CategorySelectorProps) {
    return (
        <div>
            {label && <label className="text-xs text-gray-400 mb-2 block">{label}</label>}
            <div className="relative">
                <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide pr-8">
                    {categories.map(cat => (
                        <motion.button
                            key={cat.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSelect(cat.id)}
                            type="button"
                            className={`
                            flex-shrink-0 px-4 py-3 rounded-2xl border transition-all backdrop-blur-md
                            flex items-center gap-3 whitespace-nowrap
                            ${selectedCategoryId === cat.id
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                                    : 'bg-surface border-border-color text-text-secondary hover:border-primary/40 hover:bg-surface-highlight'
                                }
                        `}
                        >
                            <CategoryIcon
                                iconName={cat.icon}
                                variant="small"
                                className={selectedCategoryId === cat.id ? 'text-white' : undefined}
                                categoryColor={selectedCategoryId === cat.id ? '#ffffff' : cat.color}
                            />
                            <span className="text-sm font-medium">{cat.name}</span>
                        </motion.button>
                    ))}
                    {/* Padding for end of list */}
                    <div className="w-6 flex-shrink-0" />
                </div>
                {/* Scroll Indicator */}
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none flex items-center justify-end pr-1">
                    <ChevronRight className="text-green-500 w-5 h-5 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
