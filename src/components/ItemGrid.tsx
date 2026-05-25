import { useMemo, useRef, useCallback } from 'react';
import { ItemCard } from './ItemCard';
import styles from './ItemGrid.module.css';
import type { Item } from '../hooks/useItems';

interface ItemGridProps {
    items: Item[];
    loading: boolean;
    error: string | null;
    onItemClick?: (item: Item) => void;
    currentPage: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
}

export function ItemGrid({
    items,
    loading,
    error,
    onItemClick,
    currentPage,
    onPageChange,
    itemsPerPage
}: ItemGridProps) {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const shouldScrollRef = useRef(false);

    const handlePageChange = (page: number) => {
        shouldScrollRef.current = true;
        onPageChange(page);
    };

    // Callback ref for the first item - triggers scroll when it actually mounts
    const setFirstItemRef = useCallback((el: HTMLDivElement | null) => {
        if (el && shouldScrollRef.current) {
            shouldScrollRef.current = false;
            // Multiple scroll attempts with increasing delays
            const scroll = () => {
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
            };
            scroll();
            setTimeout(scroll, 50);
            setTimeout(scroll, 150);
            setTimeout(scroll, 300);
        }
    }, []);

    const visibleItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    }, [items, currentPage, itemsPerPage]);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                pages.push(1, 2, 3, 4, 5, '...', totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    if (loading) {
        return (
            <div className={styles.grid}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={styles.skeleton}>
                        <div className={styles.skeletonQuantity} />
                        <div className={styles.skeletonName} />
                        <div className={styles.skeletonCategory} />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p>Chyba při načítání dat</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className={styles.empty}>
                <p>Žádné položky k zobrazení</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.grid}>
                {visibleItems.map((item, index) => (
                    <div
                        key={`${currentPage}-${index}`}
                        ref={index === 0 ? setFirstItemRef : undefined}
                        style={{ display: 'contents' }}
                    >
                        <ItemCard
                            item={item}
                            onClick={() => onItemClick?.(item)}
                        />
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <>
                    {/* Desktop pagination with page numbers */}
                    <div className={styles.paginationDesktop}>
                        <button
                            className={styles.pageButton}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </button>

                        {getPageNumbers().map((page, idx) => (
                            <button
                                key={idx}
                                className={`${styles.pageButton} ${page === currentPage ? styles.active : ''} ${page === '...' ? styles.ellipsis : ''}`}
                                onClick={() => typeof page === 'number' && handlePageChange(page)}
                                disabled={page === '...'}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            className={styles.pageButton}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </button>
                    </div>

                    {/* Mobile pagination - Previous/Next with page indicator */}
                    <div className={styles.paginationMobile}>
                        <button
                            className={styles.mobileNavButton}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </button>
                        <div className={styles.pageIndicator}>
                            {currentPage}/{totalPages}
                        </div>
                        <button
                            className={styles.mobileNavButton}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
