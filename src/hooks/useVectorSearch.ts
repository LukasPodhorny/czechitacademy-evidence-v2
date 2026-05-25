import { useState, useCallback } from 'react';
import type { Item } from './useItems';

// Result type from the vector search API
interface VectorSearchResult {
    id: number;
    'ID / SKU': string | null;
    'Název': string | null;
    'Kategorie': string | null;
    'Umístění': string | null;
    'Množství': string | null;
    'Jednotka': string | null;
    'Poznámka': string | null;
    image_url: string | null;
    similarity: number;
}

interface UseVectorSearchReturn {
    results: Item[] | null;
    rawResults: VectorSearchResult[] | null;
    loading: boolean;
    error: string | null;
    search: (query: string, options?: SearchOptions) => Promise<void>;
    reset: () => void;
}

interface SearchOptions {
    matchThreshold?: number; // 0-1, default 0.5
    matchCount?: number;     // 1-100, default 20
}

/**
 * Converts VectorSearchResult to Item format for compatibility
 */
function convertToItem(result: VectorSearchResult): Item {
    return {
        _rowIndex: result.id, // Map Supabase id to _rowIndex for compatibility
        'ID / SKU': result['ID / SKU'],
        'Název': result['Název'],
        'Kategorie': result['Kategorie'],
        'Umístění': result['Umístění'],
        'Množství': result['Množství'],
        'Jednotka': result['Jednotka'],
        'Poznámka': result['Poznámka'],
        image_url: result.image_url,
    };
}

/**
 * Hook for semantic vector search using Supabase pgvector
 * Replaces the old Groq-based AI search with efficient vector similarity
 */
export function useVectorSearch(): UseVectorSearchReturn {
    const [results, setResults] = useState<Item[] | null>(null);
    const [rawResults, setRawResults] = useState<VectorSearchResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (
        query: string,
        options: SearchOptions = {}
    ): Promise<void> => {
        if (!query.trim()) {
            setResults(null);
            setRawResults(null);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/vector-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    match_threshold: options.matchThreshold,
                    match_count: options.matchCount,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || `Search failed (HTTP ${response.status})`
                );
            }

            const data = await response.json();
            const searchResults: VectorSearchResult[] = data.results || [];

            setRawResults(searchResults);
            setResults(searchResults.map(convertToItem));

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults(null);
            setRawResults(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setResults(null);
        setRawResults(null);
        setError(null);
        setLoading(false);
    }, []);

    return {
        results,
        rawResults,
        loading,
        error,
        search,
        reset,
    };
}
