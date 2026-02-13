export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    monthly_budget?: number;
    user_id?: string;
}

export interface Wallet {
    id: string;
    user_id: string;
    name: string;
    balance: number;
    type: string;
    color: string;
    created_at?: string;
}

export interface Transaction {
    id: string;
    type: 'expense' | 'income';
    amount: number;
    description?: string;
    date: string; // ISO date string YYYY-MM-DD
    category_id?: string; // Optional for income
    wallet_id?: string; // Link to wallet
    created_at: string;
    user_id?: string;
    category?: Category; // Joined data
    wallet?: Wallet; // Joined data
}

export interface Profile {
    id: string;
    email?: string;
    username?: string;
    display_name?: string;
    profile_picture?: string;
    currency: string;
    total_budget: number;
    spending_limit: number;              // The stable anchor for budget allocation
    budget_period: 'monthly' | 'weekly';
    period_type: 'monthly' | 'weekly' | 'rolling'; // Budget reset period
    reset_day?: number;                   // Day of month to reset (1-31, or -1 for Last Day)
    onboarding_complete: boolean;        // Track if onboarding finished
    onboarding_koprlyst_done: boolean;   // Track if interactive guide finished
    onboarding_step: number;             // Resume progress (1-4)
    theme: string;
    date_format?: DateFormat;
    created_at: string;
    updated_at: string;
}

export type DateFormat = 'DD/MM/YYYY' | 'DD MMM YYYY' | 'Relative';

// Legacy type for backward compatibility
export type Expense = Omit<Transaction, 'type'> & { type?: 'expense' };
export type NewTransaction = Omit<Transaction, 'id' | 'created_at' | 'category' | 'wallet'>;

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType =
    | 'budget_warning'
    | 'budget_critical'
    | 'daily_summary'
    | 'bill_reminder'
    | 'streak_reward'
    | 'missing_log'
    | 'anomaly_alert';

export interface NotificationMetadata {
    category_name?: string;
    amount?: number;
    percentage?: number;
    diff_percentage?: number;
    health_score?: number;
    streak_days?: number;
    deep_link?: string;
    bill_name?: string;
    [key: string]: any;
}

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata: NotificationMetadata;
    read: boolean;
    created_at: string;
}

export interface NotificationPreferences {
    user_id: string;
    budget_alerts: boolean;
    daily_summary: boolean;
    bill_reminders: boolean;
    streak_rewards: boolean;
    anomaly_alerts: boolean;
    missing_log_alerts: boolean;
    summary_time: string; // HH:MM:SS format
    created_at: string;
    updated_at: string;
}

export type NewNotification = Omit<Notification, 'id' | 'created_at'>;

export interface UserFeedback {
    id: string;
    user_id: string;
    category: 'Bug' | 'Feature Request' | 'UI/UX Improvement' | 'Other';
    message: string;
    screenshot_url?: string;
    status: 'pending' | 'in-progress' | 'resolved' | 'ignored';
    created_at: string;
}
