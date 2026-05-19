import { useState, useEffect } from 'react';

export interface Item {
    'ID / SKU': string | null;
    'Název': string | null;
    'Kategorie': string | null;
    'Umístění': string | null;
    'Množství': string | null;
    'Jednotka': string | null;
    'Poznámka': string | null;
}

interface UseItemsReturn {
    items: Item[];
    loading: boolean;
    error: string | null;
}

export function useItems(): UseItemsReturn {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchItems() {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch('/api/sheets');

                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                if (!cancelled) {
                    setItems(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchItems();

        return () => {
            cancelled = true;
        };
    }, []);

    return { items, loading, error };
}
