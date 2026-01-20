import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, format, parseISO, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Heart, Lightbulb, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Transaction, Category, Profile } from '../types';
import { DateRangePicker } from '../components/ui/DateRangePicker';

interface FinancialReportProps {
    onBack: () => void;
}

export default function FinancialReport({ onBack }: FinancialReportProps) {
    const { currency, firstDayOfWeek } = useAppStore();
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
    const [customRange, setCustomRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const weekStart = firstDayOfWeek === 'Monday' ? 1 : 0;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txns, cats, prof] = await Promise.all([
                api.getTransactions(),
                api.getCategories(),
                api.getProfile()
            ]);
            if (txns) setTransactions(txns);
            if (cats) setCategories(cats);
            if (prof) setProfile(prof);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Computed Data Logic ---
    const filteredTransactions = transactions.filter(t => {
        const date = parseISO(t.date);
        const now = new Date();
        let start, end;

        if (filter === 'daily') {
            start = startOfDay(now);
            end = endOfDay(now);
        } else if (filter === 'weekly') {
            start = startOfWeek(now, { weekStartsOn: weekStart });
            end = endOfWeek(now, { weekStartsOn: weekStart });
        } else if (filter === 'monthly') {
            start = startOfMonth(now);
            end = endOfMonth(now);
        } else {
            // Custom Range
            if (!customRange.start || !customRange.end) return false;
            start = startOfDay(new Date(customRange.start));
            end = endOfDay(new Date(customRange.end));
        }

        return isWithinInterval(date, { start, end });
    });

    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const totalOutflow = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

    // Health Score logic
    const totalBudget = profile?.total_budget || 0;
    const budgetUsed = totalBudget > 0 ? (totalOutflow / totalBudget) * 100 : 0;
    const healthScore = totalBudget > 0 ? Math.max(0, Math.min(100, Math.round(100 - budgetUsed))) : 50;

    // Top Merchant logic
    const merchantMap = new Map<string, number>();
    expenses.forEach(t => {
        const name = t.description || t.category?.name || 'Unknown';
        merchantMap.set(name, (merchantMap.get(name) || 0) + Number(t.amount));
    });
    let topMerchantName = 'None';
    let topMerchantAmount = 0;
    merchantMap.forEach((amount, name) => {
        if (amount > topMerchantAmount) {
            topMerchantAmount = amount;
            topMerchantName = name;
        }
    });

    // Category Breakdown logic
    const categoryStats = categories.map(cat => {
        const catTotal = expenses
            .filter(t => t.category_id === cat.id)
            .reduce((sum, t) => sum + Number(t.amount), 0);
        return { ...cat, total: catTotal };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    // Chart Data Generation
    const getChartData = () => {
        const now = new Date();
        let points: number[] = [];
        let labels: string[] = [];

        if (filter === 'daily') {
            // Hourly buckets (0-23)
            const startStr = format(now, 'yyyy-MM-dd');
            points = new Array(24).fill(0);
            labels = ['00', '06', '12', '18', '23'];

            const dailyTxns = expenses.filter(t => t.date === startStr);
            dailyTxns.forEach(t => {
                try {
                    const created = t.created_at ? parseISO(t.created_at) : new Date();
                    const hour = created.getHours();
                    if (hour >= 0 && hour < 24) {
                        points[hour] += Number(t.amount);
                    }
                } catch {
                    // ignore invalid date
                }
            });

        } else if (filter === 'weekly') {
            const start = startOfWeek(now, { weekStartsOn: weekStart });
            const end = endOfWeek(now, { weekStartsOn: weekStart });
            const days = eachDayOfInterval({ start, end });
            labels = days.map(d => format(d, 'EEEEE'));

            points = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return expenses
                    .filter(t => t.date === dateStr)
                    .reduce((sum, t) => sum + Number(t.amount), 0);
            });

        } else if (filter === 'monthly') {
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            const days = eachDayOfInterval({ start, end });
            labels = days.filter((_, i) => i % 6 === 0 || i === days.length - 1).map(d => format(d, 'd'));

            points = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return expenses
                    .filter(t => t.date === dateStr)
                    .reduce((sum, t) => sum + Number(t.amount), 0);
            });
        } else {
            // Custom Range
            if (!customRange.start || !customRange.end) return { points: [], labels: [] };

            const start = new Date(customRange.start);
            const end = new Date(customRange.end);
            const days = eachDayOfInterval({ start, end });

            // Dynamic Labels based on duration
            const duration = days.length;
            if (duration <= 14) {
                // Show every day or every other day
                labels = days.map(d => format(d, 'd'));
                // If too many, maybe simplify
                if (duration > 7) {
                    labels = days.map((d, i) => i % 2 === 0 ? format(d, 'd') : '');
                }
            } else {
                // Large range, show ~5 labels distributed
                const step = Math.ceil(duration / 5);
                labels = days.map((d, i) => (i === 0 || i === days.length - 1 || i % step === 0) ? format(d, 'dd/MM') : '');
            }

            points = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return expenses
                    .filter(t => t.date === dateStr)
                    .reduce((sum, t) => sum + Number(t.amount), 0);
            });
        }
        return { points, labels };
    };

    const { points: sparklineData, labels: chartLabels } = getChartData();
    const maxDataValue = Math.max(...sparklineData, 1);
    const minDataValue = Math.min(...sparklineData);

    // Generate Smooth SVG Path
    const generateSmoothPath = (data: number[], width: number, height: number) => {
        if (data.length === 0) return "";
        if (data.length === 1) return `M 0 ${height} L ${width} ${height}`;

        const min = Math.min(...data);
        const max = Math.max(...data, 1);
        const range = max - min || 1;

        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const normalizedY = (val - min) / range;
            const y = height - (normalizedY * height);
            return [x, y];
        });

        const getControlPoint = (current: number[], previous: number[], next: number[], reverse?: boolean) => {
            const p = previous || current;
            const n = next || current;
            const smoothing = 0.2;
            const line = (pointA: number[], pointB: number[]) => {
                const lengthX = pointB[0] - pointA[0];
                const lengthY = pointB[1] - pointA[1];
                return {
                    length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
                    angle: Math.atan2(lengthY, lengthX)
                };
            };
            const o = line(p, n);
            const angle = o.angle + (reverse ? Math.PI : 0);
            const length = o.length * smoothing;
            const x = current[0] + Math.cos(angle) * length;
            const y = current[1] + Math.sin(angle) * length;
            return [x, y];
        };

        const d = points.reduce((acc, point, i, a) => {
            if (i === 0) return `M ${point[0]},${point[1]}`;
            const cps = getControlPoint(a[i - 1], a[i - 2], point);
            const cpe = getControlPoint(point, a[i - 1], a[i + 1], true);
            return `${acc} C ${cps[0]},${cps[1]} ${cpe[0]},${cpe[1]} ${point[0]},${point[1]}`;
        }, "");

        return d;
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatCompactMoney = (amount: number) => {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'jt';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(0) + 'rb';
        }
        return amount.toString();
    };

    const handleDateRangeChange = (start: string | null, end: string | null) => {
        setCustomRange({ start, end });
        if (start && end) {
            setFilter('custom');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-transparent text-text-primary pb-28 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/5 blur-[120px] animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] animate-blob" />
            </div>

            {/* Header */}
            <div className="px-6 pt-8 pb-4 flex items-center justify-between">
                <motion.button
                    onClick={onBack}
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 -ml-2 rounded-xl hover:bg-surface transition-colors"
                >
                    <ArrowLeft size={24} className="text-primary" />
                </motion.button>
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg font-bold"
                >
                    Financial Reports
                </motion.h1>
                <motion.button
                    onClick={() => setShowDatePicker(true)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                        "p-2 -mr-2 rounded-xl hover:bg-surface transition-colors relative",
                        filter === 'custom' && "text-primary bg-primary/10"
                    )}
                >
                    <Calendar size={24} className={filter === 'custom' ? "text-primary" : "text-text-primary"} />
                    {filter === 'custom' && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-background" />
                    )}
                </motion.button>
            </div>

            {/* Time Filter */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="px-6 mb-8"
            >
                <div className="p-1 bg-surface border border-border-color rounded-2xl flex relative">
                    {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="relative flex-1 py-2 text-sm font-medium rounded-xl transition-all z-10"
                        >
                            <span className={filter === f ? 'text-white' : 'text-text-secondary hover:text-text-primary'}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </span>
                            {filter === f && (
                                <motion.div
                                    layoutId="activeFilter"
                                    className="absolute inset-0 bg-primary rounded-xl shadow-md -z-10"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                    {filter === 'custom' && (
                        /* Only show active indicator on custom if weird UI, but here buttons are rigid. 
                           So if custom is selected, none of the 3 buttons are active. 
                           Maybe show a "Custom" badge or just keep no selection? 
                           Let's keeping no selection visualizes "none of these".
                        */
                        null
                    )}
                </div>
            </motion.div>

            <motion.div
                className="px-6 space-y-6"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.1
                        }
                    }
                }}
            >
                {/* Total Outflow Card */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    className="p-6 rounded-[32px] bg-surface backdrop-blur-xl border border-border-color shadow-sm"
                >
                    <p className="text-text-secondary text-sm mb-1">Total Outflow</p>
                    <h2 className="text-3xl font-bold mb-2">{formatMoney(totalOutflow)}</h2>
                    <div className="flex items-center gap-1 text-success text-sm font-medium">
                        <TrendingUp size={16} className="rotate-180" />
                        <span>12%</span>
                        <span className="text-text-secondary font-normal">vs last month</span>
                    </div>
                </motion.div>

                {/* Health & Top Merchant Grid */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                    }}
                    className="grid grid-cols-2 gap-4"
                >
                    {/* Health Score */}
                    <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-5 rounded-[32px] bg-surface backdrop-blur-xl border border-border-color shadow-sm flex flex-col justify-between h-48 cursor-pointer hover:shadow-lg transition-shadow"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-text-secondary text-sm font-medium">Health</span>
                            <Heart className="text-success fill-success" size={20} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold mb-1">{healthScore}/100</div>
                            <p className="text-xs text-text-secondary">Great job!</p>
                            <div className="mt-3 h-1.5 bg-border-color rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((totalOutflow / (profile?.total_budget || 1)) * 100, 100)}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="h-full bg-success opacity-80"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Top Merchant */}
                    <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-5 rounded-[32px] bg-success/20 backdrop-blur-xl border border-success/10 shadow-sm flex flex-col justify-between h-48 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    >
                        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-success/20 rounded-full blur-xl" />

                        <span className="text-success text-[10px] font-bold uppercase tracking-wider">Top Merchant</span>

                        <div className="text-right relative z-10">
                            <p className="text-xs text-success/80 font-medium mb-1 truncate max-w-[100px]">{topMerchantName}</p>
                            <p className="text-xl font-bold text-success">{formatMoney(topMerchantAmount)}</p>
                        </div>

                        <div className="h-10 w-10 rounded-full border-2 border-success/30 flex items-center justify-center">
                            <div className="h-4 w-4 bg-success rounded-full" />
                        </div>
                    </motion.div>
                </motion.div>

                {/* Spending Trends (Sparkline) */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                    }}
                    whileHover={{ scale: 1.01 }}
                    className="p-6 rounded-[32px] bg-surface backdrop-blur-xl border border-border-color shadow-sm"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold">Spending Trends</h3>
                        <span className="px-3 py-1 rounded-full bg-background border border-border-color text-xs font-medium capitalize">
                            {filter === 'custom'
                                ? (customRange.start && customRange.end
                                    ? `${format(new Date(customRange.start), 'd MMM')} - ${format(new Date(customRange.end), 'd MMM')}`
                                    : 'Custom')
                                : filter}
                        </span>
                    </div>

                    {/* SVG Chart */}
                    <div className="h-32 w-full flex items-end justify-between px-2 relative pt-4">
                        {/* Y-Axis Labels (Min/Max) */}
                        <div className="absolute left-0 top-4 bottom-0 flex flex-col justify-between text-[10px] text-text-secondary font-medium pointer-events-none z-10 opacity-70">
                            <span>{formatCompactMoney(maxDataValue)}</span>
                            <span>{formatCompactMoney(minDataValue)}</span>
                        </div>

                        <div className="absolute inset-x-8 bottom-0 top-4 border-t border-dashed border-border-color/50" />

                        <svg className="w-full h-full overflow-visible ml-6" preserveAspectRatio="none" viewBox="0 0 100 100">
                            <motion.path
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                                d={generateSmoothPath(sparklineData, 100, 100)}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                className="text-primary opacity-80"
                            />
                        </svg>
                    </div>

                    <div className="flex justify-between mt-4 text-xs text-text-secondary font-medium px-2 pl-8">
                        {chartLabels.map((label, i) => (
                            <span key={i} className={i === chartLabels.length - 1 ? "text-primary font-bold" : ""}>{label}</span>
                        ))}
                    </div>
                </motion.div>

                {/* Insight Tip */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-[24px] bg-surface backdrop-blur-xl border border-border-color shadow-sm flex items-center gap-4"
                >
                    <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success shrink-0">
                        <Lightbulb size={20} />
                    </div>
                    <p className="text-sm">
                        Total outflow for this period is <span className="text-primary font-bold">{formatMoney(totalOutflow)}</span>.
                    </p>
                </motion.div>

                {/* Category Breakdown */}
                <motion.div
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
                    }}
                    className="p-6 rounded-[32px] bg-surface backdrop-blur-xl border border-border-color shadow-sm"
                >
                    <h3 className="font-bold mb-6">Category Breakdown</h3>

                    <div className="flex items-center justify-center py-6 relative">
                        {/* Donut Chart Placeholder - SVG with animation */}
                        <div className="relative w-40 h-40">
                            <svg viewBox="0 0 100 100" className="rotate-[-90deg]">
                                <AnimatePresence mode='wait'>
                                    {categoryStats.map((cat, i) => {
                                        const prevTotal = categoryStats.slice(0, i).reduce((sum, c) => sum + c.total, 0);
                                        const startPercent = totalOutflow > 0 ? prevTotal / totalOutflow : 0;
                                        const percent = totalOutflow > 0 ? cat.total / totalOutflow : 0;

                                        const circumference = 2 * Math.PI * 40;
                                        const strokeDasharray = `${percent * circumference} ${circumference}`;
                                        const strokeDashoffset = -startPercent * circumference;

                                        return (
                                            <motion.circle
                                                key={`${filter}-${cat.id}`}
                                                initial={{ opacity: 0, strokeDasharray: `0 ${circumference}` }}
                                                animate={{ opacity: 1, strokeDasharray }}
                                                transition={{ duration: 1, delay: 0.2 + (i * 0.1), ease: "easeOut" }}
                                                cx="50" cy="50" r="40"
                                                fill="none"
                                                stroke={cat.color}
                                                strokeWidth="10"
                                                strokeDashoffset={strokeDashoffset}
                                            />
                                        );
                                    })}
                                </AnimatePresence>
                                {categoryStats.length === 0 && (
                                    <motion.circle
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.3 }}
                                        cx="50" cy="50" r="40" fill="none" stroke="var(--border-color)" strokeWidth="10"
                                    />
                                )}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] text-text-secondary">Top</span>
                                <motion.span
                                    key={filter}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm font-bold truncate max-w-[80px]"
                                    style={{ color: categoryStats[0]?.color || 'var(--text-primary)' }}
                                >
                                    {categoryStats[0]?.name || '-'}
                                </motion.span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 mt-4">
                        {categoryStats.slice(0, 4).map((cat, i) => (
                            <motion.div
                                key={`${filter}-${cat.id}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + (i * 0.1) }}
                            >
                                <div className="flex justify-between text-sm font-medium mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span>{cat.name}</span>
                                    </div>
                                    <span>{formatMoney(cat.total)}</span>
                                </div>
                                <div className="h-1.5 bg-border-color rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(cat.total / totalOutflow) * 100}%` }}
                                        transition={{ duration: 1, delay: 0.6 + (i * 0.1) }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>

            <DateRangePicker
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                startDate={customRange.start}
                endDate={customRange.end}
                onChange={handleDateRangeChange}
            />

            {/* Bottom Navigation - Removed, using shared Dashboard nav */}
        </div>
    );
}

// Helper utility for classnames
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
