import { Skeleton } from "../ui/Skeleton";

export function BudgetSkeleton() {
    return (
        <div className="relative min-h-screen bg-background text-text-primary pb-28 overflow-x-hidden transition-colors duration-300">
            {/* Header Skeleton */}
            <div className="px-6 pt-8 pb-4 flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-10 rounded-xl" />
            </div>

            <div className="px-6 space-y-6">
                {/* Total Balance Card Skeleton */}
                <div className="relative px-6 py-5 rounded-[32px] overflow-hidden border border-white/40 dark:border-white/10 h-[140px] bg-white/70 dark:bg-white/5">
                    <div className="flex justify-between items-center h-full">
                        <div className="flex flex-col gap-3">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-8 w-40" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                </div>

                {/* Monthly Budget Card Skeleton */}
                <div className="relative px-6 py-5 rounded-[32px] overflow-hidden border border-white/40 dark:border-white/10 h-[140px] bg-white/70 dark:bg-white/5">
                    <div className="flex justify-between items-center h-full">
                        <div className="flex flex-col gap-3">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-8 w-40" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                </div>

                {/* Category List Skeleton */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-[24px] border border-white/40 dark:border-white/5 bg-white/50 dark:bg-white/5">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-5 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
