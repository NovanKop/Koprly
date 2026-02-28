import React, { useState, useEffect } from 'react';
import type { UserEnvironment } from '../hooks/usePWADetect';
import { usePWADetect } from '../hooks/usePWADetect';
import { SafariShareIcon, ChromeMenuIcon, GenericAddIcon } from './ui/PWAIcons';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWATutorialBubble: React.FC = () => {
    const { environment, isStandalone } = usePWADetect();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 1. Standalone Check
        if (isStandalone) return;

        // 2. Login Count Check (Mocking this - assuming it's managed via context or store in a real app)
        // For now, we will just use localStorage to ensure it only shows once per device
        const hasSeenTutorial = localStorage.getItem('has_seen_pwa_tutorial') === 'true';
        if (hasSeenTutorial) return;

        // 3. Trigger Display
        if (environment !== 'other' && environment !== 'standalone') {
            const timer = setTimeout(() => setIsVisible(true), 1500); // Small delay so it doesn't jarringly pop up instantly on load
            return () => clearTimeout(timer);
        }
    }, [environment, isStandalone]);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('has_seen_pwa_tutorial', 'true');
    };

    if (!isVisible) return null;

    const getTutorialContent = (env: UserEnvironment) => {
        switch (env) {
            case 'safari-ios':
                return {
                    icon: <SafariShareIcon className="w-6 h-6 text-[#00D9FF] flex-shrink-0" />,
                    text: "Tap the Share icon at the bottom, then select 'Add to Home Screen'."
                };
            case 'chrome-android':
                return {
                    icon: <ChromeMenuIcon className="w-6 h-6 text-[#00D9FF] flex-shrink-0" />,
                    text: "Tap the three dots (⋮) in the top right and select 'Install app'."
                };
            case 'chrome-ios':
            default:
                return {
                    icon: <GenericAddIcon className="w-6 h-6 text-[#00D9FF] flex-shrink-0" />,
                    text: "Tap the Share/Menu icon and select 'Add to Home Screen'."
                };
        }
    };

    const content = getTutorialContent(environment);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
                className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 pointer-events-auto"
            >
                {/* Opaque Liquid Glass Container (98% Opacity) */}
                <div className="relative overflow-hidden rounded-2xl border-[1.5px] border-[#00D9FF] bg-white/98 dark:bg-[#141414]/98 shadow-[0_8px_32px_rgba(0,217,255,0.15)] backdrop-blur-xl p-5">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
                        aria-label="Close tutorial"
                    >
                        <X size={18} />
                    </button>

                    <h3 className="text-lg font-bold text-[#1A1A1A] dark:text-white mb-2 pr-6">
                        Take Koprly with you! 📱
                    </h3>

                    <div className="flex flex-row items-start gap-4 mb-4">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg">
                            {content.icon}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed pt-0.5">
                            {content.text}
                        </p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full py-2.5 rounded-xl bg-[#00D9FF] hover:bg-[#00c4e6] text-black font-semibold transition-all shadow-[0_0_15px_rgba(0,217,255,0.3)] hover:shadow-[0_0_20px_rgba(0,217,255,0.5)] active:scale-[0.98]"
                    >
                        Got it!
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
