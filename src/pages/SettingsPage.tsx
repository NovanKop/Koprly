import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit2, Calendar, Moon, Sun, ChevronRight, Check, Pencil, Camera, Image as ImageIcon, Bell, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import type { Profile } from '../types';
import { GlassCard } from '../components/glass/GlassCard';
import { GlassButton } from '../components/glass/GlassButton';

interface SettingsPageProps {
    onBack: () => void;
    onNavigateToNotifications?: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
    const { user, signOut } = useAuth();
    const {
        theme,
        language,
        firstDayOfWeek,
        dateFormat,
        setTheme,
        setLanguage,
        setFirstDayOfWeek,
        setDateFormat
    } = useAppStore();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');

    // Profile Picture State
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const loadProfile = async () => {
        try {
            const data = await api.getProfile();
            setProfile(data);
            // Load existing profile picture if available
            if (data?.profile_picture) {
                setProfilePicture(data.profile_picture);
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        }
    };

    // Handle file selection (gallery or camera)
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingPhoto(true);
            try {
                // Preview immediately
                const reader = new FileReader();
                reader.onloadend = () => {
                    setProfilePicture(reader.result as string);
                };
                reader.readAsDataURL(file);

                // Upload to Supabase
                const url = await api.uploadProfilePicture(file);

                // Update profile with new picture URL
                await api.updateProfile({ profile_picture: url });
                setProfilePicture(url);

                // Reload profile to get updated data
                await loadProfile();
            } catch (error) {
                console.error('Failed to upload profile picture:', error);
                alert('Failed to upload profile picture. Please try again.');
            } finally {
                setIsUploadingPhoto(false);
            }
        }
        setShowPhotoOptions(false);
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        loadProfile();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error(error);
        }
    };



    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isResetSuccess, setIsResetSuccess] = useState(false);

    const handleResetAccount = async () => {
        setIsResetting(true);
        try {
            await api.resetAccount();
            setIsResetting(false);
            setIsResetSuccess(true);

            // Wait for animation then reload
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            console.error('Failed to reset account:', error);
            alert(`Failed to reset account: ${error.message || JSON.stringify(error)}`);
            setIsResetting(false);
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) return;

        try {
            await api.updateProfile({ username: newName });
            setProfile(prev => prev ? { ...prev, username: newName } : null);
            setIsEditingName(false);
        } catch (error) {
            console.error('Failed to update name:', error);
            alert('Failed to update name. Please try again.');
        }
    };

    const startEditingName = () => {
        setNewName(profile?.username || user?.email?.split('@')[0] || 'User');
        setIsEditingName(true);
    };

    return (
        <motion.div
            className="min-h-screen bg-transparent text-text-primary pb-28 relative z-0"
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
            {/* Header */}
            <div className="px-6 pt-8 pb-4 flex items-center">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-xl hover:bg-surface transition-colors"
                >
                    <ArrowLeft size={20} className="text-primary" />
                </button>
                <h1 className="flex-1 text-center text-lg font-semibold mr-8">Account Settings</h1>
            </div>

            {/* Profile Info */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } } }}>
                <GlassCard variant="elevated" className="flex flex-col items-center mx-5 mt-4 mb-8 p-6 rounded-[32px] !overflow-visible">
                    {/* Hidden file inputs */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                    />
                    <input
                        type="file"
                        ref={cameraInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        capture="user"
                        className="hidden"
                    />

                    <div className="relative z-[100]">
                        <div
                            className="h-24 w-24 rounded-full bg-gradient-to-br from-[#FFD1D1] to-[#FFE4C4] border-4 border-background flex items-center justify-center p-1 overflow-hidden cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                        >
                            {profilePicture ? (
                                <img
                                    src={profilePicture}
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-gray-800">
                                    {profile?.username?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Pencil Icon Overlay */}
                        <button
                            onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                            className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-white border-[3px] border-background shadow-lg hover:bg-primary/90 transition-colors"
                            disabled={isUploadingPhoto}
                        >
                            {isUploadingPhoto ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Pencil size={12} />
                            )}
                        </button>

                        {/* Photo Options Dropdown */}
                        <AnimatePresence>
                            {showPhotoOptions && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 !bg-[#ffffff] dark:!bg-[#1a1a2e] !text-[#1D1D1F] dark:!text-white border border-border-color rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[180px]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            fileInputRef.current?.click();
                                        }}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-highlight transition-colors text-left"
                                    >
                                        <ImageIcon size={18} className="text-primary" />
                                        <span className="text-sm font-medium">Choose from Gallery</span>
                                    </button>
                                    <div className="h-px bg-border-color" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            cameraInputRef.current?.click();
                                        }}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-highlight transition-colors text-left"
                                    >
                                        <Camera size={18} className="text-primary" />
                                        <span className="text-sm font-medium">Take a Photo</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {isEditingName ? (
                        <div className="mt-4 flex items-center gap-2 relative z-0">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="bg-surface-highlight border border-border-color rounded-xl px-3 py-1 text-lg font-bold text-center w-40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateName();
                                    if (e.key === 'Escape') setIsEditingName(false);
                                }}
                            />
                            <button
                                onClick={handleUpdateName}
                                className="p-1.5 rounded-full bg-success/20 text-success hover:bg-success/30 transition-colors"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={() => setIsEditingName(false)}
                                className="p-1.5 rounded-full bg-error/20 text-error hover:bg-error/30 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center gap-2 relative z-0 group">
                            <h2 className="text-xl font-bold">{profile?.username || 'User'}</h2>
                            <button
                                onClick={startEditingName}
                                className="p-1.5 rounded-full bg-surface-highlight text-primary opacity-50 hover:opacity-100 transition-opacity hover:bg-primary/10"
                                aria-label="Edit Name"
                            >
                                <Pencil size={14} />
                            </button>
                        </div>
                    )}
                    <p className="text-sm text-primary font-medium tracking-wide relative z-0">Pro Member</p>
                </GlassCard>
            </motion.div>

            <motion.div
                className="px-5 space-y-8"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } } }}
            >
                <div>
                    <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-wider pl-1">Preferences</h3>
                    <GlassCard className="rounded-[20px] overflow-hidden">
                        {/* Currency */}
                        {/* Currency (Locked) */}
                        <div className="p-4 flex items-center justify-between opacity-50 cursor-not-allowed border-b border-border-color">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                                    <span className="font-bold text-lg max-w-[24px] flex justify-center">$</span>
                                </div>
                                <div>
                                    <p className="font-medium">Default Currency</p>
                                    <p className="text-xs text-gray-400">Rupiah (Rp)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded-lg bg-surface-highlight border border-border-color text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            </div>
                        </div>

                        {/* First Day of Week */}
                        <div
                            className="p-4 flex items-center justify-between hover:bg-surface-highlight transition-colors cursor-pointer border-b border-border-color"
                            onClick={() => setFirstDayOfWeek(firstDayOfWeek === 'Monday' ? 'Sunday' : 'Monday')}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                                    <Calendar size={20} />
                                </div>
                                <p className="font-medium">First Day of Week</p>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <span className="text-sm">{firstDayOfWeek}</span>
                                <ChevronRight size={16} />
                            </div>
                        </div>


                        {/* Date Format */}
                        <div
                            className="p-4 flex items-center justify-between hover:bg-surface-highlight transition-colors cursor-pointer border-b border-border-color"
                            onClick={() => setDateFormat(
                                dateFormat === 'DD/MM/YYYY' ? 'DD MMM YYYY' :
                                    dateFormat === 'DD MMM YYYY' ? 'Relative' :
                                        'DD/MM/YYYY'
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <p className="font-medium">Date Format</p>
                                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                        {dateFormat === 'DD/MM/YYYY' ? 'Example: 03/02/2026' :
                                            dateFormat === 'DD MMM YYYY' ? 'Example: 03 Feb 2026' :
                                                'Example: Today, Yesterday'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <span className="text-sm font-medium">
                                    {dateFormat === 'DD/MM/YYYY' ? 'DD/MM/YYYY' :
                                        dateFormat === 'DD MMM YYYY' ? 'DD MMM YYYY' :
                                            'Relative'}
                                </span>
                                <ChevronRight size={16} />
                            </div>
                        </div>

                        {/* Notifications (Coming Soon) */}
                        <div className="p-4 flex items-center justify-between opacity-50 cursor-not-allowed">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <p className="font-medium">Notifications</p>
                                    <p className="text-xs text-text-secondary">Alerts & reminders.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded-lg bg-surface-highlight border border-border-color text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Appearance */}
                <div>
                    <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-wider pl-1">App Appearance</h3>
                    <GlassCard className="rounded-[20px] overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-500'}`}>
                                    <AnimatePresence mode="wait">
                                        {theme === 'dark' ? (
                                            <motion.div
                                                key="moon"
                                                initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Moon size={20} />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="sun"
                                                initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Sun size={20} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div>
                                    <p className="font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                                    <p className="text-xs text-text-secondary">Easy on the eyes</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`w-12 h-7 rounded-full transition-all duration-300 relative ${theme === 'dark' ? 'bg-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-gray-400/50'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </GlassCard>
                </div>

                {/* Language */}
                <div>
                    <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-wider pl-1">Language</h3>
                    <GlassCard className="p-1.5 rounded-[20px] flex relative">
                        {/* Background slider */}
                        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-[14px] bg-green-500 border border-border-color transition-all duration-300 ${language === 'en' ? 'translate-x-[102%] left-1.5' : 'left-1.5'}`} />

                        <button
                            onClick={() => setLanguage('id')}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-[14px] transition-colors relative z-10 ${language === 'id' ? 'text-white' : 'text-text-secondary'}`}
                        >
                            <span className="text-lg">🇮🇩</span>
                            <span className="text-sm font-bold">Bahasa ID</span>
                            {language === 'id' && <Check size={14} className="text-white hidden" />}
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-[14px] transition-colors relative z-10 ${language === 'en' ? 'text-white' : 'text-text-secondary'}`}
                        >
                            <span className="text-lg">🇺🇸</span>
                            <span className="text-sm font-bold">English</span>
                        </button>
                    </GlassCard>
                    <p className="text-center text-xs text-gray-500 mt-3 px-8">
                        Language changes will require an app restart to take full effect.
                    </p>
                </div>

                {/* Danger Zone */}
                <div>
                    <h3 className="text-xs font-bold text-error mb-3 uppercase tracking-wider pl-1">Danger Zone</h3>
                    <GlassCard className="rounded-[20px] bg-error/5 border border-error/20 overflow-hidden">
                        <div
                            className="p-4 flex items-center justify-between hover:bg-error/10 transition-colors cursor-pointer"
                            onClick={() => setShowResetConfirm(true)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-error/20 flex items-center justify-center text-error">
                                    <span className="font-bold text-lg">!</span>
                                </div>
                                <div>
                                    <p className="font-medium text-error">Reset Data</p>
                                    <p className="text-xs text-error/60">Clear all data & start over</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-error" />
                        </div>
                    </GlassCard>
                </div>

                {/* Sign Out */}
                <div className="pt-4 flex justify-center">
                    <GlassButton
                        onClick={() => setShowSignOutConfirm(true)}
                        variant="ghost"
                        className="text-text-secondary hover:text-error"
                    >
                        Sign Out
                    </GlassButton>
                </div>

                <div className="text-center pb-8">
                    <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">Version 1.2.0 (Koprly App)</p>
                </div>
            </motion.div>

            {/* Modals */}
            <AnimatePresence>
                {/* Sign Out Modal */}
                {showSignOutConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
                        onClick={() => setShowSignOutConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm p-6 rounded-[32px] bg-surface border border-border-color text-center"
                        >
                            <h3 className="text-xl font-bold mb-2">Sign Out?</h3>
                            <p className="!text-black dark:!text-white text-sm mb-8 px-4">
                                Are you sure you want to sign out of your account? You will need to log in again to access your data.
                            </p>

                            <div className="space-y-3">
                                <Button
                                    className="w-full bg-error hover:bg-error/90 text-white border-none h-12 rounded-2xl"
                                    onClick={handleSignOut}
                                >
                                    Yes, Sign Out
                                </Button>
                                <button
                                    className="w-full h-12 rounded-2xl bg-surface hover:bg-surface-highlight text-text-primary font-medium transition-colors"
                                    onClick={() => setShowSignOutConfirm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}


            </AnimatePresence>

            {/* Reset Confirmation & Success Modal */}
            <AnimatePresence>
                {showResetConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
                        onClick={() => !isResetting && !isResetSuccess && setShowResetConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm p-6 rounded-[32px] bg-surface border border-border-color text-center overflow-hidden relative"
                        >
                            <AnimatePresence mode="wait">
                                {isResetSuccess ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="py-8"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                                            <motion.svg
                                                viewBox="0 0 24 24"
                                                className="w-10 h-10 text-success"
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{ pathLength: 1, opacity: 1 }}
                                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                            >
                                                <motion.path
                                                    fill="none"
                                                    strokeWidth="3"
                                                    stroke="currentColor"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </motion.svg>
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2 text-success">All Clean!</h3>
                                        <p className="text-gray-400 text-sm">Redirecting to setup...</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="confirm"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4 text-error">
                                            <span className="text-2xl font-bold">!</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 text-error">Reset Everything?</h3>
                                        <p className="text-black dark:text-gray-300 text-sm mb-8 px-4 leading-relaxed">
                                            This will permanently delete ALL your transactions, wallets, and budget data. You will be redirected to the setup screen. <br />
                                            <span className="font-bold text-black dark:text-white mt-1 block">This cannot be undone.</span>
                                        </p>

                                        <div className="space-y-3">
                                            <Button
                                                className="w-full bg-error hover:bg-error/90 text-white border-none h-12 rounded-2xl font-semibold shadow-lg shadow-error/20"
                                                onClick={handleResetAccount}
                                                isLoading={isResetting}
                                            >
                                                Yes, Reset All Data
                                            </Button>
                                            <button
                                                className="w-full h-12 rounded-2xl bg-gray-100 dark:bg-surface hover:bg-gray-200 dark:hover:bg-surface-highlight text-text-primary font-medium transition-colors border border-transparent dark:border-border-color"
                                                onClick={() => setShowResetConfirm(false)}
                                                disabled={isResetting}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
