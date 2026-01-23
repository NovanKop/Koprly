import type { Wallet } from '../types';

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
            <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide">
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
            </div>
        </div>
    );
}
