import { Skeleton } from "../ui/Skeleton";

export function DashboardSkeleton() {
    return (
        <div className="relative min-h-screen bg-background text-text-primary pb-24 overflow-x-hidden transition-colors duration-300">
            {/* Header Skeleton */}
            <div className="px-6 pt-12 pb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>

            <div className="space-y-8 pb-24">
                {/* Total Balance Card Skeleton */}
                <div className="px-5">
                    <div className="relative px-6 py-5 rounded-[32px] overflow-hidden border border-white/40 dark:border-white/10 h-[160px] bg-white/70 dark:bg-white/5">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <Skeleton className="h-4 w-24 bg-gray-300 dark:bg-gray-700" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </div>
                            <Skeleton className="h-10 w-48 bg-gray-300 dark:bg-gray-700" />
                            <div className="flex justify-between items-center mt-2">
                                <Skeleton className="h-8 w-24 rounded-full bg-gray-300 dark:bg-gray-700" />
                                <Skeleton className="h-8 w-20 bg-gray-300 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wallets Skeleton */}
                <div className="pl-6">
                    <div className="flex items-center justify-between pr-6 mb-4">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex gap-4 overflow-hidden">
                        {[1, 2].map((i) => (
                            <Skeleton key={i} className="h-32 w-40 rounded-[24px] flex-shrink-0" />
                        ))}
                        <Skeleton className="h-32 w-12 rounded-[24px] flex-shrink-0" />
                    </div>
                </div>

                {/* Recent Activity Skeleton */}
                <div className="px-6">
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-[24px] border border-white/40 dark:border-white/5 bg-white/50 dark:bg-white/5">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="h-5 w-24" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
