import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface GlassButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'primary' | 'secondary' | 'error' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    isLoading?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    icon,
    isLoading,
    disabled,
    ...props
}) => {
    const baseStyles = "relative overflow-hidden font-bold flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

    // Using simple tailwind colors that map somewhat to the variables or direct values for reliability
    const variants = {
        primary: "bg-primary text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 border border-white/20",
        secondary: "bg-surface border border-border-color text-text-primary hover:bg-surface/80",
        error: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
        ghost: "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary hover:text-text-primary"
    };

    const sizes = {
        sm: "h-8 px-4 text-xs rounded-[12px]",
        md: "h-12 px-6 text-sm rounded-[20px]",
        lg: "h-14 px-8 text-base rounded-[24px]"
    };

    return (
        <motion.button
            whileHover={!disabled && !isLoading ? { scale: 1.02, filter: 'brightness(1.1)' } : {}}
            whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <>
                    {icon && <span className="mr-2">{icon}</span>}
                    {children}
                </>
            )}
        </motion.button>
    );
};
