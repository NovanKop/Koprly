import * as React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, rightIcon, ...props }, ref) => {
        return (
            <div className="relative group">
                <input
                    ref={ref}
                    className={cn(
                        "peer w-full py-3 pt-5 pb-2 rounded-xl outline-none transition-all duration-200",
                        icon ? "pl-11" : "pl-4",
                        rightIcon ? "pr-11" : "pr-4",
                        "bg-surface backdrop-blur-md border border-border-color",
                        "text-text-primary placeholder-transparent text-base",
                        "focus:border-primary focus:ring-4 focus:ring-primary/10",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        error ? "border-error focus:border-error focus:ring-error/10" : "hover:border-primary/30",
                        className
                    )}
                    placeholder={label}
                    {...props}
                />

                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none">
                        {icon}
                    </div>
                )}

                {rightIcon && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors z-10">
                        {rightIcon}
                    </div>
                )}

                <label
                    className={cn(
                        "absolute text-text-secondary transition-all duration-200 pointer-events-none origin-[0]",
                        icon ? "left-11" : "left-4",
                        // Default position (floating)
                        "top-1.5 text-xs",
                        // When empty and not focused
                        "peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400",
                        // When focused
                        "peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary",
                        error && "text-error peer-focus:text-error"
                    )}
                >
                    {label}
                </label>
                {error && (
                    <p className="mt-1 text-xs text-error ml-4 animate-in slide-in-from-top-1 fade-in">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
