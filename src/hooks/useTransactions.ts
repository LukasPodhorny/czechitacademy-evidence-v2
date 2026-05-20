import { useState, useCallback } from 'react';

export interface Transaction {
    id: number;
    item_id: number;
    person_name: string | null;
    amount: number;
    transaction_type: 'borrow' | 'take';
    duration_days: number | null;
    created_at: string;
    returned_at: string | null;
    notes: string | null;
}

export interface CreateTransactionData {
    item_id: number;
    person_name?: string;
    amount: number;
    transaction_type: 'borrow' | 'take';
    duration_days?: number;
    notes?: string;
}

interface UseTransactionsReturn {
    transactions: Transaction[];
    loading: boolean;
    error: string | null;
    fetchTransactions: (itemId: number) => Promise<void>;
    createTransaction: (data: CreateTransactionData) => Promise<void>;
    returnItems: (transactionId: number) => Promise<void>;
    clearError: () => void;
}

export function useTransactions(): UseTransactionsReturn {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const fetchTransactions = useCallback(async (itemId: number) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/transactions?itemId=${itemId}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch transactions');
            }

            const data = await response.json();
            setTransactions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    const createTransaction = useCallback(async (data: CreateTransactionData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const responseData = await response.json();
                throw new Error(responseData.error || 'Failed to create transaction');
            }

            // Refresh transactions after creating
            await fetchTransactions(data.item_id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchTransactions]);

    const returnItems = useCallback(async (transactionId: number) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transaction_id: transactionId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to return items');
            }

            // Update local state to mark transaction as returned
            setTransactions(prev =>
                prev.map(t =>
                    t.id === transactionId
                        ? { ...t, returned_at: new Date().toISOString() }
                        : t
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        transactions,
        loading,
        error,
        fetchTransactions,
        createTransaction,
        returnItems,
        clearError,
    };
}
