import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calendar } from 'lucide-react';
import { format, isSameMonth } from 'date-fns';

interface MonthSelectorProps {
    selectedMonth: Date;
    months: Date[];
    onSelect: (date: Date) => void;
    className?: string;
}

export function MonthSelector({ selectedMonth, months, onSelect, className = '' }: MonthSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (date: Date) => {
        onSelect(date);
        setIsOpen(false);
    };

    return (
        <div className={`relative z-30 ${className}`} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-color hover:bg-surface-highlight transition-all active:scale-95 group"
            >
                <Calendar size={16} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-text-primary">
                    {format(selectedMonth, 'MMMM yyyy')}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full mt-2 left-0 w-56 bg-surface/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel"
                    >
                        <div className="max-h-64 overflow-y-auto py-2 scrollbar-hide">
                            {months.map((date, idx) => {
                                const isSelected = isSameMonth(date, selectedMonth);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelect(date)}
                                        className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between group
                                            ${isSelected
                                                ? 'bg-primary/10 text-primary font-bold'
                                                : 'text-text-primary hover:bg-white/5 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <span>{format(date, 'MMMM yyyy')}</span>
                                        {isSelected && (
                                            <motion.div
                                                layoutId="activeMonth"
                                                className="w-1.5 h-1.5 rounded-full bg-primary"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
