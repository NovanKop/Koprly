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

    const activeIndex = menuItems.findIndex(item => item.id === currentView);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
            <div className="relative glass-panel rounded-full p-2 flex items-center shadow-2xl transition-all duration-300 hover:shadow-primary/5 min-w-[320px] !bg-white/70 dark:!bg-[#0B1218]/70 !backdrop-blur-[45px] before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none dark:before:from-white/20 dark:before:via-white/5 dark:before:to-transparent after:absolute after:inset-0 after:rounded-full after:border after:border-white/60 after:pointer-events-none dark:after:border-white/30 after:shadow-[inset_0_2px_8px_rgba(255,255,255,0.3)] dark:after:shadow-[inset_0_2px_8px_rgba(255,255,255,0.15)]">

                {/* Inner Relative Container for Perfect Alignment */}
                <div className="relative flex flex-1 w-full items-center z-10">

                    {/* Single Sliding Indicator */}
                    <motion.div
                        className="absolute bg-primary rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)] dark:shadow-[0_0_20px_rgba(34,197,94,0.6)] transform-gpu"
                        initial={false}
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
                            height: '100%', // Matches the inner container height (which accounts for padding)
                            top: 0,
                            left: 0,
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Menu Items */}
                    {menuItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id as any)}
                                className="relative flex-1 p-4 rounded-full flex items-center justify-center outline-none group z-20"
                            >
                                {/* Icon */}
                                <div className="relative flex items-center justify-center">
                                    <span className={`transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-500 dark:text-text-secondary group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                                        {item.icon}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
