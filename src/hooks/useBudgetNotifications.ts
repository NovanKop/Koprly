import { useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Category, Profile } from '../types';
import { formatMoney } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

interface UseBudgetNotificationsProps {
    profile: Profile | null;
    categories: Category[];
}

export const useBudgetNotifications = ({ profile, categories }: UseBudgetNotificationsProps) => {
    const { user } = useAuth();
    const { currency } = useAppStore();
    const processedRef = useRef(false);

    useEffect(() => {
        const checkAndSendNotification = async () => {
            if (!user || !profile || processedRef.current) return;

            // Allow re-checking after some time or if data changes significantly? 
            // For now, let's run once per mount/session to avoid spam loops.
            processedRef.current = true;

            const spendingLimit = profile.total_budget || 0;
            const totalAllocated = categories.reduce((sum, c) => sum + (c.monthly_budget || 0), 0);
            const remainingToAllocate = spendingLimit - totalAllocated;
            const isAllocated = totalAllocated > 0;

            // Define the notification payload based on state
            let title = '';
            let message = '';
            let deepLink = '';
            let shouldNotify = false;

            if (spendingLimit === 0) {
                // Case 1: No Total Budget Set
                title = `Set Your Spending Limit! 🛑`;
                message = "You haven't set a total budget yet. Tap here to set it and start tracking effectively.";
                deepLink = '/budget?action=edit_limit';
                shouldNotify = true;
            } else if (!isAllocated) {
                // Case 2: Budget Set but Nothing Allocated
                title = `Start Planning, ${profile.username || 'Friend'}! 📝`;
                message = "You have a spending limit but no category budgets. Give every Rupiah a job!";
                deepLink = '/budget?action=add_category';
                shouldNotify = true;
            } else if (remainingToAllocate > 0) {
                // Case 3: Partial Allocation (The main request)
                title = `Almost there, ${profile.username || 'Friend'}! 🎯`;
                message = `Let's give every Rupiah a job. You still have ${formatMoney(remainingToAllocate, currency)} left to plan!`;
                deepLink = '/budget?action=add_category';
                shouldNotify = true;
            }

            if (shouldNotify) {
                try {
                    // 1. Fetch unread notifications to prevent duplicates
                    const unreadNotifications = await api.getNotifications(20, true);

                    // Check if a similar notification already exists (matching title roughly)
                    const isDuplicate = unreadNotifications.some(n => n.title === title);

                    if (!isDuplicate) {
                        await api.createNotification({
                            user_id: user.id,
                            type: 'budget_warning', // Using existing type
                            title: title,
                            message: message,
                            metadata: {
                                deep_link: deepLink,
                                remaining: remainingToAllocate
                            },
                            read: false
                        });
                        console.log('Budget Nudge Notification Sent:', title);
                    }
                } catch (error) {
                    console.error('Failed to create budget notification:', error);
                }
            }
        };

        const timer = setTimeout(checkAndSendNotification, 3000); // 3s delay to ensure data settles
        return () => clearTimeout(timer);

    }, [user, profile, categories, currency]);
};
