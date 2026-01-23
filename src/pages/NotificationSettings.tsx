import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Clock, Save } from 'lucide-react';
import { api } from '../lib/api';
import type { NotificationPreferences } from '../types';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

interface NotificationSettingsProps {
    onBack: () => void;
}

export default function NotificationSettings({ onBack }: NotificationSettingsProps) {
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        setLoading(true);
        try {
            const data = await api.getNotificationPreferences();
            setPreferences(data);
        } catch (error) {
            console.error('Failed to load preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!preferences) return;
        setSaving(true);
        try {
            await api.updateNotificationPreferences({
                budget_alerts: preferences.budget_alerts,
                daily_summary: preferences.daily_summary,
                bill_reminders: preferences.bill_reminders,
                streak_rewards: preferences.streak_rewards,
                anomaly_alerts: preferences.anomaly_alerts,
                missing_log_alerts: preferences.missing_log_alerts,
                summary_time: preferences.summary_time,
            });
            alert('Notification preferences saved!');
        } catch (error) {
            console.error('Failed to save preferences:', error);
            alert('Failed to save preferences. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const togglePreference = (key: keyof NotificationPreferences) => {
        if (!preferences) return;
        setPreferences({
            ...preferences,
            [key]: !preferences[key]
        });
    };

    const notificationTypes = [
        {
            key: 'budget_alerts' as const,
            label: 'Budget Alerts',
            description: 'Get notified at 80% and 100% of your budget',
            icon: '⚠️'
        },
        {
            key: 'daily_summary' as const,
            label: 'Daily Summary',
            description: 'Receive a summary of your spending each day',
            icon: '📊'
        },
        {
            key: 'streak_rewards' as const,
            label: 'Streak Rewards',
            description: 'Celebrate your spending discipline achievements',
            icon: '🚀'
        },
        {
            key: 'anomaly_alerts' as const,
            label: 'Anomaly Detection',
            description: 'Alert when unusual spending is detected',
            icon: '🔍'
        },
        {
            key: 'missing_log_alerts' as const,
            label: 'Missing Log Reminders',
            description: 'Remind you to log your daily expenses',
            icon: '📝'
        },
        {
            key: 'bill_reminders' as const,
            label: 'Bill Reminders',
            description: 'Get reminded about upcoming bills',
            icon: '💳'
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-text-secondary">Loading preferences...</p>
                </div>
            </div>
        );
    }

    if (!preferences) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-text-secondary">Failed to load preferences</p>
                    <button onClick={onBack} className="mt-4 text-primary">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-primary pb-24">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border-color">
                <div className="p-4 flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-surface rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Notification Settings</h1>
                        <p className="text-sm text-text-secondary">Manage your notification preferences</p>
                    </div>
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto space-y-6">
                {/* Notification Types */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Bell size={20} />
                        Notification Types
                    </h2>

                    {notificationTypes.map((type, idx) => (
                        <motion.div
                            key={type.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="backdrop-blur-xl bg-surface border border-border-color rounded-2xl p-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl mt-1">{type.icon}</div>
                                    <div>
                                        <h3 className="font-medium">{type.label}</h3>
                                        <p className="text-sm text-text-secondary mt-1">
                                            {type.description}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => togglePreference(type.key)}
                                    className={`relative w-14 h-8 rounded-full transition-colors ${preferences[type.key] ? 'bg-success' : 'bg-border-color'
                                        }`}
                                >
                                    <motion.div
                                        className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                                        animate={{
                                            x: preferences[type.key] ? 24 : 0
                                        }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Daily Summary Time */}
                {preferences.daily_summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="backdrop-blur-xl bg-surface border border-border-color rounded-2xl p-4"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <Clock size={20} />
                            <h3 className="font-medium">Daily Summary Time</h3>
                        </div>
                        <p className="text-sm text-text-secondary mb-3">
                            Choose when you'd like to receive your daily spending summary
                        </p>
                        <input
                            type="time"
                            value={preferences.summary_time.substring(0, 5)}
                            onChange={(e) => setPreferences({
                                ...preferences,
                                summary_time: e.target.value + ':00'
                            })}
                            className="w-full px-4 py-3 bg-background border border-border-color rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <p className="text-xs text-text-secondary mt-2">
                            Default: 20:00 (8:00 PM)
                        </p>
                    </motion.div>
                )}

                {/* Save Button */}
                <Button
                    onClick={handleSave}
                    isLoading={saving}
                    className="w-full mt-6"
                >
                    <Save size={18} />
                    Save Preferences
                </Button>

                {/* Info Box */}
                <div className="backdrop-blur-xl bg-primary/10 border border-primary/30 rounded-2xl p-4 mt-6">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                        💡 About Notifications
                    </h3>
                    <ul className="text-sm text-text-secondary space-y-2">
                        <li>• Budget alerts help you stay within your spending limits</li>
                        <li>• Daily summaries provide insights into your spending habits</li>
                        <li>• Streak rewards motivate you to maintain good financial discipline</li>
                        <li>• All notifications are personalized to your spending patterns</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
