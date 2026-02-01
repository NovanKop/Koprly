import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';

interface KoprlystGuideProps {
    onComplete: () => void;
}

const STEPS = [
    {
        id: 1,
        title: "Mari hidupkan dashboard-mu!",
        description: "Tambahkan dompet pertamamu di sini.",
        targetId: "add-wallet-button",
        position: "bottom" as const,
    },
    {
        id: 2,
        title: "Ini adalah Stable Anchor-mu",
        description: "Tentukan batas belanja bulanan tanpa perlu khawatir saldo dompetmu berubah.",
        targetId: "budget-limit-card",
        position: "bottom" as const,
    },
    {
        id: 3,
        title: "Bagi kuemu!",
        description: "Alokasikan limit belanjamu ke kategori yang tersedia.",
        targetId: "budget-categories",
        position: "top" as const,
    },
];

export function KoprlystGuide({ onComplete }: KoprlystGuideProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const { theme } = useAppStore();

    useEffect(() => {
        const updateTargetPosition = () => {
            const step = STEPS[currentStep];
            if (!step) return;

            const target = document.getElementById(step.targetId);
            if (target) {
                setTargetRect(target.getBoundingClientRect());
            }
        };

        updateTargetPosition();
        window.addEventListener('resize', updateTargetPosition);
        window.addEventListener('scroll', updateTargetPosition);

        return () => {
            window.removeEventListener('resize', updateTargetPosition);
            window.removeEventListener('scroll', updateTargetPosition);
        };
    }, [currentStep]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleSkip = async () => {
        handleComplete();
    };

    const handleComplete = async () => {
        try {
            await api.updateProfile({ onboarding_koprlyst_done: true });
            onComplete();
        } catch (error) {
            console.error('Failed to update Koprlyst status:', error);
            onComplete(); // Still close even if API fails
        }
    };

    const step = STEPS[currentStep];
    if (!step || !targetRect) return null;

    const isDark = theme === 'dark';

    // Calculate tooltip position
    const tooltipY = step.position === 'bottom'
        ? targetRect.bottom + 20
        : targetRect.top - 220; // Approximate height of tooltip

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999]"
            >
                {/* Dimmed Overlay */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-[10px]"
                    onClick={handleSkip}
                />

                {/* Highlight Spotlight */}
                <div
                    className="absolute pointer-events-none transition-all duration-500 ease-out"
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                        boxShadow: `0 0 0 4px ${isDark ? 'rgba(0, 217, 255, 0.5)' : 'rgba(0, 126, 167, 0.5)'}, 0 0 0 9999px rgba(0, 0, 0, 0.6)`,
                        borderRadius: '24px',
                    }}
                />

                {/* Tooltip */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: step.position === 'bottom' ? -20 : 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`absolute z-[10001] w-[90vw] max-w-sm mx-auto rounded-[24px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]
                        ${isDark
                            ? 'bg-[rgba(20,20,20,0.98)] border-[1.5px] border-[#00D9FF] shadow-[0_0_30px_rgba(0,217,255,0.2)]'
                            : 'bg-[rgba(255,255,255,0.98)] border-[1.5px] border-[#007EA7]'
                        }`}
                    style={{
                        top: tooltipY,
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-full ${isDark ? 'bg-[#00D9FF]/20' : 'bg-[#007EA7]/20'}`}>
                                <Lightbulb
                                    size={16}
                                    className={isDark ? 'text-[#00D9FF]' : 'text-[#007EA7]'}
                                />
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#00D9FF]' : 'text-[#007EA7]'}`}>
                                Koprlyst Tip
                            </span>
                        </div>
                        <button
                            onClick={handleSkip}
                            className={`p-1 rounded-full hover:bg-gray-200/20 transition-colors ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {step.title}
                    </h3>
                    <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {step.description}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={handleSkip}
                            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${isDark
                                    ? 'text-gray-400 hover:text-white hover:bg-white/10'
                                    : 'text-gray-600 hover:text-[#1A1A1A] hover:bg-gray-100'
                                }`}
                        >
                            Lewati
                        </button>
                        <div className="flex items-center gap-3">
                            {/* Step Indicator */}
                            <div className="flex gap-1.5">
                                {STEPS.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentStep
                                                ? isDark ? 'bg-[#00D9FF] w-4' : 'bg-[#007EA7] w-4'
                                                : isDark ? 'bg-gray-600' : 'bg-gray-300'
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleNext}
                                className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${isDark
                                        ? 'bg-[#00D9FF] text-black hover:bg-[#00F0FF] shadow-[0_0_20px_rgba(0,217,255,0.3)]'
                                        : 'bg-[#007EA7] text-white hover:bg-[#006A8E]'
                                    }`}
                            >
                                {currentStep === STEPS.length - 1 ? 'Selesai' : 'Paham'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
