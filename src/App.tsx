import { useState, useMemo, useCallback } from 'react';
import { useItems } from './hooks/useItems';
import { useAiSearch } from './hooks/useAiSearch';
import { searchItems, getUniqueCategories } from './utils/search';
import { SearchBar } from './components/SearchBar';
import { CategoryFilter } from './components/CategoryFilter';
import { ItemGrid } from './components/ItemGrid';
import { AiRateLimitBanner } from './components/AiRateLimitBanner';
import styles from './App.module.css';

function App() {
  const { items, loading, error } = useItems();
  const {
    aiResults,
    aiLoading,
    aiError,
    rateLimited,
    retryCountdown,
    search: aiSearch,
    reset: resetAi,
  } = useAiSearch();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories from items
  const categories = useMemo(() => getUniqueCategories(items), [items]);

  // Apply fulltext search and category filter
  const filteredItems = useMemo(() => {
    return searchItems(items, searchQuery, selectedCategory);
  }, [items, searchQuery, selectedCategory]);

  // Handle AI search
  const handleAiSearch = useCallback(() => {
    if (searchQuery.trim()) {
      aiSearch(searchQuery, filteredItems);
    }
  }, [searchQuery, filteredItems, aiSearch]);

  // Handle retry after rate limit
  const handleRetry = useCallback(() => {
    if (retryCountdown === 0) {
      handleAiSearch();
    }
  }, [retryCountdown, handleAiSearch]);

  // Determine which items to display
  const displayedItems = useMemo(() => {
    if (aiResults !== null) {
      // AI results contain indices - map them back to items
      return aiResults
        .map((index) => filteredItems[index])
        .filter((item) => item !== undefined);
    }
    return filteredItems;
  }, [aiResults, filteredItems]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <h1 className={styles.logoText}>
            <span className={styles.logoAccent}>Czech IT</span> Evidence
          </h1>
        </div>
        <p className={styles.subtitle}>Katalog IT majetku</p>
      </header>

      <main className={styles.main}>
        <div className={styles.controls}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onAiSearch={handleAiSearch}
            aiLoading={aiLoading}
            aiActive={aiResults !== null}
            onResetAi={resetAi}
          />

          <div className={styles.filters}>
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onChange={setSelectedCategory}
            />
          </div>
        </div>

        {rateLimited && (
          <AiRateLimitBanner
            countdown={retryCountdown}
            onRetry={handleRetry}
          />
        )}

        {aiError && !rateLimited && (
          <div className={styles.aiError}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{aiError}</span>
          </div>
        )}

        <ItemGrid
          items={displayedItems}
          aiResults={aiResults}
          loading={loading}
          error={error}
        />
      </main>

      <footer className={styles.footer}>
        <p>© 2024 Czech IT Academy — Interní nástroj</p>
      </footer>
    </div>
  );
}

export default App;
