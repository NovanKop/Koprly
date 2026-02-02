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
    const buttonWidth = 100 / menuItems.length; // Width percentage per button

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
            <div
                className="relative rounded-full px-2 py-2 flex items-center justify-between gap-1 shadow-2xl min-w-[320px]"
                style={{
                    backdropFilter: 'blur(25px)',
                    WebkitBackdropFilter: 'blur(25px)',
                    backgroundColor: 'rgba(var(--surface-rgb, 255, 255, 255), 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    isolation: 'isolate'
                }}
            >

                {/* Single Sliding Bubble - Index Based Animation */}
                <motion.div
                    className="absolute bg-primary rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)] dark:shadow-[0_0_25px_rgba(34,197,94,0.8)]"
                    initial={false}
                    animate={{
                        x: `${activeIndex * buttonWidth}%`
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                    }}
                    style={{
                        width: `${buttonWidth}%`,
                        height: '56px',
                        top: '8px',
                        left: 0,
                        zIndex: 10,
                        willChange: 'transform'
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
