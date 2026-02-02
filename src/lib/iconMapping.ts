import {
    ShoppingCart, Utensils, Car, Home, Clapperboard, Cross, Shirt, Briefcase,
    Plane, Book, Pill, Gamepad2, Coffee, Plug, Gift, Dumbbell, PawPrint,
    Laptop, GraduationCap, Palette, CreditCard, Banknote, Landmark, PiggyBank,
    Smartphone, Bitcoin, Music, Wifi, Phone, Hammer, Heart
} from 'lucide-react';


// Map of legacy emojis to Lucide icon names (mixed casing to match potential inputs)
export const EMOJI_TO_ICON_MAP: Record<string, any> = {
    '🛒': ShoppingCart,
    '🍽️': Utensils,
    '🚗': Car,
    '🏠': Home,
    '🎬': Clapperboard,
    '🏥': Cross, // or Hospital
    '👕': Shirt,
    '💼': Briefcase,
    '✈️': Plane,
    '📚': Book,
    '💊': Pill,
    '🎮': Gamepad2,
    '☕': Coffee,
    '🔌': Plug,
    '🎁': Gift,
    '🏋️': Dumbbell,
    '🐾': PawPrint,
    '💻': Laptop,
    '🎓': GraduationCap,
    '🎨': Palette,
    // Add more mappings as needed for standard emojis
    '💰': Banknote,
    '💸': Banknote,
    '🎵': Music,
    '📶': Wifi,
    '📱': Phone,
    '🔨': Hammer,
    '❤️': Heart
};

// Map of string names to Components
export const STRING_TO_ICON_MAP: Record<string, any> = {
    'shopping-cart': ShoppingCart,
    'utensils': Utensils,
    'car': Car,
    'home': Home,
    'clapperboard': Clapperboard,
    'hospital': Cross,
    'shirt': Shirt,
    'briefcase': Briefcase,
    'plane': Plane,
    'book': Book,
    'pill': Pill,
    'gamepad-2': Gamepad2,
    'coffee': Coffee,
    'plug': Plug,
    'gift': Gift,
    'dumbbell': Dumbbell,
    'paw-print': PawPrint,
    'laptop': Laptop,
    'graduation-cap': GraduationCap,
    'palette': Palette,
    'credit-card': CreditCard,
    'banknote': Banknote,
    'landmark': Landmark,
    'piggy-bank': PiggyBank,
    'smartphone': Smartphone,
    'bitcoin': Bitcoin,
    'music': Music,
    'wifi': Wifi,
    'phone': Phone,
    'hammer': Hammer,
    'heart': Heart
};

export const getIconComponent = (icon: string) => {
    // 1. Try direct string match
    if (STRING_TO_ICON_MAP[icon]) return STRING_TO_ICON_MAP[icon];

    // 2. Try emoji match
    if (EMOJI_TO_ICON_MAP[icon]) return EMOJI_TO_ICON_MAP[icon];

    // 3. Fallback to ShoppingCart if nothing found (or maybe a generic 'HelpCircle'?)
    return ShoppingCart;
};

// List of available icons for the picker (using string names)
export const AVAILABLE_ICONS = [
    'shopping-cart', 'utensils', 'car', 'home', 'clapperboard',
    'hospital', 'shirt', 'briefcase', 'plane', 'book',
    'pill', 'gamepad-2', 'coffee', 'plug', 'gift',
    'dumbbell', 'paw-print', 'laptop', 'graduation-cap', 'palette'
];
