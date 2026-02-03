import { supabase } from './supabase';
import type { Category, Transaction, NewTransaction, Profile, Wallet, Notification, NewNotification, NotificationPreferences } from '../types';

export const api = {
    // Profile
    getProfile: async (): Promise<Profile | null> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data;
    },

    updateProfile: async (updates: Partial<Profile>): Promise<void> => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', (await supabase.auth.getUser()).data.user?.id!);

            if (error) throw error;
        } catch (error: any) {
            // Fallback: If ANY error occurs and we were trying to update reset_day, 
            // assume it might be a schema mismatch and retry without it.
            if (updates.reset_day) {
                console.warn('Update failed with reset_day, retrying without it...', error);
                const { reset_day, ...safeUpdates } = updates;
                const { error: retryError } = await supabase
                    .from('profiles')
                    .update(safeUpdates)
                    .eq('id', (await supabase.auth.getUser()).data.user?.id!);

                if (retryError) throw retryError;
                return;
            }
            throw error;
        }
    },

    uploadProfilePicture: async (file: File): Promise<string> => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error('No user found');

        // Create a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data } = supabase.storage
            .from('profiles')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    // Categories
    // Categories
    getCategories: async (): Promise<Category[]> => {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name, icon, color, monthly_budget')
            .order('name');

        if (error) throw error;

        // Deduplicate categories by name
        const uniqueCategories = data?.reduce((acc: Category[], current) => {
            const x = acc.find(item => item.name === current.name);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);

        return uniqueCategories || [];
    },

    createDefaultCategories: async (userId: string) => {
        // Check if user already has categories
        const { count } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (count && count > 0) return;

        const defaults = [
            { name: 'Groceries', icon: '🛒', color: '#34C759', user_id: userId },
            { name: 'Dining Out', icon: '🍽️', color: '#FF9500', user_id: userId },
            { name: 'Transportation', icon: '🚗', color: '#007AFF', user_id: userId },
            { name: 'Housing', icon: '🏠', color: '#5856D6', user_id: userId },
            { name: 'Entertainment', icon: '🎬', color: '#FF2D55', user_id: userId },
            { name: 'Healthcare', icon: '🏥', color: '#FF3B30', user_id: userId },
            { name: 'Shopping', icon: '👕', color: '#AF52DE', user_id: userId },
            { name: 'Other', icon: '💼', color: '#8E8E93', user_id: userId },
        ];

        const { error } = await supabase.from('categories').insert(defaults);
        if (error) throw error;
    },

    createCategory: async (category: { name: string; icon: string; color: string; monthly_budget?: number; user_id: string }) => {
        const { data, error } = await supabase
            .from('categories')
            .insert(category)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateCategory: async (id: string, updates: Partial<Category>) => {
        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteCategory: async (id: string) => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Wallets
    getWallets: async (): Promise<Wallet[]> => {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('id, user_id, name, balance, type, color, created_at')
                .order('created_at');

            if (error) {
                // If table doesn't exist, return empty array instead of crashing
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    console.warn('Wallets table missing, returning empty array');
                    return [];
                }
                throw error;
            }
            return data || [];
        } catch (error: any) {
            // Double check for the error code/message in caught error
            if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('Could not find the table')) {
                return [];
            }
            throw error;
        }
    },

    createWallet: async (wallet: Partial<Wallet>) => {
        const { data, error } = await supabase
            .from('wallets')
            .insert(wallet)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateWallet: async (id: string, updates: Partial<Wallet>) => {
        const { data, error } = await supabase
            .from('wallets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteWallet: async (id: string) => {
        const { error } = await supabase
            .from('wallets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Transactions (Expenses & Income)
    getTransactions: async (): Promise<Transaction[]> => {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, category:categories(*)')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    addTransaction: async (transaction: NewTransaction) => {
        const { data, error } = await supabase
            .from('transactions')
            .insert(transaction)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateTransaction: async (id: string, updates: Partial<Transaction>) => {
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteTransaction: async (id: string) => {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    getEarliestTransactionDate: async (): Promise<Date | null> => {
        // 1. Get earliest transaction
        const { data: txnData, error: txnError } = await supabase
            .from('transactions')
            .select('date')
            .order('date', { ascending: true })
            .limit(1)
            .single();

        // 2. Get profile creation date (as fallback for 'new user')
        const { data: profileData } = await supabase
            .from('profiles')
            .select('created_at')
            .single();

        if (txnError && txnError.code !== 'PGRST116') { // PGRST116 is 'No rows found'
            console.error('Error fetching earliest transaction:', txnError);
        }

        let earliestDate: Date | null = null;

        if (txnData?.date) {
            earliestDate = new Date(txnData.date);
        }

        if (profileData?.created_at) {
            const profileDate = new Date(profileData.created_at);
            // If we have an earliest transaction, take the min of both.
            // If not, use profile date.
            if (!earliestDate || profileDate < earliestDate) {
                earliestDate = profileDate;
            }
        }

        // Return null if absolutely no data found (unlikely for authenticated user)
        return earliestDate;
    },

    // Legacy for backward compatibility
    getExpenses: async (): Promise<Transaction[]> => {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, category:categories(*)')
            .eq('type', 'expense')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    addExpense: async (expense: any) => {
        return api.addTransaction({ ...expense, type: 'expense' as const });
    },

    addIncome: async (income: { amount: number; description?: string; user_id: string; date: string; wallet_id?: string }) => {
        // Explicitly create income transaction without category_id
        const incomeTransaction = {
            amount: income.amount,
            description: income.description,
            user_id: income.user_id,
            date: income.date,
            wallet_id: income.wallet_id,
            type: 'income' as const,
        };
        return api.addTransaction(incomeTransaction);
    },

    resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
    },

    resetAccount: async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error('No user found');

        // 1. Delete all transactions
        const { error: txError } = await supabase
            .from('transactions')
            .delete()
            .eq('user_id', user.id);
        if (txError) throw new Error(`Transaction deletion failed: ${txError.message}`);

        // 2. Delete all wallets
        const { error: walletError } = await supabase
            .from('wallets')
            .delete()
            .eq('user_id', user.id);
        if (walletError) throw new Error(`Wallet deletion failed: ${walletError.message}`);

        // 3. Delete all categories
        const { error: catError } = await supabase
            .from('categories')
            .delete()
            .eq('user_id', user.id);
        if (catError) throw new Error(`Category deletion failed: ${catError.message}`);

        // 4. Reset Profile (name, budget, period)
        const { error: profError } = await supabase
            .from('profiles')
            .update({
                total_budget: 0,
                budget_period: null,
                username: null
            })
            .eq('id', user.id);
        if (profError) throw new Error(`Profile reset failed: ${profError.message}`);
    },

    // ============================================
    // NOTIFICATIONS
    // ============================================

    /**
     * Get user notifications (optionally filtered, sorted by newest first)
     */
    getNotifications: async (limit = 20, unreadOnly = false): Promise<Notification[]> => {
        let query = supabase
            .from('notifications')
            .select('id, user_id, type, title, message, metadata, read, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.eq('read', false);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Get unread notification count
     */
    getUnreadNotificationCount: async (): Promise<number> => {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('read', false);

        if (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }
        return count || 0;
    },

    /**
     * Mark a notification as read
     */
    markNotificationRead: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Mark all notifications as read
     */
    markAllNotificationsRead: async (): Promise<void> => {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('read', false);

        if (error) throw error;
    },

    /**
     * Delete a notification
     */
    deleteNotification: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Delete all notifications
     */
    deleteAllNotifications: async (): Promise<void> => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error('No user found');

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;
    },

    /**
     * Create a notification (typically used by Edge Functions, but available for testing)
     */
    createNotification: async (notification: NewNotification): Promise<Notification> => {
        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ============================================
    // NOTIFICATION PREFERENCES
    // ============================================

    /**
     * Get user notification preferences
     */
    getNotificationPreferences: async (): Promise<NotificationPreferences | null> => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return null;

        const { data, error } = await supabase
            .from('notification_preferences')
            .select('user_id, budget_alerts, daily_summary, bill_reminders, streak_rewards, anomaly_alerts, missing_log_alerts, summary_time, created_at, updated_at')
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error('Error fetching notification preferences:', error);
            return null;
        }
        return data;
    },

    /**
     * Update notification preferences
     */
    updateNotificationPreferences: async (
        updates: Partial<Omit<NotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>
    ): Promise<NotificationPreferences> => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error('No user found');

        const { data, error } = await supabase
            .from('notification_preferences')
            .update(updates)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};
