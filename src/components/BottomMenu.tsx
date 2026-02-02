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

    // Calculate active index with useMemo optimization
    const activeIndex = useMemo(() =>
        menuItems.findIndex(item => item.id === currentView),
        [currentView]
    );

    // Calculate button width in pixels for precise positioning
    // 320px min-width - 16px padding = 304px / 4 items = 76px per button
    const buttonWidth = 76;
    const containerPadding = 8;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
            <div className="relative glass-panel rounded-full px-2 py-2 flex items-center justify-between gap-1 shadow-2xl min-w-[320px]">

                {/* Single Sliding Bubble with Gradient (GREEN → CYAN/BLUE) */}
                <motion.div
                    className="absolute bg-gradient-to-br from-primary via-primary/80 to-secondary rounded-full shadow-lg shadow-primary/30"
                    animate={{
                        x: activeIndex * buttonWidth + containerPadding,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8
                    }}
                    style={{
                        width: `${buttonWidth - 8}px`,
                        height: '56px',
                        top: '8px',
                        left: '0px',
                        zIndex: 1,
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
                            className="relative p-4 rounded-full flex items-center justify-center outline-none flex-1 group"
                            style={{ zIndex: 20 }}
                        >
                            <span className={`transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                {item.icon}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
