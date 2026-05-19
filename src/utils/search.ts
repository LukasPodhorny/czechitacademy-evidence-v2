import type { Item } from '../hooks/useItems';

export function searchItems(
    items: Item[],
    query: string,
    category: string | null
): Item[] {
    let filtered = items;

    // Filter by category
    if (category && category !== 'Všechny kategorie') {
        filtered = filtered.filter(
            (item) => item['Kategorie'] === category
        );
    }

    // Filter by search query
    if (query.trim()) {
        const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

        filtered = filtered.filter((item) => {
            const searchFields = [
                item['Název'],
                item['Poznámka'],
                item['ID / SKU'],
            ].filter((field): field is string => field !== null);

            const searchText = searchFields.join(' ').toLowerCase();

            return searchTerms.every((term) => searchText.includes(term));
        });
    }

    return filtered;
}

export function getUniqueCategories(items: Item[]): string[] {
    const categories = new Set<string>();

    items.forEach((item) => {
        if (item['Kategorie']) {
            categories.add(item['Kategorie']);
        }
    });

    return Array.from(categories).sort();
}
