import { motion, LayoutGroup } from 'framer-motion';
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

    return (
        <motion.div
            className="bottom-nav-glass relative overflow-hidden rounded-full px-2 py-2 flex items-center justify-between gap-1 shadow-2xl transition-all duration-300 hover:shadow-primary/5 min-w-[320px]"
        >
            <LayoutGroup id="bottomNav">
                {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => onNavigate(item.id as any)}
                            className="relative p-4 rounded-full flex items-center justify-center outline-none flex-1 group"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {/* Glow Effect behind Active Item */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeGlow"
                                    className="absolute inset-0 bg-primary/20 blur-xl rounded-full"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            {/* Sliding Active Background (The Green Circle) */}
                            {isActive && (
                                <>
                                    {/* Radial Glow Behind Bubble */}
                                    <motion.div
                                        layoutId="activeBubbleGlow"
                                        className="absolute inset-0 rounded-full"
                                        style={{
                                            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
                                            filter: 'blur(12px)',
                                            transform: 'scale(1.2)'
                                        }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                    {/* Main Bubble */}
                                    <motion.div
                                        layoutId="activeBubble"
                                        className="absolute inset-0 rounded-full z-[10000]"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(16, 185, 129, 0.3), inset 0 -2px 8px rgba(5, 150, 105, 0.5)'
                                        }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                </>
                            )}

                            {/* Icon */}
                            <div className="relative z-10 flex flex-col items-center gap-1">
                                <span className={`transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                    {item.icon}
                                </span>
                            </div>
                        </motion.button>
                    );
                })}
            </LayoutGroup>
        </motion.div>
    );
};
