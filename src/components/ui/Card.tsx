import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
    glass?: boolean;
    hoverEffect?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, glass = true, hoverEffect = false, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={hoverEffect ? { opacity: 0, y: 10 } : undefined}
                animate={hoverEffect ? { opacity: 1, y: 0 } : undefined}
                whileHover={hoverEffect ? { y: -5, boxShadow: "0 12px 40px rgba(0,0,0,0.15)" } : undefined}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                    "rounded-[20px] overflow-hidden",
                    glass && [
                        "backdrop-blur-xl bg-surface",
                        "border border-white/20 dark:border-white/10",
                        "shadow-[0_8px_32px_rgba(0,0,0,0.05)]"
                    ],
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);
Card.displayName = "Card";

export { Card };
