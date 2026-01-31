import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'standard' | 'elevated';
    onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    variant = 'standard',
    onClick
}) => {
    const baseStyles = "backdrop-blur-[25px] bg-surface border border-border-color transition-all duration-300";
    const variantStyles = variant === 'elevated'
        ? "shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
        : "shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.15)] hover:bg-surface-highlight";

    // Default radius is handled by className usually, but we set a sensible default if not provided
    // However, to allow override, we append className last. 
    // We'll add a default rounded-2xl if no rounded class is present? 
    // Safer to just provide the utility and let consumer decide, OR enforce the 20px default.
    const defaultRadius = className.includes('rounded-') ? '' : 'rounded-[20px]';

    const Component = onClick ? motion.div : 'div';
    const motionProps = onClick ? {
        whileHover: { scale: 1.01 },
        whileTap: { scale: 0.98 },
        cursor: 'pointer'
    } : {};

    return (
        // @ts-ignore
        <Component
            onClick={onClick}
            className={`relative overflow-hidden ${baseStyles} ${variantStyles} ${defaultRadius} ${className}`}
            {...motionProps}
        >
            {children}
        </Component>
    );
};
