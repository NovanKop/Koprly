import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {

        const variants = {
            primary: "bg-gradient-to-r from-primary to-secondary text-white shadow-[0_4px_16px_rgba(0,122,255,0.3)] hover:shadow-[0_8px_24px_rgba(0,122,255,0.4)] border-transparent",
            secondary: "bg-surface/50 backdrop-blur-md border border-primary/20 text-primary hover:bg-surface/80 hover:border-primary/40 shadow-sm",
            danger: "bg-error/10 text-error border border-error/20 hover:bg-error/20 shadow-sm",
            ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface/30",
        };

        const sizes = {
            sm: "px-4 py-2 text-sm rounded-lg",
            md: "px-6 py-3 text-base rounded-xl",
            lg: "px-8 py-4 text-lg rounded-2xl",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.95, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={cn(
                    "relative inline-flex items-center justify-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95",
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                ) : null}
                <span className={cn("flex items-center gap-2", isLoading && "opacity-0")}>
                    {children as React.ReactNode}
                </span>
            </motion.button>
        );
    }
);
Button.displayName = "Button";

export { Button };
