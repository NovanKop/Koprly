-- Smart Notification Engine - Database Schema Migration
-- This migration creates the notifications system tables and RLS policies

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'budget_warning',
        'budget_critical',
        'daily_summary',
        'bill_reminder',
        'streak_reward',
        'missing_log',
        'anomaly_alert'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Stores dynamic data: { category_name, amount, percentage, deep_link, etc. }
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true); -- Edge Functions will insert with service role

-- ============================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Toggle switches for each notification type
    budget_alerts BOOLEAN DEFAULT TRUE,
    daily_summary BOOLEAN DEFAULT TRUE,
    bill_reminders BOOLEAN DEFAULT TRUE,
    streak_rewards BOOLEAN DEFAULT TRUE,
    anomaly_alerts BOOLEAN DEFAULT TRUE,
    missing_log_alerts BOOLEAN DEFAULT TRUE,
    
    -- Daily summary time (default 20:00 / 8:00 PM)
    summary_time TIME DEFAULT '20:00:00',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own preferences"
    ON notification_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. HELPER FUNCTION: Auto-create preferences
-- ============================================
-- Automatically create default notification preferences when a user signs up
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================
-- 4. HELPER FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_preferences_timestamp ON notification_preferences;
CREATE TRIGGER update_notification_preferences_timestamp
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ============================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE notifications IS 'Stores all user notifications with metadata for personalization';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types and timing';
COMMENT ON COLUMN notifications.metadata IS 'JSONB field storing dynamic variables like category_name, amount, percentage for message rendering';
COMMENT ON COLUMN notification_preferences.summary_time IS 'User-configurable time for daily summary notifications (default 20:00)';
