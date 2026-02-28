import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWADetect } from '../../hooks/usePWADetect';
import { House, Lightning as Zap, Bell, X } from '@phosphor-icons/react';
import { api } from '../../lib/api';
import type { Profile } from '../../types';
import confetti from 'canvas-confetti';

interface PWAReleaseNotesModalProps {
    profile: Profile | null;
    onDismiss: () => void;
}

export const PWAReleaseNotesModal: React.FC<PWAReleaseNotesModalProps> = ({ profile, onDismiss }) => {
    const { isStandalone } = usePWADetect();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if we are running in standalone mode (PWA installed) 
        // AND if the user hasn't seen the release notes yet.
        if (!profile) return;

        // Safety check with localStorage as backup while DB syncs
        const localFlag = localStorage.getItem('has_seen_pwa_release_notes') === 'true';
        if (isStandalone && !profile.has_seen_pwa_release_notes && !localFlag) {
            // Add slight delay to not clash with initial render/login
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [profile, isStandalone]);

    const handleClose = async () => {
        setIsVisible(false);

        // Fire confetti for celebration
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00D9FF', '#FFFFFF', '#141414']
        });

        try {
            // 1. Persist to DB
            await api.updateProfile({ has_seen_pwa_release_notes: true });
        } catch (error) {
            console.warn('Could not save PWA release notes flag to DB, using local storage fallback.', error);
        } finally {
            // 2. Fallback persistence
            localStorage.setItem('has_seen_pwa_release_notes', 'true');
            onDismiss();
        }
    };

    const displayName = profile?.display_name || profile?.username || 'User';

    return (
        <AnimatePresence>
            {isVisible && (
                <React.Fragment>
                    {/* Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="w-full max-w-md pointer-events-auto"
                        >
                            {/* Opaque Liquid Glass Design (98% Background) */}
                            <div className="relative overflow-hidden rounded-3xl border border-[#00D9FF]/20 bg-[rgba(255,255,255,0.98)] dark:bg-[rgba(20,20,20,0.95)] shadow-2xl p-6 md:p-8">

                                {/* Close Button */}
                                <button
                                    onClick={handleClose}
                                    className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                                >
                                    <X size={20} />
                                </button>

                                {/* Header Content */}
                                <div className="text-center mb-8 mt-2">
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-[#00D9FF]/10 flex items-center justify-center mb-4">
                                        <img src="/logo.png" alt="Koprly" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(0,217,255,0.3)]" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-2 leading-tight">
                                        Welcome to Koprly PWA, {displayName}! 📱
                                    </h2>
                                    <p className="text-neutral-500 dark:text-neutral-400">
                                        Your financial assistant, now just a tap away.
                                    </p>
                                </div>

                                {/* Feature List */}
                                <div className="space-y-6 mb-8">
                                    {/* Feature 1 */}
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 text-[#00D9FF]">
                                            <House size={22} weight="duotone" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#1A1A1A] dark:text-white">Instant Access</h4>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                Fast, standalone access directly from your device's home screen.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Feature 2 */}
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 text-[#00D9FF]">
                                            <Zap size={22} weight="duotone" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#1A1A1A] dark:text-white">Data Saving</h4>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                Uses up to 80% less mobile data than the browser version.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Feature 3 */}
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 text-[#00D9FF]">
                                            <Bell size={22} weight="duotone" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#1A1A1A] dark:text-white">Smart Alerts</h4>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                Instant notifications and reminders from Koprlyst <span className="text-xs ml-1 px-1.5 py-0.5 rounded-md bg-[#00D9FF]/10 text-[#00D9FF]">coming soon</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={handleClose}
                                    className="w-full py-3.5 rounded-xl bg-[#00D9FF] hover:bg-[#00c4e6] text-white font-bold text-lg tracking-wide transition-all shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:shadow-[0_0_30px_rgba(0,217,255,0.6)] active:scale-[0.98]"
                                >
                                    Let's start saving!
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </React.Fragment>
            )}
        </AnimatePresence>
    );
};
