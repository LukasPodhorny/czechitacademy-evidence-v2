import { useState, useEffect, useCallback } from 'react';

export interface Item {
    _rowIndex?: number;
    'ID / SKU': string | null;
    'Název': string | null;
    'Kategorie': string | null;
    'Umístění': string | null;
    'Množství': string | null;
    'Jednotka': string | null;
    'Poznámka': string | null;
    image_url?: string | null;
}

interface UseItemsReturn {
    items: Item[];
    loading: boolean;
    error: string | null;
    refreshItems: () => Promise<void>;
    addItem: (item: Item) => Promise<void>;
    updateItem: (rowIndex: number, item: Item) => Promise<void>;
    deleteItem: (rowIndex: number) => Promise<void>;
}

export function useItems(): UseItemsReturn {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/sheets');

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setItems(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const addItem = useCallback(async (item: Item) => {
        const response = await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item }),
        });

        if (!response.ok) {
            throw new Error('Failed to add item');
        }
    }, []);

    const updateItem = useCallback(async (rowIndex: number, item: Item) => {
        const response = await fetch('/api/sheets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowIndex, item }),
        });

        if (!response.ok) {
            throw new Error('Failed to update item');
        }
    }, []);

    const deleteItem = useCallback(async (rowIndex: number) => {
        const response = await fetch('/api/sheets', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowIndex }),
        });

        if (!response.ok) {
            throw new Error('Failed to delete item');
        }
    }, []);

    return {
        items,
        loading,
        error,
        refreshItems: fetchItems,
        addItem,
        updateItem,
        deleteItem,
    };
}
