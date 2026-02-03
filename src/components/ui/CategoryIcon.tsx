import type { LucideProps } from 'lucide-react';
import { getIconComponent } from '../../lib/iconMapping';

interface CategoryIconProps extends LucideProps {
    iconName: string;
    variant?: 'default' | 'small' | 'large' | 'picker';
    isActive?: boolean; // For picker or active state
    activeColor?: string; // Hex color for the picker active glow/style
    categoryColor?: string; // Hex color for the permanent tinted style (new system)
    containerClassName?: string;
}

export function CategoryIcon({
    iconName,
    variant = 'default',
    isActive = false,
    activeColor,
    categoryColor,
    className = '',
    containerClassName = '',
    ...props
}: CategoryIconProps) {
    const IconComponent = getIconComponent(iconName);

    // Size logic
    const iconSize = props.size || (
        variant === 'small' ? 14 :
            variant === 'large' ? 24 :
                variant === 'picker' ? 20 : 18
    );

    const baseContainerStyles = "flex items-center justify-center rounded-xl transition-all duration-300";



    // Determine Base Size Class
    const sizeClasses = {
        default: "w-10 h-10",
        small: "w-8 h-8",
        large: "w-14 h-14",
        picker: "w-12 h-12"
    };

    let finalContainerClass = `${baseContainerStyles} ${sizeClasses[variant]} ${containerClassName}`;
    let inlineStyle: React.CSSProperties = { ...(props.style || {}) };
    let iconClass = className;

    // --- Logic Branching ---

    // 1. Picker Variant
    if (variant === 'picker') {
        if (isActive) {
            finalContainerClass += " border";
            if (activeColor) {
                // Dynamic Active Color
                inlineStyle = {
                    ...inlineStyle,
                    borderColor: activeColor,
                    backgroundColor: `${activeColor}1A`, // ~10% opacity
                    color: activeColor,
                    boxShadow: `0 0 15px ${activeColor}4D`
                };
                iconClass += " text-current";
            } else {
                // Default Active Primary
                finalContainerClass += " border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(34,197,94,0.3)]";
            }
        } else {
            // Inactive Picker
            finalContainerClass += " border-transparent bg-surface hover:bg-surface-highlight hover:border-border-color text-text-secondary hover:text-text-primary";
        }
    }
    // 2. Display Variants with Specific Color (The "Tinted" Look)
    else if (categoryColor) {
        // Apply tinted background and text color
        // No border or shadow for clean contrast look (as per reference)
        inlineStyle = {
            ...inlineStyle,
            backgroundColor: `${categoryColor}33`, // 20% Opacity (Increased from 10%)
            color: categoryColor
        };
        // Ensure icon uses this color
        iconClass += " text-current";
    }
    // 3. Fallback to Standard Glass
    else {
        // Standard glass fallback for non-picker, non-colored icons
        finalContainerClass += ` shadow-sm border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md text-text-primary`;
    }

    return (
        <div
            className={finalContainerClass}
            style={inlineStyle}
        >
            <IconComponent
                size={iconSize}
                className={iconClass}
                strokeWidth={2}
                {...props}
            />
        </div>
    );
}
