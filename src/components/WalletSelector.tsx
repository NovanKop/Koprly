import type { Wallet } from '../types';
import { ChevronRight } from 'lucide-react';

interface WalletSelectorProps {
    wallets: Wallet[];
    selectedWalletId: string;
    onSelect: (id: string) => void;
    label?: string;
    currencySymbol: string;
}

export function WalletSelector({ wallets, selectedWalletId, onSelect, label, currencySymbol }: WalletSelectorProps) {
    const formatMoney = (amount: number) => {
        return `${currencySymbol}${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <div>
            {label && <label className="text-xs text-gray-400 mb-2 block">{label}</label>}
            <div className="relative">
                <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide pr-4">
                    {wallets.map(w => (
                        <button
                            key={w.id}
                            onClick={() => onSelect(w.id)}
                            type="button"
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-all whitespace-nowrap
                            ${selectedWalletId === w.id
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-surface border-border-color text-gray-400'
                                }`}
                        >
                            {w.name} ({formatMoney(w.balance)})
                        </button>
                    ))}
                    {/* Padding for end of list - Increased for better spacing */}
                    <div className="w-14 flex-shrink-0" />
                </div>
                {/* Scroll Indicator - Smoother fade - Only show if > 1 item */}
                {wallets.length > 1 && (
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white via-white/60 to-white/0 dark:from-[#0B1218] dark:via-[#0B1218]/60 dark:to-[#0B1218]/0 pointer-events-none flex items-center justify-end pr-2">
                        <ChevronRight className="text-green-500 w-5 h-5 animate-pulse" />
                    </div>
                )}
            </div>
        </div>
    );
}
