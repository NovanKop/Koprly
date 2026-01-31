import { motion } from 'framer-motion';
import { Settings, PieChart, Wallet, House } from 'lucide-react';

interface BottomMenuProps {
    currentView: 'home' | 'report' | 'budget' | 'settings' | 'category' | 'history' | 'notifications';
    onNavigate: (view: 'home' | 'report' | 'budget' | 'settings' | 'category' | 'history' | 'notifications') => void;
}

export const BottomMenu = ({ currentView, onNavigate }: BottomMenuProps) => {
    const menuItems = [
        {
            id: 'home',
            icon: <House size={24} />,
            label: 'Home'
        },
        {
            id: 'report',
            icon: <PieChart size={24} />,
            label: 'Report'
        },
        {
            id: 'budget',
            icon: <Wallet size={24} />,
            label: 'Budget'
        },
        {
            id: 'settings',
            icon: <Settings size={22} />,
            label: 'Settings'
        }
    ] as const;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 25 }}
                className="glass-panel rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl ring-1 ring-white/10"
            >
                {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id as any)}
                            className="relative w-12 h-12 rounded-full flex items-center justify-center outline-none group"
                        >
                            {/* Active Indicator (Dot) */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="absolute -bottom-1 w-1 h-1 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            {/* Icon */}
                            <div className={`relative z-10 transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-gray-400 group-hover:text-white'}`}>
                                {item.icon}
                            </div>

                            {/* Hover Effect */}
                            <div className="absolute inset-0 bg-white/5 rounded-full scale-0 group-hover:scale-100 transition-transform duration-200" />
                        </button>
                    );
                })}
            </motion.div>
        </div>
    );
};
