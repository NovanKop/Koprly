import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TransactionItem } from './TransactionItem';
import type { Transaction } from '../types';

// Mock Lucide icons to avoid rendering issues in test env if any
vi.mock('lucide-react', () => ({
    ChevronRight: () => <span data-testid="chevron-right" />,
}));

const mockTransactionExpense: Transaction = {
    id: '1',
    amount: 50000,
    type: 'expense',
    category_id: 'cat1',
    description: 'Lunch',
    date: '2024-03-15',
    wallet_id: 'w1',
    created_at: '2024-03-15T12:00:00Z',
    category: {
        id: 'cat1',
        name: 'Food',
        icon: '🍔',
        color: '#FF5733',
        monthly_budget: 1000
    }
};

const mockTransactionIncome: Transaction = {
    id: '2',
    amount: 1000000,
    type: 'income',
    description: 'Salary',
    date: '2024-03-01',
    wallet_id: 'w1',
    created_at: '2024-03-01T09:00:00Z',
};

describe('TransactionItem', () => {
    it('renders expense transaction correctly', () => {
        render(<TransactionItem transaction={mockTransactionExpense} currency="IDR" />);

        expect(screen.getByText('Lunch')).toBeInTheDocument();
        expect(screen.getByText('-Rp50.000')).toBeInTheDocument();
        expect(screen.getByText(/Food/)).toBeInTheDocument();
        expect(screen.getByText('🍔')).toBeInTheDocument(); // Icon
    });

    it('renders income transaction correctly', () => {
        render(<TransactionItem transaction={mockTransactionIncome} currency="IDR" />);

        expect(screen.getByText('Salary')).toBeInTheDocument();
        expect(screen.getByText('+Rp1.000.000')).toBeInTheDocument();
        expect(screen.queryByText('Income', { selector: 'p.font-medium' })).not.toBeInTheDocument(); // Description provided 'Salary' overrides 'Income'
        expect(screen.getByText('💰')).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<TransactionItem transaction={mockTransactionExpense} currency="IDR" onClick={handleClick} />);

        const item = screen.getByText('Lunch').closest('div[class*="backdrop-blur-xl"]');
        expect(item).toBeInTheDocument();
        if (item) fireEvent.click(item);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows chevron only when onClick provided', () => {
        const { rerender } = render(<TransactionItem transaction={mockTransactionExpense} currency="IDR" />);
        expect(screen.queryByTestId('chevron-right')).not.toBeInTheDocument();

        rerender(<TransactionItem transaction={mockTransactionExpense} currency="IDR" onClick={() => { }} />);
        expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    });
});
