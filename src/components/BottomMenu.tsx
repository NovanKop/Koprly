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
            icon: <PieChart size={24} className={currentView === 'report' ? 'fill-current' : ''} />
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

    // Calculate active index
    const activeIndex = menuItems.findIndex(item => item.id === currentView);

    return (
        <div className="relative glass-panel rounded-full px-2 py-2 flex items-center justify-between gap-1 shadow-2xl transition-all duration-300 hover:shadow-primary/5 min-w-[320px]">
            {/* Single Sliding Indicator - NO layoutId */}
            <motion.div
                className="absolute bg-primary rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)] dark:shadow-[0_0_25px_rgba(34,197,94,0.8)] transform-gpu"
                animate={{
                    x: `${activeIndex * 100}%`
                }}
                transition={{
                    type: "spring",
                    bounce: 0.2,
                    duration: 0.6
                }}
                style={{
                    width: `${100 / menuItems.length}%`,
                    height: 'calc(100% - 8px)',
                    top: '4px',
                    left: '8px',
                    pointerEvents: 'none'
                }}
            />

            {/* Menu Items */}
            {menuItems.map((item, index) => {
                const isActive = currentView === item.id;
                return (
                    <motion.button
                        key={item.id}
                        onClick={() => onNavigate(item.id as any)}
                        className="relative p-4 rounded-full flex items-center justify-center outline-none flex-1 group z-10"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {/* Icon */}
                        <div className="relative z-10 flex flex-col items-center gap-1">
                            <span className={`transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                {item.icon}
                            </span>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
};
