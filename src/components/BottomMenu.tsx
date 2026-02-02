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
            <div className="relative backdrop-blur-3xl bg-surface/80 border border-white/20 rounded-full p-2 flex items-center shadow-2xl ring-1 ring-black/5 min-w-[320px]">

                {/* Inner Relative Container for Perfect Alignment */}
                <div className="relative flex flex-1 w-full items-center">

                    {/* Single Sliding Indicator */}
                    <motion.div
                        className="absolute bg-gradient-to-br from-primary via-primary/80 to-secondary rounded-full shadow-lg shadow-primary/30 transform-gpu"
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
                            height: '100%',
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
                                    <span className={`transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-text-secondary group-hover:text-text-primary'}`}>
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
