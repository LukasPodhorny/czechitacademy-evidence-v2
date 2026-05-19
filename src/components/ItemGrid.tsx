import { useState, useMemo } from 'react';
import { ItemCard } from './ItemCard';
import styles from './ItemGrid.module.css';
import type { Item } from '../hooks/useItems';

interface ItemGridProps {
    items: Item[];
    aiResults: number[] | null;
    loading: boolean;
    error: string | null;
}

const ITEMS_PER_PAGE = 20;

export function ItemGrid({ items, aiResults, loading, error }: ItemGridProps) {
    const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

    // If AI results are active, reorder items based on AI relevance
    const displayedItems = useMemo(() => {
        if (aiResults && aiResults.length > 0) {
            // Map AI result indices to actual items
            const orderedItems = aiResults
                .map((index) => items[index])
                .filter((item): item is Item => item !== undefined);
            return orderedItems;
        }
        return items;
    }, [items, aiResults]);

    const visibleItems = displayedItems.slice(0, displayCount);
    const hasMore = displayCount < displayedItems.length;
    const remainingCount = displayedItems.length - displayCount;

    const handleLoadMore = () => {
        setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
    };

    if (loading) {
        return (
            <div className={styles.grid}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={styles.skeleton}>
                        <div className={styles.skeletonHeader} />
                        <div className={styles.skeletonBadge} />
                        <div className={styles.skeletonQuantity} />
                        <div className={styles.skeletonLine} />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h3>Nastala chyba</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (displayedItems.length === 0) {
        return (
            <div className={styles.empty}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                    <line x1="8" y1="8" x2="14" y2="14" />
                    <line x1="14" y1="8" x2="8" y2="14" />
                </svg>
                <h3>Nic nenalezeno</h3>
                <p>Zkuste upravit vyhledávací dotaz nebo vybrat jinou kategorii.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.resultsCount}>
                Nalezeno: <strong>{displayedItems.length}</strong> položek
                {aiResults && <span className={styles.aiBadge}>✦ AI řazení</span>}
            </div>

            <div className={styles.grid}>
                {visibleItems.map((item, index) => (
                    <ItemCard key={index} item={item} index={index} />
                ))}
            </div>

            {hasMore && (
                <button
                    type="button"
                    className={styles.loadMore}
                    onClick={handleLoadMore}
                >
                    Načíst další (+{Math.min(remainingCount, ITEMS_PER_PAGE)})
                </button>
            )}
        </div>
    );
}
