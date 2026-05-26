import { useState, useEffect, useCallback } from 'react';
import { generateColorFromString } from '../utils/colors';

export interface Category {
    id: number;
    name: string;
    description: string | null;
    color: string;
    created_at: string;
    updated_at: string;
}

interface UseCategoriesReturn {
    categories: Category[];
    categoryNames: string[];
    loading: boolean;
    error: string | null;
    refreshCategories: () => Promise<void>;
    addCategory: (name: string, description?: string) => Promise<void>;
    updateCategory: (id: number, updates: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
    deleteCategory: (id: number) => Promise<void>;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function useCategories(): UseCategoriesReturn {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/categories?order=name.asc`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch categories: ${errorText}`);
            }

            const data = await response.json();
            setCategories(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const addCategory = useCallback(async (name: string, description?: string) => {
        // Auto-generate color from category name
        const autoColor = generateColorFromString(name);

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/categories`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                    name,
                    description: description || null,
                    color: autoColor,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to add category: ${errorText}`);
        }

        // Refresh categories after adding
        await fetchCategories();
    }, [fetchCategories]);

    const updateCategory = useCallback(async (id: number, updates: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>) => {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/categories?id=eq.${id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                    ...updates,
                    updated_at: new Date().toISOString(),
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update category: ${errorText}`);
        }

        // Refresh categories after updating
        await fetchCategories();
    }, [fetchCategories]);

    const deleteCategory = useCallback(async (id: number) => {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/categories?id=eq.${id}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete category: ${errorText}`);
        }

        // Refresh categories after deleting
        await fetchCategories();
    }, [fetchCategories]);

    // Extract just the category names for backwards compatibility
    const categoryNames = categories.map(cat => cat.name);

    return {
        categories,
        categoryNames,
        loading,
        error,
        refreshCategories: fetchCategories,
        addCategory,
        updateCategory,
        deleteCategory,
    };
}
