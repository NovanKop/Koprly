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
        ? "shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] dark:shadow-2xl hover:-translate-y-1 hover:shadow-primary/10 transition-all duration-300"
        : "shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] hover:shadow hover:bg-surface-highlight transition-all duration-300";

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
