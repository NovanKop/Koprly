import { motion } from 'framer-motion';
import { Settings, PieChart, Wallet } from 'lucide-react';
import { useMemo } from 'react';

interface BottomMenuProps {
    currentView: 'home' | 'report' | 'budget' | 'settings' | 'category' | 'history' | 'notifications';
    onNavigate: (view: 'home' | 'report' | 'budget' | 'settings' | 'category' | 'history' | 'notifications') => void;
}

export const BottomMenu = ({ currentView, onNavigate }: BottomMenuProps) => {
    const menuItems = [
        {
            id: 'home',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
            )
        },
        {
            id: 'report',
            icon: <PieChart size={24} />
        },
        {
            id: 'budget',
            icon: <Wallet size={24} />
        },
        {
            id: 'settings',
            icon: <Settings size={22} />
        }
    ] as const;

    // Calculate active index with useMemo optimization  
    const activeIndex = useMemo(() =>
        menuItems.findIndex(item => item.id === currentView),
        [currentView]
    );

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 25 }}
                className="relative backdrop-blur-3xl bg-surface/80 border border-white/20 rounded-full px-2 py-2 flex items-center gap-2 shadow-2xl ring-1 ring-black/5"
            >
                {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => onNavigate(item.id as any)}
                            className="relative p-4 rounded-full flex items-center justify-center outline-none"
                            style={{ zIndex: 10 }}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            {/* Perfect Circle Indicator - Centered */}
                            {isActive && (
                                <motion.div
                                    className="absolute w-13 h-13 rounded-full bg-gradient-to-br from-primary via-primary/80 to-secondary shadow-lg shadow-primary/30"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 0
                                    }}
                                />
                            )}

                            {/* Icon */}
                            <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-text-secondary mix-blend-overlay'}`}>
                                {item.icon}
                            </span>
                        </motion.button>
                    );
                })}
            </motion.div>
        </div>
    );
};
