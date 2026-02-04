import { motion } from 'framer-motion';
import { Settings, PieChart, Wallet } from 'lucide-react';

interface BottomMenuProps {
    currentView: 'home' | 'report' | 'budget' | 'settings' | 'category' | 'history' | 'notifications';
    onNavigate: (view: 'home' | 'report' | 'budget' | 'settings' | 'category' | 'history' | 'notifications') => void;
}

export const BottomMenu = ({ currentView, onNavigate }: BottomMenuProps) => {
    const menuItems = [
        {
            id: 'home',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
            )
        },
        {
            id: 'report',
            icon: <PieChart size={20} />
        },
        {
            id: 'budget',
            icon: <Wallet size={20} />
        },
        {
            id: 'settings',
            icon: <Settings size={20} />
        }
    ] as const;

    // Calculate active index for smooth sliding animation
    const activeIndex = menuItems.findIndex(item => item.id === currentView);

    // Button: p-4 = 16px*2 + 20px icon = 52px, gap-2 = 8px
    const buttonWidth = 52;
    const gap = 8;
    const circleX = activeIndex >= 0 ? activeIndex * (buttonWidth + gap) + 8 : 0;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 25 }}
                className="relative backdrop-blur-3xl bg-surface/80 border border-white/20 rounded-full px-2 py-2 flex items-center gap-2 shadow-2xl ring-1 ring-black/5"
            >
                {/* Single Sliding Circle Indicator */}
                {activeIndex >= 0 && (
                    <motion.div
                        className="absolute w-[52px] h-[52px] rounded-full bg-gradient-to-br from-primary via-primary/80 to-secondary shadow-lg shadow-primary/30"
                        animate={{
                            x: circleX,
                            y: '-50%'
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                            mass: 0.8
                        }}
                        style={{
                            top: '50%',
                            left: 0,
                            zIndex: 0
                        }}
                    />
                )}

                {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className="relative p-4 rounded-full flex items-center justify-center outline-none"
                            style={{ zIndex: 10 }}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            aria-label={`Navigate to ${item.id}`}
                        >
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
