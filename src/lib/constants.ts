import { CreditCard, Banknote, Landmark, PiggyBank, Smartphone, Bitcoin } from 'lucide-react';

export const WALLET_ICONS = [
    { type: 'card', Icon: CreditCard, label: 'Card' },
    { type: 'cash', Icon: Banknote, label: 'Cash' },
    { type: 'bank', Icon: Landmark, label: 'Bank' },
    { type: 'savings', Icon: PiggyBank, label: 'Savings' },
    { type: 'ewallet', Icon: Smartphone, label: 'E-Wallet' },
    { type: 'crypto', Icon: Bitcoin, label: 'Crypto' },
] as const;

export const WALLET_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE', '#5856D6'];

export const MAX_WALLETS = 4;

export const CATEGORY_ICONS = [
    '🛒', '🍽️', '🚗', '🏠', '🎬', '🏥', '👕', '💼', '✈️', '📚', '💊', '🎮', '☕', '🔌', '🎁', '🏋️', '🐾', '💻', '🎓', '🎨'
];

export const CATEGORY_COLORS = [
    '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55', '#A2845E', '#8E8E93'
];
