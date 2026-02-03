import { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, isAfter, isBefore, addWeeks, differenceInCalendarDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DateRangePickerProps {
    isOpen: boolean;
    onClose: () => void;
    startDate: string | null;
    endDate: string | null;
    onChange: (start: string | null, end: string | null) => void;
}

import { useAppStore } from '../../store/useAppStore';

export const DateRangePicker = ({ isOpen, onClose, startDate, endDate, onChange }: DateRangePickerProps) => {
    const { theme } = useAppStore();
    const containerRef = useRef<HTMLDivElement>(null);
    // Internal state for pending selection
    const [tempStart, setTempStart] = useState<string | null>(startDate);
    const [tempEnd, setTempEnd] = useState<string | null>(endDate);

    const [currentMonth, setCurrentMonth] = useState(startDate ? new Date(startDate) : new Date());
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    // Sync props to internal state when opening
    useEffect(() => {
        if (isOpen) {
            setTempStart(startDate);
            setTempEnd(endDate);
            setCurrentMonth(startDate ? new Date(startDate) : new Date());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const weeks = [];
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days = eachDayOfInterval({ start, end });

    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    const handleSelect = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');

        if (!tempStart || (tempStart && tempEnd)) {
            // Start new selection
            setTempStart(dayStr);
            setTempEnd(null);
        } else {
            // Complete selection (End Date)
            const start = new Date(tempStart);

            // Check if end date is before start date -> Reset and make it start date
            if (isBefore(day, start)) {
                setTempStart(dayStr);
                setTempEnd(null);
                return;
            }

            // Constraints
            const diffDays = differenceInCalendarDays(day, start);

            // Min 2 days
            if (diffDays < 1) {
                setTempStart(dayStr);
                setTempEnd(null);
                return;
            }

            // Max 12 weeks
            const maxDate = addWeeks(start, 12);
            if (isAfter(day, maxDate)) {
                return;
            }

            setTempEnd(dayStr);
        }
    };

    const isInRange = (day: Date) => {
        if (tempStart && tempEnd) {
            return isWithinRange(day, new Date(tempStart), new Date(tempEnd));
        }
        if (tempStart && hoverDate) {
            return isWithinRange(day, new Date(tempStart), hoverDate);
        }
        return false;
    };

    const isWithinRange = (date: Date, start: Date, end: Date) => {
        const s = isBefore(start, end) ? start : end;
        const e = isBefore(start, end) ? end : start;
        return (isAfter(date, s) || isSameDay(date, s)) && (isBefore(date, e) || isSameDay(date, e));
    };

    const isDisabled = (day: Date) => {
        if (!tempStart || (tempStart && tempEnd)) return false;

        const start = new Date(tempStart);
        const maxDate = addWeeks(start, 12);
        return isAfter(day, maxDate);
    };

    const handleReset = () => {
        setTempStart(null);
        setTempEnd(null);
        // Do NOT close popup
    };

    const handleApply = () => {
        onChange(tempStart, tempEnd);
        onClose();
    };

    const isLight = theme === 'light';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60]"
                        onClick={onClose}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none p-4">
                        <motion.div
                            ref={containerRef}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className={`bg-white dark:bg-[#1C1C1E] rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.25)] w-full max-w-sm overflow-hidden border pointer-events-auto ${isLight
                                ? 'bg-white border-black/5 text-gray-900'
                                : 'bg-[#1C1C1E] border-white/10 text-white'
                                }`}
                        >
                            {/* Header */}
                            <div className={`flex items-center justify-between p-4 border-b ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                                <h3 className={`font-bold text-lg ${isLight ? 'text-gray-900' : 'text-white'}`}>Select Range</h3>
                                <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Calendar Header aka Month Nav */}
                            <div className="flex items-center justify-between px-4 py-3">
                                <h3 className={`font-bold text-base ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                    {format(currentMonth, 'MMMM yyyy')}
                                </h3>
                                <div className="flex gap-1">
                                    <button
                                        onClick={prevMonth}
                                        className={`p-1.5 rounded-full transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-white'}`}
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={nextMonth}
                                        className={`p-1.5 rounded-full transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-white'}`}
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Info Banner */}
                            {(tempStart && !tempEnd) && (
                                <div className="mx-4 mb-2 p-2 bg-primary/10 rounded-lg text-xs text-primary text-center">
                                    Select end date (Min 2 days, Max 12 weeks)
                                </div>
                            )}

                            {/* Days Header */}
                            <div className={`grid grid-cols-7 mb-2 text-center text-xs font-medium uppercase tracking-wider px-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                    <div key={d} className="py-1">{d}</div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-y-1 gap-x-0 px-4 pb-4">
                                {days.map((day, idx) => {
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const isStart = tempStart ? isSameDay(day, new Date(tempStart)) : false;
                                    const isEnd = tempEnd ? isSameDay(day, new Date(tempEnd)) : false;
                                    const inRange = isInRange(day);
                                    const disabled = isDisabled(day);

                                    return (
                                        <div
                                            key={idx}
                                            className="relative py-0.5"
                                            onMouseEnter={() => !tempEnd && tempStart && setHoverDate(day)}
                                        >
                                            {/* Range Background */}
                                            {inRange && (
                                                <div className={cn(
                                                    "absolute inset-y-0.5",
                                                    isLight ? "bg-primary/20" : "bg-primary/20",
                                                    isStart && "left-1/2 right-0 rounded-l-full",
                                                    isEnd && "left-0 right-1/2 rounded-r-full",
                                                    (!isStart && !isEnd) && "inset-x-0",
                                                    (tempStart && !tempEnd && isSameDay(day, hoverDate as Date)) && "left-0 right-1/2 rounded-r-full"
                                                )} />
                                            )}

                                            <button
                                                onClick={() => !disabled && handleSelect(day)}
                                                disabled={disabled}
                                                className={cn(
                                                    "relative h-9 w-9 mx-auto rounded-full flex items-center justify-center text-sm transition-all z-10",
                                                    !isCurrentMonth && (isLight ? "text-gray-300 opacity-50" : "text-gray-600 opacity-50"),
                                                    disabled && (isLight ? "text-gray-300 opacity-30 cursor-not-allowed line-through" : "text-gray-700 opacity-30 cursor-not-allowed line-through"),
                                                    (isStart || isEnd)
                                                        ? (isLight
                                                            ? "ring-2 ring-emerald-500 bg-emerald-50 text-emerald-600 font-bold z-20"
                                                            : "ring-2 ring-primary bg-primary/10 text-primary font-bold z-20")
                                                        : !disabled && (isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/10 text-white"),
                                                    isToday(day) && !isStart && !isEnd && (isLight ? "text-emerald-600 font-bold border border-emerald-200" : "text-primary font-bold border border-primary/30"),
                                                )}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className={`p-4 border-t flex flex-col gap-4 ${isLight ? 'bg-white border-gray-100' : 'bg-[#1C1C1E] border-white/5'}`}>
                                <div className={`flex justify-between items-center text-sm font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                                    <div className="flex gap-1">
                                        <span className="text-gray-500">Start:</span>
                                        <span className={isLight ? "font-bold text-gray-900" : "font-bold text-white"}>{tempStart ? format(new Date(tempStart), 'MMM d, yyyy') : '-'}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <span className="text-gray-500">End:</span>
                                        <span className={isLight ? "font-bold text-gray-900" : "font-bold text-white"}>{tempEnd ? format(new Date(tempEnd), 'MMM d, yyyy') : '-'}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <button
                                        onClick={handleReset}
                                        className={`flex-1 py-3 rounded-2xl border transition-colors font-bold text-sm ${isLight
                                            ? 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                            : 'border-white/10 hover:bg-white/5 text-gray-300'
                                            }`}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        disabled={!tempStart || !tempEnd}
                                        onClick={handleApply}
                                        className={`flex-1 py-3 rounded-2xl text-white font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 ${isLight
                                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                                : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                                            }`}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
