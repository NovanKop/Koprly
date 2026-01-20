import { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
// Locale logic is implicitly handled in date-fns by default (en-US) or can be expanded later

interface DatePickerProps {
    label: string;
    value: string; // ISO date string YYYY-MM-DD
    onChange: (date: string) => void;
    error?: string;
}

export const DatePicker = ({ label, value, onChange, error }: DatePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    // Locale logic is implicitly handled in date-fns by default (en-US) or can be expanded later

    // Parse value or default to today
    const selectedDate = value ? new Date(value) : new Date();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

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

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth))
    });

    const handleSelect = (day: Date) => {
        onChange(format(day, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    return (
        <div className="relative group" ref={containerRef}>
            {/* Input Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "cursor-pointer w-full py-3 pt-5 pb-2 rounded-xl transition-all duration-200 pl-11 pr-4 relative",
                    "bg-surface/50 backdrop-blur-sm border border-white/10 hover:border-primary/30",
                    "text-text-primary text-base",
                    isOpen && "border-primary ring-4 ring-primary/10",
                    error && "border-error ring-error/10"
                )}
            >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors">
                    <CalendarIcon size={18} />
                </div>
                <span className={cn("block truncate", !value && "text-transparent")}>
                    {value ? format(new Date(value), 'PPP') : label}
                </span>

                {/* Floating Label */}
                <label className={cn(
                    "absolute left-11 transition-all duration-200 pointer-events-none origin-[0]",
                    // If has value or open, float to top
                    (value || isOpen) ? "top-1.5 text-xs text-primary" : "top-3 text-base text-gray-400",
                    error && "text-error"
                )}>
                    {label}
                </label>
            </div>

            {/* Error Message */}
            {error && (
                <p className="mt-1 text-xs text-error ml-4 animate-in slide-in-from-top-1 fade-in">
                    {error}
                </p>
            )}

            {/* Calendar Popup */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-0 mt-2 p-4 w-[320px] bg-white dark:bg-[#1C1C1E] text-black dark:text-white rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] z-50 overflow-hidden border border-black/5 dark:border-white/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-bold text-lg">
                                {format(currentMonth, 'MMMM yyyy')}
                            </h3>
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Days Header */}
                        <div className="grid grid-cols-7 mb-2 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d} className="py-1">{d}</div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, idx) => {
                                const isSelected = value ? isSameDay(day, new Date(value)) : false;
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isTodayDate = isToday(day);

                                return (
                                    <button
                                        key={idx}
                                        onClick={(e) => { e.stopPropagation(); handleSelect(day); }}
                                        className={cn(
                                            "h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm transition-all",
                                            !isCurrentMonth && "text-gray-600 opacity-50",
                                            isSelected
                                                ? "bg-primary text-white font-bold shadow-lg shadow-primary/30"
                                                : "hover:bg-black/5 dark:hover:bg-white/10 hover:scale-110",
                                            isTodayDate && !isSelected && "text-primary font-bold border border-primary/30",
                                        )}
                                    >
                                        {format(day, 'd')}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 flex justify-between">
                            <button
                                onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(new Date());
                                    setCurrentMonth(new Date());
                                }}
                                className="text-sm font-semibold text-primary px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                            >
                                Today
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
