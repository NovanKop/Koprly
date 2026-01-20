import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
    onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationBell({ onNotificationClick }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadNotifications();
        loadUnreadCount();
    }, []);

    const loadNotifications = async () => {
        const data = await api.getNotifications(10);
        setNotifications(data);
    };

    const loadUnreadCount = async () => {
        const count = await api.getUnreadNotificationCount();
        setUnreadCount(count);
    };

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.markNotificationRead(id);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
            ));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        setLoading(true);
        try {
            await api.markAllNotificationsRead();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.deleteNotification(id);
            const notification = notifications.find(n => n.id === id);
            setNotifications(notifications.filter(n => n.id !== id));
            if (notification && !notification.read) {
                setUnreadCount(Math.max(0, unreadCount - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            handleMarkAsRead(notification.id, { stopPropagation: () => { } } as React.MouseEvent);
        }
        if (onNotificationClick) {
            onNotificationClick(notification);
        }
        setShowDropdown(false);
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'budget_warning':
            case 'budget_critical':
                return '⚠️';
            case 'daily_summary':
                return '📊';
            case 'bill_reminder':
                return '💳';
            case 'streak_reward':
                return '🚀';
            case 'missing_log':
                return '📝';
            case 'anomaly_alert':
                return '🔍';
            default:
                return '📬';
        }
    };

    return (
        <div className="relative">
            {/* Bell Icon Button */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 rounded-full hover:bg-surface transition-colors"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 bg-error text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {showDropdown && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowDropdown(false)}
                        />

                        {/* Notification Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-96 max-h-[500px] backdrop-blur-xl bg-surface/95 border border-border-color rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-border-color flex items-center justify-between">
                                <h3 className="font-semibold">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        disabled={loading}
                                        className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* Notification List */}
                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-text-secondary">
                                        <Bell size={48} className="mx-auto mb-3 opacity-30" />
                                        <p>No notifications yet</p>
                                        <p className="text-sm mt-1">We'll notify you about important updates</p>
                                    </div>
                                ) : (
                                    notifications.map((notification) => (
                                        <motion.div
                                            key={notification.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`p-4 border-b border-border-color hover:bg-surface-highlight cursor-pointer transition-colors ${!notification.read ? 'bg-primary/5' : ''
                                                }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Icon */}
                                                <div className="text-2xl mt-1">
                                                    {getNotificationIcon(notification.type)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-medium text-sm">{notification.title}</h4>
                                                        <div className="flex items-center gap-1">
                                                            {!notification.read && (
                                                                <button
                                                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                                    className="p-1 hover:bg-surface rounded transition-colors"
                                                                    title="Mark as read"
                                                                >
                                                                    <Check size={16} className="text-success" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => handleDelete(notification.id, e)}
                                                                className="p-1 hover:bg-surface rounded transition-colors"
                                                                title="Delete"
                                                            >
                                                                <X size={16} className="text-text-secondary" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-text-secondary mt-2">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>

                                                {/* Unread Indicator */}
                                                {!notification.read && (
                                                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="p-3 border-t border-border-color flex items-center justify-between">
                                    <button
                                        onClick={async () => {
                                            setLoading(true);
                                            try {
                                                await api.deleteAllNotifications();
                                                setNotifications([]);
                                                setUnreadCount(0);
                                            } catch (error) {
                                                console.error('Failed to delete all:', error);
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className="text-sm text-error hover:text-error/80 transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <Trash2 size={14} />
                                        Clear all
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
