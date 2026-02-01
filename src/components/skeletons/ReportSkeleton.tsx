import { Skeleton } from "../ui/Skeleton";

export function ReportSkeleton() {
    return (
        <div className="relative min-h-screen bg-transparent text-text-primary pb-28 overflow-hidden">
            {/* Header Skeleton */}
            <div className="px-6 pt-8 pb-4 flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-10 rounded-xl" />
            </div>

            {/* Time Filter Skeleton */}
            <div className="px-6 mb-8">
                <Skeleton className="h-10 w-full rounded-2xl" />
            </div>

            <div className="px-6 space-y-6">
                {/* Total Outflow Card Skeleton */}
                <div className="p-6 rounded-[32px] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 h-[140px]">
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>

                {/* Grid: Health & Top Merchant */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 h-48 rounded-[32px] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 flex flex-col justify-between">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-5 w-5 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-20" />
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    </div>
                    <div className="p-5 h-48 rounded-[32px] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 flex flex-col justify-between">
                        <Skeleton className="h-3 w-20" />
                        <div className="self-end space-y-1">
                            <Skeleton className="h-3 w-16 ml-auto" />
                            <Skeleton className="h-6 w-24 ml-auto" />
                        </div>
                        <div className="h-10 w-10 rounded-full border-2 border-white/10 flex items-center justify-center">
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Spending Trends Skeleton */}
                <div className="p-6 rounded-[32px] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 h-[240px]">
                    <div className="flex justify-between mb-6">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="h-32 flex items-end justify-between gap-2">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className={`w-full rounded-t-sm h-[${Math.random() * 80 + 20}%] opacity-30`} />
                        ))}
                    </div>
                </div>

                {/* Category Breakdown Skeleton */}
                <div className="p-6 rounded-[32px] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5">
                    <Skeleton className="h-6 w-40 mb-6" />
                    <div className="flex justify-center py-6">
                        <Skeleton className="h-40 w-40 rounded-full border-[10px] border-gray-200 dark:border-gray-800" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex justify-between">
                                <div className="flex gap-2">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
