import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarGlowProps {
    progress: number; // 0 to 100
    color?: string;
    className?: string;
    height?: number;
}

export const ProgressBarGlow: React.FC<ProgressBarGlowProps> = ({
    progress,
    color = 'var(--primary)', // Default to CSS var but can be hex 
    className = '',
    height = 12
}) => {
    // Clamp progress
    const p = Math.min(100, Math.max(0, progress));
    const isHigh = p > 80;

    return (
        <div
            className={`w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden ${className}`}
            style={{ height }}
        >
            <div className="h-full relative w-full">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full relative overflow-hidden flex items-center"
                    style={{
                        backgroundColor: color,
                        boxShadow: isHigh ? `0 0 20px ${color}` : 'none'
                    }}
                >
                    {/* Shimmer Effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    />
                </motion.div>
            </div>
        </div>
    );
};
